"use client";

import Link from "next/link";

import { useState } from "react";
import { request } from "../lib/client";
import c from "./welcome.module.css";

export function Welcome({
  configured,
  loading = false,
  error: initialError,
}: {
  configured: boolean;
  loading?: boolean;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  async function login(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request({
        type: "login",
        password: new FormData(event.currentTarget).get("password"),
      });
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
      setBusy(false);
    }
  }
  return (
    <main className={c.page}>
      <Link className={c.brand} href="/jarvis">
        jarvis
      </Link>
      <section className={c.content}>
        <h1>Your home, at hand.</h1>
        <p>One place for your lights and fan.</p>
        {loading ? (
          <p role="status">Opening your home…</p>
        ) : configured ? (
          <form onSubmit={login}>
            <label htmlFor="password">Owner passphrase</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
            <button disabled={busy}>{busy ? "Opening…" : "Enter your home"}</button>
            <small>Your private dashboard. Sign in with your owner passphrase.</small>
          </form>
        ) : (
          <div className={c.setup}>
            <h2>Finish setting up Jarvis</h2>
            <p>
              Connect the Convex backend and configure your owner passphrase to open the dashboard.
            </p>
          </div>
        )}
        {error && (
          <p className={c.error} role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
