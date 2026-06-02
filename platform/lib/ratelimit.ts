// --------------------------------------------------------------------------
// Rate limiting + a global daily AI-call cap.
//
// Uses Upstash Redis when configured (works across serverless instances). When
// not configured, falls back to an in-memory limiter — fine for local dev and
// a single instance, and a no-cost safety net. This is the precursor to the
// per-account credit system in the full platform.
// --------------------------------------------------------------------------

const PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 20);
const DAILY_CAP = Number(process.env.DAILY_GLOBAL_CAP || 2000);

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// ---- In-memory fallback ----
const ipHits = new Map<string, { count: number; resetAt: number }>();
let dailyCount = 0;
let dailyResetAt = startOfNextDay();

function startOfNextDay(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

async function upstash(command: unknown[]): Promise<{ result: unknown }> {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  return res.json();
}

export interface LimitResult {
  ok: boolean;
  reason?: "rate" | "daily";
}

/** Per-IP sliding-ish window (fixed 60s window) + global daily cap. */
export async function checkLimits(ip: string): Promise<LimitResult> {
  if (hasUpstash) {
    try {
      const minuteKey = `nrm:rl:${ip}:${Math.floor(Date.now() / 60_000)}`;
      const dayKey = `nrm:rl:day:${new Date().toISOString().slice(0, 10)}`;

      const [{ result: minuteCount }] = await Promise.all([
        upstash(["INCR", minuteKey]),
      ]);
      await upstash(["EXPIRE", minuteKey, "60"]);
      if (Number(minuteCount) > PER_MINUTE) return { ok: false, reason: "rate" };

      const { result: dayVal } = await upstash(["INCR", dayKey]);
      await upstash(["EXPIRE", dayKey, "86400"]);
      if (Number(dayVal) > DAILY_CAP) return { ok: false, reason: "daily" };

      return { ok: true };
    } catch (err) {
      console.error("[ratelimit] upstash error, allowing request:", err);
      return { ok: true };
    }
  }

  // In-memory fallback.
  const now = Date.now();
  if (now > dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = startOfNextDay();
  }
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count += 1;
    if (entry.count > PER_MINUTE) return { ok: false, reason: "rate" };
  }

  dailyCount += 1;
  if (dailyCount > DAILY_CAP) return { ok: false, reason: "daily" };

  return { ok: true };
}

// ---- Scan cache (by domain) ----
const memCache = new Map<string, { value: string; expiresAt: number }>();
const SCAN_TTL_SECONDS = 60 * 60 * 6; // 6h — sites rarely change hour-to-hour

export async function cacheGet(key: string): Promise<string | null> {
  if (hasUpstash) {
    try {
      const { result } = await upstash(["GET", `nrm:scan:${key}`]);
      return (result as string) ?? null;
    } catch {
      return null;
    }
  }
  const entry = memCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value;
}

export async function cacheSet(key: string, value: string): Promise<void> {
  if (hasUpstash) {
    try {
      await upstash(["SET", `nrm:scan:${key}`, value, "EX", String(SCAN_TTL_SECONDS)]);
    } catch {
      /* best-effort */
    }
    return;
  }
  memCache.set(key, { value, expiresAt: Date.now() + SCAN_TTL_SECONDS * 1000 });
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || "0.0.0.0";
}
