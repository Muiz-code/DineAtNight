/**
 * Thin localStorage cache with a 10-minute TTL.
 *
 * Usage:
 *   const cached = getCache<DanEvent[]>("dan_events");
 *   if (cached) setState(cached);
 *
 *   // after fetching fresh data:
 *   setCache("dan_events", freshData);
 *
 * Cache auto-evicts on read once TTL has passed.
 * Silently no-ops in SSR (no localStorage) and on quota errors.
 */

const TTL = 10 * 60 * 1000; // 10 minutes in ms

export function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Silently ignore — quota exceeded or private browsing restriction
  }
}

export function clearCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("[cache] clearCache failed for key:", key, e);
  }
}
