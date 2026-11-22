// The floating Cuppy cup. Loaded on demand by CuppyStage, never in the main
// bundle. Everything here is procedural: no model files or brand artwork.

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LatheGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
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

import type { Flavor } from "./flavors";
import { buildSwirl, weldSeamNormals } from "./swirl";

export type CuppySceneOptions = {
  flavor: Flavor;
  animate: boolean;
  /** CSS font-family list for the printed label. */
  fontFamily: string;
  onContextLost: () => void;
};

export type CuppyScene = {
  setFlavor: (flavor: Flavor) => void;
  setAnimate: (animate: boolean) => void;
  setInView: (inView: boolean) => void;
  dispose: () => void;
};

const INK = "#17131A";
const PAPER = "#F2E6D2";
const CUP_TOP = 1.2;
const CUP_BOTTOM_RADIUS = 0.745;
const CUP_TOP_RADIUS = 1;
const SWIRL_HEIGHT = 1.95;
const PRODUCT_HEIGHT = CUP_TOP + SWIRL_HEIGHT;
const GROUND_Y = -PRODUCT_HEIGHT / 2 - 0.6;
const MAX_PIXEL_RATIO = 1.75;

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

// Pixel sunglasses, an approved nod to the Cuppy mascot. X = frame, W = glint.
const GLASSES = [
  "XXXXXXXXXXXXXXXXXXXXXXXXXX",
  "..XXWWXXXXXXXXXXWWXXXXXX..",
  "..XXXWWXXXXX..XXXWWXXXXX..",
  "...XXXXXXXX....XXXXXXXX...",
  "....XXXXXX......XXXXXX....",
];

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

  // Bottom band with a repeating printed line.
  const bandTop = height - 78;
  ctx.fillRect(0, bandTop, width, 78);
  ctx.fillStyle = PAPER;
  ctx.font = `800 26px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("fontStretch" in ctx) ctx.fontStretch = "expanded";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  const step = width / 6;
  for (let x = step / 2; x < width; x += step) {
    ctx.fillText("ICE CREAM", x, bandTop + 40);
    sparkle(ctx, x + step / 2, bandTop + 39, 9);
  }

  // Front: pixel sunglasses over the wordmark. u = 0.5 faces the camera.
  const pixel = 13;
  const glassesWidth = GLASSES[0].length * pixel;
  const gx = width / 2 - glassesWidth / 2;
  const gy = 120;
  GLASSES.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === ".") continue;
      ctx.fillStyle = cell === "W" ? "#FFFFFF" : INK;
      ctx.fillRect(gx + c * pixel, gy + r * pixel, pixel + 0.5, pixel + 0.5);
    }
  });

  ctx.fillStyle = INK;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.font = `900 64px ${fontFamily}`;
  for (const x of [width / 2, 0, width]) ctx.fillText("CUPPY", x, 262);

  sparkle(ctx, width / 2 - 250, 110, 22);
  sparkle(ctx, width / 2 + 232, 214, 14);
  sparkle(ctx, width / 2 + 280, 120, 9);
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
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(20,10,26,0.9)");
  gradient.addColorStop(0.35, "rgba(20,10,26,0.55)");
  gradient.addColorStop(0.7, "rgba(20,10,26,0.15)");
  gradient.addColorStop(1, "rgba(20,10,26,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function wallRadius(y: number) {
  const t = Math.min(1, Math.max(0, (y - 0.05) / (CUP_TOP - 0.05)));
  return CUP_BOTTOM_RADIUS + (CUP_TOP_RADIUS - CUP_BOTTOM_RADIUS) * t;
}

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
  const curve = new CatmullRomCurve3([
    new Vector3(0, CUP_TOP + 0.06, CUP_TOP_RADIUS - 0.12),
    new Vector3(0, CUP_TOP + 0.085, CUP_TOP_RADIUS + 0.02),
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
      // Flatten toward the wall so the strand reads as running down it.
      const x = Math.cos(a) * r;
      const n = Math.sin(a) * r * 0.62;
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

  const camera = new PerspectiveCamera(26, 1, 0.1, 60);

  // Light: warm window key from the upper left, lavender bounce from the page.
  const key = new DirectionalLight("#FFF1DE", 3);
  key.position.set(-3.2, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  const shadowCamera = key.shadow.camera;
  shadowCamera.left = shadowCamera.bottom = -2.4;
  shadowCamera.right = shadowCamera.top = 2.4;
  shadowCamera.near = 1;
  shadowCamera.far = 16;
  const rim = new DirectionalLight("#EBD2FF", 1.5);
  rim.position.set(4, 2.5, -4.5);
  const fill = new HemisphereLight("#FFF8EE", "#B98ABB", 0.55);
  scene.add(key, rim, fill);

  const textures: Texture[] = [];
  const label = new CanvasTexture(drawLabel(family));
  label.colorSpace = SRGBColorSpace;
  label.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bump = new CanvasTexture(noiseTexture());
  bump.wrapS = bump.wrapT = RepeatWrapping;
  bump.repeat.set(5, 3);
  const shadowMap = new CanvasTexture(shadowTexture());
  shadowMap.colorSpace = SRGBColorSpace;
  textures.push(label, bump, shadowMap);

  const paper = new MeshStandardMaterial({ map: label, roughness: 0.74, metalness: 0 });
  const paperPlain = new MeshStandardMaterial({ color: "#E9D8BC", roughness: 0.8 });
  const paperInside = new MeshStandardMaterial({
    color: "#E2CFB1",
    roughness: 0.85,
    side: BackSide,
  });
  const rimPaper = new MeshStandardMaterial({ color: "#F6ECDD", roughness: 0.6 });
  const cream = new MeshPhysicalMaterial({
    color: options.flavor.cream,
    vertexColors: true,
    roughness: 0.46,
    clearcoat: 0.3,
    clearcoatRoughness: 0.42,
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: options.flavor.sheen,
    bumpMap: bump,
    bumpScale: 0.2,
  });
  const dripCream = cream.clone();
  dripCream.vertexColors = false;
  const shadowSoft = new MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.55,
  });
  const shadowCore = shadowSoft.clone();
  shadowCore.opacity = 0.5;
  const materials: Material[] = [
    paper,
    paperPlain,
    paperInside,
    rimPaper,
    cream,
    dripCream,
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

  // Swirl, pivoting at its base so flavor changes can squash it.
  const swirlData = buildSwirl({ height: SWIRL_HEIGHT });
  const swirlGeometry = new BufferGeometry();
  swirlGeometry.setAttribute("position", new BufferAttribute(swirlData.positions, 3));
  swirlGeometry.setAttribute("uv", new BufferAttribute(swirlData.uvs, 2));
  const colors = new Float32Array(swirlData.occlusion.length * 3);
  swirlData.occlusion.forEach((value, i) => {
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = value;
  });
  swirlGeometry.setAttribute("color", new BufferAttribute(colors, 3));
  swirlGeometry.setIndex(new BufferAttribute(swirlData.indices, 1));
  swirlGeometry.computeVertexNormals();
  const normal = swirlGeometry.getAttribute("normal");
  weldSeamNormals(normal.array as Float32Array, swirlData.rowLength, swirlData.rows);
  const swirl = new Mesh(swirlGeometry, cream);
  swirl.castShadow = true;
  swirl.receiveShadow = true;
  const swirlPivot = new Group();
  swirlPivot.position.y = CUP_TOP - 0.06;
  swirlPivot.add(swirl);

  const drips = new Group();
  for (const [angle, length] of [
    [0.6, 0.46],
    [-2.1, 0.24],
    [2.45, 0.32],
  ] as const) {
    const holder = new Group();
    holder.rotation.y = angle;
    holder.add(makeDrip(length, dripCream));
    drips.add(holder);
  }

  const product = new Group();
  product.add(outerWall, innerWall, foot, rimRoll, swirlPivot, drips);
  product.position.y = -PRODUCT_HEIGHT / 2;
  const float = new Group();
  float.add(product);
  scene.add(float);

  const shadowPlane = new PlaneGeometry(1, 1);
  const softShadow = new Mesh(shadowPlane, shadowSoft);
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.y = GROUND_Y;
  const coreShadow = new Mesh(shadowPlane, shadowCore);
  coreShadow.rotation.x = -Math.PI / 2;
  coreShadow.position.y = GROUND_Y + 0.001;
  scene.add(softShadow, coreShadow);

  // State
  let animate = options.animate;
  let inView = true;
  let pageVisible = document.visibilityState === "visible";
  let frame = 0;
  let elapsed = 0;
  let last = 0;
  let disposed = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const fromColor = new Color(options.flavor.cream);
  const toColor = new Color(options.flavor.cream);
  const fromSheen = new Color(options.flavor.sheen);
  const toSheen = new Color(options.flavor.sheen);
  let blend = 1;
  let squash = 1;

  function frameCamera() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit the product to ~72% of the height, or 78% of the width on narrow
    // stages, and keep the ground line near the bottom where the word sits.
    const fov = (camera.fov * Math.PI) / 180;
    const fitHeight = PRODUCT_HEIGHT / 0.72;
    const fitWidth = 2.3 / 0.78 / camera.aspect;
    const viewHeight = Math.max(fitHeight, fitWidth);
    const distance = viewHeight / 2 / Math.tan(fov / 2);
    const target = GROUND_Y + viewHeight * 0.4;
    camera.position.set(0, target + 0.9, distance);
    camera.lookAt(0, target, 0);
    camera.updateProjectionMatrix();
  }

  function update(dt: number) {
    elapsed += dt;
    const t = elapsed;
    const ease = 1 - Math.exp(-dt * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;

    const bob = Math.sin(t * 1.15) * 0.085;
    float.position.y = bob;
    float.rotation.y = Math.sin(t * 0.36) * 0.42 + pointer.x * 0.45;
    float.rotation.x = pointer.y * 0.16 + Math.sin(t * 0.8) * 0.025;
    float.rotation.z = -pointer.x * 0.07 + Math.sin(t * 0.6) * 0.03;
    placeShadow(bob);

    if (blend < 1) {
      blend = Math.min(1, blend + dt / 0.5);
      applyColor(1 - Math.pow(1 - blend, 3));
    }
    if (squash < 1) {
      squash = Math.min(1, squash + dt / 1.1);
      const s = squash * 1.1;
      const wobble = Math.exp(-s * 5) * Math.cos(s * 13);
      swirlPivot.scale.set(1 + wobble * 0.06, 1 - wobble * 0.09, 1 + wobble * 0.06);
    } else {
      swirlPivot.scale.set(1, 1, 1);
    }
  }

  function placeShadow(height: number) {
    const lift = height / 0.085;
    softShadow.scale.set(3.1 - lift * 0.18, 3.1 - lift * 0.18, 1);
    shadowSoft.opacity = 0.42 - lift * 0.06;
    coreShadow.scale.set(1.7 - lift * 0.14, 1.7 - lift * 0.14, 1);
    shadowCore.opacity = 0.42 - lift * 0.1;
  }

  function applyColor(amount: number) {
    cream.color.lerpColors(fromColor, toColor, amount);
    cream.sheenColor.lerpColors(fromSheen, toSheen, amount);
    dripCream.color.copy(cream.color);
    dripCream.sheenColor.copy(cream.sheenColor);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    frame = 0;
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
    last = now;
    update(dt);
    render();
    schedule();
  }

  function running() {
    return animate && inView && pageVisible && !disposed;
  }

  function schedule() {
    if (frame || !running()) return;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function settleStill() {
    // A composed resting pose for reduced motion and paused motion.
    pointer.x = pointer.tx = 0;
    pointer.y = pointer.ty = 0;
    float.position.y = 0;
    float.rotation.set(0.02, 0.18, 0);
    swirlPivot.scale.set(1, 1, 1);
    squash = 1;
    if (blend < 1) {
      blend = 1;
      applyColor(1);
    }
    placeShadow(0);
    render();
  }

  function onPointerMove(event: PointerEvent) {
    if (!running()) return;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointer.tx = Math.max(-1, Math.min(1, x));
    pointer.ty = Math.max(-1, Math.min(1, y));
  }

  function onVisibility() {
    pageVisible = document.visibilityState === "visible";
    if (running()) schedule();
    else stop();
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    stop();
    options.onContextLost();
  }

  const resizeObserver = new ResizeObserver(() => {
    frameCamera();
    if (!running()) render();
  });
  resizeObserver.observe(container);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);

  frameCamera();
  if (animate) {
    float.rotation.y = 0;
    render();
    schedule();
  } else {
    settleStill();
  }

  return {
    setFlavor(flavor) {
      fromColor.copy(cream.color);
      fromSheen.copy(cream.sheenColor);
      toColor.set(flavor.cream);
      toSheen.set(flavor.sheen);
      if (running()) {
        blend = 0;
        squash = 0;
        schedule();
      } else {
        blend = 1;
        applyColor(1);
        render();
      }
    },
    setAnimate(next) {
      animate = next;
      if (running()) schedule();
      else {
        stop();
        settleStill();
      }
    },
    setInView(next) {
      inView = next;
      if (running()) schedule();
      else stop();
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
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
    },
  };
}
