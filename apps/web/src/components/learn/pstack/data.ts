import content from "./content.json";
import { createReferenceIndex } from "./references";
export const { skills, playbooks, documentPaths, commit, repository } = content;
export const referenceIndex = createReferenceIndex(skills);
export const referenceByPath = new Map(
  [...referenceIndex.entries.values()].filter((e) => e.path).map((e) => [e.path, e]),
);
export const hasDocument = (path: string) => documentPaths.includes(path);
export const groups = ["All", "Start", "Understand", "Build", "Verify", "Refine", "Principles"];
export const sourceUrl = (path: string) => `${repository}/blob/${commit}/pstack/${path}`;
export const titleCase = (s: string) =>
  s
    .replace("principle-", "")
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
