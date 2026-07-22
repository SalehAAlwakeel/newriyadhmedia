# Working in this repo

Two things live here:
- **Marketing site** — static files at the repo root (`index.html`, `about.html`, `automated-marketing.html`, `styles.css`, `script.js`).
- **Platform** — the Next.js SaaS app in `platform/`.

## Local dev rules (read before running anything)

1. **Run ONE platform dev server.** Start it once with `npm run dev` in `platform/` (http://localhost:3000). Two `next dev` processes share the same `.next/` folder and corrupt each other.
2. **Marketing site (static):** From the repo root run `python -m http.server 8080` → http://localhost:8080/index.html  
   Port 5173 is often taken by other Vite projects on this machine; use **8080** for the marketing site locally.
3. **Never run `next build` while a dev server is live.** Stop the dev server first if you must build.
4. **One agent/session at a time.** Parallel sessions editing the same files caused data loss here.

## Secrets

- All secrets live in `platform/.env.local` (gitignored). See `platform/.env.example` for the required variables.
- Required: `OPENAI_API_KEY`, `AUTH_SECRET`, `DATABASE_URL`.
- Never paste real keys into chat, commits, or screenshots. If a key is exposed, rotate it.

## Database

- SQLite via Prisma. Schema: `platform/prisma/schema.prisma`. DB file: `platform/prisma/dev.db` (gitignored).
- After schema changes: `npx prisma db push` (from `platform/`).
- Data access goes through `platform/lib/db.ts` — keep its public API stable.

## Production deploy (platform)

- Set `APP_URL` to the live platform URL (e.g. `https://app.yourdomain.com`).
- Set `NEXT_PUBLIC_MARKETING_URL` to the marketing site origin.
- Set `MOYASAR_SECRET_KEY` + `MOYASAR_PUBLISHABLE_KEY` for SAR checkout (demo mode works without them locally).
- Set `CRON_SECRET` — Vercel cron hits `/api/publish/run` every 15 min for auto-posting.
- Instagram OAuth: `META_CLIENT_ID`, `META_CLIENT_SECRET`, redirect URI `{APP_URL}/api/integrations/callback/instagram`.
