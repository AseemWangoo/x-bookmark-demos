import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";

import { cssColor, type Part, type Shape, type Vec3 } from "../../shared/schema.ts";

export function ExplodeCanvas({
  parts,
  explode,
  selectedId,
  onSelect,
  label,
}: {
  parts: Part[];
  explode: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div className="h-56 overflow-hidden rounded-lg bg-stone-950" data-testid="explode-canvas">
      <Canvas
        camera={{ position: [3.5, 2.35, 3.7], fov: 38 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        aria-label={label}
      >
        <color attach="background" args={["#1c1917"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 3]} intensity={1.35} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[3.4, 48]} />
          <meshStandardMaterial color="#292524" />
        </mesh>
        {parts.map((part) => (
          <PartMesh
            key={part.id}
            part={part}
            explode={explode}
            selected={part.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        <OrbitControls makeDefault enablePan={false} target={[0, 0.45, 0]} maxDistance={9} minDistance={2} />
      </Canvas>
    </div>
  );
}

function PartMesh({
  part,
  explode,
  selected,
  onSelect,
}: {
  part: Part;
  explode: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const position = useMemo(
    () => lerp(asVec(part.assembledPosition), asVec(part.explodedPosition), explode),
    [part.assembledPosition, part.explodedPosition, explode],
  );
  return (
    <mesh
      position={position}
      rotation={asVec(part.rotation)}
      scale={selected ? 1.08 : 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part.id);
      }}
    >
      <PartGeometry shape={part.shape} size={part.size} />
      <meshStandardMaterial
        color={cssColor(part.color)}
        emissive={selected ? "#fff7ed" : "#000000"}
        emissiveIntensity={selected ? 0.45 : 0}
        roughness={0.42}
        metalness={0.12}
      />
    </mesh>
  );
}

function asVec(value: readonly number[]): Vec3 {
  return [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
}

function PartGeometry({ shape, size }: { shape: Shape; size: readonly number[] }) {
  const [x, y, z] = asVec(size).map(clampSize) as Vec3;
  switch (shape) {
    case "box":
      return <boxGeometry args={[x, y, z]} />;
    case "cylinder":
      return <cylinderGeometry args={[x, x, y, 28]} />;
    case "sphere":
      return <sphereGeometry args={[x, 28, 18]} />;
    case "cone":
      return <coneGeometry args={[x, y, 28]} />;
    default: {
      const unknown: never = shape;
      throw new Error(`Unknown shape ${String(unknown)}`);
    }
  }
}

function lerp(from: Vec3, to: Vec3, t: number): Vec3 {
  const mix = clamp01(t);
  return [
    clampAxis(from[0] + (to[0] - from[0]) * mix),
    clampAxis(from[1] + (to[1] - from[1]) * mix),
    clampAxis(from[2] + (to[2] - from[2]) * mix),
  ];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(6, Math.max(-6, value));
}

function clampSize(value: number): number {
  if (!Number.isFinite(value)) return 0.1;
  return Math.min(3, Math.max(0.02, value));
}
