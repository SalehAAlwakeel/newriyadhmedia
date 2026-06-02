import { NextResponse } from "next/server";
import { CampaignRequest, generateCampaign } from "@/lib/aiSteps";
import { guard, logStep } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  const g = await guard(req, CampaignRequest);
  if (!g.ok) return g.response;

  const result = await generateCampaign(g.body);
  logStep("campaign", result.source, Date.now() - started, result.usage);

  return NextResponse.json({ ...result.data, source: result.source });
}
