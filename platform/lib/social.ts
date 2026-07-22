import crypto from "crypto";
import type { SocialConnection } from "./db";
import { decryptSecret } from "./crypto";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

// ---------------------------------------------------------------------------
// OAuth state — a short signed token round-tripped through the provider so the
// callback can trust which user/platform/handle initiated the flow.
// ---------------------------------------------------------------------------

export function signOAuthState(payload: { userId: string; platform: string; handle: string }): string {
  const body = Buffer.from(JSON.stringify({ ...payload, t: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string | null): { userId: string; platform: string; handle: string } | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (Date.now() - parsed.t > 1000 * 60 * 15) return null; // 15 min window
    return { userId: parsed.userId, platform: parsed.platform, handle: parsed.handle };
  } catch {
    return null;
  }
}

export function redirectUri(origin: string, platform: string): string {
  return `${origin}/api/integrations/callback/${platform}`;
}

// ---------------------------------------------------------------------------
// Strip secrets before a connection is ever sent to the browser. Access/refresh
// tokens and provider account ids stay server-side only.
// ---------------------------------------------------------------------------

export function publicConnection(c: SocialConnection): SocialConnection {
  const { accessToken, refreshToken, tokenExpiresAt, providerAccountId, ...safe } = c;
  void accessToken;
  void refreshToken;
  void tokenExpiresAt;
  void providerAccountId;
  return safe;
}

export function publicConnections(list: SocialConnection[]): SocialConnection[] {
  return list.map(publicConnection);
}

/** True only for connections established through a real OAuth callback. */
export function isVerifiedConnection(c: SocialConnection): boolean {
  if (c.authMethod !== "oauth") return false;
  if (!c.accessToken || !c.providerAccountId) return false;
  const token = decryptSecret(c.accessToken);
  if (!token || token.startsWith("mock_")) return false;
  return true;
}

/** Drop manual / mock connections so the UI never shows a fake "Connected" state. */
export function sanitizeConnections(list: SocialConnection[]): SocialConnection[] {
  return list.filter(isVerifiedConnection);
}

export function appOrigin(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
