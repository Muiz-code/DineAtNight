/**
 * Utility for logging admin actions to Firestore.
 * Import `logAdminAction` anywhere in the admin UI to record an activity.
 *
 * Admin names come from the Firebase account's display name, which
 * /api/admin/session keeps in sync with ADMIN_EMAILS (`Full Name <email>`).
 * There is no admin list in client code.
 */

import type { User } from "firebase/auth";
import { getAuthClient } from "./firebase";
import { createAdminLog } from "./firestore";

/** Display name for an admin: their Firebase display name, else the email's local part. */
export function adminDisplayName(user: Pick<User, "displayName" | "email"> | null | undefined): string {
  return user?.displayName?.trim() || user?.email?.split("@")[0] || "Admin";
}

/** The signed-in admin's email and display name (for archive/audit fields). */
export function currentAdmin(): { email: string; name: string } {
  const user = getAuthClient()?.currentUser;
  return { email: user?.email ?? "unknown", name: adminDisplayName(user) };
}

export async function logAdminAction(
  action: string,
  details: string,
  entity?: { type: string; id?: string; name?: string },
): Promise<void> {
  try {
    const user = getAuthClient()?.currentUser;
    if (!user?.email) return;
    await createAdminLog({
      adminEmail: user.email,
      adminName: adminDisplayName(user),
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
