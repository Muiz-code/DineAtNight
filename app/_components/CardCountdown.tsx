"use client";

import { useState, useEffect } from "react";

type Countdown = { days: number; hours: number; minutes: number; seconds: number };
const ZERO: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function timeLeft(target: Date): Countdown | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/**
 * Time left until `target`. Starts at zero and only ticks after mount, so the
 * server-rendered HTML matches the first client render (no hydration mismatch).
 * `ended` is null until mounted, then true once the target has passed.
 */
export const useCountdown = (target: Date | null): Countdown & { ended: boolean | null } => {
  const [state, setState] = useState<{ time: Countdown; ended: boolean | null }>({ time: ZERO, ended: null });
  const targetMs = target?.getTime() ?? null;

  useEffect(() => {
    const tick = () => {
      const left = targetMs === null ? null : timeLeft(new Date(targetMs));
      setState({ time: left ?? ZERO, ended: left === null });
    };
    const first = setTimeout(tick, 0); // first tick right after mount
    const id = targetMs === null ? undefined : setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      if (id) clearInterval(id);
    };
  }, [targetMs]);

  return { ...state.time, ended: state.ended };
};

export default function CardCountdown({
  targetDate,
  color = "#FFFF00",
}: {
  targetDate: Date;
  color?: string;
}) {
  const cd = useCountdown(targetDate);

  // Hidden until mounted (ended === null) and once the date has passed
  if (cd.ended !== false) return null;

  const units = [
    { v: cd.days, l: "D" },
    { v: cd.hours, l: "H" },
    { v: cd.minutes, l: "M" },
    { v: cd.seconds, l: "S" },
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex flex-col items-center">
            <div
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold border"
              style={{
                borderColor: color,
                color,
                background: "rgba(0,0,0,0.6)",
                boxShadow: `0 0 8px ${color}33`,
              }}
            >
              {String(u.v).padStart(2, "0")}
            </div>
            <span className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">
              {u.l}
            </span>
          </div>
          {i < 3 && (
            <span className="text-gray-700 font-bold pb-3.5 text-[10px]">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
