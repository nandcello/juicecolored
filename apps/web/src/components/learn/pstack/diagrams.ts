import type { Skill } from "./types";
export const summaries: Record<string, string[]> = {
  "poteto-mode": [
    "The front door to rigorous work.",
    "Give it a goal and a way to prove success. It chooses a playbook and calls the right skills as the work unfolds.",
  ],
  how: [
    "Understand how the system works.",
    "Trace ownership, runtime flow, and boundaries before you change them. Complex questions get parallel exploration and a separate synthesis.",
  ],
  why: [
    "Find the reason behind the code.",
    "Anchor the question in code, then investigate the available evidence. Separate what is known from what is inferred.",
  ],
  architect: [
    "Settle the shape before the code.",
    "Ground the problem, compare sketches of types and boundaries, then implement against the chosen design.",
  ],
  arena: [
    "One brief. Independent attempts.",
    "Give candidates the same task, cross-judge their work, choose a base, and graft in the strongest parts before verifying.",
  ],
  swarm: [
    "Many workers. One coherent result.",
    "Split a job by coverage, races, or other useful partitions. Workers return evidence for the coordinator to aggregate.",
  ],
  interrogate: [
    "Put a change under pressure.",
    "Independent reviewers challenge the diff from different angles. A lead weighs the findings against the original intent.",
  ],
  tdd: [
    "Make the failure visible first.",
    "Start with a failing behavior test, write the smallest fix, and then refactor while keeping the test green.",
  ],
  reflect: [
    "Turn a finished task into a better process.",
    "Review a long run for tooling and judgment improvements, then capture the useful lessons as skill edits.",
  ],
  correct: [
    "Make repeated mistakes harder to repeat.",
    "Mine corrections, then enforce the rule at the strongest useful level: architecture, types, lint, tests, and finally documentation.",
  ],
};
const flows: Record<string, string[]> = {
  "poteto-mode": [
    "State a goal",
    "Choose a playbook",
    "Call the right skills",
    "Verify the real result",
    "Hand back evidence",
  ],
  "poteto-help": ["Describe what you need", "Find the matching skill", "Get a concrete prompt"],
  "setup-pstack": ["Discover available models", "Choose budget and roles", "Write the model rule"],
  "in-your-own-words": ["Read the request", "Restate the goal", "Name the actual problem"],
  sharpen: ["Find the real objective", "Take the expert perspective", "Improve the approach"],
  how: [
    "Scope the question",
    "Explore the system",
    "Synthesize the findings",
    "Explain with evidence",
  ],
  why: [
    "Anchor the question in code",
    "Discover evidence sources",
    "Investigate independently",
    "Synthesize a cited answer",
  ],
  teach: [
    "Establish the question",
    "Understand how and why",
    "Build the explanation",
    "Layer in diagrams",
  ],
  recall: [
    "Name the topic",
    "Find recent context",
    "Reconcile the record",
    "Return a current-state brief",
  ],
  ketchup: [
    "Find the last user message",
    "Gather what changed",
    "Explain decisions and next actions",
  ],
  "blast-radius": [
    "Read the change",
    "Find its safety assumption",
    "Trace beyond symbol search",
    "Run proof of the assumption",
  ],
  architect: [
    "Ground the problem",
    "Sketch competing designs",
    "Agree when requested",
    "Implement against the sketch",
    "Revisit if the shape is wrong",
  ],
  arena: [
    "Frame the task and rubric",
    "Run independent candidates",
    "Cross-judge the results",
    "Pick a base and graft",
    "Verify the combined result",
  ],
  swarm: [
    "Frame the task",
    "Partition the work",
    "Launch independent workers",
    "Aggregate evidence",
    "Report the result",
  ],
  tdd: [
    "Write a behavior test",
    "Watch it fail",
    "Make the smallest fix",
    "Watch it pass",
    "Refactor with tests green",
  ],
  "figure-it-out": [
    "Frame the outcome",
    "Design a custom playbook",
    "Run a hypothesis loop",
    "Keep a decision trail",
    "Verify and hand back",
  ],
  "make-bot-ui": [
    "Create a webhook routine",
    "Get URL and sender key safely",
    "Host the page",
    "Connect through the tailnet",
    "Handle button-triggered wakes",
  ],
  "typescript-best-practices": [
    "Model the domain",
    "Make invalid states unrepresentable",
    "Parse external inputs",
    "Keep internal types precise",
  ],
  interrogate: [
    "Scope the diff",
    "Establish the intent",
    "Review independently",
    "Synthesize objections",
    "Apply lead judgment",
  ],
  "benchmark-checklist": [
    "Name the limiter",
    "Tune both sides fairly",
    "Check limits and errors",
    "Repeat alternating runs",
    "Confirm end-to-end relevance",
  ],
  "create-verification-skill": [
    "Interview the repository",
    "Generate the control skill",
    "Seed the feature map",
    "Prove it on the real app",
    "Offer maintenance",
  ],
  "maintain-verification-skill": [
    "Locate the verify skill",
    "Check the feature index",
    "Read source in parallel",
    "Reconcile live recipes",
    "Drive every feature and correct drift",
  ],
  "no-comments": [
    "Run Comment Sicko",
    "Audit its findings",
    "Shape accepted fixes",
    "Implement within scope",
    "Report unresolved constraints",
  ],
  unslop: ["Read the writing", "Find AI tells", "Rewrite plainly", "Check meaning survived"],
  "technical-writing": [
    "Identify the reader and task",
    "Choose the document form",
    "Layer the explanation",
    "Use precise global English",
  ],
  bro: ["Read the last message", "Restate in everyday language", "Keep the meaning intact"],
  reflect: [
    "Read the finished run",
    "Review tooling and judgment",
    "Consider divergent lessons",
    "Synthesize improvements",
    "Capture skill edits",
  ],
  correct: [
    "Find repeated mistakes",
    "Eliminate them in architecture",
    "Enforce with types or lint",
    "Test against real mistakes",
    "Maintain the enforcement table",
  ],
  "automate-me": [
    "Check for an existing mode",
    "Mine work history",
    "Ask about preferences",
    "Cluster the patterns",
    "Draft and refine the skill",
  ],
  "show-me-your-work": [
    "Identify a decision",
    "Record options and evidence",
    "Append to the decision log",
    "Keep the trail reviewable",
  ],
};
const principles: Record<string, string[]> = {
  "attack-the-premise": [
    "Repeated fixes fail",
    "Write down the shared premise",
    "Test the premise directly",
    "Change the approach",
  ],
  "boundary-discipline": [
    "Receive external input",
    "Validate at the boundary",
    "Trust internal types",
    "Keep core logic pure",
  ],
  "build-the-lever": [
    "Name the repeated work",
    "Build a tool to do or prove it",
    "Run the tool",
    "Leave it rerunnable",
  ],
  "encode-lessons-in-structure": [
    "Notice a recurring instruction",
    "Find an enforceable constraint",
    "Encode the rule",
    "Prevent the next recurrence",
  ],
  "exhaust-the-design-space": [
    "Face a novel decision",
    "Build competing prototypes",
    "Compare real behavior",
    "Choose with evidence",
  ],
  "experience-first": [
    "Identify the user experience",
    "Weigh the tradeoffs",
    "Prefer polished useful behavior",
  ],
  "explain-the-number": [
    "Measure a result",
    "Identify the limiter",
    "Rule out misleading work",
    "Make a supported claim",
  ],
  "fix-root-causes": [
    "Observe a symptom",
    "Trace the earliest wrong state",
    "Fix the source",
    "Verify the behavior",
  ],
  "foundational-thinking": [
    "Name the core entities",
    "Choose the right data structures",
    "Resolve shared state",
    "Then write logic",
  ],
  "guard-the-context-window": [
    "Estimate context pressure",
    "Partition bulk exploration",
    "Return concise findings",
    "Preserve useful working context",
  ],
  "laziness-protocol": [
    "Name the outcome",
    "Look for what can be removed",
    "Make the smallest sufficient change",
  ],
  "make-operations-idempotent": [
    "Identify retries and crashes",
    "Define the desired end state",
    "Make repeat execution converge",
  ],
  "migrate-callers-then-delete-legacy-apis": [
    "Introduce the new API",
    "Migrate every caller",
    "Delete the old API in the same wave",
  ],
  "minimize-reader-load": [
    "Trace question to answer",
    "Find layers and hidden state",
    "Collapse needless indirection",
    "Shrink mutable scope",
  ],
  "model-the-domain": [
    "Name the states and transitions",
    "Choose a structure that expresses them",
    "Replace scattered conditionals",
  ],
  "never-block-on-the-human": [
    "Identify a reversible next step",
    "Proceed within authorization",
    "Present the concrete result",
  ],
  "outcome-oriented-execution": [
    "Name the target architecture",
    "Plan verifiable phases",
    "Converge on the target",
    "Remove transitional scaffolding",
  ],
  "prove-it-works": [
    "Define observable success",
    "Exercise the real artifact",
    "Collect evidence",
    "Only then declare done",
  ],
  "redesign-from-first-principles": [
    "Take the new requirement seriously",
    "Treat it as a day-one constraint",
    "Redesign the whole shape",
  ],
  "separate-before-serializing-shared-state": [
    "Find concurrent writers",
    "Eliminate unnecessary sharing",
    "Isolate state before adding locks",
  ],
  "sequence-verifiable-units": [
    "Break the work into small units",
    "Finish one unit",
    "Verify it",
    "Then start the next",
  ],
  "subtract-before-you-add": [
    "Identify dead weight",
    "Delete redundant structure",
    "Build on the simpler base",
  ],
  "test-behavior-not-implementation": [
    "Name observable behavior",
    "Assert what users can see",
    "Let internal refactors pass",
  ],
  "type-system-discipline": [
    "Model valid states",
    "Brand meaningful primitives",
    "Parse at the boundary",
    "Make illegal states unrepresentable",
  ],
};
export function stepsFor(skill: Skill) {
  return (
    flows[skill.id] ||
    principles[skill.id.replace("principle-", "")] || [
      "Read the context",
      "Apply the skill",
      "Verify the outcome",
    ]
  );
}
export const branches: Record<string, string[]> = {
  how: ["Ownership", "Runtime flow", "Boundaries"],
  why: ["Code & commits", "Docs & discussions", "Runtime evidence"],
  arena: ["Candidate A", "Candidate B", "Candidate N"],
  swarm: ["Work slice A", "Work slice B", "Work slice N"],
  interrogate: ["Behavior", "Code quality", "Independent objections"],
  reflect: ["Tooling", "Judgment", "Divergent view"],
};
export const categoryNotes: Record<string, string> = {
  Start: "Choose a starting point.",
  Understand: "Build a model of the problem.",
  Build: "Settle the shape. Do the work.",
  Verify: "Test the claim against reality.",
  Refine: "Make the next run better.",
  Principles: "The engineering rules underneath it all.",
};
