export type Role = "system" | "user" | "assistant";

export type TextBlock = { type: "text"; text: string };
export type ImageBlock = { type: "image_url"; image_url: { url: string } };
export type ContentBlock = TextBlock | ImageBlock;
export type MessageContent = string | ContentBlock[];

export type Message = {
  role: Role;
  content: MessageContent;
};

export type OptimizationGoal = "balanced" | "latency" | "cost" | "reliability";

export type RoutingConfig = {
  fallback: string[];
  strategy?: string;
};

export type ChatRequest = {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  cost_saver?: boolean;
  optimization_goal?: OptimizationGoal;
  semantic_memory?: boolean;
  semantic_top_k?: number;
  semantic_min_score?: number;
  routing?: RoutingConfig;
  conversation_id?: string;
};

export type CompareRequest = {
  models: string[];
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  semantic_memory?: boolean;
  semantic_top_k?: number;
  semantic_min_score?: number;
  conversation_id?: string;
};

export type BlendRequest = {
  models: string[];
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  semantic_memory?: boolean;
  semantic_top_k?: number;
  semantic_min_score?: number;
  strategy?: "consensus" | "council" | "best_of" | "chain" | "moa" | "self_moa";
  synthesizer?: string;
  layers?: number;
  samples?: number;
  conversation_id?: string;
};

export type JudgeRequest = {
  contestants: string[];
  judge: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  semantic_memory?: boolean;
  semantic_top_k?: number;
  semantic_min_score?: number;
  criteria?: string[];
  conversation_id?: string;
};

export type StreamEvent = {
  // Common
  model?: string;
  delta?: string;
  done?: boolean;
  error?: string;
  event?: string;
  status?: string;
  status_code?: number;
  latency_ms?: number;
  content_length?: number;
  // Metrics
  ttft_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  tokens_per_second?: number;
  cost?: number;
  finish_reason?: string;
  // Billing/metadata
  credits_charged?: number;
  credits_remaining?: number;
  byok?: boolean;
  conversation_id?: string;
  resolved_model?: string;
  auto_strategy?: string;
  optimization_goal?: OptimizationGoal;
  // Mesh trace
  trace?: Array<{ model: string; status: string; status_code?: number; latency_ms?: number }>;
  final_model?: string;
  saved_ms?: number;
  // Compare
  fastest?: string;
  longest?: string;
  models?: Record<string, { latency_ms: number; tokens: number }>;
  // Blend/Judge extra fields are passed through as-is
  [key: string]: unknown;
};

export type ChatResponse = {
  id: string;
  model: string;
  content: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  latency_ms?: number;
  cost?: number;
  credits_charged?: number;
  credits_remaining?: number;
  finish_reason?: string | null;
  mode?: string;
  conversation_id?: string;
  resolved_model?: string;
  auto_strategy?: string;
  optimization_goal?: OptimizationGoal;
  [key: string]: unknown;
};

