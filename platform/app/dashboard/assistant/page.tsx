import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/db";
import { DEFAULT_CREDITS } from "@/lib/credits";
import PageHead from "../PageHead";
import StrategistStudio from "./StrategistStudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content Studio · New Riyadh Media" };

export default async function AssistantPage() {
  const user = await getCurrentUser();
  const posts = user ? await listPosts(user.id) : [];
  const review = posts
    .filter((p) => p.status === "ready" || p.status === "generating" || p.status === "failed")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const scheduledCount = posts.filter((p) => p.status === "approved" || p.status === "published").length;

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Content studio"
        title="Create, preview & schedule."
        sub="Plan this week's content, preview every draft, and approve when you're ready — approved posts land on your calendar automatically."
      />
      <StrategistStudio
        company={user?.company || user?.name || "your brand"}
        creditsInitial={user?.credits ?? DEFAULT_CREDITS}
        postsPerWeek={user?.contentPrefs?.postsPerWeek ?? 6}
        reviewInitial={review}
        scheduledCount={scheduledCount}
      />
    </div>
  );
}
