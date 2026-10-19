import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, GitBranch } from "lucide-react";
import ThemeToggle from "#/components/learn/theme-toggle";

const title = "Learn | JuiceColored";
const description =
  "Interactive guides for understanding the tools and ideas behind good software.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://juicecolored.com/learn" },
  openGraph: { title, description, url: "https://juicecolored.com/learn" },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function LearnPage() {
  return (
    <div className="learn-page">
      <a className="skip-link" href="#guides">
        Skip to guides
      </a>
      <header>
        <Link href="/" className="learn-brand">
          JuiceColored<span>!</span>
        </Link>
        <div className="learn-header-actions">
          <Link href="/">
            <ArrowLeft size={16} /> Back to the portfolio
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="guides">
        <h1>
          A little more
          <br />
          <em>understanding.</em>
        </h1>
        <p className="learn-intro">
          Interactive field guides to the tools and ideas behind good software. Follow a connection.
          Read the source. Make it click.
        </p>
        <section aria-labelledby="guides-heading">
          <h2 id="guides-heading">The guides</h2>
          <Link className="guide-entry" href="/learn/pstack">
            <div className="guide-art" aria-hidden="true">
              <GitBranch size={46} strokeWidth={1.2} />
              <span>understand</span>
              <span>build</span>
              <span>verify</span>
            </div>
            <div className="guide-copy">
              <h3>
                Inside pstack <ArrowUpRight size={26} />
              </h3>
              <p>
                Explore poteto’s toolkit for working with AI coding agents. Trace the workflows,
                look up unfamiliar terms, and read the original instructions.
              </p>
              <span className="guide-entry-action">
                Open the field guide <ArrowUpRight size={16} />
              </span>
            </div>
          </Link>
        </section>
      </main>
      <footer>A growing collection from JuiceColored.</footer>
    </div>
  );
}
