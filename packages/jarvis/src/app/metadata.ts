import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Jarvis · Home control",
  description: "A personal control room for your connected home.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f5",
};
