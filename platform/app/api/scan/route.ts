import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeSite, normalizeUrl, ScrapeError, type ScrapedSite } from "@/lib/scrape";
import { analyzeBusiness } from "@/lib/aiSteps";
import { checkLimits, clientIp, cacheGet, cacheSet } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ url: z.string().min(1).max(300) });

export async function POST(req: Request) {
  const started = Date.now();
  const ip = clientIp(req.headers);

  const limit = await checkLimits(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.reason === "daily" ? "We've hit today's test capacity. Please try again tomorrow." : "Too many requests — slow down a moment and try again." },
      { status: 429 }
    );
  }

  let parsed: { url: string };
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Please provide a website address." }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(parsed.url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof ScrapeError ? err.message : "Invalid website address." },
      { status: 400 }
    );
  }

  const domain = new URL(normalized).hostname.replace(/^www\./, "");

  // Serve cached scan (by domain) when available — cuts cost + latency.
  const cached = await cacheGet(domain);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      return NextResponse.json({ ...data, cached: true });
    } catch {
      /* fall through to fresh scan */
    }
  }

  let site: ScrapedSite;
  try {
    site = await scrapeSite(normalized);
  } catch (err) {
    const message = err instanceof ScrapeError ? err.message : "We couldn't read that site. You can fill the details in manually.";
    return NextResponse.json({ error: message, manual: true }, { status: 200 });
  }

  const result = await analyzeBusiness(site);

  const payload = {
    profile: result.data,
    source: result.source,
  };

  await cacheSet(domain, JSON.stringify(payload));

  console.log(
    `[scan] ${domain} source=${result.source} ${Date.now() - started}ms` +
      (result.usage ? ` tokens=${result.usage.promptTokens}+${result.usage.completionTokens}` : "")
  );

  return NextResponse.json(payload);
}
