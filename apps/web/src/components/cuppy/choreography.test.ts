import { describe, expect, it } from "vitest";

import {
  BEND_SPRING,
  beatsFor,
  choreograph,
  creamLeft,
  cupViewportBox,
  cupWallRadius,
  liftIntegral,
  PRODUCT,
  projectToViewport,
  shadowFootprint,
  spoonLocalPose,
  stepSpring,
  SWIRL_CUT_V,
  TUG_SPRING,
  type StageMetrics,
  wordClearanceFade,
} from "./choreography";
import { createStrandBuffers, writeStrand } from "./strand";
import { buildSwirl, splitSwirl } from "./swirl";

// Measured from the real /cuppy layout at these viewports.
const DESKTOP: StageMetrics = {
  width: 1440,
  height: 900,
  visibleHeight: 900,
  maxScroll: 3700,
  hero: { x: 720, groundY: 760, productPx: 560 },
  layout: "wide",
};
const PHONE: StageMetrics = {
  width: 390,
  height: 844,
  visibleHeight: 788,
  maxScroll: 4500,
  hero: { x: 195, groundY: 560, productPx: 400 },
  layout: "narrow",
};

function range(metrics: StageMetrics, step = 7) {
  const values: number[] = [];
  for (let s = 0; s <= metrics.maxScroll; s += step) values.push(s);
  values.push(metrics.maxScroll);
  return values;
}

describe.each([
  ["desktop", DESKTOP],
  ["phone", PHONE],
])("choreography on %s", (_, metrics) => {
  const beats = beatsFor(metrics.height);

  it("keeps the whole cup inside the visible viewport at every scroll position", () => {
    for (const s of range(metrics)) {
      const box = cupViewportBox(choreograph(s, metrics), metrics);
      expect(box.top, `top at ${s}`).toBeGreaterThanOrEqual(0);
      expect(box.bottom, `bottom at ${s}`).toBeLessThanOrEqual(metrics.visibleHeight);
      expect(box.left, `left at ${s}`).toBeGreaterThanOrEqual(0);
      expect(box.right, `right at ${s}`).toBeLessThanOrEqual(metrics.width);
    }
  });

  it("starts with the spoon off screen and the cup in its hero spot", () => {
    const frame = choreograph(0, metrics);
    const spoon = projectToViewport(frame.spoon, frame, metrics);
    expect(spoon.y).toBeLessThan(0);
    expect(frame.holding).toBe(false);
    const ground = projectToViewport(frame.cup, frame, metrics);
    expect(ground.x).toBeCloseTo(metrics.hero.x, 3);
    expect(ground.y).toBeCloseTo(metrics.hero.groundY, 3);
  });

  it("fixes the spoon to the document once the lift is over", () => {
    const anchored = range(metrics).filter((s) => s >= beats.anchor);
    const docY = anchored.map((s) => {
      const frame = choreograph(s, metrics);
      return projectToViewport(frame.spoon, frame, metrics).y + s;
    });
    for (const y of docY) expect(y).toBeCloseTo(docY[0], 6);
    // ...and it is the cup, not the spoon, that keeps up with the reader.
    const late = choreograph(metrics.maxScroll, metrics);
    expect(projectToViewport(late.spoon, late, metrics).y).toBeLessThan(0);
  });

  it("only ever lengthens the pull as the page scrolls down", () => {
    let previous = -Infinity;
    for (const s of range(metrics).filter((s) => s >= beats.cradle)) {
      const frame = choreograph(s, metrics);
      const gap = frame.spoon.y - frame.cup.y;
      expect(gap, `gap at ${s}`).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = gap;
    }
    const first = choreograph(beats.anchor, metrics);
    const last = choreograph(metrics.maxScroll, metrics);
    // Still growing strongly at the bottom of the page: no early cap.
    const nearEnd = choreograph(metrics.maxScroll - metrics.height, metrics);
    expect(last.spoon.y - last.cup.y).toBeGreaterThan(nearEnd.spoon.y - nearEnd.cup.y + 3);
    expect(last.spoon.y - last.cup.y).toBeGreaterThan((first.spoon.y - first.cup.y) * 4);
  });

  it("moves without jumps, so fast scrolling and reversing replay the same path", () => {
    // The fly-in is quick (a few px of travel per px scrolled); a jump would be far larger.
    let prev = choreograph(0, metrics);
    for (const s of range(metrics, 2).slice(1)) {
      const frame = choreograph(s, metrics);
      const a = projectToViewport(prev.cup, prev, metrics);
      const b = projectToViewport(frame.cup, frame, metrics);
      expect(Math.hypot(a.x - b.x, a.y - b.y), `cup step at ${s}`).toBeLessThan(6);
      const c = projectToViewport(prev.spoon, prev, metrics);
      const d = projectToViewport(frame.spoon, frame, metrics);
      expect(Math.hypot(c.x - d.x, c.y - d.y), `spoon step at ${s}`).toBeLessThan(20);
      prev = frame;
    }
    const s = beats.anchor + 400;
    const forward = choreograph(s, metrics);
    choreograph(metrics.maxScroll, metrics);
    expect(choreograph(s, metrics)).toEqual(forward);
  });

  it("stays on screen after a resize or a toolbar change", () => {
    for (const visibleHeight of [metrics.visibleHeight * 0.88, metrics.height]) {
      const resized = { ...metrics, visibleHeight };
      for (const s of range(resized, 37)) {
        const box = cupViewportBox(choreograph(s, resized), resized);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(visibleHeight);
      }
    }
  });
});

describe.each([
  ["desktop", DESKTOP],
  ["phone", PHONE],
])("cream left in the cup on %s", (_, metrics) => {
  const beats = beatsFor(metrics.height);
  const swirl = buildSwirl({ height: PRODUCT.swirlHeight });
  const { base } = splitSwirl(swirl, SWIRL_CUT_V);
  const baseTop = Math.max(...base.positions.filter((_, i) => i % 3 === 1));
  /** Height of cream showing above the rim, as a share of the untouched swirl's. */
  const showing = (drawn: number) => {
    const left = creamLeft(drawn);
    const top = PRODUCT.swirlBase - left.sink + baseTop * left.tall;
    const full = PRODUCT.swirlBase + baseTop;
    return (top - PRODUCT.cupTop) / (full - PRODUCT.cupTop);
  };
  const at = (s: number) => choreograph(s, metrics).drawn;

  it("is full until the spoon has the top", () => {
    for (const s of [0, beats.hover, beats.dig, beats.cradle]) expect(at(s)).toBe(0);
    expect(showing(0)).toBe(1);
  });

  it("drains steadily: visibly less by mid-scroll, only a little at the bottom", () => {
    let previous = -1;
    for (const s of range(metrics)) {
      const drawn = at(s);
      expect(drawn, `drawn at ${s}`).toBeGreaterThanOrEqual(previous);
      previous = drawn;
    }
    expect(showing(at(metrics.maxScroll / 2))).toBeLessThan(0.6);
    expect(showing(at(metrics.maxScroll / 2))).toBeGreaterThan(0.3);
    expect(showing(at(metrics.maxScroll))).toBeLessThan(0.2);
    expect(showing(at(metrics.maxScroll))).toBeGreaterThan(0.05);
  });

  it("fills back up exactly when scrolling back", () => {
    const s = metrics.maxScroll * 0.6;
    const down = at(s);
    at(metrics.maxScroll);
    expect(at(s)).toBe(down);
    expect(at(0)).toBe(0);
  });
});

describe("cream left in the cup", () => {
  it("settles inside the paper and never pushes out through the wall", () => {
    const swirl = buildSwirl({ height: PRODUCT.swirlHeight });
    const { base } = splitSwirl(swirl, SWIRL_CUT_V);
    for (let d = 0; d <= 1.0001; d += 0.02) {
      const left = creamLeft(d);
      // Worst overshoot past the wall, below the rolled rim, at this amount drawn.
      let worst = -Infinity;
      for (let i = 0; i < base.positions.length; i += 3) {
        const y = PRODUCT.swirlBase - left.sink + base.positions[i + 1] * left.tall;
        if (y >= PRODUCT.cupTop) continue;
        const r = Math.hypot(base.positions[i], base.positions[i + 2]) * left.wide;
        worst = Math.max(worst, r - cupWallRadius(y));
      }
      expect(worst, `overshoot at drawn ${d.toFixed(2)}`).toBeLessThan(0.02);
    }
  });
});

describe("shadow and hero word", () => {
  const shape = { rise: 0.16, offsetX: 0.1, offsetZ: -0.12, radius: 0.8 };

  it("projects the shadow as a thin band just under the floating cup", () => {
    const frame = choreograph(0, PHONE);
    const fp = shadowFootprint(frame, PHONE, shape);
    const ground = projectToViewport(frame.cup, frame, PHONE).y;
    const foot = projectToViewport(
      { ...frame.cup, y: frame.cup.y + PRODUCT.float },
      frame,
      PHONE,
    ).y;
    expect(fp.top).toBeLessThan(fp.bottom);
    expect(fp.top).toBeGreaterThan(foot - 20);
    expect(fp.bottom).toBeLessThan(ground + 20);
  });

  it("keeps the full shadow with open space and drops it while the word crosses it", () => {
    const fp = { top: 500, bottom: 520 };
    expect(wordClearanceFade(fp, { top: 545, bottom: 580 })).toBe(1);
    expect(wordClearanceFade(fp, { top: 510, bottom: 545 })).toBe(0);
    expect(wordClearanceFade(fp, { top: 430, bottom: 470 })).toBe(1);
    // Eases rather than snapping as the word approaches.
    let previous = 0;
    for (let top = 520; top <= 540; top += 1) {
      const fade = wordClearanceFade(fp, { top, bottom: top + 35 });
      expect(fade).toBeGreaterThanOrEqual(previous);
      expect(fade - previous).toBeLessThan(0.2);
      previous = fade;
    }
  });
});

describe("spoon path", () => {
  it("passes through the dig and cradle keys and rests at both ends", () => {
    const beats = beatsFor(900);
    const start = spoonLocalPose(0, beats);
    const justAfter = spoonLocalPose(1, beats);
    expect(Math.abs(justAfter.y - start.y)).toBeLessThan(0.01);
    const end = spoonLocalPose(beats.anchor, beats);
    const justBefore = spoonLocalPose(beats.anchor - 1, beats);
    expect(Math.abs(end.y - justBefore.y)).toBeLessThan(0.01);
    // It is lower (in the cream) at the cradle than when it hovers.
    expect(spoonLocalPose(beats.cradle, beats).y).toBeLessThan(
      spoonLocalPose(beats.hover, beats).y,
    );
  });

  it("hands the spoon from the cup to the page with matching speed", () => {
    // Slope of the lift integral: 0 at the start, 1 at the end, smooth between.
    const slope = (s: number) => liftIntegral(s + 0.5, 100, 300) - liftIntegral(s - 0.5, 100, 300);
    expect(slope(100)).toBeLessThan(0.01);
    expect(slope(300)).toBeGreaterThan(0.99);
    expect(slope(500)).toBeCloseTo(1, 6);
  });
});

describe("strand", () => {
  const buffers = createStrandBuffers(120, 20);
  const input = {
    bottom: { x: 0, y: 0, z: 0 },
    bottomDir: { x: 0, y: 1, z: 0 },
    top: { x: 0.3, y: 30, z: 0 },
    topDir: { x: 0, y: -1, z: 0 },
    bottomRadius: 0.42,
    topRadius: 0.4,
    neckRadius: 0.34,
    minRadius: 0.12,
    visibleTop: 6,
    time: 1.2,
    sway: 1,
    bend: 0.2,
    progress: 0.5,
  };

  it("connects both attach points with finite, creamy geometry", () => {
    const { length, neck } = writeStrand(buffers, input);
    expect(length).toBeGreaterThan(29);
    expect(neck).toBeGreaterThanOrEqual(input.minRadius);
    for (const value of buffers.positions) expect(Number.isFinite(value)).toBe(true);
    const row = buffers.radial + 1;
    const ring = (j: number) => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < buffers.radial; i++) {
        x += buffers.positions[(j * row + i) * 3];
        y += buffers.positions[(j * row + i) * 3 + 1];
      }
      return { x: x / buffers.radial, y: y / buffers.radial };
    };
    expect(ring(0).y).toBeCloseTo(0, 1);
    expect(ring(buffers.rings - 1).y).toBeCloseTo(30, 1);
    for (const n of buffers.normals) expect(Number.isFinite(n)).toBe(true);
  });

  it("spends most of its rings on the part that is on screen", () => {
    writeStrand(buffers, input);
    const row = buffers.radial + 1;
    let visible = 0;
    for (let j = 0; j < buffers.rings; j++) {
      if (buffers.positions[j * row * 3 + 1] <= input.visibleTop) visible++;
    }
    expect(visible / buffers.rings).toBeGreaterThan(0.75);
  });

  it("keeps thinning for the whole pull and only reaches its creamy floor at the end", () => {
    const short = writeStrand(buffers, { ...input, top: { x: 0, y: 1.5, z: 0 }, progress: 0 });
    const early = writeStrand(buffers, { ...input, progress: 0.1 });
    const late = writeStrand(buffers, { ...input, top: { x: 0.3, y: 60, z: 0 }, progress: 0.8 });
    const end = writeStrand(buffers, { ...input, top: { x: 0.3, y: 70, z: 0 }, progress: 1 });
    expect(early.neck).toBeLessThan(short.neck);
    expect(late.neck).toBeLessThan(early.neck);
    expect(end.neck).toBeLessThan(late.neck);
    expect(end.neck).toBeCloseTo(input.minRadius, 6);
  });

  it("draws new cream out of the swirl, so features near the cup climb as it pulls", () => {
    // Same visible window, cup end fixed; the spoon end is 3 units further away.
    const radiusAt = (topY: number, y: number) => {
      writeStrand(buffers, { ...input, sway: 0, bend: 0, top: { x: 0, y: topY, z: 0 } });
      const row = buffers.radial + 1;
      let best = 0;
      for (let j = 1; j < buffers.rings; j++) {
        if (buffers.positions[j * row * 3 + 1] > y) {
          best = j;
          break;
        }
      }
      const v = best * row * 3;
      const cy = buffers.positions[v + 1];
      let r = 0;
      for (let i = 0; i < buffers.radial; i++) {
        const p = (best * row + i) * 3;
        r += Math.hypot(
          buffers.positions[p],
          buffers.positions[p + 1] - cy,
          buffers.positions[p + 2],
        );
      }
      return r / buffers.radial;
    };
    const before = [2.5, 3, 3.5, 4, 4.5].map((y) => radiusAt(30, y));
    const after = [2.5, 3, 3.5, 4, 4.5].map((y) => radiusAt(33, y));
    const change = before.reduce((sum, r, i) => sum + Math.abs(r - after[i]), 0);
    expect(change).toBeGreaterThan(0.02);
  });
});

describe("splitSwirl", () => {
  const swirl = buildSwirl({ radialSegments: 48, heightSegments: 60 });
  const { base, top } = splitSwirl(swirl, 0.62);

  it("closes both pieces at a shared cut with domes that bulge into each other", () => {
    expect(base.cutCenter).toEqual(top.cutCenter);
    expect(base.cutRadius).toBeGreaterThan(0.3);
    const apex = (piece: typeof base, row: number) =>
      piece.positions[row * piece.rowLength * 3 + 1];
    expect(apex(base, base.rows - 1)).toBeGreaterThan(base.cutCenter[1]);
    expect(apex(top, 0)).toBeLessThan(top.cutCenter[1]);
    const vertexCount = (piece: typeof base) => piece.positions.length / 3;
    expect(Math.max(...base.indices)).toBeLessThan(vertexCount(base));
    expect(Math.max(...top.indices)).toBeLessThan(vertexCount(top));
  });
});

describe("scroll springs", () => {
  it("bows while scrolling, then wobbles a few times and settles back to the scroll pose", () => {
    const spring = { value: 0, velocity: 0 };
    // Half a second of steady scrolling at 60 fps.
    for (let i = 0; i < 30; i++) stepSpring(spring, 0.4, 1 / 60, BEND_SPRING);
    expect(spring.value).toBeGreaterThan(0.3);
    // Stop: count swings past the rest pose that are big enough to see.
    let swings = 0;
    let side = Math.sign(spring.value);
    let peak = Math.abs(spring.value);
    let moving = true;
    let frames = 0;
    let visibleUntil = 0;
    while (moving && frames < 900) {
      moving = stepSpring(spring, 0, 1 / 60, BEND_SPRING);
      const sign = Math.sign(spring.value);
      if (sign !== 0 && sign !== side) {
        if (peak > 0.03) swings++;
        side = sign;
        peak = 0;
      }
      peak = Math.max(peak, Math.abs(spring.value));
      frames++;
      if (Math.abs(spring.value) > 0.01) visibleUntil = frames / 60;
    }
    expect(swings).toBeGreaterThanOrEqual(3);
    // About a pixel and a half of bow is left after 1.8 s; the rest is invisible.
    expect(visibleUntil).toBeLessThan(1.8);
    expect(Math.abs(spring.value)).toBeLessThan(1e-3);
  });

  it("settles the cup tug quickly without wobbling the cup", () => {
    const spring = { value: -20, velocity: 0 };
    let lowest = 0;
    for (let i = 0; i < 90; i++) {
      stepSpring(spring, 0, 1 / 60, TUG_SPRING);
      lowest = Math.max(lowest, spring.value);
    }
    expect(Math.abs(spring.value)).toBeLessThan(0.5);
    expect(lowest).toBeLessThan(4);
  });
});
