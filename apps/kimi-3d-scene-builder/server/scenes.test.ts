import { expect, test } from "bun:test";
import * as THREE from "three";
import { brokenSeagullCode, MOCK_SCENES, runnableCodes } from "../fixtures/mock-scenes.ts";
import { executeBuild } from "../src/sandbox/execute.ts";

function makeKit(scene: THREE.Scene) {
  return {
    THREE,
    scene,
    camera: new THREE.PerspectiveCamera(50, 1, 0.1, 100),
    renderer: {},
    onFrame() {},
    random(seed: number) {
      let state = seed || 1;
      return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
      };
    },
    setSky() {},
    addControls() {},
  };
}

function meshCount(scene: THREE.Scene): number {
  let count = 0;
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) count += 1;
  });
  return count;
}

test("every mock scene and edit builds a mesh, except the broken seagulls", () => {
  expect(runnableCodes().length).toBeGreaterThanOrEqual(9);
  for (const code of runnableCodes()) {
    const scene = new THREE.Scene();
    executeBuild(code, makeKit(scene));
    expect(meshCount(scene)).toBeGreaterThan(0);
  }
  const scene = new THREE.Scene();
  expect(() => executeBuild(brokenSeagullCode(), makeKit(scene))).toThrow(ReferenceError);
  try {
    executeBuild(brokenSeagullCode(), makeKit(new THREE.Scene()));
  } catch (error) {
    expect(error).toBeInstanceOf(ReferenceError);
    expect(error instanceof Error ? error.message : "").toContain("wingGeo");
  }
  const lighthouse = MOCK_SCENES.find((item) => item.id === "lighthouse");
  expect(lighthouse?.fix?.code.includes("const wingGeo")).toBe(true);
});
