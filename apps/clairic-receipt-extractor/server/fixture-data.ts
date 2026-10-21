import {
  bankTransactionsSource,
  emailDamagedOrderSource,
  invoiceNorthwindSource,
  receiptCoffeeSource,
} from "../fixtures/sources.ts";
import bankClairic from "../fixtures/bank-transactions-messy.clairic.json" with { type: "json" };
import bankLlm from "../fixtures/bank-transactions-messy.llm.json" with { type: "json" };
import emailClairic from "../fixtures/email-damaged-order.clairic.json" with { type: "json" };
import emailLlm from "../fixtures/email-damaged-order.llm.json" with { type: "json" };
import invoiceClairic from "../fixtures/invoice-northwind.clairic.json" with { type: "json" };
import invoiceLlm from "../fixtures/invoice-northwind.llm.json" with { type: "json" };
import receiptClairic from "../fixtures/receipt-coffee.clairic.json" with { type: "json" };
import receiptLlm from "../fixtures/receipt-coffee.llm.json" with { type: "json" };

export const fixtureSources: Record<string, string> = {
  "receipt-coffee": receiptCoffeeSource,
  "invoice-northwind": invoiceNorthwindSource,
  "email-damaged-order": emailDamagedOrderSource,
  "bank-transactions-messy": bankTransactionsSource,
};

export type FixtureRecordingFile = {
  synthetic?: boolean;
  latencyMs: number;
  model: string;
  truncated?: boolean;
  usage: {
    input_tokens: number;
    output_tokens: number;
    state_tokens?: number;
    image_tokens?: number;
    schema_tokens?: number;
    passes?: number;
  };
  answers: Record<string, unknown>;
};

function recording(value: object): FixtureRecordingFile {
  return value as FixtureRecordingFile;
}

export const fixtureRecordings: Record<
  string,
  { clairic: FixtureRecordingFile; llm: FixtureRecordingFile }
> = {
  "receipt-coffee": {
    clairic: recording(receiptClairic),
    llm: recording(receiptLlm),
  },
  "invoice-northwind": {
    clairic: recording(invoiceClairic),
    llm: recording(invoiceLlm),
  },
  "email-damaged-order": {
    clairic: recording(emailClairic),
    llm: recording(emailLlm),
  },
  "bank-transactions-messy": {
    clairic: recording(bankClairic),
    llm: recording(bankLlm),
  },
};
