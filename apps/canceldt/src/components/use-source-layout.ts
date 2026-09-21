"use client";

import { useLayoutEffect, useRef } from "react";

// FLIP just the source rows and add control. Read current visual positions so
// a second click can interrupt a transition without jumping to its old start.
export function useSourceLayout() {
  const container = useRef<HTMLFieldSetElement>(null);
  const positions = useRef(new Map<HTMLElement, number>());

  function capture(animate: boolean) {
    const elements = Array.from(
      container.current?.querySelectorAll<HTMLElement>("[data-source-layout]") ?? [],
    );
    const shouldMove = animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    positions.current = new Map(
      shouldMove ? elements.map((element) => [element, element.getBoundingClientRect().top]) : [],
    );
    for (const element of elements) {
      element.style.transition = "none";
      element.style.transform = "none";
    }
  }

  useLayoutEffect(() => {
    const offsets = Array.from(positions.current)
      .filter(([element]) => element.isConnected)
      .map(([element, top]) => [element, top - element.getBoundingClientRect().top] as const);
    positions.current.clear();
    if (!offsets.length) return;
    for (const [element, offset] of offsets) {
      element.style.transform = `translateY(${offset}px)`;
    }
    // Commit the inverted positions together before starting CSS transitions.
    container.current?.getBoundingClientRect();
    for (const [element] of offsets) {
      element.style.transition = "transform var(--motion-row) var(--ease-out)";
      element.style.transform = "none";
    }
  });

  return { container, capture };
}
