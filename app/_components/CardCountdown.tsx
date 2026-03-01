"use client";

import { useState, useEffect, useCallback } from "react";

export const useCountdown = (target: Date | null) => {
  const calc = useCallback(() => {
    if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime()]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc()); // sync immediately when target changes
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
};

export default function CardCountdown({
  targetDate,
  color = "#FFFF00",
}: {
  targetDate: Date;
  color?: string;
}) {
  const cd = useCountdown(targetDate);

  if (targetDate.getTime() <= Date.now()) return null;

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
