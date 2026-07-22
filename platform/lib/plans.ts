/** Subscription plans — single source of truth for pricing, credits, and Moyasar amounts. */

export type PlanId = "starter" | "growth" | "scale";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** Amount in halalas (1 SAR = 100 halalas). 0 = contact sales. */
  amountHalalas: number;
  monthlyCredits: number;
  blurb: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "SAR 499",
    amountHalalas: 49_900,
    monthlyCredits: 300,
    blurb: "For solo founders and small brands getting started.",
    features: [
      "1 brand workspace",
      "3 connected channels",
      "300 credits / mo",
      "AI strategist + content studio",
      "Weekly insights",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceLabel: "SAR 1,299",
    amountHalalas: 129_900,
    monthlyCredits: 1_200,
    blurb: "For growing businesses posting across every channel.",
    features: [
      "3 brand workspaces",
      "Unlimited channels",
      "1,200 credits / mo",
      "Approvals & scheduling",
      "SEO + learning engine",
      "Priority generation",
    ],
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    priceLabel: "Let's talk",
    amountHalalas: 0,
    monthlyCredits: 0,
    blurb: "For agencies and multi-brand operators.",
    features: [
      "Unlimited workspaces",
      "Team roles & approvals",
      "Custom credit volume",
      "Dedicated strategist",
      "API & integrations",
    ],
  },
];

export function planById(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function creditsForPlan(plan: PlanId): number {
  return planById(plan)?.monthlyCredits ?? 0;
}
