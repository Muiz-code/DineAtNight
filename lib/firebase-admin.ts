/**
 * Firebase Admin SDK singleton for server-side operations.
 *
 * Used for cryptographic Firebase ID token verification in /api/admin/session.
 * The Admin SDK verifies tokens locally against Google's public keys — no
 * outbound network call required per verification.
 *
 * SETUP:
 * 1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 2. Download the JSON file
 * 3. Add to .env.local (and Vercel dashboard):
 *    FIREBASE_SERVICE_ACCOUNT=<contents of the JSON file, minified to one line>
 * 4. Never commit the service account JSON or the env var to git.
 *
 * If FIREBASE_SERVICE_ACCOUNT is not set, the module falls back to the
 * public REST API approach (existing behaviour — still validates tokens
 * but without local signature verification).
 */

import type { App } from "firebase-admin/app";

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return null;

  try {
    // Dynamic import keeps firebase-admin out of the client bundle entirely
    // (Next.js tree-shakes server-only imports that are never imported client-side)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    if (getApps().length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      adminApp = require("firebase-admin/app").getApp();
      return adminApp;
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = initializeApp({ credential: cert(serviceAccount) }, "admin");
    return adminApp;
  } catch (err) {
    console.error("[firebase-admin] Failed to initialise Admin SDK:", err);
    return null;
  }
}

/**
 * Verifies a Firebase ID token using the Admin SDK if available,
 * falling back to the Firebase REST API if the service account is not configured.
 * Returns the verified email address, or null if verification fails.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const app = getAdminApp();

  // ── Path A: Admin SDK (preferred) ────────────────────────────────────────
  if (app) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getAuth } = require("firebase-admin/auth");
      const decoded = await getAuth(app).verifyIdToken(idToken);
      return decoded.email ?? null;
    } catch (err) {
      console.error("[firebase-admin] verifyIdToken failed:", err);
      return null;
    }
  }

  // ── Path B: REST API fallback (no service account configured) ────────────
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    const data = await res.json();
    return (data?.users?.[0]?.email as string) ?? null;
  } catch {
    return null;
  }
}
