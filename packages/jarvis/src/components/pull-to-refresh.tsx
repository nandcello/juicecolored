"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";
import c from "./pull-to-refresh.module.css";

const REFRESH_DISTANCE = 120;
const INTERACTIVE =
  "a, button, input, select, textarea, summary, nav, [role='slider'], [contenteditable]:not([contenteditable='false'])";

export function PullToRefresh({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () =>
      displayMode.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const blocked = () => !!element.querySelector('dialog[open], [aria-busy="true"]');
    let gesture: { x: number; y: number; id: number; distance: number } | null = null;
    let reloading = false;

    function reset() {
      gesture = null;
      setDistance(0);
    }

    function start(event: TouchEvent) {
      reset();
      if (
        !isStandalone() ||
        reloading ||
        blocked() ||
        event.touches.length !== 1 ||
        window.scrollY > 0
      )
        return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(INTERACTIVE)) return;
      // A nested scroller must be at its own top as well as the document.
      for (let node: Element | null = target; node && node !== element; node = node.parentElement) {
        if (node.scrollTop > 0) return;
      }
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, id: touch.identifier, distance: 0 };
    }

    function move(event: TouchEvent) {
      if (!gesture) return;
      if (event.touches.length !== 1 || blocked() || window.scrollY > 0 || !event.cancelable) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const dy = touch.clientY - gesture.y;
      const dx = Math.abs(touch.clientX - gesture.x);
      if (touch.identifier !== gesture.id || dy < 0 || dx > dy) {
        reset();
        return;
      }
      // Cancel the first downward move so Safari does not take over with rubber-banding.
      // This listener must be non-passive; React's delegated touch listeners are passive.
      event.preventDefault();
      gesture.distance = dy;
      setDistance(dy);
    }

    function end(event: TouchEvent) {
      const shouldRefresh =
        gesture && gesture.distance >= REFRESH_DISTANCE && event.touches.length === 0 && !blocked();
      reset();
      if (shouldRefresh && !reloading) {
        reloading = true;
        setRefreshing(true);
        window.location.reload();
      }
    }

    const html = document.documentElement;
    const previousOverscroll = html.style.overscrollBehaviorY;
    function updateMode() {
      reset();
      // Suppress the browser's own refresh gesture only in the installed Jarvis app.
      html.style.overscrollBehaviorY = isStandalone() ? "none" : previousOverscroll;
    }
    updateMode();
    displayMode.addEventListener("change", updateMode);
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end, { passive: true });
    element.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      html.style.overscrollBehaviorY = previousOverscroll;
      displayMode.removeEventListener("change", updateMode);
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", reset);
    };
  }, []);

  const ready = distance >= REFRESH_DISTANCE;
  const visible = distance > 0 || refreshing;
  return (
    <div ref={root} className={c.root}>
      <div
        role="status"
        className={c.indicator}
        data-visible={visible}
        style={{ transform: `translate(-50%, ${visible ? Math.min(distance * 0.4, 64) : -80}px)` }}
      >
        {refreshing ? (
          <RefreshCw size={18} aria-hidden="true" />
        ) : (
          <ArrowDown size={18} aria-hidden="true" className={ready ? c.ready : undefined} />
        )}
        <span>
          {refreshing
            ? "Refreshing…"
            : visible
              ? ready
                ? "Release to refresh"
                : "Pull to refresh"
              : ""}
        </span>
      </div>
      {children}
    </div>
  );
}
