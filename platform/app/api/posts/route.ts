import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deletePost, listPosts, updatePost } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const posts = await listPosts(user.id);
  return NextResponse.json({ posts });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: "approved" | "rejected" | "ready" };
  if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  const updated = await updatePost(id, { status });
  if (!updated || updated.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post: updated });
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
