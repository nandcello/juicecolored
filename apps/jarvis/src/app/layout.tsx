import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Jarvis · Your home, in harmony",
  description: "A personal control room for your connected home.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111412",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
