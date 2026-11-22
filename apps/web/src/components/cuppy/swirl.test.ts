import { describe, expect, it } from "vitest";

import { FLAVOR_IDS, FLAVORS, isFlavorId } from "./flavors";
import { buildSwirl, swirlEnvelope, weldSeamNormals } from "./swirl";

describe("buildSwirl", () => {
  const swirl = buildSwirl({ radialSegments: 48, heightSegments: 60, height: 2, radius: 1 });

  it("produces finite, bounded geometry with a closed tip", () => {
    expect(swirl.positions.length).toBe(swirl.rowLength * swirl.rows * 3);
    for (const value of swirl.positions) expect(Number.isFinite(value)).toBe(true);
    let maxRadius = 0;
    for (let i = 0; i < swirl.positions.length; i += 3) {
      maxRadius = Math.max(maxRadius, Math.hypot(swirl.positions[i], swirl.positions[i + 2]));
    }
    // The first coil may overhang the cup rim slightly, never balloon.
    expect(maxRadius).toBeLessThan(1.1);
    expect(swirlEnvelope(1, 1)).toBe(0);
  });

  it("indexes every quad inside the vertex range", () => {
    expect(swirl.indices.length).toBe(48 * 60 * 6);
    const vertexCount = swirl.positions.length / 3;
    expect(Math.max(...swirl.indices)).toBeLessThan(vertexCount);
  });

  it("keeps baked crease occlusion between dark and full light", () => {
    for (const value of swirl.occlusion) {
      expect(value).toBeGreaterThan(0.3);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("welds seam normals so the swirl has no visible crease", () => {
    const normals = new Float32Array(swirl.rowLength * swirl.rows * 3);
    for (let i = 0; i < normals.length; i += 3) normals[i] = (i / 3) % 2 === 0 ? 1 : -1;
    weldSeamNormals(normals, swirl.rowLength, swirl.rows);
    const last = (swirl.rowLength - 1) * 3;
    expect([normals[0], normals[1], normals[2]]).toEqual([
      normals[last],
      normals[last + 1],
      normals[last + 2],
    ]);
  });
});

describe("flavors", () => {
  it("offers only the three source-visible flavors", () => {
    expect(FLAVOR_IDS.map((id) => FLAVORS[id].name)).toEqual([
      "Vanilla",
      "Chocolate",
      "Salted Caramel",
    ]);
    expect(isFlavorId("salted-caramel")).toBe(true);
    expect(isFlavorId("mango")).toBe(false);
  });
});
