// Trial setup: create a "New Riyadh Media" brand account, then generate a week
// of real content for it across every format (image, carousel, blog, email,
// short-form video, story) by driving the running dev server's generation API.
//
// Run from platform/ with the dev server up on http://localhost:3000:
//   node scripts/seed-nrm-trial.mjs
//
// Idempotent: re-running re-seeds the same account and adds fresh content.
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const BASE = process.env.TRIAL_BASE_URL || "http://localhost:3000";
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

const EMAIL = "trial@newriyadhmedia.com";
const PASSWORD = "NewRiyadh2026"; // change after first login
const USER_ID = "nrm-trial-account";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function sessionCookie(userId) {
  const encoded = Buffer.from(`${userId}.${Date.now()}`).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(encoded).digest("hex");
  return `nrm_session=${encoded}.${sig}`;
}

const brandKit = {
  primaryColor: "#0e0d0b",
  secondaryColor: "#f2ebd9",
  logoUrl: "",
  fonts: "Cormorant Garamond + Inter",
  voice:
    "Confident, modern and bilingual (Arabic/English). Speaks to ambitious Saudi businesses about marketing that actually performs. Plain-spoken, never hypey.",
  purpose:
    "Help Saudi businesses run world-class marketing with AI — strategy, content, scheduling and learning in one platform.",
  audience:
    "Saudi SMB owners, marketing managers and agencies in Riyadh and across the Kingdom who want results without a big team.",
  character: "Expert, warm, and pragmatic. A senior strategist who happens to move at software speed.",
  toneTraits: ["Confident", "Clear", "Locally fluent", "Outcome-focused"],
  emotionTraits: ["Ambition", "Trust", "National pride"],
};

const contentPrefs = {
  languages: ["Arabic", "English"],
  tone: "Confident, modern, bilingual; Saudi/Khaleeji nuance.",
  topics:
    "AI marketing for Saudi businesses, social growth, content that converts, Vision 2030 momentum, local case studies, Ramadan and national-day campaigns.",
  postsPerWeek: 6,
  doNotMention: "Competitor names; anything culturally or religiously insensitive.",
  mode: "growth",
  includeMusic: true,
  includeNarration: false,
  ctaCopy: "Start your free AI marketing test",
  ctaUrl: "https://newriyadhmedia.com/try",
  smartCaptions: true,
};

const memory = [
  { kind: "fact", text: "New Riyadh Media is an AI marketing platform for the Saudi market.", source: "user" },
  { kind: "preference", text: "Lead with Arabic; mirror with English where useful.", source: "user" },
  { kind: "winning-pattern", text: "Behind-the-scenes + product-in-use content outperforms generic stock.", source: "analytics" },
  { kind: "do-not", text: "Never post content that is culturally or religiously insensitive.", source: "user" },
].map((m) => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...m }));

async function seed() {
  const prisma = new PrismaClient();
  const data = {
    email: EMAIL,
    name: "New Riyadh Media",
    company: "New Riyadh Media",
    passwordHash: hashPassword(PASSWORD),
    subscribed: true,
    plan: "growth",
    createdAt: new Date().toISOString(),
    credits: 500,
    connections: JSON.stringify([]),
    brandKit: JSON.stringify(brandKit),
    contentPrefs: JSON.stringify(contentPrefs),
    aiMemory: JSON.stringify(memory),
  };
  await prisma.user.upsert({ where: { id: USER_ID }, update: data, create: { id: USER_ID, ...data } });
  await prisma.$disconnect();
  console.log(`Seeded account: ${EMAIL} / ${PASSWORD}`);
}

async function generate() {
  const cookie = sessionCookie(USER_ID);
  const now = Date.now();
  const day = 24 * 3600_000;
  const jobs = [
    { type: "Still Image", topic: "Why Saudi brands are switching to AI-run marketing", offset: 1 },
    { type: "Carousel", topic: "5 content formats that convert in the Saudi market", offset: 2 },
    { type: "Blog Post", topic: "A practical guide to AI marketing for Saudi SMBs", offset: 3 },
    { type: "Email", topic: "Your week of content is ready — here's what we'd post", offset: 4 },
    { type: "Short-form Video", topic: "From blank page to a month of content in an afternoon", offset: 5 },
    { type: "Story", topic: "One tap to schedule a whole week", offset: 6 },
  ];

  for (const job of jobs) {
    const scheduledFor = new Date(now + job.offset * day).toISOString();
    process.stdout.write(`Generating ${job.type}… `);
    try {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ type: job.type, topic: job.topic, campaignName: "New Riyadh Media — Launch Week", scheduledFor }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.posts?.length) {
        const p = out.posts[0];
        console.log(`ok (${p.imageUrls?.length ?? 0} image(s), caption ${p.caption?.length ?? 0} chars)`);
      } else {
        console.log(`failed: ${res.status} ${JSON.stringify(out).slice(0, 160)}`);
      }
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  }
}

async function main() {
  await seed();
  if (process.argv.includes("--seed-only")) {
    console.log("Seed-only mode; skipping generation.");
    return;
  }
  console.log(`Generating launch-week content via ${BASE} …`);
  await generate();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
