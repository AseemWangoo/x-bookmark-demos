import type { SampleSvg } from "./types"

export function motorSpecSheet(): SampleSvg {
  const width = 1100
  const height = 1400
  const regions = {
    model: { x: 696, y: 343, w: 205, h: 34 },
    rated_power: { x: 696, y: 424, w: 100, h: 34 },
    voltage: { x: 696, y: 505, w: 80, h: 34 },
    current: { x: 696, y: 586, w: 90, h: 34 },
    speed: { x: 696, y: 667, w: 100, h: 34 },
    frequency: { x: 696, y: 748, w: 80, h: 34 },
    ip_rating: { x: 696, y: 829, w: 70, h: 34 },
    insulation_class: { x: 696, y: 910, w: 35, h: 34 },
    efficiency: { x: 696, y: 991, w: 90, h: 34 },
    weight: { x: 696, y: 1072, w: 90, h: 34 },
  }

  const rows = [
    ["MODEL", "ARX-180M-4"],
    ["RATED POWER", "18.5 kW"],
    ["VOLTAGE", "400 V"],
    ["CURRENT", "34.8 A"],
    ["RATED SPEED", "1475 rpm"],
    ["FREQUENCY", "50 Hz"],
    ["PROTECTION", "IP55"],
    ["INSULATION CLASS", "F"],
    ["EFFICIENCY", "92.6 %"],
    ["NET WEIGHT", "138 kg"],
  ]
  const rowSvg = rows
    .map(
      ([label, value], index) => `<g transform="translate(0 ${index * 81})">
        <rect x="112" y="316" width="876" height="81" fill="${index % 2 ? "#f4f6f3" : "#ffffff"}" stroke="#bcc7c2"/>
        <text x="145" y="366" font-size="16" font-weight="700" letter-spacing="1.5">${label}</text>
        <text x="696" y="368" font-size="25" font-weight="700">${value}</text>
      </g>`,
    )
    .join("")

  return {
    width,
    height,
    regions,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="1100" height="1400" fill="#e8ebe6"/>
      <rect x="54" y="44" width="992" height="1312" rx="3" fill="#fbfcf8" stroke="#1f3432" stroke-width="3"/>
      <g font-family="Arial, sans-serif" fill="#1e3331">
        <rect x="84" y="74" width="932" height="178" fill="#234c47"/>
        <text x="112" y="132" fill="#b7e0c9" font-size="15" font-weight="700" letter-spacing="5">ARCWELL MOTION SYSTEMS</text>
        <text x="112" y="188" fill="white" font-size="40" font-weight="700">THREE-PHASE INDUCTION MOTOR</text>
        <text x="112" y="224" fill="#d9e9e1" font-size="16">TECHNICAL DATA · IEC FRAME 180M</text>
        <g transform="translate(860 114)" fill="none" stroke="#b7e0c9" stroke-width="5"><circle cx="45" cy="45" r="39"/><path d="M22 45h46M45 22v46M16 76h58"/></g>
        <text x="112" y="286" font-size="13" fill="#64736f">DOCUMENT AMS-TD-418 · REVISION B · VALUES AT RATED LOAD</text>
        ${rowSvg}
        <rect x="112" y="1150" width="876" height="130" fill="#234c47"/>
        <text x="142" y="1192" fill="#b7e0c9" font-size="13" font-weight="700" letter-spacing="2">OPERATING CONDITIONS</text>
        <text x="142" y="1230" fill="white" font-size="15">Ambient: –20 °C to +40 °C</text>
        <text x="470" y="1230" fill="white" font-size="15">Duty: S1 continuous</text>
        <text x="735" y="1230" fill="white" font-size="15">Mounting: IM B3</text>
        <text x="142" y="1260" fill="#d9e9e1" font-size="12">Values are fictional and generated for interface demonstration.</text>
        <text x="112" y="1324" font-size="11" fill="#7c8985">ARCWELL · MOTOR DATA SHEET · 2026</text>
      </g>
    </svg>`,
  }
}
