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

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestSignal = { signal?: AbortSignal };
type PaginationParams = { limit?: number; offset?: number };

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

  private buildQuery(path: string, params?: QueryParams): string {
    if (!params) return path;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    if (!query) return path;
    return `${path}${path.includes("?") ? "&" : "?"}${query}`;
  }

  private async getJSON<T>(path: string, args?: { params?: QueryParams; signal?: AbortSignal }): Promise<T> {
    const signal = args?.signal;
    const res = await this.fetchImpl(this.url(this.buildQuery(path, args?.params)), {
      method: "GET",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMWiseError(text || `HTTP ${res.status}`, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as T;
  }

  private async getText(path: string, args?: { params?: QueryParams; signal?: AbortSignal }): Promise<string> {
    const signal = args?.signal;
    const res = await this.fetchImpl(this.url(this.buildQuery(path, args?.params)), {
      method: "GET",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMWiseError(text || `HTTP ${res.status}`, { status: res.status, payload: text || undefined });
    }
    return await res.text();
  }

  private async putJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const res = await this.fetchImpl(this.url(path), {
      method: "PUT",
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
      let message = text || `HTTP ${res.status}`;
      try {
        const payload = JSON.parse(text);
        if (payload && typeof payload === "object" && (payload as any).error) {
          message = String((payload as any).error);
        }
      } catch {
        if (text) message = text;
      }
      throw new LLMWiseError(message, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as T;
  }

  private async deleteJSON<T>(path: string, args?: { params?: QueryParams; signal?: AbortSignal }): Promise<T> {
    const signal = args?.signal;
    const res = await this.fetchImpl(this.url(this.buildQuery(path, args?.params)), {
      method: "DELETE",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = text || `HTTP ${res.status}`;
      try {
        const payload = JSON.parse(text);
        if (payload && typeof payload === "object" && (payload as any).error) {
          message = String((payload as any).error);
        }
      } catch {
        if (text) message = text;
      }
      throw new LLMWiseError(message, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as T;
  }

  private async patchJSON<T>(path: string, args?: { params?: QueryParams; signal?: AbortSignal }): Promise<T> {
    const signal = args?.signal;
    const res = await this.fetchImpl(this.url(this.buildQuery(path, args?.params)), {
      method: "PATCH",
      headers: {
        ...authHeaders(this.apiKey),
        ...this.extraHeaders,
      },
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = text || `HTTP ${res.status}`;
      try {
        const payload = JSON.parse(text);
        if (payload && typeof payload === "object" && (payload as any).error) {
          message = String((payload as any).error);
        }
      } catch {
        if (text) message = text;
      }
      throw new LLMWiseError(message, { status: res.status, payload: text || undefined });
    }
    return (await res.json()) as T;
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
    return await this.getJSON<unknown[]>("/models", { signal: opts?.signal });
  }

  async creditsBalance(opts?: { signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/credits/balance", { signal: opts?.signal });
  }

  async creditsWallet(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/credits/wallet", opts);
  }

  async creditsTransactions(opts?: { limit?: number; offset?: number; signal?: AbortSignal }): Promise<unknown[]> {
    return await this.getJSON<unknown[]>("/credits/transactions", {
      params: { limit: opts?.limit, offset: opts?.offset },
      signal: opts?.signal,
    });
  }

  async creditsPacks(opts?: RequestSignal): Promise<unknown[]> {
    return await this.getJSON<unknown[]>("/credits/packs", opts);
  }

  async creditsPurchase(
    req: {
      amount_usd?: number;
      pack_id?: string;
      [key: string]: unknown;
    },
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    const { signal } = opts || {};
    return await this.postJSON<Record<string, unknown>>("/credits/purchase", req, signal);
  }

  async creditsConfirmCheckout(opts: { session_id: string; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>(
      "/credits/confirm-checkout",
      { session_id: opts.session_id },
      opts.signal,
    );
  }

  async creditsAutoTopup(
    req: { enabled: boolean; threshold_credits?: number; amount_usd?: number; monthly_cap_usd?: number },
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.putJSON<Record<string, unknown>>("/credits/auto-topup", req, opts?.signal);
  }

  async conversations(opts?: PaginationParams & RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/conversations", {
      params: { limit: opts?.limit, offset: opts?.offset },
      signal: opts?.signal,
    });
  }

  async getConversation(conversationId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>(`/conversations/${conversationId}`, opts);
  }

  async createConversation(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/conversations", {}, opts?.signal);
  }

  async updateConversation(
    conversationId: string,
    req: { title?: string | null },
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    const params: QueryParams = {};
    if (req.title !== undefined) {
      params.title = req.title === null ? "" : req.title;
    }
    return await this.patchJSON<Record<string, unknown>>(`/conversations/${conversationId}`, {
      params,
      signal: opts?.signal,
    });
  }

  async deleteConversation(conversationId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.deleteJSON<Record<string, unknown>>(`/conversations/${conversationId}`, opts);
  }

  async history(
    req: PaginationParams & { mode?: string; search?: string; signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/history", {
      params: {
        limit: req?.limit,
        offset: req?.offset,
        mode: req?.mode,
        search: req?.search,
      },
      signal: req?.signal,
    });
  }

  async getHistoryDetail(requestId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>(`/history/${requestId}`, opts);
  }

  async usageSummary(req?: { days?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/usage/summary", {
      params: { days: req?.days },
      signal: req?.signal,
    });
  }

  async usageRecent(
    req?: { limit?: number; offset?: number; days?: number; mode?: string; signal?: AbortSignal },
  ): Promise<unknown[]> {
    return await this.getJSON<unknown[]>("/usage/recent", {
      params: {
        limit: req?.limit,
        offset: req?.offset,
        days: req?.days,
        mode: req?.mode,
      },
      signal: req?.signal,
    });
  }

  async keysInfo(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/keys/info", opts);
  }

  async keysGenerate(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/keys/generate", {}, opts?.signal);
  }

  async revokeApiKey(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.deleteJSON<Record<string, unknown>>("/keys/revoke", opts);
  }

  async memory(req?: { limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/memory", {
      params: { limit: req?.limit },
      signal: req?.signal,
    });
  }

  async memorySearch(
    req: { q: string; top_k?: number; min_score?: number; signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/memory/search", {
      params: {
        q: req.q,
        top_k: req.top_k,
        min_score: req.min_score,
      },
      signal: req.signal,
    });
  }

  async memoryDelete(memoryId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.deleteJSON<Record<string, unknown>>(`/memory/${memoryId}`, opts);
  }

  async memoryClear(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.deleteJSON<Record<string, unknown>>("/memory", opts);
  }

  async optimizationPolicy(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/policy", opts);
  }

  async optimizationUpdatePolicy(
    payload: Record<string, unknown>,
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.putJSON<Record<string, unknown>>("/optimization/policy", payload, opts?.signal);
  }

  async optimizationReport(
    req?: {
      goal?: string;
      days?: number;
      min_calls_per_model?: number;
      use_policy?: boolean;
      persist_snapshot?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/report", {
      params: {
        goal: req?.goal,
        days: req?.days,
        min_calls_per_model: req?.min_calls_per_model,
        use_policy: req?.use_policy,
        persist_snapshot: req?.persist_snapshot,
      },
      signal: req?.signal,
    });
  }

  async optimizationEvaluate(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/optimization/evaluate", {}, opts?.signal);
  }

  async optimizationReplay(req?: { days?: number; sample_size?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>(
      "/optimization/replay",
      { days: req?.days, sample_size: req?.sample_size },
      req?.signal,
    );
  }

  async optimizationSnapshots(req?: { goal?: string; limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/snapshots", {
      params: { goal: req?.goal, limit: req?.limit },
      signal: req?.signal,
    });
  }

  async optimizationAlerts(req?: { limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/alerts", {
      params: { limit: req?.limit },
      signal: req?.signal,
    });
  }

  async optimizationTestTemplates(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/test-templates", opts);
  }

  async optimizationTestSuites(req?: { limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/test-suites", {
      params: { limit: req?.limit },
      signal: req?.signal,
    });
  }

  async optimizationCreateTestSuite(
    payload: Record<string, unknown>,
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/optimization/test-suites", payload, opts?.signal);
  }

  async optimizationUpdateTestSuite(
    suiteId: string,
    payload: Record<string, unknown>,
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.fetchJSON<Record<string, unknown>>("PUT", `/optimization/test-suites/${suiteId}`, payload, opts?.signal);
  }

  async optimizationRunTestSuite(suiteId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>(`/optimization/test-suites/${suiteId}/run`, {}, opts?.signal);
  }

  async optimizationTestRuns(req?: { limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/test-runs", {
      params: { limit: req?.limit },
      signal: req?.signal,
    });
  }

  async optimizationTestRunCsv(runId: string, opts?: RequestSignal): Promise<string> {
    return await this.getText(`/optimization/test-runs/${runId}/csv`, opts);
  }

  async optimizationRegressionSchedules(req?: { limit?: number; signal?: AbortSignal }): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/optimization/regression-schedules", {
      params: { limit: req?.limit },
      signal: req?.signal,
    });
  }

  async optimizationCreateRegressionSchedule(
    payload: Record<string, unknown>,
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/optimization/regression-schedules", payload, opts?.signal);
  }

  async optimizationUpdateRegressionSchedule(
    scheduleId: string,
    payload: Record<string, unknown>,
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.fetchJSON<Record<string, unknown>>("PUT", `/optimization/regression-schedules/${scheduleId}`, payload, opts?.signal);
  }

  async optimizationRunRegressionSchedule(scheduleId: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>(`/optimization/regression-schedules/${scheduleId}/run`, {}, opts?.signal);
  }

  async settingsKeys(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/settings/keys", opts);
  }

  async settingsSaveKeys(req: { keys: Record<string, string> }, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.putJSON<Record<string, unknown>>("/settings/keys", req, opts?.signal);
  }

  async settingsDeleteKey(provider: string, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.deleteJSON<Record<string, unknown>>(`/settings/keys/${provider}`, opts);
  }

  async settingsPrivacy(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/settings/privacy", opts);
  }

  async settingsUpdatePrivacy(
    req: {
      data_training_opt_in?: boolean;
      zero_retention_mode?: boolean;
      purge_existing_data?: boolean;
    },
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.fetchJSON<Record<string, unknown>>("PUT", "/settings/privacy", req, opts?.signal);
  }

  async settingsCopilotState(opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.getJSON<Record<string, unknown>>("/settings/copilot", opts);
  }

  async settingsUpdateCopilot(
    req: {
      goal?: string;
      onboarded?: boolean;
      checklist?: Record<string, boolean>;
    },
    opts?: RequestSignal,
  ): Promise<Record<string, unknown>> {
    return await this.fetchJSON<Record<string, unknown>>("PUT", "/settings/copilot", req, opts?.signal);
  }

  async settingsAskCopilot(req: { question: string; path?: string; context?: Record<string, string> }, opts?: RequestSignal): Promise<Record<string, unknown>> {
    return await this.postJSON<Record<string, unknown>>("/settings/copilot/ask", req, opts?.signal);
  }

  private async fetchJSON<T>(
    method: "PATCH" | "PUT",
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders(this.apiKey),
      ...this.extraHeaders,
    };
    const res = await this.fetchImpl(this.url(path), {
      method,
      headers,
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
}
