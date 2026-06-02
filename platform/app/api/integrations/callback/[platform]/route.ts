import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { updateUser, findUserById } from "@/lib/db";
import { getPlatform } from "@/lib/platforms";
import { mockAudienceSize, mockProviderAccountId, redirectUri, verifyOAuthState } from "@/lib/social";

export const runtime = "nodejs";

// Step 2 of real OAuth: provider redirects back here with ?code. We verify the
// signed state, exchange the code for tokens, and persist the connection.
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

  // Validate the round-tripped state against what we stored + the signature.
  const store = await cookies();
  const cookieState = store.get(`oauth_state_${platform}`)?.value;
  const verified = verifyOAuthState(state);
  if (!verified || verified.platform !== platform || state !== cookieState) {
    return back(`error=bad_state&platform=${platform}`);
  }
  store.delete(`oauth_state_${platform}`);

  const user = await findUserById(verified.userId);
  if (!user) return NextResponse.redirect(`${origin}/login`);

  // Exchange the authorization code for tokens.
  let accessToken: string | undefined;
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

  const handle = verified.handle || def.sampleHandle;
  const connection = {
    platform: def.id,
    handle,
    connectedAt: new Date().toISOString(),
    capabilities: def.capabilities,
    providerAccountId: mockProviderAccountId(def.id, handle),
    accessToken,
    refreshToken,
    tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    lastSyncedAt: new Date().toISOString(),
    audienceSize: mockAudienceSize(def.id, handle),
  };

  const connections = [...user.connections.filter((c) => c.platform !== def.id), connection];
  await updateUser(user.id, { connections });

  return back(`connected=${platform}`);
}
