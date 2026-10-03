/**
 * Admin session cookie + HMAC helpers shared by proxy.ts and API routes.
 *
 * Cookie format: `email:expiry:hmac`
 * where hmac = HMAC-SHA256(email + ":" + expiry, SESSION_SECRET).
 *
 * Uses the Web Crypto API only, so it runs in both the proxy and Node routes.
 * Signature checks use `crypto.subtle.verify`, which is constant-time.
 */

import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "dan_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

const enc = new TextEncoder();

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "";
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/** HMAC-SHA256 of `data` as lowercase hex. Returns "" when SESSION_SECRET is unset. */
export async function hmacHex(data: string): Promise<string> {
  const secret = getSecret();
  if (!secret) return "";
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time check that `signatureHex` is the HMAC of `data`. */
export async function verifyHmacHex(data: string, signatureHex: string): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !/^[0-9a-f]{64}$/.test(signatureHex)) return false;
  const sigBytes = Uint8Array.from(signatureHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sigBytes, enc.encode(data));
  } catch {
    return false;
  }
}

/** Server-side admin allowlist. An empty ADMIN_EMAILS allows nobody. */
export function isAllowedAdmin(email: string): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function createSessionValue(email: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `${email}:${expiry}`;
  return `${payload}:${await hmacHex(payload)}`;
}

/** Returns the admin email if the cookie value is validly signed, unexpired and still allowlisted. */
export async function verifySessionValue(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const lastColon = cookieValue.lastIndexOf(":");
  if (lastColon === -1) return null;
  const payload = cookieValue.slice(0, lastColon);
  const signature = cookieValue.slice(lastColon + 1);

  const expiryColon = payload.lastIndexOf(":");
  if (expiryColon === -1) return null;
  const email = payload.slice(0, expiryColon);
  const expiry = Number(payload.slice(expiryColon + 1));
  if (!expiry || Date.now() / 1000 > expiry) return null;

  if (!(await verifyHmacHex(payload, signature))) return null;
  // Re-check the allowlist so removing an admin takes effect without waiting for expiry
  if (!isAllowedAdmin(email)) return null;
  return email;
}

/** Returns the verified admin email for this request, or null. */
export async function getAdminEmail(req: NextRequest): Promise<string | null> {
  return verifySessionValue(req.cookies.get(ADMIN_COOKIE)?.value);
}
