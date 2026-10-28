/**
 * Deterministic shuffle for server-rendered pages.
 *
 * Math.random() during render gives the server and the browser different
 * results, which breaks hydration. Pages that pick "random" items instead
 * shuffle with a seed chosen on the server and passed to the client, so both
 * sides produce the same order. (ISR re-renders the page about once a minute,
 * so the selection still changes over time.)
 */

/** mulberry32 — small, fast, good-enough PRNG for shuffling UI content. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a shuffled copy of `items` (Fisher–Yates) using `seed`. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A new seed for each server render. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
