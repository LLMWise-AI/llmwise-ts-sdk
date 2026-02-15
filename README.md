# LLMWise TypeScript SDK

Lightweight TypeScript client for the LLMWise multi-model API:

- Chat (single model + Auto routing)
- Failover routing (primary + fallback chain)
- Compare (run 2+ models in parallel)
- Blend (synthesize answers from multiple models, supports MoA / Self-MoA)
- Judge (model-vs-model evaluation)
- Full API coverage for conversations, history, credits, usage, keys, memory,
  optimization, and settings.

No heavy dependencies. Works in Node 18+ and modern browsers.

## Install

```bash
npm install llmwise
```

## Quickstart (Chat)

```ts
import { LLMWise } from "llmwise";

const client = new LLMWise("mm_sk_...");

const resp = await client.chat({
  model: "auto",
  messages: [{ role: "user", content: "Write a haiku about failover." }],
});

console.log(resp.content);
```

## Streaming (Chat)

```ts
import { LLMWise } from "llmwise";

const client = new LLMWise("mm_sk_...");

for await (const ev of client.chatStream({
  model: "claude-sonnet-4.5",
  messages: [{ role: "user", content: "Explain recursion to a 10-year-old." }],
})) {
  if (ev.event === "done") {
    console.log("\\nDONE", ev.credits_charged, ev.credits_remaining);
    break;
  }
  if (ev.delta) process.stdout.write(ev.delta);
}
```

## Failover (Chat + Routing)

```ts
import { LLMWise } from "llmwise";

const client = new LLMWise("mm_sk_...");

for await (const ev of client.chatStream({
  model: "claude-sonnet-4.5",
  routing: { fallback: ["gpt-5.2", "gemini-3-flash"], strategy: "rate-limit" },
  messages: [{ role: "user", content: "Summarize this in 3 bullets: ..." }],
})) {
  if (ev.event === "route" || ev.event === "trace") continue;
  if (ev.event === "done") break;
  if (ev.delta) process.stdout.write(ev.delta);
}
```

## Additional API Helpers

- `conversations()`, `getConversation()`, `createConversation()`, `updateConversation()`, `deleteConversation()`
- `history()`, `getHistoryDetail()`
- `creditsWallet()`, `creditsTransactions()`, `creditsPacks()`, `creditsPurchase()`,
  `creditsConfirmCheckout()`, `creditsAutoTopup()`, `creditsBalance()`
- `usageSummary()`, `usageRecent()`
- `keysInfo()`, `keysGenerate()`, `revokeApiKey()`
- `memory()`, `memorySearch()`, `memoryDelete()`, `memoryClear()`
- `optimization*` helpers, including policy/report/evaluate/replay/test suites/regression schedules
- `settings*` helpers, including provider keys, privacy, and copilot state/ask endpoints

## Configure

- Default base URL: `https://llmwise.ai/api/v1`
- Override with: `new LLMWise({ apiKey, baseUrl })`
