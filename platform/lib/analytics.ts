// ---------------------------------------------------------------------------
// Analytics digest — the performance signal the AI "learns" from.
//
// Today this is a synthetic weekly digest that stands in for real Google
// Analytics / platform insights. Once GA + social analytics are connected this
// is built from live data so the strategist genuinely learns what works.
//
// Shared by the assistant chat and the campaign planner so both reason from the
// same performance picture.
// ---------------------------------------------------------------------------

import type { Campaign } from "./db";
import { sanitizeConnections } from "./social";

export function analyticsDigest(connections: { platform: string }[]): string {
  const verified = sanitizeConnections(connections as import("./db").SocialConnection[]);
  if (verified.length === 0) {
    return "No channels connected yet, so there's no performance data to learn from. Encourage connecting Instagram first.";
  }
  const names = verified.map((c) => c.platform).join(", ");
  return `Connected channels: ${names}.
Last 7 days (sample): Snapchat Stories drove the highest profile-visit rate (+18% WoW). Instagram Reels had the best reach per post. X posts under-performed (engagement down 9%). Best posting windows: 9-11pm Riyadh time. Top content type: behind-the-scenes + product-in-use. Arabic captions outperformed English by ~22% on reach.`;
}

// Compress prior campaigns' performance into a short "what we've learned" block
// so the planner improves week over week / month over month.
export function priorCampaignsDigest(campaigns: Campaign[]): string {
  if (campaigns.length === 0) {
    return "No prior campaigns yet — this is the brand's first. Set a clear, measurable objective so future campaigns can learn from it.";
  }
  // Most recent first, capped so the prompt stays lean.
  const recent = [...campaigns]
    .sort((a, b) => +new Date(b.weekStart || b.createdAt) - +new Date(a.weekStart || a.createdAt))
    .slice(0, 8);

  const lines = recent.map((c) => {
    const when = c.weekStart ? new Date(c.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const perf = c.performanceSummary?.trim();
    return `- ${c.name}${when ? ` (week of ${when})` : ""} · status: ${c.status}. ${
      perf ? `Result: ${perf}` : "No results logged yet."
    }`;
  });

  return `Prior campaigns (most recent first) — learn from what worked and avoid repeating what didn't:\n${lines.join("\n")}`;
}
