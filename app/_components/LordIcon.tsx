"use client";

import React from "react";

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
  return React.createElement("lord-icon", {
    src,
    trigger,
    colors,
    style: { width: size, height: size },
  });
}
