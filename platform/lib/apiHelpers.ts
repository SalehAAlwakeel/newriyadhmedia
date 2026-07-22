import { NextResponse } from "next/server";
import type { z } from "zod";
import { checkLimits, clientIp } from "./ratelimit";

export interface Guarded<T> {
  ok: true;
  body: T;
  ip: string;
}
export type GuardResult<T> = Guarded<T> | { ok: false; response: NextResponse };

/** Rate-limit + parse + validate a JSON request body in one shot. */
export async function guard<T>(req: Request, schema: z.ZodType<T>): Promise<GuardResult<T>> {
  const ip = clientIp(req.headers);

  const limit = await checkLimits(ip);
  if (!limit.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            limit.reason === "daily"
              ? "We've hit today's test capacity. Please try again tomorrow."
              : "Too many requests — slow down a moment and try again.",
        },
        { status: 429 }
      ),
    };
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Some required details are missing. Please complete the previous step." },
        { status: 400 }
      ),
    };
  }

  return { ok: true, body: parsed.data, ip };
}

export function logStep(name: string, source: string, ms: number, usage?: { promptTokens: number; completionTokens: number } | null) {
  if (process.env.NODE_ENV === "production") return;
  console.log(
    `[${name}] source=${source} ${ms}ms` +
      (usage ? ` tokens=${usage.promptTokens}+${usage.completionTokens}` : "")
  );
}
