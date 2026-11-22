import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";

import "#/components/cuppy/cuppy.css";

// Archivo (SIL OFL 1.1) stands in for the brand's unlicensed display face; its
// width axis gives the extra-wide caps the Cuppy site uses.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://juicecolored.com"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#C397C4",
};

export default function CuppyLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="cuppy-body">{children}</body>
    </html>
  );
}
