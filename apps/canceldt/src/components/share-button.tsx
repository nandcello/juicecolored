"use client";

import { useState } from "react";
import { publicPath } from "@/lib/share";

export function ShareButton({ path, title, text }: { path: string; title: string; text: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  async function share() {
    const url = new URL(publicPath(path), window.location.origin).href;
    setPending(true);
    setMessage("");
    setManualUrl("");
    try {
      if (typeof navigator.share === "function") {
        // Call directly from the click, before any await, to preserve user activation.
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage("Sharing is unavailable. Copy this link:");
        setManualUrl(url);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="share-control">
      <button className="text-button share-button" type="button" onClick={share} disabled={pending}>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" />
        </svg>
        Share
      </button>
      <span className="quiet" role="status">
        {message}
      </span>
      {manualUrl ? (
        <input
          aria-label="Share link"
          readOnly
          value={manualUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
