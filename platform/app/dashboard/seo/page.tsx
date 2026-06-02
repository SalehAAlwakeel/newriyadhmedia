import PageHead from "../PageHead";

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
          <span className="seo-hero__arrow">↗</span>
        </div>
        <div className="seo-hero__copy">
          <h2>Let us grow your blog traffic for you</h2>
          <p>Choose a topic and the AI automatically writes and publishes a set of related posts. Together they signal to Google that your site is an authority — and your rankings climb.</p>
          <button className="btn">Set Up My SEO Plan</button>
        </div>
      </section>

      <div className="expert-banner expert-banner--seo">
        <div className="expert-banner__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=70&auto=format&fit=crop" alt="" />
        </div>
        <div className="expert-banner__text">
          <strong>Get free expert SEO and AEO advice</strong>
          <span>A specialist reviews your SEO and AEO strategy and shows you where to start.</span>
        </div>
        <button className="btn btn--ghost btn--sm">Talk to an expert 1:1 →</button>
      </div>
    </div>
  );
}
