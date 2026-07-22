import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deletePost, getPost, listPosts, updatePost } from "@/lib/db";
import { hasPublishConnection, publishPost } from "@/lib/publish";
import { nextSlot, schedulePrefsFrom } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const posts = await listPosts(user.id);
  return NextResponse.json({ posts });
}

const STATUSES = ["generating", "ready", "approved", "rejected", "published", "failed"] as const;

interface PatchBody {
  id?: string;
  status?: (typeof STATUSES)[number];
  caption?: string;
  body?: string;
  hashtags?: string[];
  imageUrls?: string[];
  scheduledFor?: string;
  type?: string;
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as PatchBody;
  if (!b.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Ownership check before mutating.
  const existing = await getPost(b.id);
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    patch.status = b.status;

    // On approval, place the post on the calendar at the next free slot that
    // respects the client's preferred volume + posting window — unless an
    // explicit schedule was supplied in the same request.
    if (b.status === "approved" && existing.status !== "approved" && b.scheduledFor === undefined) {
      const all = await listPosts(user.id);
      const occupied = all.filter(
        (p) => p.id !== existing.id && (p.status === "approved" || p.status === "published"),
      );
      patch.scheduledFor = nextSlot(occupied, schedulePrefsFrom(user.contentPrefs));
    }
  }
  if (typeof b.caption === "string") patch.caption = b.caption.slice(0, 2200);
  if (typeof b.body === "string") patch.body = b.body.slice(0, 8000);
  if (Array.isArray(b.hashtags)) patch.hashtags = b.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 12);
  if (Array.isArray(b.imageUrls)) patch.imageUrls = b.imageUrls.filter((u) => typeof u === "string").slice(0, 12);
  if (typeof b.scheduledFor === "string" && !Number.isNaN(Date.parse(b.scheduledFor))) patch.scheduledFor = new Date(b.scheduledFor).toISOString();
  if (typeof b.type === "string") patch.type = b.type;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updatePost(b.id, patch);

  let result = updated;
  if (
    result &&
    result.status === "approved" &&
    user &&
    hasPublishConnection(user) &&
    new Date(result.scheduledFor) <= new Date()
  ) {
    result = await publishPost(user, result);
  }

  return NextResponse.json({ post: result });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  // Verify ownership before deleting
  const posts = await listPosts(user.id);
  if (!posts.find((p) => p.id === id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deletePost(id);
  return NextResponse.json({ ok: true });
}
