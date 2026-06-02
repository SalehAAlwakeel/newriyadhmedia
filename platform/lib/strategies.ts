import type { Strategy, Channel, ChannelId, Cadence } from "./types";

// The 5 core strategic directions the test offers. The AI recommends the
// best-fit (recommendedStrategyId) but the visitor always makes the final call.
export const STRATEGIES: Strategy[] = [
  {
    id: "authority",
    title: "Authority & Thought Leadership",
    tagline: "Become the name people trust.",
    description:
      "Position the brand as the expert in its category through insight-led content, points of view and credibility signals.",
  },
  {
    id: "performance",
    title: "Performance & Direct Response",
    tagline: "Turn attention into action.",
    description:
      "Conversion-first messaging built around clear offers, strong CTAs and measurable outcomes — leads, sign-ups, sales.",
  },
  {
    id: "community",
    title: "Community & Brand Building",
    tagline: "Grow a following that grows you.",
    description:
      "Build an engaged audience through story, culture and consistent presence that compounds over time.",
  },
  {
    id: "launch",
    title: "Launch & Momentum",
    tagline: "Make a moment people can't ignore.",
    description:
      "Concentrated, high-energy push around a product, opening or season — built to create buzz and urgency.",
  },
  {
    id: "education",
    title: "Education-Led Growth",
    tagline: "Teach first, sell second.",
    description:
      "Win trust by helping. How-to content, explainers and guides that pull in the right audience and warm them up.",
  },
];

export const STRATEGY_IDS = STRATEGIES.map((s) => s.id);

export const CHANNELS: Channel[] = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "google_business", label: "Google Business Profile" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "newsletter", label: "Newsletter" },
  { id: "blog", label: "Blog" },
];

export const CHANNEL_IDS = CHANNELS.map((c) => c.id);

export function channelLabel(id: ChannelId): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? id;
}

export const CADENCES: { id: Cadence; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "A few posts a week — sustainable for a small team." },
  { id: "steady", label: "Steady", hint: "Near-daily presence across your channels." },
  { id: "aggressive", label: "Aggressive", hint: "Multiple posts a day — maximum momentum." },
];
