"use client";

import { useMemo, useState } from "react";
import { STRATEGIES, CHANNELS, CADENCES } from "@/lib/strategies";
import type {
  AudienceInput,
  BusinessProfile,
  Cadence,
  Campaign,
  CampaignPlan,
  ChannelId,
  StrategyId,
} from "@/lib/types";

type StepId =
  | "url"
  | "profile"
  | "audience"
  | "positioning"
  | "strategy"
  | "campaign"
  | "channels"
  | "mix"
  | "photos"
  | "plan"
  | "result";

const ORDER: StepId[] = [
  "url",
  "profile",
  "audience",
  "positioning",
  "strategy",
  "campaign",
  "channels",
  "mix",
  "photos",
  "plan",
  "result",
];

// Per-type credit costs (mirrors the full platform's credit model) and a
// sensible default weekly mix the wizard recommends as a starting point.
const TRIAL_CREDITS = 200;
interface ContentType {
  id: string;
  name: string;
  desc: string;
  credits: number;
  recommended: number;
}
const CONTENT_TYPES: ContentType[] = [
  { id: "still", name: "Still Images", desc: "Single image post for feeds", credits: 6, recommended: 3 },
  { id: "carousel", name: "Carousels", desc: "Multi-slide storytelling", credits: 24, recommended: 1 },
  { id: "feedVideo", name: "Feed Videos", desc: "Polished video for feed", credits: 40, recommended: 0 },
  { id: "shortVideo", name: "Short-form Video", desc: "Reels, TikToks, Shorts", credits: 40, recommended: 0 },
  { id: "stories", name: "Stories", desc: "Ephemeral vertical content", credits: 6, recommended: 0 },
  { id: "blogs", name: "Blogs", desc: "Long-form SEO articles", credits: 20, recommended: 1 },
  { id: "emails", name: "Emails", desc: "Newsletter sends", credits: 8, recommended: 1 },
];

interface FreedomOption {
  id: string;
  name: string;
  desc: string;
}
const PHOTO_FREEDOM: FreedomOption[] = [
  { id: "full", name: "Full Freedom", desc: "The AI can significantly transform your photos for the best possible result." },
  { id: "balanced", name: "Balanced", desc: "The AI makes thoughtful edits but keeps your photos recognizable." },
  { id: "minimal", name: "Minimal changes", desc: "The AI only adjusts lighting and minor details. Your originals stay mostly as-is." },
  { id: "strict", name: "Strict brand control", desc: "Uses only your reference assets without modifications. Carousels cannot be created." },
];

const LANGUAGE_PRESETS = [
  { label: "العربية", value: "Arabic" },
  { label: "English", value: "English" },
  { label: "Arabic + English", value: "Arabic + English" },
];

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11v5M7 8v.01M10 16v-3.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><path d="M4 4l6.5 8L4 20h2l5.3-6.5L16 20h4l-7-8.5L19.5 4h-2L12.7 10 8 4H4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  google_business: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><path d="M9 12a4 4 0 1 0 4 4V4c1.5 2 3.5 3 6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><rect x="2" y="4" width="20" height="16" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/></svg>
  ),
  newsletter: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  blog: (
    <svg viewBox="0 0 24 24" fill="none" className="channel-icon"><path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
};

const STRATEGY_ICONS: Record<string, React.ReactNode> = {
  authority: (
    <svg viewBox="0 0 32 32" fill="none" className="strategy-icon"><circle cx="16" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M16 17v6M12 27l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 8l-2-4M24 8l2-4M16 5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
  performance: (
    <svg viewBox="0 0 32 32" fill="none" className="strategy-icon"><path d="M4 24l7-7 4 4 8-10 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="26" cy="18" r="3" stroke="currentColor" strokeWidth="1.2"/></svg>
  ),
  community: (
    <svg viewBox="0 0 32 32" fill="none" className="strategy-icon"><circle cx="16" cy="11" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="14" r="3" stroke="currentColor" strokeWidth="1.2"/><circle cx="24" cy="14" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M6 24c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  launch: (
    <svg viewBox="0 0 32 32" fill="none" className="strategy-icon"><path d="M16 4l-3 10h6L16 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M16 14v12M10 22l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 10l-3 2M24 10l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
  education: (
    <svg viewBox="0 0 32 32" fill="none" className="strategy-icon"><path d="M4 12l12-6 12 6-12 6-12-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 14v7c0 2 3.6 4 8 4s8-2 8-4v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M28 12v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
};

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export default function Wizard() {
  const [step, setStep] = useState<StepId>("url");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [manualNotice, setManualNotice] = useState(false);

  // ---- accumulated flow state ----
  const [url, setUrl] = useState("");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [audience, setAudience] = useState<AudienceInput>({ audience: "", adFaces: "", language: "" });
  const [positioning, setPositioning] = useState("");
  const [recommended, setRecommended] = useState<StrategyId | null>(null);
  const [strategyId, setStrategyId] = useState<StrategyId | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [channels, setChannels] = useState<ChannelId[]>([]);
  const [cadence, setCadence] = useState<Cadence>("steady");
  const [mix, setMix] = useState<Record<string, number>>(() =>
    Object.fromEntries(CONTENT_TYPES.map((c) => [c.id, c.recommended]))
  );
  const [photoFreedom, setPhotoFreedom] = useState<string>("balanced");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);

  function addRefImages(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    setRefImages((prev) => [...prev, ...urls].slice(0, 8));
  }
  function removeRef(i: number) {
    setRefImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  const stepIndex = ORDER.indexOf(step);

  function go(to: StepId) {
    setError(null);
    setStep(to);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function flagMock(source?: string) {
    if (source === "mock") setUsedMock(true);
  }

  // ---------- actions ----------
  async function runScan() {
    if (!url.trim()) {
      setError("Please enter your website address.");
      return;
    }
    setBusy(true);
    setError(null);
    setManualNotice(false);
    try {
      const data = await postJSON<{
        profile?: BusinessProfile;
        source?: string;
        error?: string;
        manual?: boolean;
      }>("/api/scan", { url });

      if (data.manual || !data.profile) {
        // Couldn't read the site — let them fill it in manually.
        setManualNotice(true);
        setProfile({
          businessName: "",
          elevatorPitch: "",
          logoUrl: null,
          detectedLanguage: "English",
          sourceUrl: url.startsWith("http") ? url : `https://${url}`,
        });
        setAudience((a) => ({ ...a, language: "English" }));
        go("profile");
        return;
      }

      flagMock(data.source);
      setProfile(data.profile);
      setAudience((a) => ({ ...a, language: data.profile!.detectedLanguage }));
      go("profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runPositioning() {
    if (!audience.audience.trim() || !audience.adFaces.trim() || !audience.language.trim()) {
      setError("Please answer all three questions.");
      return;
    }
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<{ positioning: string; recommendedStrategyId: StrategyId; source?: string }>(
        "/api/positioning",
        {
          businessName: profile.businessName,
          elevatorPitch: profile.elevatorPitch,
          sourceUrl: profile.sourceUrl,
          audience: audience.audience,
          adFaces: audience.adFaces,
          language: audience.language,
        }
      );
      flagMock(data.source);
      setPositioning(data.positioning);
      setRecommended(data.recommendedStrategyId);
      if (!strategyId) setStrategyId(data.recommendedStrategyId);
      go("positioning");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate positioning.");
    } finally {
      setBusy(false);
    }
  }

  async function runCampaign() {
    if (!profile || !strategyId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<Campaign & { source?: string }>("/api/campaign", {
        businessName: profile.businessName,
        elevatorPitch: profile.elevatorPitch,
        positioning,
        audience: audience.audience,
        language: audience.language,
        strategyId,
        targetLink: profile.sourceUrl,
      });
      flagMock(data.source);
      setCampaign({ name: data.name, theme: data.theme, callToAction: data.callToAction, targetLink: data.targetLink });
      go("campaign");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function runPlan() {
    if (!campaign || channels.length === 0) {
      setError("Pick at least one channel.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<CampaignPlan & { source?: string }>("/api/plan", {
        businessName: profile!.businessName,
        campaignName: campaign.name,
        campaignTheme: campaign.theme,
        language: audience.language,
        channels,
        cadence,
      });
      flagMock(data.source);
      setPlan({ weeks: data.weeks });
      go("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the plan.");
    } finally {
      setBusy(false);
    }
  }

  async function submitLead() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!profile || !strategyId || !campaign || !plan) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/lead", {
        email,
        result: { profile, audience, positioning, strategyId, campaign, channels, cadence, mix, photoFreedom, referenceImageCount: refImages.length, plan },
      });
      setEmailDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleChannel(id: ChannelId) {
    setChannels((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  const progress = useMemo(() => {
    return ORDER.map((_, i) => {
      if (i < stepIndex) return "is-done";
      if (i === stepIndex) return "is-active";
      return "";
    });
  }, [stepIndex]);

  return (
    <div>
      <div className="progress" aria-hidden="true">
        {progress.map((cls, i) => (
          <span key={i} className={`progress__seg ${cls}`}>
            <span />
          </span>
        ))}
      </div>

      {usedMock && (
        <div className="notice notice--info">
          Showing sample AI output. Add an <code>OPENAI_API_KEY</code> to generate real, tailored copy.
        </div>
      )}
      {error && <div className="notice notice--warn">{error}</div>}

      {busy && <Thinking step={step} />}

      {!busy && (
        <>
          {step === "url" && <UrlStep url={url} setUrl={setUrl} onNext={runScan} />}

          {step === "profile" && profile && (
            <ProfileStep
              profile={profile}
              setProfile={setProfile}
              manual={manualNotice}
              onBack={() => go("url")}
              onNext={() => go("audience")}
            />
          )}

          {step === "audience" && (
            <AudienceStep
              audience={audience}
              setAudience={setAudience}
              onBack={() => go("profile")}
              onNext={runPositioning}
            />
          )}

          {step === "positioning" && (
            <PositioningStep
              positioning={positioning}
              setPositioning={setPositioning}
              recommended={recommended}
              onBack={() => go("audience")}
              onNext={() => go("strategy")}
            />
          )}

          {step === "strategy" && (
            <StrategyStep
              selected={strategyId}
              recommended={recommended}
              onSelect={setStrategyId}
              onBack={() => go("positioning")}
              onNext={runCampaign}
            />
          )}

          {step === "campaign" && campaign && (
            <CampaignStep
              campaign={campaign}
              setCampaign={setCampaign}
              onBack={() => go("strategy")}
              onNext={() => go("channels")}
            />
          )}

          {step === "channels" && (
            <ChannelsStep
              channels={channels}
              toggle={toggleChannel}
              cadence={cadence}
              setCadence={setCadence}
              onBack={() => go("campaign")}
              onNext={() => go("mix")}
            />
          )}

          {step === "mix" && (
            <MixStep mix={mix} setMix={setMix} onBack={() => go("channels")} onNext={() => go("photos")} />
          )}

          {step === "photos" && (
            <PhotosStep
              businessName={profile?.businessName || "the AI"}
              photoFreedom={photoFreedom}
              setPhotoFreedom={setPhotoFreedom}
              refImages={refImages}
              addRefImages={addRefImages}
              removeRef={removeRef}
              onBack={() => go("mix")}
              onNext={runPlan}
            />
          )}

          {step === "result" && plan && profile && campaign && strategyId && (
            <ResultStep
              profile={profile}
              positioning={positioning}
              strategyId={strategyId}
              campaign={campaign}
              channels={channels}
              cadence={cadence}
              plan={plan}
              language={audience.language}
              email={email}
              setEmail={setEmail}
              emailDone={emailDone}
              onEmail={submitLead}
            />
          )}
        </>
      )}
    </div>
  );
}

/* =================== step components =================== */

function Thinking({ step }: { step: StepId }) {
  const labels: Partial<Record<StepId, string>> = {
    url: "Scanning your website…",
    audience: "Finding your positioning…",
    strategy: "Writing your campaign…",
    channels: "Building your 4-week plan…",
    photos: "Building your 4-week plan…",
  };
  return (
    <div className="panel step">
      <div className="thinking">
        <span className="spinner" />
        <span>{labels[step] || "Working…"}</span>
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="skeleton lg" />
        <div className="skeleton" />
        <div className="skeleton" style={{ width: "80%" }} />
        <div className="skeleton" style={{ width: "65%" }} />
      </div>
    </div>
  );
}

function UrlStep({ url, setUrl, onNext }: { url: string; setUrl: (v: string) => void; onNext: () => void }) {
  return (
    <div className="step">
      <div className="step-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=900&q=80&auto=format&fit=crop"
          alt=""
          className="step-hero__img"
        />
        <div className="step-hero__overlay" />
      </div>
      <span className="eyebrow">[ Step 1 · Your website ]</span>
      <h1 className="display">
        Let's start with your <em>website.</em>
      </h1>
      <p className="lede">We'll scan it and pull out your business name, elevator pitch, logo and language — the AI does the heavy lifting.</p>
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="field">
          <label htmlFor="url">Website address</label>
          <input
            id="url"
            className="input input--lg"
            placeholder="yourbusiness.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onNext()}
            autoFocus
          />
        </div>
        <div className="actions actions--end">
          <button className="btn" onClick={onNext}>
            <span>Scan my site</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({
  profile,
  setProfile,
  manual,
  onBack,
  onNext,
}: {
  profile: BusinessProfile;
  setProfile: (p: BusinessProfile) => void;
  manual: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const valid = profile.businessName.trim() && profile.elevatorPitch.trim();
  return (
    <div className="step">
      <span className="eyebrow">[ Step 2 · Your business ]</span>
      <h1 className="display">Here's what we found.</h1>
      <p className="lede">Edit anything that's off — you know your business best.</p>

      {manual && (
        <div className="notice notice--warn">
          We couldn't read that site automatically. Please fill these in manually.
        </div>
      )}

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="scanhead">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="scanhead__logo"
              src={profile.logoUrl}
              alt=""
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : null}
          <div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="bn">Business name</label>
              <input
                id="bn"
                className="input"
                dir="auto"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="pitch">Elevator pitch</label>
          <textarea
            id="pitch"
            className="textarea"
            dir="auto"
            value={profile.elevatorPitch}
            onChange={(e) => setProfile({ ...profile, elevatorPitch: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="lang">Detected language</label>
          <input
            id="lang"
            className="input"
            value={profile.detectedLanguage}
            onChange={(e) => setProfile({ ...profile, detectedLanguage: e.target.value })}
          />
        </div>

        <div className="actions">
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn" disabled={!valid} onClick={onNext}>
            <span>Looks right</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function AudienceStep({
  audience,
  setAudience,
  onBack,
  onNext,
}: {
  audience: AudienceInput;
  setAudience: (a: AudienceInput) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="step">
      <div className="step-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80&auto=format&fit=crop"
          alt=""
          className="step-hero__img"
        />
        <div className="step-hero__overlay" />
      </div>
      <span className="eyebrow">[ Step 3 · Your audience ]</span>
      <h1 className="display">
        Who are we talking <em>to?</em>
      </h1>
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="field">
          <label htmlFor="aud">Who is your audience?</label>
          <textarea
            id="aud"
            className="textarea"
            placeholder="e.g. Busy founders of small businesses in Riyadh who don't have time for marketing."
            value={audience.audience}
            onChange={(e) => setAudience({ ...audience, audience: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="faces">Who do you want to appear in the ads?</label>
          <textarea
            id="faces"
            className="textarea"
            placeholder="e.g. Real local business owners, 30–45, modern and aspirational."
            value={audience.adFaces}
            onChange={(e) => setAudience({ ...audience, adFaces: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="plang">Primary language</label>
          <div className="chips" style={{ marginBottom: 10 }}>
            {LANGUAGE_PRESETS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`chip ${audience.language.trim() === l.value ? "is-selected" : ""}`}
                onClick={() => setAudience({ ...audience, language: l.value })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <input
            id="plang"
            className="input"
            dir="auto"
            placeholder="e.g. Arabic, English, or Arabic + English"
            value={audience.language}
            onChange={(e) => setAudience({ ...audience, language: e.target.value })}
          />
          <p className="hint" style={{ marginTop: 6 }}>
            Your audience is Saudi-based? Pick Arabic and the AI writes in a natural Saudi tone.
          </p>
        </div>
        <div className="actions">
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn" onClick={onNext}>
            <span>Find my positioning</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function PositioningStep({
  positioning,
  setPositioning,
  recommended,
  onBack,
  onNext,
}: {
  positioning: string;
  setPositioning: (v: string) => void;
  recommended: StrategyId | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const rec = STRATEGIES.find((s) => s.id === recommended);
  return (
    <div className="step">
      <span className="eyebrow">[ Step 4 · Positioning ]</span>
      <h1 className="display">Your market positioning.</h1>
      <p className="lede">This is the angle the AI built from your site and audience. Tune it if needed.</p>
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="field">
          <label htmlFor="pos">Positioning statement</label>
          <textarea
            id="pos"
            className="textarea"
            dir="auto"
            style={{ minHeight: 130 }}
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
          />
        </div>
        {rec && (
          <div className="notice notice--info">
            Based on this, we suggest the <strong>{rec.title}</strong> strategy — you'll confirm next.
          </div>
        )}
        <div className="actions">
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn" disabled={!positioning.trim()} onClick={onNext}>
            <span>Pick a strategy</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function StrategyStep({
  selected,
  recommended,
  onSelect,
  onBack,
  onNext,
}: {
  selected: StrategyId | null;
  recommended: StrategyId | null;
  onSelect: (id: StrategyId) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="step">
      <span className="eyebrow">[ Step 5 · Strategy ]</span>
      <h1 className="display">
        Choose your <em>direction.</em>
      </h1>
      <p className="lede">Five core strategies. We've flagged the best fit — but it's your call.</p>
      <div className="choices choices--2" style={{ marginTop: 24 }}>
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            className={`choice ${selected === s.id ? "is-selected" : ""} ${
              recommended === s.id ? "is-recommended" : ""
            }`}
            onClick={() => onSelect(s.id)}
          >
            <div className="choice__icon">{STRATEGY_ICONS[s.id]}</div>
            <h3 className="choice__title">{s.title}</h3>
            <p className="choice__tagline">{s.tagline}</p>
            <p className="choice__desc">{s.description}</p>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="btn btn--ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn" disabled={!selected} onClick={onNext}>
          <span>Write my campaign</span>
          <Arrow />
        </button>
      </div>
    </div>
  );
}

function CampaignStep({
  campaign,
  setCampaign,
  onBack,
  onNext,
}: {
  campaign: Campaign;
  setCampaign: (c: Campaign) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="step">
      <span className="eyebrow">[ Step 6 · Campaign ]</span>
      <h1 className="display">Your campaign concept.</h1>
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="field">
          <label htmlFor="cn">Campaign name</label>
          <input
            id="cn"
            className="input"
            dir="auto"
            value={campaign.name}
            onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="ct">Theme</label>
          <textarea
            id="ct"
            className="textarea"
            dir="auto"
            value={campaign.theme}
            onChange={(e) => setCampaign({ ...campaign, theme: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="cta">Call to action</label>
          <input
            id="cta"
            className="input"
            dir="auto"
            value={campaign.callToAction}
            onChange={(e) => setCampaign({ ...campaign, callToAction: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="tl">
            Target link <span className="hint">— where the campaign sends people</span>
          </label>
          <input
            id="tl"
            className="input"
            value={campaign.targetLink}
            onChange={(e) => setCampaign({ ...campaign, targetLink: e.target.value })}
          />
        </div>
        <div className="actions">
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn" onClick={onNext}>
            <span>Choose channels</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelsStep({
  channels,
  toggle,
  cadence,
  setCadence,
  onBack,
  onNext,
}: {
  channels: ChannelId[];
  toggle: (id: ChannelId) => void;
  cadence: Cadence;
  setCadence: (c: Cadence) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="step">
      <span className="eyebrow">[ Step 7 · Channels ]</span>
      <h1 className="display">
        Where should this <em>run?</em>
      </h1>
      <p className="lede">Pick the channels you want to work on. We'll shape the plan around them.</p>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="field">
          <label>Content channels</label>
          <div className="chips chips--channels">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                className={`chip chip--icon ${channels.includes(c.id) ? "is-selected" : ""}`}
                onClick={() => toggle(c.id)}
              >
                {CHANNEL_ICONS[c.id] || null}
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Posting cadence</label>
          <div className="chips">
            {CADENCES.map((c) => (
              <button
                key={c.id}
                className={`chip ${cadence === c.id ? "is-selected" : ""}`}
                title={c.hint}
                onClick={() => setCadence(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {CADENCES.find((c) => c.id === cadence)?.hint}
          </p>
        </div>

        <div className="actions">
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn" disabled={channels.length === 0} onClick={onNext}>
            <span>Build my 4-week plan</span>
            <Arrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="spark">
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function MixStep({
  mix,
  setMix,
  onBack,
  onNext,
}: {
  mix: Record<string, number>;
  setMix: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const perWeek = CONTENT_TYPES.reduce((sum, c) => sum + c.credits * (mix[c.id] || 0), 0);
  const breakdown = CONTENT_TYPES.filter((c) => (mix[c.id] || 0) > 0);
  function setQty(id: string, qty: number) {
    setMix((m) => ({ ...m, [id]: Math.max(0, Math.min(21, qty)) }));
  }

  return (
    <div className="step">
      <span className="eyebrow">[ Step 8 · Your weekly mix ]</span>
      <h1 className="display">
        Here's what we recommend for your <em>first week</em>
      </h1>
      <p className="lede">
        Based on your strategy and channels, this is a good starting mix for a business like yours. You can change these anytime after setup.
      </p>

      <div className="mix">
        <div className="mix__grid">
          {CONTENT_TYPES.map((c) => {
            const qty = mix[c.id] || 0;
            return (
              <div key={c.id} className={`mix-card ${qty > 0 ? "is-on" : ""}`}>
                <div className="mix-card__thumb" data-type={c.id} />
                <strong className="mix-card__name">{c.name}</strong>
                <span className="mix-card__desc">{c.desc}</span>
                <span className="mix-card__cost">
                  <Sparkle /> {c.credits} credits each
                </span>
                <div className="mix-card__stepper">
                  <button type="button" onClick={() => setQty(c.id, qty - 1)} aria-label={`Fewer ${c.name}`}>−</button>
                  <strong>{qty}</strong>
                  <button type="button" onClick={() => setQty(c.id, qty + 1)} aria-label={`More ${c.name}`}>+</button>
                  <em>/ week</em>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="mix-side">
          <span className="mix-side__label">This amount uses</span>
          <div className="mix-side__total">
            <strong>{perWeek}</strong> credits / week
          </div>
          <p className="mix-side__note">
            Credits are what the platform spends to generate your content. Each type costs a different amount.
          </p>
          <div className="mix-side__break">
            <span className="mix-side__break-h">How costs break down</span>
            {breakdown.length === 0 && <p className="hint">Add a content type to see the breakdown.</p>}
            {breakdown.map((c) => (
              <div key={c.id} className="mix-side__row">
                <span>{c.name}</span>
                <span className="mix-side__row-calc">{mix[c.id]} × {c.credits}</span>
                <span>{mix[c.id] * c.credits}</span>
              </div>
            ))}
            {breakdown.length > 0 && (
              <div className="mix-side__row mix-side__row--total">
                <span>Total credits per week</span>
                <span />
                <span>{perWeek}</span>
              </div>
            )}
          </div>
          <p className="mix-side__trial">
            Your trial includes <strong>{TRIAL_CREDITS} credits</strong> — enough to generate your first week.
          </p>
        </aside>
      </div>

      <div className="actions">
        <button className="btn btn--ghost" onClick={onBack}>Back</button>
        <button className="btn" onClick={onNext}>
          <span>Start with this amount</span>
          <Arrow />
        </button>
      </div>
    </div>
  );
}

function PhotosStep({
  businessName,
  photoFreedom,
  setPhotoFreedom,
  refImages,
  addRefImages,
  removeRef,
  onBack,
  onNext,
}: {
  businessName: string;
  photoFreedom: string;
  setPhotoFreedom: (v: string) => void;
  refImages: string[];
  addRefImages: (files: FileList | null) => void;
  removeRef: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="step">
      <span className="eyebrow">[ Step 9 · Photo & video style ]</span>
      <h1 className="display">
        When {businessName} uses your photos, <em>how far can it go?</em>
      </h1>
      <p className="lede">
        The AI generates new images and videos matching each post's topic. Choose how much it can change from your originals — and add reference images so everything follows your brand's look.
      </p>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="freedom">
          {PHOTO_FREEDOM.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`freedom__opt ${photoFreedom === o.id ? "is-selected" : ""}`}
              onClick={() => setPhotoFreedom(o.id)}
            >
              <span className="freedom__radio" aria-hidden="true" />
              <span className="freedom__text">
                <strong>{o.name}</strong>
                <span>{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>
            Reference images <span className="hint">— guide the AI's photo &amp; video style</span>
          </label>
          <label className="dropzone">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addRefImages(e.target.files)}
              style={{ display: "none" }}
            />
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="dropzone__main">Drop images here or <u>browse</u></span>
            <span className="hint">These keep AI-generated photos and videos on your brand theme. Up to 8 images.</span>
          </label>

          {refImages.length > 0 && (
            <div className="ref-grid">
              {refImages.map((src, i) => (
                <div key={i} className="ref-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Reference ${i + 1}`} />
                  <button type="button" onClick={() => removeRef(i)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="actions">
        <button className="btn btn--ghost" onClick={onBack}>Back</button>
        <button className="btn" onClick={onNext}>
          <span>Build my 4-week plan</span>
          <Arrow />
        </button>
      </div>
    </div>
  );
}

function isAr(lang: string) {
  return /arab|arabic|عرب|العربية/i.test(lang);
}

const LABELS = {
  en: {
    eyebrow: "[ Your plan ]",
    business: "Business",
    positioning: "Positioning",
    strategy: "Strategy",
    cta: "Call to action",
    targetLink: "Target link",
    channels: "Channels",
    cadence: (c: string) => `${c} cadence`,
    rollout: "The 4-week rollout",
    week: (n: number) => `Week ${n}`,
    ctaTitle: "Want this delivered & run for you?",
    ctaDesc: "The full New Riyadh Media platform creates the content, connects your socials and posts it automatically. Leave your email and we\u2019ll send this plan + early access.",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    bookCall: "Book a call",
    emailBtn: "Email me this plan",
    emailDone: "Sent. We\u2019ll be in touch \u2014 and the full platform will run all of this for you.",
  },
  ar: {
    eyebrow: "[ خطتك ]",
    business: "النشاط التجاري",
    positioning: "التموضع",
    strategy: "الاستراتيجية",
    cta: "الدعوة لاتخاذ إجراء",
    targetLink: "الرابط المستهدف",
    channels: "القنوات",
    cadence: (c: string) => {
      const map: Record<string, string> = { light: "خفيف", steady: "منتظم", aggressive: "مكثّف" };
      return `وتيرة ${map[c] || c}`;
    },
    rollout: "خطة الأربع أسابيع",
    week: (n: number) => `الأسبوع ${n}`,
    ctaTitle: "تبي نطلقها لك؟",
    ctaDesc: "منصة New Riyadh Media الكاملة تنشئ المحتوى، تربط حساباتك وتنشر تلقائيًا. اترك إيميلك ونرسل لك الخطة + وصول مبكر للمنصة.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@company.com",
    bookCall: "احجز مكالمة",
    emailBtn: "أرسل لي الخطة",
    emailDone: "تم الإرسال. بنتواصل معك قريب — والمنصة الكاملة بتنفّذ كل هذا لك.",
  },
};

const STRATEGY_AR: Record<string, string> = {
  authority: "القيادة الفكرية والمصداقية",
  performance: "الأداء والاستجابة المباشرة",
  community: "بناء المجتمع والعلامة",
  launch: "الإطلاق والزخم",
  education: "النمو عبر التعليم",
};

const CADENCE_AR: Record<string, string> = {
  light: "خفيف",
  steady: "منتظم",
  aggressive: "مكثّف",
};

function ResultStep({
  profile,
  positioning,
  strategyId,
  campaign,
  channels,
  cadence,
  plan,
  language,
  email,
  setEmail,
  emailDone,
  onEmail,
}: {
  profile: BusinessProfile;
  positioning: string;
  strategyId: StrategyId;
  campaign: Campaign;
  channels: ChannelId[];
  cadence: Cadence;
  plan: CampaignPlan;
  language: string;
  email: string;
  setEmail: (v: string) => void;
  emailDone: boolean;
  onEmail: () => void;
}) {
  const ar = isAr(language);
  const t = ar ? LABELS.ar : LABELS.en;
  const dir = ar ? "rtl" : undefined;
  const strategy = STRATEGIES.find((s) => s.id === strategyId);
  const strategyLabel = ar ? STRATEGY_AR[strategyId] || strategy?.title : strategy?.title;

  return (
    <div className="step" dir={dir}>
      <div className="step-hero step-hero--result">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80&auto=format&fit=crop"
          alt=""
          className="step-hero__img"
        />
        <div className="step-hero__overlay" />
      </div>
      <span className="eyebrow">{t.eyebrow}</span>
      <h1 className="display" dir="auto">
        {campaign.name}
      </h1>
      <p className="lede" dir="auto">{campaign.theme}</p>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="summary">
          <div className="summary__row">
            <span className="summary__k">{t.business}</span>
            <span className="summary__v">{profile.businessName}</span>
          </div>
          <div className="summary__row">
            <span className="summary__k">{t.positioning}</span>
            <span className="summary__v" dir="auto">{positioning}</span>
          </div>
          <div className="summary__row">
            <span className="summary__k">{t.strategy}</span>
            <span className="summary__v">{strategyLabel}</span>
          </div>
          <div className="summary__row">
            <span className="summary__k">{t.cta}</span>
            <span className="summary__v" dir="auto">{campaign.callToAction}</span>
          </div>
          <div className="summary__row">
            <span className="summary__k">{t.targetLink}</span>
            <span className="summary__v" dir="ltr">{campaign.targetLink}</span>
          </div>
          <div className="summary__row">
            <span className="summary__k">{t.channels}</span>
            <span className="summary__v">
              <span className="summary__channels">
                {channels.map((id) => (
                  <span key={id} className="summary__channel-badge">
                    {CHANNEL_ICONS[id] || null}
                    <span>{CHANNELS.find((c) => c.id === id)?.label ?? id}</span>
                  </span>
                ))}
              </span>
              <span className="summary__cadence">{t.cadence(cadence)}</span>
            </span>
          </div>
        </div>

        <h2 className="display" style={{ fontSize: 28, marginTop: 18 }}>
          {t.rollout}
        </h2>
        <div className="weeks">
          {plan.weeks
            .slice()
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((w) => (
              <div className="week" key={w.weekNumber}>
                <span className="week__tag">{t.week(w.weekNumber)}</span>
                <div>
                  <h3 className="week__name" dir="auto">{w.name}</h3>
                  <p className="week__desc" dir="auto">{w.description}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        {emailDone ? (
          <div className="thinking" style={{ fontStyle: "normal" }}>
            {t.emailDone}
          </div>
        ) : (
          <>
            <h2 className="display" style={{ fontSize: 24, marginTop: 0 }}>
              {t.ctaTitle}
            </h2>
            <p className="lede" style={{ marginBottom: 16 }}>
              {t.ctaDesc}
            </p>
            <div className="field">
              <label htmlFor="em">{t.emailLabel}</label>
              <input
                id="em"
                className="input"
                type="email"
                dir="ltr"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="actions actions--end">
              <a className="btn btn--ghost" href="mailto:hello@newriyadhmedia.com?subject=The%20full%20platform">
                {t.bookCall}
              </a>
              <button className="btn" onClick={onEmail}>
                <span>{t.emailBtn}</span>
                <Arrow />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
