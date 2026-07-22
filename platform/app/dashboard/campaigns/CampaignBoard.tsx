"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Trash2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Campaign, GeneratedPost, PostType } from "@/lib/db";
import PostViewer from "../PostViewer";

const POLL_MS = 4000;

export interface CampaignSummary extends Campaign {
  postCount: number;
  generatingCount: number;
  thumb: string | null;
}

interface ProposalItem {
  type: PostType;
  topic: string;
  rationale: string;
  estCredits: number;
  affordable: boolean;
}

interface Proposal {
  name: string;
  audience: string;
  purpose: string;
  why: string;
  strategy: string;
  objective: string;
  items: ProposalItem[];
}

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
};

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("type=video");
}

function fmtRange(weekStart: string): string {
  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opt)} – ${end.toLocaleDateString("en-US", opt)}`;
}

function weekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return "Scheduled";
  return `Week of ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function groupByWeek(campaigns: CampaignSummary[]): [string, CampaignSummary[]][] {
  const map = new Map<string, CampaignSummary[]>();
  for (const c of campaigns) {
    const key = c.weekStart || c.createdAt;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return [...map.entries()].sort((a, b) => +new Date(b[0]) - +new Date(a[0]));
}

export default function CampaignBoard({
  initialCampaigns,
  creditsInitial,
}: {
  initialCampaigns: CampaignSummary[];
  creditsInitial: number;
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(initialCampaigns);
  const [credits, setCredits] = useState(creditsInitial);

  // Detail view
  const [detail, setDetail] = useState<{ campaign: Campaign; posts: GeneratedPost[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewing, setViewing] = useState<GeneratedPost | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New-campaign flow
  const [newOpen, setNewOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [planning, setPlanning] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detailPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
    } catch {
      /* ignore network hiccups */
    }
  }, []);

  // Poll the list while any campaign is still generating posts.
  const listGenerating = campaigns.some((c) => c.generatingCount > 0);
  useEffect(() => {
    if (listGenerating && !listPollRef.current) {
      listPollRef.current = setInterval(refreshCampaigns, POLL_MS);
    } else if (!listGenerating && listPollRef.current) {
      clearInterval(listPollRef.current);
      listPollRef.current = null;
    }
    return () => {
      if (listPollRef.current) {
        clearInterval(listPollRef.current);
        listPollRef.current = null;
      }
    };
  }, [listGenerating, refreshCampaigns]);

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (res.ok) setDetail({ campaign: data.campaign, posts: data.posts ?? [] });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (res.ok) setDetail({ campaign: data.campaign, posts: data.posts ?? [] });
    } catch {
      /* ignore */
    }
  }, []);

  // Poll the open detail while its posts are generating.
  const detailGenerating = detail?.posts.some((p) => p.status === "generating") ?? false;
  const detailId = detail?.campaign.id ?? null;
  useEffect(() => {
    if (detailGenerating && detailId && !detailPollRef.current) {
      detailPollRef.current = setInterval(() => refreshDetail(detailId), POLL_MS);
    } else if ((!detailGenerating || !detailId) && detailPollRef.current) {
      clearInterval(detailPollRef.current);
      detailPollRef.current = null;
    }
    return () => {
      if (detailPollRef.current) {
        clearInterval(detailPollRef.current);
        detailPollRef.current = null;
      }
    };
  }, [detailGenerating, detailId, refreshDetail]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (viewing) return; // PostViewer handles its own Escape
      if (confirmDelete) setConfirmDelete(null);
      else if (detail) setDetail(null);
      else if (newOpen) setNewOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, confirmDelete, detail, newOpen]);

  // ---- New-campaign actions -------------------------------------------------

  function openNew() {
    setNewOpen(true);
    setBrief("");
    setProposal(null);
    setSelected(new Set());
    setError(null);
  }

  async function proposeCampaign() {
    setPlanning(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't draft a campaign.");
      const p: Proposal = data.proposal;
      setProposal(p);
      setCredits(data.creditsRemaining ?? credits);
      setSelected(new Set(p.items.map((it, i) => (it.affordable ? i : -1)).filter((i) => i >= 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draft a campaign.");
    } finally {
      setPlanning(false);
    }
  }

  function patchProposal(patch: Partial<Proposal>) {
    setProposal((p) => (p ? { ...p, ...patch } : p));
  }

  function editItemTopic(i: number, value: string) {
    setProposal((p) =>
      p ? { ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, topic: value } : it)) } : p,
    );
  }

  function toggleItem(i: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  const selectedCost = proposal
    ? proposal.items.reduce((sum, it, i) => (selected.has(i) ? sum + it.estCredits : sum), 0)
    : 0;

  async function createCampaign() {
    if (!proposal) return;
    const picks = proposal.items.filter((_, i) => selected.has(i));
    if (selectedCost > credits) {
      setError(`That selection needs ${selectedCost} credits but you have ${credits}.`);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: proposal.name,
          audience: proposal.audience,
          purpose: proposal.purpose,
          why: proposal.why,
          strategy: proposal.strategy,
          objective: proposal.objective,
          items: picks.map((it) => ({ type: it.type, topic: it.topic })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't create the campaign.");
      if (data.error) setError(data.error); // e.g. not enough credits — campaign saved without posts
      if (typeof data.creditsRemaining === "number") setCredits(data.creditsRemaining);
      setNewOpen(false);
      setProposal(null);
      await refreshCampaigns();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the campaign.");
    } finally {
      setCreating(false);
    }
  }

  async function doDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((cs) => cs.filter((c) => c.id !== id));
        setConfirmDelete(null);
        if (detail?.campaign.id === id) setDetail(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const grouped = groupByWeek(campaigns);

  return (
    <>
      <div className="cmp-board__head">
        <div className="cmp-board__headinfo">
          <span className="cmp-board__count">
            {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
          </span>
          <span className="cmp-board__credits" title="Credits remaining"><Sparkles size={13} /> {credits.toLocaleString()} credits</span>
        </div>
        <button className="btn btn--sm" onClick={openNew}>+ New campaign</button>
      </div>

      {campaigns.length === 0 ? (
        <div className="cmp-empty">
          <h3>No campaigns yet</h3>
          <p>Describe what you want and your strategist will design a full campaign — audience, purpose, the strategic “why”, and the posts to deliver it.</p>
          <button className="btn" onClick={openNew}>+ Create your first campaign</button>
        </div>
      ) : (
        grouped.map(([week, cs]) => (
          <section key={week} className="cmp-week">
            <div className="cmp-week__label">
              <span>{weekLabel(week)}</span>
              <span className="cmp-week__range">{fmtRange(week)}</span>
            </div>
            <div className="cmp-cards">
              {cs.map((c) => (
                <article key={c.id} className="cmp-card">
                  <button type="button" className="cmp-card__open" onClick={() => openDetail(c.id)}>
                    <div className="cmp-card__thumb">
                      {c.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.thumb} alt="" />
                      ) : (
                        <span className={`cmp-card__thumbph ${c.generatingCount > 0 ? "is-spin" : ""}`} aria-hidden />
                      )}
                    </div>
                    <div className="cmp-card__body">
                      <div className="cmp-card__top">
                        <div className="cmp-card__titleblock">
                          <span className="cmp-card__eyebrow">{fmtRange(c.weekStart)}</span>
                          <h3 className="cmp-card__name" dir="auto">{c.name}</h3>
                        </div>
                        <span className={`cmp-status cmp-status--${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                      </div>
                      {c.objective && (
                        <p className="cmp-card__obj" dir="auto">
                          <span className="cmp-card__objlabel">Objective</span>
                          {truncate(c.objective, 120)}
                        </p>
                      )}
                      <div className="cmp-card__chips">
                        {c.audience && (
                          <span className="cmp-card__chip" dir="auto" title={c.audience}>
                            <span className="cmp-card__chiplabel">Audience</span>
                            {truncate(c.audience, 52)}
                          </span>
                        )}
                        {c.purpose && (
                          <span className="cmp-card__chip" dir="auto" title={c.purpose}>
                            <span className="cmp-card__chiplabel">Purpose</span>
                            {truncate(c.purpose, 52)}
                          </span>
                        )}
                      </div>
                      <div className="cmp-card__foot">
                        <span className="cmp-card__stat">
                          {c.generatingCount > 0
                            ? `${c.generatingCount} generating…`
                            : `${c.postCount} ${c.postCount === 1 ? "post" : "posts"}`}
                        </span>
                        <span className="cmp-card__cta">View campaign →</span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="cmp-card__del"
                    onClick={() => setConfirmDelete(c.id)}
                    aria-label="Delete campaign"
                    title="Delete campaign"
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div className="modal-scrim" onClick={() => setDetail(null)}>
          <div className="modal modal--campaign" onClick={(e) => e.stopPropagation()}>
            <button className="modal__x" onClick={() => setDetail(null)} aria-label="Close">×</button>
            {detailLoading || !detail ? (
              <p className="cmp-loading">Loading campaign…</p>
            ) : (
              <>
                <div className="modal__head">
                  <div>
                    <h2 dir="auto">{detail.campaign.name}</h2>
                    <span className="camp-detail__timing">{fmtRange(detail.campaign.weekStart)}</span>
                  </div>
                </div>

                <div className="camp-detail__meta">
                  <span className={`cmp-status cmp-status--${detail.campaign.status}`}>
                    {STATUS_LABEL[detail.campaign.status] ?? detail.campaign.status}
                  </span>
                  {detail.campaign.objective && <span className="camp2__tag"><Target size={12} /> {detail.campaign.objective}</span>}
                  <button
                    className="btn btn--ghost btn--sm cmp-detail__delbtn"
                    onClick={() => setConfirmDelete(detail.campaign.id)}
                  >
                    Delete campaign
                  </button>
                </div>

                <dl className="cmp-detail__grid">
                  {detail.campaign.audience && (
                    <div className="cmp-field"><dt>Audience</dt><dd dir="auto">{detail.campaign.audience}</dd></div>
                  )}
                  {detail.campaign.purpose && (
                    <div className="cmp-field"><dt>Purpose</dt><dd dir="auto">{detail.campaign.purpose}</dd></div>
                  )}
                  {detail.campaign.why && (
                    <div className="cmp-field"><dt>The strategic why</dt><dd dir="auto">{detail.campaign.why}</dd></div>
                  )}
                  {detail.campaign.strategy && (
                    <div className="cmp-field"><dt>Strategy</dt><dd dir="auto">{detail.campaign.strategy}</dd></div>
                  )}
                  {detail.campaign.performanceSummary && (
                    <div className="cmp-field"><dt>Performance</dt><dd dir="auto">{detail.campaign.performanceSummary}</dd></div>
                  )}
                </dl>

                <h3 className="camp-detail__h">
                  Posts · {detail.posts.length}
                  {detailGenerating && <span className="cmp-genbadge">generating…</span>}
                </h3>
                {detail.posts.length === 0 ? (
                  <p className="cmp-loading">No posts in this campaign yet.</p>
                ) : (
                  <div className="camp-grid">
                    {detail.posts.map((p) => {
                      const img = (p.imageUrls ?? []).find((u) => u && !isVideoUrl(u));
                      const ready = p.status === "ready" || p.status === "approved" || p.status === "published";
                      return (
                        <figure key={p.id} className="camp-card">
                          <button
                            type="button"
                            className="camp-card__media"
                            onClick={() => ready && setViewing(p)}
                            disabled={!ready}
                            aria-label={ready ? "Open post" : "Generating"}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" />
                            ) : (
                              <span className={`cmp-postph ${p.status === "generating" ? "is-spin" : ""}`} />
                            )}
                          </button>
                          <figcaption className="camp-card__body">
                            <span className={`post-pill post-pill--${PILL_CLS[p.type]}`}>{p.type}</span>
                            <p dir="auto">
                              {p.status === "generating"
                                ? "Generating on-brand content…"
                                : p.status === "failed"
                                  ? "Generation failed — credits refunded"
                                  : `${p.caption.slice(0, 90)}${p.caption.length > 90 ? "…" : ""}`}
                            </p>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* New-campaign modal */}
      {newOpen && (
        <div className="modal-scrim" onClick={() => !creating && setNewOpen(false)}>
          <div className="modal modal--campaign" onClick={(e) => e.stopPropagation()}>
            <button className="modal__x" onClick={() => !creating && setNewOpen(false)} aria-label="Close">×</button>
            <div className="modal__head">
              <h2>New campaign</h2>
            </div>
            <p className="modal__lede">
              Describe the campaign you want. Your strategist drafts a full plan — name, audience, purpose, the “why”, and the posts —
              learning from how past campaigns performed.
            </p>

            <div className="cmp-new__brief">
              <textarea
                className="input cmp-new__ta"
                dir="auto"
                rows={3}
                placeholder="e.g. A Ramadan campaign for our new coffee blend, aimed at young families, emphasizing generosity…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                disabled={planning || creating}
              />
              <button className="btn btn--sm" onClick={proposeCampaign} disabled={planning || creating}>
                {planning ? "Designing…" : proposal ? "Re-draft" : "Draft campaign"}
              </button>
            </div>

            {proposal && (
              <div className="cmp-prop">
                <label className="pv__label">Campaign name</label>
                <input className="input" dir="auto" value={proposal.name} onChange={(e) => patchProposal({ name: e.target.value })} disabled={creating} />

                <div className="cmp-prop__row">
                  <div>
                    <label className="pv__label">Audience</label>
                    <textarea className="input cmp-prop__ta" dir="auto" rows={2} value={proposal.audience} onChange={(e) => patchProposal({ audience: e.target.value })} disabled={creating} />
                  </div>
                  <div>
                    <label className="pv__label">Purpose</label>
                    <textarea className="input cmp-prop__ta" dir="auto" rows={2} value={proposal.purpose} onChange={(e) => patchProposal({ purpose: e.target.value })} disabled={creating} />
                  </div>
                </div>

                <label className="pv__label">Objective</label>
                <input className="input" dir="auto" value={proposal.objective} onChange={(e) => patchProposal({ objective: e.target.value })} disabled={creating} />

                <label className="pv__label">The strategic why</label>
                <textarea className="input cmp-prop__ta" dir="auto" rows={2} value={proposal.why} onChange={(e) => patchProposal({ why: e.target.value })} disabled={creating} />

                <label className="pv__label">Strategy</label>
                <textarea className="input cmp-prop__ta" dir="auto" rows={3} value={proposal.strategy} onChange={(e) => patchProposal({ strategy: e.target.value })} disabled={creating} />

                <label className="pv__label">Posts in this campaign</label>
                <ul className="planlist">
                  {proposal.items.map((it, i) => (
                    <li key={i} className={`planrow ${selected.has(i) ? "is-on" : ""} ${!it.affordable ? "is-locked" : ""}`}>
                      <label className="planrow__check">
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggleItem(i)} disabled={creating} />
                      </label>
                      <span className={`post-pill post-pill--${PILL_CLS[it.type]}`}>{it.type}</span>
                      <div className="planrow__body">
                        <input className="planrow__topic" dir="auto" value={it.topic} onChange={(e) => editItemTopic(i, e.target.value)} disabled={creating} />
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
                  <button className="btn btn--sm" onClick={createCampaign} disabled={creating || selectedCost > credits}>
                    {creating ? "Creating…" : "Create campaign"}
                  </button>
                </div>
              </div>
            )}

            {error && <div className="studio__error" role="alert">{error}</div>}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-scrim" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="modal cmp-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this campaign?</h3>
            <p>This permanently deletes the campaign and all of its posts. This can’t be undone.</p>
            <div className="cmp-confirm__btns">
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn--sm cmp-confirm__danger" onClick={() => doDelete(confirmDelete)} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <PostViewer
          post={viewing}
          onClose={() => setViewing(null)}
          onChange={(updated) => {
            setDetail((d) => (d ? { ...d, posts: d.posts.map((p) => (p.id === updated.id ? updated : p)) } : d));
            setViewing(updated);
          }}
        />
      )}
    </>
  );
}
