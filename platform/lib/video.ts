// ---------------------------------------------------------------------------
// Short-form video — Google Veo 3.1 via the Gemini API (direct, no fal.ai).
//
// Get a key: https://aistudio.google.com/apikey
// Set GEMINI_API_KEY in .env.local
//
// When GEMINI_API_KEY is missing, isLiveVideo() is false and the engine falls
// back to a multi-frame still slideshow.
//
// Product/logo fidelity: pass brand assets via `referenceImageUrls` (Veo 3.1
// "Ingredients to Video" / referenceType "asset") so the model keeps the
// exact same product and logo — not a reinvented lookalike.
// ---------------------------------------------------------------------------

import { promises as fs } from "fs";
import path from "path";
import { getMedia } from "./db";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
const DEFAULT_VEO_MODEL = "veo-3.1-generate-preview";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function isLiveVideo(): boolean {
  return Boolean(geminiApiKey());
}

export function videoModelId(): string {
  return process.env.GOOGLE_VEO_MODEL || DEFAULT_VEO_MODEL;
}

export interface VideoGenInput {
  prompt: string;
  /** Local app path, remote URL, or data: URI for image-to-video (first frame). */
  imageUrl?: string;
  /**
   * Up to 3 brand/product/logo images used as Veo "asset" references so the
   * generated clip preserves the exact subject identity.
   */
  referenceImageUrls?: string[];
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSeconds?: number;
  generateAudio?: boolean;
}

export interface VideoGenResult {
  url: string;
  /** Pre-downloaded when the provider requires an API key to fetch the file. */
  bytes?: Buffer;
  mime?: string;
}

type InlineImage = { inlineData: { mimeType: string; data: string } };

async function imageInlineForVeo(src: string | undefined): Promise<InlineImage | null> {
  if (!src) return null;

  if (src.startsWith("data:")) {
    const match = src.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
  }

  const mediaMatch = src.match(/\/api\/media\/file\/([^?/]+)/);
  if (mediaMatch) {
    const asset = await getMedia(mediaMatch[1]);
    if (asset) {
      try {
        const dir = path.join(UPLOADS_DIR, asset.userId);
        const files = await fs.readdir(dir);
        const file = files.find((f) => f.startsWith(`${asset.id}.`));
        if (file) {
          const bytes = await fs.readFile(path.join(dir, file));
          return {
            inlineData: {
              mimeType: asset.mime || "image/jpeg",
              data: bytes.toString("base64"),
            },
          };
        }
      } catch {
        /* fall through */
      }
    }
  }

  let fetchUrl = src;
  if (src.startsWith("/")) {
    const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    fetchUrl = `${base}${src}`;
  }

  if (fetchUrl.startsWith("http")) {
    try {
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) return null;
      const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const bytes = Buffer.from(await res.arrayBuffer());
      return { inlineData: { mimeType: mime, data: bytes.toString("base64") } };
    } catch {
      return null;
    }
  }

  return null;
}

function veoDurationSeconds(input: VideoGenInput): number {
  const requested = input.durationSeconds ?? 8;
  const resolution = (process.env.GOOGLE_VEO_RESOLUTION || "1080p").toLowerCase();
  // 1080p / 4K Veo currently locks to 8s on the Gemini API.
  if (resolution === "1080p" || resolution === "4k") return 8;
  return requested;
}

function extractVideoUri(out: unknown): string | null {
  if (!out || typeof out !== "object") return null;
  const o = out as Record<string, unknown>;
  const response = o.response as Record<string, unknown> | undefined;
  const gen = response?.generateVideoResponse as {
    generatedSamples?: Array<{ video?: { uri?: string } }>;
  } | undefined;
  const fromSamples = gen?.generatedSamples?.[0]?.video?.uri;
  if (fromSamples) return fromSamples;

  const generatedVideos = response?.generatedVideos as Array<{ video?: { uri?: string } }> | undefined;
  if (generatedVideos?.[0]?.video?.uri) return generatedVideos[0].video!.uri!;

  return null;
}

async function buildVeoInstance(input: VideoGenInput): Promise<{
  instance: Record<string, unknown>;
  hasImage: boolean;
  hasReferences: boolean;
}> {
  const instance: Record<string, unknown> = { prompt: input.prompt };

  const refs = (input.referenceImageUrls ?? []).filter(Boolean).slice(0, 3);
  const referenceImages: Array<{ image: InlineImage; referenceType: "asset" }> = [];
  for (const url of refs) {
    const inline = await imageInlineForVeo(url);
    if (inline) referenceImages.push({ image: inline, referenceType: "asset" });
  }
  if (referenceImages.length) {
    instance.referenceImages = referenceImages;
  }

  // First-frame image-to-video. Prefer an explicit frame; otherwise use the
  // primary brand asset when we only have a single reference.
  let imagePayload: InlineImage | null = null;
  if (input.imageUrl) {
    imagePayload = await imageInlineForVeo(input.imageUrl);
  } else if (referenceImages.length === 1) {
    // Single product/logo → also seed as first frame for stronger lock.
    imagePayload = referenceImages[0].image;
  }
  if (imagePayload) {
    instance.image = imagePayload;
  }

  return {
    instance,
    hasImage: Boolean(imagePayload),
    hasReferences: referenceImages.length > 0,
  };
}

/**
 * Generate a video with Google Veo 3.1 and return its download URI (and bytes
 * when the URI requires a Gemini API key to fetch).
 */
export async function generateVideo(input: VideoGenInput): Promise<VideoGenResult | null> {
  const key = geminiApiKey();
  if (!key) return null;

  const model = videoModelId();
  const { instance, hasImage, hasReferences } = await buildVeoInstance(input);

  if (!hasImage && !hasReferences) {
    console.warn("[video] No brand image/logo resolved — generating text-to-video only (product lock unavailable).");
  } else if (hasReferences) {
    console.info(`[video] Veo using ${Array.isArray(instance.referenceImages) ? (instance.referenceImages as unknown[]).length : 0} asset reference(s) for product/logo lock`);
  }

  const resolution = process.env.GOOGLE_VEO_RESOLUTION || "1080p";
  const durationSeconds = veoDurationSeconds(input);

  const parameters = {
    aspectRatio: input.aspectRatio ?? "9:16",
    durationSeconds,
    resolution,
  };

  const headers = {
    "x-goog-api-key": key,
    "Content-Type": "application/json",
  };

  async function submit(body: unknown) {
    return fetch(`${GEMINI_BASE}/models/${model}:predictLongRunning`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  }

  try {
    // Prefer: references (+ optional first frame) → first-frame only → text only.
    const attempts: Array<{ label: string; instances: Record<string, unknown>[] }> = [
      { label: "full", instances: [instance] },
    ];

    if (hasImage && hasReferences) {
      // Some payloads reject combining image + referenceImages — retry refs only.
      const refsOnly = { ...instance };
      delete refsOnly.image;
      attempts.push({ label: "references-only", instances: [refsOnly] });
    }
    if (hasImage) {
      const imageOnly: Record<string, unknown> = { prompt: input.prompt, image: instance.image };
      attempts.push({ label: "image-only", instances: [imageOnly] });
    }
    attempts.push({ label: "text-only", instances: [{ prompt: input.prompt }] });

    let submitRes: Response | null = null;
    let usedLabel = "full";

    for (const attempt of attempts) {
      const res = await submit({ instances: attempt.instances, parameters });
      if (res.ok) {
        submitRes = res;
        usedLabel = attempt.label;
        break;
      }
      const errText = await res.text().catch(() => "");
      console.warn(`[video] Veo submit (${attempt.label}) failed:`, res.status, errText.slice(0, 400));
      // Only continue to a weaker attempt when the payload shape was rejected.
      const payloadIssue =
        errText.includes("inlineData") ||
        errText.includes("image") ||
        errText.includes("reference") ||
        errText.includes("INVALID_ARGUMENT");
      if (!payloadIssue) {
        console.error(`[video] Veo submit failed (${model}):`, res.status, errText);
        return null;
      }
    }

    if (!submitRes) {
      console.error(`[video] Veo submit failed (${model}): all attempts exhausted`);
      return null;
    }

    if (usedLabel !== "full") {
      console.warn(`[video] Veo fell back to ${usedLabel} payload`);
    }

    const queued = (await submitRes.json()) as { name?: string; error?: { message?: string } };
    if (!queued.name) {
      console.error("[video] Veo submit missing operation name:", queued.error?.message ?? queued);
      return null;
    }

    const deadline = Date.now() + 300_000;
    let done = false;
    let lastStatus: unknown = null;

    while (Date.now() < deadline) {
      await sleep(10_000);
      const st = await fetch(`${GEMINI_BASE}/${queued.name}`, { headers: { "x-goog-api-key": key } });
      if (!st.ok) continue;
      lastStatus = await st.json();
      const status = lastStatus as { done?: boolean; error?: { message?: string } };
      if (status.error) {
        console.error("[video] Veo operation error:", status.error.message ?? status.error);
        return null;
      }
      if (status.done) {
        done = true;
        break;
      }
    }

    if (!done) {
      console.error("[video] Veo timed out waiting for operation:", queued.name);
      return null;
    }

    const videoUri = extractVideoUri(lastStatus);
    if (!videoUri) {
      console.error("[video] Veo completed but no video URI in response");
      return null;
    }

    const dl = await fetch(videoUri, {
      headers: { "x-goog-api-key": key },
      redirect: "follow",
      signal: AbortSignal.timeout(180_000),
    });
    if (!dl.ok) {
      console.error("[video] Veo download failed:", dl.status);
      return { url: videoUri };
    }

    const mime = dl.headers.get("content-type")?.split(";")[0] || "video/mp4";
    const bytes = Buffer.from(await dl.arrayBuffer());
    return { url: videoUri, bytes, mime };
  } catch (err) {
    console.error("[video] Veo generation error:", err);
    return null;
  }
}
