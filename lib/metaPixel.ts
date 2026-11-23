/**
 * Meta (Facebook/Instagram) Pixel — measures which Meta ads lead to ticket sales.
 *
 * Off unless NEXT_PUBLIC_META_PIXEL_ID is set (Events Manager → Data sources →
 * the pixel → its ID). The script itself is loaded by app/_components/MetaPixel.tsx;
 * these helpers are safe to call anywhere — they do nothing when the pixel is off,
 * still loading, or blocked by an ad blocker.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";

/** Pages the pixel never runs on: the admin panel and the gate scanner. */
export function isUntrackedPath(pathname: string | null): boolean {
  return !!pathname && (pathname.startsWith("/admin") || pathname.startsWith("/scan"));
}

type Fbq = ((command: "track" | "init", nameOrId: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

function fbq(): Fbq | null {
  if (typeof window === "undefined" || !META_PIXEL_ID) return null;
  return (window as PixelWindow).fbq ?? null;
}

/**
 * Meta's standard base code, as a function: sets up `fbq` (which queues calls
 * until Meta's script arrives), loads the script and initialises the pixel.
 * Runs once; later calls do nothing.
 */
export function installMetaPixel(): void {
  if (typeof window === "undefined" || !META_PIXEL_ID) return;
  const w = window as PixelWindow;
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as unknown as Fbq;
  w.fbq = n;
  w._fbq ??= n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  n("init", META_PIXEL_ID);
}

/**
 * Sends a standard Meta event. `eventId` lets Meta drop duplicates of the same
 * event (e.g. a Purchase fired twice for one payment reference).
 */
export function trackMetaEvent(
  name: "PageView" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase",
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  try {
    if (typeof window === "undefined" || isUntrackedPath(window.location.pathname)) return;
    // Don't depend on MetaPixel's effect having run first — install on demand (no-op once installed)
    installMetaPixel();
    const f = fbq();
    if (!f) return;
    if (eventId) f("track", name, params ?? {}, { eventID: eventId });
    else if (params) f("track", name, params);
    else f("track", name);
  } catch (err) {
    // Tracking must never break checkout
    console.error("[meta-pixel] track failed:", err);
  }
}
