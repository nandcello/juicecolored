"use client";

import { useEffect, useRef, useState } from "react";

import type { Flavor } from "./flavors";
import type { CuppyScene } from "./scene";

type StageStatus = "poster" | "live" | "fallback";

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
 * Hosts the lazily loaded WebGL cup. Until the scene is ready, and whenever
 * WebGL is unavailable or lost, a still render of the same model stands in.
 */
export function CuppyStage({ flavor, animate }: { flavor: Flavor; animate: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CuppyScene | null>(null);
  const latest = useRef({ flavor, animate });
  const restarts = useRef(0);
  const [status, setStatus] = useState<StageStatus>("poster");
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    latest.current.flavor = flavor;
    sceneRef.current?.setFlavor(flavor);
  }, [flavor]);

  useEffect(() => {
    latest.current.animate = animate;
    sceneRef.current?.setAnimate(animate);
  }, [animate]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!canUseWebGL()) {
      setStatus("fallback");
      return;
    }
    let cancelled = false;
    let scene: CuppyScene | null = null;
    let inView = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        scene?.setInView(inView);
      },
      { rootMargin: "120px" },
    );
    observer.observe(host);

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
          fontFamily: getComputedStyle(host).fontFamily,
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
        created.setInView(inView);
        // Flavor or motion may have changed while the module loaded.
        created.setAnimate(latest.current.animate);
        setStatus("live");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [epoch]);

  return (
    <div className="cuppy-stage" data-status={status} role="img" aria-label={flavor.posterAlt}>
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
