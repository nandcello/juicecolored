"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { PRODUCT_ALT } from "./brand";
import type { CuppyScene } from "./scene";

type StageStatus = "poster" | "live" | "fallback";
export type StageMode = "scroll" | "still";

const MAX_RESTARTS = 2;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Checks for WebGL before downloading three.js, then releases the probe context. */
function canUseWebGL() {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * The hero slot the cup opens in. With full motion the lazily loaded scene
 * draws into `sceneHost`, a fixed viewport layer, and plays the scoop and
 * stretch from the page scroll. With reduced motion it draws one still pose
 * inside this slot. Until the scene is ready, and whenever WebGL or script is
 * unavailable or lost, a still render of the same pose stands in; the browser
 * picks which still from the same media query, so even the first paint
 * matches the visitor's motion setting.
 *
 * `mode` is null until the motion preference is known on the client. A change
 * of preference tears down the running scene before the next one starts, so
 * there is only ever one canvas and one frame loop.
 */
export function CuppyStage({
  mode,
  sceneHost,
  onStatus,
}: {
  mode: StageMode | null;
  sceneHost: RefObject<HTMLDivElement | null>;
  onStatus: (status: StageStatus) => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ onStatus });
  const restarts = useRef(0);
  const [status, setStatus] = useState<StageStatus>("poster");
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    latest.current.onStatus = onStatus;
  }, [onStatus]);

  useEffect(() => {
    latest.current.onStatus(status);
  }, [status]);

  useEffect(() => {
    if (!mode) return;
    const slot = slotRef.current;
    const host = mode === "scroll" ? sceneHost.current : hostRef.current;
    if (!slot || !host) return;
    if (!canUseWebGL()) {
      setStatus("fallback");
      return;
    }
    let cancelled = false;
    let scene: CuppyScene | null = null;
    setStatus("poster");

    // The lost scene stays referenced so the cleanup below disposes it.
    const onContextLost = () => {
      setStatus("fallback");
      if (restarts.current < MAX_RESTARTS) {
        restarts.current += 1;
        window.setTimeout(() => setEpoch((value) => value + 1), 600);
      }
    };

    import("./scene")
      .then(({ createCuppyScene }) =>
        cancelled
          ? null
          : createCuppyScene(host, {
              animate: mode === "scroll",
              mode,
              slot,
              fontFamily: getComputedStyle(slot).fontFamily,
              onContextLost,
            }),
      )
      .then((created) => {
        if (!created) return;
        if (cancelled) {
          created.dispose();
          return;
        }
        scene = created;
        setStatus("live");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      scene?.dispose();
      scene = null;
    };
  }, [epoch, mode, sceneHost]);

  return (
    <div
      ref={slotRef}
      className="cuppy-stage"
      data-status={status}
      data-mode={mode ?? undefined}
      role="img"
      aria-label={PRODUCT_ALT}
    >
      {/* Still renders of the same procedural model and camera; no brand artwork. */}
      <picture>
        <source media={REDUCED_MOTION} srcSet="/cuppy/poster-still.webp" />
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img
          className="cuppy-poster"
          src="/cuppy/poster-rest.webp"
          alt=""
          width={720}
          height={1068}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div ref={hostRef} className="cuppy-canvas-host" />
    </div>
  );
}
