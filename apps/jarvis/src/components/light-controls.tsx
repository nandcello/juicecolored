"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import {
  Sun,
  Palette,
  Power,
  SlidersHorizontal,
  BookmarkPlus,
  Moon,
  Timer,
  Waves,
} from "lucide-react";
import type { LightDevice } from "@/lib/domain";
import { ui } from "./ui";
export function LightControls({
  device,
  busy,
  onCommand,
  onSave,
  onSettings,
}: {
  device: LightDevice;
  busy: boolean;
  onCommand: (action: string, data?: Record<string, unknown>) => void;
  onSave: () => void;
  onSettings: () => void;
}) {
  const state = device.state;
  const [brightness, setBrightness] = useState(state.brightness),
    [kelvin, setKelvin] = useState(state.kelvin),
    [color, setColor] = useState(state.color),
    [mode, setMode] = useState(state.mode),
    [transition, setTransition] = useState("500"),
    [minutes, setMinutes] = useState("30");
  const ready = device.online && device.updatedAt > 0,
    disabled = !ready || busy || !state.power;
  const send = (action: string, data: Record<string, unknown> = {}) =>
    onCommand(action, {
      duration: Number(transition),
      ...data,
    });
  const commitKey = (event: React.KeyboardEvent<HTMLInputElement>, fn: () => void) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(event.key)
    )
      fn();
  };
  return (
    <div {...stylex.props(s.panel)}>
      <div {...stylex.props(ui.row)}>
        <div>
          <p {...stylex.props(s.eyebrow)}>LIGHT CONTROLS</p>
          <h2 {...stylex.props(s.name)}>{device.name}</h2>
        </div>
        <button
          aria-label="Device settings"
          onClick={onSettings}
          {...stylex.props(ui.button, ui.ghost)}
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <div {...stylex.props(s.powerRow)}>
        <div {...stylex.props(s.powerLabel)}>
          <Power size={19} />
          <span>
            Power
            <small {...stylex.props(s.small)}>
              {ready
                ? state.power
                  ? "Make yourself at home."
                  : "A quiet moment."
                : (device.error ?? "Refresh to read this light.")}
            </small>
          </span>
        </div>
        <button
          role="switch"
          aria-checked={ready && state.power}
          aria-label="Light power"
          disabled={!ready || busy}
          onClick={() =>
            send("power", {
              on: !state.power,
            })
          }
          {...stylex.props(s.toggle, ready && state.power && s.toggleOn)}
        >
          <span {...stylex.props(s.thumb, ready && state.power && s.thumbOn)} />
        </button>
      </div>
      <fieldset disabled={disabled} {...stylex.props(s.fieldset)}>
        <div {...stylex.props(ui.row)}>
          <label htmlFor="brightness" {...stylex.props(s.controlLabel)}>
            <Sun size={16} />
            Brightness
          </label>
          <span {...stylex.props(s.value)}>
            {brightness}
            <small>%</small>
          </span>
        </div>
        <input
          id="brightness"
          aria-label="Brightness"
          type="range"
          min="1"
          max="100"
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          onPointerUp={() =>
            send("brightness", {
              brightness,
            })
          }
          onKeyUp={(e) =>
            commitKey(e, () =>
              send("brightness", {
                brightness,
              }),
            )
          }
        />
        <div {...stylex.props(s.rangeLabels)}>
          <span>Soft</span>
          <span>Bright</span>
        </div>
        <div {...stylex.props(s.tabs)}>
          <button
            aria-pressed={mode === "white"}
            onClick={() => setMode("white")}
            {...stylex.props(s.tab, mode === "white" && s.tabActive)}
          >
            <Sun size={15} />
            White
          </button>
          <button
            aria-pressed={mode === "color"}
            onClick={() => setMode("color")}
            {...stylex.props(s.tab, mode === "color" && s.tabActive)}
          >
            <Palette size={15} />
            Color
          </button>
        </div>
        {mode === "white" ? (
          <>
            <div {...stylex.props(ui.row)}>
              <label htmlFor="temperature" {...stylex.props(s.controlLabel)}>
                Color temperature
              </label>
              <span {...stylex.props(s.value)}>
                {kelvin}
                <small>K</small>
              </span>
            </div>
            <input
              id="temperature"
              aria-label="Color temperature"
              {...stylex.props(s.temperature)}
              type="range"
              min="1700"
              max="6500"
              step="100"
              value={kelvin}
              onChange={(e) => setKelvin(Number(e.target.value))}
              onPointerUp={() =>
                send("temperature", {
                  kelvin,
                })
              }
              onKeyUp={(e) =>
                commitKey(e, () =>
                  send("temperature", {
                    kelvin,
                  }),
                )
              }
            />
            <div {...stylex.props(s.rangeLabels)}>
              <span>Warm · 1700K</span>
              <span>Cool · 6500K</span>
            </div>
          </>
        ) : (
          <>
            <div {...stylex.props(ui.row)}>
              <label htmlFor="light-color" {...stylex.props(s.controlLabel)}>
                Find your color
              </label>
              <span {...stylex.props(s.hex)}>{color.toUpperCase()}</span>
            </div>
            <div {...stylex.props(s.swatches)}>
              {["#ff7340", "#edba77", "#c4deca", "#65b4ff", "#b871ff", "#ff72b6"].map((c) => (
                <button
                  key={c}
                  aria-label={`Set color ${c}`}
                  onClick={() => {
                    setColor(c);
                    send("color", {
                      color: c,
                    });
                  }}
                  {...stylex.props(s.swatch(c), color === c && s.swatchActive)}
                />
              ))}
              <input
                id="light-color"
                aria-label="Custom color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <button
              onClick={() =>
                send("color", {
                  color,
                })
              }
              {...stylex.props(ui.button)}
            >
              Apply custom color
            </button>
          </>
        )}
        <div {...stylex.props(s.transition)}>
          <label htmlFor="transition">Transition</label>
          <select
            id="transition"
            value={transition}
            onChange={(e) => setTransition(e.target.value)}
            {...stylex.props(s.select)}
          >
            <option value="30">Instant</option>
            <option value="500">Gentle · 0.5s</option>
            <option value="2000">Smooth · 2s</option>
            <option value="5000">Slow · 5s</option>
          </select>
        </div>
        <button onClick={onSave} {...stylex.props(ui.button, s.save)}>
          <BookmarkPlus size={16} />
          Save this light as a scene
        </button>
      </fieldset>
      <details {...stylex.props(s.advanced)}>
        <summary {...stylex.props(s.summary)}>
          A few extra touches <span>+</span>
        </summary>
        <div {...stylex.props(s.extras)}>
          <p {...stylex.props(ui.muted)}>
            Effects and timers run on the bulb, even after you close Jarvis.
          </p>
          <div {...stylex.props(s.effectButtons)}>
            <button
              disabled={disabled}
              onClick={() =>
                send("flow", {
                  steps: [
                    {
                      duration: 2500,
                      mode: "white",
                      kelvin: 2700,
                      brightness: 15,
                    },
                    {
                      duration: 2500,
                      mode: "white",
                      kelvin: 2700,
                      brightness: 70,
                    },
                  ],
                  count: 0,
                  end: 0,
                })
              }
              {...stylex.props(ui.button)}
            >
              <Waves size={15} />
              Breathe
            </button>
            <button
              disabled={disabled}
              onClick={() =>
                send("flow", {
                  steps: [
                    {
                      duration: 120000,
                      mode: "white",
                      kelvin: 3500,
                      brightness: 40,
                    },
                    {
                      duration: 1200000,
                      mode: "white",
                      kelvin: 2700,
                      brightness: 1,
                    },
                  ],
                  count: 2,
                  end: 2,
                })
              }
              {...stylex.props(ui.button)}
            >
              <Moon size={15} />
              Sunset
            </button>
            <button
              disabled={disabled}
              onClick={() => send("stopFlow")}
              {...stylex.props(ui.button)}
            >
              Stop effect
            </button>
          </div>
          <div {...stylex.props(s.timerRow)}>
            <Timer size={17} />
            <select
              aria-label="Off timer duration"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              {...stylex.props(s.select)}
            >
              {[5, 15, 30, 60, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <button
              disabled={!ready || busy}
              onClick={() =>
                send("timer", {
                  minutes: Number(minutes),
                })
              }
              {...stylex.props(ui.button)}
            >
              Set off timer
            </button>
          </div>
          {state.offInMinutes > 0 ? (
            <p {...stylex.props(ui.muted)}>Last reported timer: {state.offInMinutes} minutes</p>
          ) : null}
          <div {...stylex.props(s.effectButtons)}>
            <button
              disabled={!ready || busy}
              onClick={() => send("cancelTimer")}
              {...stylex.props(ui.button, ui.ghost)}
            >
              Cancel timer
            </button>
            <button
              disabled={disabled}
              onClick={() => send("default")}
              {...stylex.props(ui.button, ui.ghost)}
            >
              Save power-on default
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
const s = stylex.create({
  panel: {
    backgroundColor: "#1a201a",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#333b2e",
    borderRadius: 18,
    padding: {
      default: 26,
      "@media(max-width:600px)": 20,
    },
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.7,
    color: "#84917a",
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: -0.7,
  },
  powerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    paddingBlock: 25,
    marginBottom: 25,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#343c2e",
  },
  powerLabel: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
    color: "#d8e2cc",
  },
  small: {
    display: "block",
    fontSize: 11,
    color: "#829176",
    fontWeight: 400,
    marginTop: 6,
    lineHeight: 1.5,
    maxWidth: 220,
  },
  toggle: {
    height: 28,
    width: 50,
    borderWidth: 0,
    borderStyle: "solid",
    borderRadius: 20,
    padding: 4,
    backgroundColor: "#3b4436",
    flexShrink: 0,
  },
  toggleOn: {
    backgroundColor: "#d8edaa",
  },
  thumb: {
    display: "block",
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: "#abb59d",
    transition: "transform .2s",
  },
  thumbOn: {
    backgroundColor: "#344325",
    transform: "translateX(22px)",
  },
  fieldset: {
    borderWidth: 0,
    borderStyle: "solid",
    padding: 0,
    margin: 0,
    minWidth: 0,
  },
  controlLabel: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 12,
    color: "#b4c0a8",
  },
  value: {
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  rangeLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#77856c",
    marginTop: 12,
  },
  tabs: {
    display: "flex",
    borderRadius: 10,
    padding: 4,
    backgroundColor: "#111711",
    marginBlock: 30,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 0,
    borderStyle: "solid",
    padding: 10,
    borderRadius: 7,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    color: "#85947a",
    backgroundColor: "transparent",
    fontSize: 12,
  },
  tabActive: {
    backgroundColor: "#333e2e",
    color: "#e0ead5",
  },
  temperature: {
    backgroundImage: "linear-gradient(90deg, #e2a559, #e4ddab, #c1def5)",
    borderRadius: 10,
    appearance: "none",
  },
  transition: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBlock: 22,
    marginTop: 16,
    fontSize: 12,
    color: "#829176",
  },
  select: {
    backgroundColor: "#222c20",
    color: "#c3d0b6",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3b4833",
    paddingBlock: "8px",
    paddingInline: "10px",
    borderRadius: 7,
    fontSize: 11,
  },
  save: {
    width: "100%",
    backgroundColor: "transparent",
  },
  hex: {
    fontSize: 11,
    color: "#97a58a",
    fontFamily: "monospace",
  },
  swatches: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 7,
    marginBlock: 18,
  },
  swatch: (color: string) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "#1a201a",
    backgroundColor: color,
    outline: "1px solid transparent",
  }),
  swatchActive: {
    outlineWidth: "1px",
    outlineStyle: "solid",
    outlineColor: "#d7e6c6",
  },
  advanced: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#343c2e",
    marginTop: 24,
    paddingTop: 18,
  },
  summary: {
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    color: "#99a88b",
    fontSize: 12,
    listStyle: "none",
  },
  extras: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 18,
  },
  effectButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
  },
  timerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
});
