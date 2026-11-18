import type { Assembly, Part, Vec3 } from "../schema.ts";

const STILL: Vec3 = [0, 0, 0];
const ALONG_X: Vec3 = [0, 0, Math.PI / 2];
const ALONG_Z: Vec3 = [Math.PI / 2, 0, 0];
const FLIP_DOWN: Vec3 = [Math.PI, 0, 0];

function part(
  id: string,
  name: string,
  description: string,
  color: string,
  shape: Part["shape"],
  size: Vec3,
  rotation: Vec3,
  assembledPosition: Vec3,
  explodedPosition: Vec3,
  qty = 1,
): Part {
  return {
    id,
    name,
    qty,
    description,
    color,
    shape,
    size,
    rotation,
    assembledPosition,
    explodedPosition,
  };
}

export const RC_BUGGY_TEXT = `Kit: pocket RC buggy (hand-authored fixture, not an official OpenAI asset)

Parts:
- 1 aluminum chassis plate
- 1 red polycarbonate body shell
- 4 rubber tires on silver hubs
- 1 brushed motor
- 1 NiMH battery pack
- 1 steering servo
- 1 roll bar

Build:
1. Bolt the motor and the battery to the chassis.
2. Fit the steering servo at the front.
3. Press the four wheels onto the axles.
4. Clip the body shell and the roll bar.`;

export const DESK_LAMP_TEXT = `Kit: cantilever desk lamp (hand-authored fixture, not an official OpenAI asset)

Parts:
- 1 round steel base
- 1 stem
- 1 horizontal arm
- 1 conical shade
- 1 bulb
- 1 cord

Build:
1. Stand the stem on the base.
2. Bolt the arm to the top of the stem.
3. Hang the shade and seat the bulb.
4. Route the cord off the back of the base.`;

const rcAstra: Assembly = {
  title: "Pocket RC buggy",
  summary:
    "Recorded hand-authored layout: rear motor, separate battery, front servo, red shell, and a roll bar. Not OpenAI CAD.",
  parts: [
    part(
      "chassis",
      "Chassis plate",
      "Aluminum plate the rest of the kit bolts to.",
      "#3f3f46",
      "box",
      [1.7, 0.1, 2.45],
      STILL,
      [0, 0.16, 0],
      [0, -0.85, 0],
    ),
    part(
      "battery",
      "Battery pack",
      "NiMH stick pack on the right side of the tray.",
      "#15803d",
      "box",
      [0.42, 0.18, 0.7],
      STILL,
      [0.32, 0.3, 0.2],
      [1.15, 0.2, 0.45],
    ),
    part(
      "motor",
      "Brushed motor",
      "Orange can at the rear, shaft toward the axle line.",
      "#ea580c",
      "cylinder",
      [0.16, 0.42, 0.16],
      ALONG_Z,
      [0, 0.32, -0.7],
      [-0.2, 0.25, -1.6],
    ),
    part(
      "servo",
      "Steering servo",
      "Blue servo at the front of the plate.",
      "#2563eb",
      "box",
      [0.34, 0.16, 0.24],
      STILL,
      [0, 0.3, 0.88],
      [0, 0.4, 1.7],
    ),
    part(
      "shell",
      "Body shell",
      "Red polycarbonate shell over the cockpit.",
      "#dc2626",
      "box",
      [1.28, 0.28, 1.45],
      STILL,
      [0, 0.5, -0.02],
      [0, 1.4, -0.05],
    ),
    part(
      "rollbar",
      "Roll bar",
      "Single hoop standing over the shell.",
      "#e7e5e4",
      "box",
      [1.12, 0.08, 0.08],
      STILL,
      [0, 0.78, -0.12],
      [0, 2.1, -0.15],
    ),
    part(
      "wheel-fl",
      "Front left wheel",
      "Rubber tire on a silver hub.",
      "#d6d3d1",
      "cylinder",
      [0.28, 0.16, 0.28],
      ALONG_X,
      [-0.98, 0.28, 0.82],
      [-1.8, 0.28, 1.2],
    ),
    part(
      "wheel-fr",
      "Front right wheel",
      "Rubber tire on a silver hub.",
      "#d6d3d1",
      "cylinder",
      [0.28, 0.16, 0.28],
      ALONG_X,
      [0.98, 0.28, 0.82],
      [1.8, 0.28, 1.2],
    ),
    part(
      "wheel-rl",
      "Rear left wheel",
      "Rubber tire on a silver hub.",
      "#a8a29e",
      "cylinder",
      [0.28, 0.16, 0.28],
      ALONG_X,
      [-0.98, 0.28, -0.72],
      [-1.8, 0.28, -1.25],
    ),
    part(
      "wheel-rr",
      "Rear right wheel",
      "Rubber tire on a silver hub.",
      "#a8a29e",
      "cylinder",
      [0.28, 0.16, 0.28],
      ALONG_X,
      [0.98, 0.28, -0.72],
      [1.8, 0.28, -1.25],
    ),
  ],
  steps: [
    {
      n: 1,
      title: "Mount the power",
      instruction: "Bolt the brushed motor at the rear and the battery pack beside it.",
      partIds: ["chassis", "motor", "battery"],
    },
    {
      n: 2,
      title: "Add steering",
      instruction: "Seat the servo at the front of the chassis plate.",
      partIds: ["servo"],
    },
    {
      n: 3,
      title: "Press on the wheels",
      instruction: "Push each tire onto its hub so the four wheels sit at the corners.",
      partIds: ["wheel-fl", "wheel-fr", "wheel-rl", "wheel-rr"],
    },
    {
      n: 4,
      title: "Clip the body",
      instruction: "Drop the red shell over the tub and clip the roll bar on top.",
      partIds: ["shell", "rollbar"],
    },
  ],
};

const rcSol: Assembly = {
  title: "Pocket RC buggy, simpler split",
  summary:
    "Recorded hand-authored layout with a combined power pack, an orange shell, and a rear spoiler. Not OpenAI CAD and not the Astra fixture.",
  parts: [
    part(
      "deck",
      "Deck",
      "One-piece deck that stands in for the chassis plate.",
      "#44403c",
      "box",
      [1.75, 0.12, 2.3],
      STILL,
      [0, 0.16, 0],
      [0, -0.7, 0],
    ),
    part(
      "power-pack",
      "Power pack",
      "Motor and battery treated as a single amber block.",
      "#d97706",
      "box",
      [0.72, 0.28, 0.78],
      STILL,
      [0, 0.38, -0.28],
      [-1.2, 0.45, -0.5],
    ),
    part(
      "shell",
      "Orange shell",
      "Taller shell with no separate roll bar.",
      "#f97316",
      "box",
      [1.36, 0.36, 1.6],
      STILL,
      [0, 0.58, 0.08],
      [0, 1.45, 0.15],
    ),
    part(
      "spoiler",
      "Rear spoiler",
      "Black wing standing off the tail.",
      "#18181b",
      "box",
      [1.5, 0.08, 0.28],
      STILL,
      [0, 0.88, -1.02],
      [0, 1.9, -1.65],
    ),
    part(
      "steering-horn",
      "Steering horn",
      "A small cone in place of a separate servo box.",
      "#2563eb",
      "cone",
      [0.1, 0.24, 0.1],
      STILL,
      [0, 0.4, 0.95],
      [0.15, 0.5, 1.75],
    ),
    part(
      "wheel-fl",
      "Front left tire",
      "Black tire, grouped in the Sol breakdown as a corner wheel.",
      "#1c1917",
      "cylinder",
      [0.28, 0.18, 0.28],
      ALONG_X,
      [-1.02, 0.28, 0.78],
      [-1.85, 0.28, 1.15],
    ),
    part(
      "wheel-fr",
      "Front right tire",
      "Black tire.",
      "#1c1917",
      "cylinder",
      [0.28, 0.18, 0.28],
      ALONG_X,
      [1.02, 0.28, 0.78],
      [1.85, 0.28, 1.15],
    ),
    part(
      "wheel-rl",
      "Rear left tire",
      "Black tire under the spoiler.",
      "#292524",
      "cylinder",
      [0.3, 0.18, 0.3],
      ALONG_X,
      [-1.02, 0.3, -0.78],
      [-1.85, 0.3, -1.3],
    ),
    part(
      "wheel-rr",
      "Rear right tire",
      "Black tire under the spoiler.",
      "#292524",
      "cylinder",
      [0.3, 0.18, 0.3],
      ALONG_X,
      [1.02, 0.3, -0.78],
      [1.85, 0.3, -1.3],
    ),
  ],
  steps: [
    {
      n: 1,
      title: "Drop in the power pack",
      instruction: "Set the combined motor-and-battery block in the middle of the deck.",
      partIds: ["deck", "power-pack"],
    },
    {
      n: 2,
      title: "Steering horn",
      instruction: "Press the blue horn into the nose. Sol does not split out a servo.",
      partIds: ["steering-horn"],
    },
    {
      n: 3,
      title: "Four tires",
      instruction: "Seat the black tires at the corners.",
      partIds: ["wheel-fl", "wheel-fr", "wheel-rl", "wheel-rr"],
    },
    {
      n: 4,
      title: "Shell and wing",
      instruction: "Clip the orange shell, then the rear spoiler. There is no roll bar in this split.",
      partIds: ["shell", "spoiler"],
    },
  ],
};

const lampAstra: Assembly = {
  title: "Cantilever desk lamp",
  summary:
    "Recorded hand-authored layout: round base, upright stem, reaching arm, conical shade. Not a product photo.",
  parts: [
    part(
      "base",
      "Round base",
      "Steel disc that keeps the lamp from tipping.",
      "#1c1917",
      "cylinder",
      [0.55, 0.1, 0.55],
      STILL,
      [0, 0.05, 0],
      [0, -0.75, 0],
    ),
    part(
      "stem",
      "Stem",
      "Vertical tube rising from the base.",
      "#78716c",
      "cylinder",
      [0.055, 1.05, 0.055],
      STILL,
      [0, 0.62, 0],
      [-0.2, 0.4, -0.9],
    ),
    part(
      "arm",
      "Arm",
      "Horizontal bar reaching out to the shade.",
      "#78716c",
      "box",
      [0.78, 0.07, 0.08],
      STILL,
      [0.34, 1.16, 0],
      [0.95, 1.15, 0],
    ),
    part(
      "shade",
      "Conical shade",
      "Shade pointing down over the bulb.",
      "#fafaf9",
      "cone",
      [0.4, 0.38, 0.4],
      FLIP_DOWN,
      [0.66, 1.02, 0],
      [1.45, 1.7, 0.35],
    ),
    part(
      "bulb",
      "Bulb",
      "Small warm sphere under the shade.",
      "#fde68a",
      "sphere",
      [0.11, 0.11, 0.11],
      STILL,
      [0.66, 0.9, 0],
      [1.25, 0.5, 0.8],
    ),
    part(
      "cord",
      "Cord",
      "Short lead leaving the back of the base.",
      "#18181b",
      "box",
      [0.05, 0.04, 0.85],
      STILL,
      [0.12, 0.03, 0.55],
      [0.4, -0.4, 1.25],
    ),
  ],
  steps: [
    {
      n: 1,
      title: "Stand the stem",
      instruction: "Seat the stem in the center of the round base.",
      partIds: ["base", "stem"],
    },
    {
      n: 2,
      title: "Bolt the arm",
      instruction: "Fasten the arm so it cantilevers away from the stem.",
      partIds: ["arm"],
    },
    {
      n: 3,
      title: "Shade and bulb",
      instruction: "Hang the cone and seat the bulb inside it.",
      partIds: ["shade", "bulb"],
    },
    {
      n: 4,
      title: "Route the cord",
      instruction: "Lay the cord off the back of the base.",
      partIds: ["cord"],
    },
  ],
};

const lampSol: Assembly = {
  title: "Task lamp, drum shade",
  summary:
    "Recorded hand-authored layout: square base, two-piece stem, drum shade, and a switch. No cord and no cantilever arm.",
  parts: [
    part(
      "base",
      "Square base",
      "Block base instead of a disc.",
      "#292524",
      "box",
      [0.9, 0.1, 0.9],
      STILL,
      [0, 0.05, 0],
      [0, -0.7, 0],
    ),
    part(
      "stem-lower",
      "Lower stem",
      "Thicker lower tube of a two-piece stem.",
      "#57534e",
      "cylinder",
      [0.07, 0.52, 0.07],
      STILL,
      [0, 0.36, 0],
      [-0.55, 0.25, 0],
    ),
    part(
      "stem-upper",
      "Upper stem",
      "Thinner tube that slides above the lower stem.",
      "#a8a29e",
      "cylinder",
      [0.045, 0.48, 0.045],
      STILL,
      [0, 0.84, 0],
      [0.5, 0.8, -0.55],
    ),
    part(
      "shade",
      "Drum shade",
      "Short wide cylinder, not a cone.",
      "#e7e5e4",
      "cylinder",
      [0.38, 0.32, 0.38],
      STILL,
      [0, 1.28, 0],
      [0, 1.95, 0.45],
    ),
    part(
      "bulb",
      "Bulb",
      "Sphere sitting inside the drum.",
      "#fef3c7",
      "sphere",
      [0.1, 0.1, 0.1],
      STILL,
      [0, 1.28, 0],
      [0.75, 1.15, 0.85],
    ),
    part(
      "switch",
      "Switch",
      "Small red rocker on the base. Sol keeps this instead of a cord.",
      "#b91c1c",
      "box",
      [0.16, 0.08, 0.12],
      STILL,
      [0.28, 0.14, 0.28],
      [1.05, 0.1, 0.65],
    ),
  ],
  steps: [
    {
      n: 1,
      title: "Base and lower stem",
      instruction: "Stand the thicker tube on the square base.",
      partIds: ["base", "stem-lower"],
    },
    {
      n: 2,
      title: "Extend the stem",
      instruction: "Slide the thinner tube on top.",
      partIds: ["stem-upper"],
    },
    {
      n: 3,
      title: "Drum and bulb",
      instruction: "Cap the stem with the drum shade and the bulb.",
      partIds: ["shade", "bulb"],
    },
    {
      n: 4,
      title: "Switch",
      instruction: "Press the red switch into the top of the base.",
      partIds: ["switch"],
    },
  ],
};

export type KitId = "rc-buggy" | "desk-lamp";

export type Kit = {
  id: KitId;
  label: string;
  sourceText: string;
  handAuthored: true;
  assemblies: Record<"astra" | "sol", Assembly>;
};

export const KITS: readonly Kit[] = [
  {
    id: "rc-buggy",
    label: "RC buggy",
    sourceText: RC_BUGGY_TEXT,
    handAuthored: true,
    assemblies: { astra: rcAstra, sol: rcSol },
  },
  {
    id: "desk-lamp",
    label: "Desk lamp",
    sourceText: DESK_LAMP_TEXT,
    handAuthored: true,
    assemblies: { astra: lampAstra, sol: lampSol },
  },
];

export function normalizeSource(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export function kitById(id: string): Kit | undefined {
  return KITS.find((kit) => kit.id === id);
}

export function kitBySource(text: string): Kit | undefined {
  const normalized = normalizeSource(text);
  if (!normalized) return undefined;
  return KITS.find((kit) => normalizeSource(kit.sourceText) === normalized);
}
