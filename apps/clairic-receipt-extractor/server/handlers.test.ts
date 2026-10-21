import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { POST as postExtract } from "../api/extract.ts";
import { GET as getFixtures } from "../api/fixtures.ts";
import { GET as getMode } from "../api/mode.ts";
import {
  bankTransactionsSource,
  emailDamagedOrderSource,
  invoiceNorthwindSource,
  receiptCoffeeSource,
} from "../fixtures/sources.ts";
import { UNRECORDED } from "../src/lib/types.ts";

const files: Record<string, string> = {
  "receipt-coffee.txt": receiptCoffeeSource,
  "invoice-northwind.txt": invoiceNorthwindSource,
  "email-damaged-order.txt": emailDamagedOrderSource,
  "bank-transactions-messy.txt": bankTransactionsSource,
};

test("embedded fixture text matches the txt files", () => {
  for (const [name, embedded] of Object.entries(files)) {
    const onDisk = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
    expect(onDisk, name).toBe(embedded);
  }
});

test("catalog and sample do not read fixtures from disk", () => {
  for (const name of ["catalog.ts", "sample.ts", "fixture-data.ts"]) {
    const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
    expect(source, name).not.toContain("readFileSync");
    expect(source, name).not.toContain("import.meta.dir");
    expect(source, name).not.toContain("Bun.");
  }
  for (const name of ["mode.ts", "fixtures.ts", "extract.ts"]) {
    const source = readFileSync(new URL(`../api/${name}`, import.meta.url), "utf8");
    expect(source, name).not.toContain("server/index.ts");
    expect(source, name).not.toContain("Bun.");
  }
});

test("node handlers serve sample mode with no env", async () => {
  const previous = {
    account: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    auth: process.env.CLOUDFLARE_AUTH_TOKEN,
  };
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_AUTH_TOKEN;
  try {
    expect(await (await getMode()).json()).toEqual({ mode: "sample" });

    const fixtures = (await (await getFixtures()).json()) as Array<{ id: string; source: string }>;
    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      "receipt-coffee",
      "invoice-northwind",
      "email-damaged-order",
      "bank-transactions-messy",
    ]);
    expect(fixtures[0]?.source).toBe(receiptCoffeeSource);

    const response = await postExtract(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: receiptCoffeeSource,
          fixtureId: "receipt-coffee",
          compare: true,
          fields: [
            { name: "merchant", type: "text" },
            { name: "notes", type: "text" },
          ],
        }),
      }),
    );
    const body = (await response.json()) as {
      mode: string;
      clairic: {
        synthetic?: boolean;
        latencyMs: number;
        answers: Record<string, { value?: string } | typeof UNRECORDED>;
      };
      llm?: { answers: Record<string, { value?: string }> };
    };
    expect(response.status).toBe(200);
    expect(body.mode).toBe("sample");
    expect(body.clairic.synthetic).toBe(true);
    expect(body.clairic.latencyMs).toBe(186);
    expect(body.clairic.answers.merchant).toMatchObject({ value: "BLUE BOTTLE COFFEE" });
    expect(body.clairic.answers.notes).toEqual(UNRECORDED);
    expect(body.llm?.answers.merchant).toMatchObject({ value: "BLUE BOTTLE COFFEE" });
    expect(JSON.stringify(body)).not.toContain("CLOUDFLARE_");
  } finally {
    restore("CLOUDFLARE_ACCOUNT_ID", previous.account);
    restore("CLOUDFLARE_API_TOKEN", previous.token);
    restore("CLOUDFLARE_AUTH_TOKEN", previous.auth);
  }
});

test("extract rejects invalid json", async () => {
  const response = await postExtract(
    new Request("http://localhost/api/extract", {
      method: "POST",
      body: "not-json",
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "Invalid JSON" });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
