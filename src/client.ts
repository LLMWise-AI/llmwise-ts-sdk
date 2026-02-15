import { LLMWiseError } from "./errors.js";
import { authHeaders, normalizeApiBase } from "./util.js";
import type {
  BlendRequest,
  BlendResponse,
  ChatRequest,
  ChatResponse,
  CompareRequest,
  CompareResponse,
  JudgeRequest,
  JudgeResponse,
  StreamEvent,
} from "./types.js";
import { streamSSEJSON } from "./sse.js";

type ClientInit =
  | string
  | {
      apiKey: string;
      baseUrl?: string;
      fetch?: typeof fetch;
      headers?: Record<string, string>;
    };

export class LLMWise {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private extraHeaders: Record<string, string>;

  constructor(init: ClientInit) {
    if (typeof init === "string") {
      this.apiKey = init;
      this.baseUrl = normalizeApiBase(undefined);
      this.fetchImpl = fetch;
      this.extraHeaders = {};
      return;
    }
    this.apiKey = init.apiKey;
    this.baseUrl = normalizeApiBase(init.baseUrl);
    this.fetchImpl = init.fetch || fetch;
    this.extraHeaders = init.headers || {};
  }

  private url(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }

  private async postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const res = await this.fetchImpl(this.url(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let payload: unknown = text;
      let message = `HTTP ${res.status}`;
      try {
        payload = JSON.parse(text);
        if (payload && typeof payload === "object" && (payload as any).error) {
          message = String((payload as any).error);
        }
      } catch {
        if (text) message = text;
      }
      throw new LLMWiseError(message, { status: res.status, payload });
    }

    return (await res.json()) as T;
  }

  async chat(req: Omit<ChatRequest, "stream"> & { signal?: AbortSignal }): Promise<ChatResponse> {
    const { signal, ...payload } = req;
    return await this.postJSON<ChatResponse>("/chat", { ...payload, stream: false }, signal);
  }

  async *chatStream(req: Omit<ChatRequest, "stream"> & { signal?: AbortSignal }): AsyncGenerator<StreamEvent> {
    const { signal, ...payload } = req;
    const res = await this.fetchImpl(this.url("/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
    for await (const ev of streamSSEJSON(res)) {
      yield ev as StreamEvent;
    }
  }

  async compare(req: Omit<CompareRequest, "stream"> & { signal?: AbortSignal }): Promise<CompareResponse> {
    const { signal, ...payload } = req;
    return await this.postJSON<CompareResponse>("/compare", { ...payload, stream: false }, signal);
  }

  async *compareStream(req: Omit<CompareRequest, "stream"> & { signal?: AbortSignal }): AsyncGenerator<StreamEvent> {
    const { signal, ...payload } = req;
    const res = await this.fetchImpl(this.url("/compare"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
    for await (const ev of streamSSEJSON(res)) {
      yield ev as StreamEvent;
    }
  }

  async blend(req: Omit<BlendRequest, "stream"> & { signal?: AbortSignal }): Promise<BlendResponse> {
    const { signal, ...payload } = req;
    return await this.postJSON<BlendResponse>("/blend", { ...payload, stream: false }, signal);
  }

  async *blendStream(req: Omit<BlendRequest, "stream"> & { signal?: AbortSignal }): AsyncGenerator<StreamEvent> {
    const { signal, ...payload } = req;
    const res = await this.fetchImpl(this.url("/blend"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
    for await (const ev of streamSSEJSON(res)) {
      yield ev as StreamEvent;
    }
  }

  async judge(req: Omit<JudgeRequest, "stream"> & { signal?: AbortSignal }): Promise<JudgeResponse> {
    const { signal, ...payload } = req;
    return await this.postJSON<JudgeResponse>("/judge", { ...payload, stream: false }, signal);
  }

  async *judgeStream(req: Omit<JudgeRequest, "stream"> & { signal?: AbortSignal }): AsyncGenerator<StreamEvent> {
    const { signal, ...payload } = req;
    const res = await this.fetchImpl(this.url("/judge"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
    for await (const ev of streamSSEJSON(res)) {
      yield ev as StreamEvent;
    }
  }

  async models(opts?: { signal?: AbortSignal }): Promise<unknown[]> {
    const res = await this.fetchImpl(this.url("/models"), {
      method: "GET",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal: opts?.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMWiseError(text || `HTTP ${res.status}`, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as unknown[];
  }

  async creditsBalance(opts?: { signal?: AbortSignal }): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(this.url("/credits/balance"), {
      method: "GET",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal: opts?.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMWiseError(text || `HTTP ${res.status}`, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as Record<string, unknown>;
  }
}
