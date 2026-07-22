import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { createPost, findUserById, updatePost, updateUser } from "@/lib/db";
import type { GeneratedPost, PostType } from "@/lib/db";
import { brandFromUser, generateOnePost } from "@/lib/generate";
import { costForType, DEFAULT_CREDITS, totalCost } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VALID: PostType[] = ["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"];

interface BatchBody {
  items?: { type: PostType; topic?: string }[];
  campaignName?: string;
}

async function fillPostsInBackground(
  items: { type: PostType; topic?: string }[],
  placeholders: GeneratedPost[],
  brand: ReturnType<typeof brandFromUser>,
  userId: string,
  creditsRemaining: number,
) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const ph = placeholders[i];
    const started = Date.now();
    console.log(`[strategist/generate] start ${i + 1}/${items.length} ${it.type} (${ph.id.slice(0, 8)})`);
    try {
      const gen = await generateOnePost({
        userId,
        brand,
        type: it.type,
        topicHint: it.topic,
        campaignName: ph.campaignName,
        scheduledFor: ph.scheduledFor,
      });
      await updatePost(ph.id, {
        topic: gen.topic,
        caption: gen.caption,
        body: gen.body,
        hashtags: gen.hashtags,
        imageUrls: gen.imageUrls,
        status: "ready",
      });
      console.log(`[strategist/generate] done ${it.type} in ${Math.round((Date.now() - started) / 1000)}s`);
      } catch (err) {
        console.error("[strategist/generate] item failed:", it.type, err);
        const message = err instanceof Error ? err.message : "Generation failed";
        await updatePost(ph.id, { status: "failed", error: message.slice(0, 240) });
      try {
        const fresh = await findUserById(userId);
        const current = fresh?.credits ?? creditsRemaining;
        await updateUser(userId, { credits: current + costForType(it.type) });
      } catch {
        /* best-effort refund */
      }
    }
  }
}

// Generate a batch of posts. Placeholders are created and credits charged
// synchronously, then content is filled in on the server in the background.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as BatchBody;
  const items = (body.items ?? []).filter((it) => it && VALID.includes(it.type));
  if (items.length === 0) return NextResponse.json({ error: "No items to generate." }, { status: 400 });

  const credits = user.credits ?? DEFAULT_CREDITS;
  const cost = totalCost(items.map((i) => i.type));
  if (credits < cost) {
    return NextResponse.json(
      { error: `Not enough credits — this batch needs ${cost}, you have ${credits}.`, creditsRemaining: credits },
      { status: 402 },
    );
  }

  const campaignName = body.campaignName ?? `${user.company || user.name}'s Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const stagedAt = new Date().toISOString();

  // 1) Create "generating" placeholders immediately so the client sees them.
  const placeholders: GeneratedPost[] = [];
  for (const it of items) {
    const post: GeneratedPost = {
      id: crypto.randomUUID(),
      userId: user.id,
      type: it.type,
      campaignName,
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

  // Fire-and-forget background fill (more reliable in local dev than after()).
  void fillPostsInBackground(items, placeholders, brand, userId, creditsRemaining);

  return NextResponse.json({ posts: placeholders, creditsRemaining });
}
