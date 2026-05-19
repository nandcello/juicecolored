import { useEffect, useRef, useState } from "react";

import type { Id } from "@personal/convex/dataModel";
import type { PointerEvent as ReactPointerEvent } from "react";

export type RecentFoodItem = {
  _id: Id<"food">;
  imageUrl: string;
};

type CursorPoint = {
  x: number;
  y: number;
};

const PREVIEW_SIZE_PX = 168;
const CURSOR_OFFSET_PX = 20;
const FOLLOW_LERP = 0.12;

function getPreviewPosition(cursor: CursorPoint): CursorPoint {
  const { clientWidth, clientHeight } = document.documentElement;

  let x = cursor.x - PREVIEW_SIZE_PX / 2;
  let y = cursor.y - PREVIEW_SIZE_PX - CURSOR_OFFSET_PX;

  if (y < 0) {
    y = cursor.y + CURSOR_OFFSET_PX;
  }

  x = Math.min(Math.max(0, x), clientWidth - PREVIEW_SIZE_PX);
  y = Math.min(Math.max(0, y), clientHeight - PREVIEW_SIZE_PX);

  return { x, y };
}

function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCanHover() {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => {
      setCanHover(media.matches);
    };

    onChange();
    media.addEventListener("change", onChange);

    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  return canHover;
}

const thumbnailClassName = "relative inline-flex size-9 max-sm:size-32 shrink-0 overflow-hidden";

export function RecentlyEatenThumbnails({ items }: { items: RecentFoodItem[] }) {
  const canHover = useCanHover();

  if (!canHover) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 max-sm:gap-2 align-middle">
        {items.map((item) => (
          <span key={item._id} className={thumbnailClassName}>
            <img
              src={item.imageUrl}
              alt=""
              className="size-full object-contain"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
        ))}
      </span>
    );
  }

  const [activeItem, setActiveItem] = useState<RecentFoodItem | null>(null);
  const [previewPosition, setPreviewPosition] = useState<CursorPoint | null>(null);
  const cursorRef = useRef<CursorPoint | null>(null);
  const animatedPositionRef = useRef<CursorPoint | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeItem) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      animatedPositionRef.current = null;
      cursorRef.current = null;
      setPreviewPosition(null);
      return;
    }

    if (prefersReducedMotion()) {
      const sync = () => {
        if (cursorRef.current) {
          setPreviewPosition(getPreviewPosition(cursorRef.current));
        }

        frameRef.current = requestAnimationFrame(sync);
      };

      frameRef.current = requestAnimationFrame(sync);

      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    const tick = () => {
      const target = cursorRef.current;

      if (!target) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const current = animatedPositionRef.current ?? target;
      const next = {
        x: current.x + (target.x - current.x) * FOLLOW_LERP,
        y: current.y + (target.y - current.y) * FOLLOW_LERP,
      };

      animatedPositionRef.current = next;
      setPreviewPosition(getPreviewPosition(next));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [activeItem]);

  const updateCursor = (event: ReactPointerEvent<HTMLElement>) => {
    cursorRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    if (prefersReducedMotion()) {
      setPreviewPosition(getPreviewPosition(cursorRef.current));
    }
  };

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-1.5 max-sm:gap-2 align-middle">
        {items.map((item) => (
          <button
            key={item._id}
            type="button"
            className={`${thumbnailClassName} p-0 transition-transform duration-180 ease-out hover:-translate-y-px focus-visible:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101010]`}
            onPointerEnter={(event) => {
              animatedPositionRef.current = null;
              setActiveItem(item);
              updateCursor(event);
            }}
            onPointerMove={updateCursor}
            onPointerLeave={() => {
              setActiveItem(null);
              cursorRef.current = null;
            }}
            onFocus={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setActiveItem(item);
              cursorRef.current = {
                x: rect.left + rect.width / 2,
                y: rect.top,
              };
              if (prefersReducedMotion()) {
                setPreviewPosition(getPreviewPosition(cursorRef.current));
              }
            }}
            onBlur={() => {
              setActiveItem(null);
              cursorRef.current = null;
            }}
            aria-label="Recent meal photo"
          >
            <img
              src={item.imageUrl}
              alt=""
              className="size-full object-contain"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </button>
        ))}
      </span>

      {activeItem && previewPosition ? (
        <img
          src={activeItem.imageUrl}
          alt=""
          className="pointer-events-none fixed z-50 object-contain"
          style={{
            width: PREVIEW_SIZE_PX,
            height: PREVIEW_SIZE_PX,
            left: previewPosition.x,
            top: previewPosition.y,
          }}
          draggable={false}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
