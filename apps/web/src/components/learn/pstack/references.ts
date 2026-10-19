import type { Root, Element, Text, ElementContent } from "hast";
import type { Skill, ReferenceEntry } from "./types";
// Reading annotations only: the upstream Markdown is never rewritten.
export const glossary: [string, string, string[], string, string, string][] = [
  [
    "state-machine",
    "State machine",
    ["state machine", "state machines"],
    "A model with named states and explicit rules for moving between them.",
    "For example, a request can be idle, loading, successful, or failed. Each event permits specific transitions, so you cannot accidentally mark it as both loading and complete.",
    "principle-model-the-domain",
  ],
  [
    "discriminated-union",
    "Discriminated union",
    ["discriminated union", "discriminated unions"],
    "A type that represents several alternatives, each identified by a shared tag field.",
    'For example, a result is either { status: "success", value } or { status: "error", error }. Checking status tells the type checker which fields are available and prevents combinations that do not make sense.',
    "principle-model-the-domain",
  ],
  [
    "invariant",
    "Invariant",
    ["invariant", "invariants"],
    "A rule that must remain true for the system to be valid.",
    "A bank transfer might require the total balance across both accounts to stay unchanged. Good data structures and module boundaries make such rules hard to violate, instead of relying on every caller to remember them.",
    "principle-model-the-domain",
  ],
  [
    "idempotency",
    "Idempotency",
    ["idempotency", "idempotent"],
    "Repeating an operation has the same intended effect as performing it once.",
    "Setting a preference to “on” is idempotent; toggling it is not. For operations such as payments, an idempotency key can let a service recognize a retry and return the original result instead of repeating the effect.",
    "principle-make-operations-idempotent",
  ],
  [
    "race-condition",
    "Race condition",
    ["race condition", "race conditions"],
    "A bug where the result depends on the timing of overlapping operations.",
    "If two workers both read the same counter and then each writes back one more, one increment can be lost. Separating ownership or coordinating the update makes the outcome predictable.",
    "principle-separate-before-serializing-shared-state",
  ],
  [
    "shared-state",
    "Shared state",
    ["shared state"],
    "Data that more than one part of a system can read or change.",
    "Shared mutable state needs clear ownership. Two tasks editing the same file or object can interfere even when each is correct in isolation. Separate their working state when possible, and coordinate unavoidable shared updates.",
    "principle-separate-before-serializing-shared-state",
  ],
  [
    "context-window",
    "Context window",
    ["context window"],
    "The amount of text and other input a model can consider in one request.",
    "Instructions, conversation history, tool results, and source code all use this limited space. Passing focused evidence and file pointers helps preserve room for the information a task actually needs.",
    "principle-guard-the-context-window",
  ],
  [
    "subagent",
    "Subagent",
    ["subagent", "subagents"],
    "An AI worker assigned a bounded part of a larger task.",
    "The coordinating agent supplies a brief, scope, and expected evidence. The worker returns a result for integration or review. Separate workers can investigate independently, but their output still needs verification.",
    "swarm",
  ],
  [
    "worktree",
    "Worktree",
    ["worktree", "worktrees"],
    "A separate working directory attached to the same Git repository.",
    "A worktree lets another branch be checked out in its own directory, so independent tasks can edit files without sharing one checkout. Changes still need to be committed and integrated deliberately.",
    "swarm",
  ],
  [
    "test-driven-development",
    "Test-driven development",
    ["test-driven development", "TDD"],
    "A development cycle that starts with a test demonstrating the missing behavior.",
    "First see the test fail for the expected reason. Then write enough implementation to make it pass. Finally simplify the code while the tests continue to verify the behavior.",
    "tdd",
  ],
  [
    "blast-radius",
    "Blast radius",
    ["blast radius"],
    "The set of behaviors and users that a change could affect.",
    "A small edit to a shared helper may affect many callers. Trace the assumptions those callers depend on and verify the relevant behavior, including indirect consumers.",
    "blast-radius",
  ],
  [
    "abstraction",
    "Abstraction",
    ["abstraction", "abstractions"],
    "A model or interface that exposes what callers need while hiding implementation details.",
    "For example, a queue exposes enqueue and dequeue without requiring every caller to manage its storage. An abstraction earns its place when it removes repeated rules or prevents mistakes more than it adds indirection.",
    "principle-model-the-domain",
  ],
  [
    "reducer",
    "Reducer",
    ["reducer", "reducers"],
    "A function that computes the next state from the current state and an event or action.",
    "For example, a cart reducer can handle item-added and item-removed events in one place. Keeping transitions together makes the rules easier to inspect and test.",
    "principle-model-the-domain",
  ],
  [
    "type-narrowing",
    "Type narrowing",
    ["type narrowing"],
    "Using a check to refine a broad type into a more specific one.",
    "After checking that a value is a string, code can safely call string methods. With a discriminated union, checking its tag selects the matching variant and its fields.",
    "principle-type-system-discipline",
  ],
];

const plain = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`_]/g, "")
    .trim();
const title = (s: string) =>
  s
    .replace(/^principle-/, "")
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
export function createReferenceIndex(skills: Skill[]) {
  const entries = new Map<string, ReferenceEntry>();
  const aliases = new Map<string, string>();
  for (const skill of skills) {
    const key = `skill:${skill.id}`;
    const intro = skill.body
      .split(/\n\s*\n/)
      .find((p) => p.trim() && !/^(#|[-*]|\d+\.|```|\|)/.test(p.trim()));
    const summary = plain(intro || skill.description);
    entries.set(key, {
      key,
      title: title(skill.id),
      kind: skill.group === "Principles" ? "Principle" : "Skill",
      summary: summary.length > 340 ? summary.slice(0, 337).replace(/\s+\S*$/, "") + "…" : summary,
      href: `#skill=${skill.id}&read=1`,
      path: skill.path,
    });
    aliases.set(skill.id, key);
    aliases.set("/" + skill.id, key);
    if (skill.id.startsWith("principle-")) {
      aliases.set(skill.id.slice(10), key);
      aliases.set(title(skill.id).toLowerCase(), key);
    }
  }
  for (const [id, name, names, summary, detail, related] of glossary) {
    const key = `term:${id}`;
    entries.set(key, {
      key,
      title: name,
      kind: "Glossary",
      summary,
      detail,
      related,
      href: `#term=${id}`,
    });
    for (const alias of names)
      if (!aliases.has(alias.toLowerCase())) aliases.set(alias.toLowerCase(), key);
  }
  const escaped = [...aliases.keys()]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\w/.-])(${escaped.join("|")})(?![\\w/-]|\\.[\\w])`, "gi");
  function annotate(node: Root | Element, formatted = false) {
    if (
      !node.children ||
      ["a", "pre", "script", "style", "h1", "h2", "h3", "h4", "h5", "h6"].includes(
        "tagName" in node ? node.tagName : "",
      )
    )
      return;
    const explicit =
      formatted || ["code", "strong", "em"].includes("tagName" in node ? node.tagName : "");
    node.children = node.children.flatMap((child): ElementContent[] => {
      if (child.type === "doctype") return [];
      if (child.type !== "text") {
        if (child.type === "element") annotate(child, explicit);
        return [child];
      }
      const output: (Text | Element)[] = [];
      let offset = 0;
      for (const match of child.value.matchAll(pattern)) {
        const alias = match[0].toLowerCase();
        const key = aliases.get(alias)!;
        // Common words such as “how” are skill references only when explicitly formatted.
        if (
          key.startsWith("skill:") &&
          (!explicit || child.value.trim().toLowerCase() !== alias) &&
          !alias.startsWith("/") &&
          !alias.includes("-") &&
          alias !== "tdd"
        )
          continue;
        output.push({
          type: "text",
          value: child.value.slice(offset, match.index),
        });
        output.push({
          type: "element",
          tagName: "a",
          properties: { href: entries.get(key)!.href, "data-reference": key },
          children: [{ type: "text", value: match[0] }],
        });
        offset = match.index + match[0].length;
      }
      output.push({ type: "text", value: child.value.slice(offset) });
      return output;
    });
  }
  return { entries, plugin: () => (tree: Root) => annotate(tree) };
}
