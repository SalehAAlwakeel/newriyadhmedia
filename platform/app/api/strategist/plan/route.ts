import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SAUDI_MARKETING_CONTEXT } from "@/lib/marketingContext";
import { generate } from "@/lib/llm";
import { brandFromUser, plannedTypesFromPrefs } from "@/lib/generate";
import { costForType, DEFAULT_CREDITS } from "@/lib/credits";
import type { ContentPreferences, PostType } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

const POST_TYPES: PostType[] = ["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"];

const PlanSchema = z.object({
  summary: z.string().min(4).max(600),
  items: z
    .array(
      z.object({
        type: z.enum(["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"]),
        topic: z.string().min(3).max(160),
        rationale: z.string().min(3).max(240),
      }),
    )
    .max(20),
});
type Plan = z.infer<typeof PlanSchema>;

const PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items"],
  properties: {
    summary: { type: "string", description: "One short paragraph: what you'd post this week and why, referencing the credit budget." },
    items: {
      type: "array",
      description: "The recommended posts for the week, best-first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "topic", "rationale"],
        properties: {
          type: { type: "string", enum: POST_TYPES, description: "The content format." },
          topic: { type: "string", description: "A specific, on-brand topic/angle for this post." },
          rationale: { type: "string", description: "One sentence: why this post, grounded in the brand/analytics." },
        },
      },
    },
  },
} as const;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const credits = user.credits ?? DEFAULT_CREDITS;
  const prefs = user.contentPrefs;
  const postsPerWeek = Math.max(1, prefs?.postsPerWeek ?? 6);
  const brand = brandFromUser(user);

  const body = (await req.json().catch(() => ({}))) as { guidance?: string };

  const userPrompt = [
    `Plan this week's content for ${brand.businessName}.`,
    `Target volume: about ${postsPerWeek} posts this week.`,
    `Credit budget remaining: ${credits} credits.`,
    "Credit cost per format: Still Image 5, Story 5, Carousel 10, Email 8, Blog Post 15, Short-form Video 40.",
    "Choose a smart mix that fits the budget and the brand's goals. Prefer the formats that perform best for this brand.",
    body.guidance ? `Extra direction from the client: ${body.guidance}` : "",
    "Return strict JSON: a short summary + an ordered list of posts (type, specific topic, one-line rationale).",
  ]
    .filter(Boolean)
    .join("\n");

  const system = `${SAUDI_MARKETING_CONTEXT}

You are the dedicated AI strategist for ${brand.businessName}. Propose a concrete, on-brand weekly content plan. Be specific with topics (not generic). Respect the credit budget and the requested volume. Reply topics/summary in the client's primary language when clear.`;

  const result = await generate<Plan>({
    schemaName: "weekly_plan",
    jsonSchema: PLAN_JSON_SCHEMA,
    validator: PlanSchema,
    system,
    user: userPrompt,
    tier: "smart",
    maxTokens: 900,
    mock: () => mockPlan(brand.businessName, prefs, postsPerWeek),
  });

  // Attach credit cost and an affordability flag (cumulative within budget).
  let running = 0;
  const items = result.data.items.slice(0, Math.max(postsPerWeek, result.data.items.length)).map((it) => {
    const estCredits = costForType(it.type as PostType);
    running += estCredits;
    return { ...it, estCredits, affordable: running <= credits };
  });

  return NextResponse.json({
    summary: result.data.summary,
    items,
    creditsRemaining: credits,
    postsPerWeek,
    source: result.source,
  });
}

function mockPlan(business: string, prefs: ContentPreferences | null | undefined, postsPerWeek: number): Plan {
  const types = plannedTypesFromPrefs(prefs).slice(0, postsPerWeek);
  const topicSeed = prefs?.topics?.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) ?? [];
  return {
    summary: `A balanced week for ${business}: a mix of stills, a carousel and long-form, sized to your volume and credits.`,
    items: types.map((t, i) => ({
      type: t,
      topic: topicSeed[i % Math.max(1, topicSeed.length)] || `${business} highlight #${i + 1}`,
      rationale: "On-brand format that fits your audience and cadence.",
    })),
  };
}
