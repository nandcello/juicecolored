// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { useBookNavigation } from "./use-book-navigation";

function Book() {
  const { bookRef } = useBookNavigation(3);
  return (
    <main ref={bookRef}>
      <section />
      <section />
      <section />
    </main>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup(scrollable = true, current = 1) {
  const { container } = render(<Book />);
  const book = container.querySelector("main")!;
  Object.defineProperties(book, {
    clientWidth: { value: 1000 },
    offsetLeft: { value: 0 },
  });
  for (const [index, page] of Array.from(book.children).entries()) {
    Object.defineProperties(page, {
      clientHeight: { value: 500 },
      scrollHeight: { value: scrollable ? 1000 : 500 },
      offsetLeft: { value: index * 1000 },
    });
  }
  const scrollTo = vi.fn((options?: ScrollToOptions | number) => {
    book.scrollLeft = typeof options === "number" ? options : (options?.left ?? 0);
    fireEvent.scroll(book);
  });
  book.scrollTo = scrollTo;
  book.scrollLeft = current * 1000;
  fireEvent.scroll(book);
  const page = book.children[current] as HTMLElement;
  const wheel = (
    deltaY: number,
    pause = 16,
    extra: WheelEventInit & { momentum?: boolean } = {},
  ) => {
    vi.advanceTimersByTime(pause);
    const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true, ...extra });
    // jsdom does not yet implement the browser's momentum flag.
    if (extra.momentum !== undefined) {
      Object.defineProperty(event, "momentum", { value: extra.momentum });
    }
    return fireEvent(book, event);
  };
  return { page, wheel, scrollTo };
}

test.each([
  { direction: 1, start: 400, edge: 500, destination: 2000, name: "bottom" },
  { direction: -1, start: 100, edge: 0, destination: 0, name: "top" },
])("requires a fresh outward gesture at the $name", ({ direction, start, edge, destination }) => {
  const { page, wheel, scrollTo } = setup();
  page.scrollTop = start;
  expect(wheel(direction * 120)).toBe(true); // Native vertical scrolling is allowed.
  page.scrollTop = edge;
  // A long momentum tail must stay blocked even beyond the page-turn cooldown.
  for (let i = 0; i < 20; i++) {
    expect(wheel(direction * 20, 100)).toBe(false);
  }
  expect(scrollTo).not.toHaveBeenCalled();

  wheel(direction, 300);
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: destination, behavior: "instant" });
});

test("a fresh gesture toward the page content scrolls vertically instead of turning", () => {
  const { page, wheel, scrollTo } = setup();
  page.scrollTop = 500;
  expect(wheel(-120, 300)).toBe(true);
  expect(scrollTo).not.toHaveBeenCalled();
});

test("pages without vertical overflow turn once per gesture, even with long momentum", () => {
  const { wheel, scrollTo } = setup(false, 0);
  wheel(1);
  for (let i = 0; i < 20; i++) wheel(20, 100);
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 1000, behavior: "instant" });

  wheel(1, 300);
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 2000, behavior: "instant" });
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

test("zoom, horizontal scrolling, and zero vertical deltas do not turn pages", () => {
  const { wheel, scrollTo } = setup(false);
  expect(wheel(120, 300, { ctrlKey: true })).toBe(true);
  expect(wheel(120, 300, { deltaX: 200 })).toBe(true);
  expect(wheel(0, 300)).toBe(true);
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each([1, -1])(
  "a physical swipe interrupts native momentum immediately (direction %i)",
  (direction) => {
    const { page, wheel, scrollTo } = setup();
    page.scrollTop = 250;
    wheel(direction * 120, 16, { momentum: false });
    page.scrollTop = direction > 0 ? 500 : 0;
    wheel(direction * 80, 16, { momentum: true });
    wheel(direction * 60, 16, { momentum: true });
    expect(scrollTo).not.toHaveBeenCalled();

    // No idle gap or large delta required for the next actual finger movement.
    wheel(direction, 16, { momentum: false });
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      left: direction > 0 ? 2000 : 0,
      behavior: "instant",
    });
  },
);

test("native momentum cannot turn a page after a long gap or on a direction change", () => {
  const { page, wheel, scrollTo } = setup();
  page.scrollTop = 500;
  wheel(80, 500, { momentum: true });
  page.scrollTop = 0;
  wheel(-80, 500, { momentum: true });
  expect(scrollTo).not.toHaveBeenCalled();
});

test("native physical events within the same swipe do not use acceleration as a new gesture", () => {
  const { page, wheel, scrollTo } = setup();
  page.scrollTop = 250;
  wheel(100, 16, { momentum: false });
  page.scrollTop = 500;
  for (const delta of [80, 60, 40, 20, 40, 60]) wheel(delta, 16, { momentum: false });
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each([1, -1])(
  "fallback recognizes renewed movement during decay (direction %i)",
  (direction) => {
    const { page, wheel, scrollTo } = setup();
    page.scrollTop = 250;
    wheel(direction * 100);
    page.scrollTop = direction > 0 ? 500 : 0;
    for (const delta of [80, 60, 40, 20, 10]) wheel(direction * delta);
    expect(scrollTo).not.toHaveBeenCalled();
    wheel(direction * 24);
    expect(scrollTo).not.toHaveBeenCalled();
    wheel(direction * 36);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  },
);

test("fallback ignores an isolated momentum spike and small tail fluctuations", () => {
  const { page, wheel, scrollTo } = setup();
  page.scrollTop = 250;
  wheel(100);
  page.scrollTop = 500;
  for (const delta of [80, 60, 40, 20, 70, 18, 16, 14, 15, 13, 11, 12, 10, 1, 2, 1]) {
    wheel(delta);
  }
  expect(scrollTo).not.toHaveBeenCalled();
});
