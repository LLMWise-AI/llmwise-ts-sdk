export class LLMWiseError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, opts: { status: number; payload?: unknown }) {
    super(message);
    this.name = "LLMWiseError";
    this.status = opts.status;
    this.payload = opts.payload;
  }
}

