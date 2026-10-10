import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Jarvis · Home control",
  description: "A personal control room for your connected home.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Jarvis", statusBarStyle: "default" },
  // Next emits the standard tag; iOS 17 also needs this legacy tag for standalone launch.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f5",
};
