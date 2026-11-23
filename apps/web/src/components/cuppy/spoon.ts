// Procedural spoon: an egg-shaped bowl with a rolled lip and a long, gently
// rising handle that widens toward its end. Local frame: bowl center at the
// origin, the bowl opens toward +y, its tip points to -x, the handle runs to +x.

import { BufferAttribute, BufferGeometry } from "three";

export const SPOON = {
  /** Bowl half-length toward the tip and toward the handle. */
  tipLength: 0.56,
  backLength: 0.46,
  halfWidth: 0.36,
  depth: 0.17,
  shell: 0.032,
  handleLength: 2.35,
} as const;

function grid(rows: number, columns: number, closed: boolean) {
  const indices: number[] = [];
  const row = columns + (closed ? 1 : 0);
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < row - 1; i++) {
      const a = j * row + i;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return indices;
}

function geometryFrom(positions: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** One continuous sheet: outer shell, rolled lip, inner shell. */
export function buildBowl(around = 72, down = 22) {
  const { tipLength, backLength, halfWidth, depth, shell } = SPOON;
  const lip = 5;
  const positions: number[] = [];
  // Profile from the outer bottom, up over the lip, and back down inside.
  const profile: { phi: number; inset: number; lift: number }[] = [];
  for (let k = 0; k <= down; k++)
    profile.push({ phi: (k / down) * (Math.PI / 2), inset: 0, lift: 0 });
  for (let k = 1; k < lip; k++) {
    const a = (k / lip) * Math.PI;
    profile.push({
      phi: Math.PI / 2,
      inset: shell * (1 - Math.cos(a)) * 0.5,
      lift: shell * 0.55 * Math.sin(a),
    });
  }
  for (let k = down; k >= 0; k--)
    profile.push({ phi: (k / down) * (Math.PI / 2), inset: shell, lift: 0 });

  for (const { phi, inset, lift } of profile) {
    for (let i = 0; i <= around; i++) {
      const u = (i / around) * Math.PI * 2;
      const c = Math.cos(u);
      const s = Math.sin(u);
      // Longer, slightly pointed toward the tip; rounder toward the handle.
      const length = c < 0 ? tipLength * (1 + 0.06 * c * c) : backLength;
      const ex = Math.sin(phi) * (length - inset) * c;
      const ez = Math.sin(phi) * (halfWidth - inset) * s;
      // The tip sits a touch lower so the bowl reads as made for scooping.
      const ey =
        -Math.cos(phi) * (depth - inset) + lift + (c < 0 ? -0.025 * c * c * Math.sin(phi) : 0);
      positions.push(ex, ey, ez);
    }
  }
  return geometryFrom(positions, grid(profile.length, around, true));
}

/** Flattened, tapering handle that rises away from the bowl and ends in a rounded paddle. */
export function buildHandle(segments = 64, around = 20) {
  const { backLength, handleLength } = SPOON;
  const positions: number[] = [];
  const start = backLength * 0.72;
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    const x = start + t * handleLength;
    // Rises steeply off the bowl, then runs nearly straight.
    const y = 0.035 + 0.3 * (1 - Math.exp(-t * 5)) + 0.04 * t;
    const slope = (0.3 * 5 * Math.exp(-t * 5)) / handleLength + 0.04 / handleLength;
    const neck = Math.exp(-(((t - 0.12) / 0.1) ** 2));
    let width = 0.13 + 0.1 * smoothRamp(0.15, 0.85, t) - 0.035 * neck;
    let thickness = 0.05 + 0.012 * neck;
    // Round off the far end.
    const end = t > 0.94 ? Math.sqrt(Math.max(0, 1 - ((t - 0.94) / 0.06) ** 2)) : 1;
    width *= end;
    thickness *= Math.max(end, 0.15);
    const tl = Math.hypot(1, slope);
    const ux = -slope / tl;
    const uy = 1 / tl;
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2;
      const up = Math.sin(a) * thickness * 0.5;
      const side = Math.cos(a) * width * 0.5;
      positions.push(x + ux * up, y + uy * up, side);
    }
  }
  return geometryFrom(positions, grid(segments + 1, around, true));
}

function smoothRamp(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
