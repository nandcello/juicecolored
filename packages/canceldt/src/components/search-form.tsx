"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function SearchForm({ query }: { query: string }) {
  const router = useRouter(),
    [pending, startTransition] = useTransition();
  return (
    <form
      action="/canceldt/lookup"
      method="get"
      className="search"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get("q");
        const q = typeof value === "string" ? value : "";
        if (q.trim() && q.length <= 160) {
          // Record explicit submissions only; renders, prefetches and history navigation
          // must not inflate the counts. Keep search navigation independent of analytics.
          void fetch("/canceldt/api/searches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q }),
            keepalive: true,
          }).catch(() => {});
        }
        startTransition(() =>
          router.push(q.trim() ? `/canceldt?q=${encodeURIComponent(q)}` : "/canceldt"),
        );
      }}
    >
      <label htmlFor="subject-search">WHO’S CANCELDT?</label>
      <div className="search-line">
        <input
          key={query}
          id="subject-search"
          name="q"
          type="search"
          placeholder="Who or what?"
          defaultValue={query}
          maxLength={160}
          autoComplete="off"
        />
        <button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check →"}
        </button>
      </div>
      <div className="search-meta">
        <span>A name. A reason. The deets.</span>
        {query ? (
          <a
            href="/canceldt"
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => router.push("/canceldt"));
            }}
          >
            Clear search ×
          </a>
        ) : (
          <span>Search the published list</span>
        )}
      </div>
      <p className="search-pending" role="status">
        Checking the list…
      </p>
    </form>
  );
}
