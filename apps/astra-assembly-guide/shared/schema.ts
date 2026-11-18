import { z } from "zod";

export const SHAPES = ["box", "cylinder", "sphere", "cone"] as const;

/** Homogeneous length-3 arrays. Tuples become Draft-07 `items: []`, which strict Structured Outputs reject. */
export const vec3Schema = z.array(z.number()).length(3);

export const partSchema = z.object({
  id: z.string(),
  name: z.string(),
  qty: z.number(),
  description: z.string(),
  color: z.string(),
  shape: z.enum(SHAPES),
  size: vec3Schema,
  rotation: vec3Schema,
  assembledPosition: vec3Schema,
  explodedPosition: vec3Schema,
});

export const stepSchema = z.object({
  n: z.number(),
  title: z.string(),
  instruction: z.string(),
  partIds: z.array(z.string()),
});

export const assemblySchema = z.object({
  title: z.string(),
  summary: z.string(),
  parts: z.array(partSchema).min(1),
  steps: z.array(stepSchema).min(1),
});

export type Shape = (typeof SHAPES)[number];
export type Vec3 = [number, number, number];
export type Part = z.infer<typeof partSchema>;
export type AssemblyStep = z.infer<typeof stepSchema>;
export type Assembly = z.infer<typeof assemblySchema>;

export function cssColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#737373";
}
