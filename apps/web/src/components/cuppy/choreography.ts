// Scroll choreography for the Cuppy stretch. Pure math with no three.js or DOM,
// so the invariants (cup always on screen, spoon fixed to the document, stretch
// that only grows) can be unit-tested.
//
// Coordinates: world units, y up. At depth z = 0 one unit spans `ppu` CSS px,
// and world y = -documentY / ppu, so the camera follows the scroll position.
// The cup is placed in viewport space and therefore travels down the document
// with the reader. Once the lift ends, the spoon is fixed in world space, which
// is the same as fixed in the document.

/** Cup and swirl measurements shared with the scene, in world units. */
export const PRODUCT = {
  cupTop: 1.2,
  swirlBase: 1.14,
  swirlHeight: 1.95,
  /** Cup plus the full swirl. */
  height: 3.15,
  /** The cup hovers this far above its ground line. */
  float: 0.42,
  /** Widest point, the first coil over the rim. */
  width: 2.2,
} as const;

/** Swirl rows above this fraction of its height are the piece the spoon lifts. */
export const SWIRL_CUT_V = 0.62;
/** Height of the swirl cut above the cup's ground point. */
export const CUT_HEIGHT = PRODUCT.float + PRODUCT.swirlBase + PRODUCT.swirlHeight * SWIRL_CUT_V;
/** What stays visible of the cup once the top has been lifted away. */
const REST_PRODUCT_HEIGHT = CUT_HEIGHT + 0.25;

export const CAMERA_FOV = 24;
const HALF_FOV_TAN = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

export type Layout = "wide" | "narrow";

export type StageMetrics = {
  /** Stage size in CSS px. The stage is fixed to the viewport and 100lvh tall. */
  width: number;
  height: number;
  /** Height of the viewport that is actually visible (changes with mobile toolbars). */
  visibleHeight: number;
  /** Largest scrollY the document allows. */
  maxScroll: number;
  /** The hero slot the cup opens in, in document px. */
  hero: { x: number; groundY: number; productPx: number };
  layout: Layout;
};

/** Position plus rotation, applied in three.js Euler order "YXZ". */
export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number };

export type Beats = { hover: number; dig: number; cradle: number; anchor: number };

export type Choreography = {
  /** Scroll positions (px) at which each beat lands. */
  beats: Beats;
  /** CSS px per world unit at z = 0. */
  ppu: number;
  cameraY: number;
  cameraDistance: number;
  /** Ground point of the cup, under its foot. */
  cup: Pose;
  /** On-screen scale of the cup relative to the hero, from depth alone. */
  cupScale: number;
  /** Bowl center of the spoon. */
  spoon: Pose;
  /** 0 before the spoon arrives, 1 once it rests in the document. */
  scoop: number;
  /** The spoon is holding the top of the swirl. */
  holding: boolean;
  /** The spoon has stopped and now belongs to the document. */
  anchored: boolean;
  /** Scroll px spent pulling since the spoon took the top. */
  pulled: number;
  /** 0..1 through the stretch, from the anchor to the end of the page. */
  stretch: number;
  /** How much of the idle float and sway may play, 0..1. */
  sway: number;
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Beat positions scale with the stable stage height, so a toolbar change never re-times them. */
export function beatsFor(height: number): Beats {
  return { hover: 0.2 * height, dig: 0.32 * height, cradle: 0.44 * height, anchor: 0.64 * height };
}

/**
 * Lift integral. Its slope eases from 0 to 1 between `start` and `end`, which
 * hands the spoon from riding with the cup (slope 0) to riding with the page
 * (slope 1) without a jolt in either position or speed.
 */
export function liftIntegral(s: number, start: number, end: number) {
  if (s <= start) return 0;
  const span = end - start;
  if (s >= end) return span / 2 + (s - end);
  const u = (s - start) / span;
  return span * (u * u * u - (u * u * u * u) / 2);
}

/**
 * Where the lifted top sits in the spoon's bowl frame: resting over the bowl,
 * its cut face just above the rim and nudged toward the tip, where the cream
 * spills over and the strand hangs from.
 */
export const DOLLOP_SEAT = { x: -0.2, y: 0.15, z: 0 } as const;

/** Rotates a bowl-local vector by a pose's rotation (three.js Euler order "YXZ"). */
export function rotateByPose(
  v: { x: number; y: number; z: number },
  pose: Pick<Pose, "rx" | "ry" | "rz">,
) {
  const cz = Math.cos(pose.rz);
  const sz = Math.sin(pose.rz);
  const x1 = v.x * cz - v.y * sz;
  const y1 = v.x * sz + v.y * cz;
  const cx = Math.cos(pose.rx);
  const sx = Math.sin(pose.rx);
  const y2 = y1 * cx - v.z * sx;
  const z2 = y1 * sx + v.z * cx;
  const cy = Math.cos(pose.ry);
  const sy = Math.sin(pose.ry);
  return { x: x1 * cy + z2 * sy, y: y2, z: -x1 * sy + z2 * cy };
}

// Spoon path in the cup's local frame (origin at the cup's ground point):
// drop in from above, hover, dig into the side of the tip, sink in level
// beneath it, then lift with the bowl turned toward the reader so the
// scoop shows. The last key sits at z = 0, so once the spoon is fixed in
// world space it moves exactly with the document.
const CUT = CUT_HEIGHT;
const CRADLE_TURN = { rx: 0.12, ry: -0.22, rz: 0.04 };
const seat = rotateByPose(DOLLOP_SEAT, CRADLE_TURN);
const SPOON_KEYS: readonly Pose[] = [
  { x: 2.3, y: CUT + 5.2, z: 1.2, rx: 0.25, ry: -0.6, rz: 1.05 },
  { x: 1.15, y: CUT + 0.8, z: 0.6, rx: 0.35, ry: -0.42, rz: 0.62 },
  { x: 0.8, y: CUT + 0.12, z: 0.42, rx: 0.3, ry: -0.34, rz: 0.52 },
  { x: -seat.x, y: CUT - seat.y, z: -seat.z, ...CRADLE_TURN },
  { x: 0.45, y: CUT + 0.4, z: 0, rx: 0.62, ry: -0.6, rz: 0.36 },
];

const POSE_KEYS = ["x", "y", "z", "rx", "ry", "rz"] as const;

/** Cubic Hermite through the keys: Catmull-Rom inside, at rest at both ends. */
export function spoonLocalPose(s: number, beats: Beats): Pose {
  const knots = [0, beats.hover, beats.dig, beats.cradle, beats.anchor];
  const last = knots.length - 1;
  if (s <= 0) return { ...SPOON_KEYS[0] };
  if (s >= knots[last]) return { ...SPOON_KEYS[last] };
  let i = 0;
  while (i < last - 1 && s > knots[i + 1]) i++;
  const t = (s - knots[i]) / (knots[i + 1] - knots[i]);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const pose: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  for (const key of POSE_KEYS) {
    const p0 = SPOON_KEYS[i][key];
    const p1 = SPOON_KEYS[i + 1][key];
    const m0 = i === 0 ? 0 : (SPOON_KEYS[i + 1][key] - SPOON_KEYS[i - 1][key]) / 2;
    const m1 = i + 1 === last ? 0 : (SPOON_KEYS[i + 2][key] - SPOON_KEYS[i][key]) / 2;
    pose[key] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
  }
  return pose;
}

/** The spoon pose at the moment it takes the top, which the scene uses to seat the dollop. */
export function cradlePose(): Pose {
  return { ...SPOON_KEYS[3] };
}

/** Where the cup settles for the stretch, in viewport px, plus its on-screen scale. */
export function edgePad(width: number) {
  return Math.max(16, Math.min(44, width * 0.032));
}

export function restPlacement(metrics: StageMetrics, ppu: number) {
  const { width, visibleHeight, layout } = metrics;
  const pad = edgePad(width);
  if (layout === "wide") {
    const scale = Math.min(1, (0.44 * visibleHeight) / (REST_PRODUCT_HEIGHT * ppu));
    return { x: width / 2, groundY: visibleHeight - Math.max(pad, visibleHeight * 0.035), scale };
  }
  const scale = Math.min(
    1,
    (0.42 * width) / (PRODUCT.width * ppu),
    (0.34 * visibleHeight) / (REST_PRODUCT_HEIGHT * ppu),
  );
  const halfWidth = (PRODUCT.width * ppu * scale) / 2;
  return { x: width - pad - halfWidth, groundY: visibleHeight - pad, scale };
}

export function choreograph(scrollY: number, metrics: StageMetrics): Choreography {
  const { width, height, maxScroll, hero } = metrics;
  const s = clamp(scrollY, 0, Math.max(0, maxScroll));
  const beats = beatsFor(height);
  // The hero fits the full product (plus its float) into the slot.
  const ppu = hero.productPx / (PRODUCT.height + PRODUCT.float);
  const cameraDistance = height / (2 * ppu * HALF_FOV_TAN);
  const cameraY = -(s + height / 2) / ppu;

  const unproject = (vpX: number, vpY: number, z: number) => {
    const scale = (cameraDistance - z) / cameraDistance / ppu;
    return { x: (vpX - width / 2) * scale, y: cameraY + (height / 2 - vpY) * scale };
  };

  // The cup holds its hero spot on screen through the scoop, then settles
  // (and on narrow screens recedes into the right-hand lane) for the stretch.
  // Narrow screens also slide it right during the scoop, still at full size,
  // so the spoon is left behind in the lane instead of over the copy.
  const heroVp = { x: hero.x, groundY: hero.groundY };
  if (metrics.layout === "narrow") {
    const laneX = width - edgePad(width) - (PRODUCT.width * ppu) / 2;
    heroVp.x += Math.max(0, laneX - hero.x) * smoothstep(beats.hover * 0.5, beats.anchor, s);
  }
  const rest = restPlacement(metrics, ppu);
  const settleSpan = (metrics.layout === "wide" ? 0.85 : 0.45) * height;
  const settle = smoothstep(beats.anchor, beats.anchor + settleSpan, s);
  const restZ = cameraDistance * (1 - 1 / rest.scale);
  const cupZ = lerp(0, restZ, settle);
  const cupVp = unproject(
    lerp(heroVp.x, rest.x, settle),
    lerp(heroVp.groundY, rest.groundY, settle),
    cupZ,
  );
  const cupScale = cameraDistance / (cameraDistance - cupZ);

  // The spoon moves in the frame of the hero cup until the lift hands it to
  // the page. After the anchor beat it is fixed in world space.
  const heroCup = unproject(heroVp.x, heroVp.groundY, 0);
  const local = spoonLocalPose(s, beats);
  const lift = liftIntegral(s, beats.cradle, beats.anchor) / ppu;
  const spoon: Pose = {
    x: heroCup.x + local.x,
    y: heroCup.y + local.y + lift,
    z: local.z,
    rx: local.rx,
    ry: local.ry,
    rz: local.rz,
  };

  const pulled = Math.max(0, s - beats.cradle);
  const stretchSpan = Math.max(1, maxScroll - beats.anchor);
  return {
    beats,
    ppu,
    cameraY,
    cameraDistance,
    cup: { x: cupVp.x, y: cupVp.y, z: cupZ, rx: 0, ry: 0, rz: 0 },
    cupScale,
    spoon,
    scoop: clamp(s / beats.anchor),
    holding: s >= beats.cradle,
    anchored: s >= beats.anchor,
    pulled,
    stretch: clamp((s - beats.anchor) / stretchSpan),
    // Idle float stops before the spoon touches the cream (so the top is
    // handed over exactly) and returns, gentler, once the pull is underway.
    sway:
      1 -
      smoothstep(0, beats.hover, s) +
      0.45 * smoothstep(beats.anchor, beats.anchor + 0.4 * height, s),
  };
}

/** Projects a world point to viewport px for a given choreography frame. */
export function projectToViewport(
  point: { x: number; y: number; z: number },
  frame: Pick<Choreography, "ppu" | "cameraY" | "cameraDistance">,
  metrics: Pick<StageMetrics, "width" | "height">,
) {
  const scale = (frame.ppu * frame.cameraDistance) / (frame.cameraDistance - point.z);
  return {
    x: metrics.width / 2 + point.x * scale,
    y: metrics.height / 2 - (point.y - frame.cameraY) * scale,
  };
}

/** Approximate on-screen box of the cup and what remains of its swirl. */
export function cupViewportBox(frame: Choreography, metrics: StageMetrics) {
  const half = PRODUCT.width / 2;
  const top = frame.holding ? REST_PRODUCT_HEIGHT : PRODUCT.height + PRODUCT.float;
  const a = projectToViewport(
    { x: frame.cup.x - half, y: frame.cup.y + top, z: frame.cup.z },
    frame,
    metrics,
  );
  const b = projectToViewport(
    { x: frame.cup.x + half, y: frame.cup.y, z: frame.cup.z },
    frame,
    metrics,
  );
  return { left: a.x, top: a.y, right: b.x, bottom: b.y };
}

export type Spring = { value: number; velocity: number };
export type SpringTuning = { stiffness: number; damping: number };

/** Underdamped on purpose: a hard stop leaves two or three visible wobbles. */
export const BEND_SPRING: SpringTuning = { stiffness: 150, damping: 5.4 };
/** The cup's tug settles faster and barely overshoots. */
export const TUG_SPRING: SpringTuning = { stiffness: 40, damping: 6 };

/** Steps a spring toward its target at a fixed 120 Hz substep; returns whether it is still moving. */
export function stepSpring(spring: Spring, target: number, dt: number, tuning: SpringTuning) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const force = (target - spring.value) * tuning.stiffness - spring.velocity * tuning.damping;
    spring.velocity += force * h;
    spring.value += spring.velocity * h;
  }
  return Math.abs(spring.value - target) > 1e-4 || Math.abs(spring.velocity) > 1e-3;
}
