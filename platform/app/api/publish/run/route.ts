import { NextResponse } from "next/server";
import { listSubscribedUsers } from "@/lib/db";
import { publishDuePosts } from "@/lib/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint — publishes all due posts for subscribed users.
 * Secured via CRON_SECRET header (set in Vercel env).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const users = await listSubscribedUsers();
  let total = 0;
  for (const user of users) {
    try {
      total += await publishDuePosts(user);
    } catch (err) {
      console.error("[publish/run] user failed:", user.id, err);
    }
  }

  return NextResponse.json({ ok: true, published: total, users: users.length });
}
