import { describe, expect, it } from "vitest";
import { convexMessage } from "../src/lib/backend-errors";
describe("Convex error messages across bundled and external modules", () => {
  it("recognizes the stable Convex marker without instanceof", () => {
    const error = Object.assign(new Error("internal request details"), {
      [Symbol.for("ConvexError")]: true,
      data: "Too many sign-in attempts. Try again in five minutes.",
    });
    expect(convexMessage(error)).toBe(error.data);
  });
  it("does not expose arbitrary server messages", () => {
    expect(convexMessage(new Error("secret configuration"))).toBeUndefined();
    expect(convexMessage({ data: "secret configuration" })).toBeUndefined();
  });
});
