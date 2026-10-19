"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Skill, SelectSkill, OpenDocument, ReferenceEntry } from "./types";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  Layers,
  GitBranch,
  BookOpen,
  Check,
  Copy,
  FileText,
  ChevronRight,
  Compass,
} from "lucide-react";
import dynamic from "next/dynamic";
import ThemeToggle from "../theme-toggle";

import {
  skills,
  playbooks,
  commit,
  repository,
  hasDocument,
  sourceUrl,
  titleCase,
  groups,
  referenceIndex,
} from "./data";
import { summaries, stepsFor, branches, categoryNotes } from "./diagrams";

import { Definition } from "./reference-preview";
const SourceReader = dynamic(() => import("./source-reader"), {
  loading: () => (
    <div className="reader-status" role="status">
      Opening the original instructions…
    </div>
  ),
});
function SketchFrame({ tone = "paper" }: { tone?: string; seed?: number }) {
  return <span className={`sketch-frame frame-${tone}`} aria-hidden="true" />;
}
function Arrow({ label }: { label?: string }) {
  return (
    <div className="flow-arrow" aria-hidden="true">
      <span>{label}</span>
      <svg viewBox="0 0 30 38">
        <path d="M14 2 Q18 18 14 33 M8 26 L14 34 L21 27" />
      </svg>
    </div>
  );
}
function SkillNode({
  id,
  onSelect,
  tone = "paper",
  caption,
  small = false,
}: {
  id: string;
  onSelect: SelectSkill;
  tone?: string;
  caption?: string;
  small?: boolean;
}) {
  return (
    <button className={`skill-node ${small ? "small" : ""}`} onClick={() => onSelect(id)}>
      <SketchFrame tone={tone} seed={id.length * 17} />
      <span className="node-name">/{id}</span>
      {caption && <span className="node-caption">{caption}</span>}
      <ArrowUpRight size={16} />
    </button>
  );
}
function Overview({ onSelect }: { onSelect: SelectSkill }) {
  return (
    <div className="overview">
      <div className="map-note">one entry point. a whole toolkit.</div>
      <div className="entry-node">
        <SkillNode
          id="poteto-mode"
          tone="green"
          onSelect={onSelect}
          caption="Your task → the right playbook"
        />
      </div>
      <div className="trunk">
        <svg viewBox="0 0 760 75" preserveAspectRatio="none" aria-hidden="true">
          <path d="M380 0 Q381 19 380 28 M126 70 L126 33 Q127 27 138 28 L624 28 Q636 28 635 37 L635 69 M380 28 L380 70 M119 62 L126 71 L134 62 M373 62 L380 71 L388 62 M628 62 L635 71 L642 62" />
        </svg>
        <span>routes your work</span>
      </div>
      <div className="workflow-columns">
        <section className="workflow-lane">
          <h3>
            <span>1</span>Understand
          </h3>
          <p>Get the lay of the land</p>
          <SkillNode id="how" caption="How does it work?" onSelect={onSelect} />
          <SkillNode id="why" caption="Why was it built this way?" onSelect={onSelect} />
          <SkillNode id="teach" caption="Help me really get it" onSelect={onSelect} />
          <button className="quiet-link" onClick={() => onSelect("blast-radius")}>
            Trace the blast radius <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="workflow-lane">
          <h3>
            <span>2</span>Shape & build
          </h3>
          <p>Think first. Then make.</p>
          <SkillNode
            id="architect"
            tone="yellow"
            caption="Find the right shape"
            onSelect={onSelect}
          />
          <SkillNode
            id="arena"
            tone="yellow"
            caption="Compare independent attempts"
            onSelect={onSelect}
          />
          <SkillNode
            id="swarm"
            tone="yellow"
            caption="Divide work across agents"
            onSelect={onSelect}
          />
          <button className="quiet-link" onClick={() => onSelect("tdd")}>
            Start with a failing test <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="workflow-lane">
          <h3>
            <span>3</span>Verify & learn
          </h3>
          <p>Prove it. Keep the lesson.</p>
          <SkillNode
            id="interrogate"
            tone="blue"
            caption="Challenge the change"
            onSelect={onSelect}
          />
          <SkillNode id="unslop" tone="blue" caption="Make the words clearer" onSelect={onSelect} />
          <SkillNode id="reflect" tone="blue" caption="Improve the next run" onSelect={onSelect} />
          <button className="quiet-link" onClick={() => onSelect("correct")}>
            Prevent repeat mistakes <ArrowUpRight size={14} />
          </button>
        </section>
      </div>
      <div className="principle-strip">
        <span className="hand">underneath it all</span>
        <button onClick={() => onSelect("principle-model-the-domain")}>Model the domain</button>
        <span>·</span>
        <button onClick={() => onSelect("principle-prove-it-works")}>Prove it works</button>
        <span>·</span>
        <button onClick={() => onSelect("principle-subtract-before-you-add")}>
          Subtract first
        </button>
      </div>
      <p className="diagram-disclaimer">
        A learning map of common roles, not a mandatory sequence. Each playbook chooses its own
        steps.
      </p>
    </div>
  );
}
function SkillDiagram({ skill }: { skill: Skill }) {
  const steps = stepsFor(skill);
  const fork = branches[skill.id];
  return (
    <div className="skill-diagram">
      <div className="diagram-intro">
        <span className={`category-tag ${skill.group.toLowerCase()}`}>{skill.group}</span>
        <h2>{summaries[skill.id]?.[0] || titleCase(skill.id)}</h2>
        <p>{summaries[skill.id]?.[1] || skill.description}</p>
      </div>
      <div className="process">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 && <Arrow />}
            <div className="process-step">
              <SketchFrame
                tone={i === steps.length - 1 ? "green" : i === 0 ? "yellow" : "paper"}
                seed={i + 4}
              />
              <span className="step-index">{i + 1}</span>
              <span>{step}</span>
            </div>
            {fork && i === 1 && (
              <div className="branch-row" aria-label="Parallel work">
                {fork.map((label) => (
                  <div key={label}>
                    <span className="branch-line" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <p className="diagram-disclaimer">
        Editorial summary of the upstream skill. Switch to Original text for the complete
        instructions.
      </p>
    </div>
  );
}
function Library({
  query,
  setQuery,
  group,
  setGroup,
  onSelect,
}: {
  query: string;
  setQuery: (value: string) => void;
  group: string;
  setGroup: (value: string) => void;
  onSelect: SelectSkill;
}) {
  const matches = skills.filter(
    (s) =>
      (group === "All" || s.group === group) &&
      `${s.id} ${s.description} ${s.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="library">
      <div className="library-heading">
        <h2>Find the right skill.</h2>
        <p>Browse by purpose, or search the original instructions.</p>
      </div>
      <label className="search-box">
        <Search size={19} />
        <input
          autoComplete="off"
          aria-label="Search all skills"
          placeholder="Try “review”, “types”, or “how”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </label>
      <div className="filters" aria-label="Filter skills by purpose">
        {groups.map((g) => (
          <button key={g} aria-pressed={g === group} onClick={() => setGroup(g)}>
            {g}
            {g === "All" && <span>{skills.length}</span>}
          </button>
        ))}
      </div>
      <div className="results-label" aria-live="polite">
        {matches.length} {matches.length === 1 ? "skill" : "skills"}
        {group !== "All" && ` · ${categoryNotes[group]}`}
      </div>
      <div className="skill-list">
        {matches.map((s) => (
          <button className="skill-list-item" key={s.id} onClick={() => onSelect(s.id)}>
            <span>
              <strong>{s.group === "Principles" ? titleCase(s.id) : `/${s.id}`}</strong>
              <span>{summaries[s.id]?.[0] || s.description}</span>
            </span>
            <span className="list-end">
              <span className={`category-tag ${s.group.toLowerCase()}`}>{s.group}</span>
              <ArrowUpRight size={18} />
            </span>
          </button>
        ))}
      </div>
      {!matches.length && (
        <div className="empty-state">
          <Compass size={34} />
          <h3>No skills match that search.</h3>
          <p>Try a shorter phrase or look across all purposes.</p>
          <button
            onClick={() => {
              setQuery("");
              setGroup("All");
            }}
          >
            Reset search
          </button>
        </div>
      )}
    </div>
  );
}
function Inspector({
  skill,
  onSelect,
  onRead,
  onDocument,
}: {
  skill: Skill;
  onSelect: SelectSkill;
  onRead: () => void;
  onDocument: OpenDocument;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [skill.id]);
  const related = skills.filter((s) => s.group === skill.group && s.id !== skill.id).slice(0, 3);
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span className="hand">a closer look</span>
        <BookOpen size={21} />
      </div>
      <span className={`category-tag ${skill.group.toLowerCase()}`}>{skill.group}</span>
      <h2>{skill.group === "Principles" ? titleCase(skill.id) : `/${skill.id}`}</h2>
      <p>{summaries[skill.id]?.[1] || skill.description}</p>
      <button className="source-cta" onClick={onRead}>
        <BookOpen size={17} />
        Read the original skill
        <ArrowRight size={17} />
      </button>
      <button
        className="copy-command"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText("/" + skill.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            setCopied(false);
          }
        }}
      >
        <code>/{skill.id}</code>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span className="sr-only">Copy command</span>
      </button>
      <div className="margin-note">
        {skill.id === "poteto-mode" ? (
          <>
            Start here if you’re
            <br />
            not sure where to start.
            <svg viewBox="0 0 90 45">
              <path d="M80 40Q35 46 13 6M12 6L14 21M12 6L28 11" />
            </svg>
          </>
        ) : (
          <>
            The diagram is the map.
            <br />
            The source has the details.
          </>
        )}
      </div>
      <div className="inspector-section">
        <h3>{skill.id === "poteto-mode" ? "A few paths through pstack" : "Keep exploring"}</h3>
        {(skill.id === "poteto-mode"
          ? ["how", "architect", "interrogate"]
          : related.map((s) => s.id)
        ).map((id) => (
          <button className="related-link" key={id} onClick={() => onSelect(id)}>
            <span>{titleCase(id)}</span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      {skill.references.length > 0 && (
        <div className="inspector-section">
          <h3>
            Inside this skill <span>{skill.references.length}</span>
          </h3>
          <div className="reference-list">
            {skill.references.map((p) => (
              <button key={p} onClick={() => onDocument(p)}>
                <FileText size={14} />
                <span>
                  {titleCase(
                    p
                      .split("/")
                      .at(-1)!
                      .replace(/\.(md|tsv)$/, ""),
                  )}
                </span>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="source-credit">
        <span>From poteto’s pstack</span>
        <a href={sourceUrl(skill.path)} target="_blank" rel="noreferrer">
          cursor/plugins <ArrowUpRight size={13} />
        </a>
        <span>Snapshot {commit.slice(0, 7)}</span>
      </div>
    </aside>
  );
}
export default function PstackGuide() {
  const [view, setView] = useState("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState("diagram");
  const [doc, setDoc] = useState<string | null>(null);
  const [term, setTerm] = useState<ReferenceEntry | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const workspace = useRef<HTMLElement>(null);
  const skill =
    skills.find((s) => s.id === selected) || skills.find((s) => s.id === "poteto-mode")!;
  const sourcePath = doc || skill.path;
  useEffect(() => {
    function sync() {
      const p = new URLSearchParams(location.hash.slice(1));
      const definition = referenceIndex.entries.get(`term:${p.get("term")}`);
      setTerm(definition || null);
      if (definition) {
        setSelected(definition.related ?? null);
        setView("map");
        setDoc(null);
        setMode("source");
      } else if (p.has("skill") && skills.some((s) => s.id === p.get("skill"))) {
        setSelected(p.get("skill"));
        setView("map");
        setDoc(null);
        setMode(p.get("read") === "1" ? "source" : "diagram");
      } else if (p.has("doc") && hasDocument(p.get("doc") ?? "")) {
        setDoc(p.get("doc"));
        const id = p.get("doc")!.split("/")[1];
        setSelected(skills.some((s) => s.id === id) ? id : null);
        setView("map");
        setMode("source");
      } else if (["map", "library", "playbooks"].includes(p.get("view") ?? "")) {
        setView(p.get("view")!);
        setSelected(null);
        setDoc(null);
        setMode("diagram");
      } else {
        setView("map");
        setSelected(null);
        setDoc(null);
        setMode("diagram");
      }
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (mode === "source")
      workspace.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
  }, [sourcePath, term, mode]);
  function go(hash: string) {
    location.hash = hash;
  }
  function select(id: string) {
    go(`skill=${id}`);
    workspace.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  function openDoc(path: string) {
    go(`doc=${encodeURIComponent(path)}`);
    workspace.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function switchMode(next: string) {
    if (next === "source") go(doc ? `doc=${encodeURIComponent(doc)}` : `skill=${skill.id}&read=1`);
    else go(selected ? `skill=${selected}` : "view=map");
  }
  return (
    <div className="pstack">
      <header className="site-header">
        <Link href="/learn" className="learn-back">
          <ArrowLeft size={16} /> All guides
        </Link>
        <a className="brand" href="#view=map" aria-label="pstack sketchbook home">
          <Layers size={30} strokeWidth={1.6} />
          <span>
            pstack<span className="brand-dot">.</span>
          </span>
          <span className="brand-descriptor">the sketchbook</span>
        </a>
        <nav aria-label="Main navigation">
          <a className={view === "map" ? "active" : ""} href="#view=map">
            Explore
          </a>
          <a className={view === "library" ? "active" : ""} href="#view=library">
            All skills <span>{skills.length}</span>
          </a>
          <a className={view === "playbooks" ? "active" : ""} href="#view=playbooks">
            Playbooks
          </a>
          <a
            className="github-link"
            href={`${repository}/tree/${commit}/pstack`}
            target="_blank"
            rel="noreferrer"
          >
            Source
            <ArrowUpRight size={16} />
          </a>
          <ThemeToggle />
        </nav>
      </header>
      <main id="pstack-content">
        <section className="intro">
          <div>
            <h1>
              Good work starts
              <br />
              with a{" "}
              <span className="underlined">
                better map.
                <svg viewBox="0 0 350 15" preserveAspectRatio="none">
                  <path d="M3 9Q168 0 346 6M11 14Q173 7 331 11" />
                </svg>
              </span>
            </h1>
            <p>
              A visual field guide to{" "}
              <a href="https://x.com/poteto" target="_blank" rel="noreferrer">
                poteto’s
              </a>{" "}
              pstack.
              <br />
              Follow the workflows. Open a skill. See how the pieces fit.
            </p>
          </div>
          <div className="intro-note">
            <span>
              Less guesswork.
              <br />
              More good engineering.
            </span>
            <svg viewBox="0 0 140 55" aria-hidden="true">
              <path d="M122 5 Q118 43 17 38 M26 27 L13 38 L27 47" />
            </svg>
            <div className="inventory">
              <span>{skills.filter((s) => s.group !== "Principles").length} skills</span>
              <span>{skills.filter((s) => s.group === "Principles").length} principles</span>
              <span>{playbooks.length} playbooks</span>
            </div>
          </div>
        </section>
        <section
          className={`workspace ${mode === "source" ? "reading" : ""}`}
          ref={workspace}
          aria-label="Explore pstack"
        >
          <div className="canvas">
            <div className="canvas-toolbar">
              <div className="breadcrumbs">
                {selected || doc ? (
                  <>
                    <button onClick={() => go("view=map")} aria-label="Back to workflow map">
                      <ArrowLeft size={17} />
                    </button>
                    <span>
                      {term
                        ? term.title
                        : doc
                          ? titleCase(doc.split("/").at(-1)!.replace(".md", ""))
                          : skill.group === "Principles"
                            ? titleCase(skill.id)
                            : `/${skill.id}`}
                    </span>
                  </>
                ) : (
                  <>
                    <GitBranch size={18} />
                    <span>
                      {view === "library"
                        ? "The skill library"
                        : view === "playbooks"
                          ? "The playbook shelf"
                          : "The big picture"}
                    </span>
                  </>
                )}
              </div>
              {view === "map" && !term && (
                <div className="view-toggle" aria-label="Content view">
                  <button aria-pressed={mode === "diagram"} onClick={() => switchMode("diagram")}>
                    <GitBranch size={15} />
                    Diagram
                  </button>
                  <button aria-pressed={mode === "source"} onClick={() => switchMode("source")}>
                    <FileText size={15} />
                    Original text
                  </button>
                </div>
              )}
            </div>
            {view === "library" ? (
              <Library
                query={query}
                setQuery={setQuery}
                group={group}
                setGroup={setGroup}
                onSelect={select}
              />
            ) : view === "playbooks" ? (
              <div className="library">
                <div className="library-heading">
                  <h2>A plan for the work ahead.</h2>
                  <p>
                    Poteto-mode chooses among these {playbooks.length} playbooks. Open one to read
                    its complete steps.
                  </p>
                </div>
                <div className="playbook-list">
                  {playbooks.map((p) => (
                    <button key={p.id} onClick={() => openDoc(p.path)}>
                      <span className="playbook-symbol">
                        <GitBranch size={22} />
                      </span>
                      <span>
                        <strong>{titleCase(p.id)}</strong>
                        <span>{p.intro.length > 180 ? p.intro.slice(0, 177) + "…" : p.intro}</span>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
              </div>
            ) : term ? (
              <Definition entry={term} />
            ) : mode === "source" ? (
              <SourceReader key={sourcePath} path={sourcePath} onDocument={openDoc} />
            ) : selected ? (
              <SkillDiagram skill={skill} />
            ) : (
              <Overview onSelect={select} />
            )}
          </div>
          <Inspector
            skill={skill}
            onSelect={select}
            onRead={() => go(`skill=${skill.id}&read=1`)}
            onDocument={openDoc}
          />
        </section>
        <section className="bottom-note">
          <div>
            <span className="hand">New to the stack?</span>
            <p>
              Configure your models with{" "}
              <button onClick={() => select("setup-pstack")}>/setup-pstack</button>, then bring a
              real task to <button onClick={() => select("poteto-mode")}>/poteto-mode</button>.
            </p>
          </div>
          <a href="#view=library">
            Find your next skill
            <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <footer>
        <div>
          <Layers size={18} />
          <span>
            A field guide to pstack by{" "}
            <a href="https://x.com/poteto" target="_blank" rel="noreferrer">
              poteto
            </a>
            . An independent visualization.
          </span>
        </div>
        <div>
          <a href="/learn/pstack/source/LICENSE" target="_blank">
            MIT license
          </a>
          <a href={`${repository}/tree/${commit}/pstack`} target="_blank" rel="noreferrer">
            Source snapshot {commit.slice(0, 7)}
            <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </div>
  );
}
