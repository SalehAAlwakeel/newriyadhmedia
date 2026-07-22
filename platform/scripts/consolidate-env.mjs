// Move DATABASE_URL/DIRECT_URL from .env.local into .env so the Prisma CLI
// (which only reads .env) and Next (reads both) share one source. Never prints
// secret values. Run once from platform/:  node scripts/consolidate-env.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";

const local = (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "").split(/\r?\n/);
const isDb = (l) => /^(DATABASE_URL|DIRECT_URL)=/.test(l);
const dbLines = local.filter(isDb);

if (dbLines.length === 0) {
  console.error("No DATABASE_URL/DIRECT_URL found in .env.local — nothing to move.");
  process.exit(1);
}

writeFileSync(".env", `# Database connection for Prisma CLI + Next.js (gitignored).\n${dbLines.join("\n")}\n`);

const keep = local
  .filter((l) => !isDb(l) && !/Supabase Postgres . replace/.test(l))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd();
writeFileSync(".env.local", keep + "\n");

console.log(`Moved ${dbLines.length} DB line(s) into .env; .env.local keeps app secrets.`);
