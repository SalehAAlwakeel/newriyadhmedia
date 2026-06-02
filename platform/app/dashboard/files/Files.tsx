"use client";

import { useState } from "react";

type Tab = "recents" | "media" | "weeks" | "archived";
const TABS: { id: Tab; label: string }[] = [
  { id: "recents", label: "Recents" },
  { id: "media", label: "Media Library" },
  { id: "weeks", label: "Weekly Folders" },
  { id: "archived", label: "Archived Posts" },
];

const RECENTS = [
  { name: "Ramadan Reel — v3", kind: "Video", edited: "2h ago" },
  { name: "Customer story carousel", kind: "Image set", edited: "Yesterday" },
  { name: "Weekly tips thread", kind: "Copy", edited: "2 days ago" },
  { name: "Founding Day key visual", kind: "Image", edited: "3 days ago" },
];
const MEDIA = Array.from({ length: 8 }).map((_, i) => ({ id: i, kind: i % 3 === 0 ? "Video" : "Image" }));
const WEEKS = [
  { name: "Week 1 — Awareness", count: 6, range: "Feb 1–7" },
  { name: "Week 2 — Consideration", count: 7, range: "Feb 8–14" },
  { name: "Week 3 — Conversion", count: 5, range: "Feb 15–21" },
  { name: "Week 4 — Retention", count: 6, range: "Feb 22–28" },
];
const ARCHIVED = [
  { name: "Eid 2025 campaign", count: 18, when: "Apr 2025" },
  { name: "Summer sale", count: 12, when: "Jul 2025" },
  { name: "National Day 95", count: 22, when: "Sep 2025" },
];

export default function Files() {
  const [tab, setTab] = useState<Tab>("recents");

  return (
    <>
      <div className="files-bar">
        <div className="files-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`files-tab ${tab === t.id ? "is-active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <button className="btn">+ Create new</button>
      </div>

      {tab === "recents" && (
        <div className="file-grid">
          {RECENTS.map((r) => (
            <div key={r.name} className="file-card">
              <div className="file-card__thumb" data-kind={r.kind} />
              <strong>{r.name}</strong>
              <span>{r.kind} · {r.edited}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "media" && (
        <div className="media-grid">
          {MEDIA.map((m) => (
            <div key={m.id} className={`media-tile media-tile--${m.kind.toLowerCase()}`}>
              <span>{m.kind}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "weeks" && (
        <div className="folder-grid">
          {WEEKS.map((w) => (
            <div key={w.name} className="folder">
              <span className="folder__icon">
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </span>
              <strong>{w.name}</strong>
              <span>{w.count} items · {w.range}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "archived" && (
        <div className="folder-grid">
          {ARCHIVED.map((a) => (
            <div key={a.name} className="folder folder--archived">
              <span className="folder__icon">
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M5 7l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13M4 7l1-3h14l1 3M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <strong>{a.name}</strong>
              <span>{a.count} posts · {a.when}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
