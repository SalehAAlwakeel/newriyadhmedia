import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import PageHead from "../PageHead";

export const metadata = { title: "Insights · New Riyadh Media" };

const STATS = [
  { label: "Posts scheduled", value: "12", trend: "+4 this week" },
  { label: "Engagement rate", value: "4.8%", trend: "+0.6 pts" },
  { label: "Credits left", value: "143", trend: "of 1,200" },
  { label: "Approvals pending", value: "3", trend: "needs you" },
];

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const connections = user?.connections ?? [];

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Workspace · Insights"
        title="Insights"
        sub="A live read on what your marketing is doing — and what your AI strategist recommends next."
        action={<Link href="/dashboard/assistant" className="btn">Ask your strategist</Link>}
      />

      <div className="ds-stats">
        {STATS.map((s) => (
          <div key={s.label} className="ds-stat">
            <span className="ds-stat__label">{s.label}</span>
            <strong className="ds-stat__value">{s.value}</strong>
            <span className="ds-stat__trend">{s.trend}</span>
          </div>
        ))}
      </div>

      <div className="ds-grid ds-grid--2">
        <section className="card">
          <h2 className="card__title">This week's recommendation</h2>
          <p className="card__lede">
            Your Snapchat Stories drove the most profile visits last week, while your X posts under-performed.
            Shift two of this week's X slots to Snapchat and lead with a behind-the-scenes format.
          </p>
          <Link href="/dashboard/learning" className="link-arrow">See what your AI learned →</Link>
        </section>

        <section className="card">
          <h2 className="card__title">Connected channels</h2>
          {connections.length === 0 ? (
            <>
              <p className="card__lede">No channels connected yet. Link your socials to start scheduling and learning.</p>
              <Link href="/dashboard/integrations" className="btn btn--ghost">Connect a channel</Link>
            </>
          ) : (
            <ul className="ds-channels">
              {connections.map((c) => (
                <li key={c.platform}><span>{c.platform}</span><em>{c.handle}</em></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
