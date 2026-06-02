# Working in this repo

Two things live here:
- **Marketing site** — static files at the repo root (`index.html`, `about.html`, `automated-marketing.html`, `styles.css`, `script.js`).
- **Platform** — the Next.js SaaS app in `platform/`.

## Local dev rules (read before running anything)

1. **Run ONE dev server.** Start it once with `npm run dev` in `platform/` (serves on http://localhost:3000). Two `next dev` processes share the same `.next/` folder and corrupt each other — this has broken the build repeatedly.
2. **Never run `next build` while a dev server is live.** Same `.next/` collision. Stop the dev server first if you must build.
3. **One agent/session at a time.** Parallel sessions editing the same files caused data loss here. Coordinate before running concurrent agents.

## Secrets

- All secrets live in `platform/.env.local` (gitignored). See `platform/.env.example` for the required variables.
- Required: `OPENAI_API_KEY`, `AUTH_SECRET`, `DATABASE_URL`.
- Never paste real keys into chat, commits, or screenshots. If a key is exposed, rotate it.

## Database

- SQLite via Prisma. Schema: `platform/prisma/schema.prisma`. DB file: `platform/prisma/dev.db` (gitignored).
- After schema changes: `npx prisma db push` (from `platform/`).
- Data access goes through `platform/lib/db.ts` — keep its public API stable.
