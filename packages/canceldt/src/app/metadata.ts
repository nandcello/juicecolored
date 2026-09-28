import type { Metadata } from "next";
import { metadataBase, socialImage } from "../lib/metadata";

export const metadata: Metadata = {
  metadataBase,
  title: { default: "CANCELDT. — Check the list.", template: "%s · CANCELDT." },
  description: "A name, a reason, and the deets. Search CANCELDT’s curated published list.",
  openGraph: { images: [socialImage] },
  twitter: { card: "summary_large_image", images: [socialImage] },
};
