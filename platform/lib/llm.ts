import OpenAI from "openai";
import { z } from "zod";
import { reportError } from "./observability";

// --------------------------------------------------------------------------
// Provider-swappable LLM adapter.
//
// Today it speaks to OpenAI using Structured Outputs (json_schema + strict),
// which gives ~99.9% schema compliance. The surface (`generate`) is generic
// so a Claude / Gemini backend can be dropped in later without touching the
// API routes.
//
// If OPENAI_API_KEY is absent we fall back to a caller-provided `mock()` so the
// entire test flow is runnable in development before any billing is wired up.
// --------------------------------------------------------------------------

export type LlmSource = "openai" | "mock";

export interface LlmResult<T> {
  data: T;
  source: LlmSource;
  usage?: { promptTokens: number; completionTokens: number } | null;
}

export type ModelTier = "smart" | "mini";

export interface GenerateOptions<T> {
  /** Short name for the schema (used by the provider + for logs). */
  schemaName: string;
  /** JSON Schema describing the expected object (strict-mode compatible). */
  jsonSchema: Record<string, unknown>;
  /** Zod schema used to validate + type the parsed response. */
  validator: z.ZodType<T>;
  system: string;
  user: string;
  /** Which model tier to use. "mini" for cheap extraction, "smart" otherwise. */
  tier?: ModelTier;
  /** Realistic placeholder used when no API key is configured. */
  mock: () => T;
  maxTokens?: number;
}

const TIMEOUT_MS = 30_000;

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 0, // we handle retries ourselves so we can fall back cleanly
    });
  }
  return client;
}

function modelFor(tier: ModelTier): string {
  if (tier === "mini") return process.env.OPENAI_MODEL_MINI || "gpt-4o-mini";
  return process.env.OPENAI_MODEL_SMART || "gpt-4o";
}

export function isLiveAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generate<T>(opts: GenerateOptions<T>): Promise<LlmResult<T>> {
  const api = getClient();

  // No key -> deterministic, realistic mock so the UX is fully testable.
  if (!api) {
    return { data: opts.mock(), source: "mock", usage: null };
  }

  const model = modelFor(opts.tier ?? "smart");
  const maxAttempts = 2; // initial + one retry on schema failure / refusal

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completion = await api.chat.completions.create({
        model,
        max_tokens: opts.maxTokens ?? 900,
        temperature: 0.7,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: opts.schemaName,
            strict: true,
            schema: opts.jsonSchema,
          },
        },
      });

      const choice = completion.choices[0];

      // A model refusal comes back in its own field, not as our schema.
      const refusal = (choice?.message as { refusal?: string } | undefined)?.refusal;
      if (refusal) {
        throw new Error(`Model refused: ${refusal}`);
      }

      const content = choice?.message?.content;
      if (!content) throw new Error("Empty completion content");

      const parsed = JSON.parse(content);
      const result = opts.validator.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Schema validation failed: ${result.error.message}`);
      }

      return {
        data: result.data,
        source: "openai",
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
            }
          : null,
      };
    } catch (err) {
      lastError = err;
      // Retry once; on final failure, degrade gracefully to a mock rather than
      // showing the visitor an error mid-flow.
      if (attempt === maxAttempts) {
        void reportError(err, { step: opts.schemaName, attempts: attempt, model });
        return { data: opts.mock(), source: "mock", usage: null };
      }
    }
  }

  // Unreachable, but keeps the type checker happy.
  console.error(`[llm] ${opts.schemaName} unexpected fallthrough`, lastError);
  return { data: opts.mock(), source: "mock", usage: null };
}
