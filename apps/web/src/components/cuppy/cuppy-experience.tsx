"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import { CuppyStage } from "./cuppy-stage";
import { CUPPY_INSTAGRAM_URL, FLAVOR_IDS, FLAVORS, isFlavorId, type FlavorId } from "./flavors";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 0C12.9 7.5 16.5 11.1 24 12C16.5 12.9 12.9 16.5 12 24C11.1 16.5 7.5 12.9 0 12C7.5 11.1 11.1 7.5 12 0Z" />
    </svg>
  );
}

function CupChip() {
  return (
    <svg className="cuppy-chip-cup" viewBox="0 0 168 112" aria-hidden="true" focusable="false">
      <path d="M8 20 L24 100 Q26 108 35 108 L133 108 Q142 108 144 100 L160 20 Z" />
      <ellipse cx="84" cy="20" rx="78" ry="12" />
    </svg>
  );
}

function FlavorPicker({
  name,
  legend,
  value,
  onChange,
  compact = false,
}: {
  name: string;
  legend: string;
  value: FlavorId;
  onChange: (id: FlavorId) => void;
  compact?: boolean;
}) {
  return (
    <fieldset className={compact ? "cuppy-flavors cuppy-flavors-compact" : "cuppy-flavors"}>
      <legend>{legend}</legend>
      <div className="cuppy-flavor-options">
        {FLAVOR_IDS.map((id) => {
          const option = FLAVORS[id];
          return (
            <label
              key={id}
              className="cuppy-chip"
              style={{ "--chip-fill": option.field, "--chip-ink": option.ink } as CSSProperties}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={value === id}
                onChange={(event) => {
                  if (isFlavorId(event.target.value)) onChange(event.target.value);
                }}
              />
              <CupChip />
              <span className="cuppy-chip-name">{option.name}</span>
              <Sparkle className="cuppy-chip-sparkle" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function InstagramLink({ className }: { className: string }) {
  return (
    <a className={className} href={CUPPY_INSTAGRAM_URL} rel="noopener noreferrer">
      <span>Follow @cuppyicecream</span>
      <ArrowUpRight aria-hidden="true" strokeWidth={2.5} />
      <span className="cuppy-visually-hidden"> on Instagram</span>
    </a>
  );
}

export function CuppyExperience() {
  const [flavorId, setFlavorId] = useState<FlavorId>("vanilla");
  const [paused, setPaused] = useState(false);
  const [sceneStatus, setSceneStatus] = useState("poster");
  const sceneHost = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const flavor = FLAVORS[flavorId];
  const animate = !reducedMotion && !paused;
  const mode = reducedMotion ? "still" : "scroll";
  const onStatus = useCallback((status: string) => setSceneStatus(status), []);
  // Copy that narrates the live pull only appears while the pull can play.
  const pulling = mode === "scroll" && sceneStatus !== "fallback";

  const theme = {
    "--flavor-field": flavor.field,
    "--flavor-ink": flavor.ink,
  } as CSSProperties;

  return (
    <div
      className="cuppy"
      data-flavor={flavor.id}
      data-motion={mode}
      data-scene={mode === "scroll" ? sceneStatus : "still"}
      style={theme}
    >
      {/* Fixed viewport layer for the scroll scene; decorative, the hero slot carries the image name. */}
      <div ref={sceneHost} className="cuppy-scene" aria-hidden="true" />
      <main>
        <section className="cuppy-hero" aria-labelledby="cuppy-title">
          <header className="cuppy-masthead">
            <p className="cuppy-wordmark">
              Cuppy <span>Ice Cream</span>
            </p>
            <div className="cuppy-masthead-tools">
              <p className="cuppy-concept-tag">Internal concept</p>
              {reducedMotion ? null : (
                <button
                  type="button"
                  className="cuppy-motion-toggle"
                  aria-pressed={paused}
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? (
                    <Play aria-hidden="true" strokeWidth={2.5} />
                  ) : (
                    <Pause aria-hidden="true" strokeWidth={2.5} />
                  )}
                  <span>{paused ? "Play motion" : "Pause motion"}</span>
                </button>
              )}
            </div>
          </header>

          <div className="cuppy-headline">
            <h1 id="cuppy-title" className="cuppy-title">
              <span className="cuppy-title-lead">The scoop that</span>{" "}
              <span className="cuppy-title-gap" aria-hidden="true" />
              <span className="cuppy-title-word">stretches.</span>
            </h1>
            <CuppyStage
              flavor={flavor}
              animate={animate}
              mode={mode}
              sceneHost={sceneHost}
              onStatus={onStatus}
            />
          </div>

          <Sparkle className="cuppy-sparkle cuppy-sparkle-a" />
          <Sparkle className="cuppy-sparkle cuppy-sparkle-b" />
          <Sparkle className="cuppy-sparkle cuppy-sparkle-c" />

          <div className="cuppy-pitch">
            <p>
              Soft serve with a pull. Dig in, lift slow, and Cuppy follows the spoon up, long and
              silky. Scroll down and see how far it goes.
            </p>
            <InstagramLink className="cuppy-button" />
          </div>

          <FlavorPicker
            name="cuppy-flavor"
            legend="Choose a flavor"
            value={flavorId}
            onChange={setFlavorId}
          />
        </section>

        <section className="cuppy-pull" aria-labelledby="cuppy-pull-title">
          <h2 id="cuppy-pull-title" className="cuppy-visually-hidden">
            How to eat a Cuppy
          </h2>
          <ol className="cuppy-ritual">
            <li className="cuppy-beat cuppy-beat-dig">
              <span className="cuppy-beat-word">Dig in.</span>
              <span className="cuppy-beat-line">Right at the top, where the swirl curls over.</span>
            </li>
            <li className="cuppy-beat cuppy-beat-lift">
              <span className="cuppy-beat-word">
                <Sparkle className="cuppy-beat-sparkle" />
                Lift slow.
              </span>
              <span className="cuppy-beat-line">Cuppy comes up with the spoon.</span>
            </li>
            <li className="cuppy-beat cuppy-beat-stretch">
              <span className="cuppy-beat-word">
                <Sparkle className="cuppy-beat-sparkle" />
                Let it stretch.
              </span>
              <span className="cuppy-beat-line">
                {pulling ? "Keep scrolling. It keeps up." : "As long as the spoon keeps going."}
              </span>
            </li>
          </ol>

          <div className="cuppy-flavor" role="group" aria-labelledby="cuppy-flavor-name">
            <h2 id="cuppy-flavor-name">{flavor.name}</h2>
            <p>{flavor.line}</p>
            <FlavorPicker
              name="cuppy-flavor-pull"
              legend="Pull another flavor"
              value={flavorId}
              onChange={setFlavorId}
              compact
            />
          </div>

          {pulling ? (
            <p className="cuppy-beat cuppy-beat-still">
              <span className="cuppy-beat-word">Still going.</span>
            </p>
          ) : null}
        </section>

        <section className="cuppy-close" aria-labelledby="cuppy-close-title" data-cuppy-dark>
          <h2 id="cuppy-close-title">
            Come for the swirl. <span>Stay for the pull.</span>
          </h2>
          <div className="cuppy-close-action">
            <p>For the latest from Cuppy, follow along on Instagram.</p>
            <InstagramLink className="cuppy-button cuppy-button-cream" />
          </div>
        </section>
      </main>

      <footer className="cuppy-footer">
        <p>
          Internal design concept, not a live Cuppy page. The Cuppy name, mascot cues and palette
          belong to Cuppy Ice Cream; publication needs the owner&rsquo;s permission. The 3D cup and
          spoon are original models and the flavor lines are concept copy, not product claims.
        </p>
      </footer>
    </div>
  );
}
