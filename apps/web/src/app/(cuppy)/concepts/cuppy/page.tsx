import type { Metadata } from "next";

import { CuppyExperience } from "#/components/cuppy/cuppy-experience";

const title = "Cuppy — The scoop that stretches (concept)";
const description =
  "Internal design concept for Cuppy Ice Cream: an original floating 3D soft-serve cup whose vanilla swirl stretches as you scroll.";
const url = "https://juicecolored.com/concepts/cuppy";

// The share card is the static opengraph-image.png (+ .alt.txt) beside this
// page; X/Twitter inherits the same image from openGraph.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { type: "website", url, title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function CuppyPage() {
  return <CuppyExperience />;
}
