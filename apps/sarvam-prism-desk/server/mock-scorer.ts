import { normalizeText } from "../src/lib/text";
import { TEAMS, type TeamId } from "../src/lib/types";
import { choiceConfidence, normalizeWeights, type MockResponse } from "../fixtures/mock-responses";

const TEAM_LEXICON: Record<TeamId, string[]> = {
  payments: [
    "upi",
    "payment",
    "debit",
    "debited",
    "refund",
    "wallet",
    "paisa",
    "kat gaya",
    "kata",
    "पैसा",
    "भुगतान",
    "कट गया",
    "कटले",
    "रिफंड",
    "பிடித்த",
    "கேটেছে",
    "కట్",
    "कटले",
  ],
  technical: [
    "crash",
    "login",
    "otp",
    "bug",
    "update",
    "क्रैश",
    "लॉगिन",
    "செயலிழக்க",
    "உள்நுழை",
    "ক্র্যাশ",
    "క్రాష్",
    "లాగిన్",
    "क्रॅश",
  ],
  account_kyc: [
    "kyc",
    "bank",
    "account",
    "aadhaar",
    "pan",
    "खाता",
    "खाते",
    "बैंक",
    "बँक",
    "கணக்கு",
    "வங்கி",
    "অ্যাকাউন্ট",
    "ব্যাংক",
    "ఖాతా",
    "బ్యాంక్",
  ],
  orders_delivery: [
    "delivery",
    "late",
    "status",
    "shipping",
    "डिलीवरी",
    "लेट",
    "स्टेटस",
    "டெலிவரி",
    "தாமதம்",
    "ডেলিভারি",
    "দেরি",
    "డెలివరీ",
    "ఆలస్యం",
    "डिलिव्हरी",
  ],
  sales: [
    "pricing",
    "seats",
    "college",
    "bulk",
    "quote",
    "सीट",
    "कॉलेज",
    "கல்லூரி",
    "இருக்கை",
    "কলেজ",
    "সিট",
    "కాలేజీ",
    "సీట్ల",
  ],
};

const URGENCY_LEXICON: Record<"0" | "1" | "2" | "3", string[]> = {
  "3": ["takeover", "hacked", "bank details", "changed the bank", "badal", "बदल", "விவர", "বদলে", "మార్చ"],
  "2": ["crash", "otp", "debit", "failed", "kat gaya", "कट गया", "क्रैश", "ক্র্যাশ", "క్రాష్"],
  "1": ["pending", "kyc", "delivery", "late", "status", "पेंडिंग", "लेट", "দেরি", "ఆలస్యం"],
  "0": ["pricing", "seats", "college", "bulk", "प्राइस", "किंमत", "விலை", "ধর"],
};

const ESCALATE_YES = [
  "bank details",
  "takeover",
  "someone else",
  "kisi aur",
  "debit",
  "kat gaya",
  "crash",
  "otp",
  "कट गया",
  "बैंक",
  "बँक",
  "வங்கி",
  "ব্যাংক",
  "బ్యాంక్",
];

const ESCALATE_NO = ["pricing", "delivery", "status", "seats", "college", "bulk", "kyc"];

function hits(text: string, words: string[]): number {
  const hay = text.toLowerCase();
  return words.reduce((count, word) => count + (hay.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function softmax(logits: number[]): number[] {
  const peak = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - peak));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

/** Deterministic keyword heuristic. Same text always returns the same payload. */
export function scoreMessage(text: string): MockResponse {
  const normalized = normalizeText(text);
  const teamLogits = TEAMS.map((team) => hits(normalized, TEAM_LEXICON[team]) * 2.4 + 0.15);
  const teamProbs = softmax(teamLogits);
  const teamWeights = Object.fromEntries(TEAMS.map((team, index) => [team, teamProbs[index] ?? 0]));
  const teamProbabilities = normalizeWeights(teamWeights);
  const choice = Object.entries(teamProbabilities).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
  const pTop = teamProbabilities[choice] ?? 0;

  const urgencyLogits = (["0", "1", "2", "3"] as const).map(
    (level) => hits(normalized, URGENCY_LEXICON[level]) * 2.1 + 0.2,
  );
  const urgencyProbs = softmax(urgencyLogits);
  const urgencyWeights = Object.fromEntries(
    urgencyProbs.map((probability, index) => [String(index), probability]),
  );
  const urgencyProbabilities = normalizeWeights(urgencyWeights);
  const score = Math.round(
    Object.entries(urgencyProbabilities).reduce(
      (total, [index, probability]) => total + Number(index) * probability,
      0,
    ) * 10000,
  ) / 10000;
  const urgencyTop = Math.max(...Object.values(urgencyProbabilities));

  const yesLogit = 0.25 + hits(normalized, ESCALATE_YES) * 1.6;
  const noLogit = 0.85 + hits(normalized, ESCALATE_NO) * 1.5;
  const [pYes] = softmax([yesLogit, noLogit]);

  return {
    model: "sarvam-prism",
    synthetic: true,
    answers: {
      team: {
        type: "choice",
        choice,
        confidence: choiceConfidence(pTop, TEAMS.length),
        probabilities: teamProbabilities,
      },
      urgency: {
        type: "score",
        score,
        confidence: choiceConfidence(urgencyTop, 4),
        legend: { "0": "low", "1": "normal", "2": "high", "3": "critical" },
        probabilities: urgencyProbabilities,
      },
      escalate: { type: "noul", noul: Math.round((pYes ?? 0) * 10000) / 10000 },
    },
    usage: {
      input_tokens: Math.max(48, Math.round(normalized.length / 3) + 80),
      output_tokens: 0,
    },
  };
}
