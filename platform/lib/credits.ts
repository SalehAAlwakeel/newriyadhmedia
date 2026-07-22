import type { PostType } from "./db";

// ---------------------------------------------------------------------------
// Generation credit costs — aligned with real AI provider pricing (~3× margin).
//
// Cost basis (approx, USD → SAR @ 3.75):
//   gpt-4.1 text/caption     ~$0.01–0.04  → bundled into post cost
//   GPT Image 2 still      ~$0.04–0.08/image → ~8 credits each
//   Veo 3.1 8s video (Gemini)  ~$0.50+       → ~55 credits
//
// Plan allowances (see lib/plans.ts):
//   Starter 300 credits  @ SAR 499  ≈ SAR 1.66/credit
//   Growth  1,200 credits @ SAR 1,299 ≈ SAR 1.08/credit
// ---------------------------------------------------------------------------

export const CREDIT_COST: Record<PostType, number> = {
  "Still Image": 8,
  Story: 8,
  Carousel: 15,
  Email: 10,
  "Blog Post": 18,
  "Short-form Video": 55,
};

/** Partial regeneration — text only (gpt-4.1-mini tier). */
export const REGENERATE_TEXT_COST = 3;

/** Partial regeneration — images only (FLUX). */
export const REGENERATE_IMAGE_COST: Record<PostType, number> = {
  "Still Image": 6,
  Story: 6,
  Carousel: 12,
  Email: 0,
  "Blog Post": 0,
  "Short-form Video": 40,
};

/** Logo generation via GPT Image 2 / FLUX. */
export const LOGO_GENERATION_COST = 8;

export const DEFAULT_CREDITS = 0;

export function costForType(type: PostType): number {
  return CREDIT_COST[type] ?? 8;
}

export function totalCost(types: PostType[]): number {
  return types.reduce((sum, t) => sum + costForType(t), 0);
}

export function regenerateCost(type: PostType, parts: { text?: boolean; images?: boolean }): number {
  let cost = 0;
  if (parts.text) cost += REGENERATE_TEXT_COST;
  if (parts.images) cost += REGENERATE_IMAGE_COST[type] ?? 6;
  return cost;
}
