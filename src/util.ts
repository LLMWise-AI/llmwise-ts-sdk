export function normalizeApiBase(baseUrl?: string): string {
  const raw = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!raw) return "https://llmwise.ai/api/v1";
  if (raw.endsWith("/api/v1")) return raw;
  return `${raw}/api/v1`;
}

export function authHeaders(apiKey?: string): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}
