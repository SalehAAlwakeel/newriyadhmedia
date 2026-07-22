import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SAUDI_MARKETING_CONTEXT } from "@/lib/marketingContext";
import { analyticsDigest, priorCampaignsDigest } from "@/lib/analytics";
import { generate } from "@/lib/llm";
import { brandFromUser } from "@/lib/generate";
import { listCampaigns } from "@/lib/db";
import { costForType, DEFAULT_CREDITS } from "@/lib/credits";
import type { ContentPreferences, PostType, User } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

const POST_TYPES: PostType[] = ["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"];

const PlanSchema = z.object({
  name: z.string().min(3).max(120),
  audience: z.string().min(3).max(400),
  purpose: z.string().min(3).max(400),
  why: z.string().min(3).max(600),
  strategy: z.string().min(3).max(1200),
  objective: z.string().min(3).max(300),
  items: z
    .array(
      z.object({
        type: z.enum(["Still Image", "Carousel", "Story", "Short-form Video", "Blog Post", "Email"]),
        topic: z.string().min(3).max(200),
        rationale: z.string().min(3).max(300),
      }),
    )
    .min(1)
    .max(20),
});
type Plan = z.infer<typeof PlanSchema>;

const PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "audience", "purpose", "why", "strategy", "objective", "items"],
  properties: {
    name: { type: "string", description: "A short, evocative campaign name (on-brand, in the client's primary language when clear)." },
    audience: { type: "string", description: "The specific target audience for this campaign." },
    purpose: { type: "string", description: "What this campaign is for — the marketing purpose." },
    why: { type: "string", description: "The strategic rationale: WHY run this now, grounded in brand goals + the analytics/performance signals." },
    strategy: { type: "string", description: "The playbook: angle, channels, cadence, hooks, and how it builds on what performed before." },
    objective: { type: "string", description: "One concrete, measurable goal headline (e.g. 'Grow Snapchat profile visits 20% this week')." },
    items: {
      type: "array",
      description: "The posts that make up this campaign, best-first.",
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

  const body = (await req.json().catch(() => ({}))) as { brief?: string };
  const brief = (body.brief ?? "").trim();

  const priorCampaigns = await listCampaigns(user.id);

  const userPrompt = [
    `Design ONE complete weekly marketing campaign for ${brand.businessName}.`,
    brief ? `Client brief / what they want: ${brief}` : "No specific brief — propose the highest-impact campaign for this brand right now.",
    `Target volume: about ${postsPerWeek} posts in the campaign.`,
    `Credit budget remaining: ${credits} credits.`,
    "Credit cost per format: Still Image 5, Story 5, Carousel 10, Email 8, Blog Post 15, Short-form Video 40.",
    "Choose a smart mix of formats that fits the budget and the campaign's objective.",
    "Return strict JSON: name, audience, purpose, why, strategy, objective, and an ordered list of posts (type, specific topic, one-line rationale).",
  ]
    .filter(Boolean)
    .join("\n");

  const system = `${SAUDI_MARKETING_CONTEXT}

You are the dedicated AI campaign strategist for ${brand.businessName}. Propose a concrete, on-brand weekly campaign with a clear audience, purpose, strategic "why", and a measurable objective — plus the posts that deliver it. Be specific (no generic filler). Respect the credit budget and requested volume. Crucially, LEARN over time: use the performance signals and prior-campaign results below to double down on what worked and avoid repeating what didn't. Reply in the client's primary language when clear.

${describeBrandForPrompt(user)}

PERFORMANCE — LEARN FROM THIS
${analyticsDigest(user.connections)}

${priorCampaignsDigest(priorCampaigns)}`;

  const result = await generate<Plan>({
    schemaName: "campaign_plan",
    jsonSchema: PLAN_JSON_SCHEMA,
    validator: PlanSchema,
    system,
    user: userPrompt,
    tier: "smart",
    maxTokens: 1200,
    mock: () => mockPlan(brand.businessName, brief, prefs, postsPerWeek),
  });

  // Attach credit cost + affordability (cumulative within budget) per item.
  let running = 0;
  const items = result.data.items.map((it) => {
    const estCredits = costForType(it.type as PostType);
    running += estCredits;
    return { ...it, estCredits, affordable: running <= credits };
  });
  const totalCredits = items.reduce((sum, it) => sum + it.estCredits, 0);

  return NextResponse.json({
    proposal: {
      name: result.data.name,
      audience: result.data.audience,
      purpose: result.data.purpose,
      why: result.data.why,
      strategy: result.data.strategy,
      objective: result.data.objective,
      items,
    },
    creditsRemaining: credits,
    totalCredits,
    postsPerWeek,
    source: result.source,
  });
}

function describeBrandForPrompt(user: User): string {
  const b = user.brandKit;
  const prefs = user.contentPrefs;
  return `CLIENT BRAND
- Name/company: ${user.company || user.name}
- Purpose: ${b?.purpose || "not set yet"}
- Audience: ${b?.audience || "not set yet"}
- Character: ${b?.character || "not set yet"}
- Tone traits: ${(b?.toneTraits ?? []).join(", ") || "not set yet"}
- Brand voice notes: ${b?.voice || "not set yet"}
- Content preferences: ${prefs ? `${prefs.tone}, languages: ${prefs.languages.join("/")}, ${prefs.postsPerWeek} posts/week, topics: ${prefs.topics}` : "not set yet"}`;
}

function mockPlan(
  business: string,
  brief: string,
  prefs: ContentPreferences | null | undefined,
  postsPerWeek: number,
): Plan {
  const focus = brief || `${business} weekly highlight`;
  const topicSeed = prefs?.topics?.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) ?? [];
  const mix: PostType[] = ["Still Image", "Carousel", "Story", "Short-form Video", "Email", "Blog Post"];
  const items = Array.from({ length: Math.max(1, Math.min(postsPerWeek, 6)) }, (_, i) => ({
    type: mix[i % mix.length],
    topic: topicSeed[i % Math.max(1, topicSeed.length)] || `${focus} — angle ${i + 1}`,
    rationale: "On-brand format chosen for reach with the target audience.",
  }));
  return {
    name: brief ? `${focus.slice(0, 60)}` : `${business}: This Week`,
    audience: prefs?.topics ? `Saudi audience interested in ${prefs.topics}` : "Young, mobile-first Saudi audience (18–35).",
    purpose: `Build awareness and engagement around ${focus.toLowerCase()}.`,
    why: "Leans into the channels and content types that have performed best recently, while staying culturally relevant to the Saudi market.",
    strategy:
      "Lead with short vertical video and Snapchat/Instagram Stories during 9–11pm Riyadh windows, support with a carousel for depth and an email to convert warm audiences. Arabic-first captions for reach.",
    objective: "Grow profile visits and saves week-over-week while seeding the campaign theme.",
    items,
  };
}
