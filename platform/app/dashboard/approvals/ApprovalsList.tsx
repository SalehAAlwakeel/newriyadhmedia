"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedPost, PostType } from "@/lib/db";

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function ApprovalsList({ initial }: { initial: GeneratedPost[] }) {
  const router = useRouter();
  const [items, setItems] = useState<GeneratedPost[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusy(id);
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function approveAll() {
    const pending = items.filter((i) => i.status === "ready" || i.status === "generating");
    for (const p of pending) {
      await setStatus(p.id, "approved");
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty-card">
        <p>Nothing waiting on approval. Generate this week from the Home page to get started.</p>
      </div>
    );
  }

  // Group by campaign
  const groups = new Map<string, GeneratedPost[]>();
  for (const p of items) {
    const arr = groups.get(p.campaignName) ?? [];
    arr.push(p);
    groups.set(p.campaignName, arr);
  }

  return (
    <div className="approvals">
      {Array.from(groups.entries()).map(([campaignName, arr]) => {
        const sorted = [...arr].sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
        const range = `${new Date(sorted[0].scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(sorted[sorted.length - 1].scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        return (
          <div key={campaignName}>
            <div className="approvals__grouphead">
              <h2>{campaignName}</h2>
              <div className="approvals__grouphead-r">
                <span className="approvals__range">📅 {range}</span>
                <button className="btn btn--ghost btn--sm" onClick={approveAll}>✓ Approve All</button>
              </div>
            </div>

            <div className="approval-grid">
              {sorted.map((i) => (
                <article key={i.id} className={`appr-card appr-card--${i.status}`}>
                  <div className="appr-card__top">
                    <span className={`post-pill post-pill--${PILL_CLS[i.type]}`}>{i.type}</span>
                    <span className="appr-card__time">{fmtWhen(i.scheduledFor)}</span>
                  </div>
                  <p className="appr-card__caption" dir="auto">{i.caption.slice(0, 180)}{i.caption.length > 180 ? "…" : ""}</p>
                  {i.imageUrls[0] && (
                    <div className="appr-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.imageUrls[0]} alt="" />
                    </div>
                  )}
                  <div className="appr-card__foot">
                    {i.status === "ready" && <span className="appr-card__badge">New</span>}
                    {i.status === "approved" && <span className="appr-card__badge appr-card__badge--ok">Approved ✓</span>}
                    {i.status === "rejected" && <span className="appr-card__badge appr-card__badge--no">Rejected</span>}
                    {i.status === "generating" && <span className="appr-card__badge">Generating…</span>}
                    {(i.status === "ready" || i.status === "generating") && (
                      <div className="appr-card__actions">
                        <button className="btn btn--sm" disabled={busy === i.id} onClick={() => setStatus(i.id, "approved")}>Approve</button>
                        <button className="btn btn--ghost btn--sm" disabled={busy === i.id} onClick={() => setStatus(i.id, "rejected")}>Reject</button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
