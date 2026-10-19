"use client";
import { useEffect, useState } from "react";
import { FileText, Check, Copy, Download, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReferencePreviews, ReferenceLink } from "./reference-preview";
import { hasDocument, sourceUrl, referenceIndex, referenceByPath } from "./data";
import type { OpenDocument } from "./types";
export default function SourceReader({
  path,
  onDocument,
}: {
  path: string;
  onDocument: OpenDocument;
}) {
  const [raw, setRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setRaw(false);
    setCopied(false);
  }, [path]);
  const [document, setDocument] = useState<{
    path: string | null;
    text: string | null;
    error: string | null;
  }>({
    path: null,
    text: null,
    error: null,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDocument({ path, text: null, error: null });
    fetch("/learn/pstack/source/" + path, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("The source file could not be loaded.");
        return r.text();
      })
      .then((text) => setDocument({ path, text, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") setDocument({ path, text: null, error: error.message });
      });
    return () => controller.abort();
  }, [path, retry]);
  const markdown = document.path === path ? document.text : null;
  function resolve(href: string | undefined) {
    if (!href) return "#";
    if (/^(https?:|mailto:|#)/.test(href)) return href;
    const [file, hash] = href.split("#");
    const seg = path.split("/").slice(0, -1);
    for (const p of file.split("/")) {
      if (p === "..") seg.pop();
      else if (p && p !== ".") seg.push(p);
    }
    const target = seg.join("/");
    return hasDocument(target) ? { target, hash } : sourceUrl(target) + (hash ? "#" + hash : "");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  if (document.error)
    return (
      <div className="reader-status" role="alert">
        <h2>Couldn't load this source file.</h2>
        <p>Check your connection and try again.</p>
        <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
        <a href={sourceUrl(path)} target="_blank" rel="noreferrer">
          Read on GitHub
        </a>
      </div>
    );
  if (markdown === null)
    return (
      <div className="reader-status" role="status">
        Opening the original instructions…
      </div>
    );
  return (
    <div className="source-reader">
      <div className="source-tools">
        <span>
          <FileText size={15} />
          {path.split("/").at(-1)}
        </span>
        <div>
          <button onClick={() => setRaw(!raw)} aria-pressed={raw}>
            {raw ? "Formatted" : "Raw Markdown"}
          </button>
          <button onClick={copy} aria-label="Copy original Markdown">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <a href={`/learn/pstack/source/${path}`} download aria-label="Download original file">
            <Download size={16} />
          </a>
        </div>
      </div>
      <div className="source-origin">
        Unedited upstream text ·{" "}
        <a href={sourceUrl(path)} target="_blank" rel="noreferrer">
          View on GitHub <ExternalLink size={12} />
        </a>
      </div>
      {raw ? (
        <pre className="raw-source">{markdown}</pre>
      ) : (
        <ReferencePreviews key={path}>
          <p className="reader-hint">
            Underlined terms have a quick explanation. Hover, focus, or tap to explore.
          </p>
          <article className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[referenceIndex.plugin]}
              components={{
                a: ({ href, children, node }) => {
                  const annotation = referenceIndex.entries.get(
                    String(node?.properties["data-reference"] ?? ""),
                  );
                  if (annotation)
                    return <ReferenceLink entry={annotation}>{children}</ReferenceLink>;
                  const link = resolve(href);
                  const referenced =
                    typeof link === "object" ? referenceByPath.get(link.target) : null;
                  if (referenced && typeof link === "object" && !link.hash)
                    return <ReferenceLink entry={referenced}>{children}</ReferenceLink>;
                  if (href?.startsWith("#"))
                    return (
                      <a href={sourceUrl(path) + href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    );
                  return typeof link === "object" ? (
                    <a
                      href={`#doc=${encodeURIComponent(link.target)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onDocument(link.target);
                      }}
                    >
                      {children}
                    </a>
                  ) : (
                    <a
                      href={link}
                      target={link.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                    >
                      {children}
                    </a>
                  );
                },
                img: ({ src, alt }) => {
                  const resolved = resolve(typeof src === "string" ? src : undefined);
                  return (
                    <a
                      href={typeof resolved === "string" ? resolved : sourceUrl(resolved.target)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {alt || "View source image"} <ExternalLink size={14} />
                    </a>
                  );
                },
              }}
            >
              {markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")}
            </ReactMarkdown>
          </article>
        </ReferencePreviews>
      )}
    </div>
  );
}
