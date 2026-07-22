import { decryptSecret } from "./crypto";
import type { SocialConnection } from "./db";
import { appOrigin } from "./social";
import { mediaIdFromAppUrl, signMediaPublicUrl } from "./mediaPublic";

const GRAPH = "https://graph.facebook.com/v21.0";

interface GraphError {
  error?: { message?: string; code?: number };
}

function graphError(data: GraphError): string {
  return data.error?.message || "Instagram API error";
}

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok) throw new Error(graphError(data));
  return data;
}

async function graphPost<T>(path: string, token: string, body: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok) throw new Error(graphError(data));
  return data;
}

export interface InstagramAccount {
  igUserId: string;
  username: string;
  profilePicture?: string;
  followersCount?: number;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  userAccessToken: string;
  tokenExpiresAt?: string;
}

/** Exchange a short-lived Meta token for a ~60-day token. */
export async function exchangeMetaLongLivedToken(
  shortToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number } & GraphError;
  if (!res.ok || !data.access_token) throw new Error(graphError(data));
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/**
 * Resolve the first Facebook Page with a linked Instagram Business account.
 * Requires pages_show_list + instagram_basic on the user token.
 */
export async function resolveInstagramAccount(userAccessToken: string): Promise<InstagramAccount> {
  const pages = await graphGet<{
    data?: {
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: {
        id: string;
        username?: string;
        profile_picture_url?: string;
        followers_count?: number;
      };
    }[];
  }>("/me/accounts", userAccessToken, {
    fields: "name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}",
  });

  const page = pages.data?.find((p) => p.instagram_business_account?.id);
  if (!page?.instagram_business_account?.id) {
    throw new Error(
      "No Instagram Business account found. Link your Instagram to a Facebook Page, then try again.",
    );
  }

  const ig = page.instagram_business_account;
  return {
    igUserId: ig.id,
    username: ig.username || "instagram",
    profilePicture: ig.profile_picture_url,
    followersCount: ig.followers_count,
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    userAccessToken,
  };
}

function pageToken(conn: SocialConnection): string {
  const token = decryptSecret(conn.accessToken);
  if (!token) throw new Error("Instagram access token missing.");
  return token;
}

/** Pull latest follower count from Instagram Graph. */
export async function syncInstagramMetrics(conn: SocialConnection): Promise<Partial<SocialConnection>> {
  if (!conn.providerAccountId) throw new Error("Instagram account id missing.");
  const token = pageToken(conn);
  const data = await graphGet<{ followers_count?: number; username?: string; profile_picture_url?: string }>(
    `/${conn.providerAccountId}`,
    token,
    { fields: "followers_count,username,profile_picture_url" },
  );
  return {
    audienceSize: data.followers_count,
    handle: data.username ? `@${data.username}` : conn.handle,
    avatarUrl: data.profile_picture_url || conn.avatarUrl,
    lastSyncedAt: new Date().toISOString(),
  };
}

function absolutizeMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = appOrigin();
  const mediaId = mediaIdFromAppUrl(url);
  if (mediaId) return `${origin}${signMediaPublicUrl(mediaId, 3600)}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return `${origin}/${url}`;
}

export interface PublishInstagramResult {
  externalId: string;
  url?: string;
}

/** Publish a single-image feed post to Instagram. */
export async function publishInstagramPhoto(
  conn: SocialConnection,
  input: { imageUrl: string; caption: string },
): Promise<PublishInstagramResult> {
  if (!conn.providerAccountId) throw new Error("Instagram account id missing.");
  const token = pageToken(conn);
  const imageUrl = absolutizeMediaUrl(input.imageUrl);
  const caption = input.caption.slice(0, 2200);

  const container = await graphPost<{ id: string }>(`/${conn.providerAccountId}/media`, token, {
    image_url: imageUrl,
    caption,
  });

  const published = await graphPost<{ id: string }>(`/${conn.providerAccountId}/media_publish`, token, {
    creation_id: container.id,
  });

  let permalink: string | undefined;
  try {
    const meta = await graphGet<{ permalink?: string }>(`/${published.id}`, token, {
      fields: "permalink",
    });
    permalink = meta.permalink;
  } catch {
    /* permalink is optional */
  }

  return { externalId: published.id, url: permalink };
}
