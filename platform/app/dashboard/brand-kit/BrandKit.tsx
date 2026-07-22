"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandKit as BrandKitType, GeneratedLogoEntry } from "@/lib/db";

const VISUAL_STYLES = [
  { id: "saturated-film", name: "Saturated Film", preview: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=70&auto=format&fit=crop" },
  { id: "clean-minimal", name: "Clean Minimal", preview: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70&auto=format&fit=crop" },
  { id: "warm-editorial", name: "Warm Editorial", preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=70&auto=format&fit=crop" },
  { id: "bold-contrast", name: "Bold Contrast", preview: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=70&auto=format&fit=crop" },
  { id: "soft-pastel", name: "Soft Pastel", preview: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70&auto=format&fit=crop" },
  { id: "dark-luxury", name: "Dark Luxury", preview: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&q=70&auto=format&fit=crop" },
  { id: "natural-light", name: "Natural Light", preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70&auto=format&fit=crop" },
  { id: "vibrant-pop", name: "Vibrant Pop", preview: "https://images.unsplash.com/photo-1550684848-fac1c5b4ee8b?w=400&q=70&auto=format&fit=crop" },
] as const;

const FONT_OPTIONS = [
  "Inter",
  "Akzidenz-Grotesk Next",
  "Cormorant Garamond",
  "Helvetica Neue",
  "Georgia",
  "IBM Plex Sans Arabic",
  "Playfair Display",
  "Montserrat",
  "Roboto",
  "Arial",
] as const;

const EMPTY: BrandKitType = {
  primaryColor: "#15352b",
  secondaryColor: "#7cae3f",
  logoUrl: "",
  voice: "",
  fonts: "Inter",
  visualStyle: "saturated-film",
  purpose: "",
  audience: "",
  character: "",
  toneTraits: [],
  emotionTraits: [],
};

const TABS = ["Media Library", "Brand Style", "Logo Maker", "Brand Voice", "Brand Profile", "Source Materials"] as const;
type Tab = (typeof TABS)[number];

const SUGGESTED_TONE = [
  "Formal and authoritative",
  "Encouraging and supportive",
  "Informative and educational",
  "Friendly and conversational",
  "Confident and bold",
];

const SUGGESTED_EMOTION = [
  "Pride in local heritage",
  "Trust in services",
  "Community spirit and inclusivity",
  "Energy and momentum",
  "Calm reassurance",
];

interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  kind: "image" | "video" | "other";
  uploadedAt: string;
}

export default function BrandKit({ initial, company }: { initial: BrandKitType | null; company: string }) {
  const [tab, setTab] = useState<Tab>("Media Library");
  const [kit, setKit] = useState<BrandKitType>(() => ({ ...EMPTY, ...(initial ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const business = company || "Your business";

  // ---- Auto-save (debounced) so navigating away keeps changes -------------
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
          body: JSON.stringify({ brandKit: kit }),
        });
        setSaved("saved");
      } catch {
        setSaved("idle");
      }
    }, 700);
    return () => clearTimeout(id);
  }, [kit]);

  function set<K extends keyof BrandKitType>(k: K, v: BrandKitType[K]) {
    setKit((p) => ({ ...p, [k]: v }));
  }

  function toggleChip(field: "toneTraits" | "emotionTraits", value: string) {
    setKit((p) => {
      const list = p[field] ?? [];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...p, [field]: next };
    });
  }

  async function saveNow() {
    setBusy(true);
    setSaved("saving");
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandKit: kit }),
      });
      setSaved("saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bk">
      <div className="bk__tabs">
        {TABS.map((t) => (
          <button key={t} className={`bk__tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
        <span className="bk__autosave" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "✓ Saved" : ""}
        </span>
      </div>

      <div className="bk__panel">
        {tab === "Media Library" && <MediaLibrary />}

        {tab === "Brand Style" && (
          <>
            <h2 className="bk__h">Brand Style</h2>
            <div className="style-grid">
              <LogoStyleCard
                logoUrl={kit.logoUrl}
                business={business}
                onLogoUrl={(url) => set("logoUrl", url)}
              />

              <div className="style-card style-card--visual">
                <div className="style-card__head"><strong>Visual Style</strong></div>
                <div className="visual-style-grid">
                  {VISUAL_STYLES.map((vs) => {
                    const active = (kit.visualStyle ?? "saturated-film") === vs.id;
                    return (
                      <button
                        key={vs.id}
                        type="button"
                        className={`visual-style-opt ${active ? "is-active" : ""}`}
                        onClick={() => set("visualStyle", vs.id)}
                        title={vs.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={vs.preview} alt="" />
                        <span>{vs.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="style-card">
                <div className="style-card__head"><strong>Fonts</strong></div>
                <div
                  className="style-card__font"
                  style={{ fontFamily: kit.fonts || "Inter" }}
                >
                  Aa Bb Cc
                </div>
                <select
                  className="input"
                  value={kit.fonts || "Inter"}
                  onChange={(e) => set("fonts", e.target.value)}
                  aria-label="Brand font"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  {!((FONT_OPTIONS as readonly string[]).includes(kit.fonts)) && kit.fonts && (
                    <option value={kit.fonts}>{kit.fonts}</option>
                  )}
                </select>
              </div>

              <div className="style-card">
                <div className="style-card__head"><strong>Colors</strong></div>
                <div className="color-swatches">
                  <label className="swatch">
                    <input type="color" value={kit.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
                    <span>Primary</span>
                  </label>
                  <label className="swatch">
                    <input type="color" value={kit.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} />
                    <span>Secondary</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="ds-saverow">
              <span className="ds-saved" aria-live="polite">{saved === "saved" && "Saved ✓"}</span>
              <button className="btn" onClick={saveNow} disabled={busy}>{busy ? "Saving…" : "Save brand style"}</button>
            </div>
          </>
        )}

        {tab === "Brand Voice" && (
          <>
            <h2 className="bk__h">Brand Voice</h2>
            <p className="bk__sub">Everything here is fed into the AI strategist&rsquo;s system prompt — change it and the next post sounds different immediately.</p>
            <div className="voice">
              <div className="field">
                <label>Purpose</label>
                <textarea className="input" rows={3} dir="auto" value={kit.purpose ?? ""} onChange={(e) => set("purpose", e.target.value)} placeholder="What is this brand here to do for its audience?" />
              </div>
              <div className="field">
                <label>Audience</label>
                <textarea className="input" rows={3} dir="auto" value={kit.audience ?? ""} onChange={(e) => set("audience", e.target.value)} placeholder="Who exactly are you talking to?" />
              </div>
              <div className="field">
                <label>Tone</label>
                <ChipPicker
                  selected={kit.toneTraits ?? []}
                  suggested={SUGGESTED_TONE}
                  onToggle={(v) => toggleChip("toneTraits", v)}
                  onAddCustom={(v) => set("toneTraits", [...(kit.toneTraits ?? []), v])}
                />
              </div>
              <div className="field">
                <label>Emotion</label>
                <ChipPicker
                  selected={kit.emotionTraits ?? []}
                  suggested={SUGGESTED_EMOTION}
                  onToggle={(v) => toggleChip("emotionTraits", v)}
                  onAddCustom={(v) => set("emotionTraits", [...(kit.emotionTraits ?? []), v])}
                />
              </div>
              <div className="field">
                <label>Character</label>
                <textarea className="input" rows={3} dir="auto" value={kit.character ?? ""} onChange={(e) => set("character", e.target.value)} placeholder="How would a customer describe this brand to a friend?" />
              </div>
              <div className="field">
                <label>Voice notes (free text)</label>
                <textarea className="input" rows={3} dir="auto" value={kit.voice} onChange={(e) => set("voice", e.target.value)} placeholder="Anything else the strategist should keep in mind." />
              </div>
            </div>
            <div className="ds-saverow">
              <span className="ds-saved" aria-live="polite">{saved === "saved" && "Saved ✓"}</span>
              <button className="btn" onClick={saveNow} disabled={busy}>{busy ? "Saving…" : "Save brand voice"}</button>
            </div>
          </>
        )}

        {tab === "Brand Profile" && (
          <div className="profile">
            <ProfileBlock title="Business Name"><strong>{business}</strong></ProfileBlock>
            <ProfileBlock title="Business Overview & Positioning">
              <p>{kit.purpose || `${business} is dedicated to serving its community with reliable services and a focus on improving everyday quality of life.`}</p>
            </ProfileBlock>
            <ProfileBlock title="Audience">
              <p>{kit.audience || "Define your audience in the Brand Voice tab to populate this section."}</p>
            </ProfileBlock>
            <ProfileBlock title="Tone">
              {(kit.toneTraits ?? []).length === 0 ? (
                <p className="bk__sub">No tone selected yet.</p>
              ) : (
                <ul>{(kit.toneTraits ?? []).map((t) => <li key={t}>{t}</li>)}</ul>
              )}
            </ProfileBlock>
            <ProfileBlock title="Character">
              <p>{kit.character || "Describe the brand's character in the Brand Voice tab."}</p>
            </ProfileBlock>
          </div>
        )}

        {tab === "Logo Maker" && (
          <LogoMaker
            company={business}
            primaryColor={kit.primaryColor}
            secondaryColor={kit.secondaryColor}
            currentLogoUrl={kit.logoUrl}
            history={kit.logoHistory ?? []}
            onAccept={(url) => set("logoUrl", url)}
            onHistoryChange={(logoHistory) => set("logoHistory", logoHistory)}
          />
        )}

        {tab === "Source Materials" && <SourceMaterials />}
      </div>
    </div>
  );
}

function LogoStyleCard({
  logoUrl,
  business,
  onLogoUrl,
}: {
  logoUrl: string;
  business: string;
  onLogoUrl: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.asset?.url) onLogoUrl(data.asset.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="style-card">
      <div className="style-card__head"><strong>Logo</strong></div>
      <label className="logo-upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="logo-upload__input"
          onChange={(e) => uploadLogo(e.target.files)}
          disabled={uploading}
        />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="style-card__logo" src={logoUrl} alt="" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
        ) : (
          <div className="style-card__logo style-card__logo--empty">
            <span className="logo-upload__glyph">{business.charAt(0)}</span>
            <span className="logo-upload__hint">{uploading ? "Uploading…" : "Click to upload logo"}</span>
          </div>
        )}
        {logoUrl && (
          <span className="logo-upload__overlay">{uploading ? "Uploading…" : "Change logo"}</span>
        )}
      </label>
      {logoUrl && (
        <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => onLogoUrl("")}>
          Remove logo
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo Maker
// ---------------------------------------------------------------------------

const LOGO_STYLES = ["Minimal", "Bold", "Playful", "Luxury", "Geometric", "Hand-drawn"] as const;
type LogoStyle = (typeof LOGO_STYLES)[number];

function LogoMaker({
  company,
  primaryColor,
  secondaryColor,
  currentLogoUrl,
  history,
  onAccept,
  onHistoryChange,
}: {
  company: string;
  primaryColor: string;
  secondaryColor: string;
  currentLogoUrl: string;
  history: GeneratedLogoEntry[];
  onAccept: (url: string) => void;
  onHistoryChange: (entries: GeneratedLogoEntry[]) => void;
}) {
  const [companyName, setCompanyName] = useState(company);
  const [style, setStyle] = useState<LogoStyle>("Minimal");
  const [vibe, setVibe] = useState("");
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedLogoEntry | null>(history[0] ?? null);
  const [error, setError] = useState<string | null>(null);

  const colorsDesc = [primaryColor, secondaryColor].filter(Boolean).join(" and ");

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/logo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || company,
          style,
          colors: colorsDesc,
          vibe,
        }),
      });
      const data = (await res.json()) as { logo?: GeneratedLogoEntry; error?: string };
      if (res.ok && data.logo) {
        setPreview(data.logo);
        onHistoryChange([data.logo, ...history.filter((h) => h.id !== data.logo!.id)].slice(0, 24));
      } else {
        setError(data.error ?? "Generation failed — please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleRefImage(files: FileList | null) {
    if (!files || !files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => setRefDataUrl((e.target?.result as string) ?? null);
    reader.readAsDataURL(files[0]);
  }

  function useLogo(entry: GeneratedLogoEntry) {
    onAccept(entry.url);
    setPreview(entry);
  }

  async function removeLogo(id: string) {
    if (!confirm("Remove this logo from your history?")) return;
    const removed = history.find((h) => h.id === id);
    const res = await fetch(`/api/logo/generate?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.logoHistory)) {
      onHistoryChange(data.logoHistory);
      if (preview?.id === id) setPreview(data.logoHistory[0] ?? null);
      if (removed && currentLogoUrl === removed.url) onAccept("");
    }
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const isActiveBrand = Boolean(preview && currentLogoUrl === preview.url);

  return (
    <div className="logo-maker">
      <h2 className="bk__h">AI Logo Maker</h2>
      <p className="bk__sub">
        Describe your brand and generate logos.
        Pick one as your active logo — it syncs to Brand Style automatically.
      </p>

      <div className="logo-maker__grid">
        <div className="logo-maker__form voice">
          <div className="field">
            <label htmlFor="logo-company">Company name</label>
            <input
              id="logo-company"
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="field">
            <label>What style?</label>
            <div className="chips">
              {LOGO_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${style === s ? "is-on" : ""}`}
                  onClick={() => setStyle(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Brand colors</label>
            <div className="color-swatches">
              <div className="swatch swatch--ro">
                <div className="swatch__dot" style={{ background: primaryColor }} />
                <span>Primary</span>
              </div>
              <div className="swatch swatch--ro">
                <div className="swatch__dot" style={{ background: secondaryColor }} />
                <span>Secondary</span>
              </div>
            </div>
          </div>

          <div className="field">
            <label>Describe the vibe</label>
            <textarea
              className="input"
              rows={2}
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="e.g. clean modern tech, luxury heritage, playful community…"
            />
          </div>

          <div className="field">
            <label>Reference image <em>optional</em></label>
            <label className="btn btn--sm" style={{ display: "inline-flex", cursor: "pointer" }}>
              {refDataUrl ? "Change reference" : "Upload reference"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleRefImage(e.target.files)}
              />
            </label>
          </div>

          <div className="logo-maker__genrow">
            <button className="btn" onClick={generate} disabled={generating}>
              {generating ? "Generating…" : preview ? "Generate another" : "Generate logo"}
            </button>
            {generating && <span className="logo-maker__wait">Up to 30 seconds…</span>}
          </div>

          {error && <p className="logo-maker__error">{error}</p>}
        </div>

        <div className="logo-maker__stage">
          <div className={`logo-preview ${generating ? "is-loading" : ""}`}>
            <div className="logo-preview__label">Preview</div>
            <div className="logo-preview__canvas">
              {generating ? (
                <div className="logo-preview__placeholder">
                  <span className="logo-preview__spinner" aria-hidden />
                  <span>Creating your logo…</span>
                </div>
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="logo-preview__img" src={preview.url} alt={`${preview.style} logo for ${company}`} />
              ) : (
                <div className="logo-preview__placeholder">
                  <span className="logo-preview__glyph">{company.charAt(0)}</span>
                  <span>Your logo appears here</span>
                </div>
              )}
            </div>
            {preview && !generating && (
              <div className="logo-preview__foot">
                <div className="logo-preview__meta">
                  <span className="chip is-on chip--xs">{preview.style}</span>
                  {isActiveBrand && <span className="logo-preview__active">Active brand logo</span>}
                </div>
                <div className="logo-preview__actions">
                  <a href={preview.url} download={`${company}-logo.png`} className="btn btn--ghost btn--sm">
                    Download
                  </a>
                  <button
                    className="btn btn--sm"
                    onClick={() => useLogo(preview)}
                    disabled={isActiveBrand}
                  >
                    {isActiveBrand ? "✓ In use" : "Use this logo"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="logo-gallery">
        <div className="logo-gallery__head">
          <h3 className="logo-gallery__title">Your generated logos</h3>
          <span className="logo-gallery__count">{history.length} saved</span>
        </div>
        {history.length === 0 ? (
          <div className="logo-gallery__empty">
            <p>No logos yet. Generate your first one above — every version is saved here.</p>
          </div>
        ) : (
          <div className="logo-gallery__grid">
            {history.map((entry) => {
              const active = currentLogoUrl === entry.url;
              const selected = preview?.id === entry.id;
              return (
                <article
                  key={entry.id}
                  className={`logo-card ${selected ? "is-selected" : ""} ${active ? "is-active" : ""}`}
                >
                  <button type="button" className="logo-card__thumb" onClick={() => setPreview(entry)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.url} alt="" />
                  </button>
                  <div className="logo-card__body">
                    <span className="logo-card__style">{entry.style}</span>
                    <span className="logo-card__date">{fmtDate(entry.createdAt)}</span>
                    {active && <span className="logo-card__badge">Active</span>}
                  </div>
                  <div className="logo-card__actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => useLogo(entry)} disabled={active}>
                      Use
                    </button>
                    <button type="button" className="logo-card__del" onClick={() => removeLogo(entry.id)} aria-label="Remove logo">
                      ×
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ChipPicker({
  selected,
  suggested,
  onToggle,
  onAddCustom,
}: {
  selected: string[];
  suggested: string[];
  onToggle: (v: string) => void;
  onAddCustom: (v: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const all = Array.from(new Set([...selected, ...suggested]));
  return (
    <div className="chips">
      {all.map((t) => (
        <button key={t} type="button" className={`chip ${selected.includes(t) ? "is-on" : ""}`} onClick={() => onToggle(t)}>
          {t}{selected.includes(t) ? " ×" : ""}
        </button>
      ))}
      <span className="chip chip--add">
        <input
          className="chip__input"
          placeholder="+ Add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onAddCustom(draft.trim());
              setDraft("");
            }
          }}
        />
      </span>
    </div>
  );
}

function MediaLibrary() {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/media");
        const data = await res.json();
        if (res.ok && Array.isArray(data.media)) setMedia(data.media);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/media", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.asset) setMedia((m) => [data.asset, ...m]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this asset?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) setMedia((m) => m.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="bk__panelhead">
        <div>
          <h2 className="bk__h">Media Library <span>{media.filter((m) => m.kind === "image").length} images, {media.filter((m) => m.kind === "video").length} videos</span></h2>
          <p className="bk__sub">Upload pictures and videos. The AI uses these when generating posts, blogs and emails.</p>
        </div>
        <label className="btn btn--sm">
          {busy ? "Uploading…" : "+ Add New Media"}
          <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => upload(e.target.files)} disabled={busy} />
        </label>
      </div>
      {loading ? (
        <p className="bk__sub">Loading…</p>
      ) : media.length === 0 ? (
        <div className="empty-card">
          <p>No media yet. Upload pictures or short videos to give the AI something to work with.</p>
        </div>
      ) : (
        <div className="media-grid">
          {media.map((m) => (
            <figure key={m.id} className="media-card">
              {m.kind === "video" ? (
                <video src={m.url} muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.filename} />
              )}
              <figcaption dir="auto">{m.filename}</figcaption>
              <span className="media-card__meta">{m.kind} · {new Date(m.uploadedAt).toLocaleDateString()}</span>
              <button className="media-card__del" onClick={() => remove(m.id)} aria-label="Delete asset">×</button>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

function SourceMaterials() {
  return (
    <>
      <div className="bk__panelhead">
        <div>
          <h2 className="bk__h">Source Materials</h2>
          <p className="bk__sub">Coming soon — paste website URLs and we&rsquo;ll scrape them into the brand kit.</p>
        </div>
      </div>
      <div className="empty-card">
        <p>For now, use the AI Strategist or Brand Voice tab to feed source material directly.</p>
      </div>
    </>
  );
}

function ProfileBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="profile__block">
      <div className="profile__head"><h3>{title}</h3></div>
      <div className="profile__body">{children}</div>
    </section>
  );
}
