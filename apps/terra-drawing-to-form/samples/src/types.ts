export interface Region {
  x: number
  y: number
  w: number
  h: number
}

export interface SampleSvg {
  svg: string
  width: number
  height: number
  regions: Record<string, Region>
}
