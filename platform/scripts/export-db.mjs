// Snapshot the current database (whatever Prisma points at) to .data/export.json.
// Run this BEFORE switching the Prisma datasource to Postgres so existing
// users/posts/media can be re-imported. Run from platform/:
//   node scripts/export-db.mjs
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), ".data", "export.json");

const [users, posts, media] = await Promise.all([
  prisma.user.findMany(),
  prisma.post.findMany(),
  prisma.media.findMany(),
]);

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ users, posts, media }, null, 2));
console.log(`Exported ${users.length} users, ${posts.length} posts, ${media.length} media -> ${OUT}`);
await prisma.$disconnect();
