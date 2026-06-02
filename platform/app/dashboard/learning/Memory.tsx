"use client";

import { useEffect, useState } from "react";
import type { AiMemoryEntry, AiMemoryKind } from "@/lib/db";

const KINDS: { id: AiMemoryKind; label: string; hint: string }[] = [
  { id: "fact", label: "Fact", hint: "Something objectively true about the brand." },
  { id: "preference", label: "Preference", hint: "How you like things done." },
  { id: "do-not", label: "Do-not", hint: "Hard rule the AI must never break." },
  { id: "winning-pattern", label: "Winning pattern", hint: "Something that has worked well before." },
  { id: "learning", label: "Learning", hint: "Insight from analytics or feedback." },
];

const SOURCE_COLOR: Record<AiMemoryEntry["source"], string> = {
  user: "blue",
  assistant: "violet",
  analytics: "amber",
  auto: "gray",
};

export default function Memory() {
  const [entries, setEntries] = useState<AiMemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<AiMemoryKind>("fact");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | AiMemoryKind>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai-memory");
        const data = await res.json();
        if (res.ok) setEntries(data.memory as AiMemoryEntry[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, text: text.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        setEntries((e) => [...e, data.entry as AiMemoryEntry]);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/ai-memory/${id}`, { method: "DELETE" });
  }

  const visible = entries
    .filter((e) => filter === "all" || e.kind === filter)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="card mem">
      <div className="mem__head">
        <div>
          <h2 className="card__title">What the AI knows</h2>
          <p className="card__lede">
            Memory the strategist uses on every generation. Add facts, preferences and hard rules — they survive
            sign-out and feed into every post we draft for you.
          </p>
        </div>
        <span className="mem__badge">{entries.length} entries</span>
      </div>

      <div className="mem__addrow">
        <select className="input input--sm" value={kind} onChange={(e) => setKind(e.target.value as AiMemoryKind)}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.label}</option>
          ))}
        </select>
        <input
          className="input input--sm mem__input"
          placeholder={KINDS.find((k) => k.id === kind)?.hint}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy && text.trim()) add();
          }}
          dir="auto"
        />
        <button className="btn btn--sm" onClick={add} disabled={busy || !text.trim()}>
          {busy ? "Saving…" : "Remember"}
        </button>
      </div>

      <div className="mem__filters">
        <button className={`chip chip--xs ${filter === "all" ? "is-on" : ""}`} onClick={() => setFilter("all")}>
          All <small>{entries.length}</small>
        </button>
        {KINDS.map((k) => (
          <button
            key={k.id}
            className={`chip chip--xs ${filter === k.id ? "is-on" : ""}`}
            onClick={() => setFilter(k.id)}
          >
            {k.label} <small>{counts[k.id] ?? 0}</small>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="bk__sub">Loading memory…</p>
      ) : visible.length === 0 ? (
        <div className="empty-card">
          <p>No entries yet. Add things you want the AI to never forget — your hero product, audience, taboo topics.</p>
        </div>
      ) : (
        <ul className="mem__list">
          {visible.map((e) => (
            <li key={e.id} className={`mem__item mem__item--${e.kind}`}>
              <div className="mem__main">
                <span className="mem__kind">{e.kind.replace("-", " ")}</span>
                <p dir="auto">{e.text}</p>
                <span className={`mem__source mem__source--${SOURCE_COLOR[e.source]}`}>
                  {e.source} · {new Date(e.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button className="mem__del" onClick={() => remove(e.id)} aria-label="Forget this">×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
