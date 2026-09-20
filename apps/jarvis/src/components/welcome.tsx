"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowUpRight, KeyRound, Lightbulb, Radio } from "lucide-react";
import { useState } from "react";
import { request } from "@/lib/client";
export function Welcome({
  configured,
  loading = false,
  error: initialError,
}: {
  configured: boolean;
  loading?: boolean;
  error?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError ?? "");
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
    <main {...stylex.props(s.page)}>
      <a href="#main" {...stylex.props(s.brand)}>
        <span {...stylex.props(s.logo)}>j</span> jarvis
        <span {...stylex.props(s.tag)}>PERSONAL HOME CONTROL</span>
      </a>
      <section id="main" {...stylex.props(s.content)}>
        <div {...stylex.props(s.copy)}>
          <p {...stylex.props(s.eyebrow)}>
            <Radio size={14} /> A LITTLE MORE CONNECTED
          </p>
          <h1 {...stylex.props(s.title)}>
            Your home.
            <br />
            In harmony.
          </h1>
          <p {...stylex.props(s.description)}>
            The right light. Your favorite feeling.
            <br />
            One quiet place to bring it all together.
          </p>
          {loading ? (
            <p role="status" {...stylex.props(s.description)}>
              Opening your home…
            </p>
          ) : configured ? (
            <form onSubmit={login} {...stylex.props(s.form)}>
              <label htmlFor="password" {...stylex.props(s.label)}>
                Welcome home
              </label>
              <div {...stylex.props(s.field)}>
                <KeyRound size={18} />
                <input
                  {...stylex.props(s.input)}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your owner passphrase"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                />
              </div>
              <button {...stylex.props(s.button)} disabled={busy}>
                {busy ? "Opening…" : "Enter your home"}
                <ArrowUpRight size={18} />
              </button>
              <p {...stylex.props(s.hint)}>Your private dashboard. Only you have the key.</p>
            </form>
          ) : (
            <div {...stylex.props(s.setup)}>
              <h2>Almost home.</h2>
              <p {...stylex.props(s.hint)}>
                Jarvis is built. Connect its Convex backend and configure the owner passphrase to
                open your dashboard.
              </p>
            </div>
          )}
          {error ? (
            <p role="alert" {...stylex.props(s.error)}>
              {error}
            </p>
          ) : null}
        </div>
        <div {...stylex.props(s.art)} aria-hidden="true">
          <div {...stylex.props(s.glow)} />
          <div {...stylex.props(s.line)} />
          <div {...stylex.props(s.shade)} />
          <div {...stylex.props(s.bulb)} />
          <div {...stylex.props(s.caption)}>
            <Lightbulb size={17} />
            <span>
              Good light changes everything.
              <small {...stylex.props(s.small)}>STARTING WITH YEELIGHT</small>
            </span>
          </div>
        </div>
      </section>
      <footer {...stylex.props(s.footer)}>
        A home that feels like you.<span>JARVIS / 01</span>
      </footer>
    </main>
  );
}
const s = stylex.create({
  page: {
    minHeight: "100dvh",
    padding: {
      default: "38px 5vw 24px",
      "@media(max-width:700px)": "24px",
    },
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: -1,
  },
  logo: {
    display: "grid",
    placeItems: "center",
    backgroundColor: "#d8edaa",
    color: "#20291b",
    width: 35,
    height: 35,
    borderRadius: 11,
    fontSize: 29,
    paddingBottom: 5,
  },
  tag: {
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: 2,
    color: "#858e82",
    marginLeft: 12,
    display: {
      default: "block",
      "@media(max-width:500px)": "none",
    },
  },
  content: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media(max-width:750px)": "1fr",
    },
    maxWidth: 1100,
    width: "100%",
    margin: "auto",
    alignItems: "center",
    paddingBlock: 70,
    gap: 30,
  },
  copy: {
    zIndex: 1,
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 10,
    letterSpacing: 2,
    color: "#c4d7a0",
    marginBottom: 26,
  },
  title: {
    fontSize: {
      default: 76,
      "@media(max-width:700px)": 58,
    },
    lineHeight: 1.03,
    fontWeight: 400,
    letterSpacing: -4,
  },
  description: {
    fontSize: 16,
    lineHeight: 1.8,
    color: "#8b968b",
    marginTop: 24,
  },
  form: {
    maxWidth: 340,
    marginTop: 40,
  },
  label: {
    display: "block",
    fontSize: 14,
    marginBottom: 14,
  },
  field: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 15,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#343c31",
    borderRadius: 12,
    color: "#98a18f",
  },
  input: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderStyle: "solid",
    outline: "none",
    color: "#e9ede7",
    width: "100%",
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    backgroundColor: "#d8edaa",
    color: "#222c1a",
    borderWidth: 0,
    borderStyle: "solid",
    borderRadius: 12,
    padding: 16,
    fontWeight: 600,
  },
  hint: {
    fontSize: 12,
    color: "#899383",
    lineHeight: 1.8,
    marginTop: 16,
  },
  error: {
    color: "#f3a994",
    marginTop: 16,
    maxWidth: 360,
    lineHeight: 1.6,
  },
  setup: {
    marginTop: 40,
    maxWidth: 340,
  },
  art: {
    position: "relative",
    height: 500,
    display: {
      default: "block",
      "@media(max-width:750px)": "none",
    },
  },
  glow: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    backgroundImage: "radial-gradient(ellipse, #b5b97635 0%, #87994d0c 55%, transparent 70%)",
    top: 80,
    left: -30,
  },
  line: {
    position: "absolute",
    width: 2,
    height: 180,
    backgroundColor: "#686e53",
    top: -40,
    left: "50%",
  },
  shade: {
    position: "absolute",
    top: 120,
    left: "calc(50% - 130px)",
    width: 260,
    height: 135,
    borderTopLeftRadius: "150px",
    borderTopRightRadius: "150px",
    borderBottomRightRadius: "16px",
    borderBottomLeftRadius: "16px",
    backgroundImage: "linear-gradient(120deg, #87926c, #48553e 60%, #2b392a)",
    boxShadow: "inset 8px 5px 20px #b0be7833, 0 35px 55px #b8a75815",
  },
  bulb: {
    position: "absolute",
    top: 248,
    left: "calc(50% - 125px)",
    width: 250,
    height: 17,
    borderRadius: "50%",
    backgroundColor: "#e8e2af",
    boxShadow: "0 2px 25px #e7cf7788",
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#b8c0ac",
    fontSize: 13,
  },
  small: {
    display: "block",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 8,
    color: "#737d6a",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    color: "#677161",
    fontSize: 11,
    letterSpacing: 1,
  },
});
