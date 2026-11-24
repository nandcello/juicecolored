import type { Metadata } from "next";

import { CuppyExperience } from "#/components/cuppy/cuppy-experience";

export const metadata: Metadata = {
  title: "Cuppy — The scoop that stretches (concept)",
  description:
    "Internal design concept for Cuppy Ice Cream: an original floating 3D soft-serve cup whose vanilla swirl stretches as you scroll.",
  alternates: { canonical: "https://juicecolored.com/concepts/cuppy" },
};

export default function CuppyPage() {
  return <CuppyExperience />;
}
