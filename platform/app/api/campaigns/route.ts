import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createCampaign,
  listCampaigns,
  listPostsByCampaign,
  type Campaign,
  type CampaignStatus,
} from "@/lib/db";
import { startBatchGeneration } from "@/lib/generateBatch";

export const dynamic = "force-dynamic";
// Background post generation can be slow (video).
export const maxDuration = 300;

const POST_TYPES = ["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"] as const;

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  audience: z.string().max(400).optional().default(""),
  purpose: z.string().max(400).optional().default(""),
  why: z.string().max(600).optional().default(""),
  strategy: z.string().max(1200).optional().default(""),
  objective: z.string().max(300).optional().default(""),
  weekStart: z.string().optional(),
  items: z
    .array(
      z.object({
        type: z.enum(POST_TYPES),
        topic: z.string().max(200).optional().default(""),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

// Monday (start) of the week containing `d`, as an ISO string.
function startOfWeekISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// Ensure the campaign name is unique for this user, since posts are linked by
// matching campaignName. Appends " (2)", " (3)", … on collision.
function uniqueName(base: string, taken: Set<string>): string {
  let name = base.trim() || "Untitled campaign";
  if (!taken.has(name)) return name;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base} (${i})`;
    if (!taken.has(candidate)) {
      name = candidate;
      break;
    }
  }
  return name;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const campaigns = await listCampaigns(user.id);
  // Attach a lightweight post summary (count + thumbnail) per campaign.
  const withSummary = await Promise.all(
    campaigns.map(async (c) => {
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

  return NextResponse.json({ campaigns: withSummary });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  const data = parsed.data;

  const existing = await listCampaigns(user.id);
  const name = uniqueName(data.name, new Set(existing.map((c) => c.name)));

  const weekStart = data.weekStart && !Number.isNaN(Date.parse(data.weekStart))
    ? new Date(data.weekStart).toISOString()
    : startOfWeekISO();

  const campaign: Campaign = {
    id: crypto.randomUUID(),
    userId: user.id,
    name,
    audience: data.audience,
    purpose: data.purpose,
    why: data.why,
    strategy: data.strategy,
    objective: data.objective,
    weekStart,
    status: "planned" as CampaignStatus,
    createdAt: new Date().toISOString(),
  };
  await createCampaign(campaign);

  // Generate the campaign's posts via the shared resilient batch generator.
  // Credits are charged inside startBatchGeneration; the posts schedule from the
  // campaign's week start.
  let creditsRemaining = user.credits;
  let generatedCount = 0;
  if (data.items.length > 0) {
    const result = await startBatchGeneration(
      user,
      data.items.map((it) => ({ type: it.type, topic: it.topic })),
      name,
      weekStart,
    );
    if (!result.ok) {
      // Campaign is saved; surface the credit problem so the client can react.
      return NextResponse.json(
        { campaign, error: result.error, creditsRemaining: result.creditsRemaining ?? user.credits },
        { status: result.status === 402 ? 200 : result.status },
      );
    }
    creditsRemaining = result.creditsRemaining;
    generatedCount = result.posts.length;
  }

  return NextResponse.json({ campaign, generatedCount, creditsRemaining });
}
