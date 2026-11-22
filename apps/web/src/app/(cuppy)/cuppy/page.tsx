import type { Metadata } from "next";

import { CuppyExperience } from "#/components/cuppy/cuppy-experience";

export const metadata: Metadata = {
  title: "Cuppy — The scoop that stretches (concept)",
  description:
    "Internal design concept for Cuppy Ice Cream: an original floating 3D soft-serve cup in vanilla, chocolate and salted caramel.",
};

export default function CuppyPage() {
  return <CuppyExperience />;
}
