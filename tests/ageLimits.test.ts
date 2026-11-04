import { describe, expect, it } from "vitest";
import { ageConfirmText, ageLimitLabel, allowedAgeRanges, hasAgeLimit, parseAgeLimit } from "@/lib/ageLimits";
import { TICKET_AGE_RANGES } from "@/lib/constants";

describe("age limits", () => {
  it("labels min-only, range and max-only limits", () => {
    expect(ageLimitLabel({ minAge: 18 })).toBe("18+");
    expect(ageLimitLabel({ minAge: 18, maxAge: 35 })).toBe("18–35");
    expect(ageLimitLabel({ maxAge: 35 })).toBe("up to 35");
    expect(ageLimitLabel({})).toBeNull();
    expect(hasAgeLimit({ minAge: null, maxAge: null })).toBe(false);
  });

  it("only offers age ranges that overlap the limit", () => {
    expect(allowedAgeRanges({})).toEqual([...TICKET_AGE_RANGES]);
    expect(allowedAgeRanges({ minAge: 25 })).toEqual(["25–34", "35–44", "45–54", "55+"]);
    expect(allowedAgeRanges({ minAge: 21 })).toContain("18–24"); // 21–24 still fits
    expect(allowedAgeRanges({ minAge: 18, maxAge: 30 })).toEqual(["18–24", "25–34"]);
    expect(allowedAgeRanges({ minAge: 60 })).toEqual(["55+"]);
  });

  it("words the confirmation for the limit", () => {
    expect(ageConfirmText({ minAge: 18 })).toMatch(/18 or older/);
    expect(ageConfirmText({ minAge: 18, maxAge: 35 })).toMatch(/aged 18–35/);
  });

  it("validates admin input", () => {
    expect(parseAgeLimit("18", "")).toEqual({ minAge: 18, maxAge: null });
    expect(parseAgeLimit("", "")).toEqual({ minAge: null, maxAge: null });
    expect(parseAgeLimit("30", "18")).toMatch(/can't be higher/);
    expect(parseAgeLimit("17.5", "")).toMatch(/whole numbers/);
    expect(parseAgeLimit("0", "")).toMatch(/whole numbers/);
  });
});
