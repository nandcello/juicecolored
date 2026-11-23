// Pure geometry for the soft-serve swirl. Kept free of three.js so it can be
// unit-tested and so the scene module only wraps the arrays in buffers.

export type SwirlOptions = {
  /** Vertices around the swirl. */
  radialSegments?: number;
  /** Rows from the base to the tip. */
  heightSegments?: number;
  /** Height of the swirl above its base. */
  height?: number;
  /** Widest radius, slightly wider than the cup rim so the first coil overhangs. */
  radius?: number;
};

export type SwirlGeometryData = {
  positions: Float32Array;
  uvs: Float32Array;
  /** Baked crease occlusion, 0..1 per vertex, used as a vertex color. */
  occlusion: Float32Array;
  indices: Uint32Array;
  /** Vertices per row, including the duplicated seam vertex. */
  rowLength: number;
  rows: number;
};

const TAU = Math.PI * 2;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Envelope of the swirl: emerges from inside the cup, swells over the rim, tapers to a tip. */
export function swirlEnvelope(v: number, radius: number) {
  const emerge = 0.9 + 0.1 * smoothstep(0, 0.07, v);
  const taper = Math.pow(Math.max(0, 1 - v), 0.72);
  return radius * emerge * taper;
}

/**
 * Builds a single watertight surface shaped like piped soft serve: stacked
 * coils that spiral upward and shrink toward a curled tip, with fine
 * star-nozzle ridges running along each coil.
 */
export function buildSwirl(options: SwirlOptions = {}): SwirlGeometryData {
  const radialSegments = options.radialSegments ?? 160;
  const heightSegments = options.heightSegments ?? 200;
  const height = options.height ?? 1.95;
  const radius = options.radius ?? 1.06;

  // Coils shrink as the swirl narrows. Integrate the coil count so the spiral
  // stays continuous while the coil height changes.
  const phases = new Float64Array(heightSegments + 1);
  for (let j = 1; j <= heightSegments; j++) {
    const v = (j - 0.5) / heightSegments;
    const coilHeight = 0.3 + 0.52 * (swirlEnvelope(v, radius) / radius);
    phases[j] = phases[j - 1] + height / heightSegments / coilHeight;
  }

  const rowLength = radialSegments + 1;
  const rows = heightSegments + 1;
  const positions = new Float32Array(rowLength * rows * 3);
  const uvs = new Float32Array(rowLength * rows * 2);
  const occlusion = new Float32Array(rowLength * rows);

  for (let j = 0; j < rows; j++) {
    const v = j / heightSegments;
    const envelope = swirlEnvelope(v, radius);
    // Grooves soften toward the tip, where piping turns into a single curl
    // that leans and folds over to one side, the way a machine swirl lets go.
    const depth = 0.24 * (1 - smoothstep(0.7, 1, v));
    const curl = smoothstep(0.58, 1, v);
    const centerX = 0.44 * curl * curl * curl;
    const centerY = -0.2 * Math.pow(curl, 4);

    for (let i = 0; i < rowLength; i++) {
      const u = i / radialSegments;
      const theta = u * TAU;
      const phase = phases[j] - u;
      const s = phase - Math.floor(phase) - 0.5;
      const tube = Math.sqrt(Math.max(0, 1 - 4 * s * s));
      // Star-nozzle flutes running along each coil.
      const ridge = Math.cos(TAU * 3 * s) * 0.038 * tube * (1 - curl);
      const r = envelope * (1 - depth * (1 - tube) + ridge);
      const index = j * rowLength + i;
      positions[index * 3] = centerX + Math.sin(theta) * r;
      positions[index * 3 + 1] = v * height + centerY;
      positions[index * 3 + 2] = Math.cos(theta) * r;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = v;
      const crease = Math.pow(1 - tube, 1.6) * (depth / 0.24);
      const base = 1 - smoothstep(0, 0.05, v);
      occlusion[index] = 1 - 0.42 * crease - 0.25 * base;
    }
  }

  const indices = new Uint32Array(radialSegments * heightSegments * 6);
  let k = 0;
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * rowLength + i;
      const b = a + rowLength;
      indices[k++] = a;
      indices[k++] = a + 1;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = a + 1;
      indices[k++] = b + 1;
    }
  }

  return { positions, uvs, occlusion, indices, rowLength, rows };
}

/** Averages normals across the duplicated u=0/u=1 seam so no crease shows. */
export function weldSeamNormals(normals: Float32Array, rowLength: number, rows: number) {
  for (let j = 0; j < rows; j++) {
    const first = j * rowLength * 3;
    const last = (j * rowLength + rowLength - 1) * 3;
    let x = normals[first] + normals[last];
    let y = normals[first + 1] + normals[last + 1];
    let z = normals[first + 2] + normals[last + 2];
    const length = Math.hypot(x, y, z) || 1;
    x /= length;
    y /= length;
    z /= length;
    normals[first] = normals[last] = x;
    normals[first + 1] = normals[last + 1] = y;
    normals[first + 2] = normals[last + 2] = z;
  }
}

export type SwirlPiece = SwirlGeometryData & {
  /** Center of the cut face, in swirl space. */
  cutCenter: [number, number, number];
  /** Mean radius of the cut ring. */
  cutRadius: number;
};

/**
 * Splits the swirl at a row into the base that stays in the cup and the top
 * that the spoon lifts. Each piece closes its cut with a shallow dome that
 * bulges into the other piece, so the joined swirl looks untouched and either
 * half looks like soft serve once they part.
 */
export function splitSwirl(
  data: SwirlGeometryData,
  cutV: number,
  options: { capRows?: number; dome?: number } = {},
): { base: SwirlPiece; top: SwirlPiece } {
  const capRows = options.capRows ?? 10;
  const dome = options.dome ?? 0.14;
  const { rowLength, rows } = data;
  const cutRow = Math.min(rows - 2, Math.max(1, Math.round(cutV * (rows - 1))));

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < rowLength - 1; i++) {
    const p = (cutRow * rowLength + i) * 3;
    cx += data.positions[p];
    cy += data.positions[p + 1];
    cz += data.positions[p + 2];
  }
  const count = rowLength - 1;
  cx /= count;
  cy /= count;
  cz /= count;
  let cutRadius = 0;
  for (let i = 0; i < count; i++) {
    const p = (cutRow * rowLength + i) * 3;
    cutRadius += Math.hypot(data.positions[p] - cx, data.positions[p + 2] - cz);
  }
  cutRadius /= count;

  function piece(fromRow: number, toRow: number, capAtEnd: boolean): SwirlPiece {
    const bodyRows = toRow - fromRow + 1;
    const total = bodyRows + capRows;
    const positions = new Float32Array(total * rowLength * 3);
    const uvs = new Float32Array(total * rowLength * 2);
    const occlusion = new Float32Array(total * rowLength);
    const ring = (target: number, source: number) => {
      positions.set(
        data.positions.subarray(source * rowLength * 3, (source + 1) * rowLength * 3),
        target * rowLength * 3,
      );
      uvs.set(
        data.uvs.subarray(source * rowLength * 2, (source + 1) * rowLength * 2),
        target * rowLength * 2,
      );
      occlusion.set(
        data.occlusion.subarray(source * rowLength, (source + 1) * rowLength),
        target * rowLength,
      );
    };
    // Base: body rows, then cap rows closing upward. Top: cap rows opening
    // downward-to-up, then body rows.
    const capStart = capAtEnd ? bodyRows : 0;
    const bodyStart = capAtEnd ? 0 : capRows;
    for (let r = 0; r < bodyRows; r++) ring(bodyStart + r, fromRow + r);
    const sign = capAtEnd ? 1 : -1;
    for (let k = 0; k < capRows; k++) {
      // Distance from the cut ring toward the apex, 1/capRows .. 1.
      const step = capAtEnd ? k + 1 : capRows - k;
      const a = (step / capRows) * (Math.PI / 2);
      const shrink = Math.cos(a);
      const lift = Math.sin(a) * dome * sign;
      const target = capStart + k;
      for (let i = 0; i < rowLength; i++) {
        const src = (cutRow * rowLength + i) * 3;
        const dst = (target * rowLength + i) * 3;
        positions[dst] = cx + (data.positions[src] - cx) * shrink;
        positions[dst + 1] = cy + (data.positions[src + 1] - cy) * shrink + lift;
        positions[dst + 2] = cz + (data.positions[src + 2] - cz) * shrink;
        const uv = (target * rowLength + i) * 2;
        uvs[uv] = data.uvs[(cutRow * rowLength + i) * 2];
        uvs[uv + 1] = cutV;
        occlusion[target * rowLength + i] = 0.96;
      }
    }
    const quads = total - 1;
    const indices = new Uint32Array(quads * (rowLength - 1) * 6);
    let n = 0;
    for (let j = 0; j < quads; j++) {
      for (let i = 0; i < rowLength - 1; i++) {
        const a = j * rowLength + i;
        const b = a + rowLength;
        indices[n++] = a;
        indices[n++] = a + 1;
        indices[n++] = b;
        indices[n++] = b;
        indices[n++] = a + 1;
        indices[n++] = b + 1;
      }
    }
    return {
      positions,
      uvs,
      occlusion,
      indices,
      rowLength,
      rows: total,
      cutCenter: [cx, cy, cz],
      cutRadius,
    };
  }

  return { base: piece(0, cutRow, true), top: piece(cutRow, rows - 1, false) };
}
