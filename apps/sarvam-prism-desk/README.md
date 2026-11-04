# Sarvam Prism Desk

A one-screen support desk that routes a customer message as you type. One request asks Sarvam Prism three questions — team, urgency, escalate — and the desk shows calibrated probabilities, an auto-route vs human-review verdict, latency against Sarvam’s 44 ms claim, and the rupee cost.

Source bookmark: [Sarvam Prism, @SarvamAI](https://x.com/SarvamAI/status/2117621415520448838).

## Run

```bash
cd apps/sarvam-prism-desk
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No `SARVAM_API_KEY` is set in this build, so the desk starts in **mock mode**. Mock mode is the whole demo: hand-written synthetic fixtures for six presets in seven languages, a deterministic keyword heuristic for anything you type freely, and synthetic latency. The badge and banner say so. Nothing calls `api.sarvam.ai`.

Live mode is untested here because no key was available. To try it:

```bash
SARVAM_API_KEY=... bun run dev
```

The key stays on the server (`api-subscription-key` header only). `GET /api/mode` returns `{ mode, model, autoThreshold }` and never the key.

## What Prism is

Prism is a decision model, not a chat model. `POST https://api.sarvam.ai/v2/systemone` with model `sarvam-prism` takes a `state` and a map of typed questions and returns a probability for every option. `usage.output_tokens` is always 0.

Verified against the docs on 2026-11-04:

- [Model page](https://docs.sarvam.ai/api/token-factory/models/sarvam-prism)
- [Decide (systemone)](https://docs.sarvam.ai/api-reference/decisions/systemone)
- [Decisions guide](https://docs.sarvam.ai/api/token-factory/decisions-api)

Auth header is `api-subscription-key`. The model id is case-sensitive. A question may only contain `type`, `instructions`, and `criteria`. This desk asks:

| id | type | options |
| --- | --- | --- |
| `team` | `choice` | payments, technical, account_kyc, orders_delivery, sales |
| `urgency` | `score` | low, normal, high, critical |
| `escalate` | `noul` | true / false |

`noul` is P(yes). For a choice, `confidence` is `(p_top − 1/n) / (1 − 1/n)`, not a probability. The verdict thresholds **p_top** (default 0.9), which is the pattern in the docs. Preset 5 (account takeover) stays under 0.9 in every language, so it lands on Human review.

## Claims vs measured

Sarvam’s published figures, shown in the UI as claims: average 71.8, Indian-language benchmark 82.5, median 44 ms and p95 420 ms on one NVIDIA B200 (1,000 serial requests). That 44 ms is model time on a local GPU. The meter shows the server round trip and the browser end-to-end time next to a 44 ms marker. In mock mode those milliseconds are **synthetic**.

Pricing is ₹4 per 1M input tokens and ₹0 output ([source](https://docs.sarvam.ai/api/token-factory/models/sarvam-prism)). The cost line uses that rate.

## Open weights

[`sarvamai/prism`](https://huggingface.co/sarvamai/prism) is Apache-2.0, about 106 GB, and needs one FP8 GPU with ~120 GB. This app does not download the weights. The self-hosted `prism.py` output (`yes_no`, score `level`) differs from the hosted shape (`noul`, `legend`, `confidence`). The adapter targets the hosted shape only.

## SDK

`server/prism.ts` calls the REST endpoint with `fetch`. `sarvamai` gained `client.decisions.create` in 1.1.15 (2026-11-03) and `sarvam-ai-sdk` 0.4.7 adds an experimental decision model. Both are inside the repo’s 3-day `minimumReleaseAge`, so they are not dependencies. Swapping the adapter for `sarvamai` ≥ 1.1.15 later is a one-file change.

Optional live translation uses `POST /translate` (`mayura:v1`, `source_language_code: "auto"`). It is untested without a key. Hinglish is not a Mayura target code.

## Env

| var | default | |
| --- | --- | --- |
| `SARVAM_API_KEY` | unset | set for live; unset for mock |
| `PRISM_MODEL` | `sarvam-prism` | |
| `SARVAM_BASE_URL` | `https://api.sarvam.ai` | |
| `MOCK` | unset | `1` forces mock even with a key |
| `MOCK_SPEED` | `1` | divides synthetic latency |
| `AUTO_THRESHOLD` | `0.9` | initial slider value |
| `PORT` | `8787` | API port |

## Scripts

```bash
bun test
bun run build
bun run capture   # media/screenshot.png and media/demo.mp4, mock mode
```
