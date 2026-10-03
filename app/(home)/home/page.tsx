import HomeClient from "./HomeClient";
import {
  getPublicEvents,
  getPublicGallery,
  getPublicVendors,
  type SerializedEvent,
  type SerializedGalleryItem,
} from "@/lib/publicData";
import { newSeed } from "@/lib/random";
import type { PublicVendor } from "@/lib/firestore";

// ISR: render on the server, cache the HTML, refresh at most once a minute.
export const revalidate = 60;

/** Home only shows a handful of gallery items, picked from the most recent ones. */
const HOME_GALLERY_LIMIT = 60;

/** Each section loads independently; a failed read leaves that section to load in the browser. */
async function attempt<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (err) {
    console.error(`[/home] server read failed (${label}), falling back to client load:`, err);
    return null;
  }
}

export default async function HomePage() {
  const [events, vendors, gallery] = await Promise.all([
    attempt("events", getPublicEvents),
    attempt<PublicVendor[]>("vendors", getPublicVendors),
    attempt<SerializedGalleryItem[]>("gallery", () => getPublicGallery(HOME_GALLERY_LIMIT)),
  ]);
  const active: SerializedEvent[] | null = events?.active ?? null;
  const past: SerializedEvent[] | null = events?.past ?? null;

  return (
    <HomeClient
      initialActive={active}
      initialPast={past}
      initialVendors={vendors}
      initialGallery={gallery}
      seed={newSeed()}
    />
  );
}
