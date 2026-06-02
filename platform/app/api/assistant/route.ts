import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { SAUDI_MARKETING_CONTEXT } from "@/lib/marketingContext";
import { checkLimits, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(40),
});

// A synthetic weekly analytics digest stands in for real Google Analytics /
// platform insights. Once GA + social analytics are connected, this is built
// from live data so the strategist genuinely "learns what works."
function analyticsDigest(connections: { platform: string }[]): string {
  if (connections.length === 0) return "No channels connected yet, so there's no performance data to learn from. Encourage connecting channels and Google Analytics.";
  const names = connections.map((c) => c.platform).join(", ");
  return `Connected channels: ${names}.
Last 7 days (sample): Snapchat Stories drove the highest profile-visit rate (+18% WoW). Instagram Reels had the best reach per post. X posts under-performed (engagement down 9%). Best posting windows: 9-11pm Riyadh time. Top content type: behind-the-scenes + product-in-use. Arabic captions outperformed English by ~22% on reach.`;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rl = await checkLimits(clientIp(req.headers));
  if (!rl.ok) return NextResponse.json({ error: "Slow down a moment and try again." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const brand = user.brandKit;
  const prefs = user.contentPrefs;

  const memory = user.aiMemory ?? [];
  const memoryBlock = memory.length
    ? memory.map((m) => `- [${m.kind}] ${m.text}`).join("\n")
    : "No durable memory saved yet — suggest the client add key facts/preferences in AI Memory.";

  const system = `${SAUDI_MARKETING_CONTEXT}

YOU ARE THIS CLIENT'S DEDICATED AI STRATEGIST inside the New Riyadh Media platform. You know their brand and their numbers. Be concise, specific and actionable. When you give recommendations, ground them in the analytics digest below. Offer concrete next steps the client can act on in the platform (calendar, campaigns, content).

CLIENT BRAND
- Name/company: ${user.company || user.name}
- Purpose: ${brand?.purpose || "not set yet"}
- Audience: ${brand?.audience || "not set yet"}
- Character: ${brand?.character || "not set yet"}
- Tone traits: ${(brand?.toneTraits ?? []).join(", ") || "not set yet"}
- Emotional registers: ${(brand?.emotionTraits ?? []).join(", ") || "not set yet"}
- Brand voice notes: ${brand?.voice || "not set yet — suggest defining it in Brand Kit"}
- Content preferences: ${prefs ? `${prefs.tone}, languages: ${prefs.languages.join("/")}, ${prefs.postsPerWeek} posts/week, topics: ${prefs.topics}` : "not set yet — suggest setting Content Preferences"}

PERSISTENT MEMORY ABOUT THIS BRAND (always honor these)
${memoryBlock}

PERFORMANCE (LEARN FROM THIS)
${analyticsDigest(user.connections)}

Reply in the client's primary language when clear; otherwise match the language they wrote in. Keep replies under ~180 words unless asked for a full plan.`;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      reply:
        "Here's what I'd do this week: lean into Snapchat Stories and Instagram Reels (your strongest formats), move two X slots to Snapchat, and post behind-the-scenes content in Arabic around 9–11pm. Want me to draft this week's calendar?\n\n(Demo reply — add an OPENAI_API_KEY to enable the live strategist.)",
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL_SMART || "gpt-4o",
      temperature: 0.7,
      max_tokens: 700,
      messages: [{ role: "system", content: system }, ...parsed.data.messages],
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "I didn't catch that — could you rephrase?";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "I'm having trouble reaching my models right now. Please try again in a moment." });
  }
}
