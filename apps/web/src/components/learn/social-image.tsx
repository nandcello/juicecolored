import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const socialImageSize = { width: 1200, height: 630 };

const palette = {
  paper: "#f1efe6",
  ink: "#25251f",
  orange: "#cf4118",
  blue: "#263de8",
};

export async function learningSocialImage(kind: "learn" | "pstack") {
  const fontDirectory = join(process.cwd(), "src/assets/learn-og");
  const [display, regular, bold] = await Promise.all([
    readFile(join(fontDirectory, "libre-caslon-display.ttf")),
    readFile(join(fontDirectory, "dm-sans-regular.ttf")),
    readFile(join(fontDirectory, "dm-sans-bold.ttf")),
  ]);
  const isGuide = kind === "pstack";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background: palette.paper,
        color: palette.ink,
        fontFamily: "DM Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 48,
          left: 64,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        JuiceColored<span style={{ color: palette.orange }}>!</span>
      </div>
      <div style={{ position: "absolute", top: 54, right: 64, fontSize: 20 }}>
        {isGuide ? "The pstack field guide" : "Interactive field guides"}
      </div>

      {isGuide ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 60,
              top: 134,
              fontFamily: "Libre Caslon Display",
              fontSize: 160,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            Inside <span style={{ color: palette.orange, marginLeft: 28 }}>pstack.</span>
          </div>
          <div style={{ position: "absolute", left: 66, top: 326, fontSize: 29 }}>
            Skills, principles & playbooks for working with coding agents.
          </div>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 66,
              width: 1068,
              top: 428,
              alignItems: "center",
              justifyContent: "space-between",
              color: palette.blue,
              fontSize: 38,
            }}
          >
            <span>understand</span>
            <Arrow />
            <span>build</span>
            <Arrow />
            <span>verify</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: 62,
              top: 151,
              fontFamily: "Libre Caslon Display",
              fontSize: 112,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            <span>A little more</span>
            <span style={{ color: palette.orange }}>understanding.</span>
          </div>
          <div
            style={{
              position: "absolute",
              left: 66,
              top: 424,
              fontSize: 29,
              width: 660,
              lineHeight: 1.4,
            }}
          >
            Explore the tools and ideas behind good software.
          </div>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 901,
              top: 177,
              width: 230,
              height: 288,
            }}
          >
            <svg width="230" height="288" viewBox="0 0 230 288" fill="none">
              <path
                d="M25 30V142C25 200 205 88 205 146V258"
                stroke={palette.blue}
                strokeWidth="4"
              />
              <path
                d="M25 258V218C25 178 115 198 115 150V30"
                stroke={palette.blue}
                strokeWidth="4"
              />
              <circle
                cx="25"
                cy="30"
                r="13"
                fill={palette.paper}
                stroke={palette.blue}
                strokeWidth="4"
              />
              <circle cx="115" cy="30" r="13" fill={palette.orange} />
              <circle
                cx="25"
                cy="258"
                r="13"
                fill={palette.paper}
                stroke={palette.blue}
                strokeWidth="4"
              />
              <circle
                cx="205"
                cy="258"
                r="13"
                fill={palette.paper}
                stroke={palette.blue}
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 64,
          width: 1072,
          bottom: 39,
          paddingTop: 22,
          borderTop: "1px solid #b9b7ae",
          justifyContent: "space-between",
          fontSize: 19,
        }}
      >
        <span>
          {isGuide ? "Read the source. Make it click." : "Follow a connection. Make it click."}
        </span>
        <span>{isGuide ? "juicecolored.com/learn/pstack" : "juicecolored.com/learn"}</span>
      </div>
    </div>,
    {
      ...socialImageSize,
      fonts: [
        { name: "Libre Caslon Display", data: display, weight: 400, style: "normal" },
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}

function Arrow() {
  return (
    <svg width="112" height="30" viewBox="0 0 112 30" fill="none">
      <path d="M2 15H108M96 3L108 15L96 27" stroke={palette.blue} strokeWidth="2.5" />
    </svg>
  );
}
