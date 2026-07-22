import { Zap, ArrowRight, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listCampaigns, listPostsByCampaign } from "@/lib/db";
import { DEFAULT_CREDITS } from "@/lib/credits";
import { sanitizeConnections } from "@/lib/social";
import { CONTACT_URL } from "@/lib/site";
import PageHead from "../PageHead";
import CampaignBoard, { type CampaignSummary } from "./CampaignBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns · New Riyadh Media" };

export default async function CampaignsPage() {
  const user = await getCurrentUser();

  let campaigns: CampaignSummary[] = [];
  if (user) {
    const list = await listCampaigns(user.id);
    campaigns = await Promise.all(
      list.map(async (c) => {
        const posts = await listPostsByCampaign(user.id, c.name);
        const thumb = posts
          .flatMap((p) => p.imageUrls)
          .find((u) => u && !/\.(mp4|webm|mov)(\?|$)/i.test(u) && !u.includes("type=video"));
        return {
          ...c,
          postCount: posts.length,
          generatingCount: posts.filter((p) => p.status === "generating").length,
          thumb: thumb ?? null,
        };
      }),
    );
  }

  const connected = sanitizeConnections(user?.connections ?? []).length > 0;

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Campaigns"
        title="Campaigns"
        sub="Real marketing campaigns, planned per week. Brief your strategist, confirm the plan, and content generates automatically — learning from what performed before."
      />

      {!connected && (
        <div className="ds-banner">
          <span className="ds-banner__dot"><Zap size={15} /></span>
          <p>
            <strong>Your campaigns aren&rsquo;t going out yet.</strong> Connect your accounts to publish automatically.
          </p>
          <a href="/dashboard/integrations" className="btn btn--sm">Connect</a>
        </div>
      )}

      <CampaignBoard
        initialCampaigns={campaigns}
        creditsInitial={user?.credits ?? DEFAULT_CREDITS}
      />

      <div className="expert-banner">
        <div className="expert-banner__icon" aria-hidden="true">
          <MessageSquare size={20} strokeWidth={1.75} />
        </div>
        <div className="expert-banner__body">
          <span className="expert-banner__eyebrow">Free · 1:1 review</span>
          <strong className="expert-banner__title">Get free expert campaign strategy advice</strong>
          <p className="expert-banner__desc">A specialist reviews your campaign strategy, content, and publishing — free.</p>
        </div>
        <a href={CONTACT_URL} target="_blank" rel="noopener" className="expert-banner__cta btn btn--sm">
          Talk to an expert <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
