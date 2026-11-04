import { TEAMS, URGENCY_LEVELS } from "../src/lib/types";

const TEAM_CRITERIA: Record<(typeof TEAMS)[number], string> = {
  payments: "UPI, cards, refunds, wallets, or a debit that did not match the order",
  technical: "Crashes, login, OTP, or a bug after an update",
  account_kyc: "KYC, profile, bank-detail changes, or who can access the account",
  orders_delivery: "Order status, shipping, or a late delivery",
  sales: "Pricing, seat counts, or a college or bulk plan",
};

export type DeskQuestions = {
  team: {
    type: "choice";
    instructions: string;
    criteria: typeof TEAM_CRITERIA;
  };
  urgency: {
    type: "score";
    instructions: string;
    criteria: readonly ["low", "normal", "high", "critical"];
  };
  escalate: {
    type: "noul";
    instructions: string;
    criteria: { true: string; false: string };
  };
};

/** The only three questions the desk asks. No extra keys. */
export function deskQuestions(): DeskQuestions {
  return {
    team: {
      type: "choice",
      instructions: "Which support team should own this customer message?",
      criteria: { ...TEAM_CRITERIA },
    },
    urgency: {
      type: "score",
      instructions: "How urgent is this message, from low to critical?",
      criteria: [...URGENCY_LEVELS],
    },
    escalate: {
      type: "noul",
      instructions: "Should a person take this now instead of auto-routing it?",
      criteria: {
        true: "Money is at risk, the account may be taken over, or the customer is blocked right now",
        false: "A status check, a pricing question, or a delay that can wait in queue",
      },
    },
  };
}
