import type { Metadata } from "next";
import PstackGuide from "#/components/learn/pstack/guide";
import "#/components/learn/pstack/guide.css";

const title = "pstack field guide | JuiceColored";
const description =
  "Explore pstack’s skills, principles, and playbooks through interactive diagrams, original instructions, and linked definitions.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://juicecolored.com/learn/pstack" },
  openGraph: { title, description, url: "https://juicecolored.com/learn/pstack" },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function PstackPage() {
  return <PstackGuide />;
}
