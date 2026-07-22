import type { GeneratedPost, PostPublication, SocialConnection, User } from "./db";
import { listPosts, updatePost } from "./db";
import { publishInstagramPhoto } from "./instagram";
import { isVerifiedConnection } from "./social";

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("type=video");
}

function buildCaption(post: GeneratedPost): string {
  const tags = (post.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  return [post.caption.trim(), tags].filter(Boolean).join("\n\n");
}

function pickImageUrl(post: GeneratedPost): string | null {
  const img = (post.imageUrls ?? []).find((u) => u && !isVideoUrl(u));
  return img ?? null;
}

async function publishToInstagram(conn: SocialConnection, post: GeneratedPost): Promise<PostPublication> {
  if (!conn.capabilities?.includes("publish")) {
    return { platform: "instagram", status: "skipped", error: "Publish not permitted on this connection." };
  }
  if (post.type !== "Still Image" && post.type !== "Carousel" && post.type !== "Story") {
    return {
      platform: "instagram",
      status: "skipped",
      error: `${post.type} is not supported on Instagram yet — use Still Image for now.`,
    };
  }
  const imageUrl = pickImageUrl(post);
  if (!imageUrl) {
    return { platform: "instagram", status: "failed", error: "No image available to publish." };
  }

  try {
    const result = await publishInstagramPhoto(conn, { imageUrl, caption: buildCaption(post) });
    return {
      platform: "instagram",
      status: "published",
      publishedAt: new Date().toISOString(),
      externalId: result.externalId,
      url: result.url,
    };
  } catch (e) {
    return {
      platform: "instagram",
      status: "failed",
      error: e instanceof Error ? e.message : "Instagram publish failed.",
    };
  }
}

/** Attempt to publish one approved post to every verified connection that allows it. */
export async function publishPost(user: User, post: GeneratedPost): Promise<GeneratedPost> {
  const pubs: PostPublication[] = [];
  for (const conn of sanitizePublishTargets(user.connections)) {
    if (conn.platform === "instagram") {
      pubs.push(await publishToInstagram(conn, post));
    }
  }

  const anyPublished = pubs.some((p) => p.status === "published");

  if (pubs.length === 0) return post;

  return (
    (await updatePost(post.id, {
      publications: pubs,
      status: anyPublished ? "published" : post.status,
      error: anyPublished ? undefined : pubs.find((p) => p.status === "failed")?.error,
    })) ?? post
  );
}

function sanitizePublishTargets(list: SocialConnection[]): SocialConnection[] {
  return list.filter(isVerifiedConnection);
}

/** Publish approved posts whose scheduled time has passed. Returns count published. */
export async function publishDuePosts(user: User, now: Date = new Date()): Promise<number> {
  const posts = await listPosts(user.id);
  const due = posts.filter(
    (p) =>
      p.status === "approved" &&
      p.scheduledFor &&
      new Date(p.scheduledFor) <= now &&
      !(p.publications ?? []).some((pub) => pub.status === "published"),
  );

  let count = 0;
  for (const post of due) {
    const updated = await publishPost(user, post);
    if ((updated.publications ?? []).some((p) => p.status === "published")) count++;
  }
  return count;
}

/** Whether the user has at least one verified connection that can publish. */
export function hasPublishConnection(user: User): boolean {
  return sanitizePublishTargets(user.connections).some((c) => c.capabilities?.includes("publish"));
}
