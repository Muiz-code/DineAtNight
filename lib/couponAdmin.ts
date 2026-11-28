/**
 * Admin management of coupon campaigns (server-only, Firebase Admin SDK).
 * Used by /api/admin/coupons*. Rules for using a code live in lib/coupons.ts;
 * redemption happens in lib/payments.ts.
 */

import crypto from "crypto";
import { adminDb } from "./firebase-admin";
import type { DanEvent } from "./firestore";
import { couponKey, isCouponKey, type CouponCampaign, type CouponCodeDoc, type CouponKind } from "./coupons";

/** One transaction creates the campaign and all its codes (Firestore allows 500 writes). */
export const MAX_UNIQUE_CODES = 400;
export const MAX_SHARED_USES = 10_000;

// No 0/O, 1/I/L look-alikes: codes are read off a card or a message and typed in
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6; // 31^6 ≈ 887 million combinations per code

function randomCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `DAN-${s}`;
}

export type NewCampaignInput = {
  name?: unknown;
  eventId?: unknown;
  percentOff?: unknown;
  kind?: unknown;
  codeCount?: unknown; // unique codes
  sharedCode?: unknown; // shared code, as typed by the admin
  maxUses?: unknown; // shared code use limit
  tiers?: unknown;
  expiresAt?: unknown; // ms or null
};

// A function declaration (not an arrow) so TypeScript narrows after `if (...) fail(...)`
function fail(message: string): never {
  throw new Error(message);
}

/** Validates and creates a campaign with its codes. Throws plain-language errors. */
export async function createCouponCampaign(input: NewCampaignInput, createdBy: string): Promise<CouponCampaign> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) fail("Give the campaign a name (2–80 characters).");
  if (typeof input.eventId !== "string" || !input.eventId || input.eventId.includes("/")) fail("Choose an event.");
  const eventId = input.eventId as string;
  const percentOff = Number(input.percentOff);
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) fail("Percentage off must be a whole number from 1 to 100.");
  const kind = input.kind === "shared" ? "shared" : input.kind === "unique" ? "unique" : fail("Choose unique codes or one shared code.");

  const expiresAt = input.expiresAt == null ? null : Number(input.expiresAt);
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) fail("The expiry date must be in the future.");

  const db = adminDb();
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) fail("That event no longer exists.");
  const event = eventSnap.data() as DanEvent;
  const eventTiers = (event.ticketTypes ?? []).map((t) => t.name);
  const tiers = Array.isArray(input.tiers) ? [...new Set(input.tiers.filter((t): t is string => typeof t === "string"))] : [];
  if (tiers.some((t) => !eventTiers.includes(t))) fail("One of the chosen ticket types isn't on this event any more.");

  // The codes to create: key (lookup id) → display code
  let codes: { key: string; code: string }[];
  let maxUsesTotal: number;
  let maxUsesPerCode: number;
  if (kind === "unique") {
    const count = Number(input.codeCount);
    if (!Number.isInteger(count) || count < 1 || count > MAX_UNIQUE_CODES) fail(`Number of codes must be from 1 to ${MAX_UNIQUE_CODES}.`);
    const set = new Map<string, string>();
    while (set.size < count) {
      const code = randomCode();
      set.set(couponKey(code), code);
    }
    codes = [...set].map(([key, code]) => ({ key, code }));
    maxUsesTotal = count;
    maxUsesPerCode = 1;
  } else {
    const typed = typeof input.sharedCode === "string" ? input.sharedCode.trim().toUpperCase() : "";
    const key = couponKey(typed);
    if (!isCouponKey(key) || key.length > 20) fail("The code must be 4–20 letters or numbers.");
    const uses = Number(input.maxUses);
    if (!Number.isInteger(uses) || uses < 1 || uses > MAX_SHARED_USES) fail(`Total uses must be from 1 to ${MAX_SHARED_USES.toLocaleString()}.`);
    codes = [{ key, code: typed }];
    maxUsesTotal = uses;
    maxUsesPerCode = uses;
  }

  const campaignRef = db.collection("coupon_campaigns").doc();
  const campaign: CouponCampaign = {
    name,
    eventId,
    eventTitle: event.title,
    percentOff,
    kind: kind as CouponKind,
    codeCount: codes.length,
    maxUsesTotal,
    tiers,
    expiresAt,
    active: true,
    redeemedCount: 0,
    createdAt: Date.now(),
    createdBy,
  };

  await db.runTransaction(async (tx) => {
    const existing = await Promise.all(codes.map((c) => tx.get(db.collection("coupon_codes").doc(c.key))));
    const taken = existing.filter((s) => s.exists).map((s) => s.id);
    if (taken.length) {
      // A random clash is ~1 in a million; a shared code may simply be in use already
      fail(kind === "shared" ? `The code ${codes[0].code} is already used by another campaign.` : "Some generated codes clashed with existing ones. Please try again.");
    }
    tx.set(campaignRef, campaign);
    codes.forEach((c, i) => {
      const doc: CouponCodeDoc = {
        code: c.code,
        campaignId: campaignRef.id,
        number: i + 1,
        maxUses: maxUsesPerCode,
        redeemed: 0,
        holds: {},
        redemptions: [],
      };
      tx.create(db.collection("coupon_codes").doc(c.key), doc);
    });
  });
  return { ...campaign, id: campaignRef.id };
}

export async function listCouponCampaigns(): Promise<CouponCampaign[]> {
  const snap = await adminDb().collection("coupon_campaigns").get();
  return snap.docs
    .map((d) => ({ ...(d.data() as CouponCampaign), id: d.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCouponCampaign(id: string): Promise<{ campaign: CouponCampaign; codes: CouponCodeDoc[] } | null> {
  if (!id || id.includes("/")) return null;
  const db = adminDb();
  const snap = await db.collection("coupon_campaigns").doc(id).get();
  if (!snap.exists) return null;
  const codesSnap = await db.collection("coupon_codes").where("campaignId", "==", id).get();
  const codes = codesSnap.docs.map((d) => d.data() as CouponCodeDoc).sort((a, b) => a.number - b.number);
  return { campaign: { ...(snap.data() as CouponCampaign), id }, codes };
}

/**
 * Pause/resume, rename or change the expiry. The percentage off and the codes
 * are fixed once created, so every ticket's coupon record stays accurate.
 */
export async function updateCouponCampaign(id: string, input: { name?: unknown; active?: unknown; expiresAt?: unknown }): Promise<void> {
  const update: Partial<CouponCampaign> = {};
  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length < 2 || name.length > 80) fail("Give the campaign a name (2–80 characters).");
    update.name = name;
  }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") fail("Invalid request.");
    update.active = input.active as boolean;
  }
  if (input.expiresAt !== undefined) {
    const expiresAt = input.expiresAt === null ? null : Number(input.expiresAt);
    if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) fail("The expiry date must be in the future.");
    update.expiresAt = expiresAt;
  }
  if (!Object.keys(update).length) fail("Nothing to change.");
  const ref = adminDb().collection("coupon_campaigns").doc(id);
  if (!id || id.includes("/") || !(await ref.get()).exists) fail("That campaign no longer exists.");
  await ref.update(update);
}
