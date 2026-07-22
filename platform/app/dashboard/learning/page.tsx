import Link from "next/link";
import { BarChart3, Zap, Brain, Link2, ArrowRight } from "lucide-react";
import PageHead from "../PageHead";
import Memory from "./Memory";
import PlatformIcon from "../integrations/PlatformIcon";

export const metadata = { title: "Learnings · New Riyadh Media" };

const STEPS = [
  { n: 1, title: "Connect Your Channels", desc: "Link your social, ads and SEO accounts. We pull in your data automatically." },
  { n: 2, title: "We Analyze Your Data", desc: "Your performance is benchmarked against hundreds of accounts in your industry." },
  { n: 3, title: "Get Your Action Plan", desc: "See exactly what's working, what's falling flat and what to do more of — in plain language." },
  { n: 4, title: "Apply With One Click", desc: "Optimizations are applied automatically or surfaced for your approval." },
];

const FEATURES = [
  { title: "Benchmarks, not vanity metrics", desc: "See how your engagement, save rate and follower growth stack up against similar businesses — not the industry average.", cls: "blue", icon: <BarChart3 size={22} /> },
  { title: "Actions, not just insights", desc: "It doesn't just show you the data — it tells you what to do next and applies changes so nothing slips through.", cls: "violet", icon: <Zap size={22} /> },
  { title: "Gets smarter over time", desc: "Every post, campaign and keyword builds a performance model unique to your business that compounds each week.", cls: "amber", icon: <Brain size={22} /> },
];

export default function LearningPage() {
  return (
    <div className="ds-page">
      <PageHead eyebrow="Workspace · Learning" title="Learnings" sub="Your AI strategist tracks what's working across content, ads, organic and SEO — then tells you exactly what to do next." />

      <Memory />

      <section className="learn-hero">
        <div className="learn-hero__copy">
          <h2>Enable your marketing to get smarter every week</h2>
          <p>Learning Loop tracks what works across your content, paid ads, organic and SEO — then tells you exactly what to do next. Connect your accounts and the AI starts learning from day one.</p>
          <div className="learn-hero__cta">
            <Link href="/dashboard/integrations" className="btn"><Link2 size={16} /> Connect your accounts</Link>
            <span className="learn-hero__pill">Takes ~2 min</span>
          </div>
        </div>
      </section>

      <h2 className="bk__h" style={{ marginTop: 8 }}>How Learning Loop Works</h2>
      <div className="learn-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="learn-step">
            <span className="learn-step__n">{s.n}</span>
            <strong>{s.title}</strong>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="learn-features">
        {FEATURES.map((f) => (
          <div key={f.title} className={`learn-feature learn-feature--${f.cls}`}>
            <div className="learn-feature__icon">{f.icon}</div>
            <strong>{f.title}</strong>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="learn-connect">
        <div className="learn-connect__icons">
          <PlatformIcon platformId="instagram" className="learn-connect__icon" />
          <PlatformIcon platformId="x" className="learn-connect__icon" />
          <PlatformIcon platformId="linkedin" className="learn-connect__icon" />
          <PlatformIcon platformId="facebook" className="learn-connect__icon" />
          <PlatformIcon platformId="tiktok" className="learn-connect__icon" />
          <PlatformIcon platformId="youtube" className="learn-connect__icon" />
        </div>
        <div>
          <strong>Connect your channels to unlock Learning Loop</strong>
          <span>Works with Instagram, LinkedIn, X, YouTube, Google Ads, Meta Ads, Google Analytics and more.</span>
        </div>
        <Link href="/dashboard/integrations" className="btn btn--ghost btn--sm">Connect Accounts <ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}
