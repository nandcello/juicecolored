import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { expect, test } from "vite-plus/test";
import content from "./content.json";
import integrity from "./source-integrity.json";
import { createReferenceIndex } from "./references";
import { stepsFor } from "./diagrams";

const index = createReferenceIndex(content.skills);
const source = (path: string) =>
  readFileSync(new URL(`../../../../public/learn/pstack/source/${path}`, import.meta.url));
const render = (text: string, annotated = true) =>
  renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={annotated ? [index.plugin] : []}>
      {text}
    </ReactMarkdown>,
  );

test("retains the pinned documents and license byte for byte", () => {
  expect(Object.keys(integrity)).toEqual([...content.documentPaths, "LICENSE"].sort());
  for (const [path, hash] of Object.entries(integrity)) {
    expect(createHash("sha256").update(source(path)).digest("hex"), path).toBe(hash);
  }
  for (const skill of content.skills) {
    expect(content.documentPaths).toContain(skill.path);
    expect(stepsFor(skill).length).toBeGreaterThanOrEqual(3);
    for (const path of skill.references) expect(content.documentPaths).toContain(path);
  }
  for (const playbook of content.playbooks) expect(content.documentPaths).toContain(playbook.path);
  for (const entry of index.entries.values()) {
    if (entry.related) expect(content.skills.some((s) => s.id === entry.related)).toBe(true);
    if (entry.path) expect(content.documentPaths).toContain(entry.path);
  }
});

test("links formatted skills, commands, principle aliases, and glossary terms", () => {
  const html = render(
    "**principle-model-the-domain** and `architect`, /swarm, state machine, discriminated union, **laziness-protocol**.",
  );
  for (const destination of [
    "skill=principle-model-the-domain",
    "skill=architect",
    "skill=swarm",
    "term=state-machine",
    "term=discriminated-union",
    "skill=principle-laziness-protocol",
  ])
    expect(html).toContain(destination);
  const ordinary =
    'How and why we teach the architect to reflect. **How does this work?** `src/architect/SKILL.md` https://example.com/how\n\n```js\nconst how = "state machine";\n```\n\n[architect](https://example.com)';
  expect(render(ordinary)).toBe(render(ordinary, false));
});

test(
  "annotations preserve rendered text, existing links, and code throughout the corpus",
  { timeout: 15000 },
  () => {
    for (const path of content.documentPaths.filter((path) => path.endsWith(".md"))) {
      const markdown = source(path).toString();
      const annotated = render(markdown);
      const unwrapped = annotated.replace(
        /<a href="[^"]*" data-reference="[^"]*">([\s\S]*?)<\/a>/g,
        "$1",
      );
      expect(unwrapped, path).toBe(render(markdown, false));
    }
  },
);
