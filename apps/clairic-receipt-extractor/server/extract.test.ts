import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { listFixtures } from "./catalog.ts";
import { handleExtract, handleMode } from "./extract.ts";
import { HttpError } from "./schema.ts";

const secretAccount = "acct_secret_id_should_not_leak";
const secretToken = "tok_secret_value_should_not_leak";

test("sample extract never reads credentials or calls fetch", async () => {
  const receipt = listFixtures().find((fixture) => fixture.id === "receipt-coffee");
  if (!receipt) throw new Error("missing receipt");
  let credentialReads = 0;
  let fetches = 0;
  const response = await handleExtract(
    {
      source: receipt.source,
      fields: [
        ...receipt.presetFields,
        { name: "notes", type: "text", instructions: "Anything else" },
      ],
      compare: true,
      fixtureId: receipt.id,
      forceSample: true,
    },
    {
      readCredentials: () => {
        credentialReads += 1;
        return { accountId: secretAccount, token: secretToken };
      },
      fetchImpl: (async () => {
        fetches += 1;
        throw new Error("network");
      }) as unknown as typeof fetch,
      sleep: async () => {},
    },
  );

  expect(credentialReads).toBe(0);
  expect(fetches).toBe(0);
  const encoded = JSON.stringify(response);
  expect(encoded).not.toContain(secretAccount);
  expect(encoded).not.toContain(secretToken);
  expect(response.mode).toBe("sample");
  expect(response.clairic.synthetic).toBe(true);
  expect(response.llm?.synthetic).toBe(true);
  const merchant = response.clairic.answers.merchant;
  expect(merchant).toMatchObject({ type: "text", value: "BLUE BOTTLE COFFEE" });
  expect(response.clairic.answers.notes).toEqual({
    recorded: false,
    message: "not recorded: switch to live mode",
  });
  expect(response.clairic.answers.loyalty_id).toMatchObject({ value: null });
  expect(response.clairic.costUsd).toBeGreaterThan(0);
  if (response.clairic.usage && "output_tokens" in response.clairic.usage) {
    expect(response.clairic.usage.output_tokens).toBe(0);
  }
});

test("mode payload never returns cloudflare secrets", () => {
  const previousAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_ACCOUNT_ID = secretAccount;
  process.env.CLOUDFLARE_API_TOKEN = secretToken;
  try {
    const live = handleMode();
    expect(live).toEqual({ mode: "live" });
    expect(JSON.stringify(live)).not.toContain(secretAccount);
    expect(JSON.stringify(live)).not.toContain(secretToken);
  } finally {
    restore("CLOUDFLARE_ACCOUNT_ID", previousAccount);
    restore("CLOUDFLARE_API_TOKEN", previousToken);
  }
  expect(handleMode()).toEqual({ mode: "sample" });
});

test("sample module does not touch process env", () => {
  const source = readFileSync(new URL("./sample.ts", import.meta.url), "utf8");
  expect(source).not.toContain("process.env");
  expect(source).not.toContain("CLOUDFLARE_");
});

test("live upstream errors are readable and scrub secrets", async () => {
  const error = await handleExtract(
    {
      source: "Invoice INV-2291",
      fields: [{ name: "merchant", type: "text" }],
      compare: false,
    },
    {
      readCredentials: () => ({ accountId: secretAccount, token: secretToken }),
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: `authentication failed for ${secretToken}` }],
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        )) as unknown as typeof fetch,
      sleep: async () => {},
    },
  ).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(HttpError);
  if (!(error instanceof HttpError)) return;
  expect(error.status).toBe(401);
  expect(error.message).toContain("authentication failed");
  expect(error.message).not.toContain(secretToken);
  expect(error.message).toContain("[redacted]");
  expect(error.message).not.toContain(secretAccount);
});

test("extract rejects an empty field list", async () => {
  await expect(
    handleExtract({ source: "hello", fields: [], compare: false, forceSample: true }),
  ).rejects.toBeInstanceOf(HttpError);
});

function restore(key: "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN", value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
