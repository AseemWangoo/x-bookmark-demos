import type { PortRequest, PortResult, PortSourceKind } from "../../shared/port.ts";

export type PortAdapter = {
  mode: PortSourceKind;
  model: string;
  port(request: PortRequest): Promise<PortResult>;
};
