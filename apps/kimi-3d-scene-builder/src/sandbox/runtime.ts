import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { compileUserCode, userLineFromError } from "./execute.ts";
import type { FrameToParent } from "./protocol.ts";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(12, 6, 16);

let renderer: THREE.WebGLRenderer | null = null;
let webglError: string | null = null;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: false,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);
} catch (error) {
  webglError = error instanceof Error ? error.message : String(error);
  const note = document.createElement("p");
  note.textContent = webglError;
  note.style.cssText = "margin:16px;color:#fff;font:13px/1.4 sans-serif";
  document.body.appendChild(note);
}

const controls = renderer ? new OrbitControls(camera, renderer.domElement) : null;
if (controls) {
  controls.enableDamping = true;
  controls.target.set(0, 2, 0);
}

let homePosition = camera.position.clone();
let homeTarget = controls?.target.clone() ?? new THREE.Vector3(0, 2, 0);
let callbacks: Array<(dt: number, t: number) => void> = [];
let currentRunId = "";
let reported = false;
let stopLoop = false;
let loop = 0;
let elapsed = 0;
const clock = { last: 0, sinceBeat: 0, beatStamp: 0 };

function post(message: FrameToParent): void {
  parent.postMessage(message, "*");
}

function report(phase: "compile" | "build" | "frame", error: unknown): void {
  if (reported) return;
  reported = true;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  post({
    type: "error",
    runId: currentRunId,
    phase,
    message,
    stack,
    line: userLineFromError(error),
  });
}

function resize(): void {
  if (!renderer) return;
  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
}

function setSky(topColor: string | number, bottomColor: string | number): void {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, new THREE.Color(topColor).getStyle());
  gradient.addColorStop(1, new THREE.Color(bottomColor).getStyle());
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
}

function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function onFrame(callback: (dt: number, t: number) => void): void {
  callbacks.push((dt, t) => {
    if (stopLoop) return;
    try {
      callback(dt, t);
    } catch (error) {
      stopLoop = true;
      report("frame", error);
    }
  });
}

function lockdown(): void {
  const names = [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "Worker",
    "SharedWorker",
    "caches",
    "indexedDB",
  ] as const;
  for (const name of names) {
    try {
      Object.defineProperty(globalThis, name, {
        value: undefined,
        writable: true,
        configurable: true,
      });
    } catch {
      /* some hosts expose these as non-configurable */
    }
  }
  const blockStorage = () => undefined;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      Object.defineProperty(globalThis, name, {
        get: blockStorage,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
  }
  if ("sendBeacon" in navigator) navigator.sendBeacon = () => false;
  globalThis.open = () => null;
}

function logProbes(): void {
  console.info(`[sandbox] fetch is ${typeof fetch}`);
  try {
    void parent.document.title;
    console.info("[sandbox] parent.document was readable");
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.info(`[sandbox] parent.document threw ${name}`);
  }
  const image = new Image();
  image.alt = "csp probe";
  image.src = "https://example.com/x.png";
  console.info("[sandbox] requested https://example.com/x.png (CSP img-src should block it)");
}

function resetScene(): void {
  cancelAnimationFrame(loop);
  callbacks = [];
  reported = false;
  stopLoop = false;
  elapsed = 0;
  while (scene.children.length > 0) {
    const child = scene.children[0];
    if (child) scene.remove(child);
  }
  scene.background = new THREE.Color(0x111111);
  scene.fog = null;
  camera.position.set(12, 6, 16);
  camera.lookAt(0, 2, 0);
  if (!controls) return;
  controls.target.set(0, 2, 0);
  controls.update();
}

function rememberCamera(): void {
  if (!controls) return;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  controls.target.copy(camera.position).addScaledVector(direction, 12);
  controls.update();
  homePosition = camera.position.clone();
  homeTarget = controls.target.clone();
}

function renderLoop(now: number): void {
  if (stopLoop) return;
  const dt = Math.min(0.05, (now - clock.last) / 1000);
  clock.last = now;
  elapsed += dt;
  clock.sinceBeat += now - (clock.beatStamp || now);
  clock.beatStamp = now;
  if (clock.sinceBeat >= 1000) {
    clock.sinceBeat = 0;
    post({ type: "heartbeat", runId: currentRunId });
  }
  for (const callback of callbacks) {
    if (stopLoop) return;
    callback(dt, elapsed);
  }
  controls?.update();
  renderer?.render(scene, camera);
  if (!stopLoop) loop = requestAnimationFrame(renderLoop);
}

function run(runId: string, code: string): void {
  currentRunId = runId;
  if (!renderer) {
    post({
      type: "error",
      runId,
      phase: "build",
      message: webglError ?? "WebGL is unavailable in this browser.",
    });
    return;
  }
  resetScene();
  const kit = {
    THREE,
    scene,
    camera,
    renderer,
    onFrame,
    random,
    setSky,
    addControls() {
      /* orbit controls are always on */
    },
  };
  let build: ReturnType<typeof compileUserCode>;
  try {
    build = compileUserCode(code);
  } catch (error) {
    report("compile", error);
    renderer.render(scene, camera);
    return;
  }
  try {
    build(kit, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
  } catch (error) {
    report("build", error);
    rememberCamera();
    clock.last = performance.now();
    clock.sinceBeat = 1000;
    loop = requestAnimationFrame(renderLoop);
    return;
  }
  rememberCamera();
  post({ type: "ready", runId });
  clock.last = performance.now();
  clock.sinceBeat = 1000;
  loop = requestAnimationFrame(renderLoop);
}

function resetCamera(): void {
  if (!renderer || !controls) return;
  camera.position.copy(homePosition);
  controls.target.copy(homeTarget);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as { type?: string; runId?: string; code?: string } | null;
  if (!data || typeof data !== "object") return;
  if (data.type === "resetCamera") {
    resetCamera();
    return;
  }
  if (data.type === "run" && typeof data.runId === "string" && typeof data.code === "string") {
    run(data.runId, data.code);
  }
});

resize();
lockdown();
logProbes();
renderer?.render(scene, camera);
