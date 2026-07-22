import { getCurrentUser } from "@/lib/auth";
import { listCampaigns, listMedia, listPosts } from "@/lib/db";
import PageHead from "../PageHead";
import Files from "./Files";

export const metadata = { title: "Files & Projects · New Riyadh Media" };
export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await getCurrentUser();
  const [posts, media, campaigns] = user
    ? await Promise.all([listPosts(user.id), listMedia(user.id), listCampaigns(user.id)])
    : [[], [], []];

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Files & Projects"
        title="Everything you've made."
        sub="Projects, drafts, generated media and your weekly content folders — organised and searchable."
      />
      <Files initialPosts={posts} initialMedia={media} initialCampaigns={campaigns} />
    </div>
  );
}
