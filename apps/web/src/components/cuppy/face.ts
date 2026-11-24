// Cuppy's face: an original rubber-hose character printed on the front of the
// paper cup, acting out the pull. The expression is a pure function of the
// page scroll (pose-to-pose keys, no springs), so it reverses exactly, survives
// jumps and resizes, and lands on one held pose at the very bottom of the page.
// Idle life (blinks, a brow flash, glasses riding the float) is layered on top
// by the scene and fades to nothing as the final pose lands.
//
// Drawing is plain 2D canvas in a 1000 x 600 design space; the scene maps that
// canvas onto a band of the cup wall, so it is lit like the rest of the print.

import type { Beats } from "./choreography";

/** Design space the face is drawn in; the scene picks the canvas resolution. */
export const FACE = { width: 1000, height: 600 } as const;

export type FacePose = {
  /** Upper lid closed, 0 (wide open) .. 1 (shut). */
  lid: number;
  /** A cool squint that keeps the eyes behind the shades, 0..1. */
  squint: number;
  /** Lower lid lifted by a smile, 0..1. */
  lower: number;
  /** Eye size, 1 = rest. */
  eye: number;
  /** Pupil size, 1 = rest. */
  pupil: number;
  /** How much the eyes follow the spoon, 0 (at the viewer) .. 1. */
  gaze: number;
  /** Extra lift on both brows, design units. */
  brow: number;
  /** The right brow lifted above the left, 0..1.3. */
  cock: number;
  /** Inner brow ends raised (curious) > 0; arched and pleased < 0. */
  knit: number;
  /** Glasses slid down the face, design units. */
  drop: number;
  /** Glasses rotation, radians (negative tips the left lens down). */
  tilt: number;
  /** Glasses tipped forward off the face, 0..1 (foreshortens them). */
  tip: number;
  /** Lopsided smirk, 0..1. */
  smirk: number;
  /** Mouth corners up, -1..1. */
  smile: number;
  /** Mouth width, 1 = a full grin. */
  width: number;
  /** Mouth open, 0..1 (only the final beaming smile opens). */
  open: number;
  /** Top teeth showing in an open smile, 0..1. */
  teeth: number;
  /** Little cheek creases at the mouth corners, 0..1. */
  cheeks: number;
  /** A round catch-light in each pupil, 0..1. */
  shine: number;
};

export type Expression =
  | "rest"
  | "anticipate"
  | "contact"
  | "scoop"
  | "lift"
  | "curious"
  | "impressed"
  | "final";

/** Cool and relaxed: shades on, eyes squinted behind them, a cocked brow, a smirk. */
const REST: FacePose = {
  lid: 0.2,
  squint: 1,
  lower: 0,
  eye: 1,
  pupil: 1,
  gaze: 0,
  brow: 0,
  cock: 1,
  knit: -0.35,
  drop: 0,
  tilt: -0.035,
  tip: 0,
  smirk: 1,
  smile: 0.35,
  width: 0.62,
  open: 0,
  teeth: 0,
  cheeks: 0.55,
  shine: 0,
};

/** The spoon hovers: eyes peek over the shades at it, the smirk softens. */
const ANTICIPATE: FacePose = {
  ...REST,
  lid: 0.12,
  squint: 0.55,
  gaze: 0.75,
  brow: 6,
  cock: 0.6,
  knit: 0,
  drop: 10,
  tilt: -0.05,
  tip: 0.1,
  smirk: 0.5,
  smile: 0.4,
  width: 0.46,
  cheeks: 0.3,
};

/** The spoon touches: the glasses slip down, round eyes pop up onto the spoon, a small smile. */
const CONTACT: FacePose = {
  ...REST,
  lid: 0,
  squint: 0,
  eye: 1.08,
  gaze: 1,
  brow: 14,
  cock: 0,
  knit: 0.2,
  drop: 70,
  tilt: -0.08,
  tip: 0.45,
  smirk: 0,
  smile: 0.62,
  width: 0.36,
  cheeks: 0.15,
};

/** The spoon takes the top: the glasses perk up and tilt, once. */
const SCOOP: FacePose = {
  ...CONTACT,
  eye: 1.12,
  brow: 20,
  knit: 0.1,
  drop: 50,
  tilt: 0.12,
  tip: 0.25,
  smile: 0.72,
  width: 0.4,
  cheeks: 0.25,
};

/** It lifts away: the glasses settle, the small smile stays. */
const LIFT: FacePose = {
  ...SCOOP,
  eye: 1.08,
  brow: 12,
  knit: 0.05,
  drop: 68,
  tilt: -0.03,
  tip: 0.45,
  smile: 0.76,
  width: 0.44,
  cheeks: 0.3,
};

/** The strand keeps going: one brow goes up. */
const CURIOUS: FacePose = {
  ...LIFT,
  eye: 1.1,
  brow: 12,
  cock: 0.55,
  knit: 0.1,
  drop: 72,
  tilt: -0.05,
  smile: 0.8,
  width: 0.5,
  cheeks: 0.4,
};

/** Still going: the brow climbs higher, the smile widens, still closed. */
const IMPRESSED: FacePose = {
  ...CURIOUS,
  eye: 1.14,
  brow: 14,
  cock: 1,
  knit: 0.12,
  drop: 76,
  tilt: -0.07,
  smile: 0.86,
  width: 0.58,
  cheeks: 0.5,
};

/** Nearly there: the brow as high as it goes. */
const NEARLY: FacePose = {
  ...IMPRESSED,
  eye: 1.18,
  brow: 16,
  cock: 1.3,
  drop: 80,
  tilt: -0.09,
  smile: 0.9,
  width: 0.66,
  cheeks: 0.55,
};

/**
 * Look what I did! Eyes back on the viewer with a catch-light, both brows up
 * and arched, glasses perked back up at a jaunty tilt, a bright open smile.
 */
const FINAL: FacePose = {
  ...NEARLY,
  lower: 0.06,
  eye: 1.14,
  gaze: 0.25,
  brow: 22,
  cock: 0,
  knit: -0.3,
  drop: 58,
  tilt: 0.1,
  tip: 0.3,
  smile: 1,
  width: 0.82,
  open: 0.24,
  teeth: 0.7,
  cheeks: 0.8,
  shine: 1,
};

const FIELDS = Object.keys(REST) as (keyof FacePose)[];

/** The final pose eases in over this last share of the pull; idle life fades out with it. */
const LANDING = 0.12;
/** A scroll position this close to the end counts as the bottom (fractional scroll, rounding). */
export const BOTTOM_SLOP = 2;

type Key = { at: number; pose: FacePose; name: Expression; hold: number };

/**
 * Key positions in scroll px. `hold` is how much of a pose-to-pose hold each
 * segment has (1: a full ease in and out, so the pose reads; 0: linear). The
 * acting beats hit and hold; the long pull keeps growing between its keys.
 */
function keys(beats: Beats, end: number): Key[] {
  const span = end - beats.anchor;
  const at = (p: number) => beats.anchor + span * p;
  return [
    { at: 0, pose: REST, name: "rest", hold: 1 },
    { at: beats.hover * 0.45, pose: REST, name: "rest", hold: 1 },
    { at: beats.hover, pose: ANTICIPATE, name: "anticipate", hold: 1 },
    { at: beats.dig, pose: CONTACT, name: "contact", hold: 1 },
    { at: beats.cradle, pose: SCOOP, name: "scoop", hold: 1 },
    { at: beats.anchor, pose: LIFT, name: "lift", hold: 1 },
    { at: at(0.3), pose: CURIOUS, name: "curious", hold: 0.5 },
    { at: at(0.62), pose: IMPRESSED, name: "impressed", hold: 0.5 },
    { at: at(1 - LANDING), pose: NEARLY, name: "impressed", hold: 0.5 },
    { at: end, pose: FINAL, name: "final", hold: 1 },
  ];
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function smooth01(x: number) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

export type FaceFrame = {
  pose: FacePose;
  expression: Expression;
  /** 0..1 through the pull, from the anchor to the bottom of the page. */
  pull: number;
  /** How much idle life may play: 1 for most of the page, 0 at the bottom. */
  idle: number;
  /** Pull felt by the cream: builds through the pull, eases as the face lands. */
  tension: number;
};

/** The face for a scroll position. Pure: the same scroll always gives the same face. */
export function faceAt(scrollY: number, beats: Beats, maxScroll: number): FaceFrame {
  const end = Math.max(beats.anchor + 1, maxScroll - BOTTOM_SLOP);
  const s = Math.max(0, scrollY);
  const list = keys(beats, end);
  let i = 0;
  while (i < list.length - 2 && s >= list[i + 1].at) i++;
  const a = list[i];
  const b = list[i + 1];
  const t = clamp01((s - a.at) / Math.max(1e-6, b.at - a.at));
  const e = t + (smooth01(t) - t) * b.hold;
  const pose = {} as FacePose;
  for (const field of FIELDS) pose[field] = a.pose[field] + (b.pose[field] - a.pose[field]) * e;

  const pull = clamp01((s - beats.anchor) / (end - beats.anchor));
  let expression = t < 0.5 ? a.name : b.name;
  // "final" only once it has landed; on the way in it is still impressed.
  if (expression === "final" && pull < 1) expression = "impressed";
  return {
    pose,
    expression,
    pull,
    idle: 1 - smooth01((pull - (1 - LANDING)) / LANDING),
    tension:
      smooth01(pull / (1 - LANDING)) * (1 - 0.55 * smooth01((pull - (1 - LANDING)) / LANDING)),
  };
}

/** A short, stable signature of what is drawn, for skipping redundant redraws and for tests. */
export function faceSignature(pose: FacePose, look: { x: number; y: number }, blink: number) {
  let out = "";
  for (const field of FIELDS) out += `${Math.round(pose[field] * 200)},`;
  return `${out}${Math.round(look.x * 200)},${Math.round(look.y * 200)},${Math.round(blink * 50)}`;
}

/** Deterministic blink, 0..1, about every four seconds. */
export function blinkAt(t: number) {
  const period = 4.2;
  const k = Math.floor(t / period);
  const jitter = fract(Math.sin((k + 1) * 12.9898) * 43758.5453) * 1.8;
  const u = (t - k * period - jitter) / 0.17;
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
}

/** The resting "eyebrow flash", 0..1, about every seven seconds. */
export function browFlashAt(t: number) {
  const period = 7.4;
  const u = ((t % period) - 4.6) / 0.75;
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) ** 2 : 0;
}

function fract(x: number) {
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Drawing

const INK = "#17131A";
/** The cup's paper, so lids and cheeks read as the printed card itself. */
const PAPER = "#F2E6D2";
const WHITE = "#FFFAF1";
/** Mouth interior: the brand chocolate, deepened. */
const MOUTH = "#3B2026";
const LINE = 15;

const EYE_Y = 214;
const EYE_X = 108;
const EYE_RX = 66;
const EYE_RY = 84;
const GLASSES_TOP = 178;
const CELL = 18;
const MOUTH_Y = 452;

// Pixel sunglasses, the approved nod to the Cuppy mascot. X = frame, W = glint.
const GLASSES = [
  "XXXXXXXXXXXXXXXXXXXXXXXXXX",
  "..XXWWXXXXXXXXXXWWXXXXXX..",
  "..XXXWWXXXXX..XXXWWXXXXX..",
  "...XXXXXXXX....XXXXXXXX...",
  "....XXXXXX......XXXXXX....",
];

export type FaceExtras = {
  /** Where the pupils point, each axis -1..1 (screen directions). */
  look: { x: number; y: number };
  blink: number;
  /** The glasses lagging the float, design units (positive is down). */
  nudge: number;
};

export function drawFace(ctx: CanvasRenderingContext2D, pose: FacePose, extras: FaceExtras) {
  const scale = ctx.canvas.width / FACE.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = FACE.width / 2;
  for (const side of [-1, 1] as const) drawBrow(ctx, cx + side * EYE_X, pose, side);
  for (const side of [-1, 1] as const) drawEye(ctx, cx + side * EYE_X, pose, extras, side);
  drawNose(ctx, cx);
  drawMouth(ctx, cx, pose);
  drawGlasses(ctx, cx, pose, extras.nudge);
}

function eyeRadii(pose: FacePose) {
  return { rx: EYE_RX * pose.eye, ry: EYE_RY * pose.eye * (1 - 0.5 * pose.squint) };
}

/** Eye center: bigger eyes grow upward and outward; a squint sinks behind the frame. */
function eyeCenter(x: number, pose: FacePose, side: -1 | 1) {
  const grow = EYE_RY * (pose.eye - 1);
  return {
    x: x + side * EYE_RX * (pose.eye - 1) * 0.35,
    y: EYE_Y - grow * 0.55 + pose.squint * 10,
  };
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  pose: FacePose,
  extras: FaceExtras,
  side: -1 | 1,
) {
  const { rx, ry } = eyeRadii(pose);
  const { x: ex, y } = eyeCenter(x, pose, side);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.clip();

  // Pie-cut pupils: a tall ink oval with a wedge of light cut out of it.
  const prx = rx * 0.44 * pose.pupil;
  const pry = ry * 0.52 * pose.pupil;
  const reachX = Math.max(0, rx - prx - 10);
  const reachY = Math.max(0, ry - pry - 8);
  const lx = Math.max(-1, Math.min(1, extras.look.x));
  const ly = Math.max(-1, Math.min(1, extras.look.y));
  // The pupils travel only part of the way, so looking up at a far spoon
  // never reads as eyes rolling back; they converge a touch on the target.
  const px = ex + lx * reachX * 0.8 - side * 4 * pose.gaze;
  const py = y + ly * reachY * 0.6;
  ctx.beginPath();
  ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  // The pie-cut wedge of light, plus a round catch-light for the bright final.
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(px + prx * 0.05, py - pry * 0.05);
  ctx.lineTo(px + prx * 0.25, py - pry * 1.1);
  ctx.lineTo(px + prx * 1.1, py - pry * 0.55);
  ctx.closePath();
  ctx.fill();
  if (pose.shine > 0.01) {
    ctx.beginPath();
    ctx.arc(px - prx * 0.42, py + pry * 0.42, prx * 0.24 * pose.shine, 0, Math.PI * 2);
    ctx.fill();
  }

  // Upper lid: paper drawn down over the eye. The cool rest lid slants down to the outside.
  const lid = Math.max(pose.lid, extras.blink);
  if (lid > 0.005) {
    const slant = 14 * clamp01(pose.lid / REST.lid) * (1 - extras.blink);
    const edge = y - ry + lid * 2 * ry;
    const innerY = edge - slant;
    const outerY = edge + slant;
    const leftY = side < 0 ? outerY : innerY;
    const rightY = side < 0 ? innerY : outerY;
    ctx.beginPath();
    ctx.moveTo(ex - rx - 4, y - ry - 4);
    ctx.lineTo(ex + rx + 4, y - ry - 4);
    ctx.lineTo(ex + rx + 4, rightY);
    ctx.quadraticCurveTo(ex, (leftY + rightY) / 2 + 10 * (1 - lid), ex - rx - 4, leftY);
    ctx.closePath();
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - rx - 4, leftY);
    ctx.quadraticCurveTo(ex, (leftY + rightY) / 2 + 10 * (1 - lid), ex + rx + 4, rightY);
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke();
  }

  // Lower lid: the cheeks pushing up under a grin.
  if (pose.lower > 0.005) {
    const edge = y + ry - pose.lower * 2 * ry;
    ctx.beginPath();
    ctx.moveTo(ex - rx - 4, y + ry + 4);
    ctx.lineTo(ex - rx - 4, edge + 16);
    ctx.quadraticCurveTo(ex, edge - 22, ex + rx + 4, edge + 16);
    ctx.lineTo(ex + rx + 4, y + ry + 4);
    ctx.closePath();
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - rx - 4, edge + 16);
    ctx.quadraticCurveTo(ex, edge - 22, ex + rx + 4, edge + 16);
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.8;
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function drawBrow(ctx: CanvasRenderingContext2D, x: number, pose: FacePose, side: -1 | 1) {
  const { rx } = eyeRadii(pose);
  const ry = EYE_RY * pose.eye;
  const { x: ex, y: center } = eyeCenter(x, pose, side);
  // Brows sit on the open eye, so the squint does not drag them down.
  const y = center - pose.squint * 10;
  const cocked = side > 0 ? pose.cock : 0;
  // The other brow settles a little as one goes up, so the lift reads even
  // when the raised brow is already near the top of the print.
  const settled = side < 0 ? pose.cock * 10 : 0;
  const base = Math.max(34, y - ry - 26 - pose.brow - cocked * 26 + settled);
  const half = rx * 0.98;
  const innerX = ex - side * half * 0.92;
  const outerX = ex + side * half;
  const innerY = Math.max(22, base - pose.knit * 26 + cocked * 4);
  const outerY = base + Math.max(0, pose.knit) * 14 + 8 - Math.min(0, pose.knit) * 4;
  const arch = 18 + cocked * 14 + Math.max(0, -pose.knit) * 6;
  const midX = (innerX + outerX) / 2;
  const midY = Math.min(innerY, outerY) - arch;

  // A tapered stroke: thick in the middle, pinched at the ends.
  const steps = 16;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const qx = (1 - t) ** 2 * innerX + 2 * (1 - t) * t * midX + t * t * outerX;
    const qy = (1 - t) ** 2 * innerY + 2 * (1 - t) * t * midY + t * t * outerY;
    const dx = 2 * (1 - t) * (midX - innerX) + 2 * t * (outerX - midX);
    const dy = 2 * (1 - t) * (midY - innerY) + 2 * t * (outerY - midY);
    const len = Math.hypot(dx, dy) || 1;
    // Heavier toward the inner end, like a brush stroke.
    const w = 4 + 13 * Math.sin(Math.PI * t) ** 0.7 * (1.1 - 0.3 * t);
    top.push([qx + (dy / len) * w, qy - (dx / len) * w]);
    bottom.push([qx - (dy / len) * w, qy + (dx / len) * w]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const [px, py] of top) ctx.lineTo(px, py);
  for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
}

function drawNose(ctx: CanvasRenderingContext2D, cx: number) {
  ctx.beginPath();
  ctx.moveTo(cx - 16, 318);
  ctx.bezierCurveTo(cx - 30, 352, cx + 20, 360, cx + 18, 332);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.85;
  ctx.stroke();
}

function drawMouth(ctx: CanvasRenderingContext2D, cx0: number, pose: FacePose) {
  const cx = cx0 + pose.smirk * 34;
  const half = 112 * pose.width;
  const lift = pose.smile * 46;
  const lx = cx - half;
  const rx = cx + half;
  const ly = MOUTH_Y - lift + pose.smirk * 12;
  const ry = MOUTH_Y - lift - pose.smirk * 36;
  // Upper lip sags a little into the smile; the lower lip drops as it opens.
  const upper = MOUTH_Y + lift * 0.45 - pose.open * 28 + pose.smirk * 6;
  const lower = upper + 16 + pose.open * 250;

  const shut = pose.open < 0.02;
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  if (shut) {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(cx, upper + 12, rx, ry);
    ctx.stroke();
  } else {
    const mouth = new Path2D();
    mouth.moveTo(lx, ly);
    mouth.quadraticCurveTo(cx, upper, rx, ry);
    mouth.quadraticCurveTo(cx + (rx - lx) * 0.04, lower, lx, ly);
    mouth.closePath();
    ctx.save();
    ctx.fillStyle = MOUTH;
    ctx.fill(mouth);
    ctx.clip(mouth);
    if (pose.teeth > 0.01) {
      // A row of top teeth hanging from the upper lip: a bright, open smile.
      const depth = (lower - upper) * 0.42 * pose.teeth;
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.moveTo(lx - 10, ly - 10);
      ctx.quadraticCurveTo(cx, upper - 10, rx + 10, ry - 10);
      ctx.lineTo(rx + 10, ry + depth);
      ctx.quadraticCurveTo(cx, upper + depth, lx - 10, ly + depth);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke(mouth);
  }

  // Cheek creases: little brackets at the corners that deepen with the grin.
  if (pose.cheeks > 0.02) {
    ctx.lineWidth = LINE * 0.8;
    const c = pose.cheeks;
    for (const [x, y, dir] of [
      [lx, ly, -1],
      [rx, ry, 1],
    ] as const) {
      // A smirk only creases its raised side.
      const amount = dir < 0 ? c * (1 - pose.smirk * 0.9) : c;
      if (amount < 0.02) continue;
      ctx.beginPath();
      ctx.moveTo(x + dir * 10, y - 26 * amount);
      ctx.quadraticCurveTo(x + dir * (22 * amount + 8), y, x + dir * 10, y + 26 * amount);
      ctx.stroke();
    }
  }
}

function drawGlasses(ctx: CanvasRenderingContext2D, cx: number, pose: FacePose, nudge: number) {
  const width = GLASSES[0].length * CELL;
  ctx.save();
  ctx.translate(cx, GLASSES_TOP + pose.drop + nudge);
  ctx.rotate(pose.tilt);
  // Tipped forward off the face, the lenses foreshorten.
  ctx.scale(1 - 0.05 * pose.tip, 1 - 0.32 * pose.tip);
  GLASSES.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === ".") continue;
      ctx.fillStyle = cell === "W" ? "#FFFFFF" : INK;
      ctx.fillRect(-width / 2 + c * CELL, r * CELL, CELL + 0.6, CELL + 0.6);
    }
  });
  ctx.restore();
}
