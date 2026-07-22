"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedPost, PostType } from "@/lib/db";
import PostViewer from "../PostViewer";

const PLAN_KEY = "nrm:studio:plan";
const POLL_MS = 4000;

interface PlanItem {
  type: PostType;
  topic: string;
  rationale: string;
  estCredits: number;
  affordable: boolean;
}

interface PersistedPlan {
  summary: string | null;
  items: PlanItem[];
  savedAt: number;
}

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function weekCampaignName(company: string): string {
  return `${company}'s Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("type=video");
}

function postThumb(p: GeneratedPost): string | null {
  return (p.imageUrls ?? []).find((u) => u && !isVideoUrl(u)) ?? null;
}

function savePlan(summary: string | null, items: PlanItem[]) {
  try {
    const val: PersistedPlan = { summary, items, savedAt: Date.now() };
    localStorage.setItem(PLAN_KEY, JSON.stringify(val));
  } catch {
    /* storage unavailable */
  }
}

function loadPlan(): PersistedPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const val = JSON.parse(raw) as PersistedPlan;
    if (Date.now() - val.savedAt > 86_400_000) {
      localStorage.removeItem(PLAN_KEY);
      return null;
    }
    return val;
  } catch {
    return null;
  }
}

export default function StrategistStudio({
  company,
  creditsInitial,
  postsPerWeek,
  reviewInitial,
  scheduledCount,
}: {
  company: string;
  creditsInitial: number;
  postsPerWeek: number;
  reviewInitial: GeneratedPost[];
  scheduledCount: number;
}) {
  const router = useRouter();
  const [credits, setCredits] = useState(creditsInitial);
  const [guidance, setGuidance] = useState("");
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [planning, setPlanning] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [review, setReview] = useState<GeneratedPost[]>(reviewInitial);
  const [viewing, setViewing] = useState<GeneratedPost | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(scheduledCount);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = loadPlan();
    if (saved && saved.items.length > 0) {
      setPlan(saved.items);
      setPlanSummary(saved.summary);
      setSelected(new Set(saved.items.map((it, i) => (it.affordable ? i : -1)).filter((i) => i >= 0)));
    }
  }, []);

  const hasGenerating = review.some((p) => p.status === "generating");
  const readyCount = review.filter((p) => p.status === "ready").length;

  const pollReview = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) return;
      const data = await res.json();
      const fresh: GeneratedPost[] = (data.posts ?? []).filter(
        (p: GeneratedPost) => p.status === "ready" || p.status === "generating" || p.status === "failed",
      );
      setReview(fresh.sort((a: GeneratedPost, b: GeneratedPost) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (hasGenerating && !pollRef.current) {
      pollRef.current = setInterval(pollReview, POLL_MS);
    } else if (!hasGenerating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasGenerating, pollReview]);

  const selectedCost = plan.reduce((sum, it, i) => (selected.has(i) ? sum + it.estCredits : sum), 0);

  async function suggestPlan() {
    setPlanning(true);
    setError(null);
    try {
      const res = await fetch("/api/strategist/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidance: guidance.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't build a plan.");
      const items: PlanItem[] = data.items ?? [];
      setPlan(items);
      setPlanSummary(data.summary ?? null);
      setCredits(data.creditsRemaining ?? credits);
      const sel = new Set(items.map((it, i) => (it.affordable ? i : -1)).filter((i) => i >= 0));
      setSelected(sel);
      savePlan(data.summary ?? null, items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build a plan.");
    } finally {
      setPlanning(false);
    }
  }

  function toggle(i: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function editTopic(i: number, value: string) {
    setPlan((p) => {
      const next = p.map((it, idx) => (idx === i ? { ...it, topic: value } : it));
      savePlan(planSummary, next);
      return next;
    });
  }

  async function generateSelected() {
    const picks = plan.filter((_, i) => selected.has(i));
    if (picks.length === 0) return;
    if (selectedCost > credits) {
      setError(`That selection needs ${selectedCost} credits but you have ${credits}.`);
      return;
    }
    setGenBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/strategist/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: picks.map((it) => ({ type: it.type, topic: it.topic })),
          campaignName: weekCampaignName(company),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Generation failed.");
        return;
      }
      const placeholders: GeneratedPost[] = data.posts ?? [];
      setReview((r) => [...placeholders, ...r]);
      if (typeof data.creditsRemaining === "number") setCredits(data.creditsRemaining);
      const remaining = plan.filter((_, i) => !selected.has(i));
      setPlan(remaining);
      setSelected(new Set());
      savePlan(planSummary, remaining);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setGenBusy(false);
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setRowBusy(id);
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReview((r) => r.filter((p) => p.id !== id));
        if (status === "approved") setScheduled((n) => n + 1);
        if (viewing?.id === id) setViewing(null);
        router.refresh();
      }
    } finally {
      setRowBusy(null);
    }
  }

  async function approveAll() {
    const ready = review.filter((p) => p.status === "ready");
    for (const p of ready) await setStatus(p.id, "approved");
  }

  const generatingCount = review.filter((p) => p.status === "generating").length;

  return (
    <div className="studio">
      <div className="studio__grid">
        <section className="studio__card studio__card--create">
          <div className="studio__cardhead">
            <div>
              <span className="studio__step-label">Step 1</span>
              <h2 className="studio__h">Create content</h2>
            </div>
            <span className="studio__hint">~{postsPerWeek} posts / week</span>
          </div>

          <p className="studio__lede">
            Tell us what to focus on this week. Pick post types, generate on-brand content — credits only spent when you hit generate.
          </p>

          <div className="studio__planinput">
            <input
              className="input"
              placeholder="Focus this week (e.g. Ramadan offers, product launch)…"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              dir="auto"
            />
            <button className="btn btn--sm" onClick={suggestPlan} disabled={planning || genBusy}>
              {planning ? "Planning…" : plan.length ? "Re-plan" : "Suggest plan"}
            </button>
          </div>

          {planSummary && <p className="studio__summary" dir="auto">{planSummary}</p>}

          {plan.length > 0 ? (
            <>
              <ul className="planlist">
                {plan.map((it, i) => (
                  <li key={i} className={`planrow ${selected.has(i) ? "is-on" : ""} ${!it.affordable ? "is-locked" : ""}`}>
                    <label className="planrow__check">
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} disabled={genBusy} />
                    </label>
                    <span className={`post-pill post-pill--${PILL_CLS[it.type]}`}>{it.type}</span>
                    <div className="planrow__body">
                      <input
                        className="planrow__topic"
                        value={it.topic}
                        onChange={(e) => editTopic(i, e.target.value)}
                        disabled={genBusy}
                        dir="auto"
                      />
                      <span className="planrow__why" dir="auto">{it.rationale}</span>
                    </div>
                    <span className="planrow__cost"><Sparkles size={11} /> {it.estCredits}</span>
                  </li>
                ))}
              </ul>
              <div className="studio__genbar">
                <span className={`studio__cost ${selectedCost > credits ? "is-over" : ""}`}>
                  {selected.size} selected · <Sparkles size={12} /> {selectedCost} / {credits}
                </span>
                <button
                  className="btn"
                  onClick={generateSelected}
                  disabled={genBusy || selected.size === 0 || selectedCost > credits}
                >
                  {genBusy ? "Generating…" : "Generate selected →"}
                </button>
              </div>
            </>
          ) : (
            <div className="studio__empty studio__empty--box">
              {planning ? (
                <span className="studio__spinner" aria-hidden />
              ) : null}
              <p>
                {planning
                  ? "Building your weekly plan…"
                  : "Start with Suggest plan — we'll draft post ideas tailored to your brand."}
              </p>
            </div>
          )}
        </section>

        <section className="studio__card studio__card--preview">
          <div className="studio__cardhead">
            <div>
              <span className="studio__step-label">Step 2</span>
              <h2 className="studio__h">
                Preview &amp; edit
                {generatingCount > 0 && <span className="studio__gen-badge">{generatingCount} generating</span>}
              </h2>
            </div>
            {readyCount > 0 && (
              <button className="btn btn--sm" onClick={approveAll} disabled={!!rowBusy}>
                Approve all →
              </button>
            )}
          </div>

          <p className="studio__lede">Open any draft to preview, edit caption or media, then approve when you're happy.</p>

          {review.length === 0 ? (
            <div className="studio__empty studio__empty--box">
              <p>Generated posts appear here. Nothing is scheduled until you approve.</p>
            </div>
          ) : (
            <ul className="reviewlist">
              {review.map((p) => {
                const thumb = postThumb(p);
                return (
                  <li
                    key={p.id}
                    className={`reviewrow ${p.status === "generating" ? "reviewrow--generating" : ""} ${p.status === "failed" ? "reviewrow--failed" : ""}`}
                  >
                    <div className="reviewrow__media">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="reviewrow__thumb" />
                      ) : (
                        <span className={`reviewrow__thumb reviewrow__thumb--ph ${p.status === "generating" ? "reviewrow__thumb--spin" : ""}`} />
                      )}
                    </div>
                    <div className="reviewrow__body">
                      <span className={`post-pill post-pill--${PILL_CLS[p.type]}`}>{p.type}</span>
                      <span className="reviewrow__cap" dir="auto">
                        {p.status === "generating"
                          ? "Generating on-brand content…"
                          : p.status === "failed"
                            ? (p.error || "Generation failed — credits were refunded")
                            : p.topic || p.caption.slice(0, 80)}
                      </span>
                    </div>
                    <div className="reviewrow__actions">
                      {p.status === "ready" && (
                        <>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setViewing(p)}>
                            Preview
                          </button>
                          <button type="button" className="btn btn--sm" disabled={rowBusy === p.id} onClick={() => setStatus(p.id, "approved")}>
                            Approve
                          </button>
                        </>
                      )}
                      {p.status === "generating" && <span className="studio__spinner" aria-label="Generating" />}
                      {p.status === "failed" && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStatus(p.id, "rejected")}>
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="studio__schedule">
        <div className="studio__schedule-inner">
          <div>
            <span className="studio__step-label">Step 3</span>
            <strong>Schedule on your calendar</strong>
            <p>
              {scheduled > 0
                ? `${scheduled} approved ${scheduled === 1 ? "post" : "posts"} queued on your calendar. Adjust timing anytime.`
                : "Approve drafts above — each one is placed on your calendar at the next available slot."}
            </p>
          </div>
          <Link href="/dashboard/calendar" className="btn btn--sm">
            {scheduled > 0 ? "View calendar →" : "Open calendar"}
          </Link>
        </div>
      </section>

      {error && <div className="studio__error" role="alert">{error}</div>}

      {viewing && (
        <PostViewer
          post={viewing}
          onClose={() => setViewing(null)}
          onChange={(updated) => {
            if (updated.status === "approved" || updated.status === "rejected") {
              setReview((r) => r.filter((p) => p.id !== updated.id));
              if (updated.status === "approved") setScheduled((n) => n + 1);
              setViewing(null);
              router.refresh();
            } else {
              setReview((r) => r.map((p) => (p.id === updated.id ? updated : p)));
              setViewing(updated);
            }
          }}
        />
      )}
    </div>
  );
}
