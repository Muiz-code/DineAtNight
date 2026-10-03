/**
 * Utility for logging admin actions to Firestore.
 * Import `logAdminAction` anywhere in the admin UI to record an activity.
 */

import { getAuthClient } from "./firebase";
import { createAdminLog } from "./firestore";

/** Maps known admin emails to their full names. */
export const ADMIN_NAME_MAP: Record<string, string> = {
  "admin@dineatnight.com":   "Admin",
  "tami@dineatnight.com":    "Tami Bolu",
  "temi@dineatnight.com":    "Temi Fagbemi",
  "ajibola@dineatnight.com": "Ajibola Ogunranti",
  "zena@dineatnight.com":    "Zena Giwa-Osagie",
};

export function getAdminName(email: string): string {
  return ADMIN_NAME_MAP[email.toLowerCase()] ?? email.split("@")[0];
}

/** The signed-in admin's email and display name (for archive/audit fields). */
export function currentAdmin(): { email: string; name: string } {
  const email = getAuthClient()?.currentUser?.email ?? "unknown";
  return { email, name: getAdminName(email) };
}

export async function logAdminAction(
  action: string,
  details: string,
  entity?: { type: string; id?: string; name?: string },
): Promise<void> {
  try {
    const auth = getAuthClient();
    const email = auth?.currentUser?.email;
    if (!email) return;
    await createAdminLog({
      adminEmail: email,
      adminName: getAdminName(email),
      action,
      details,
      entityType: entity?.type,
      entityId: entity?.id,
      entityName: entity?.name,
    });
  } catch {
    // Logging must never break the main flow
  }
}
