import * as cheerio from "cheerio";

// --------------------------------------------------------------------------
// Lightweight, server-side website scanner.
//
// Fetches the target URL, extracts the signals an LLM needs to describe the
// business (title, meta, headings, visible text) plus the best-guess logo
// (og:image -> apple-touch-icon -> icon -> /favicon.ico).
//
// It is intentionally forgiving: JS-only sites or blocked fetches surface a
// `ScrapeError` so the UI can let the visitor fill the fields in by hand.
// --------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_TEXT_CHARS = 6_000;

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}

export interface ScrapedSite {
  url: string;
  domain: string;
  title: string;
  siteName: string;
  description: string;
  headings: string[];
  text: string;
  logoUrl: string | null;
  langHint: string | null;
}

/** Adds https:// if missing and validates the URL shape. */
export function normalizeUrl(input: string): string {
  let raw = (input || "").trim();
  if (!raw) throw new ScrapeError("Please enter a website address.");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ScrapeError("That doesn't look like a valid website address.");
  }
  if (!parsed.hostname.includes(".")) {
    throw new ScrapeError("That doesn't look like a valid website address.");
  }
  return parsed.toString();
}

function abs(base: string, maybeRelative: string | undefined): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function pickLogo($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const candidates = [
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="apple-touch-icon-precomposed"]').attr("href"),
    $('link[rel="icon"]').attr("href"),
    $('link[rel="shortcut icon"]').attr("href"),
  ];
  for (const c of candidates) {
    const resolved = abs(baseUrl, c);
    if (resolved) return resolved;
  }
  // Last resort: conventional favicon location.
  return abs(baseUrl, "/favicon.ico");
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const normalized = normalizeUrl(url);
  const domain = new URL(normalized).hostname.replace(/^www\./, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(normalized, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Pretend to be a normal browser so we aren't trivially blocked.
        "User-Agent":
          "Mozilla/5.0 (compatible; NRMMarketingBot/1.0; +https://newriyadhmedia.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScrapeError("That site took too long to respond. Try another, or fill the details in manually.");
    }
    throw new ScrapeError("We couldn't reach that site. Check the address, or fill the details in manually.");
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new ScrapeError(`That site returned an error (${res.status}). You can fill the details in manually.`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("html")) {
    throw new ScrapeError("That address didn't return a web page. You can fill the details in manually.");
  }

  // Cap how much we read to keep memory + cost bounded.
  const buf = await res.arrayBuffer();
  const html = Buffer.from(buf.slice(0, MAX_HTML_BYTES)).toString("utf8");

  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, template").remove();

  const title = ($("title").first().text() || "").trim();
  const siteName = ($('meta[property="og:site_name"]').attr("content") || "").trim();
  const description = (
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  ).trim();

  const headings: string[] = [];
  $("h1, h2").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && headings.length < 12) headings.push(t);
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const text = bodyText.slice(0, MAX_TEXT_CHARS);

  const logoUrl = pickLogo($, normalized);
  const langHint = $("html").attr("lang") || null;

  // If we got essentially nothing useful, treat it as a JS-only / empty page.
  if (!title && !description && headings.length === 0 && text.length < 40) {
    throw new ScrapeError(
      "We couldn't read much from that site (it may rely on JavaScript). You can fill the details in manually."
    );
  }

  return { url: normalized, domain, title, siteName, description, headings, text, logoUrl, langHint };
}

/** Compact, token-efficient summary of a scrape for the LLM prompt. */
export function scrapeToPrompt(site: ScrapedSite): string {
  return [
    `URL: ${site.url}`,
    site.siteName ? `Site name: ${site.siteName}` : "",
    site.title ? `Page title: ${site.title}` : "",
    site.description ? `Meta description: ${site.description}` : "",
    site.langHint ? `HTML lang attribute: ${site.langHint}` : "",
    site.headings.length ? `Headings: ${site.headings.join(" | ")}` : "",
    site.text ? `Visible text (truncated): ${site.text}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
