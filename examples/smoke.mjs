import { LLMWise } from "../dist/index.js";

const results = [];

function shortRepr(value) {
  if (Array.isArray(value)) {
    return `array(len=${value.length})`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    return `object(keys=${keys.slice(0, 4).join(", ")})`;
  }
  return typeof value;
}

async function run() {
  const apiKey = process.env.LLMWISE_API_KEY;
  if (!apiKey) {
    console.error("Set LLMWISE_API_KEY before running this smoke script.");
    process.exit(1);
  }

  const client = new LLMWise(apiKey);

  const checks = [
    { name: "GET /models", fn: () => client.models() },
    { name: "GET /credits/balance", fn: () => client.creditsBalance() },
    { name: "GET /credits/wallet", fn: () => client.creditsWallet() },
    { name: "GET /usage/summary", fn: () => client.usageSummary({ days: 1 }) },
    { name: "GET /usage/recent", fn: () => client.usageRecent({ limit: 3, days: 1 }) },
    { name: "GET /conversations", fn: () => client.conversations({ limit: 3, offset: 0 }) },
    { name: "GET /history", fn: () => client.history({ limit: 3, offset: 0 }) },
    { name: "GET /keys/info", fn: () => client.keysInfo() },
    { name: "GET /memory", fn: () => client.memory({ limit: 3 }) },
    { name: "GET /memory/search", fn: () => client.memorySearch({ q: "platform", top_k: 2 }) },
    { name: "GET /optimization/policy", fn: () => client.optimizationPolicy() },
    { name: "GET /optimization/report", fn: () => client.optimizationReport({ goal: "balanced", days: 1 }) },
    { name: "GET /settings/keys", fn: () => client.settingsKeys() },
    { name: "GET /settings/privacy", fn: () => client.settingsPrivacy() },
    { name: "GET /settings/copilot", fn: () => client.settingsCopilotState() },
  ];

  let failed = 0;
  for (const check of checks) {
    try {
      const value = await check.fn();
      results.push({ name: check.name, ok: true, detail: shortRepr(value) });
    } catch (err) {
      failed += 1;
      results.push({ name: check.name, ok: false, detail: err?.message || String(err) });
    }
  }

  for (const item of results) {
    console.log(`${item.ok ? "✅" : "❌"} ${item.name}: ${item.detail}`);
  }

  console.log(`Smoke checks complete. failed=${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

await run();
