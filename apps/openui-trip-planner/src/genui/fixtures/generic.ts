import { jaipurOpenUI } from "./jaipur.oui.ts";

const DAY_PATTERN = /(\d+)\s*days?/i;
const CITY_PATTERN = /\bin\s+([A-Za-z][A-Za-z .'-]{1,48})/;

const SLOTS = [
  { time: "09:00", activity: "Old town walk", area: "Center", cost: 0 },
  { time: "13:00", activity: "Market lunch", area: "Market", cost: 28 },
  { time: "16:00", activity: "Museum stop", area: "Museum quarter", cost: 18 },
] as const;

export function parseTripRequest(prompt: string): { city: string; days: number } {
  const dayMatch = DAY_PATTERN.exec(prompt);
  const parsedDays = dayMatch ? Number(dayMatch[1]) : 2;
  const days = Number.isFinite(parsedDays)
    ? Math.min(7, Math.max(1, Math.trunc(parsedDays)))
    : 2;

  const cityMatch = CITY_PATTERN.exec(prompt);
  const raw = (cityMatch?.[1] ?? "Lisbon").replace(/[?.!,]+$/g, "").trim();
  const city = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return { city: city || "Lisbon", days };
}

function quote(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function currencyFor(city: string): string {
  const key = city.toLowerCase();
  if (key === "jaipur" || key === "delhi" || key === "udaipur") return "INR";
  if (key === "kyoto" || key === "tokyo" || key === "osaka") return "JPY";
  if (key === "lisbon" || key === "porto" || key === "paris" || key === "rome") {
    return "EUR";
  }
  return "USD";
}

export function genericOpenUI(city: string, days: number): string {
  const safeCity = quote(city);
  const currency = currencyFor(city);
  const lines = [
    `root = TripPlan("${safeCity} in ${days} days", [card, days, budget, book])`,
    `card = ItineraryCard("${safeCity}", ${days}, "A loose ${days}-day loop through the center, a market, and one museum, with room to wander.", ["Old town", "Market", "Museum"])`,
    `days = DayTable([${Array.from({ length: days * SLOTS.length }, (_, index) => `row${index + 1}`).join(", ")}])`,
  ];

  let rowIndex = 1;
  for (let day = 1; day <= days; day += 1) {
    for (const slot of SLOTS) {
      lines.push(
        `row${rowIndex} = {day: "Day ${day}", time: "${slot.time}", activity: "${quote(slot.activity)}", area: "${quote(slot.area)}", cost: ${slot.cost}}`,
      );
      rowIndex += 1;
    }
  }

  const perDay = currency === "JPY" ? 14000 : currency === "EUR" ? 140 : 160;
  const stay = perDay * days;
  const food = Math.round(perDay * 0.45) * days;
  const sights = Math.round(perDay * 0.25) * days;
  const transport = Math.round(perDay * 0.2) * days;
  const total = stay + food + sights + transport;

  lines.push(
    `budget = BudgetChart([stay, food, sights, transport], "${currency}")`,
    `stay = {category: "Stay", amount: ${stay}}`,
    `food = {category: "Food", amount: ${food}}`,
    `sights = {category: "Sights", amount: ${sights}}`,
    `transport = {category: "Transport", amount: ${transport}}`,
    `book = BookButton("Book this trip", @BookTrip("${safeCity}", ${days}, ${total}))`,
  );

  return `${lines.join("\n")}\n`;
}

export function programForPrompt(prompt: string): string {
  if (/\bjaipur\b/i.test(prompt)) return jaipurOpenUI;
  const { city, days } = parseTripRequest(prompt);
  return genericOpenUI(city, days);
}
