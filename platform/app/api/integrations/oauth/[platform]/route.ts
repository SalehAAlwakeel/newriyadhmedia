import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getPlatform, isPlatformLive, oauthConfigured } from "@/lib/platforms";
import { redirectUri, signOAuthState } from "@/lib/social";

export const runtime = "nodejs";

// Step 1 of real OAuth: bounce the user to the provider's consent screen.
// Activates only when the provider's client id + secret env vars are present;
// otherwise the UI uses the manual connect flow instead.
export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const origin = req.nextUrl.origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/dashboard/integrations?${q}`);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const def = getPlatform(platform);
  if (!def || !def.oauth) return back(`error=unknown_platform`);
  if (!isPlatformLive(platform)) return back(`error=not_available&platform=${platform}`);
  if (!oauthConfigured(def)) return back(`error=not_configured&platform=${platform}`);

  const handle = req.nextUrl.searchParams.get("handle") ?? def.sampleHandle;
  const state = signOAuthState({ userId: user.id, platform, handle });

  const store = await cookies();
  store.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });

  const url = new URL(def.oauth.authUrl);
  url.searchParams.set("client_id", process.env[def.oauth.clientIdEnv] as string);
  url.searchParams.set("redirect_uri", redirectUri(origin, platform));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", def.oauth.scopes.join(" "));
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
