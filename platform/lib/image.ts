// ---------------------------------------------------------------------------
// AI image generation — OpenAI GPT Image 2 by default; optional fal.ai FLUX.
//
// Set IMAGE_PROVIDER=fal to use FLUX (requires FAL_KEY).
// Default uses OPENAI_API_KEY + gpt-image-2.
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import type { PostType } from "./db";

const FAL_RUN = "https://fal.run";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_FAL_MODEL = "fal-ai/flux-pro/v1.1-ultra";

export type ImageProvider = "openai" | "fal";
export type ImageGenSource = "openai" | "flux" | "mock";

export function imageProvider(): ImageProvider {
  return process.env.IMAGE_PROVIDER?.toLowerCase() === "fal" ? "fal" : "openai";
}

export function isLiveImage(): boolean {
  if (imageProvider() === "fal") return Boolean(process.env.FAL_KEY);
  return Boolean(process.env.OPENAI_API_KEY);
}

export function falImageModel(): string {
  return process.env.FAL_IMAGE_MODEL || DEFAULT_FAL_MODEL;
}

export function openAiImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;
}

export type FluxImageSize = "square_hd" | "portrait_16_9" | "landscape_16_9";

export function imageSizeForPostType(type: PostType): FluxImageSize {
  if (type === "Story" || type === "Short-form Video") return "portrait_16_9";
  if (type === "Blog Post" || type === "Email") return "landscape_16_9";
  return "square_hd";
}

export interface FluxImageInput {
  prompt: string;
  count?: number;
  imageSize?: FluxImageSize;
}

export interface ImageGenResult {
  urls: string[];
  source: Exclude<ImageGenSource, "mock">;
}

let openAiImageClient: OpenAI | null = null;
function getOpenAiImageClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openAiImageClient) {
    openAiImageClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 180_000,
      maxRetries: 0,
    });
  }
  return openAiImageClient;
}

function openAiSizeFor(size: FluxImageSize): "1024x1024" | "1024x1536" | "1536x1024" {
  if (size === "portrait_16_9") return "1024x1536";
  if (size === "landscape_16_9") return "1536x1024";
  return "1024x1024";
}

function isUltraModel(model: string): boolean {
  return model.includes("ultra");
}

function aspectRatioForSize(size: FluxImageSize): string {
  if (size === "portrait_16_9") return "9:16";
  if (size === "landscape_16_9") return "16:9";
  return "1:1";
}

function buildFluxBody(model: string, input: FluxImageInput) {
  const count = Math.min(4, Math.max(1, input.count ?? 1));
  const size = input.imageSize ?? "square_hd";
  const base = {
    prompt: input.prompt,
    num_images: count,
    output_format: "jpeg",
    safety_tolerance: "2",
    enhance_prompt: false,
  };

  if (isUltraModel(model)) {
    return {
      ...base,
      aspect_ratio: aspectRatioForSize(size),
      raw: process.env.FAL_IMAGE_RAW !== "false",
    };
  }

  return { ...base, image_size: size };
}

function openAiImageQuality(): "standard" | "high" | "medium" | "low" | "auto" {
  const raw = (process.env.OPENAI_IMAGE_QUALITY || "high").toLowerCase();
  if (raw === "hd") return "high";
  if (raw === "standard" || raw === "high" || raw === "medium" || raw === "low" || raw === "auto") {
    return raw;
  }
  return "high";
}

function openAiUrlsFromResponse(data: OpenAI.Images.Image[] | undefined): string[] {
  const format = (process.env.OPENAI_IMAGE_FORMAT || "jpeg").toLowerCase();
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  return (data ?? [])
    .map((item) => {
      if (item.url) return item.url;
      if (item.b64_json) return `data:${mime};base64,${item.b64_json}`;
      return null;
    })
    .filter((u): u is string => Boolean(u));
}

async function generateOpenAiImages(input: FluxImageInput): Promise<ImageGenResult | null> {
  const client = getOpenAiImageClient();
  if (!client) return null;

  const count = Math.min(4, Math.max(1, input.count ?? 1));
  const size = openAiSizeFor(input.imageSize ?? "square_hd");

  try {
    const res = await client.images.generate({
      model: openAiImageModel(),
      prompt: input.prompt,
      n: count,
      size,
      quality: openAiImageQuality(),
    });
    const urls = openAiUrlsFromResponse(res.data);
    return urls.length ? { urls, source: "openai" } : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[image] ${openAiImageModel()} failed:`, msg);
    return null;
  }
}

async function generateFalImages(input: FluxImageInput): Promise<ImageGenResult | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;

  const model = falImageModel();

  try {
    const res = await fetch(`${FAL_RUN}/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildFluxBody(model, input)),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      console.error("[image] flux failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { images?: { url?: string }[] };
    const urls = (data.images ?? []).map((i) => i.url).filter((u): u is string => Boolean(u));
    return urls.length ? { urls, source: "flux" } : null;
  } catch (err) {
    console.error("[image] flux error:", err);
    return null;
  }
}

/**
 * Generate one or more images and return remote URLs.
 * Returns null on any failure so callers can fall back gracefully.
 */
export async function generateFluxImages(input: FluxImageInput): Promise<ImageGenResult | null> {
  if (imageProvider() === "fal") return generateFalImages(input);
  return generateOpenAiImages(input);
}
