import type { SampleSvg } from "./types"

export function serviceRequestForm(): SampleSvg {
  const width = 1100
  const height = 1400
  const regions = {
    request_id: { x: 792, y: 116, w: 180, h: 34 },
    request_date: { x: 790, y: 178, w: 180, h: 34 },
    requester: { x: 245, y: 300, w: 220, h: 40 },
    department: { x: 705, y: 300, w: 180, h: 40 },
    equipment_id: { x: 245, y: 398, w: 190, h: 40 },
    equipment_type: { x: 705, y: 398, w: 180, h: 40 },
    priority: { x: 160, y: 540, w: 250, h: 38 },
    out_of_service: { x: 714, y: 540, w: 36, h: 36 },
    issue: { x: 105, y: 718, w: 820, h: 88 },
    location: { x: 245, y: 885, w: 290, h: 40 },
    contact_phone: { x: 705, y: 885, w: 210, h: 40 },
    signature: { x: 248, y: 1085, w: 260, h: 48 },
  }

  return {
    width,
    height,
    regions,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="screen"/></filter></defs>
      <rect width="1100" height="1400" fill="#eee9dc"/>
      <g transform="rotate(-.3 550 700)">
        <rect x="58" y="48" width="984" height="1304" rx="4" fill="#fffdf7" stroke="#29373b" stroke-width="3"/>
        <g font-family="Arial, sans-serif" fill="#253237">
          <rect x="82" y="76" width="936" height="130" fill="#163f46"/>
          <text x="110" y="130" fill="#fff" font-size="34" font-weight="700">CEDAR WORKS</text>
          <text x="110" y="168" fill="#9dd5cc" font-size="19" letter-spacing="4">EQUIPMENT SERVICE REQUEST</text>
          <text x="700" y="112" fill="#fff" font-size="13" font-weight="700">REQUEST ID</text>
          <text x="792" y="143" fill="#fff" font-family="cursive" font-size="25">SR-2684</text>
          <text x="700" y="177" fill="#fff" font-size="13" font-weight="700">DATE</text>
          <text x="790" y="202" fill="#fff" font-family="cursive" font-size="24">10/30/2026</text>
          <g font-size="12" font-weight="700" letter-spacing="1.5">
            <text x="104" y="275">REQUESTED BY</text><text x="590" y="275">DEPARTMENT</text>
            <text x="104" y="372">EQUIPMENT ID</text><text x="590" y="372">EQUIPMENT TYPE</text>
            <text x="104" y="508">PRIORITY</text><text x="590" y="508">OUT OF SERVICE?</text>
            <text x="104" y="670">DESCRIBE THE ISSUE</text><text x="104" y="860">LOCATION</text>
            <text x="590" y="860">CONTACT PHONE</text><text x="104" y="1050">REQUESTER SIGNATURE</text>
          </g>
          <g fill="none" stroke="#6f797c" stroke-width="1.5">
            <path d="M104 342h390M590 342h390M104 440h390M590 440h390"/>
            <rect x="104" y="696" width="876" height="125" rx="4"/>
            <path d="M104 930h430M590 930h390M104 1145h430"/>
            <rect x="132" y="528" width="30" height="30"/><rect x="260" y="528" width="30" height="30"/><rect x="395" y="528" width="30" height="30"/>
            <rect x="710" y="528" width="30" height="30"/><rect x="830" y="528" width="30" height="30"/>
          </g>
          <g font-size="18"><text x="172" y="552">Routine</text><text x="300" y="552">Urgent</text><text x="435" y="552">Emergency</text><text x="750" y="552">Yes</text><text x="870" y="552">No</text></g>
          <g font-family="cursive" fill="#244f6d" font-size="27">
            <text x="245" y="330">Jamie Rivers</text><text x="705" y="330">Packaging</text>
            <text x="245" y="428">PKG-CV-07</text><text x="705" y="428">Conveyor</text>
            <text x="245" y="915">Line 2 · Bay C</text>
            <text x="110" y="748">Drive motor intermittently stalls under load.</text><text x="110" y="790">Noise near gearbox after restart.</text>
            <text x="248" y="1123" font-size="32" font-style="italic">J. Rivers</text>
          </g>
          <path d="M267 533l9 16 26-34" fill="none" stroke="#244f6d" stroke-width="5" stroke-linecap="round"/>
          <path d="M715 533l9 16 26-34" fill="none" stroke="#244f6d" stroke-width="5" stroke-linecap="round"/>
          <g opacity=".7" filter="url(#rough)"><ellipse cx="799" cy="902" rx="95" ry="25" fill="#889195"/><text x="705" y="914" fill="#243a4a" font-family="cursive" font-size="27">555-01?4</text></g>
          <rect x="82" y="1200" width="936" height="114" fill="#edf1ee"/>
          <text x="106" y="1240" font-size="13" font-weight="700">FOR MAINTENANCE USE</text>
          <text x="106" y="1274" font-size="13">Assigned technician: ____________________</text>
          <text x="600" y="1274" font-size="13">Completion date: ____________________</text>
          <text x="106" y="1332" font-size="11" fill="#687275">Fictional sample · generated for interface demonstration</text>
        </g>
      </g>
    </svg>`,
  }
}
