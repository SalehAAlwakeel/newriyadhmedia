import { promises as fs } from "node:fs";
import path from "node:path";
import type { TestResult } from "./types";

// --------------------------------------------------------------------------
// Lead capture.
//
// When DATABASE_URL is set we persist to Postgres (table auto-created on first
// write). Otherwise, in development, we append to leads.local.json and always
// log — so nothing is lost and there is zero required infrastructure to run
// the test. Swap in the full SaaS data model later.
// --------------------------------------------------------------------------

export interface Lead {
  email: string;
  result: TestResult;
  createdAt: string;
}

const hasPg = Boolean(process.env.DATABASE_URL);

export async function saveLead(email: string, result: TestResult): Promise<{ ok: boolean }> {
  const lead: Lead = { email, result, createdAt: new Date().toISOString() };

  if (hasPg) {
    try {
      await saveToPostgres(lead);
      return { ok: true };
    } catch (err) {
      console.error("[leads] postgres write failed, falling back to log:", err);
    }
  }

  console.log("[leads] captured:", { email, business: result.profile.businessName });

  // Local-file fallback (dev only; serverless filesystems are ephemeral).
  try {
    const file = path.join(process.cwd(), "leads.local.json");
    let existing: Lead[] = [];
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* file may not exist yet */
    }
    existing.push(lead);
    await fs.writeFile(file, JSON.stringify(existing, null, 2), "utf8");
  } catch {
    /* read-only FS in prod — the console log above is the source of truth */
  }

  return { ok: true };
}

async function saveToPostgres(lead: Lead): Promise<void> {
  // Dynamically import so the dependency is only needed when DATABASE_URL is set.
  // Install with: npm i postgres  (the indirect specifier keeps it optional at build time)
  const specifier = "postgres";
  const mod = (await import(/* @vite-ignore */ specifier).catch(() => null)) as
    | { default: (url: string, opts?: unknown) => unknown }
    | null;
  if (!mod) {
    throw new Error("`postgres` package not installed but DATABASE_URL is set");
  }
  const sql = mod.default(process.env.DATABASE_URL as string, {
    ssl: "require",
  }) as unknown as {
    unsafe: (q: string, params?: unknown[]) => Promise<unknown>;
    end: () => Promise<void>;
  };

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS test_leads (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      business_name TEXT,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await sql.unsafe(`INSERT INTO test_leads (email, business_name, result) VALUES ($1, $2, $3)`, [
    lead.email,
    lead.result.profile.businessName,
    JSON.stringify(lead.result),
  ]);
  await sql.end();
}
