/**
 * Firebase Admin SDK for server-side operations (API routes only — never import
 * this from a client component).
 *
 * All server-side Firestore writes go through `adminDb()`. The Admin SDK
 * bypasses security rules, which is what lets the rules deny public writes to
 * tickets, merch orders, subscribers and rate limits.
 *
 * SETUP:
 * 1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 2. Add to .env.local and Vercel:
 *    FIREBASE_SERVICE_ACCOUNT=<contents of the JSON file, minified to one line>
 * 3. Never commit the service account JSON or the env var to git.
 *
 * There is deliberately no fallback: if FIREBASE_SERVICE_ACCOUNT is missing,
 * server routes fail loudly instead of silently using the public client SDK.
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "admin";

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set — server-side Firestore access is disabled.");
  }
  return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) }, APP_NAME);
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Verifies a Firebase ID token locally against Google's public keys.
 * Returns the verified email address, or null if verification fails.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    return decoded.email ?? null;
  } catch (err) {
    console.error("[firebase-admin] verifyIdToken failed:", err);
    return null;
  }
}
