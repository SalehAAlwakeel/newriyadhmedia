import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeSite, normalizeUrl, ScrapeError, type ScrapedSite } from "@/lib/scrape";
import { runDiagnostic } from "@/lib/diagnosticSteps";
import { checkLimits, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ url: z.string().min(1).max(300) });

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = await checkLimits(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let parsed: { url: string };
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
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

  let site: ScrapedSite;
  try {
    site = await scrapeSite(normalized);
  } catch (err) {
    const message = err instanceof ScrapeError ? err.message : "We couldn't read that site. Please check the URL and try again.";
    return NextResponse.json({ error: message, manual: true }, { status: 200 });
  }

  const result = await runDiagnostic(site);

  return NextResponse.json({
    diagnostic: result.data,
    source: result.source,
    site: {
      url: site.url,
      title: site.title,
      domain: site.domain,
      logoUrl: site.logoUrl,
    },
  });
}
