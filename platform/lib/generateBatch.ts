import { after } from "next/server";
import crypto from "crypto";
import { createPost, findUserById, updatePost, updateUser } from "./db";
import type { GeneratedPost, PostType, User } from "./db";
import { brandFromUser, generateOnePost } from "./generate";
import { costForType, DEFAULT_CREDITS, totalCost } from "./credits";

// ---------------------------------------------------------------------------
// Resilient batch generation.
//
// Shared by /api/strategist/generate and /api/campaigns. Placeholders are
// created and credits charged synchronously, then the actual content is filled
// in via Next.js after() so the work continues on the server even if the client
// navigates away. Failures fail the individual post and refund its credits.
// ---------------------------------------------------------------------------

export const VALID_POST_TYPES: PostType[] = [
  "Still Image",
  "Carousel",
  "Story",
  "Short-form Video",
  "Blog Post",
  "Email",
];

export interface BatchItem {
  type: PostType;
  topic?: string;
}

export type BatchResult =
  | { ok: true; posts: GeneratedPost[]; creditsRemaining: number }
  | { ok: false; status: number; error: string; creditsRemaining?: number };

export function defaultWeekCampaignName(user: Pick<User, "company" | "name">): string {
  return `${user.company || user.name}'s Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/**
 * Stage + background-fill a batch of posts for a user.
 * @param scheduleStart  ISO timestamp used as each placeholder's scheduledFor.
 */
export async function startBatchGeneration(
  user: User,
  rawItems: BatchItem[],
  campaignName?: string,
  scheduleStart?: string,
): Promise<BatchResult> {
  const items = (rawItems ?? []).filter((it) => it && VALID_POST_TYPES.includes(it.type));
  if (items.length === 0) return { ok: false, status: 400, error: "No items to generate." };

  const credits = user.credits ?? DEFAULT_CREDITS;
  const cost = totalCost(items.map((i) => i.type));
  if (credits < cost) {
    return {
      ok: false,
      status: 402,
      error: `Not enough credits — this batch needs ${cost}, you have ${credits}.`,
      creditsRemaining: credits,
    };
  }

  const name = campaignName ?? defaultWeekCampaignName(user);
  const stagedAt = scheduleStart ?? new Date().toISOString();

  // 1) Create "generating" placeholders immediately so the client sees them.
  const placeholders: GeneratedPost[] = [];
  for (const it of items) {
    const post: GeneratedPost = {
      id: crypto.randomUUID(),
      userId: user.id,
      type: it.type,
      campaignName: name,
      topic: it.topic ?? "",
      caption: "Generating…",
      body: "",
      hashtags: [],
      imageUrls: [],
      scheduledFor: stagedAt,
      status: "generating",
      createdAt: new Date().toISOString(),
    };
    await createPost(post);
    placeholders.push(post);
  }

  // 2) Charge credits up front.
  const creditsRemaining = credits - cost;
  await updateUser(user.id, { credits: creditsRemaining });

  const brand = brandFromUser(user);
  const userId = user.id;

  // 3) Fill content in the background (continues after the response is sent).
  after(async () => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ph = placeholders[i];
      try {
        const gen = await generateOnePost({
          userId,
          brand,
          type: it.type,
          topicHint: it.topic,
          campaignName: name,
          scheduledFor: stagedAt,
        });
        await updatePost(ph.id, {
          topic: gen.topic,
          caption: gen.caption,
          body: gen.body,
          hashtags: gen.hashtags,
          imageUrls: gen.imageUrls,
          status: "ready",
        });
      } catch (err) {
        console.error("[generateBatch] item failed:", err);
        await updatePost(ph.id, { status: "failed", error: "Generation failed" });
        // Refund the credits for the failed item.
        try {
          const fresh = await findUserById(userId);
          const current = fresh?.credits ?? creditsRemaining;
          await updateUser(userId, { credits: current + costForType(it.type) });
        } catch {
          /* best-effort refund */
        }
      }
    }
  });

  return { ok: true, posts: placeholders, creditsRemaining };
}
