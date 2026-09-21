import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Preview } from "./metadata";

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/barlow-condensed-800.woff")),
  readFile(join(process.cwd(), "src/assets/geist-regular.ttf")),
  readFile(join(process.cwd(), "src/assets/geist-bold.ttf")),
]);

// Match the default OG artwork's paper, ink, red punctuation, and fine rules.
const palette = {
  paper: "#f6f5f1",
  ink: "#141412",
  red: "#ee3326",
  muted: "#62625a",
  rule: "#d1d1ca",
};

export async function ogImage(preview: Preview) {
  const status =
    preview.status === "cancelled"
      ? "IS CANCELLED"
      : preview.status === "unlisted"
        ? "IS NOT CANCELLED"
        : "MATCHING SUBJECTS";
  const subject = preview.subject.toUpperCase();
  const subjectSize =
    subject.length > 80 ? 48 : subject.length > 40 ? 66 : subject.length > 22 ? 94 : 132;
  const [displayFont, bodyFont, boldFont] = await fonts;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: palette.paper,
        color: palette.ink,
        fontFamily: "Geist",
        padding: "38px 54px 40px",
      }}
    >
      <div
        style={{
          height: 54,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: `1px solid ${palette.rule}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: -1.2,
            fontWeight: 700,
          }}
        >
          CANCELDT<span style={{ color: palette.red }}>.</span>
        </div>
        <div style={{ fontSize: 16, color: palette.muted, paddingTop: 5 }}>
          juicecolored.com/canceldt
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          minHeight: 0,
          padding: "16px 0 22px",
        }}
      >
        <div
          style={{
            fontFamily: "Barlow",
            fontWeight: 800,
            fontSize: subjectSize,
            lineHeight: 0.98,
            letterSpacing: -1.5,
            wordBreak: "break-word",
            display: "block",
            lineClamp: 2,
          }}
        >
          {subject}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow",
            fontWeight: 800,
            fontSize: preview.status === "cancelled" ? 126 : 102,
            lineHeight: 1,
            letterSpacing: -1.5,
            marginTop: 5,
          }}
        >
          {status}
          <span style={{ color: palette.red }}>.</span>
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.25,
            letterSpacing: -0.7,
            marginTop: 18,
            wordBreak: "break-word",
            display: "block",
            lineClamp: 2,
          }}
        >
          {preview.headline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 15,
          borderTop: `1px solid ${palette.rule}`,
          paddingTop: 24,
        }}
      >
        <div style={{ color: palette.muted }}>A curated list. Not universal consensus.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700 }}>
          CHECK THE LIST
          <svg
            width="28"
            height="20"
            viewBox="0 0 28 20"
            fill="none"
            stroke={palette.red}
            strokeWidth="1.3"
          >
            <path d="M2 10h23M18 3l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Barlow", data: displayFont, weight: 800, style: "normal" },
        { name: "Geist", data: bodyFont, weight: 400, style: "normal" },
        { name: "Geist", data: boldFont, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "no-store" },
    },
  );
}
