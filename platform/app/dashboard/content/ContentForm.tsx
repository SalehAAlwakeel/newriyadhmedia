"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentPreferences } from "@/lib/db";

const EMPTY: ContentPreferences = {
  languages: ["Arabic"],
  tone: "",
  topics: "",
  postsPerWeek: 5,
  doNotMention: "",
  mode: "growth",
  includeMusic: true,
  includeNarration: false,
  ctaCopy: "",
  ctaUrl: "",
  smartCaptions: false,
};

const MODES: { id: NonNullable<ContentPreferences["mode"]>; name: string; desc: string }[] = [
  { id: "growth", name: "Growth-focused", desc: "Maximizes performance with AI enhancements and smart substitutions." },
  { id: "balanced", name: "Balanced", desc: "Improves styling and composition while keeping more of your original content intact." },
  { id: "brand-first", name: "Brand-first", desc: "Applies lighting improvements while preserving the original look and feel." },
  { id: "strict", name: "Strict brand control", desc: "Uses only your Brand Kit assets without modifications or stock content. Carousels cannot be created." },
];

const CAPTION_PLATFORMS = [
  { name: "Instagram", desc: "Conversational, expressive, uses emojis and short sentences" },
  { name: "Facebook", desc: "Balanced between personal and informative; encourages comments" },
  { name: "LinkedIn", desc: "Formal but human; focuses on expertise, leadership, and value" },
  { name: "X/Twitter", desc: "Short, punchy, often uses humor or trending language" },
  { name: "YouTube", desc: "Descriptive and keyword-rich; optimized for search and discovery" },
  { name: "TikTok", desc: "Casual and trend-driven; hooks viewers in the first line" },
];

export default function ContentForm({ initial }: { initial: ContentPreferences | null }) {
  const [prefs, setPrefs] = useState<ContentPreferences>({ ...EMPTY, ...(initial ?? {}) });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaved("saving");
    const id = setTimeout(async () => {
      try {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentPrefs: prefs }),
        });
        setSaved("saved");
      } catch {
        setSaved("idle");
      }
    }, 700);
    return () => clearTimeout(id);
  }, [prefs]);

  function set<K extends keyof ContentPreferences>(k: K, v: ContentPreferences[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setSaved("saving");
    try {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentPrefs: prefs }) });
      setSaved("saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cprefs">
      <section className="cprefs__sec">
        <p className="cprefs__intro">
          Content is created by generating variants of your Brand Kit assets, optimized for your goals, strategies and topics. Choose how to balance fidelity to your assets vs. optimizing content to your goals.
        </p>
        <div className="modes">
          {MODES.map((m) => (
            <button key={m.id} type="button" className={`mode ${prefs.mode === m.id ? "is-selected" : ""}`} onClick={() => set("mode", m.id)}>
              <span className="mode__radio" aria-hidden="true" />
              <span className="mode__text"><strong>{m.name}</strong><span>{m.desc}</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="cprefs__sec">
        <h2 className="bk__h">Video Preferences</h2>
        <Toggle label="Include music" desc="Include a backing track to your videos" on={!!prefs.includeMusic} onChange={(v) => set("includeMusic", v)} />
        <Toggle label="Include narrations" desc="Add an AI voiceover to your videos" badge="Coming Soon" on={!!prefs.includeNarration} onChange={(v) => set("includeNarration", v)} disabled />
      </section>

      <section className="cprefs__sec">
        <h2 className="bk__h">Default Call-to-Action</h2>
        <p className="cprefs__hint">Set a default copy and URL as a reference, customized per post based on a campaign&rsquo;s goals.</p>
        <div className="ds-grid ds-grid--2" style={{ gap: 16 }}>
          <div className="field"><label>Call-to-action copy</label><input className="input" dir="auto" value={prefs.ctaCopy ?? ""} onChange={(e) => set("ctaCopy", e.target.value)} placeholder="e.g. Start your request online" /></div>
          <div className="field"><label>Default URL</label><input className="input" dir="ltr" value={prefs.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://…" /></div>
        </div>
      </section>

      <section className="cprefs__sec">
        <h2 className="bk__h">Smart Captions</h2>
        <Toggle
          label={`Smart Captions are ${prefs.smartCaptions ? "ON" : "OFF"}`}
          desc="Tailored captions per platform. Each social network gets optimized captions matching its unique style and audience."
          on={!!prefs.smartCaptions}
          onChange={(v) => set("smartCaptions", v)}
        />
        <div className="caption-list">
          <p className="cprefs__hint">With Smart Captions, your posts automatically adapt to each platform:</p>
          {CAPTION_PLATFORMS.map((p) => (
            <div key={p.name} className="caption-row">
              <strong>{p.name}</strong>
              <span>{p.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="ds-saverow">
        <span className="ds-saved" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved ✓" : ""}
        </span>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
      </div>
    </div>
  );
}

function Toggle({ label, desc, on, onChange, badge, disabled }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void; badge?: string; disabled?: boolean }) {
  return (
    <div className={`toggle-row ${disabled ? "is-disabled" : ""}`}>
      <div className="toggle-row__text">
        <strong>{label}{badge && <span className="toggle-row__badge">{badge}</span>}</strong>
        <span>{desc}</span>
      </div>
      <button type="button" role="switch" aria-checked={on} className={`switch ${on ? "is-on" : ""}`} onClick={() => !disabled && onChange(!on)} disabled={disabled}>
        <span className="switch__knob" />
      </button>
    </div>
  );
}
