import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteCampaign,
  deletePostsByCampaign,
  getCampaign,
  listPostsByCampaign,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const posts = (await listPostsByCampaign(user.id, campaign.name)).sort(
    (a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor),
  );
  return NextResponse.json({ campaign, posts });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const removedPosts = await deletePostsByCampaign(user.id, campaign.name);
  await deleteCampaign(id);
  return NextResponse.json({ ok: true, removedPosts });
}
