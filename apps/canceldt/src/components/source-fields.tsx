"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@personal/convex/canceldt-model";
import type { Content } from "@personal/convex/canceldt-model";
import { useSourceLayout } from "./use-source-layout";

type SourceRow = Content["sources"][number] & {
  key: number;
  entering?: boolean;
  exiting?: boolean;
};

export function SourceFields({
  initial = [],
  error,
}: {
  initial?: Content["sources"];
  error?: string;
}) {
  const [sources, setSources] = useState<SourceRow[]>(() =>
    initial.map((source, key) => ({ ...source, key })),
  );
  const nextKey = useRef(initial.length);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const addButton = useRef<HTMLButtonElement>(null);
  const { container, capture } = useSourceLayout();
  const activeSources = sources.filter((source) => !source.exiting);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  function remove(key: number, animate: boolean) {
    const row = container.current?.querySelector<HTMLElement>(`[data-source-key="${key}"]`);
    if (row?.contains(document.activeElement)) {
      // Enable the add control before restoring focus when removing the 12th row.
      if (addButton.current) addButton.current.disabled = false;
      addButton.current?.focus({ preventScroll: true });
    }
    if (!animate) {
      capture(false);
      setSources((rows) => rows.filter((source) => source.key !== key));
      return;
    }
    setSources((rows) =>
      rows.map((source) => (source.key === key ? { ...source, exiting: true } : source)),
    );
    // Read the CSS duration so cleanup also matches the reduced-motion variant.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(container.current!);
    const duration = parseFloat(
      style.getPropertyValue(reduced ? "--motion-reduced" : "--motion-exit"),
    );
    timers.current.set(
      key,
      setTimeout(() => {
        const pointer =
          container.current?.closest("[data-input]")?.getAttribute("data-input") === "pointer";
        capture(pointer);
        setSources((rows) => rows.filter((source) => source.key !== key));
        timers.current.delete(key);
      }, duration),
    );
  }

  return (
    <fieldset className="source-fields" ref={container}>
      <legend>
        Sources <span>Optional · up to 12 web links</span>
      </legend>
      {sources.map((source, index) => {
        return (
          <div key={source.key} data-source-layout data-source-key={source.key}>
            <fieldset
              className="source-row"
              aria-label={`Source ${index + 1}`}
              data-entering={source.entering || undefined}
              data-exiting={source.exiting || undefined}
              disabled={source.exiting}
              inert={source.exiting}
              aria-hidden={source.exiting || undefined}
            >
              <label htmlFor={`url-${source.key}`}>Source {index + 1} address</label>
              <input
                id={`url-${source.key}`}
                name="sourceUrl"
                type="url"
                maxLength={LIMITS.url}
                placeholder="https://"
                value={source.url}
                onChange={(event) =>
                  setSources((rows) =>
                    rows.map((row) =>
                      row.key === source.key ? { ...row, url: event.target.value } : row,
                    ),
                  )
                }
                aria-invalid={!!error}
              />
              <label htmlFor={`title-${source.key}`}>
                Source {index + 1} title <span>Optional</span>
              </label>
              <input
                id={`title-${source.key}`}
                name="sourceTitle"
                maxLength={LIMITS.title}
                value={source.title}
                onChange={(event) =>
                  setSources((rows) =>
                    rows.map((row) =>
                      row.key === source.key ? { ...row, title: event.target.value } : row,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="text-button"
                onClick={(event) => remove(source.key, event.detail > 0)}
              >
                Remove source {index + 1} ×
              </button>
            </fieldset>
          </div>
        );
      })}
      {error ? <p className="field-error">{error}</p> : null}
      <div data-source-layout>
        <button
          ref={addButton}
          type="button"
          className="secondary"
          disabled={activeSources.length >= LIMITS.sources}
          onClick={(event) => {
            const entering = event.detail > 0;
            capture(entering);
            const key = nextKey.current++;
            setSources((rows) => [...rows, { key, url: "", title: "", entering }]);
          }}
        >
          + Add source
        </button>
      </div>
    </fieldset>
  );
}
