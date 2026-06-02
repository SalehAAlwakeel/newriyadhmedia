# New Riyadh Media — AI Marketing Test (platform)

The free, no-login **AI marketing test**: a visitor plugs in their website and walks through a
guided flow that scans the site, drafts a positioning, lets them pick a strategy and channels,
and writes a named **4-week campaign**. It is the front door to — and foundation of — the full
New Riyadh Media credit-based SaaS.

Built with **Next.js (App Router) + TypeScript**, styled to match the marketing site (warm cream
+ ink, Cormorant Garamond + Inter).

> The test only **reads** and displays the scanned logo and **generates text**. Image/video
> generation and social auto-posting are reserved for the full platform.

## Quick start

```bash
cd platform
cp .env.example .env.local   # optional — runs in MOCK mode without a key
npm install
npm run dev                  # http://localhost:3000  (try the flow at /try)
```

With **no `OPENAI_API_KEY`**, every AI step returns realistic **mock** output so you can build and
demo the entire flow for free. Add a key to generate real, tailored copy.

## The flow

`/try` → scan website → review business profile → audience questions → AI positioning →
pick 1 of 5 strategies → AI campaign (name / theme / CTA / target link) → pick channels + cadence →
AI 4-week plan → results + email capture.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/scan` | Fetch + parse the site, return business name, pitch, logo, language |
| `POST /api/positioning` | Positioning statement + best-fit strategy |
| `POST /api/campaign` | Campaign name, theme, CTA, target link |
| `POST /api/plan` | 4-week rollout |
| `POST /api/lead` | Save result + email (lead capture) |

## Architecture & reliability

- **Structured Outputs** (`response_format: json_schema`, `strict: true`) + Zod validation + one
  retry, with a graceful **mock fallback** so a provider hiccup never breaks the flow. See
  [`lib/llm.ts`](lib/llm.ts).
- **Provider-swappable**: the `generate()` surface is generic; drop in Claude/Gemini later.
- **Rate limiting** per IP + a **global daily cap**, and **scan caching by domain** — Upstash Redis
  when configured, in-memory fallback otherwise. See [`lib/ratelimit.ts`](lib/ratelimit.ts). This is
  the precursor to the per-account **credit system**.
- **Cost control**: mini model for cheap extraction, smart model for the creative steps, capped
  `max_tokens`, 30s timeouts.
- **Robust scraping**: timeouts, redirects, size caps, and a manual-entry fallback for JS-only or
  blocked sites. See [`lib/scrape.ts`](lib/scrape.ts).
- **Stateless serverless routes** → horizontal auto-scale on Vercel.
- **Observability**: every step logs latency + token usage; errors flow through
  [`lib/observability.ts`](lib/observability.ts) (console by default; Sentry if `SENTRY_DSN` set).

## Environment variables

See [`.env.example`](.env.example). All are optional except `OPENAI_API_KEY` (needed for real AI).

| Var | Effect if unset |
|---|---|
| `OPENAI_API_KEY` | Mock mode (sample output) |
| `OPENAI_MODEL_SMART` / `OPENAI_MODEL_MINI` | Defaults to `gpt-4o` / `gpt-4o-mini` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | In-memory rate limit + cache |
| `DATABASE_URL` | Leads logged + written to `leads.local.json` (run `npm i postgres` to enable PG) |
| `SENTRY_DSN` | Errors go to console only |
| `RATE_LIMIT_PER_MINUTE` / `DAILY_GLOBAL_CAP` | `20` / `2000` |

## Deploy (Vercel)

1. Push this `platform/` folder as the project root (or set it as the Vercel "Root Directory").
2. Add env vars in the Vercel dashboard (at minimum `OPENAI_API_KEY`). **Never** expose keys to the
   client — all AI calls happen in server route handlers.
3. Deploy. The marketing site links to the test via the **AI Marketing Test** nav item (update the
   `href` in the static site to your deployed URL, e.g. `https://app.newriyadhmedia.com/try`).

## What's next (full platform)

Auth + credits/billing, social OAuth + auto-posting, image/video generation with reference images,
asset storage, an editor, and a content calendar — built on this same backbone.
