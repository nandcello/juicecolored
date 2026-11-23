// The stretched ribbon of soft serve between the cup and the spoon. Pure
// geometry written into preallocated arrays every frame, so a long pull costs
// the same as a short one and nothing is allocated while scrolling.

import { clamp, smoothstep } from "./choreography";

export type Vec3 = { x: number; y: number; z: number };

export type StrandBuffers = {
  rings: number;
  radial: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

export type StrandInput = {
  /** Attach point inside the cup's swirl, and the direction the strand leaves it. */
  bottom: Vec3;
  bottomDir: Vec3;
  /** Attach point inside the lifted dollop, and the direction the strand leaves it. */
  top: Vec3;
  topDir: Vec3;
  bottomRadius: number;
  topRadius: number;
  /** Neck radius of a short pull, before it thins. */
  neckRadius: number;
  /** Creamy floor: however long the pull, it never thins past this. */
  minRadius: number;
  /** World y above which the strand is off screen and can be coarse. */
  visibleTop: number;
  /** Seconds, for the idle ripple. */
  time: number;
  /** Idle ripple amount, 0..1. */
  sway: number;
  /** Signed sideways bend from the scroll spring, in world units. */
  bend: number;
  /** 0..1 through the whole pull; the neck keeps thinning and lengthening until 1. */
  progress: number;
  /** Scales the scroll-driven bend (a deeper, smaller cup needs more to read). */
  wobbleScale?: number;
  /** Scales the idle ripple (narrow screens keep it calmer). */
  rippleScale?: number;
};

export type StrandResult = { length: number; neck: number };

const FLUTES = 6;
const TAU = Math.PI * 2;

export function createStrandBuffers(rings = 150, radial = 28): StrandBuffers {
  const row = radial + 1;
  const indices = new Uint32Array((rings - 1) * radial * 6);
  let k = 0;
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * row + i;
      const b = a + row;
      indices[k++] = a;
      indices[k++] = a + 1;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = a + 1;
      indices[k++] = b + 1;
    }
  }
  return {
    rings,
    radial,
    positions: new Float32Array(rings * row * 3),
    normals: new Float32Array(rings * row * 3),
    uvs: new Float32Array(rings * row * 2),
    indices,
  };
}

// Scratch space, sized on first use and reused.
let scratch: {
  t: Float64Array;
  /** Material coordinate: distance from the spoon end. */
  m: Float64Array;
  c: Float64Array;
  d: Float64Array;
  r: Float64Array;
  frame: Float64Array;
} | null = null;

function scratchFor(rings: number) {
  if (!scratch || scratch.t.length !== rings) {
    scratch = {
      t: new Float64Array(rings),
      m: new Float64Array(rings),
      c: new Float64Array(rings * 3),
      d: new Float64Array(rings),
      r: new Float64Array(rings),
      frame: new Float64Array(rings * 9),
    };
  }
  return scratch;
}

function bezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Writes the strand into `buffers`. Returns its length and the radius of its neck. */
export function writeStrand(buffers: StrandBuffers, input: StrandInput): StrandResult {
  const { rings, radial, positions, normals, uvs } = buffers;
  const { bottom: b0, top: b3 } = input;
  const s = scratchFor(rings);

  const chord = Math.hypot(b3.x - b0.x, b3.y - b0.y, b3.z - b0.z);
  const reach0 = Math.min(chord * 0.42, 0.9);
  const reach1 = Math.min(chord * 0.42, 0.75);
  const b1 = {
    x: b0.x + input.bottomDir.x * reach0,
    y: b0.y + input.bottomDir.y * reach0,
    z: b0.z + input.bottomDir.z * reach0,
  };
  const b2 = {
    x: b3.x + input.topDir.x * reach1,
    y: b3.y + input.topDir.y * reach1,
    z: b3.z + input.topDir.z * reach1,
  };
  const yAt = (t: number) => bezier(b0.y, b1.y, b2.y, b3.y, t);

  // Spend most rings on the part that is on screen. The curve rises from cup to
  // spoon, so the visible part is the lower end of the parameter range.
  let visible = 1;
  if (yAt(1) > input.visibleTop) {
    let lo = 0;
    let hi = 1;
    for (let n = 0; n < 24; n++) {
      const mid = (lo + hi) / 2;
      if (yAt(mid) > input.visibleTop) hi = mid;
      else lo = mid;
    }
    visible = Math.min(1, hi + 0.02);
  }
  const near = visible < 1 ? Math.round(rings * 0.84) : rings;
  for (let j = 0; j < rings; j++) {
    if (j < near) {
      const u = j / (near - 1 || 1);
      s.t[j] = visible * u;
    } else {
      const u = (j - near + 1) / (rings - near);
      s.t[j] = visible + (1 - visible) * u * u;
    }
  }
  s.t[rings - 1] = 1;

  // Centers and running length.
  let length = 0;
  for (let j = 0; j < rings; j++) {
    const t = s.t[j];
    s.c[j * 3] = bezier(b0.x, b1.x, b2.x, b3.x, t);
    s.c[j * 3 + 1] = bezier(b0.y, b1.y, b2.y, b3.y, t);
    s.c[j * 3 + 2] = bezier(b0.z, b1.z, b2.z, b3.z, t);
    if (j > 0) {
      length += Math.hypot(
        s.c[j * 3] - s.c[j * 3 - 3],
        s.c[j * 3 + 1] - s.c[j * 3 - 2],
        s.c[j * 3 + 2] - s.c[j * 3 - 1],
      );
    }
    s.d[j] = length;
  }

  // Elastic motion, strongest a few units above the cup where it can be seen:
  // a slow travelling ripple plus the sideways bend the scroll spring drives.
  const settled = 1 - Math.exp(-length / 1.5);
  // The bow peaks a few units above the cup, where it is on screen.
  const bendSpan = Math.min(length, 4.5);
  const wobble = input.wobbleScale ?? 1;
  const rippleScale = input.rippleScale ?? 1;
  for (let j = 0; j < rings; j++) {
    const d0 = s.d[j];
    const d1 = length - d0;
    const ends = smoothstep(0, 0.9, d0) * smoothstep(0, 0.9, d1);
    const ripple = input.sway * 0.035 * Math.sin((d0 / 6) * TAU - input.time * 1.4) * settled;
    const bendShape = Math.sin(Math.PI * clamp(d0 / (bendSpan || 1))) * (d0 < bendSpan ? 1 : 0);
    const sideways = (ripple * rippleScale + input.bend * bendShape * wobble) * ends;
    s.c[j * 3] += sideways;
    s.c[j * 3 + 2] += sideways * 0.35;
  }

  // Volume is roughly conserved, so the neck thins as the pull grows. Past the
  // first few units it keeps thinning with page progress, reaching its creamy
  // floor only at the very end, and the neck drawn out of the swirl keeps
  // lengthening too, so the stretch never reads as capped.
  const progress = clamp(input.progress);
  const byLength = input.neckRadius * Math.sqrt(1.2 / Math.max(length, 1.2));
  const byProgress =
    input.neckRadius * 0.62 + (input.minRadius - input.neckRadius * 0.62) * progress;
  const neck = clamp(Math.max(byLength, byProgress), input.minRadius, input.neckRadius);
  const flare = 0.22 + 0.04 * Math.min(length, 10) + 0.55 * progress;
  const lumpy = smoothstep(1.5, 6, length);
  for (let j = 0; j < rings; j++) {
    const d0 = s.d[j];
    const d1 = length - d0;
    s.m[j] = d1;
    // A plain exponential has no flat shoulder: the neck flares continuously
    // into the swirl instead of sitting on it like a collar.
    const fBottom = Math.exp(-d0 / flare);
    const fTop = Math.exp(-((d1 / 0.5) ** 1.4));
    let r = neck + (input.bottomRadius - neck) * fBottom + (input.topRadius - neck) * fTop;
    // Lumps belong to the cream, measured from the spoon. The spoon is fixed to
    // the page and new cream keeps coming out of the swirl, so near the cup
    // they climb the screen at scroll speed while the cup stays put.
    r *=
      1 +
      lumpy *
        (0.09 * Math.sin((d1 / 4.3) * TAU + 0.6) * Math.sin((d1 / 1.9) * TAU + 2.1) +
          0.035 * Math.sin((d1 / 0.9) * TAU));
    s.r[j] = Math.max(r, input.minRadius * 0.92);
  }

  // Parallel-transport frames keep the flutes from twisting on their own.
  for (let j = 0; j < rings; j++) {
    const a = Math.max(0, j - 1);
    const b = Math.min(rings - 1, j + 1);
    let tx = s.c[b * 3] - s.c[a * 3];
    let ty = s.c[b * 3 + 1] - s.c[a * 3 + 1];
    let tz = s.c[b * 3 + 2] - s.c[a * 3 + 2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    let nx: number;
    let ny: number;
    let nz: number;
    if (j === 0) {
      // Start perpendicular to the tangent and the camera axis: T x (0, 0, 1).
      nx = ty;
      ny = -tx;
      nz = 0;
      if (Math.hypot(nx, ny) < 1e-4) {
        nx = 0;
        ny = tz;
        nz = -ty;
      }
    } else {
      const p = (j - 1) * 9;
      nx = s.frame[p + 3];
      ny = s.frame[p + 4];
      nz = s.frame[p + 5];
      const dot = nx * tx + ny * ty + nz * tz;
      nx -= tx * dot;
      ny -= ty * dot;
      nz -= tz * dot;
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const o = j * 9;
    s.frame[o] = tx;
    s.frame[o + 1] = ty;
    s.frame[o + 2] = tz;
    s.frame[o + 3] = nx;
    s.frame[o + 4] = ny;
    s.frame[o + 5] = nz;
    s.frame[o + 6] = ty * nz - tz * ny;
    s.frame[o + 7] = tz * nx - tx * nz;
    s.frame[o + 8] = tx * ny - ty * nx;
  }

  const fluteDepth = 0.075 * (1 - 0.45 * smoothstep(2, 18, length));
  const row = radial + 1;
  for (let j = 0; j < rings; j++) {
    const o = j * 9;
    const f = s.frame;
    const tx = f[o];
    const ty = f[o + 1];
    const tz = f[o + 2];
    const nx = f[o + 3];
    const ny = f[o + 4];
    const nz = f[o + 5];
    const bx = f[o + 6];
    const by = f[o + 7];
    const bz = f[o + 8];
    const r = s.r[j];
    const prev = Math.max(0, j - 1);
    const next = Math.min(rings - 1, j + 1);
    const span = s.d[next] - s.d[prev] || 1;
    const slope = (s.r[next] - s.r[prev]) / span;
    // Flutes spiral with the cream, so they climb with it too.
    const twist = (s.m[j] / 3.2) * TAU;
    for (let i = 0; i < row; i++) {
      const theta = (i / radial) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const wave = Math.cos(FLUTES * theta + twist);
      const radius = r * (1 + fluteDepth * wave);
      const dRadius = -r * fluteDepth * FLUTES * Math.sin(FLUTES * theta + twist);
      // Radial and around-the-tube directions.
      const rx = nx * cos + bx * sin;
      const ry = ny * cos + by * sin;
      const rz = nz * cos + bz * sin;
      const ax = -nx * sin + bx * cos;
      const ay = -ny * sin + by * cos;
      const az = -nz * sin + bz * cos;
      const v = (j * row + i) * 3;
      positions[v] = s.c[j * 3] + rx * radius;
      positions[v + 1] = s.c[j * 3 + 1] + ry * radius;
      positions[v + 2] = s.c[j * 3 + 2] + rz * radius;
      let mx = rx * radius - ax * dRadius - tx * slope * radius;
      let my = ry * radius - ay * dRadius - ty * slope * radius;
      let mz = rz * radius - az * dRadius - tz * slope * radius;
      const ml = Math.hypot(mx, my, mz) || 1;
      mx /= ml;
      my /= ml;
      mz /= ml;
      normals[v] = mx;
      normals[v + 1] = my;
      normals[v + 2] = mz;
      const w = (j * row + i) * 2;
      uvs[w] = i / radial;
      uvs[w + 1] = s.m[j] * 0.6;
    }
  }

  return { length, neck };
}
