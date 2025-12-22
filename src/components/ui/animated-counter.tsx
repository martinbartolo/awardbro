"use client";

import { useEffect, useRef } from "react";

import {
  animate,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";

export function AnimatedCounter({
  target,
  suffix,
}: {
  target: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, latest => Math.round(latest));
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, target, {
        duration: 1.5,
        ease: "easeOut",
      });
      return controls.stop;
    }
  }, [isInView, motionValue, target]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", latest => {
      if (ref.current) {
        ref.current.textContent = String(latest) + (suffix ?? "");
      }
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}
