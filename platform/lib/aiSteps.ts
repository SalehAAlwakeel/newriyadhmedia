import { z } from "zod";
import { generate, type LlmResult } from "./llm";
import { scrapeToPrompt, type ScrapedSite } from "./scrape";
import { STRATEGIES, STRATEGY_IDS, channelLabel } from "./strategies";
import {
  SAUDI_MARKETING_CONTEXT,
  languageDirective,
  isArabicLanguage,
} from "./marketingContext";
import type {
  BusinessProfile,
  Campaign,
  CampaignPlan,
  ChannelId,
  PositioningResult,
  StrategyId,
} from "./types";

// --------------------------------------------------------------------------
// Each step: prompt + strict JSON schema + Zod validator + realistic mock.
// Routes stay thin and just validate input and call these.
// --------------------------------------------------------------------------

// Literal enum so Zod infers the StrategyId union (not a widened string).
const StrategyIdEnum = z.enum(["authority", "performance", "community", "launch", "education"]);

// ---------- Step 1: scan -> business profile ----------
const ProfileSchema = z.object({
  businessName: z.string().min(1).max(120),
  elevatorPitch: z.string().min(1).max(400),
  detectedLanguage: z.string().min(1).max(40),
});

const profileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["businessName", "elevatorPitch", "detectedLanguage"],
  properties: {
    businessName: { type: "string", description: "The brand/business name." },
    elevatorPitch: {
      type: "string",
      description: "One or two sentences: what they do and who for.",
    },
    detectedLanguage: {
      type: "string",
      description: "Primary human language of the site, e.g. English or Arabic.",
    },
  },
} as const;

export async function analyzeBusiness(
  site: ScrapedSite
): Promise<LlmResult<BusinessProfile>> {
  const fallbackName =
    site.siteName ||
    site.title.split(/[|\-–—·]/)[0].trim() ||
    site.domain;

  const res = await generate<z.infer<typeof ProfileSchema>>({
    schemaName: "business_profile",
    jsonSchema: profileJsonSchema,
    validator: ProfileSchema,
    tier: "mini",
    maxTokens: 400,
    system:
      `${SAUDI_MARKETING_CONTEXT}\n\nTASK: From scraped website content, extract:\n1. The exact business/brand name (as they spell it themselves)\n2. A crisp 1-2 sentence elevator pitch in the site's own primary language — what they do, who for, and what makes them different. Be concrete and value-driven, not generic.\n3. The primary human language of the site.\n\nRules: Never invent facts not supported by the content. If the site is vague, write the best pitch from what's available. Use their own terminology.`,
    user: `Analyze this website and return the structured profile.\n\n${scrapeToPrompt(site)}`,
    mock: () => ({
      businessName: fallbackName,
      elevatorPitch:
        site.description ||
        `${fallbackName} helps its customers with ${
          site.headings[0]?.toLowerCase() || "their goals"
        }. (Sample pitch — add your OpenAI key for AI-generated copy.)`,
      detectedLanguage: guessLanguage(site.langHint),
    }),
  });

  return {
    ...res,
    data: {
      businessName: res.data.businessName || fallbackName,
      elevatorPitch: res.data.elevatorPitch,
      detectedLanguage: res.data.detectedLanguage,
      logoUrl: site.logoUrl,
      sourceUrl: site.url,
    },
  };
}

function guessLanguage(langHint: string | null): string {
  if (!langHint) return "English";
  const code = langHint.toLowerCase().slice(0, 2);
  const map: Record<string, string> = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    es: "Spanish",
    de: "German",
    ur: "Urdu",
    hi: "Hindi",
  };
  return map[code] || "English";
}

// ---------- Step 2/3: positioning ----------
export const PositioningRequest = z.object({
  businessName: z.string().min(1).max(120),
  elevatorPitch: z.string().min(1).max(800),
  audience: z.string().min(1).max(400),
  adFaces: z.string().min(1).max(400),
  language: z.string().min(1).max(40),
});
export type PositioningRequestInput = z.infer<typeof PositioningRequest>;

const PositioningSchema = z.object({
  positioning: z.string().min(1).max(600),
  recommendedStrategyId: StrategyIdEnum,
});

const positioningJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["positioning", "recommendedStrategyId"],
  properties: {
    positioning: {
      type: "string",
      description:
        "A sharp market-positioning statement: who it's for, the category, and the distinct value.",
    },
    recommendedStrategyId: {
      type: "string",
      enum: STRATEGY_IDS,
      description: "The single best-fit strategy id for this business.",
    },
  },
} as const;

export async function generatePositioning(
  input: PositioningRequestInput
): Promise<LlmResult<PositioningResult>> {
  const strategyMenu = STRATEGIES.map((s) => `- ${s.id}: ${s.title} — ${s.description}`).join("\n");

  const res = await generate<PositioningResult>({
    schemaName: "positioning",
    jsonSchema: positioningJsonSchema,
    validator: PositioningSchema,
    tier: "smart",
    maxTokens: 500,
    system:
      `${SAUDI_MARKETING_CONTEXT}\n\nTASK: Write a single, razor-sharp market-positioning statement (3-4 sentences max) that:\n1. Names the specific audience and their core pain/desire\n2. States what the brand uniquely offers that competitors don't\n3. Grounds it in the Saudi market reality (mention a relevant cultural truth, platform behavior, or market dynamic)\n4. Ends with the emotional or functional payoff\n\nAlso pick the single best-fit strategy from the provided menu based on the business stage, audience behavior, and competitive landscape.\n\nBe opinionated. Take a clear stance. Do NOT write generic "we help businesses grow" fluff.\n\n${languageDirective(input.language)}`,
    user: `Business: ${input.businessName}\nWhat they do: ${input.elevatorPitch}\nTarget audience: ${input.audience}\nWho should appear in the ads: ${input.adFaces}\nPrimary language: ${input.language}\n\nAvailable strategies:\n${strategyMenu}\n\nReturn the positioning statement and the best-fit strategy id.`,
    mock: () =>
      isArabicLanguage(input.language)
        ? {
            positioning: `لـ${input.audience}، تقدّم ${input.businessName} تجربة تجمع بين الخبرة الموثوقة والفهم العميق للسوق السعودي — لتحوّل الاهتمام إلى نتائج حقيقية. (نص تجريبي — أضف مفتاح OpenAI لإنشاء محتوى حقيقي.)`,
            recommendedStrategyId: "authority" as StrategyId,
          }
        : {
            positioning: `For ${input.audience}, ${input.businessName} is the ${input.elevatorPitch
              .split(" ")
              .slice(0, 6)
              .join(" ")}… that delivers real outcomes — combining trusted expertise with a distinctly Saudi understanding of its market. (Sample positioning — add your OpenAI key for AI-generated copy.)`,
            recommendedStrategyId: "authority" as StrategyId,
          },
  });

  return res;
}

// ---------- Step 5: campaign ----------
export const CampaignRequest = z.object({
  businessName: z.string().min(1).max(120),
  elevatorPitch: z.string().min(1).max(800),
  positioning: z.string().min(1).max(800),
  audience: z.string().min(1).max(400),
  language: z.string().min(1).max(40),
  strategyId: StrategyIdEnum,
  targetLink: z.string().min(1).max(300),
});
export type CampaignRequestInput = z.infer<typeof CampaignRequest>;

const CampaignSchema = z.object({
  name: z.string().min(1).max(120),
  theme: z.string().min(1).max(400),
  callToAction: z.string().min(1).max(120),
});

const campaignJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "theme", "callToAction"],
  properties: {
    name: { type: "string", description: "A memorable campaign name." },
    theme: { type: "string", description: "The central creative theme/big idea in 1-2 sentences." },
    callToAction: { type: "string", description: "A short, punchy primary call to action." },
  },
} as const;

export async function generateCampaign(
  input: CampaignRequestInput
): Promise<LlmResult<Campaign>> {
  const strategy = STRATEGIES.find((s) => s.id === input.strategyId);

  const res = await generate<z.infer<typeof CampaignSchema>>({
    schemaName: "campaign",
    jsonSchema: campaignJsonSchema,
    validator: CampaignSchema,
    tier: "smart",
    maxTokens: 450,
    system:
      `${SAUDI_MARKETING_CONTEXT}\n\nTASK: As a creative director at a top Saudi agency, invent ONE powerful campaign concept. Think like the best Saudi creatives — campaigns that people screenshot, share and talk about at coffee shops.\n\nRequirements:\n- Campaign name: Memorable, punchy, could work as a hashtag. If Arabic, use idiomatic Saudi phrasing, not translated English.\n- Theme: The central creative idea in 2-3 sentences. What's the human truth? What's the visual world? What's the emotional hook? Reference a specific Saudi cultural moment, behavior or platform trend if relevant.\n- Call to action: Short, action-oriented, urgent. If Arabic, use natural Saudi dialect (e.g. "جرّبه الحين" not formal "قم بالتجربة الآن").\n\nAlign everything to the chosen strategy. Be bold and specific — not safe and generic.\n\n${languageDirective(input.language)}`,
    user: `Business: ${input.businessName}\nWhat they do: ${input.elevatorPitch}\nPositioning: ${input.positioning}\nAudience: ${input.audience}\nPrimary language: ${input.language}\nChosen strategy: ${strategy?.title} — ${strategy?.description}\n\nReturn the campaign name, theme and call to action.`,
    mock: () =>
      isArabicLanguage(input.language)
        ? {
            name: `${input.businessName}: انطلق نحو الأمام`,
            theme: `حملة قائمة على ${strategy?.title} تضع ${input.audience} في قلب القصة وتحوّل الاهتمام إلى فعل. (نص تجريبي — أضف مفتاح OpenAI لإنشاء محتوى حقيقي.)`,
            callToAction: "ابدأ الآن",
          }
        : {
            name: `${input.businessName}: ${strategy?.tagline ?? "The Next Move"}`,
            theme: `A ${strategy?.title.toLowerCase()} campaign that puts ${input.audience} at the centre and turns attention into action. (Sample — add your OpenAI key for AI-generated copy.)`,
            callToAction: "Get started today",
          },
  });

  return {
    ...res,
    data: { ...res.data, targetLink: input.targetLink },
  };
}

// ---------- Step 7: 4-week plan ----------
export const PlanRequest = z.object({
  businessName: z.string().min(1).max(120),
  campaignName: z.string().min(1).max(160),
  campaignTheme: z.string().min(1).max(600),
  language: z.string().min(1).max(40),
  channels: z.array(z.string().min(1).max(40)).min(1).max(8),
  cadence: z.enum(["light", "steady", "aggressive"]),
});
export type PlanRequestInput = z.infer<typeof PlanRequest>;

const PlanSchema = z.object({
  weeks: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1).max(4),
        name: z.string().min(1).max(120),
        description: z.string().min(1).max(800),
      })
    )
    .length(4),
});

const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["weeks"],
  properties: {
    weeks: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["weekNumber", "name", "description"],
        properties: {
          weekNumber: { type: "integer", description: "1 to 4." },
          name: { type: "string", description: "A short name for the week's focus." },
          description: {
            type: "string",
            description: "What happens this week across the chosen channels, and why.",
          },
        },
      },
    },
  },
} as const;

export async function generatePlan(input: PlanRequestInput): Promise<LlmResult<CampaignPlan>> {
  const channelLabels = (input.channels as ChannelId[]).map(channelLabel).join(", ");

  const res = await generate<CampaignPlan>({
    schemaName: "campaign_plan",
    jsonSchema: planJsonSchema,
    validator: PlanSchema,
    tier: "smart",
    maxTokens: 1600,
    system:
      `${SAUDI_MARKETING_CONTEXT}\n\nTASK: Produce a detailed, actionable 4-week rollout that builds strategically week over week. You are planning this for a real Saudi marketing team to execute.\n\nFor EACH week, provide:\n- A memorable name that captures the week's energy\n- A concrete description (3-5 sentences) that includes:\n  * The specific content types to produce (e.g. "3 Reels, 2 carousel posts, 1 X thread")\n  * The messaging angle for that week\n  * Which channels get what content and why\n  * A specific Saudi cultural or behavioral insight that informs the week's approach\n  * The cadence matches "${input.cadence}" — adjust volume accordingly\n\nWeek progression should follow: Tease/Warm-up → Launch/Hero content → Amplify/Social proof → Convert/Nurture\n\nBe specific enough that a social media manager could start executing immediately.\n\n${languageDirective(input.language)}`,
    user: `Business: ${input.businessName}\nCampaign: ${input.campaignName}\nTheme: ${input.campaignTheme}\nChannels: ${channelLabels}\nCadence: ${input.cadence}\nPrimary language: ${input.language}\n\nReturn exactly 4 weeks (weekNumber 1-4), each with a name and description.`,
    mock: () =>
      isArabicLanguage(input.language)
        ? {
            weeks: [
              {
                weekNumber: 1,
                name: "التشويق وتهيئة الجمهور",
                description: `قدّم فكرة "${input.campaignName}" عبر ${channelLabels} وابنِ الفضول دون بيع مباشر. (نص تجريبي — أضف مفتاح OpenAI.)`,
              },
              {
                weekNumber: 2,
                name: "إطلاق الفكرة الكبرى",
                description: `انطلق بالرسالة الأساسية والمحتوى الرئيسي بوتيرة ${input.cadence} عبر ${channelLabels}.`,
              },
              {
                weekNumber: 3,
                name: "التضخيم وإثبات القيمة",
                description: `ضاعف ما ينجح، وأضف الدليل الاجتماعي والمحتوى من خلف الكواليس عبر ${channelLabels}.`,
              },
              {
                weekNumber: 4,
                name: "التحويل والاستمرارية",
                description: `ركّز على الدعوة لاتخاذ إجراء، ولخّص الحملة، واجمع العملاء المهتمين لرعايتهم بعد الأسابيع الأربعة.`,
              },
            ],
          }
        : {
            weeks: [
              {
                weekNumber: 1,
                name: "Tease & Set the Stage",
                description: `Introduce the idea of "${input.campaignName}" across ${channelLabels}. Build curiosity and warm up the audience without the hard sell. (Sample — add your OpenAI key for AI copy.)`,
              },
              {
                weekNumber: 2,
                name: "Launch the Big Idea",
                description: `Go live with the core message and hero content. Post at a ${input.cadence} cadence across ${channelLabels}.`,
              },
              {
                weekNumber: 3,
                name: "Amplify & Prove It",
                description: `Double down on what's resonating. Add social proof, behind-the-scenes and audience-driven content on ${channelLabels}.`,
              },
              {
                weekNumber: 4,
                name: "Convert & Carry Forward",
                description: `Drive the call to action hard, recap the campaign, and capture leads to nurture beyond the 4 weeks.`,
              },
            ],
          },
  });

  return res;
}
