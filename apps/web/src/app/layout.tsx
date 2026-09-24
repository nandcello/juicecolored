import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppConvexProvider } from "#/lib/convex-provider";

import "./globals.css";

const siteUrl = "https://juicecolored.com";
const siteTitle = "Niño Mollaneda | JuiceColored";
const siteDescription = "Thoughtful web apps, product systems, and useful tools by Niño Mollaneda.";
const ogImageUrl = "https://u87gtvu295.ufs.sh/f/mqA1Bp30wBSQORFFqRGdzqpZveMfBuro8yLwXgIcQ9YsF2PU";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Niño Mollaneda portfolio preview for JuiceColored",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

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
