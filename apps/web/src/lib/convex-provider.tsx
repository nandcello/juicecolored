"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const hasConvexUrl = Boolean(convexUrl);

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AppConvexProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return children;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
