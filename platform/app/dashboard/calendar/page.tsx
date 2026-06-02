import PageHead from "../PageHead";
import { getCurrentUser } from "@/lib/auth";
import { listPosts, type GeneratedPost, type PostType } from "@/lib/db";
import GenerateButton from "../GenerateButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar · New Riyadh Media" };

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function startOfWeek(d = new Date()): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun .. 6 Sat
  // Use Monday as start of week
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface DayColumn { label: string; date: string; key: string; posts: GeneratedPost[] }

function buildWeekFrom(posts: GeneratedPost[], pivot: Date): { columns: DayColumn[]; range: string } {
  const start = startOfWeek(pivot);
  const cols: DayColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayPosts = posts.filter((p) => sameDay(new Date(p.scheduledFor), d));
    if (dayPosts.length === 0 && i > 0 && i < 6) continue; // hide empty mid-week to mimic blaze 3-day view when sparse
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    cols.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      key: `${yyyy}-${mm}-${dd}`,
      posts: dayPosts.sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor)),
    });
  }
  const visible = cols.length ? cols : Array.from({ length: 3 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), key: `${yyyy}-${mm}-${dd}`, posts: [] };
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const range = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { day: "numeric" })}`;
  return { columns: visible, range };
}

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const posts = user ? await listPosts(user.id) : [];
  // Show this week if it has posts; otherwise pivot to the week containing the
  // earliest upcoming post so newly generated content is immediately visible.
  const now = new Date();
  const sortedFuture = [...posts]
    .filter((p) => new Date(p.scheduledFor) >= startOfWeek(now))
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
  const pivot = sortedFuture[0] ? new Date(sortedFuture[0].scheduledFor) : now;
  const { columns, range } = buildWeekFrom(posts, pivot);
  const totalThisWeek = columns.reduce((n, c) => n + c.posts.length, 0);

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Calendar"
        title="Calendar"
        sub="Your AI fills the week with on-brand content. Review, edit and approve — publishing is one connect away."
        action={
          <div className="cal-nav">
            <button className="cal-nav__btn" aria-label="Previous week">‹</button>
            <span className="cal-nav__today">Today</span>
            <button className="cal-nav__btn" aria-label="Next week">›</button>
            <span className="cal-nav__range">{range}</span>
            <GenerateButton label="✦ Generate this week" className="btn btn--sm" />
          </div>
        }
      />

      <div className="ds-banner">
        <span className="ds-banner__dot">⚡</span>
        <p>
          <strong>Your posts aren&rsquo;t going out yet.</strong> Connect your accounts to publish automatically.
        </p>
        <a href="/dashboard/integrations" className="btn btn--sm">Connect</a>
      </div>

      {totalThisWeek === 0 && (
        <div className="empty-card">
          <p>Nothing scheduled for this week yet.</p>
          <GenerateButton label="✦ Generate this week" className="btn btn--sm" />
        </div>
      )}

      <div className="cal2">
        {columns.map((d) => (
          <div key={d.key} className="cal2__col">
            <div className="cal2__head">
              <span className="cal2__date">{d.date}</span>
              <span className="cal2__day">{d.label}</span>
            </div>
            <div className="cal2__slots">
              {d.posts.map((p) => (
                <article key={p.id} className="post-card">
                  <div className="post-card__top">
                    <span className={`post-pill post-pill--${PILL_CLS[p.type]}`}>{p.type}</span>
                    <span className="post-card__time">{fmtTime(p.scheduledFor)}</span>
                  </div>
                  <div className="post-card__media">
                    {p.imageUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrls[0]} alt="" />
                    ) : (
                      <div className="post-card__placeholder" />
                    )}
                    {p.status === "generating" && <span className="post-card__gen">✦ Generating…</span>}
                  </div>
                  <div className="post-card__foot">
                    <span className="post-card__status">{p.status === "approved" ? "Approved" : p.status === "ready" ? "Ready to publish" : p.status === "rejected" ? "Rejected" : "Generating…"}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
