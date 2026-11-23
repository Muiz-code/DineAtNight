"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackMetaEvent } from "@/lib/metaPixel";

/**
 * Loads the Meta Pixel and records a PageView on every page change (the site
 * navigates without full reloads, so Meta's snippet alone would only count the
 * first page). Does nothing when NEXT_PUBLIC_META_PIXEL_ID isn't set, and never
 * runs on admin / scanner pages.
 */
export default function MetaPixel() {
  const pathname = usePathname();

  // trackMetaEvent installs the pixel on first use and skips admin / scanner pages
  useEffect(() => {
    trackMetaEvent("PageView");
  }, [pathname]);

  return null;
}
