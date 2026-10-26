import { z } from "zod";
import type { ModelChoice, Timings } from "../src/lib/types.ts";

type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details: { reasoning_tokens: number };
  prompt_tokens_details: { cached_tokens?: number; cache_write_tokens: number };
};

export type MockStep = {
  kind: "generate" | "edit" | "fix";
  prompt: string;
  code: string;
  reasoning: string;
  broken?: boolean;
  usage: Usage;
  timings: Record<ModelChoice, Timings>;
};

export type MockScene = {
  id: string;
  prompt: string;
  edits: string[];
  generate: MockStep;
  editSteps: MockStep[];
  broken?: MockStep;
  fix?: MockStep;
};

const usageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  completion_tokens_details: z.object({ reasoning_tokens: z.number() }),
  prompt_tokens_details: z.object({
    cached_tokens: z.number().optional(),
    cache_write_tokens: z.number(),
  }),
});

const stepSchema = z.object({
  kind: z.enum(["generate", "edit", "fix"]),
  prompt: z.string().min(1),
  code: z.string().min(1),
  reasoning: z.string().min(1),
  broken: z.boolean().optional(),
  usage: usageSchema,
  timings: z.object({
    pro: z.object({ ttftMs: z.number(), firstContentMs: z.number(), totalMs: z.number() }),
    highspeed: z.object({ ttftMs: z.number(), firstContentMs: z.number(), totalMs: z.number() }),
  }),
});

function timings(ttftMs: number, firstContentMs: number, totalMs: number): Record<ModelChoice, Timings> {
  const speed = 2.5;
  return {
    pro: { ttftMs, firstContentMs, totalMs },
    highspeed: {
      ttftMs: Math.round(ttftMs / speed),
      firstContentMs: Math.round(firstContentMs / speed),
      totalMs: Math.round(totalMs / speed),
    },
  };
}

function usage(prompt: number, cached: number, cacheWrite: number, completion: number, reasoning: number): Usage {
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    completion_tokens_details: { reasoning_tokens: reasoning },
    prompt_tokens_details: { cached_tokens: cached, cache_write_tokens: cacheWrite },
  };
}

function lighthouse(reflective: boolean): string {
  const water = reflective
    ? "new THREE.MeshStandardMaterial({ color: 0x16324f, roughness: 0.08, metalness: 0.72 })"
    : "new THREE.MeshStandardMaterial({ color: 0x1a3c66, roughness: 0.55, metalness: 0.05 })";
  const sky = reflective ? '"#ffc49a", "#14203f"' : '"#ff8a4a", "#1b2448"';
  return `// scene:lighthouse
const THREE = kit.THREE;
const rand = kit.random(11);
kit.setSky(${sky});
kit.camera.position.set(16, 7.5, 18);
kit.camera.lookAt(0, 2.4, 0);

const sun = new THREE.DirectionalLight(0xffc38a, 2.6);
sun.position.set(-18, 12, 8);
kit.scene.add(sun);
const fill = new THREE.DirectionalLight(0x9eb6ff, ${reflective ? "0.7" : "0.35"});
fill.position.set(8, 7, 12);
kit.scene.add(fill);
kit.scene.add(new THREE.AmbientLight(0x4c5678, 0.4));
kit.scene.add(new THREE.HemisphereLight(0xffb07a, 0x1a2438, 0.4));

const water = new THREE.Mesh(new THREE.CircleGeometry(36, 48), ${water});
water.rotation.x = -Math.PI / 2;
kit.scene.add(water);

function rock(x, y, z, radius, color) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 0),
    new THREE.MeshStandardMaterial({ color: color, flatShading: true, roughness: 0.92 }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rand() * 2, rand() * 2, 0);
  kit.scene.add(mesh);
}

rock(0, 0.7, 0, 2.6, 0x6d5648);
rock(-2.1, 0.35, 1.1, 1.5, 0x5c4a40);
rock(1.8, 0.25, -0.8, 1.3, 0x7a6254);
rock(0.6, 0.15, 2.1, 1.1, 0x4e433c);
rock(-1.2, 0.1, -1.8, 1.2, 0x65564c);
rock(2.6, -0.05, 1.5, 0.7, 0x3f3834);

const tower = new THREE.Mesh(
  new THREE.CylinderGeometry(0.48, 0.78, 5.4, 8),
  new THREE.MeshStandardMaterial({ color: 0xf3efe6, flatShading: true, roughness: 0.7 }),
);
tower.position.set(0.15, 3.6, 0.1);
kit.scene.add(tower);

const band = new THREE.Mesh(
  new THREE.CylinderGeometry(0.52, 0.62, 0.55, 8),
  new THREE.MeshStandardMaterial({ color: 0xb4332a, flatShading: true, roughness: 0.6 }),
);
band.position.set(0.15, 4.7, 0.1);
kit.scene.add(band);

const lamp = new THREE.Mesh(
  new THREE.CylinderGeometry(0.42, 0.42, 0.62, 8),
  new THREE.MeshStandardMaterial({
    color: 0xfff1c2,
    emissive: 0xffb703,
    emissiveIntensity: 1.5,
    flatShading: true,
    roughness: 0.35,
  }),
);
lamp.position.set(0.15, 6.5, 0.1);
kit.scene.add(lamp);

const cap = new THREE.Mesh(
  new THREE.ConeGeometry(0.62, 0.48, 8),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true, roughness: 0.5 }),
);
cap.position.set(0.15, 7.05, 0.1);
kit.scene.add(cap);

const gallery = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 0.85, 0.08, 10),
  new THREE.MeshStandardMaterial({ color: 0xd9d3c7, flatShading: true, roughness: 0.5 }),
);
gallery.position.set(0.15, 6.15, 0.1);
kit.scene.add(gallery);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.35, 18, 12),
  new THREE.MeshBasicMaterial({ color: 0xff7a33 }),
);
sunMesh.position.set(-14, 8.5, -10);
kit.scene.add(sunMesh);

const pivot = new THREE.Group();
pivot.position.set(0.15, 6.5, 0.1);
const beam = new THREE.Mesh(
  new THREE.ConeGeometry(0.45, 8, 5, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
);
beam.geometry.translate(0, 4, 0);
beam.rotation.x = Math.PI / 2;
pivot.add(beam);
kit.scene.add(pivot);

const lampLight = new THREE.PointLight(0xffc46b, 6, 24);
lampLight.position.set(0.15, 6.5, 0.1);
kit.scene.add(lampLight);

kit.onFrame((dt, t) => {
  pivot.rotation.y = t * 0.65;
  lampLight.intensity = 5.5 + Math.sin(t * 3.2) * 1.2;
});
kit.addControls();
`;
}

const brokenBirds = `
const birdMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f2, side: THREE.DoubleSide, flatShading: true });
const birds = new THREE.InstancedMesh(wingGeo, birdMat, 12);
kit.scene.add(birds);
`;

const fixedBirds = `
const wing = new THREE.Shape();
wing.moveTo(0, 0);
wing.lineTo(0.72, 0.16);
wing.lineTo(0.12, 0);
wing.lineTo(0, 0.2);
wing.lineTo(-0.12, 0);
wing.lineTo(-0.72, 0.16);
wing.closePath();
const wingGeo = new THREE.ShapeGeometry(wing);
const birdMat = new THREE.MeshStandardMaterial({
  color: 0xf7f7f2,
  side: THREE.DoubleSide,
  flatShading: true,
  roughness: 0.55,
});
const birdCount = 10;
const birds = new THREE.InstancedMesh(wingGeo, birdMat, birdCount);
const dummy = new THREE.Object3D();
const flight = [];
for (let i = 0; i < birdCount; i++) {
  flight.push({
    angle: rand() * Math.PI * 2,
    radius: 5 + rand() * 6,
    height: 6.2 + rand() * 2.2,
    speed: 0.35 + rand() * 0.4,
  });
}
kit.scene.add(birds);
kit.onFrame((dt, t) => {
  for (let i = 0; i < birdCount; i++) {
    const spec = flight[i];
    const angle = spec.angle + t * spec.speed;
    const x = Math.cos(angle) * spec.radius;
    const y = spec.height + Math.sin(t * 2 + i) * 0.25;
    const z = Math.sin(angle) * spec.radius;
    dummy.position.set(x, y, z);
    dummy.lookAt(x + Math.sin(angle), y, z - Math.cos(angle));
    dummy.rotateZ(Math.sin(t * 9 + i) * 0.45);
    dummy.updateMatrix();
    birds.setMatrixAt(i, dummy.matrix);
  }
  birds.instanceMatrix.needsUpdate = true;
});
`;

function campfire(fireflies: boolean, wild: boolean): string {
  const flicker = wild
    ? `const wild = 0.45 + Math.abs(Math.sin(t * 19)) * 0.85 + Math.abs(Math.sin(t * 37)) * 0.4;
  flame.scale.set(0.7 + wild * 0.4, wild, 0.7 + wild * 0.4);
  inner.scale.y = 0.35 + wild;
  fire.intensity = 4 + wild * 18;`
    : `const flicker = 0.86 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23) * 0.04;
  flame.scale.y = flicker;
  inner.scale.y = 0.92 + Math.sin(t * 17) * 0.06;
  fire.intensity = 12 + Math.sin(t * 13) * 1.4;`;
  const flies = fireflies
    ? `
const flies = [];
for (let i = 0; i < 16; i++) {
  const fly = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0xe4ff6a }),
  );
  const origin = new THREE.Vector3((rand() - 0.5) * 5.5, 0.7 + rand() * 2.1, (rand() - 0.5) * 5.5);
  fly.position.copy(origin);
  kit.scene.add(fly);
  flies.push({ mesh: fly, origin: origin, speed: 0.6 + rand(), phase: rand() * 6 });
}
kit.onFrame((dt, t) => {
  for (let i = 0; i < flies.length; i++) {
    const fly = flies[i];
    fly.mesh.position.x = fly.origin.x + Math.sin(t * fly.speed + fly.phase) * 0.45;
    fly.mesh.position.y = fly.origin.y + Math.sin(t * fly.speed * 1.7 + fly.phase) * 0.22;
    fly.mesh.position.z = fly.origin.z + Math.cos(t * fly.speed + fly.phase) * 0.45;
  }
});
`
    : "";
  return `// scene:campfire
const THREE = kit.THREE;
const rand = kit.random(4);
kit.setSky("#070814", "#141a2e");
kit.camera.position.set(7.2, 4.1, 8.2);
kit.camera.lookAt(0, 1.1, 0);
kit.scene.add(new THREE.AmbientLight(0x223044, 0.4));
const moon = new THREE.DirectionalLight(0xb7c8ff, 0.32);
moon.position.set(-6, 10, 4);
kit.scene.add(moon);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(14, 28),
  new THREE.MeshStandardMaterial({ color: 0x1a2418, roughness: 1, flatShading: true }),
);
ground.rotation.x = -Math.PI / 2;
kit.scene.add(ground);

function pine(x, z, height) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, height * 0.28, 5),
    new THREE.MeshStandardMaterial({ color: 0x3b2918, flatShading: true, roughness: 1 }),
  );
  trunk.position.set(x, height * 0.12, z);
  kit.scene.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.22, height * 0.78, 6),
    new THREE.MeshStandardMaterial({ color: 0x173424, flatShading: true, roughness: 0.9 }),
  );
  leaves.position.set(x, height * 0.48, z);
  kit.scene.add(leaves);
}

const spots = [[-4.2, -1.5, 3.2], [-3.2, 2.4, 3.6], [3.6, -2.2, 3.4], [4.2, 1.6, 3.8], [-1.6, -4, 2.8], [1.2, 4.2, 3.3], [-5, 0.4, 4.1], [0.5, -5, 3.1]];
for (let i = 0; i < spots.length; i++) pine(spots[i][0], spots[i][1], spots[i][2]);

function log(x, z, rot) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 1.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3018, flatShading: true, roughness: 1 }),
  );
  mesh.rotation.z = Math.PI / 2;
  mesh.rotation.y = rot;
  mesh.position.set(x, 0.14, z);
  kit.scene.add(mesh);
}
log(-0.15, 0.05, 0.5);
log(0.15, -0.05, -0.45);

const flame = new THREE.Mesh(
  new THREE.ConeGeometry(0.26, 0.85, 6),
  new THREE.MeshStandardMaterial({ color: 0xffb15a, emissive: 0xff4d00, emissiveIntensity: 1.7, flatShading: true, roughness: 0.4 }),
);
flame.position.set(0, 0.55, 0);
kit.scene.add(flame);
const inner = new THREE.Mesh(
  new THREE.ConeGeometry(0.12, 0.5, 5),
  new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffe08a, emissiveIntensity: 2, flatShading: true }),
);
inner.position.set(0, 0.48, 0);
kit.scene.add(inner);
const fire = new THREE.PointLight(0xff6a2a, 14, 12, 2);
fire.position.set(0, 0.7, 0);
kit.scene.add(fire);
kit.onFrame((dt, t) => {
  ${flicker}
});
${flies}
kit.addControls();
`;
}

function crystals(rotate: boolean, waterfall: boolean): string {
  const motion = waterfall
    ? `const drops = [];
for (let i = 0; i < 22; i++) {
  const drop = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 5, 5),
    new THREE.MeshStandardMaterial({
      color: 0xbff7ff,
      emissive: 0x67e8f9,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
    }),
  );
  drop.position.set(2.15, 1.55 - (i % 11) * 0.18, (i % 2) * 0.12);
  group.add(drop);
  drops.push(drop);
}
kit.onFrame((dt, t) => {
  group.rotation.y = t * 0.28;
  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    drop.position.y -= dt * 1.5;
    if (drop.position.y < -2.2) drop.position.y = 1.6;
  }
});`
    : rotate
      ? `kit.onFrame((dt, t) => {
  group.rotation.y = t * 0.28;
});`
      : "";
  return `// scene:crystals
const THREE = kit.THREE;
const rand = kit.random(9);
kit.setSky("#14081f", "#2a1450");
kit.camera.position.set(7.4, 4.2, 8.2);
kit.camera.lookAt(0, 1.5, 0);
kit.scene.add(new THREE.AmbientLight(0x6a4a88, 0.45));
const key = new THREE.DirectionalLight(0xd7c4ff, 1.15);
key.position.set(4, 8, 6);
kit.scene.add(key);

const group = new THREE.Group();
const island = new THREE.Mesh(
  new THREE.DodecahedronGeometry(2.1, 0),
  new THREE.MeshStandardMaterial({ color: 0x3c4158, flatShading: true, roughness: 0.78 }),
);
island.scale.set(1.45, 0.42, 1.15);
island.position.y = 0.4;
group.add(island);
const shelf = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.45, 0),
  new THREE.MeshStandardMaterial({ color: 0x2a3144, flatShading: true, roughness: 0.9 }),
);
shelf.scale.set(1.15, 0.32, 0.95);
shelf.position.y = 0.1;
group.add(shelf);

const palette = [0x67e8f9, 0xc084fc, 0xf9a8d4, 0x93c5fd, 0xfde68a, 0x5eead4, 0xa78bfa, 0x7dd3fc];
for (let i = 0; i < 8; i++) {
  const color = palette[i];
  const height = 0.75 + rand() * 1.5;
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22 + rand() * 0.14, 0),
    new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.85,
      flatShading: true,
      roughness: 0.22,
      metalness: 0.04,
    }),
  );
  crystal.scale.y = height / 0.35;
  crystal.position.set((rand() - 0.5) * 2.1, 0.85 + height * 0.12, (rand() - 0.5) * 1.5);
  crystal.rotation.y = rand() * 2;
  group.add(crystal);
  const glow = new THREE.PointLight(color, 1.1, 3.2);
  glow.position.copy(crystal.position);
  group.add(glow);
}
kit.scene.add(group);

const voidFloor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 24),
  new THREE.MeshStandardMaterial({ color: 0x120818, roughness: 1 }),
);
voidFloor.rotation.x = -Math.PI / 2;
voidFloor.position.y = -2.5;
kit.scene.add(voidFloor);
${motion}
kit.addControls();
`;
}

const rawScenes: MockScene[] = [
  {
    id: "lighthouse",
    prompt: "a low-poly lighthouse on a rocky island at sunset",
    edits: ["make the water reflective", "add seagulls"],
    generate: {
      kind: "generate",
      prompt: "a low-poly lighthouse on a rocky island at sunset",
      code: lighthouse(false),
      reasoning:
        "Hand-written example. Place a low-poly rock pile in a sunset gradient, then a banded tower with an emissive lamp and a rotating beam. Keep the water matte so the next edit has something to change.",
      usage: usage(1680, 0, 420, 980, 410),
      timings: timings(740, 1680, 5120),
    },
    editSteps: [
      {
        kind: "edit",
        prompt: "make the water reflective",
        code: lighthouse(true),
        reasoning:
          "Hand-written example. Swap the water for a MeshStandardMaterial with roughness 0.08 and metalness 0.72, and lift the fill light so the specular reads against the sky gradient. No texture maps.",
        usage: usage(2140, 980, 260, 860, 300),
        timings: timings(610, 1420, 4680),
      },
      {
        kind: "edit",
        prompt: "add seagulls",
        code: lighthouse(true) + brokenBirds,
        reasoning:
          "Hand-written example, first attempt. Instance a ring of gulls on the existing reflective island. This pass names wingGeo before it exists, so the build throws ReferenceError.",
        broken: true,
        usage: usage(2480, 1320, 180, 740, 280),
        timings: timings(880, 2100, 6900),
      },
    ],
    broken: undefined,
    fix: {
      kind: "fix",
      prompt: "add seagulls",
      code: lighthouse(true) + fixedBirds,
      reasoning:
        "Hand-written fix. Define wingGeo as a V-shaped ShapeGeometry before the InstancedMesh, then circle ten gulls on onFrame. The reflective water and the lighthouse stay.",
      usage: usage(1960, 1540, 80, 920, 240),
      timings: timings(540, 1200, 3900),
    },
  },
  {
    id: "campfire",
    prompt: "a cozy campfire in a pine forest at night",
    edits: ["add fireflies", "make the fire flicker more"],
    generate: {
      kind: "generate",
      prompt: "a cozy campfire in a pine forest at night",
      code: campfire(false, false),
      reasoning:
        "Hand-written example. Ring a clearing with cone pines, lay two logs, and sit a small emissive flame under a warm point light. A slow sine keeps the fire alive.",
      usage: usage(1720, 0, 380, 1040, 460),
      timings: timings(800, 1900, 5600),
    },
    editSteps: [
      {
        kind: "edit",
        prompt: "add fireflies",
        code: campfire(true, false),
        reasoning:
          "Hand-written example. Scatter sixteen tiny yellow spheres around the clearing and bob them on a second onFrame so they drift without leaving the camp.",
        usage: usage(2280, 1100, 240, 790, 260),
        timings: timings(700, 1600, 4800),
      },
      {
        kind: "edit",
        prompt: "make the fire flicker more",
        code: campfire(true, true),
        reasoning:
          "Hand-written example. Replace the gentle flicker with two faster absolute sines so the flame scale and the point light jump. Fireflies stay.",
        usage: usage(2360, 1480, 160, 640, 210),
        timings: timings(650, 1500, 4400),
      },
    ],
  },
  {
    id: "crystals",
    prompt: "a floating island of glowing crystals",
    edits: ["make it rotate slowly", "add a waterfall off the edge"],
    generate: {
      kind: "generate",
      prompt: "a floating island of glowing crystals",
      code: crystals(false, false),
      reasoning:
        "Hand-written example. Float a flat dodecahedron island and push emissive octahedron crystals out of the top. A dark floor under it sells the drop.",
      usage: usage(1800, 0, 460, 1120, 490),
      timings: timings(860, 2000, 6200),
    },
    editSteps: [
      {
        kind: "edit",
        prompt: "make it rotate slowly",
        code: crystals(true, false),
        reasoning:
          "Hand-written example. Put the island and crystals in one group and yaw that group on onFrame at 0.28 rad/s.",
        usage: usage(2100, 1200, 200, 540, 180),
        timings: timings(500, 1100, 3600),
      },
      {
        kind: "edit",
        prompt: "add a waterfall off the edge",
        code: crystals(true, true),
        reasoning:
          "Hand-written example. Drop a column of small translucent spheres off the island's edge and recycle their local Y so the fall loops. The slow rotation stays.",
        usage: usage(2340, 1400, 220, 880, 250),
        timings: timings(720, 1700, 5100),
      },
    ],
  },
];

rawScenes[0]!.broken = rawScenes[0]!.editSteps[1];

const sceneSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  edits: z.array(z.string()).length(2),
  generate: stepSchema,
  editSteps: z.array(stepSchema).length(2),
  broken: stepSchema.optional(),
  fix: stepSchema.optional(),
});

export const MOCK_SCENES: MockScene[] = z.array(sceneSchema).parse(rawScenes);

export function listExamples(): Array<{ id: string; prompt: string; edits: string[] }> {
  return MOCK_SCENES.map((scene) => ({ id: scene.id, prompt: scene.prompt, edits: scene.edits }));
}

export function runnableCodes(): string[] {
  const codes: string[] = [];
  for (const scene of MOCK_SCENES) {
    codes.push(scene.generate.code);
    for (const step of scene.editSteps) {
      if (!step.broken) codes.push(step.code);
    }
    if (scene.fix) codes.push(scene.fix.code);
  }
  return codes;
}

export function brokenSeagullCode(): string {
  const scene = MOCK_SCENES.find((item) => item.id === "lighthouse");
  const broken = scene?.editSteps.find((step) => step.broken);
  if (!broken) throw new Error("missing broken seagull fixture");
  return broken.code;
}
