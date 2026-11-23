import { describe, expect, test } from "bun:test";

import { HOSTED_BLOCKED, RECORDED_LABEL } from "../shared/copy.ts";
import { endpointHost, isLoopbackBaseUrl, readEnv } from "./env.ts";

const LOOPBACK = [
  "http://127.0.0.1:11434/v1",
  "http://localhost:11434/v1/",
  "http://[::1]:9931/v1",
  "http://127.0.0.1:9931/v1",
];

const REFUSED = [
  "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1",
  "http://example.com/v1",
  "http://127.0.0.1.example.com/v1",
  "http://10.0.0.1:11434/v1",
  "http://0.0.0.0:11434/v1",
  "",
  "not a url",
  "file:///tmp/x",
  "http://127.0.0.1.nip.io/v1",
];

describe("offline allowlist", () => {
  test("accepts only loopback hosts and fails closed", () => {
    for (const url of LOOPBACK) expect(isLoopbackBaseUrl(url)).toBe(true);
    for (const url of REFUSED) expect(isLoopbackBaseUrl(url)).toBe(false);
    expect(isLoopbackBaseUrl(undefined)).toBe(false);
  });

  test("reports the host without userinfo and lights offline only for a live loopback", () => {
    const secret = "super-secret-key";
    const withUser = readEnv({
      LOCAL_LLM_BASE_URL: `http://user:${secret}@127.0.0.1:11434/v1`,
      LOCAL_LLM_API_KEY: secret,
    });
    expect(withUser.endpointHost).toBe("127.0.0.1:11434");
    expect(withUser.endpointHost).not.toContain(secret);
    expect(withUser.offline).toBe(true);
    expect(withUser.mode).toBe("live");

    const hosted = readEnv({
      LOCAL_LLM_BASE_URL: "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1",
      LOCAL_LLM_API_KEY: secret,
    });
    expect(hosted.offline).toBe(false);
    expect(hosted.mode).toBe("hosted-blocked");
    expect(hosted.message).toBe(HOSTED_BLOCKED);

    const recorded = readEnv({ MOCK: "1", LOCAL_LLM_BASE_URL: "http://127.0.0.1:11434/v1" });
    expect(recorded.mode).toBe("mock");
    expect(recorded.offline).toBe(false);
    expect(recorded.recordedLabel).toBe(RECORDED_LABEL);

    const unset = readEnv({});
    expect(unset.mode).toBe("mock");
    expect(unset.offline).toBe(false);
    expect(unset.reasoningEffort).toBe("low");
    expect(endpointHost("http://user:secret@localhost:9931/v1")).toBe("localhost:9931");
  });
});
