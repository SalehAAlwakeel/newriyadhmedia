import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPost, updateUser } from "@/lib/db";
import type { PostType } from "@/lib/db";
import { brandFromUser, generateOnePost, plannedTypesFromPrefs } from "@/lib/generate";
import { costForType, DEFAULT_CREDITS, totalCost } from "@/lib/credits";

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
  const credits = user.credits ?? DEFAULT_CREDITS;

  // Single-post path — charges credits, stages the post for review (it only
  // reaches the calendar once approved & scheduled).
  if (body.type) {
    const cost = costForType(body.type);
    if (credits < cost) {
      return NextResponse.json(
        { error: `Not enough credits — this ${body.type} needs ${cost}, you have ${credits}.`, creditsRemaining: credits },
        { status: 402 },
      );
    }

    const post = await generateOnePost({
      userId: user.id,
      brand,
      type: body.type,
      topicHint: body.topic,
      campaignName: body.campaignName ?? "Custom",
      scheduledFor: body.scheduledFor ?? new Date().toISOString(),
    });
    await createPost(post);

    const creditsRemaining = credits - cost;
    await updateUser(user.id, { credits: creditsRemaining });

    return NextResponse.json({ posts: [post], creditsRemaining });
  }

  // Weekly batch path — also charges credits
  const types = plannedTypesFromPrefs(user.contentPrefs);
  const batchCost = totalCost(types);
  if (credits < batchCost) {
    return NextResponse.json(
      { error: `Not enough credits — this week needs ${batchCost}, you have ${credits}.`, creditsRemaining: credits },
      { status: 402 },
    );
  }

  const weekStart = body.weekStart ? new Date(body.weekStart) : nextMonday();
  const campaignName = body.campaignName ?? `${user.company || user.name}'s Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

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

  const creditsRemaining = credits - batchCost;
  await updateUser(user.id, { credits: creditsRemaining });

  return NextResponse.json({ posts: out, campaignName, creditsRemaining });
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}
