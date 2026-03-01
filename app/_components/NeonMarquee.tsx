"use client";

const ITEMS = [
  "Lagos After Dark",
  "Neon Nights",
  "Street Food",
  "Dine At Night",
  "Night Market",
  "After Dark",
  "Food & Culture",
  "Live Music",
];

// Two copies → translateX(-50%) = exactly one set width → seamless loop
// Defined outside the component so it is never re-created on render
const ALL_ITEMS = [...ITEMS, ...ITEMS];

export default function NeonMarquee() {

  return (
    <div
      className="relative z-10 py-2.5 overflow-hidden border-y"
      style={{
        borderColor: "rgba(255,255,0,0.12)",
        background: "rgba(0,0,0,0.97)",
      }}
    >
      <style>{`
        @keyframes dan-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .dan-marquee-track {
          animation: dan-marquee 28s linear infinite;
          will-change: transform;
        }
        @media (max-width: 767px) {
          .dan-marquee-track {
            animation-duration: 20s;
          }
        }
      `}</style>

      <div
        className="dan-marquee-track flex"
        style={{ width: "max-content" }}
      >
        {ALL_ITEMS.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-4 shrink-0 px-5"
          >
            <span
              className="text-[9px] font-bold tracking-[0.1em] uppercase"
              style={{
                color: i % 2 === 0 ? "#FFFF00" : "#FF3333",
                textShadow:
                  i % 2 === 0
                    ? "0 0 10px rgba(255,255,0,0.6)"
                    : "0 0 10px rgba(255,51,51,0.6)",
              }}
            >
              {item}
            </span>
            <span
              className="text-[7px]"
              style={{
                color: "#00FF41",
                textShadow: "0 0 8px rgba(0,255,65,0.9)",
              }}
            >
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
