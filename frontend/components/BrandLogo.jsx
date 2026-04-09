"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** आत्मनिर्भर भारत — official mark + BharatPulse product branding */
const SIZE_CLASS = {
  sm: "h-8 max-h-8",
  md: "h-9 max-h-9",
  lg: "h-11 max-h-11",
  /** Fits inside orbit hub (h-28) without clipping */
  orbit: "h-[2.65rem] max-h-[2.65rem] max-w-[5.5rem]",
};

export function BrandLogo({ size = "md", className, priority = false }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <Image
        src="/logo-atmanirbhar.png"
        alt="आत्मनिर्भर भारत"
        width={1024}
        height={780}
        priority={priority}
        sizes="(max-width: 768px) 160px, 220px"
        className={cn(
          SIZE_CLASS[size] ?? SIZE_CLASS.md,
          "w-auto object-contain object-left",
          className
        )}
      />
    </span>
  );
}
