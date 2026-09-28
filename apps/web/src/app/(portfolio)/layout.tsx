import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";

import { AppConvexProvider } from "#/lib/convex-provider";

import "./globals.css";

export { metadata } from "#/lib/site-metadata";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-screen bg-[#fafaf7] font-sans text-[#101010] antialiased [text-rendering:optimizeLegibility]">
        <AppConvexProvider>{children}</AppConvexProvider>
        <Analytics />
      </body>
    </html>
  );
}
