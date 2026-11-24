// The Cuppy cup, spoon and stretch. Loaded on demand by CuppyStage, never in
// the main bundle. Everything here is procedural: no model files or brand
// artwork. Positions come from choreography.ts; this module only builds the
// meshes and applies a frame.

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Group,
  HemisphereLight,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import {
  beatsFor,
  CAMERA_FOV,
  choreograph,
  BEND_SPRING,
  cradlePose,
  creamLeft,
  cupViewportBox,
  cupWallRadius,
  PRODUCT,
  projectToViewport,
  shadowFootprint,
  TUG_SPRING,
  stepSpring,
  SWIRL_CUT_V,
  type Spring,
  type Choreography,
  type StageMetrics,
  wordClearanceFade,
} from "./choreography";
import { CREAM } from "./brand";
import { blinkAt, browFlashAt, drawFace, faceAt, faceSignature, type FaceFrame } from "./face";
import { buildBowl, buildHandle, SPOON } from "./spoon";
import { createStrandBuffers, writeStrand, type StrandInput } from "./strand";
import { buildSwirl, splitSwirl, weldSeamNormals, type SwirlPiece } from "./swirl";

export type CuppySceneOptions = {
  /** Idle float, pointer tilt and scroll springs. Off for the reduced-motion still. */
  animate: boolean;
  /**
   * "scroll": a fixed, viewport-sized stage that plays the scoop and stretch
   * from the page scroll. "still": a single composed pose inside the hero slot.
   */
  mode: "scroll" | "still";
  /** The hero slot the cup opens in. */
  slot: HTMLElement;
  /** CSS font-family list for the printed label. */
  fontFamily: string;
  onContextLost: () => void;
};

export type CuppyScene = {
  dispose: () => void;
};

const INK = "#17131A";
const PAPER = "#F2E6D2";
const CUP_TOP = PRODUCT.cupTop;
const CUP_BOTTOM_RADIUS = PRODUCT.cupBottomRadius;
const CUP_TOP_RADIUS = PRODUCT.cupTopRadius;
/** The product turns about a point this far above its foot. */
const FLOAT_PIVOT = 1.5;
/** The ground line sits this fraction of the slot's height above its bottom. */
const SLOT_GROUND = 0.07;
const MAX_PIXEL_RATIO = 1.75;
/** The scroll stage covers the viewport, so it gets a lower ratio and a pixel budget. */
const MAX_PIXEL_RATIO_FULL = 1.5;
const MAX_PIXELS = 3_400_000;
/**
 * The contact shadow, sized to the cup rather than the swirl: the soft pool is
 * a little wider than the rim, the core about the foot. It sits a little above
 * the ground line so it reads as close under the floating cup, not as a
 * separate disc, and it never spills past the cup's lane on a phone.
 */
const SHADOW_SOFT = 2.5;
const SHADOW_CORE = 1.25;
const SHADOW_RISE = 0.16;
const SHADOW_OFFSET = { x: 0.1, z: -0.12 } as const;
/** The visible pool, for keeping it clear of the hero word (the falloff is near zero past 0.65 of its half-width). */
/**
 * The face is printed on a band of the cup's front wall: this far either side
 * of the front (radians) and between these heights. Its canvas is redrawn only
 * when the pose changes.
 */
const FACE_PHI = 0.8;
const FACE_BOTTOM = 0.27;
const FACE_TOP = 1.1;
const FACE_CANVAS = { width: 800, height: 480 } as const;
/** Where the face looks from, in the cup's frame: the bridge of the glasses. */
const FACE_EYES = { y: 0.86, z: 0.95 } as const;
const SHADOW_SHAPE = {
  rise: SHADOW_RISE,
  offsetX: SHADOW_OFFSET.x,
  offsetZ: SHADOW_OFFSET.z,
  radius: SHADOW_SOFT * 0.5 * 0.65,
};

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const waist = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + waist * 0.35, y - waist * 0.35, x + size, y);
  ctx.quadraticCurveTo(x + waist * 0.35, y + waist * 0.35, x, y + size);
  ctx.quadraticCurveTo(x - waist * 0.35, y + waist * 0.35, x - size, y);
  ctx.quadraticCurveTo(x - waist * 0.35, y - waist * 0.35, x, y - size);
  ctx.fill();
}

function drawLabel(fontFamily: string) {
  const width = 2048;
  const height = 448;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  // Paper tooth: a light, random fleck so the cup reads as printed card.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(88,54,46,0.05)" : "rgba(255,255,255,0.18)";
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }

  ctx.fillStyle = INK;
  ctx.fillRect(0, 14, width, 10);
  ctx.fillRect(0, 34, width, 3);

  // Bottom band with a repeating printed line; the wordmark sits at the front,
  // under the face.
  const bandTop = height - 78;
  ctx.fillRect(0, bandTop, width, 78);
  ctx.fillStyle = PAPER;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("fontStretch" in ctx) ctx.fontStretch = "expanded";
  const step = width / 6;
  for (let k = -3; k <= 3; k++) {
    const x = width / 2 + k * step;
    const front = k === 0;
    if ("letterSpacing" in ctx) ctx.letterSpacing = front ? "3px" : "4px";
    ctx.font = front ? `900 36px ${fontFamily}` : `800 26px ${fontFamily}`;
    ctx.fillText(front ? "CUPPY" : "ICE CREAM", x, bandTop + 40);
    if (k < 3) sparkle(ctx, x + step / 2, bandTop + 39, 9);
  }

  // The front belongs to the face (face.ts, its own layer). Sparkles flank it,
  // and the wordmark repeats on the back.
  ctx.fillStyle = INK;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.font = `900 64px ${fontFamily}`;
  for (const x of [0, width]) ctx.fillText("CUPPY", x, 262);
  sparkle(ctx, width / 2 - 318, 116, 22);
  sparkle(ctx, width / 2 - 352, 196, 9);
  sparkle(ctx, width / 2 + 330, 290, 14);
  for (const x of [width / 4, (width * 3) / 4]) {
    sparkle(ctx, x - 30, 150, 26);
    sparkle(ctx, x + 40, 250, 13);
  }
  return canvas;
}

/** Tileable value noise, used as a micro bump so the swirl is not a smooth plastic shell. */
function noiseTexture() {
  const size = 128;
  const cells = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const grid = Array.from({ length: cells * cells }, () => Math.random());
  const at = (x: number, y: number) => grid[((y + cells) % cells) * cells + ((x + cells) % cells)];
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
      const ty = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      const value = Math.round((top * (1 - ty) + bottom * ty) * 255);
      const offset = (y * size + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function shadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  // A Gaussian falloff that reaches zero at the edge: no rim, no lens shape.
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 12; i++) {
    const r = i / 12;
    const alpha = Math.exp(-((r / 0.46) ** 2) * 1.6) * (1 - r * r);
    gradient.addColorStop(r, `rgba(40,20,48,${alpha.toFixed(3)})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

const wallRadius = cupWallRadius;

function smooth(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * A drip that spills over the rolled lip and runs down the printed wall: a
 * tapered strand, flattened against the cup, ending in a heavy rounded bead.
 * Built in a local frame where +z points out of the cup wall.
 */
function makeDrip(length: number, material: Material) {
  const lipY = CUP_TOP - 0.04;
  const endY = lipY - length;
  // It starts down inside the cup and hugs the rolled lip, so once the swirl
  // has been drawn down it still reads as cream over the rim, not a knob on it.
  const curve = new CatmullRomCurve3([
    new Vector3(0, CUP_TOP - 0.12, CUP_TOP_RADIUS - 0.2),
    new Vector3(0, CUP_TOP + 0.03, CUP_TOP_RADIUS - 0.01),
    new Vector3(0, lipY, wallRadius(lipY) + 0.08),
    new Vector3(0, lipY - length * 0.5, wallRadius(lipY - length * 0.5) + 0.05),
    new Vector3(0, endY, wallRadius(endY) + 0.055),
  ]);
  const segments = 48;
  const radial = 20;
  const positions: number[] = [];
  const indices: number[] = [];
  const side = new Vector3(1, 0, 0);
  const point = new Vector3();
  const tangent = new Vector3();
  const across = new Vector3();
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent);
    across.crossVectors(side, tangent).normalize();
    let r = 0.088 - 0.042 * smooth(0.12, 0.72, t) + 0.04 * smooth(0.72, 0.93, t);
    if (t > 0.93) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.93) / 0.07) ** 2));
    if (t < 0.06) r *= Math.sqrt(Math.max(0, 1 - ((0.06 - t) / 0.06) ** 2));
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      // Flatten toward the wall so the strand reads as running down it, and
      // flatter still where it crosses the lip, so it reads as a smear.
      const x = Math.cos(a) * r;
      const n = Math.sin(a) * r * (0.62 - 0.22 * (1 - smooth(0.1, 0.32, t)));
      positions.push(
        point.x + side.x * x + across.x * n,
        point.y + side.y * x + across.y * n,
        point.z + side.z * x + across.z * n,
      );
    }
  }
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * (radial + 1) + i;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function geometryFromPiece(piece: SwirlPiece) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(piece.positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(piece.uvs, 2));
  const colors = new Float32Array(piece.occlusion.length * 3);
  piece.occlusion.forEach((value, i) => {
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = value;
  });
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(new BufferAttribute(piece.indices, 1));
  geometry.computeVertexNormals();
  weldSeamNormals(
    geometry.getAttribute("normal").array as Float32Array,
    piece.rowLength,
    piece.rows,
  );
  return geometry;
}

export async function createCuppyScene(
  container: HTMLElement,
  options: CuppySceneOptions,
): Promise<CuppyScene> {
  const family = options.fontFamily || "sans-serif";
  try {
    await Promise.all([
      document.fonts.load(`900 64px ${family}`),
      document.fonts.load(`800 26px ${family}`),
    ]);
  } catch {
    // The label still draws with whatever face is available.
  }

  const scrollMode = options.mode === "scroll";
  const slot = options.slot;

  const canvas = document.createElement("canvas");
  canvas.className = "cuppy-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 600);

  // Light: warm window key from the upper left, lavender bounce from the page.
  // The key and its shadow follow the cup wherever the scroll takes it.
  const key = new DirectionalLight("#FFF1DE", 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  const shadowCamera = key.shadow.camera;
  shadowCamera.left = shadowCamera.bottom = -2.6;
  shadowCamera.right = shadowCamera.top = 2.6;
  shadowCamera.near = 1;
  shadowCamera.far = 18;
  const rim = new DirectionalLight("#EBD2FF", 1.5);
  rim.position.set(4, 2.5, -4.5);
  const fill = new HemisphereLight("#FFF8EE", "#B98ABB", 0.55);
  scene.add(key, key.target, rim, fill);

  const textures: Texture[] = [];
  const label = new CanvasTexture(drawLabel(family));
  label.colorSpace = SRGBColorSpace;
  label.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bump = new CanvasTexture(noiseTexture());
  bump.wrapS = bump.wrapT = RepeatWrapping;
  bump.repeat.set(5, 3);
  const strandBump = bump.clone();
  strandBump.repeat.set(2, 1);
  const shadowMap = new CanvasTexture(shadowTexture());
  shadowMap.colorSpace = SRGBColorSpace;
  textures.push(label, bump, strandBump, shadowMap);

  const paper = new MeshStandardMaterial({ map: label, roughness: 0.74, metalness: 0 });
  const paperPlain = new MeshStandardMaterial({ color: "#E9D8BC", roughness: 0.8 });
  const paperInside = new MeshStandardMaterial({
    color: "#E2CFB1",
    roughness: 0.85,
    side: BackSide,
  });
  const rimPaper = new MeshStandardMaterial({ color: "#F6ECDD", roughness: 0.6 });
  const cream = new MeshPhysicalMaterial({
    color: CREAM.base,
    vertexColors: true,
    roughness: 0.46,
    clearcoat: 0.3,
    clearcoatRoughness: 0.42,
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: CREAM.sheen,
    bumpMap: bump,
    bumpScale: 0.2,
  });
  const dripCream = cream.clone();
  dripCream.vertexColors = false;
  const strandCream = dripCream.clone();
  strandCream.bumpMap = strandBump;
  strandCream.bumpScale = 0.12;
  // Glossy ink plastic: the darkest thing on the page, so the spoon and the
  // point where the cream leaves it always read.
  const spoonPlastic = new MeshPhysicalMaterial({
    color: "#231C27",
    roughness: 0.3,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: DoubleSide,
  });
  const shadowSoft = new MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shadowCore = shadowSoft.clone();
  // The face is ink and paper on the same card, so it takes the label's light.
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = FACE_CANVAS.width;
  faceCanvas.height = FACE_CANVAS.height;
  const faceContext = faceCanvas.getContext("2d");
  const faceTexture = new CanvasTexture(faceCanvas);
  faceTexture.colorSpace = SRGBColorSpace;
  faceTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  textures.push(faceTexture);
  const facePrint = new MeshStandardMaterial({
    map: faceTexture,
    roughness: 0.74,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const materials: Material[] = [
    facePrint,
    paper,
    paperPlain,
    paperInside,
    rimPaper,
    cream,
    dripCream,
    strandCream,
    spoonPlastic,
    shadowSoft,
    shadowCore,
  ];

  // Cup: printed outer wall, plain inner wall, rolled rim, base.
  const wallPoints = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return new Vector2(
      CUP_BOTTOM_RADIUS + (CUP_TOP_RADIUS - CUP_BOTTOM_RADIUS) * t,
      0.05 + (CUP_TOP - 0.05) * t,
    );
  });
  const outerWall = new Mesh(new LatheGeometry(wallPoints, 128, Math.PI), paper);
  const innerWall = new Mesh(
    new LatheGeometry(
      wallPoints.map((p) => new Vector2(p.x * 0.965, p.y)),
      64,
    ),
    paperInside,
  );
  const foot = new Mesh(
    new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(CUP_BOTTOM_RADIUS - 0.04, 0),
        new Vector2(CUP_BOTTOM_RADIUS, 0.05),
      ],
      64,
    ),
    paperPlain,
  );
  const rimRoll = new Mesh(new TorusGeometry(CUP_TOP_RADIUS, 0.042, 16, 128), rimPaper);
  rimRoll.rotation.x = Math.PI / 2;
  rimRoll.position.y = CUP_TOP;
  for (const mesh of [outerWall, rimRoll, foot]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  // Swirl, split where the spoon takes it. The base pivots at the cup so it
  // can settle as the strand draws it out; the top is placed by hand every frame.
  const swirlData = buildSwirl({ height: PRODUCT.swirlHeight });
  const pieces = splitSwirl(swirlData, SWIRL_CUT_V);
  const cutCenter = new Vector3(...pieces.base.cutCenter);
  const cutRadius = pieces.base.cutRadius;
  const base = new Mesh(geometryFromPiece(pieces.base), cream);
  base.castShadow = true;
  base.receiveShadow = true;
  const swirlPivot = new Group();
  swirlPivot.position.y = PRODUCT.swirlBase;
  swirlPivot.add(base);

  const topGeometry = geometryFromPiece(pieces.top);
  topGeometry.translate(-cutCenter.x, -cutCenter.y, -cutCenter.z);
  const dollop = new Mesh(topGeometry, cream);
  dollop.castShadow = true;
  dollop.receiveShadow = true;
  dollop.matrixAutoUpdate = false;

  const drips = new Group();
  for (const [angle, length] of [
    // The long drip runs down beside the face, not over it.
    [1.02, 0.46],
    [-2.1, 0.24],
    [2.45, 0.32],
  ] as const) {
    const holder = new Group();
    holder.rotation.y = angle;
    holder.add(makeDrip(length, dripCream));
    drips.add(holder);
  }

  // cupRoot sits on the ground line; float hovers and turns the product
  // around its middle.
  const faceBand = new Mesh(
    new LatheGeometry(
      Array.from({ length: 9 }, (_, i) => {
        const y = FACE_BOTTOM + ((FACE_TOP - FACE_BOTTOM) * i) / 8;
        return new Vector2(wallRadius(y) + 0.004, y);
      }),
      48,
      -FACE_PHI,
      FACE_PHI * 2,
    ),
    facePrint,
  );
  faceBand.receiveShadow = true;

  const product = new Group();
  product.add(outerWall, innerWall, foot, rimRoll, faceBand, swirlPivot, drips);
  product.position.y = -FLOAT_PIVOT;
  const float = new Group();
  float.position.y = PRODUCT.float + FLOAT_PIVOT;
  float.add(product);
  const cupRoot = new Group();
  cupRoot.add(float);

  // Contact shadow: a wide soft pool plus a tighter core under the foot, both
  // nudged right and back, away from the key light at the upper left.
  const shadowPlane = new PlaneGeometry(1, 1);
  const softShadow = new Mesh(shadowPlane, shadowSoft);
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.set(SHADOW_OFFSET.x, SHADOW_RISE, SHADOW_OFFSET.z);
  const coreShadow = new Mesh(shadowPlane, shadowCore);
  coreShadow.rotation.x = -Math.PI / 2;
  coreShadow.position.set(SHADOW_OFFSET.x * 0.5, SHADOW_RISE + 0.001, SHADOW_OFFSET.z * 0.5);
  cupRoot.add(softShadow, coreShadow);

  const spoon = new Group();
  spoon.rotation.order = "YXZ";
  for (const geometry of [buildBowl(), buildHandle()]) {
    const mesh = new Mesh(geometry, spoonPlastic);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    spoon.add(mesh);
  }

  // The stretched strand: fixed-size buffers rewritten in place.
  const strandBuffers = createStrandBuffers();
  const strandGeometry = new BufferGeometry();
  const strandPosition = new BufferAttribute(strandBuffers.positions, 3).setUsage(DynamicDrawUsage);
  const strandNormal = new BufferAttribute(strandBuffers.normals, 3).setUsage(DynamicDrawUsage);
  const strandUv = new BufferAttribute(strandBuffers.uvs, 2).setUsage(DynamicDrawUsage);
  strandGeometry.setAttribute("position", strandPosition);
  strandGeometry.setAttribute("normal", strandNormal);
  strandGeometry.setAttribute("uv", strandUv);
  strandGeometry.setIndex(new BufferAttribute(strandBuffers.indices, 1));
  const strand = new Mesh(strandGeometry, strandCream);
  strand.frustumCulled = false;
  strand.castShadow = true;
  strand.receiveShadow = true;
  strand.visible = false;

  scene.add(cupRoot, spoon, dollop, strand);

  // Where the top sits in the bowl: exactly where it was on the swirl at the
  // moment the spoon cradles it, so the hand-over cannot jump.
  const cradle = cradlePose();
  const restTop = new Matrix4().makeTranslation(
    cutCenter.x,
    cutCenter.y + PRODUCT.float + PRODUCT.swirlBase,
    cutCenter.z,
  );
  const cradleSpoon = new Matrix4().compose(
    new Vector3(cradle.x, cradle.y, cradle.z),
    new Quaternion().setFromEuler(new Euler(cradle.rx, cradle.ry, cradle.rz, "YXZ")),
    new Vector3(1, 1, 1),
  );
  const seat = cradleSpoon.clone().invert().multiply(restTop);
  const cutOffset = new Matrix4().makeTranslation(cutCenter.x, cutCenter.y, cutCenter.z);

  // State
  const animate = options.animate;
  let pageVisible = document.visibilityState === "visible";
  let frameId = 0;
  let elapsed = 0;
  let last = 0;
  let disposed = false;
  let metrics: StageMetrics | null = null;
  let visibleHeight = 0;
  let lastScroll = scrollMode ? window.scrollY : 0;
  let scrollVelocity = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const bend: Spring = { value: 0, velocity: 0 };
  const tug: Spring = { value: 0, velocity: 0 };
  let reported = "";
  let faceDrawn = "";
  let face: FaceFrame | null = null;
  const look = { x: 0, y: 0 };

  const tmp = {
    a: new Vector3(),
    b: new Vector3(),
    c: new Vector3(),
  };
  /** Document y where the ink close begins; the contact shadow fades out over it. */
  let darkTop = Infinity;
  /** Document box of the hero word, which the narrow layout keeps clear of the shadow. */
  let word = { top: Infinity, bottom: Infinity };
  let shadowFade = 1;
  const strandInput: StrandInput = {
    bottom: { x: 0, y: 0, z: 0 },
    bottomDir: { x: 0, y: 1, z: 0 },
    top: { x: 0, y: 0, z: 0 },
    topDir: { x: 0, y: -1, z: 0 },
    bottomRadius: cutRadius * 0.8,
    topRadius: cutRadius * 0.74,
    neckRadius: cutRadius * 0.64,
    minRadius: 0.12,
    visibleTop: 0,
    time: 0,
    sway: 0,
    bend: 0,
    progress: 0,
  };

  function targetVisibleHeight() {
    return scrollMode
      ? (window.visualViewport?.height ?? window.innerHeight)
      : container.clientHeight;
  }

  function measure() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    let hero: StageMetrics["hero"];
    let maxScroll = 0;
    if (scrollMode) {
      const rect = slot.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      hero = {
        x: rect.left + rect.width / 2,
        groundY: top + rect.height * (1 - SLOT_GROUND),
        productPx: fitProduct(rect.width, rect.height),
      };
      maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const dark = document.querySelector("[data-cuppy-dark]");
      darkTop = dark ? dark.getBoundingClientRect().top + window.scrollY : Infinity;
      const title = document.querySelector(".cuppy-title-word")?.getBoundingClientRect();
      word = title
        ? { top: title.top + window.scrollY, bottom: title.bottom + window.scrollY }
        : { top: Infinity, bottom: Infinity };
    } else {
      // The still pose needs headroom for the lifted spoon inside the slot.
      hero = {
        x: width / 2,
        groundY: height * (1 - SLOT_GROUND),
        productPx: fitProduct(width, height) * 0.8,
      };
      maxScroll = height * 4;
    }
    if (!visibleHeight) visibleHeight = targetVisibleHeight();
    metrics = {
      width,
      height,
      visibleHeight,
      maxScroll,
      hero,
      layout: !scrollMode || width >= 960 ? "wide" : "narrow",
    };
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      scrollMode ? MAX_PIXEL_RATIO_FULL : MAX_PIXEL_RATIO,
      Math.sqrt(MAX_PIXELS / (width * height)),
    );
    renderer.setPixelRatio(Math.max(1, ratio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /** The still pose: the top just lifted, a short pull of cream under the spoon. */
  function stillScroll(m: StageMetrics) {
    const beats = beatsFor(m.height);
    return beats.cradle + (beats.anchor - beats.cradle) * 0.7;
  }

  /** Advances one frame; returns whether another frame is needed. */
  function update(dt: number) {
    if (!metrics) measure();
    const m = metrics as StageMetrics;
    let moving = false;

    // Visible height eases, so a mobile toolbar sliding away never jolts the cup.
    const targetHeight = targetVisibleHeight();
    if (Math.abs(targetHeight - visibleHeight) > 0.5) {
      visibleHeight += (targetHeight - visibleHeight) * (1 - Math.exp(-dt * 12));
      moving = true;
    } else visibleHeight = targetHeight;
    m.visibleHeight = visibleHeight;

    const scrollY = scrollMode ? window.scrollY : stillScroll(m);
    if (dt > 0) {
      const instant = (scrollY - lastScroll) / dt;
      scrollVelocity += (instant - scrollVelocity) * (1 - Math.exp(-dt * 14));
    }
    lastScroll = scrollY;
    if (Math.abs(scrollVelocity) > 1) moving = true;
    else scrollVelocity = 0;

    const frame = choreograph(scrollY, m);
    const current = faceAt(scrollY, frame.beats, m.maxScroll);
    face = current;
    // Idle life (float, turn, pointer, ripple, springs, blinks) fades out as the
    // final pose lands and is exactly zero at the bottom, so the pose holds still.
    const idle = animate ? current.idle : 0;
    if (animate) elapsed += dt;
    const t = elapsed;
    const ease = 1 - Math.exp(-dt * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;

    // Scroll springs: the strand bows while the page moves and wobbles when it
    // stops; a fast pull tugs the cup up a little against the cream.
    const springs = animate && scrollMode && idle > 0;
    const holding = frame.holding;
    const bendTarget = springs && holding ? clampValue(scrollVelocity * 0.00022, -0.5, 0.5) : 0;
    const tugTarget =
      springs && holding
        ? clampValue(-scrollVelocity * 0.012, -m.height * 0.03, m.height * 0.03)
        : 0;
    if (springs) {
      if (stepSpring(bend, bendTarget, dt, BEND_SPRING)) moving = true;
      if (stepSpring(tug, tugTarget, dt, TUG_SPRING)) moving = true;
    } else {
      bend.value = bend.velocity = tug.value = tug.velocity = 0;
    }
    const bendNow = bend.value * idle;
    const tugNow = tug.value * idle;

    const sway = frame.sway * idle;
    const bob = animate ? Math.sin(t * 1.15) * 0.085 : 0;
    // The turn stays small enough that the face on the front always reads.
    const turn = animate ? Math.sin(t * 0.36) * 0.3 + pointer.x * 0.35 : 0.12;
    const unitPerPx = (frame.cameraDistance - frame.cup.z) / frame.cameraDistance / frame.ppu;
    cupRoot.position.set(frame.cup.x, frame.cup.y - tugNow * unitPerPx, frame.cup.z);
    float.position.y = PRODUCT.float + FLOAT_PIVOT + bob * sway;
    float.rotation.y = turn * sway;
    float.rotation.x = (animate ? pointer.y * 0.16 + Math.sin(t * 0.8) * 0.025 : 0.02) * sway;
    float.rotation.z =
      (animate ? -pointer.x * 0.07 + Math.sin(t * 0.6) * 0.03 : 0) * sway - bendNow * 0.05;
    // A plum shadow on ink only bands, so it fades as the cup reaches the close.
    const groundDocY = scrollY + projectToViewport(frame.cup, frame, m).y;
    shadowFade = 1 - smoothstep01((groundDocY - darkTop + 60) / 220);
    // Narrow screens: the cup holds still while the word scrolls up under it,
    // so the shadow steps aside while the word crosses its band.
    if (m.layout === "narrow") {
      shadowFade *= wordClearanceFade(shadowFootprint(frame, m, SHADOW_SHAPE), {
        top: word.top - scrollY,
        bottom: word.bottom - scrollY,
      });
    }
    placeShadow(animate ? (bob * sway) / 0.085 : 0);

    spoon.position.set(frame.spoon.x, frame.spoon.y, frame.spoon.z);
    spoon.rotation.set(frame.spoon.rx, frame.spoon.ry, frame.spoon.rz - bendNow * 0.04, "YXZ");

    // The swirl left in the cup gives up its cream to the strand: it settles
    // into the cup as the pull lengthens, and fills back up on the way up.
    // It moves with the face: the cream draws up a little as the strain
    // builds and lets go with the final laugh, and on the float it squashes
    // as the cup rises while the glasses lag behind.
    const left = creamLeft(frame.drawn);
    const float01 = animate ? Math.sin(t * 1.15) * sway : 0;
    const pullUp = 1 + 0.06 * current.tension;
    swirlPivot.position.y = PRODUCT.swirlBase - left.sink;
    swirlPivot.scale.set(
      left.wide * (1 + 0.006 * float01),
      left.tall * pullUp * (1 - 0.014 * float01),
      left.wide * (1 + 0.006 * float01),
    );

    cupRoot.updateMatrixWorld(true);
    spoon.updateMatrixWorld(true);
    if (holding) dollop.matrix.multiplyMatrices(spoon.matrixWorld, seat);
    else dollop.matrix.multiplyMatrices(swirlPivot.matrixWorld, cutOffset);
    dollop.matrixWorld.copy(dollop.matrix);

    key.target.position.set(frame.cup.x, frame.cup.y + 1.6, frame.cup.z);
    key.position.set(frame.cup.x - 3.2, frame.cup.y + 7.6, frame.cup.z + 5);

    strand.visible = holding;
    if (holding) {
      const pivot = swirlPivot.matrixWorld;
      tmp.a.set(cutCenter.x, cutCenter.y - 0.08, cutCenter.z).applyMatrix4(pivot);
      strandInput.bottom.x = tmp.a.x;
      strandInput.bottom.y = tmp.a.y;
      strandInput.bottom.z = tmp.a.z;
      tmp.b.setFromMatrixColumn(pivot, 1).normalize();
      strandInput.bottomDir.x = tmp.b.x;
      strandInput.bottomDir.y = tmp.b.y;
      strandInput.bottomDir.z = tmp.b.z;
      // The strand hangs from where the cream spills over the bowl's tip.
      // Until the spoon has the top, it comes straight out of the top's cut.
      const { cradle: from, anchor: to } = frame.beats;
      const tipLip = smoothstep01((scrollY - from) / (to - from));
      tmp.a.set(0, 0.08, 0).applyMatrix4(dollop.matrix);
      tmp.b.set(-SPOON.tipLength * 0.72, -0.03, 0).applyMatrix4(spoon.matrixWorld);
      tmp.a.lerp(tmp.b, tipLip);
      strandInput.top.x = tmp.a.x;
      strandInput.top.y = tmp.a.y;
      strandInput.top.z = tmp.a.z;
      tmp.b.setFromMatrixColumn(dollop.matrix, 1).normalize().negate();
      tmp.c.setFromMatrixColumn(spoon.matrixWorld, 0).normalize().negate();
      tmp.b.addScaledVector(tmp.c, 0.6 * tipLip);
      tmp.b.y -= 0.6;
      tmp.b.normalize();
      strandInput.topDir.x = tmp.b.x;
      strandInput.topDir.y = tmp.b.y;
      strandInput.topDir.z = tmp.b.z;
      strandInput.bottomRadius = cutRadius * 0.8 * swirlPivot.scale.x;
      strandInput.visibleTop =
        frame.cameraY +
        (m.height / 2) * ((frame.cameraDistance - frame.cup.z) / frame.cameraDistance / frame.ppu) +
        0.6;
      strandInput.time = t;
      strandInput.sway = idle;
      strandInput.bend = bendNow;
      strandInput.progress = frame.stretch;
      // The narrow cup sits deeper, so its units are smaller on screen.
      strandInput.wobbleScale = m.layout === "wide" ? 1 : 1 / Math.max(frame.cupScale, 0.4);
      strandInput.rippleScale = m.layout === "wide" ? 1 : 0.45;
      writeStrand(strandBuffers, strandInput);
      strandPosition.needsUpdate = true;
      strandNormal.needsUpdate = true;
      strandUv.needsUpdate = true;
    }

    camera.position.set(0, frame.cameraY, frame.cameraDistance);
    paintFace(frame, m, current, idle, t, float01);
    report(frame, m);
    return moving || idle > 0;
  }

  /**
   * Points the eyes and redraws the printed face if anything changed. The
   * eyes find the spoon on screen, so the gaze is right on every layout; at
   * rest they follow the pointer instead.
   */
  function paintFace(
    frame: Choreography,
    m: StageMetrics,
    current: FaceFrame,
    idle: number,
    t: number,
    float01: number,
  ) {
    const pose = current.pose;
    const eyes = projectToViewport(
      {
        x: frame.cup.x,
        y: frame.cup.y + PRODUCT.float + FACE_EYES.y,
        z: frame.cup.z + FACE_EYES.z,
      },
      frame,
      m,
    );
    const target = projectToViewport(frame.spoon, frame, m);
    const dx = target.x - eyes.x;
    const dy = target.y - eyes.y;
    const reach = Math.hypot(dx, dy) || 1;
    const spoonX = dx / reach;
    const spoonY = dy / reach;
    const pointerWeight = 0.55 * idle;
    look.x = pointer.x * pointerWeight + (spoonX - pointer.x * pointerWeight) * pose.gaze;
    look.y = pointer.y * pointerWeight + (spoonY - pointer.y * pointerWeight) * pose.gaze;
    const blink = blinkAt(t) * idle;
    // The resting brow flash belongs to the cool pose only.
    const flash = browFlashAt(t) * idle * (1 - pose.gaze);
    const drawn = flash > 0.002 ? { ...pose, brow: pose.brow + flash * 12 } : pose;
    const nudge = -float01 * 5;
    const signature = `${faceSignature(drawn, look, blink)},${Math.round(nudge * 4)}`;
    if (signature === faceDrawn || !faceContext) return;
    faceDrawn = signature;
    drawFace(faceContext, drawn, { look, blink, nudge });
    faceTexture.needsUpdate = true;
  }

  // Progress is published on the host for tests and debugging. A replaced
  // scene (Strict Mode, context restore) must not clear its successor's.
  const owner = String((sceneCount += 1));

  function report(frame: Choreography, m: StageMetrics) {
    const phase = !frame.holding
      ? frame.scoop > 0
        ? "scoop"
        : "rest"
      : frame.anchored
        ? "stretch"
        : "lift";
    const box = cupViewportBox(frame, m);
    const expression = face?.expression ?? "rest";
    // The scroll-driven pose alone, without idle life: equal scroll, equal pose.
    const pose = face ? faceSignature(face.pose, { x: 0, y: 0 }, 0) : "";
    const next = `${phase}|${expression}|${pose}|${faceDrawn}|${frame.stretch.toFixed(2)}|${frame.drawn.toFixed(2)}|${shadowFade.toFixed(2)}|${Math.round(box.top)}|${Math.round(box.bottom)}`;
    if (next === reported && container.dataset.sceneOwner === owner) return;
    reported = next;
    container.dataset.sceneOwner = owner;
    container.dataset.phase = phase;
    container.dataset.expression = expression;
    container.dataset.pose = pose;
    container.dataset.face = faceDrawn;
    container.dataset.stretch = frame.stretch.toFixed(2);
    container.dataset.drawn = frame.drawn.toFixed(2);
    container.dataset.shadow = shadowFade.toFixed(2);
    container.dataset.cupTop = String(Math.round(box.top));
    container.dataset.cupBottom = String(Math.round(box.bottom));
  }

  /** `lift` is the bob, -1..1: higher up, the shadow spreads a touch and fades. */
  function placeShadow(lift: number) {
    const soft = SHADOW_SOFT * (1 + lift * 0.04);
    softShadow.scale.set(soft, soft * 0.92, 1);
    shadowSoft.opacity = (0.44 - lift * 0.05) * shadowFade;
    const core = SHADOW_CORE * (1 - lift * 0.05);
    coreShadow.scale.set(core, core * 0.9, 1);
    shadowCore.opacity = (0.4 - lift * 0.08) * shadowFade;
    softShadow.visible = coreShadow.visible = shadowFade > 0.01;
  }

  function tick(now: number) {
    frameId = 0;
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
    last = now;
    const more = update(dt);
    renderer.render(scene, camera);
    if (more) request();
    else last = 0;
  }

  function request() {
    if (frameId || disposed || !pageVisible) return;
    frameId = requestAnimationFrame(tick);
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    last = 0;
  }

  function renderNow() {
    update(0);
    renderer.render(scene, camera);
  }

  function onPointerMove(event: PointerEvent) {
    if (!animate) return;
    pointer.tx = clampValue((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    pointer.ty = clampValue((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    request();
  }

  function onScroll() {
    request();
  }

  function onResize() {
    measure();
    request();
  }

  function onVisibility() {
    pageVisible = document.visibilityState === "visible";
    if (pageVisible) request();
    else stop();
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    stop();
    options.onContextLost();
  }

  // Layout changes (fonts, flavor copy, viewport) move the hero slot and the
  // page length, so remeasure whenever the stage, slot or document resizes.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  if (scrollMode) {
    resizeObserver.observe(slot);
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", onScroll);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);

  measure();
  renderNow();
  request();

  return {
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (container.dataset.sceneOwner === owner) {
        for (const key of [
          "sceneOwner",
          "phase",
          "expression",
          "pose",
          "face",
          "stretch",
          "drawn",
          "shadow",
          "cupTop",
          "cupBottom",
        ]) {
          delete container.dataset[key];
        }
      }
    },
  };
}

let sceneCount = 0;

function smoothstep01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Product height in px that fits a slot: 80% of its height, or its width for the cup. */
function fitProduct(width: number, height: number) {
  const total = PRODUCT.height + PRODUCT.float;
  return Math.min(height * 0.8, ((width * 0.84) / PRODUCT.width) * total);
}
