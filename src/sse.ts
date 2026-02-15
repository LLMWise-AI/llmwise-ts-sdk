import { LLMWiseError } from "./errors.js";

async function parseErrorPayload(res: Response): Promise<{ message: string; payload?: unknown }> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && "error" in json) {
      const msg = String((json as any).error || "Request failed");
      return { message: msg, payload: json };
    }
    return { message: "Request failed", payload: json };
  } catch {
    return { message: text || "Request failed", payload: text || undefined };
  }
}

export async function* streamSSEJSON(res: Response): AsyncGenerator<Record<string, any>> {
  if (!res.ok) {
    const err = await parseErrorPayload(res);
    throw new LLMWiseError(err.message, { status: res.status, payload: err.payload });
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new LLMWiseError("No response body", { status: 502 });
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") return;

      try {
        yield JSON.parse(data);
      } catch {
        // Ignore malformed JSON chunks
      }
    }
  }
}

