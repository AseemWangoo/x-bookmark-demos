import type { SampleSvg } from "./types"

export function bracketDrawing(): SampleSvg {
  const width = 1400
  const height = 900
  const regions = {
    part_no: { x: 1035, y: 690, w: 150, h: 30 },
    title: { x: 1035, y: 748, w: 220, h: 30 },
    material: { x: 1035, y: 806, w: 110, h: 26 },
    finish: { x: 1200, y: 806, w: 120, h: 26 },
    scale: { x: 1035, y: 850, w: 52, h: 24 },
    drawn_by: { x: 1130, y: 850, w: 55, h: 24 },
    date: { x: 1205, y: 850, w: 105, h: 24 },
    revision: { x: 1318, y: 690, w: 32, h: 30 },
    sheet: { x: 1318, y: 748, w: 38, h: 30 },
    overall_length: { x: 438, y: 700, w: 84, h: 34 },
    overall_height: { x: 84, y: 366, w: 74, h: 34 },
    thickness: { x: 915, y: 536, w: 55, h: 32 },
    hole_diameter: { x: 432, y: 320, w: 88, h: 34 },
    hole_count: { x: 422, y: 278, w: 28, h: 28 },
    general_tolerance: { x: 780, y: 848, w: 103, h: 24 },
  }

  return {
    width,
    height,
    regions,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#cad8d8" stroke-width=".7"/></pattern>
        <filter id="paper"><feTurbulence baseFrequency=".8" numOctaves="2" seed="8" result="n"/><feBlend in="SourceGraphic" in2="n" mode="multiply"/></filter>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M8 0 0 4l8 4z" fill="#23343b"/></marker>
      </defs>
      <rect width="1400" height="900" fill="#f5f4eb"/>
      <rect x="32" y="32" width="1336" height="836" fill="url(#grid)" stroke="#23343b" stroke-width="3"/>
      <g font-family="Arial, sans-serif" fill="#23343b" stroke="#23343b">
        <text x="55" y="76" font-size="22" font-weight="700" stroke="none">NORTHLINE FABRICATION · ENGINEERING DRAWING</text>
        <text x="55" y="104" font-size="13" letter-spacing="3" stroke="none">ALL DIMENSIONS IN MILLIMETRES</text>
        <g fill="none" stroke-width="5">
          <path d="M260 570V210h190v255h390v105z"/>
          <path d="M300 530V250h110v255h390v25z" stroke-width="2"/>
          <circle cx="355" cy="328" r="34"/><circle cx="355" cy="452" r="34"/>
          <circle cx="570" cy="518" r="26"/><circle cx="720" cy="518" r="26"/>
        </g>
        <g fill="none" stroke-width="1.5">
          <path d="M240 620v80M860 620v80M260 680h580" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
          <path d="M205 210h-80M205 570h-80M145 230v320" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
          <path d="M355 328 430 328"/><path d="M430 328h115"/>
          <path d="M800 480h155v38"/><path d="M840 570h115v-40"/>
          <path d="M355 390V250M285 328h140" stroke-dasharray="8 5"/>
          <path d="M570 470v96M520 518h100M720 470v96M670 518h100" stroke-dasharray="8 5"/>
        </g>
        <g stroke="none" font-size="28" font-weight="700">
          <text x="438" y="724">620</text><text x="84" y="392" transform="rotate(-90 84 392)">360</text>
          <text x="432" y="346">Ø 68</text><text x="422" y="300">2X</text><text x="915" y="560">12</text>
        </g>
        <g stroke="none" font-size="13">
          <text x="865" y="460">PLATE THICKNESS</text><text x="455" y="316">THRU HOLES</text>
        </g>
        <g fill="#f5f4eb" stroke-width="2">
          <rect x="760" y="655" width="608" height="213"/>
          <path d="M1010 655v213M1190 655v213M1305 655v213M760 790h608M1010 732h358M1010 790h358M1010 835h358"/>
        </g>
        <g stroke="none" font-size="11" font-weight="700" letter-spacing="1">
          <text x="780" y="680">GENERAL NOTES</text><text x="1025" y="675">PART NO.</text><text x="1315" y="675">REV</text>
          <text x="1025" y="735">TITLE</text><text x="1315" y="735">SHEET</text>
          <text x="1025" y="803">MATERIAL</text><text x="1198" y="803">FINISH</text>
          <text x="1025" y="848">SCALE</text><text x="1125" y="848">DRAWN</text><text x="1200" y="848">DATE</text>
        </g>
        <g stroke="none" font-size="20" font-weight="700">
          <text x="1035" y="716">NF-1042-B</text><text x="1318" y="716">C</text>
          <text x="1035" y="774">L-BRACKET</text><text x="1318" y="774">1/1</text>
          <text x="1035" y="827" font-size="17">AL 6061</text><text x="1200" y="827" font-size="17">ANODIZE</text>
          <text x="1035" y="870" font-size="16">1:2</text><text x="1130" y="870" font-size="16">M. K.</text><text x="1205" y="870" font-size="16">2026-10-14</text>
          <text x="780" y="866" font-size="16">±0.20</text>
        </g>
        <g stroke="none" font-size="14"><text x="780" y="706">1. DEBURR ALL EDGES</text><text x="780" y="730">2. BREAK SHARP CORNERS</text><text x="780" y="754">3. TOLERANCE:</text></g>
      </g>
    </svg>`,
  }
}
