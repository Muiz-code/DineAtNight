"use client";

interface LordIconProps {
  src?: string;
  trigger?: string;
  colors?: string;
  size?: number;
}

export default function LordIcon({
  src = "https://cdn.lordicon.com/hfjpsmya.json",
  trigger = "in",
  colors,
  size = 120,
}: LordIconProps) {
  return (
    <lord-icon
      src={src}
      trigger={trigger}
      colors={colors}
      style={{ width: size, height: size }}
    />
  );
}
