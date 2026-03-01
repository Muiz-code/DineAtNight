import { useEffect } from "react";

// Module-level counter so multiple overlays can each call useScrollLock(true)
// without one unmounting overlay resetting the scroll while another is still open.
let lockCount = 0;

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockCount++;
    document.body.style.overflow = "hidden";
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [active]);
}
