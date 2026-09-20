// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import type { Id } from "@personal/convex/dataModel";

import { RecentlyEatenThumbnails } from "./recently-eaten";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("switches between touch and hover thumbnails without changing hook order", () => {
  let onChange = () => {};
  const media = {
    matches: false,
    addEventListener: (_event: string, listener: () => void) => {
      onChange = listener;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => media);
  render(
    <RecentlyEatenThumbnails items={[{ _id: "food-1" as Id<"food">, imageUrl: "/meal.png" }]} />,
  );
  expect(screen.queryByRole("button", { name: "Recent meal photo" })).toBeNull();

  act(() => {
    media.matches = true;
    onChange();
  });
  expect(screen.getByRole("button", { name: "Recent meal photo" })).toBeTruthy();

  act(() => {
    media.matches = false;
    onChange();
  });
  expect(screen.queryByRole("button", { name: "Recent meal photo" })).toBeNull();
});
