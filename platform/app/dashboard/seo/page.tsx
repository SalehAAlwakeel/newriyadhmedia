import Link from "next/link";
import { ArrowUpRight, ArrowRight, MessageSquare } from "lucide-react";
import PageHead from "../PageHead";
import { CONTACT_URL } from "@/lib/site";

export const metadata = { title: "SEO · New Riyadh Media" };

export default function SeoPage() {
  return (
    <div className="ds-page">
      <PageHead eyebrow="Grow · SEO" title="SEO Relevance Plan" sub="Pick a topic and the AI writes and publishes a set of related posts — signalling to Google that your site is an authority." />

      <section className="seo-hero">
        <div className="seo-hero__art">
          <div className="seo-hero__card">
            <span className="seo-hero__tag">Article</span>
            <strong>Unleashing Business Potential with AI: Transformative Tools for Your Company</strong>
            <p>In recent years, smarter automation has become essential, and with the right tools your team can move faster…</p>
          </div>
          <div className="seo-hero__chips">
            <span className="seo-hero__chip">WIX</span>
            <span className="seo-hero__chip">WP</span>
            <span className="seo-hero__chip seo-hero__chip--g">G</span>
          </div>
          <span className="seo-hero__arrow"><ArrowUpRight size={20} /></span>
        </div>
        <div className="seo-hero__copy">
          <h2>Let us grow your blog traffic for you</h2>
          <p>Choose a topic and the AI automatically writes and publishes a set of related posts. Together they signal to Google that your site is an authority — and your rankings climb.</p>
          <Link href="/dashboard/assistant" className="btn">Generate blog posts</Link>
        </div>
      </section>

      <div className="expert-banner expert-banner--seo">
        <div className="expert-banner__icon" aria-hidden="true">
          <MessageSquare size={20} strokeWidth={1.75} />
        </div>
        <div className="expert-banner__body">
          <span className="expert-banner__eyebrow">Free · 1:1 review</span>
          <strong className="expert-banner__title">Get free expert SEO and AEO advice</strong>
          <p className="expert-banner__desc">A specialist reviews your SEO and AEO strategy and shows you where to start.</p>
        </div>
        <a href={CONTACT_URL} target="_blank" rel="noopener" className="expert-banner__cta btn btn--sm">
          Talk to an expert <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
