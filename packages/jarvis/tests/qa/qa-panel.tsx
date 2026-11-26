"use client";
// QA-only observer for the isolated preview. Not part of the production app.
import { useEffect, useState } from "react";
import type { LogEntry } from "./simulator";

type Report = {
  devices: {
    id: string;
    name: string;
    kind: string;
    online: boolean;
    busy: boolean;
    held: boolean;
    state: Record<string, unknown>;
    config: { delayMs: number; failNext: boolean; hold: boolean };
  }[];
  log: LogEntry[];
};

async function configure(input: Record<string, unknown>) {
  await fetch("/jarvis/api/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

const cell = {
  padding: "6px 8px",
  borderBottom: "1px solid #dfe3de",
  verticalAlign: "top",
} as const;

export function QAPanel() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/jarvis/api/qa", { cache: "no-store" });
        if (!cancelled) setReport(await response.json());
      } catch {
        /* The next poll retries. */
      }
    }
    void load();
    const timer = setInterval(load, 400);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
        fontSize: 14,
        background: "#f6f7f5",
        color: "#232822",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Jarvis QA — simulated devices</h1>
      <p style={{ marginBottom: 16 }}>
        Isolated preview. Requests go to an in-memory simulator; no Convex backend, Xiaomi cloud,
        bridge or household device is contacted. Open <a href="/jarvis">/jarvis</a> in another tab
        and adjust controls while watching this log. “Device boundary” lists the exact miIO/MIoT
        requests the real gateway would deliver, planned with the production adapter code.
      </p>
      <section aria-label="Device simulation settings">
        <h2 style={{ fontSize: 18, margin: "16px 0 8px" }}>Devices</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
          <thead>
            <tr>
              {["Device", "Response delay", "Hold requests", "Next request", "Simulated state"].map(
                (h) => (
                  <th key={h} style={{ ...cell, textAlign: "left" }}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {report?.devices.map((d) => (
              <tr key={d.id}>
                <td style={cell}>
                  <strong>{d.name}</strong>
                  <div>
                    {d.online ? "online" : "offline"}
                    {d.busy ? " · request in flight" : ""}
                  </div>
                </td>
                <td style={cell}>
                  <label>
                    <span style={{ display: "block" }}>
                      Delay for {d.name} (ms, applies on blur)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={15000}
                      step={100}
                      defaultValue={d.config.delayMs}
                      onBlur={(e) => void configure({ id: d.id, delayMs: Number(e.target.value) })}
                      style={{ width: 100, minHeight: 32 }}
                    />
                  </label>
                </td>
                <td style={cell}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      style={{ appearance: "auto", width: 18, height: 18 }}
                      checked={d.config.hold}
                      onChange={(e) => void configure({ id: d.id, hold: e.target.checked })}
                    />
                    Hold {d.name}
                  </label>
                  <button
                    disabled={!d.held}
                    onClick={() => void configure({ id: d.id, release: true })}
                    style={{ marginTop: 6, minHeight: 32 }}
                  >
                    Release held {d.name}
                  </button>
                </td>
                <td style={cell}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      style={{ appearance: "auto", width: 18, height: 18 }}
                      checked={d.config.failNext}
                      onChange={(e) => void configure({ id: d.id, failNext: e.target.checked })}
                    />
                    Fail next {d.name} request
                  </label>
                </td>
                <td
                  style={{
                    ...cell,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(d.state)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => void configure({ reset: true })}
          style={{ marginTop: 12, minHeight: 36 }}
        >
          Reset simulator
        </button>
      </section>
      <section aria-label="Request log">
        <h2 style={{ fontSize: 18, margin: "20px 0 8px" }}>Outgoing requests (newest first)</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
          <thead>
            <tr>
              {["#", "Device", "Request", "Device boundary", "Status", "Time"].map((h) => (
                <th key={h} style={{ ...cell, textAlign: "left" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report?.log.map((entry) => (
              <tr key={entry.seq}>
                <td style={cell}>{entry.seq}</td>
                <td style={cell}>{entry.device ?? "Account"}</td>
                <td style={{ ...cell, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {entry.op} {JSON.stringify(entry.payload)}
                </td>
                <td style={{ ...cell, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {entry.boundary.length ? (
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {entry.boundary.map((b, i) => (
                        <li key={i}>
                          {b.method}{" "}
                          {b.method.startsWith("get")
                            ? `(${b.params.length} properties)`
                            : JSON.stringify(b.params)}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={cell}>
                  {entry.status}
                  {entry.note ? ` · ${entry.note}` : ""}
                </td>
                <td style={cell}>
                  {new Date(entry.at).toLocaleTimeString()}
                  {entry.finishedAt ? ` · ${entry.finishedAt - entry.at} ms` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
