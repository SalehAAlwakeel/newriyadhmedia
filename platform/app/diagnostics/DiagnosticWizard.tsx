"use client";

import { useState } from "react";

interface Component { name: string; type: string; notes: string }
interface Observation { title: string; detail: string; severity: "info" | "warning" | "critical" }
interface Problem { title: string; detail: string; impact: "low" | "medium" | "high" }
interface RootCause { title: string; detail: string }
interface Hypothesis { title: string; detail: string; priority: "quick-win" | "medium-effort" | "strategic" }

interface DiagnosticResult {
  components: Component[];
  observations: Observation[];
  problems: Problem[];
  rootCauses: RootCause[];
  hypotheses: Hypothesis[];
  overallScore: number;
  summary: string;
}

interface SiteInfo {
  url: string;
  title: string;
  domain: string;
  logoUrl: string | null;
}

type Stage = "components" | "observations" | "problems" | "rootCauses" | "hypotheses";
const STAGES: { id: Stage; label: string; color: string; icon: React.ReactNode }[] = [
  {
    id: "components",
    label: "Components",
    color: "#6366f1",
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    id: "observations",
    label: "Observations",
    color: "#3b82f6",
    icon: <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    id: "problems",
    label: "Problems",
    color: "#ef4444",
    icon: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    id: "rootCauses",
    label: "Root Causes",
    color: "#64748b",
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    id: "hypotheses",
    label: "Hypotheses",
    color: "#22c55e",
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DiagnosticWizard() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>("components");

  async function runDiagnostic() {
    if (!url.trim()) { setError("Please enter a website address."); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.manual) {
        setError(data.error || "Could not read that website. Please check the URL and try again.");
        return;
      }
      if (data.source === "mock") setUsedMock(true);
      setResult(data.diagnostic);
      setSite(data.site);
      setActiveStage("components");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!result) {
    return (
      <div className="step">
        <div className="diag-badge">
          <span className="diag-badge__text">Powered by <strong>AvenueTech</strong></span>
        </div>
        <span className="eyebrow">[ Website Diagnostics ]</span>
        <h1 className="display">
          Get a full <em>diagnostic</em> of your website.
        </h1>
        <p className="lede">
          Our AI scans your site and delivers a structured analysis: every component mapped,
          UX observations, problems diagnosed, root causes identified, and actionable hypotheses
          to improve.
        </p>

        {usedMock && (
          <div className="notice notice--info">
            Showing sample output. Add an <code>OPENAI_API_KEY</code> for a real diagnostic.
          </div>
        )}
        {error && <div className="notice notice--warn">{error}</div>}

        {busy ? (
          <div className="panel" style={{ marginTop: 24 }}>
            <div className="thinking">
              <span className="spinner" />
              <span>Scanning and analyzing your website…</span>
            </div>
            <div style={{ marginTop: 20 }}>
              <div className="skeleton lg" />
              <div className="skeleton" />
              <div className="skeleton" style={{ width: "80%" }} />
              <div className="skeleton" style={{ width: "65%" }} />
            </div>
          </div>
        ) : (
          <div className="panel" style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="diag-url">Website address</label>
              <input
                id="diag-url"
                className="input input--lg"
                placeholder="yourbusiness.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runDiagnostic()}
                autoFocus
              />
            </div>
            <div className="actions actions--end">
              <button className="btn" onClick={runDiagnostic}>
                <span>Run diagnostic</span>
                <Arrow />
              </button>
            </div>
          </div>
        )}

        <div className="diag-stages-preview">
          {STAGES.map((s) => (
            <div key={s.id} className="diag-stage-card" style={{ borderTopColor: s.color }}>
              <div className="diag-stage-card__icon" style={{ background: s.color }}>{s.icon}</div>
              <strong>{s.label}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stageData: Record<Stage, { items: unknown[]; color: string }> = {
    components: { items: result.components, color: "#6366f1" },
    observations: { items: result.observations, color: "#3b82f6" },
    problems: { items: result.problems, color: "#ef4444" },
    rootCauses: { items: result.rootCauses, color: "#64748b" },
    hypotheses: { items: result.hypotheses, color: "#22c55e" },
  };

  return (
    <div className="step">
      <div className="diag-badge">
        <span className="diag-badge__text">Powered by <strong>AvenueTech</strong></span>
      </div>

      {usedMock && (
        <div className="notice notice--info">
          Showing sample output. Add an <code>OPENAI_API_KEY</code> for a real diagnostic.
        </div>
      )}

      <div className="diag-header">
        <div className="diag-header__info">
          {site?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoUrl} alt="" className="diag-header__logo" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          )}
          <div>
            <span className="eyebrow">[ Diagnostic Report ]</span>
            <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 8 }}>
              {site?.title || site?.domain || "Website Diagnostic"}
            </h1>
            <p className="lede" style={{ margin: 0 }}>{site?.url}</p>
          </div>
        </div>
        <div className="diag-score" style={{ "--score-color": result.overallScore >= 70 ? "#22c55e" : result.overallScore >= 40 ? "#f59e0b" : "#ef4444" } as React.CSSProperties}>
          <span className="diag-score__num">{result.overallScore}</span>
          <span className="diag-score__label">/ 100</span>
        </div>
      </div>

      <p className="diag-summary">{result.summary}</p>

      <div className="diag-pipeline">
        {STAGES.map((s) => {
          const count = stageData[s.id].items.length;
          const isActive = activeStage === s.id;
          return (
            <button
              key={s.id}
              className={`diag-pipe ${isActive ? "is-active" : ""}`}
              style={{ "--pipe-color": s.color } as React.CSSProperties}
              onClick={() => setActiveStage(s.id)}
            >
              <div className="diag-pipe__icon">{s.icon}</div>
              <span className="diag-pipe__count">{count}</span>
              <strong className="diag-pipe__label">{s.label}</strong>
            </button>
          );
        })}
      </div>

      <div className="diag-results">
        {activeStage === "components" && (
          <div className="diag-list">
            {result.components.map((c, i) => (
              <div key={i} className="diag-item">
                <span className="diag-item__badge" style={{ background: "#6366f1" }}>{c.type}</span>
                <h3 className="diag-item__title">{c.name}</h3>
                <p className="diag-item__detail">{c.notes}</p>
              </div>
            ))}
          </div>
        )}

        {activeStage === "observations" && (
          <div className="diag-list">
            {result.observations.map((o, i) => (
              <div key={i} className="diag-item">
                <span className={`diag-item__severity diag-item__severity--${o.severity}`}>{o.severity}</span>
                <h3 className="diag-item__title">{o.title}</h3>
                <p className="diag-item__detail">{o.detail}</p>
              </div>
            ))}
          </div>
        )}

        {activeStage === "problems" && (
          <div className="diag-list">
            {result.problems.map((p, i) => (
              <div key={i} className="diag-item">
                <span className={`diag-item__impact diag-item__impact--${p.impact}`}>{p.impact} impact</span>
                <h3 className="diag-item__title">{p.title}</h3>
                <p className="diag-item__detail">{p.detail}</p>
              </div>
            ))}
          </div>
        )}

        {activeStage === "rootCauses" && (
          <div className="diag-list">
            {result.rootCauses.map((r, i) => (
              <div key={i} className="diag-item">
                <h3 className="diag-item__title">{r.title}</h3>
                <p className="diag-item__detail">{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        {activeStage === "hypotheses" && (
          <div className="diag-list">
            {result.hypotheses.map((h, i) => (
              <div key={i} className="diag-item">
                <span className={`diag-item__priority diag-item__priority--${h.priority}`}>{h.priority.replace("-", " ")}</span>
                <h3 className="diag-item__title">{h.title}</h3>
                <p className="diag-item__detail">{h.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2 className="display" style={{ fontSize: 24, marginTop: 0 }}>
          Want us to fix these issues?
        </h2>
        <p className="lede" style={{ marginBottom: 16 }}>
          New Riyadh Media builds brands, writes campaigns, and runs marketing — and AvenueTech
          handles the technical execution. Let's turn these findings into results.
        </p>
        <div className="actions actions--end">
          <button className="btn btn--ghost" onClick={() => { setResult(null); setSite(null); setUrl(""); }}>
            Scan another site
          </button>
          <a className="btn" href="mailto:hello@newriyadhmedia.com?subject=Website%20Diagnostic%20Follow-up">
            <span>Get in touch</span>
            <Arrow />
          </a>
        </div>
      </div>
    </div>
  );
}
