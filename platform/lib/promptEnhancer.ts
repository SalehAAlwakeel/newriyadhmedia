import { z } from "zod";
import { generate } from "./llm";
import type { BrandKit } from "./db";

export type EnhanceKind = "image" | "video";

export interface EnhanceInput {
  rawPrompt: string;
  kind: EnhanceKind;
  brandKit?: BrandKit | null;
  postType?: string;
}

const SYSTEM = `You are a world-class creative director and prompt engineer for production AI image models (GPT Image 2, FLUX, Veo).
Turn the client's rough idea into one elite, generation-ready English prompt that will produce premium branded social content.

Rules:
- Output ONLY the prompt text — no preamble, quotes, labels, or markdown.
- Be specific and visual: subject, wardrobe/materials, composition, framing, depth of field, lighting quality, color grade, environment, atmosphere, era/mood.
- For images: photorealistic or high-end editorial; specify lens feel (e.g. 85mm portrait, 35mm environmental). Optimized for GPT Image 2 output. No text overlays, watermarks, or logos unless explicitly requested.
- For video: describe subject motion, camera movement (dolly, orbit, handheld, slow push), pacing (~8s), vertical 9:16 social format; no on-screen captions or dialogue.
- Weave brand colors naturally into palette, props, or lighting — never as flat color swatches.
- If the input is Arabic or mixed language, understand intent fully and output the prompt in English.
- Avoid vague adjectives ("beautiful", "stunning") — replace with concrete visual direction.
- Keep under 450 words.`;

function brandHints(kit?: BrandKit | null): string {
  if (!kit) return "";
  const parts: string[] = [];
  if (kit.primaryColor) parts.push(`primary brand color ${kit.primaryColor}`);
  if (kit.secondaryColor) parts.push(`accent ${kit.secondaryColor}`);
  if (kit.voice) parts.push(`brand voice: ${kit.voice}`);
  if (kit.audience) parts.push(`audience: ${kit.audience}`);
  return parts.length ? `\nBrand context: ${parts.join("; ")}.` : "";
}

/**
 * Silently rewrite a client's rough prompt into a professional generation prompt.
 * Falls back to the original on any failure.
 */
export async function enhancePrompt(input: EnhanceInput): Promise<string> {
  const raw = input.rawPrompt?.trim();
  if (!raw || raw.length < 8) return raw || "";

  try {
    const result = await generate({
      schemaName: "enhanced_prompt",
      jsonSchema: {
        type: "object",
        properties: { prompt: { type: "string" } },
        required: ["prompt"],
        additionalProperties: false,
      },
      validator: z.object({ prompt: z.string() }),
      system: SYSTEM,
      user: [
        `Media type: ${input.kind === "video" ? "short-form branded video" : "social still image"}.`,
        input.postType ? `Post format: ${input.postType}.` : "",
        brandHints(input.brandKit),
        `\nClient's idea:\n${raw}`,
      ]
        .filter(Boolean)
        .join("\n"),
      tier: "enhance",
      maxTokens: 900,
      mock: () => ({ prompt: raw }),
    });
    const enhanced = result.data.prompt?.trim();
    return enhanced && enhanced.length > 20 ? enhanced : raw;
  } catch (err) {
    console.error("[promptEnhancer] failed, using raw:", err);
    return raw;
  }
}
