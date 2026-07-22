// Import .data/export.json into the current Prisma datasource (Supabase Postgres).
// Run AFTER `npx prisma db push` against Postgres. Idempotent (upsert by id).
//   node scripts/import-export-json.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const SRC = path.join(process.cwd(), ".data", "export.json");

if (!existsSync(SRC)) {
  console.error("No .data/export.json found — run scripts/export-db.mjs first.");
  process.exit(1);
}

const { users = [], posts = [], media = [] } = JSON.parse(readFileSync(SRC, "utf8"));

for (const u of users) {
  const { id, ...rest } = u;
  await prisma.user.upsert({ where: { id }, update: rest, create: { id, ...rest } });
}
for (const p of posts) {
  const { id, ...rest } = p;
  await prisma.post.upsert({ where: { id }, update: rest, create: { id, ...rest } });
}
for (const m of media) {
  const { id, ...rest } = m;
  await prisma.media.upsert({ where: { id }, update: rest, create: { id, ...rest } });
}

console.log(`Imported ${users.length} users, ${posts.length} posts, ${media.length} media into Postgres.`);
await prisma.$disconnect();
