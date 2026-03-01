"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string };

export default function AdminTabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <div
      className="flex gap-1 overflow-x-auto scrollbar-hide border-b"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-shrink-0 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-px"
            style={{
              borderColor: active ? "#FFFF00" : "transparent",
              color: active ? "#FFFF00" : "rgba(255,255,255,0.35)",
              background: active ? "rgba(255,255,0,0.04)" : "transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
