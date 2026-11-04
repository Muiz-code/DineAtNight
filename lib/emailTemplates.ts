/**
 * Saved vendor approval email templates (server-only, Firebase Admin SDK).
 * Firestore `email_templates/vendor_<package>`; no client rules, so only the
 * admin API reaches it. Falls back to DEFAULT_VENDOR_TEMPLATES until saved.
 */

import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import {
  DEFAULT_VENDOR_TEMPLATES,
  VENDOR_PACKAGES,
  type VendorEmailTemplate,
  type VendorPackage,
} from "./vendorEmailTemplates";

export type StoredVendorTemplate = VendorEmailTemplate & {
  package: VendorPackage;
  isDefault: boolean; // true = never edited (or reset)
  updatedAt: number | null;
  updatedBy: string | null;
};

const ref = (pkg: VendorPackage) => adminDb().collection("email_templates").doc(`vendor_${pkg}`);

export const MAX_TEMPLATE_LENGTH = { subject: 200, preview: 300, body: 20_000 };

export async function getVendorTemplate(pkg: VendorPackage): Promise<StoredVendorTemplate> {
  const snap = await ref(pkg).get();
  const d = snap.data();
  if (!d) {
    return { ...DEFAULT_VENDOR_TEMPLATES[pkg], package: pkg, isDefault: true, updatedAt: null, updatedBy: null };
  }
  return {
    subject: d.subject,
    preview: d.preview ?? "",
    body: d.body,
    package: pkg,
    isDefault: false,
    updatedAt: (d.updatedAt as Timestamp | undefined)?.toMillis() ?? null,
    updatedBy: d.updatedBy ?? null,
  };
}

export async function listVendorTemplates(): Promise<StoredVendorTemplate[]> {
  return Promise.all(VENDOR_PACKAGES.map(getVendorTemplate));
}

export async function saveVendorTemplate(pkg: VendorPackage, t: VendorEmailTemplate, by: string): Promise<void> {
  await ref(pkg).set({
    subject: t.subject,
    preview: t.preview,
    body: t.body,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: by,
  });
}

/** Back to the built-in wording. */
export async function resetVendorTemplate(pkg: VendorPackage): Promise<void> {
  await ref(pkg).delete();
}

/** Validates a template from a request body; returns an error message or the clean template. */
export function parseTemplate(input: unknown): VendorEmailTemplate | string {
  const t = (input ?? {}) as Record<string, unknown>;
  const subject = typeof t.subject === "string" ? t.subject.trim() : "";
  const preview = typeof t.preview === "string" ? t.preview.trim() : "";
  const body = typeof t.body === "string" ? t.body.replace(/\r\n/g, "\n").trim() : "";
  if (!subject) return "Add a subject.";
  if (!body) return "Add the email text.";
  if (subject.length > MAX_TEMPLATE_LENGTH.subject) return "Subject is too long.";
  if (preview.length > MAX_TEMPLATE_LENGTH.preview) return "Preview line is too long.";
  if (body.length > MAX_TEMPLATE_LENGTH.body) return "Email text is too long.";
  return { subject, preview, body };
}

export const isVendorPackage = (v: unknown): v is VendorPackage =>
  VENDOR_PACKAGES.includes(v as VendorPackage);
