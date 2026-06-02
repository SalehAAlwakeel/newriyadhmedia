import crypto from "crypto";
import { cookies } from "next/headers";
import { findUserById, type User } from "./db";

// ---------------------------------------------------------------------------
// Self-contained auth: scrypt password hashing + an HMAC-signed session cookie.
//
// No external auth provider required to run. To upgrade to Auth.js/NextAuth or
// Clerk later, swap getCurrentUser() and the route handlers; the rest of the
// app only depends on getCurrentUser().
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "nrm_session";
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createToken(userId: string): string {
  const body = `${userId}.${Date.now()}`;
  const encoded = Buffer.from(body).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = Buffer.from(encoded, "base64url").toString();
    const [userId] = body.split(".");
    return userId || null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = verifyToken(token);
  if (!userId) return null;
  return findUserById(userId);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
