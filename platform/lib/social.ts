import crypto from "crypto";
import type { SocialConnection } from "./db";
import type { ConnectionCapability, PlatformDef } from "./platforms";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

// ---------------------------------------------------------------------------
// Mocked provider metrics. Once real OAuth tokens exist, these functions are
// where we'd call the provider's analytics API instead of synthesising values.
// They are deterministic per (handle, platform) so the numbers feel stable.
// ---------------------------------------------------------------------------

function seeded(seed: string): number {
  const h = crypto.createHash("sha256").update(seed).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

export function mockAudienceSize(platform: string, handle: string): number {
  const base = seeded(`${platform}:${handle}`);
  return Math.round(800 + base * 240000);
}

export function mockProviderAccountId(platform: string, handle: string): string {
  return `${platform}_${crypto.createHash("sha1").update(`${platform}:${handle}`).digest("hex").slice(0, 16)}`;
}

/** Build a fresh connection record for a manual (non-OAuth) link. */
export function buildManualConnection(
  def: PlatformDef,
  handle: string,
  capabilities: ConnectionCapability[],
): SocialConnection {
  const now = new Date().toISOString();
  const finalHandle = handle.trim() || def.sampleHandle;
  return {
    platform: def.id,
    handle: finalHandle,
    connectedAt: now,
    capabilities: capabilities.length ? capabilities : def.capabilities,
    providerAccountId: mockProviderAccountId(def.id, finalHandle),
    accessToken: `mock_${crypto.randomBytes(18).toString("hex")}`,
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
    lastSyncedAt: now,
    audienceSize: mockAudienceSize(def.id, finalHandle),
  };
}

/** Re-pull "analytics" for a connection — refreshes audience + sync time. */
export function refreshConnectionMetrics(conn: SocialConnection): SocialConnection {
  const drift = (seeded(`${conn.platform}:${conn.handle}:${Date.now() % 7}`) - 0.5) * 0.06;
  const base = conn.audienceSize ?? mockAudienceSize(conn.platform, conn.handle);
  return {
    ...conn,
    audienceSize: Math.max(0, Math.round(base * (1 + drift))),
    lastSyncedAt: new Date().toISOString(),
  };
}

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
