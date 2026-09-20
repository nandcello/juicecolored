import { useCallback, useEffect, useRef, useState } from "react";
import { createWheelGestureTracker } from "./wheel-gesture";

export function useBookNavigation(pageCount: number) {
  const bookRef = useRef<HTMLElement>(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);

  const go = useCallback((index: number) => {
    const book = bookRef.current;
    if (!book) return;
    const next = Math.max(0, Math.min(book.children.length - 1, index));
    const page = book.children[next] as HTMLElement;
    book.scrollTo({
      left: page.offsetLeft - book.offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    setContentsOpen(false);
    // Move focus out of a spread or contents panel that is about to become inert.
    if (document.activeElement?.closest("#contents")) {
      document.getElementById("contents-button")?.focus();
    } else if (book.contains(document.activeElement)) {
      book.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const update = () => {
      const next = Math.max(
        0,
        Math.min(pageCount - 1, Math.round(book.scrollLeft / book.clientWidth)),
      );
      currentRef.current = next;
      setCurrent(next);
    };
    const resize = () => {
      book.scrollTo({ left: currentRef.current * book.clientWidth, behavior: "instant" });
    };
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]") || event.altKey || event.ctrlKey || event.metaKey)
        return;
      if (
        event.target instanceof Element &&
        event.target.closest("input,textarea,select,[contenteditable=true]")
      )
        return;
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        go(
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? pageCount - 1
              : currentRef.current + (event.key === "ArrowRight" ? 1 : -1),
        );
      }
      if (event.key === "Escape") {
        setContentsOpen(false);
        document.getElementById("contents-button")?.focus();
      }
    };
    const trackGesture = createWheelGestureTracker();
    let gestureConsumed = false;
    let lastTurn = -Infinity;
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.deltaY === 0 ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        document.querySelector("dialog[open]")
      )
        return;
      const now = Date.now();
      const direction = Math.sign(event.deltaY);
      const { isNewGesture, isMomentum } = trackGesture(event, now);
      if (isNewGesture) gestureConsumed = false;
      const page = book.children[currentRef.current] as HTMLElement;
      const down = event.deltaY > 0;
      const canScroll = down
        ? page.scrollTop + page.clientHeight < page.scrollHeight - 3
        : page.scrollTop > 3;
      if (
        canScroll ||
        (down && currentRef.current === pageCount - 1) ||
        (!down && currentRef.current === 0)
      ) {
        gestureConsumed = true;
        return;
      }
      event.preventDefault();
      if (isMomentum) {
        gestureConsumed = true;
        return;
      }
      if (gestureConsumed) return;
      gestureConsumed = true;
      if (now - lastTurn < 900) return;
      go(currentRef.current + direction);
      lastTurn = now;
    };
    book.addEventListener("scroll", update, { passive: true });
    book.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", keydown);
    update();
    return () => {
      book.removeEventListener("scroll", update);
      book.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", keydown);
    };
  }, [go, pageCount]);

  return { bookRef, current, contentsOpen, setContentsOpen, go };
}
