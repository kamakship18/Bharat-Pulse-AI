"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  className = "",
  duration = 2.2,
  format = true,
  decimals = 0,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [isInView, value, duration]);

  let text;
  if (!format) {
    text = String(display);
  } else if (decimals > 0) {
    text = display.toFixed(decimals);
  } else {
    text = Math.round(display).toLocaleString("en-IN");
  }

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
