import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/db";
import { creditsForPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { sanitizeConnections } from "@/lib/social";
import PageHead from "../PageHead";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights · New Riyadh Media" };

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const connections = sanitizeConnections(user?.connections ?? []);
  const posts = user ? await listPosts(user.id) : [];

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const scheduled = posts.filter((p) => p.status === "approved").length;
  const scheduledThisWeek = posts.filter(
    (p) => p.status === "approved" && +new Date(p.createdAt) >= weekAgo,
  ).length;
  const published = posts.filter((p) => p.status === "published").length;
  const publishedThisWeek = posts.filter(
    (p) => p.status === "published" && +new Date(p.scheduledFor) >= weekAgo,
  ).length;
  const pending = posts.filter((p) => p.status === "ready").length;
  const credits = user?.credits ?? 0;
  const planCredits = user?.plan ? creditsForPlan(user.plan as PlanId) : 0;

  const stats = [
    { label: "Posts scheduled", value: String(scheduled), trend: scheduledThisWeek > 0 ? `+${scheduledThisWeek} this week` : "approve drafts to add more" },
    { label: "Posts published", value: String(published), trend: publishedThisWeek > 0 ? `+${publishedThisWeek} this week` : "all time" },
    { label: "Credits left", value: credits.toLocaleString(), trend: planCredits > 0 ? `of ${planCredits.toLocaleString()} / mo` : "top up via upgrade" },
    { label: "Approvals pending", value: String(pending), trend: pending > 0 ? "needs you" : "all clear" },
  ];

  const recommendation =
    connections.length === 0
      ? {
          title: "Connect a channel to unlock performance insights",
          body: "Once Instagram is connected, published posts report back their reach and engagement — and your strategist uses that data to plan better content each week.",
          href: "/dashboard/integrations",
          cta: "Connect a channel →",
        }
      : pending > 0
        ? {
            title: `${pending} ${pending === 1 ? "draft is" : "drafts are"} waiting for review`,
            body: "Content only publishes after you approve it. Review the queue so this week's schedule stays full.",
            href: "/dashboard/approvals",
            cta: "Review drafts →",
          }
        : {
            title: "Plan next week's content",
            body: "Your queue is clear. Open the content studio to plan and generate the next batch of on-brand posts.",
            href: "/dashboard/assistant",
            cta: "Open content studio →",
          };

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Workspace · Insights"
        title="Insights"
        sub="A live read on what your marketing is doing — and what to do next."
        action={<Link href="/dashboard/assistant" className="btn">Open content studio</Link>}
      />

      <div className="ds-stats">
        {stats.map((s) => (
          <div key={s.label} className="ds-stat">
            <span className="ds-stat__label">{s.label}</span>
            <strong className="ds-stat__value">{s.value}</strong>
            <span className="ds-stat__trend">{s.trend}</span>
          </div>
        ))}
      </div>

      <div className="ds-grid ds-grid--2">
        <section className="card">
          <h2 className="card__title">{recommendation.title}</h2>
          <p className="card__lede">{recommendation.body}</p>
          <Link href={recommendation.href} className="link-arrow">{recommendation.cta}</Link>
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
