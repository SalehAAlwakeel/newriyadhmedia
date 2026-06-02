// One-time migration: import the legacy .data/db.json into SQLite via Prisma.
// Safe to re-run — uses upserts keyed by id. Run from platform/:
//   node scripts/migrate-json-to-sqlite.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const DB_PATH = path.join(process.cwd(), ".data", "db.json");

function j(v) {
  return JSON.stringify(v ?? null);
}

async function main() {
  if (!existsSync(DB_PATH)) {
    console.log("No .data/db.json found — nothing to migrate.");
    return;
  }
  const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const users = raw.users ?? [];
  const posts = raw.posts ?? [];
  const media = raw.media ?? [];

  let u = 0;
  for (const user of users) {
    const data = {
      email: user.email,
      name: user.name ?? "",
      company: user.company ?? "",
      passwordHash: user.passwordHash ?? "",
      subscribed: Boolean(user.subscribed),
      plan: user.plan ?? null,
      createdAt: user.createdAt ?? new Date().toISOString(),
      credits: typeof user.credits === "number" ? user.credits : null,
      connections: JSON.stringify(user.connections ?? []),
      brandKit: user.brandKit ? JSON.stringify(user.brandKit) : null,
      contentPrefs: user.contentPrefs ? JSON.stringify(user.contentPrefs) : null,
      aiMemory: JSON.stringify(user.aiMemory ?? []),
    };
    await prisma.user.upsert({ where: { id: user.id }, update: data, create: { id: user.id, ...data } });
    u++;
  }

  let p = 0;
  for (const post of posts) {
    const data = {
      userId: post.userId,
      type: post.type,
      campaignName: post.campaignName ?? "Untitled campaign",
      topic: post.topic ?? "",
      caption: post.caption ?? "",
      body: post.body ?? null,
      scheduledFor: post.scheduledFor ?? new Date().toISOString(),
      status: post.status ?? "ready",
      createdAt: post.createdAt ?? new Date().toISOString(),
      error: post.error ?? null,
      hashtags: JSON.stringify(post.hashtags ?? []),
      imageUrls: JSON.stringify(post.imageUrls ?? []),
      publications: post.publications ? JSON.stringify(post.publications) : null,
    };
    await prisma.post.upsert({ where: { id: post.id }, update: data, create: { id: post.id, ...data } });
    p++;
  }

  let m = 0;
  for (const asset of media) {
    const data = {
      userId: asset.userId,
      filename: asset.filename ?? "",
      mime: asset.mime ?? "application/octet-stream",
      sizeBytes: asset.sizeBytes ?? 0,
      kind: asset.kind ?? "other",
      source: asset.source ?? "upload",
      label: asset.label ?? null,
      url: asset.url ?? "",
      uploadedAt: asset.uploadedAt ?? new Date().toISOString(),
      postId: asset.postId ?? null,
    };
    await prisma.media.upsert({ where: { id: asset.id }, update: data, create: { id: asset.id, ...data } });
    m++;
  }

  console.log(`Migrated: ${u} users, ${p} posts, ${m} media assets.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
