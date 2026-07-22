import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPost, updatePost, updateUser } from "@/lib/db";
import { brandFromUser, regeneratePost } from "@/lib/generate";
import { DEFAULT_CREDITS, regenerateCost } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const post = await getPost(id);
  if (!post || post.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { parts?: { text?: boolean; images?: boolean } };
  const parts = body.parts ?? { text: true, images: true };
  if (!parts.text && !parts.images) {
    return NextResponse.json({ error: "Nothing to regenerate" }, { status: 400 });
  }

  const cost = regenerateCost(post.type, parts);
  const credits = user.credits ?? DEFAULT_CREDITS;
  if (credits < cost) {
    return NextResponse.json(
      { error: `Not enough credits — regeneration needs ${cost}, you have ${credits}.`, creditsRemaining: credits },
      { status: 402 },
    );
  }

  try {
    const patch = await regeneratePost(post, brandFromUser(user), parts);
    const updated = await updatePost(id, patch);
    const creditsRemaining = credits - cost;
    await updateUser(user.id, { credits: creditsRemaining });
    return NextResponse.json({ post: updated, creditsRemaining });
  } catch (err) {
    console.error("[/api/posts/[id]/regenerate] failed:", err);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
