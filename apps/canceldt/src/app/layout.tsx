import type { Metadata } from "next";
import Link from "next/link";
import { socialImage } from "@/lib/metadata";
import { MotionShell } from "@/components/motion-shell";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "CANCELDT. — Check the list.", template: "%s · CANCELDT." },
  description: "A name, a reason, and the deets. Search CANCELDT’s curated published list.",
  openGraph: { images: [socialImage] },
  twitter: { card: "summary_large_image", images: [socialImage] },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <MotionShell>
          <header>
            <Link href="/" className="wordmark" aria-label="CANCELDT home">
              CANCELDT<span>.</span>
            </Link>
          </header>
          <main id="main">
            <noscript>
              <p>
                <a href="/canceldt/lookup">Open the list and search without JavaScript →</a>
              </p>
            </noscript>
            {children}
          </main>
          <footer>
            <span>A curated list. Not universal consensus.</span>
            <div>
              <Link prefetch={false} href="/report">
                Report / correction
              </Link>
              <Link prefetch={false} href="/admin">
                Admin
              </Link>
            </div>
          </footer>
        </MotionShell>
      </body>
    </html>
  );
}
