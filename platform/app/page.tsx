import Link from "next/link";
import { marketingLink } from "@/lib/site";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <a href={marketingLink("index.html")} className="topbar__brand">
          <b>New Riyadh Media</b>
        </a>
        <nav className="topbar__nav">
          <a href={marketingLink("index.html#about")} className="topbar__link">About</a>
          <a href={marketingLink("index.html#services")} className="topbar__link">Services</a>
          <a href={marketingLink("automated-marketing.html")} className="topbar__link">Automated Marketing</a>
          <Link href="/try" className="topbar__link">AI Marketing Test</Link>
          <Link href="/diagnostics" className="topbar__link">Website Diagnostics</Link>
          <Link href="/login" className="topbar__link">Sign in</Link>
          <Link href="/signup" className="topbar__link topbar__link--active">Get the platform</Link>
        </nav>
      </header>

      <main className="wrap" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="step" style={{ maxWidth: 760 }}>
          <span className="eyebrow">[ Free · No sign-up · 3 minutes ]</span>
          <h1 className="display">
            See your next campaign <em>before</em> you commit.
          </h1>
          <p className="lede">
            Plug in your website. Our AI scans it, builds your market positioning, and writes a
            named 4-week campaign across the channels you choose — tailored to the Saudi market,
            in Arabic or English. This is a taste of the full New Riyadh Media platform.
          </p>

          <div className="landing-features">
            <div className="landing-feature">
              <svg viewBox="0 0 24 24" fill="none" className="landing-feature__icon"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div>
                <strong>3 minutes</strong>
                <span>From URL to a full campaign plan</span>
              </div>
            </div>
            <div className="landing-feature">
              <svg viewBox="0 0 24 24" fill="none" className="landing-feature__icon"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div>
                <strong>Saudi-market AI</strong>
                <span>Culturally fluent, not just translated</span>
              </div>
            </div>
            <div className="landing-feature">
              <svg viewBox="0 0 24 24" fill="none" className="landing-feature__icon"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div>
                <strong>Completely free</strong>
                <span>No sign-up, no credit card</span>
              </div>
            </div>
          </div>

          <div className="actions actions--end" style={{ justifyContent: "flex-start", marginTop: 32, gap: 12, flexWrap: "wrap" }}>
            <Link href="/try" className="btn btn--lg">
              <span>Start the test</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/diagnostics" className="btn btn--lg btn--ghost">
              <span>Website Diagnostics</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>
        </div>

        <div className="step" style={{ maxWidth: 760, marginTop: 48 }}>
          <div className="diag-badge">
            <span className="diag-badge__text">Powered by <strong>AvenueTech</strong></span>
          </div>
          <h2 className="display" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
            Website Diagnostics
          </h2>
          <p className="lede" style={{ marginBottom: 24 }}>
            Not sure what&apos;s holding your website back? Our AI-powered diagnostic scans every
            element — mapping components, identifying UX issues, diagnosing problems, uncovering root
            causes, and proposing specific fixes. Built by AvenueTech.
          </p>
          <div className="diag-stages-preview">
            <div className="diag-stage-card" style={{ borderTopColor: "#6366f1" }}>
              <div className="diag-stage-card__icon" style={{ background: "#6366f1" }}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <strong>Components</strong>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Mapping each element</span>
            </div>
            <div className="diag-stage-card" style={{ borderTopColor: "#3b82f6" }}>
              <div className="diag-stage-card__icon" style={{ background: "#3b82f6" }}>
                <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <strong>Observations</strong>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Design & UX choices</span>
            </div>
            <div className="diag-stage-card" style={{ borderTopColor: "#ef4444" }}>
              <div className="diag-stage-card__icon" style={{ background: "#ef4444" }}>
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <strong>Problems</strong>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Tied to website goals</span>
            </div>
            <div className="diag-stage-card" style={{ borderTopColor: "#64748b" }}>
              <div className="diag-stage-card__icon" style={{ background: "#64748b" }}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <strong>Root Causes</strong>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Primary signals & levers</span>
            </div>
            <div className="diag-stage-card" style={{ borderTopColor: "#22c55e" }}>
              <div className="diag-stage-card__icon" style={{ background: "#22c55e" }}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <strong>Hypotheses</strong>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Direction for solutions</span>
            </div>
          </div>
          <div className="actions actions--end" style={{ justifyContent: "flex-start", marginTop: 24 }}>
            <Link href="/diagnostics" className="btn">
              <span>Run a free diagnostic</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>© 2026 New Riyadh Media. All rights reserved.</span>
        <span>Crafted with care in Riyadh.</span>
      </footer>
    </div>
  );
}
