import Link from "next/link";
import DiagnosticWizard from "./DiagnosticWizard";
import { marketingLink } from "@/lib/site";

export default function DiagnosticsPage() {
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
          <span className="topbar__link topbar__link--active">Website Diagnostics</span>
          <a href={marketingLink("index.html#contact")} className="topbar__link">Contact</a>
        </nav>
      </header>

      <main className="wrap">
        <DiagnosticWizard />
      </main>

      <footer className="footer">
        <span>© 2026 New Riyadh Media. All rights reserved.</span>
        <span className="footer__powered">Diagnostics powered by <strong>AvenueTech</strong></span>
      </footer>
    </div>
  );
}
