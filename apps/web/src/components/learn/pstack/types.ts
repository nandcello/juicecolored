import type content from "./content.json";
export type Skill = (typeof content.skills)[number];
export type SelectSkill = (id: string) => void;
export type OpenDocument = (path: string) => void;
export type ReferenceEntry = {
  key: string;
  title: string;
  kind: "Skill" | "Principle" | "Glossary";
  summary: string;
  href: string;
  path?: string;
  detail?: string;
  related?: string;
};
