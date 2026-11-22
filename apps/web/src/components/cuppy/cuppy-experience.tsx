"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useState, useSyncExternalStore, type CSSProperties } from "react";

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
  const reducedMotion = usePrefersReducedMotion();
  const flavor = FLAVORS[flavorId];
  const animate = !reducedMotion && !paused;

  const theme = {
    "--flavor-field": flavor.field,
    "--flavor-ink": flavor.ink,
  } as CSSProperties;

  return (
    <div className="cuppy" data-flavor={flavor.id} style={theme}>
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
            <CuppyStage flavor={flavor} animate={animate} />
          </div>

          <Sparkle className="cuppy-sparkle cuppy-sparkle-a" />
          <Sparkle className="cuppy-sparkle cuppy-sparkle-b" />
          <Sparkle className="cuppy-sparkle cuppy-sparkle-c" />

          <div className="cuppy-pitch">
            <p>
              Soft serve with a pull. Dig in, lift slow, and Cuppy follows the spoon up, long and
              silky, before it lets go.
            </p>
            <InstagramLink className="cuppy-button" />
          </div>

          <fieldset className="cuppy-flavors">
            <legend>Choose a flavor</legend>
            <div className="cuppy-flavor-options">
              {FLAVOR_IDS.map((id) => {
                const option = FLAVORS[id];
                return (
                  <label
                    key={id}
                    className="cuppy-chip"
                    style={
                      { "--chip-fill": option.field, "--chip-ink": option.ink } as CSSProperties
                    }
                  >
                    <input
                      type="radio"
                      name="cuppy-flavor"
                      value={id}
                      checked={flavorId === id}
                      onChange={(event) => {
                        if (isFlavorId(event.target.value)) setFlavorId(event.target.value);
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
        </section>

        <section className="cuppy-flavor" aria-labelledby="cuppy-flavor-name">
          <div className="cuppy-flavor-copy">
            <h2 id="cuppy-flavor-name">{flavor.name}</h2>
            <p>{flavor.line}</p>
          </div>
          <ol className="cuppy-ritual" aria-label="How to eat a Cuppy">
            <li>Dig in.</li>
            <li>
              <Sparkle className="cuppy-ritual-sparkle" />
              Lift slow.
            </li>
            <li>
              <Sparkle className="cuppy-ritual-sparkle" />
              Let it stretch.
            </li>
          </ol>
        </section>

        <section className="cuppy-close" aria-labelledby="cuppy-close-title">
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
          belong to Cuppy Ice Cream; publication needs the owner&rsquo;s permission. The 3D cup is
          an original model and the flavor lines are concept copy, not product claims.
        </p>
      </footer>
    </div>
  );
}
