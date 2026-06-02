// ---------------------------------------------------------------------------
// Content generation engine.
//
// Turns a user's brand context (Brand Kit + Content Preferences + connections)
// into real, on-brand posts (caption + body + hashtags + image[s]) using
// OpenAI for text and OpenAI Images for visuals.
//
// Falls back to deterministic placeholders when OPENAI_API_KEY is missing, so
// the rest of the platform stays demoable.
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import { z } from "zod";
import { generate, isLiveAi } from "./llm";
import { SAUDI_MARKETING_CONTEXT } from "./marketingContext";
import { persistGeneratedImage } from "./mediaStore";
import type { BrandKit, ContentPreferences, GeneratedPost, PostType, User } from "./db";

export interface BrandContext {
  businessName: string;
  brandKit: BrandKit | null;
  contentPrefs: ContentPreferences | null;
  // Optional richer fields when we have them
  positioning?: string;
  audience?: string;
  language?: string;
  /** Active social handles + audience size — used in copy and CTAs. */
  connections?: { platform: string; handle: string; audienceSize?: number }[];
  /** Persistent things the strategist has learned (facts, do-nots, winning patterns). */
  memory?: { kind: string; text: string }[];
}

export function brandFromUser(user: User): BrandContext {
  return {
    businessName: user.company || user.name || "Your brand",
    brandKit: user.brandKit,
    contentPrefs: user.contentPrefs,
    language: user.contentPrefs?.languages?.[0],
    connections: (user.connections ?? []).map((c) => ({
      platform: c.platform,
      handle: c.handle,
      audienceSize: c.audienceSize,
    })),
    memory: (user.aiMemory ?? []).map((m) => ({ kind: m.kind, text: m.text })),
  };
}

// ---------------------------------------------------------------------------
// 1) Text part — caption + body + hashtags, schema-validated
// ---------------------------------------------------------------------------

const CopySchema = z.object({
  topic: z.string().min(3),
  caption: z.string().min(8).max(2200),
  body: z.string().max(4000),
  hashtags: z.array(z.string()).max(12),
  imagePrompt: z.string().min(20).max(800),
});
type Copy = z.infer<typeof CopySchema>;

const COPY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topic", "caption", "body", "hashtags", "imagePrompt"],
  properties: {
    topic: { type: "string", description: "One short sentence describing what this post is about." },
    caption: { type: "string", description: "The on-platform caption text. Include line breaks if useful. Stay in the requested language." },
    body: { type: "string", description: "For Blog Post / Email types this is the full body text in markdown. Empty string for other types." },
    hashtags: { type: "array", items: { type: "string" }, description: "0-8 platform-appropriate hashtags WITHOUT the # symbol. Empty array for Email/Blog." },
    imagePrompt: { type: "string", description: "A vivid, art-direction-quality prompt for an image generator. Describe scene, subject, lighting, mood, and brand style cues. Always English (even when caption is Arabic)." },
  },
} as const;

function describeBrand(b: BrandContext): string {
  const lines: string[] = [];
  lines.push(`Business name: ${b.businessName}`);
  if (b.positioning) lines.push(`Positioning: ${b.positioning}`);
  if (b.audience) lines.push(`Audience: ${b.audience}`);
  if (b.brandKit) {
    const k = b.brandKit;
    lines.push(`Brand colors: primary ${k.primaryColor}, secondary ${k.secondaryColor}.`);
    if (k.fonts) lines.push(`Fonts: ${k.fonts}.`);
    if (k.purpose) lines.push(`Brand purpose: ${k.purpose}`);
    if (k.audience) lines.push(`Brand-defined audience: ${k.audience}`);
    if (k.character) lines.push(`Brand character: ${k.character}`);
    if (k.toneTraits?.length) lines.push(`Tone traits: ${k.toneTraits.join(", ")}`);
    if (k.emotionTraits?.length) lines.push(`Emotional registers: ${k.emotionTraits.join(", ")}`);
    if (k.voice) lines.push(`Brand voice notes: ${k.voice}`);
    if (k.logoUrl) lines.push(`Logo reference: ${k.logoUrl}`);
  }
  if (b.contentPrefs) {
    const p = b.contentPrefs;
    if (p.languages?.length) lines.push(`Preferred languages: ${p.languages.join(", ")}`);
    if (p.tone) lines.push(`Tone preference: ${p.tone}`);
    if (p.topics) lines.push(`Topics to focus on: ${p.topics}`);
    if (p.doNotMention) lines.push(`Never mention: ${p.doNotMention}`);
    if (p.ctaCopy) lines.push(`Default call-to-action: "${p.ctaCopy}" -> ${p.ctaUrl ?? ""}`);
  }
  if (b.connections?.length) {
    const channels = b.connections
      .map((c) => `${c.platform}: ${c.handle}${c.audienceSize ? ` (${c.audienceSize.toLocaleString()} followers)` : ""}`)
      .join("; ");
    lines.push(`Active channels: ${channels}.`);
  }
  if (b.memory?.length) {
    lines.push("");
    lines.push("MEMORY — things this strategist has learned about the brand:");
    for (const m of b.memory.slice(-40)) {
      lines.push(`- [${m.kind}] ${m.text}`);
    }
  }
  return lines.join("\n");
}

function captionLengthHint(type: PostType): string {
  switch (type) {
    case "Still Image": return "2-4 short sentences. Hook in the first line.";
    case "Carousel": return "Caption summarizes the carousel + invites swiping.";
    case "Story": return "Single line, super punchy, under 90 characters.";
    case "Short-form Video": return "Tight 2-line hook + 1 line CTA.";
    case "Blog Post": return "60-90 word teaser. Full markdown article in the body (400-700 words, with H2 headings).";
    case "Email": return "Subject line as the caption. Full markdown email in body (180-320 words).";
  }
}

async function generateCopy(
  brand: BrandContext,
  type: PostType,
  topicHint?: string,
  campaignName?: string,
): Promise<{ copy: Copy; source: "openai" | "mock" }> {
  const lang = brand.language || brand.contentPrefs?.languages?.[0] || "Arabic";
  const userPrompt = [
    `Create ONE ${type} post for this brand.`,
    "",
    "BRAND CONTEXT",
    describeBrand(brand),
    "",
    campaignName ? `This belongs to the campaign: "${campaignName}".` : "",
    topicHint ? `Topic direction: ${topicHint}` : "Pick a fresh, on-brand topic the audience will actually care about this week.",
    "",
    `Write the caption in ${lang}. Length: ${captionLengthHint(type)}`,
    "",
    "Return strict JSON matching the schema. The imagePrompt MUST be in English regardless of caption language.",
  ].filter(Boolean).join("\n");

  const result = await generate<Copy>({
    schemaName: "post_copy",
    jsonSchema: COPY_JSON_SCHEMA,
    validator: CopySchema,
    system: SAUDI_MARKETING_CONTEXT,
    user: userPrompt,
    tier: "smart",
    maxTokens: type === "Blog Post" ? 1500 : 700,
    mock: () => mockCopy(brand, type, topicHint),
  });
  return { copy: result.data, source: result.source };
}

function mockCopy(brand: BrandContext, type: PostType, topicHint?: string): Copy {
  const t = topicHint || `${brand.businessName} weekly update`;
  return {
    topic: t,
    caption: `${t} — ${brand.businessName}. Crafted for ${brand.contentPrefs?.languages?.[0] || "your"} audience.`,
    body: type === "Blog Post"
      ? `## ${t}\n\nThis post would walk readers through ${t.toLowerCase()} step by step — built around ${brand.businessName}'s positioning.`
      : "",
    hashtags: type === "Email" || type === "Blog Post" ? [] : [brand.businessName.replace(/\s+/g, ""), "Saudi", "Marketing"],
    imagePrompt: `Editorial brand photograph for ${brand.businessName}, ${type.toLowerCase()} format, warm natural light, modern Saudi aesthetic, on-brand color palette.`,
  };
}

// ---------------------------------------------------------------------------
// 2) Image part — OpenAI Images (gpt-image-1)
// ---------------------------------------------------------------------------

let imageClient: OpenAI | null = null;
function imgClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!imageClient) imageClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 0 });
  return imageClient;
}

function imageSizeFor(type: PostType): "1024x1024" | "1024x1536" | "1536x1024" {
  if (type === "Story" || type === "Short-form Video") return "1024x1536";
  if (type === "Blog Post" || type === "Email") return "1536x1024";
  return "1024x1024";
}

function brandStyleSuffix(b: BrandContext): string {
  const bits: string[] = [];
  if (b.brandKit?.primaryColor) bits.push(`incorporate brand color ${b.brandKit.primaryColor}`);
  if (b.brandKit?.secondaryColor) bits.push(`accent ${b.brandKit.secondaryColor}`);
  if (b.contentPrefs?.mode === "strict") bits.push("strict brand control — minimal stylistic embellishment");
  if (b.contentPrefs?.mode === "growth") bits.push("polished, scroll-stopping commercial photography");
  bits.push("respectful of Saudi cultural and religious norms, no text overlays unless naturally integrated");
  return bits.length ? ` Style: ${bits.join("; ")}.` : "";
}

/** One generated frame: either provider base64/url, or a remote placeholder. */
interface ImageItem {
  b64?: string;
  url?: string;
}

function placeholderFrames(brand: BrandContext, type: PostType, count: number): ImageItem[] {
  // picsum.photos is a live, deterministic placeholder service (the old
  // source.unsplash.com/featured endpoint was retired and now fails).
  const base = encodeURIComponent(`${brand.businessName}-${type}`).replace(/%/g, "").slice(0, 40);
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${base}-${i}/1024/1024`,
  }));
}

async function generateImage(
  prompt: string,
  type: PostType,
  brand: BrandContext,
  count = 1,
): Promise<{ items: ImageItem[]; source: "openai" | "mock" }> {
  const api = imgClient();
  const fullPrompt = `${prompt}${brandStyleSuffix(brand)}`;
  if (!api) {
    return { items: placeholderFrames(brand, type, count), source: "mock" };
  }
  try {
    const res = await api.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: fullPrompt,
      size: imageSizeFor(type),
      n: count,
    });
    const items = (res.data ?? [])
      .map((d): ImageItem | null => (d.b64_json ? { b64: d.b64_json } : d.url ? { url: d.url } : null))
      .filter((x): x is ImageItem => Boolean(x));
    if (items.length === 0) throw new Error("Image API returned no images");
    return { items, source: "openai" };
  } catch (err) {
    console.error("[generate] image generation failed, falling back:", err);
    return { items: placeholderFrames(brand, type, count), source: "mock" };
  }
}

// ---------------------------------------------------------------------------
// 3) Public entry point — generate one full post
// ---------------------------------------------------------------------------

export interface GeneratePostOptions {
  userId: string;
  brand: BrandContext;
  type: PostType;
  topicHint?: string;
  campaignName?: string;
  scheduledFor: string;
  /** For Carousel / Short-form Video we may want multiple frames. */
  frames?: number;
}

// How many frames each post type gets. Short-form Video becomes a multi-frame
// branded slideshow (played in the UI) until a real video provider is wired in.
function frameCountFor(type: PostType, override?: number): number {
  if (override) return override;
  if (type === "Carousel") return 3;
  if (type === "Short-form Video") return 4;
  return 1;
}

export async function generateOnePost(opts: GeneratePostOptions): Promise<GeneratedPost> {
  const id = cryptoRandomId();
  const { copy } = await generateCopy(opts.brand, opts.type, opts.topicHint, opts.campaignName);

  const frames = frameCountFor(opts.type, opts.frames);
  const { items, source } = await generateImage(copy.imagePrompt, opts.type, opts.brand, frames);

  // Persist real (provider) images to disk and reference them by app URL so the
  // database never carries base64. Placeholder URLs are kept as-is (external).
  const imageUrls: string[] = [];
  for (const item of items) {
    if (source === "openai") {
      const localUrl = await persistGeneratedImage(opts.userId, id, item, opts.type);
      imageUrls.push(localUrl ?? item.url ?? "");
    } else {
      imageUrls.push(item.url ?? "");
    }
  }

  return {
    id,
    userId: opts.userId,
    type: opts.type,
    campaignName: opts.campaignName ?? "Untitled campaign",
    topic: copy.topic,
    caption: copy.caption,
    body: copy.body,
    hashtags: copy.hashtags,
    imageUrls: imageUrls.filter(Boolean),
    scheduledFor: opts.scheduledFor,
    status: "ready",
    createdAt: new Date().toISOString(),
  };
}

function cryptoRandomId(): string {
  // Node 18+ exposes globalThis.crypto.randomUUID
  // Use a fallback for safety.
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// 4) Weekly mix — generate a balanced week using the user's content prefs.
// ---------------------------------------------------------------------------

export function plannedTypesFromPrefs(prefs: ContentPreferences | null | undefined): PostType[] {
  // Sensible default mix when the user hasn't tuned preferences yet.
  const perWeek: Partial<Record<PostType, number>> = {
    "Still Image": 3,
    Carousel: 1,
    "Blog Post": 1,
    Email: 1,
  };
  // Light-touch personalization: more cadence -> more stills.
  const ppw = prefs?.postsPerWeek ?? 6;
  if (ppw && ppw > 6) perWeek["Still Image"] = Math.min(5, Math.floor(ppw - 3));
  const result: PostType[] = [];
  (Object.entries(perWeek) as [PostType, number][]).forEach(([t, n]) => {
    for (let i = 0; i < n; i++) result.push(t);
  });
  return result;
}

export function liveAi(): boolean {
  return isLiveAi();
}
