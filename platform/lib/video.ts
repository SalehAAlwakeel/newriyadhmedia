// ---------------------------------------------------------------------------

// Short-form video — Google Veo 3.1 via the Gemini API (direct, no fal.ai).

//

// Get a key: https://aistudio.google.com/apikey

// Set GEMINI_API_KEY in .env.local

//

// When GEMINI_API_KEY is missing, isLiveVideo() is false and the engine falls

// back to a multi-frame still slideshow.

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

  /** Local app path, remote URL, or data: URI for image-to-video. */

  imageUrl?: string;

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



async function imageInlineForVeo(

  src: string | undefined,

): Promise<{ inlineData: { mimeType: string; data: string } } | null> {

  if (!src) return null;



  if (src.startsWith("data:")) {

    const match = src.match(/^data:([^;]+);base64,(.+)$/);

    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };

  }



  const mediaMatch = src.match(/\/api\/media\/file\/([^?]+)/);

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

  if (resolution === "1080p" || resolution === "4k") return 8;

  return requested;

}



function extractVideoUri(out: unknown): string | null {

  if (!out || typeof out !== "object") return null;

  const o = out as Record<string, unknown>;

  const response = o.response as Record<string, unknown> | undefined;

  const gen = response?.generateVideoResponse as { generatedSamples?: Array<{ video?: { uri?: string } }> } | undefined;

  const fromSamples = gen?.generatedSamples?.[0]?.video?.uri;

  if (fromSamples) return fromSamples;



  const generatedVideos = response?.generatedVideos as Array<{ video?: { uri?: string } }> | undefined;

  if (generatedVideos?.[0]?.video?.uri) return generatedVideos[0].video!.uri!;



  return null;

}



/**

 * Generate a video with Google Veo 3.1 and return its download URI (and bytes

 * when the URI requires a Gemini API key to fetch).

 */

export async function generateVideo(input: VideoGenInput): Promise<VideoGenResult | null> {

  const key = geminiApiKey();

  if (!key) return null;



  const model = videoModelId();
  const imagePayload = await imageInlineForVeo(input.imageUrl);
  const instance: Record<string, unknown> = { prompt: input.prompt };
  // Must be nested under "image", not top-level inlineData (see Gemini Veo REST docs).
  if (imagePayload) instance.image = imagePayload;

  const resolution = process.env.GOOGLE_VEO_RESOLUTION || "1080p";
  const durationSeconds = veoDurationSeconds(input);

  const body = {
    instances: [instance],
    parameters: {
      aspectRatio: input.aspectRatio ?? "9:16",
      durationSeconds,
      resolution,
    },
  };

  const headers = {
    "x-goog-api-key": key,
    "Content-Type": "application/json",
  };

  try {
    let submit = await fetch(`${GEMINI_BASE}/models/${model}:predictLongRunning`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    // If image-to-video payload is rejected, retry text-to-video only.
    if (!submit.ok && imagePayload) {
      const errText = await submit.text().catch(() => "");
      if (errText.includes("inlineData") || errText.includes("image")) {
        console.warn("[video] Veo i2v rejected, retrying text-to-video only");
        const textOnly = {
          instances: [{ prompt: input.prompt }],
          parameters: body.parameters,
        };
        submit = await fetch(`${GEMINI_BASE}/models/${model}:predictLongRunning`, {
          method: "POST",
          headers,
          body: JSON.stringify(textOnly),
          signal: AbortSignal.timeout(60_000),
        });
      } else {
        console.error(`[video] Veo submit failed (${model}):`, submit.status, errText);
        return null;
      }
    }

    if (!submit.ok) {
      const errText = await submit.text().catch(() => "");
      console.error(`[video] Veo submit failed (${model}):`, submit.status, errText);
      return null;
    }



    const queued = (await submit.json()) as { name?: string; error?: { message?: string } };

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


