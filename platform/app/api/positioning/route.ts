import { NextResponse } from "next/server";
import { PositioningRequest, generatePositioning } from "@/lib/aiSteps";
import { guard, logStep } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  const g = await guard(req, PositioningRequest);
  if (!g.ok) return g.response;

  const result = await generatePositioning(g.body);
  logStep("positioning", result.source, Date.now() - started, result.usage);

  return NextResponse.json({ ...result.data, source: result.source });
}
