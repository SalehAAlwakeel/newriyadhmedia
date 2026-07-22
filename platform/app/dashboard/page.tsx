import Link from "next/link";
import { Sparkles, Check, Megaphone, CalendarDays, LayoutGrid, Lightbulb, ArrowRight, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeConnections } from "@/lib/social";
import { listPosts, type GeneratedPost, type PostType } from "@/lib/db";
import NewPostButton from "./NewPostButton";

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function groupByCampaign(posts: GeneratedPost[]): { name: string; range: string; status: string; img?: string; live?: boolean }[] {
  const map = new Map<string, GeneratedPost[]>();
  for (const p of posts) {
    const arr = map.get(p.campaignName) ?? [];
    arr.push(p);
    map.set(p.campaignName, arr);
  }
  return Array.from(map.entries()).map(([name, arr]) => {
    const sorted = [...arr].sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const range = `${new Date(first.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(last.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    const anyReady = arr.some((p) => p.status === "ready" || p.status === "approved");
    return { name, range, status: anyReady ? "Posting" : "Generating", img: first.imageUrls?.[0], live: anyReady };
  });
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const first = user?.name.split(" ")[0] ?? "there";
  const connected = sanitizeConnections(user?.connections ?? []).length > 0;
  const allPosts = user ? await listPosts(user.id) : [];

  const upcoming = allPosts
    .filter((p) => p.status === "approved" || p.status === "published")
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor))
    .slice(0, 3);

  const campaigns = groupByCampaign(allPosts).slice(0, 5);

  return (
    <div className="ds-page home">
      <h1 className="home__welcome">Welcome back, {first}</h1>

      {allPosts.length === 0 && (
        <section className="empty-hero">
          <div>
            <h2>Let&rsquo;s generate this week&rsquo;s content for {user?.company || "your business"}.</h2>
            <p>
              Create this week&apos;s content, preview every draft, and choose when each post goes live.
              Approved posts flow onto your calendar automatically.
            </p>
            <div className="empty-hero__cta">
              <Link href="/dashboard/assistant" className="btn"><Sparkles size={16} /> Open content studio</Link>
              <Link href="/dashboard/brand-kit" className="btn btn--ghost">Tune brand first</Link>
            </div>
          </div>
        </section>
      )}

      <section className="home__sec">
        <h2 className="home__h">Up next</h2>
        {connected ? (
          <Link href="/dashboard/calendar" className="up-next">
            <span className="up-next__icon up-next__icon--ok"><Check size={20} /></span>
            <div><strong>You&rsquo;re all set</strong><span>Approved content will publish automatically on schedule.</span></div>
          </Link>
        ) : (
          <Link href="/dashboard/integrations" className="up-next">
            <span className="up-next__icon"><Megaphone size={20} /></span>
            <div><strong>Connect your accounts</strong><span>Your posts are idle. Automatically publish your approved content.</span></div>
          </Link>
        )}
      </section>

      <section className="home__sec">
        <div className="home__sechead">
          <h2 className="home__h">Upcoming posts</h2>
          <div className="home__sechead-r">
            <Link href="/dashboard/calendar" className="btn btn--ghost btn--sm"><CalendarDays size={15} /> See All Content</Link>
            <NewPostButton className="btn btn--sm" />
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-card">
            <p>No scheduled posts yet. Plan &amp; approve content in the AI Strategist to fill your calendar.</p>
            <Link href="/dashboard/assistant" className="btn btn--sm"><Sparkles size={15} /> Open content studio</Link>
          </div>
        ) : (
          <div className="home-posts">
            {upcoming.map((p) => (
              <article key={p.id} className="home-post">
                <div className="home-post__top">
                  <span className={`post-pill post-pill--${PILL_CLS[p.type]}`}>{p.type}</span>
                  <span className="home-post__time">{fmtWhen(p.scheduledFor)}</span>
                </div>
                <p className="home-post__caption" dir="auto">{p.caption.slice(0, 140)}{p.caption.length > 140 ? "… more" : ""}</p>
                <div className="home-post__media">
                  {p.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrls[0]} alt="" />
                  ) : (
                    <div className="post-card__placeholder" />
                  )}
                  <span className="home-post__badge">{p.status === "approved" ? "Approved" : p.status === "ready" ? "Ready" : "Generating…"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home__sec">
        <div className="home__sechead">
          <h2 className="home__h">Campaigns</h2>
          <Link href="/dashboard/campaigns" className="btn btn--ghost btn--sm"><LayoutGrid size={15} /> See All Campaigns</Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="empty-card">
            <p>No campaigns yet.</p>
          </div>
        ) : (
          <div className="camp2">
            <div className="camp2__head"><span>Campaign</span><span>Timing</span><span>Status</span></div>
            {campaigns.map((c) => (
              <Link key={c.name} href="/dashboard/campaigns" className="camp2__row">
                <div className="camp2__main">
                  {c.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt="" className="camp2__thumb" />
                  ) : (
                    <div className="camp2__thumb" style={{ background: "var(--cream-soft)" }} />
                  )}
                  <div>
                    <h3 className="camp2__name">{c.name}</h3>
                    <span className="camp2__tag"><Lightbulb size={12} /> Generated</span>
                  </div>
                </div>
                <span className="camp2__timing">{c.range}</span>
                <span className={`camp2__status ${c.live ? "camp2__status--live" : ""}`}>{c.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home__sec">
        <h2 className="home__h">Last 7 days</h2>
        <div className="home-stats">
          <div className="home-stat">
            <strong className="home-stat__big">{allPosts.filter((p) => p.status === "published").length}</strong>
            <span>Posts published</span>
          </div>
          <div className="home-stat home-stat--empty">
            <span>Analytics will appear here once data has been collected.</span>
          </div>
        </div>
      </section>

      <section className="home__sec">
        <h2 className="home__h">Expand your reach</h2>
        <div className="expert-banner">
          <div className="expert-banner__icon" aria-hidden="true">
            <MessageSquare size={20} strokeWidth={1.75} />
          </div>
          <div className="expert-banner__body">
            <span className="expert-banner__eyebrow">Free · 1:1 review</span>
            <strong className="expert-banner__title">Talk to a marketing expert</strong>
            <p className="expert-banner__desc">A specialist reviews your strategy, content and publishing — free.</p>
          </div>
          <Link href="/dashboard/assistant" className="expert-banner__cta btn btn--sm">
            Get advice <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
