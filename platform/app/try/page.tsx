import Link from "next/link";
import Wizard from "./Wizard";
import { marketingLink } from "@/lib/site";

export default function TryPage() {
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
          <span className="topbar__link topbar__link--active">AI Marketing Test</span>
          <Link href="/diagnostics" className="topbar__link">Website Diagnostics</Link>
          <a href={marketingLink("index.html#contact")} className="topbar__link">Contact</a>
        </nav>
      </header>

      <main className="wrap">
        <Wizard />
      </main>

      <footer className="footer">
        <span>© 2026 New Riyadh Media. All rights reserved.</span>
        <span>Crafted with care in Riyadh.</span>
      </footer>
    </div>
  );
}
