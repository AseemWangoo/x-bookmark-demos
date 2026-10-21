import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { listFixtures } from "../server/catalog.ts";
import { runClairic } from "../server/clairic.ts";
import { readCredentials } from "../server/env.ts";
import { runLlm } from "../server/llm.ts";

const credentials = readCredentials();
if (!credentials) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to re-record fixtures.");
  process.exit(1);
}

const fixturesDir = join(import.meta.dir, "../fixtures");

for (const fixture of listFixtures()) {
  const clairic = await runClairic(credentials, fixture.source, fixture.presetFields);
  writeFileSync(
    join(fixturesDir, `${fixture.id}.clairic.json`),
    `${JSON.stringify(toFile(clairic), null, 2)}\n`,
  );
  const llm = await runLlm(credentials, fixture.source, fixture.presetFields);
  writeFileSync(
    join(fixturesDir, `${fixture.id}.llm.json`),
    `${JSON.stringify(toFile(llm), null, 2)}\n`,
  );
  console.log(`recorded ${fixture.id}`);
}

function toFile(run: {
  model: string;
  answers: unknown;
  usage: unknown;
  latencyMs: number;
  truncated?: boolean;
}) {
  return {
    latencyMs: run.latencyMs,
    model: run.model,
    truncated: run.truncated ?? false,
    usage: run.usage,
    answers: run.answers,
  };
}
