import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({ select: { email: true, company: true, plan: true } });
const posts = await p.post.count();
console.log("Connected to Postgres. Users:");
for (const u of users) console.log(`  - ${u.email} (${u.company || "—"}, ${u.plan})`);
console.log("Posts:", posts);
await p.$disconnect();
