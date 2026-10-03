import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminNameFor,
  createSessionValue,
  getAdminList,
  isAllowedAdmin,
  verifySessionValue,
} from "@/lib/session";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "test-secret-that-is-long-enough-123456");
  vi.stubEnv("ADMIN_EMAILS", "Tami Bolu <Tami@DineAtNight.com>, admin@dineatnight.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("ADMIN_EMAILS parsing", () => {
  it("parses bare emails and `Name <email>` entries, case-insensitively", () => {
    expect(getAdminList()).toEqual([
      { email: "tami@dineatnight.com", name: "Tami Bolu" },
      { email: "admin@dineatnight.com", name: null },
    ]);
    expect(isAllowedAdmin("TAMI@dineatnight.com")).toBe(true);
    expect(adminNameFor("tami@dineatnight.com")).toBe("Tami Bolu");
    expect(isAllowedAdmin("someone@else.com")).toBe(false);
  });

  it("allows nobody when ADMIN_EMAILS is empty", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAllowedAdmin("admin@dineatnight.com")).toBe(false);
  });
});

describe("admin session cookie", () => {
  it("round-trips for an allowlisted admin", async () => {
    const cookie = await createSessionValue("admin@dineatnight.com");
    expect(await verifySessionValue(cookie)).toBe("admin@dineatnight.com");
  });

  it("rejects a tampered email or signature", async () => {
    const cookie = await createSessionValue("admin@dineatnight.com");
    const forgedEmail = cookie.replace("admin@", "tami@");
    expect(await verifySessionValue(forgedEmail)).toBeNull();
    const forgedSig = cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0");
    expect(await verifySessionValue(forgedSig)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await createSessionValue("admin@dineatnight.com");
    vi.stubEnv("SESSION_SECRET", "a-completely-different-secret-9876543210");
    expect(await verifySessionValue(cookie)).toBeNull();
  });

  it("rejects an expired cookie", async () => {
    const cookie = await createSessionValue("admin@dineatnight.com");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000); // 25h later
    expect(await verifySessionValue(cookie)).toBeNull();
  });

  it("stops working when the admin is removed from ADMIN_EMAILS", async () => {
    const cookie = await createSessionValue("admin@dineatnight.com");
    vi.stubEnv("ADMIN_EMAILS", "tami@dineatnight.com");
    expect(await verifySessionValue(cookie)).toBeNull();
  });

  it("rejects malformed values and an unset secret", async () => {
    expect(await verifySessionValue(undefined)).toBeNull();
    expect(await verifySessionValue("garbage")).toBeNull();
    expect(await verifySessionValue("a:b:c")).toBeNull();
    const cookie = await createSessionValue("admin@dineatnight.com");
    vi.stubEnv("SESSION_SECRET", "");
    expect(await verifySessionValue(cookie)).toBeNull();
  });
});
