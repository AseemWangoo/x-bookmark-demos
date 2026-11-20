import { describe, expect, test } from "bun:test";

import { buildUserContent, stripJsonFence } from "./prompt.ts";
import { callFor } from "./adapter/live.ts";

const png = "data:image/png;base64,aaaa";

describe("prompt and provider fields", () => {
  test("images are image_url parts with detail high, ahead of the numbered thread", () => {
    const content = buildUserContent("line one\nline two", [
      { id: "board", name: "board.png", dataUrl: png },
    ]);
    expect(content[0]).toEqual({
      type: "image_url",
      image_url: { url: png, detail: "high" },
    });
    const text = content[1];
    expect(text?.type).toBe("text");
    if (text?.type !== "text") return;
    expect(text.text).toContain("Image id=board filename=board.png");
    expect(text.text).toContain("1|line one");
    expect(text.text).toContain("2|line two");
  });

  test("fence stripping keeps the JSON object", () => {
    expect(stripJsonFence("```json\n{\"ok\":true}\n```")).toBe('{"ok":true}');
  });

  test("TokenHub and custom send no_think, OpenRouter does not", () => {
    const keys = {
      TOKENHUB_API_KEY: "tokenhub-key",
      OPENROUTER_API_KEY: "router-key",
    };
    const flash = callFor("tokenhub", keys, "no_think");
    expect(flash.extra).toEqual({
      reasoning_effort: "no_think",
      thinking: { type: "disabled" },
    });
    expect(flash.model).toBe("hy4-flash");
    expect(flash.baseURL).toBe("https://tokenhub-intl.tencentcloudmaas.com/v1");
    expect(flash.temperature).toBe(0.2);

    const think = callFor("tokenhub", { TOKENHUB_API_KEY: "tokenhub-key", TOKENHUB_REGION: "guangzhou" }, "high");
    expect(think.extra.reasoning_effort).toBe("high");
    expect(think.baseURL).toBe("https://tokenhub.tencentmaas.com/v1");

    const router = callFor("openrouter", keys, "no_think");
    expect(router.extra).toEqual({ reasoning: { enabled: false } });
    expect(router.model).toBe("tencent/hy4-flash");
    expect(JSON.stringify(router.extra)).not.toContain("no_think");
    expect(JSON.stringify(router.extra)).not.toContain("reasoning_effort");

    const custom = callFor("custom", { ...keys, HY4_FLASH_BASE_URL: "http://127.0.0.1:8000/v1" }, "no_think");
    expect(custom.temperature).toBe(0.9);
    expect(custom.topP).toBe(1);
    expect(custom.extra.chat_template_kwargs).toEqual({ reasoning_effort: "no_think" });
    expect(custom.baseURL).toBe("http://127.0.0.1:8000/v1");
  });
});
