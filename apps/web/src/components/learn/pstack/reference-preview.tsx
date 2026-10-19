"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import type { ReferenceEntry } from "./types";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
type ActivePreview = { entry: ReferenceEntry; anchor: HTMLAnchorElement };
type PreviewApi = {
  active: ActivePreview | null;
  id: string;
  show: (entry: ReferenceEntry, anchor: HTMLAnchorElement) => void;
  leave: () => void;
  keep: () => void;
  close: () => void;
  card: RefObject<HTMLElement | null>;
  suppressed: RefObject<HTMLAnchorElement | null>;
};
const PreviewContext = createContext<PreviewApi | null>(null);

export function ReferencePreviews({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActivePreview | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const card = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressed = useRef<HTMLAnchorElement | null>(null);
  const id = useId();
  const keep = () => clearTimeout(timer.current);
  const close = () => {
    keep();
    setActive(null);
  };
  const dismiss = () => {
    if (card.current?.contains(document.activeElement)) {
      suppressed.current = active?.anchor ?? null;
      active?.anchor.focus({ preventScroll: true });
    }
    close();
  };
  const leave = () => {
    keep();
    timer.current = setTimeout(() => {
      if (
        !card.current?.contains(document.activeElement) &&
        document.activeElement !== active?.anchor
      )
        setActive(null);
    }, 180);
  };
  function show(entry: ReferenceEntry, anchor: HTMLAnchorElement) {
    if (suppressed.current === anchor) return;
    keep();
    setActive((current) => (current?.anchor === anchor ? current : { entry, anchor }));
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (!active || !card.current) return;
    const rect = active.anchor.getBoundingClientRect();
    const box = card.current.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - box.width - 12));
    const top =
      rect.bottom + box.height + 20 <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - box.height - 8);
    setPosition({ left, top });
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const outside = (e: PointerEvent) => {
      if (!card.current?.contains(e.target as Node) && !active.anchor.contains(e.target as Node))
        close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        suppressed.current = active.anchor;
        dismiss();
      }
    };
    const scroll = (e: Event) => {
      if (!card.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("hashchange", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("hashchange", close);
    };
  }, [active]);
  const api = { active, id, show, leave, keep, close, card, suppressed };
  return (
    <PreviewContext.Provider value={api}>
      {children}
      {active &&
        createPortal(
          <div className="pstack pstack-portal">
            <aside
              ref={card}
              id={id}
              role="dialog"
              aria-label={`${active.entry.title} preview`}
              className="reference-preview"
              style={position}
              onMouseEnter={keep}
              onMouseLeave={leave}
              onFocus={keep}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) close();
              }}
            >
              <div className="reference-preview-heading">
                <h2>{active.entry.title}</h2>
                <button onClick={dismiss} aria-label="Close preview">
                  <X size={17} />
                </button>
              </div>
              <p id={`${id}-summary`}>{active.entry.summary}</p>
              <div className="reference-preview-footer">
                <span>
                  {active.entry.kind === "Glossary"
                    ? "Sketchbook definition"
                    : `pstack ${active.entry.kind.toLowerCase()}`}
                </span>
                <a
                  href={active.entry.href}
                  onClick={close}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      active.anchor.focus();
                      if (e.shiftKey) e.preventDefault();
                      else close();
                    }
                  }}
                >
                  {active.entry.kind === "Glossary"
                    ? "Full definition"
                    : `Read ${active.entry.kind.toLowerCase()}`}
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </PreviewContext.Provider>
  );
}

export function ReferenceLink({ entry, children }: { entry: ReferenceEntry; children: ReactNode }) {
  const api = useContext(PreviewContext)!;
  const ref = useRef<HTMLAnchorElement>(null);
  const pointer = useRef<string | null>(null);
  const openBeforeTap = useRef(false);
  const open = api.active?.anchor === ref.current;
  return (
    <a
      ref={ref}
      href={entry.href}
      className="reference-link"
      data-reference={entry.key}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? api.id : undefined}
      aria-describedby={open ? `${api.id}-summary` : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") api.show(entry, e.currentTarget);
      }}
      onMouseLeave={() => {
        api.suppressed.current = null;
        api.leave();
      }}
      onFocus={(e) => api.show(entry, e.currentTarget)}
      onBlur={(e) => {
        api.suppressed.current = null;
        if (!api.card.current?.contains(e.relatedTarget)) api.leave();
      }}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
        openBeforeTap.current = open;
        api.suppressed.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.shiftKey && open) {
          e.preventDefault();
          api.card.current?.querySelector("a")?.focus();
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          api.suppressed.current = null;
          api.show(entry, e.currentTarget);
        }
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (pointer.current === "touch" && !openBeforeTap.current) {
          e.preventDefault();
          api.show(entry, e.currentTarget);
        } else api.close();
        pointer.current = null;
      }}
    >
      {children}
    </a>
  );
}

export function Definition({ entry }: { entry: ReferenceEntry }) {
  return (
    <div className="source-reader">
      <article className="markdown glossary-definition">
        <h1>{entry.title}</h1>
        <p className="definition-credit">A sketchbook definition</p>
        <p>{entry.summary}</p>
        <p>{entry.detail}</p>
        <h2>See it in pstack</h2>
        <a href={`#skill=${entry.related}&read=1`}>
          {(entry.related ?? "").replace(/^principle-/, "").replaceAll("-", " ")}{" "}
          <ArrowUpRight size={15} />
        </a>
      </article>
    </div>
  );
}
