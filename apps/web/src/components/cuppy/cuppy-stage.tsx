"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { Flavor } from "./flavors";
import type { CuppyScene } from "./scene";

type StageStatus = "poster" | "live" | "fallback";
export type StageMode = "scroll" | "still";

const MAX_RESTARTS = 2;

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
 * inside this slot. Until the scene is ready, and whenever WebGL is
 * unavailable or lost, a still render of the cup stands in.
 */
export function CuppyStage({
  flavor,
  animate,
  mode,
  sceneHost,
  onStatus,
}: {
  flavor: Flavor;
  animate: boolean;
  mode: StageMode;
  sceneHost: RefObject<HTMLDivElement | null>;
  onStatus: (status: StageStatus) => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CuppyScene | null>(null);
  const latest = useRef({ flavor, animate, onStatus });
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
    latest.current.flavor = flavor;
    sceneRef.current?.setFlavor(flavor);
  }, [flavor]);

  useEffect(() => {
    latest.current.animate = animate;
    sceneRef.current?.setAnimate(animate);
  }, [animate]);

  useEffect(() => {
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

    const onContextLost = () => {
      sceneRef.current = null;
      setStatus("fallback");
      if (restarts.current < MAX_RESTARTS) {
        restarts.current += 1;
        window.setTimeout(() => setEpoch((value) => value + 1), 600);
      }
    };

    import("./scene")
      .then(({ createCuppyScene }) =>
        createCuppyScene(host, {
          flavor: latest.current.flavor,
          animate: latest.current.animate,
          mode,
          slot,
          fontFamily: getComputedStyle(slot).fontFamily,
          onContextLost,
        }),
      )
      .then((created) => {
        if (cancelled) {
          created.dispose();
          return;
        }
        scene = created;
        sceneRef.current = created;
        // Flavor or motion may have changed while the module loaded.
        created.setFlavor(latest.current.flavor);
        created.setAnimate(latest.current.animate);
        setStatus("live");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [epoch, mode, sceneHost]);

  return (
    <div
      ref={slotRef}
      className="cuppy-stage"
      data-status={status}
      data-mode={mode}
      role="img"
      aria-label={flavor.posterAlt}
    >
      {/* Still renders of the same procedural model; no brand artwork. */}
      {/* oxlint-disable-next-line nextjs/no-img-element */}
      <img
        className="cuppy-poster"
        src={`/cuppy/poster-${flavor.id}.webp`}
        alt=""
        width={720}
        height={1068}
        decoding="async"
        fetchPriority="high"
      />
      <div ref={hostRef} className="cuppy-canvas-host" />
    </div>
  );
}
