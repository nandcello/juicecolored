import { expect, test } from "vite-plus/test";

import { formatListeningAge } from "./listening";

test("formats recent listening time as just now", () => {
  expect(formatListeningAge(1_000, 15_000)).toBe("just now");
});

test("formats listening age in minutes, hours, and days", () => {
  const now = 4 * 24 * 60 * 60 * 1000;

  expect(formatListeningAge(now - 12 * 60 * 1000, now)).toBe("12m ago");
  expect(formatListeningAge(now - 3 * 60 * 60 * 1000, now)).toBe("3h ago");
  expect(formatListeningAge(now - 2 * 24 * 60 * 60 * 1000, now)).toBe("2d ago");
});
