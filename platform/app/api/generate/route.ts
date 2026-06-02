import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPost } from "@/lib/db";
import type { PostType } from "@/lib/db";
import { brandFromUser, generateOnePost, plannedTypesFromPrefs } from "@/lib/generate";

export const dynamic = "force-dynamic";

interface GenerateBody {
  /** Generate a single post of this type. Omit to generate a full weekly mix. */
  type?: PostType;
  topic?: string;
  campaignName?: string;
  scheduledFor?: string;
  weekStart?: string; // ISO date for the Monday of the week to plan
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const brand = brandFromUser(user);

  // Single-post path
  if (body.type) {
    const post = await generateOnePost({
      userId: user.id,
      brand,
      type: body.type,
      topicHint: body.topic,
      campaignName: body.campaignName ?? "Custom",
      scheduledFor: body.scheduledFor ?? new Date(Date.now() + 24 * 3600_000).toISOString(),
    });
    await createPost(post);
    return NextResponse.json({ posts: [post] });
  }

  // Weekly batch path
  const types = plannedTypesFromPrefs(user.contentPrefs);
  const weekStart = body.weekStart ? new Date(body.weekStart) : nextMonday();
  const campaignName = body.campaignName ?? `${user.company || user.name}'s Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  // Generate sequentially so we respect per-key rate limits, but kick all off
  // server-side before responding so the client just shows the result list.
  const out = [];
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const slot = new Date(weekStart);
    slot.setDate(slot.getDate() + i);
    slot.setHours(10 + (i % 4), 0, 0, 0);
    try {
      const post = await generateOnePost({
        userId: user.id,
        brand,
        type,
        campaignName,
        scheduledFor: slot.toISOString(),
      });
      await createPost(post);
      out.push(post);
    } catch (err) {
      console.error("[/api/generate] one post failed:", err);
    }
  }
  return NextResponse.json({ posts: out, campaignName });
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}
