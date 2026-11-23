"use client";

import { ArrowUpRight } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { CUPPY_INSTAGRAM_URL } from "./brand";
import { CuppyStage, type StageMode } from "./cuppy-stage";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The visitor's own motion setting is the only switch; there is no in-page
 * override, and nothing is stored. Null until hydrated, so no scene starts
 * before the real preference is known. The first paint does not wait for
 * this: CSS reads the same media query for the layout and the copy.
 */
function useMotionMode(): StageMode | null {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (window.matchMedia(REDUCED_MOTION).matches ? "still" : "scroll"),
    () => null,
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 0C12.9 7.5 16.5 11.1 24 12C16.5 12.9 12.9 16.5 12 24C11.1 16.5 7.5 12.9 0 12C7.5 11.1 11.1 7.5 12 0Z" />
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
  const [sceneStatus, setSceneStatus] = useState("poster");
  const sceneHost = useRef<HTMLDivElement>(null);
  const mode = useMotionMode();
  const onStatus = useCallback((status: string) => setSceneStatus(status), []);

  return (
    <div
      className="cuppy"
      data-motion={mode ?? undefined}
      data-scene={mode === "still" ? "still" : sceneStatus}
    >
      {/* Fixed viewport layer for the scroll scene; decorative, the hero slot carries the image name. */}
      <div ref={sceneHost} className="cuppy-scene" aria-hidden="true" />
      <main>
        <section className="cuppy-hero" aria-labelledby="cuppy-title">
          <header className="cuppy-masthead">
            <p className="cuppy-wordmark">
              Cuppy <span>Ice Cream</span>
            </p>
            <p className="cuppy-concept-tag">Internal concept</p>
          </header>

          <div className="cuppy-headline">
            <h1 id="cuppy-title" className="cuppy-title">
              <span className="cuppy-title-lead">The scoop that</span>{" "}
              <span className="cuppy-title-gap" aria-hidden="true" />
              <span className="cuppy-title-word">stretches.</span>
            </h1>
            <CuppyStage mode={mode} sceneHost={sceneHost} onStatus={onStatus} />
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
              {/* Copy that narrates the live pull shows only while the pull can play (CSS decides, from the first paint). */}
              <span className="cuppy-beat-line cuppy-when-pull">Keep scrolling. It keeps up.</span>
              <span className="cuppy-beat-line cuppy-when-still">
                As long as the spoon keeps going.
              </span>
            </li>
          </ol>

          <p className="cuppy-beat cuppy-beat-still cuppy-when-pull">
            <span className="cuppy-beat-word">Still going.</span>
          </p>
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
          spoon are original models and the page copy is concept copy, not product claims.
        </p>
      </footer>
    </div>
  );
}
