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

export type VerifiedUser = {
  uid: string;
  email: string;
  name: string | null;
  isAdminClaim: boolean;
};

/**
 * Verifies a Firebase ID token locally against Google's public keys.
 * Returns the user, or null if the token is invalid.
 * Throws if the Admin SDK is not configured (so callers can report it).
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  const app = getAdminApp();
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    if (!decoded.email) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === "string" ? decoded.name : null,
      isAdminClaim: decoded.admin === true,
    };
  } catch (err) {
    console.error("[firebase-admin] verifyIdToken failed:", err);
    return null;
  }
}

/**
 * Sets or clears the `admin` custom claim that firestore.rules and
 * storage.rules check. ADMIN_EMAILS (Vercel) is the single source of truth;
 * /api/admin/session syncs this claim from it on every login.
 */
export async function setAdminClaim(uid: string, isAdmin: boolean): Promise<void> {
  const auth = getAuth(getAdminApp());
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims ?? {}) };
  if (isAdmin) claims.admin = true;
  else delete claims.admin;
  await auth.setCustomUserClaims(uid, claims);
}

/** Keeps the Firebase display name in step with the name given in ADMIN_EMAILS. */
export async function setDisplayName(uid: string, displayName: string): Promise<void> {
  await getAuth(getAdminApp()).updateUser(uid, { displayName });
}
