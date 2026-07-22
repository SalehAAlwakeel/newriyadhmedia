import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { updateUser, findUserById, addAiMemory } from "@/lib/db";
import { getPlatform } from "@/lib/platforms";
import { redirectUri, verifyOAuthState } from "@/lib/social";
import { encryptSecret } from "@/lib/crypto";
import { exchangeMetaLongLivedToken, resolveInstagramAccount } from "@/lib/instagram";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const origin = req.nextUrl.origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/dashboard/integrations?${q}`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) return back(`error=${encodeURIComponent(providerError)}&platform=${platform}`);
  if (!code) return back(`error=missing_code&platform=${platform}`);

  const def = getPlatform(platform);
  if (!def || !def.oauth) return back(`error=unknown_platform`);

  const store = await cookies();
  const cookieState = store.get(`oauth_state_${platform}`)?.value;
  const verified = verifyOAuthState(state);
  if (!verified || verified.platform !== platform || state !== cookieState) {
    return back(`error=bad_state&platform=${platform}`);
  }
  store.delete(`oauth_state_${platform}`);

  const user = await findUserById(verified.userId);
  if (!user) return NextResponse.redirect(`${origin}/login`);

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  try {
    const res = await fetch(def.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env[def.oauth.clientIdEnv] as string,
        client_secret: process.env[def.oauth.clientSecretEnv] as string,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(origin, platform),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || !data.access_token) {
      return back(`error=token_exchange&platform=${platform}`);
    }
    accessToken = String(data.access_token);
    refreshToken = data.refresh_token ? String(data.refresh_token) : undefined;
    expiresIn = typeof data.expires_in === "number" ? data.expires_in : undefined;
  } catch {
    return back(`error=token_exchange&platform=${platform}`);
  }

  const now = new Date().toISOString();
  let connection;

  if (platform === "instagram") {
    try {
      const clientId = process.env[def.oauth.clientIdEnv] as string;
      const clientSecret = process.env[def.oauth.clientSecretEnv] as string;
      const long = await exchangeMetaLongLivedToken(accessToken, clientId, clientSecret);
      const ig = await resolveInstagramAccount(long.accessToken);

      connection = {
        platform: def.id,
        handle: `@${ig.username}`,
        connectedAt: now,
        authMethod: "oauth" as const,
        capabilities: ["publish", "analytics"] as import("@/lib/db").ConnectionCapability[],
        providerAccountId: ig.igUserId,
        metaPageId: ig.pageId,
        accessToken: encryptSecret(ig.pageAccessToken),
        refreshToken: encryptSecret(long.accessToken),
        tokenExpiresAt: long.expiresIn
          ? new Date(Date.now() + long.expiresIn * 1000).toISOString()
          : undefined,
        avatarUrl: ig.profilePicture,
        audienceSize: ig.followersCount,
        lastSyncedAt: now,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "instagram_setup";
      return back(`error=${encodeURIComponent(msg)}&platform=${platform}`);
    }
  } else {
    return back(`error=not_available&platform=${platform}`);
  }

  const previous = user.connections.find((c) => c.platform === def.id);
  const connections = [...user.connections.filter((c) => c.platform !== def.id), connection];
  await updateUser(user.id, { connections });

  if (!previous) {
    await addAiMemory(user.id, {
      id: crypto.randomUUID(),
      kind: "fact",
      text: `Connected ${def.name} (${connection.handle}) via official OAuth.`,
      source: "auto",
      createdAt: now,
    });
  }

  return back(`connected=${platform}`);
}
