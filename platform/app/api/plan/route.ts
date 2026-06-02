import { NextResponse } from "next/server";
import { PlanRequest, generatePlan } from "@/lib/aiSteps";
import { guard, logStep } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const started = Date.now();
  const g = await guard(req, PlanRequest);
  if (!g.ok) return g.response;

  const result = await generatePlan(g.body);
  logStep("plan", result.source, Date.now() - started, result.usage);

  return NextResponse.json({ ...result.data, source: result.source });
}
