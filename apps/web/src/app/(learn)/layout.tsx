import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { themeScript } from "#/components/learn/theme-script";
import "../(portfolio)/globals.css";
import "#/components/learn/theme.css";
import "#/components/learn/learn.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://juicecolored.com"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2e9" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1914" },
  ],
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="learn-body min-h-screen font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
