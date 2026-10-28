import { describe, expect, it } from "vitest";
import { seededShuffle } from "@/lib/random";

const { escapeHtml } = await import("@/lib/resend");

describe("escapeHtml (email templates)", () => {
  it("neutralises HTML injected through form fields", () => {
    expect(escapeHtml(`<a href="https://evil">click</a> & 'x'`)).toBe(
      "&lt;a href=&quot;https://evil&quot;&gt;click&lt;/a&gt; &amp; &#39;x&#39;",
    );
  });
});

describe("seededShuffle", () => {
  it("is deterministic for a seed (server HTML matches hydration)", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
    expect(seededShuffle(items, 42)).not.toEqual(seededShuffle(items, 43));
  });

  it("returns a permutation and does not mutate the input", () => {
    const items = [1, 2, 3, 4, 5];
    const out = seededShuffle(items, 7);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
