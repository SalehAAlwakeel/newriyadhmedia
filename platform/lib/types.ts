// Shared types for the AI marketing test flow.
// The client carries the accumulated context and passes the relevant slice
// to each API step, so the backend stays (mostly) stateless.

export interface BusinessProfile {
  businessName: string;
  elevatorPitch: string;
  logoUrl: string | null;
  detectedLanguage: string; // human-readable, e.g. "English" or "Arabic"
  sourceUrl: string;
}

export interface AudienceInput {
  audience: string; // who the business serves
  adFaces: string; // who should appear in the ads
  language: string; // primary language for the campaign
}

export interface PositioningResult {
  positioning: string;
  recommendedStrategyId: StrategyId;
}

export type StrategyId =
  | "authority"
  | "performance"
  | "community"
  | "launch"
  | "education";

export interface Strategy {
  id: StrategyId;
  title: string;
  tagline: string;
  description: string;
}

export interface Campaign {
  name: string;
  theme: string;
  callToAction: string;
  targetLink: string;
}

export type ChannelId =
  | "instagram"
  | "linkedin"
  | "x"
  | "google_business"
  | "tiktok"
  | "youtube"
  | "newsletter"
  | "blog";

export interface Channel {
  id: ChannelId;
  label: string;
}

export type Cadence = "light" | "steady" | "aggressive";

export interface CampaignWeek {
  weekNumber: number;
  name: string;
  description: string;
}

export interface CampaignPlan {
  weeks: CampaignWeek[];
}

// The full result we persist when a visitor opts in with their email.
export interface TestResult {
  profile: BusinessProfile;
  audience: AudienceInput;
  positioning: string;
  strategyId: StrategyId;
  campaign: Campaign;
  channels: ChannelId[];
  cadence: Cadence;
  plan: CampaignPlan;
}
