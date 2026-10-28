import GalleryClient from "./GalleryClient";
import { getPublicGallery, type SerializedGalleryItem } from "@/lib/publicData";
import { newSeed } from "@/lib/random";

// ISR: render on the server, cache the HTML, refresh at most once a minute.
export const revalidate = 60;

export default async function GalleryPage() {
  let items: SerializedGalleryItem[] | null = null;
  try {
    items = await getPublicGallery();
  } catch (err) {
    console.error("[/gallery] server render failed, falling back to client load:", err);
  }
  return <GalleryClient initialItems={items} seed={newSeed()} />;
}
