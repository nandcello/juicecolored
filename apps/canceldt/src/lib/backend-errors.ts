// Convex can be externalized by Next while its value helpers are bundled.
// Its global symbol remains stable across those module instances.
export function convexMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return;
  const value = error as Record<PropertyKey, unknown>;
  if (value[Symbol.for("ConvexError")] === true && typeof value.data === "string")
    return value.data;
}
