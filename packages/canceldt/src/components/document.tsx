import type { ReactNode } from "react";
import Link from "next/link";
import { MotionShell } from "./motion-shell";

export function Document({
  children,
  bodyClassName,
}: Readonly<{ children: ReactNode; bodyClassName?: string }>) {
  return (
    <html lang="en">
      <body className={bodyClassName}>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <MotionShell>
          <header>
            <Link href="/canceldt" className="wordmark" aria-label="CANCELDT home">
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
              <Link prefetch={false} href="/canceldt/report">
                Report / correction
              </Link>
              <Link prefetch={false} href="/canceldt/admin">
                Admin
              </Link>
            </div>
          </footer>
        </MotionShell>
      </body>
    </html>
  );
}
