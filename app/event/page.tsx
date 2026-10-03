import EventClient from "./EventClient";
import { getPublicEvents, type SerializedEvent } from "@/lib/publicData";

// ISR: render on the server, cache the HTML, refresh at most once a minute.
// Live Firestore subscriptions on the client keep ticket counts up to date.
export const revalidate = 60;

export default async function EventPage() {
  let active: SerializedEvent[] | null = null;
  let past: SerializedEvent[] | null = null;
  try {
    ({ active, past } = await getPublicEvents());
  } catch (err) {
    // e.g. FIREBASE_SERVICE_ACCOUNT missing at build time — the client loads instead
    console.error("[/event] server render failed, falling back to client load:", err);
  }
  return <EventClient initialActive={active} initialPast={past} />;
}
