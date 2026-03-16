import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [key: string]: Json };

type AiActionType = Database["public"]["Tables"]["ai_actions"]["Insert"]["action_type"];

export type AiExecutionContext = {
  workspaceId: string;
  sourceId?: string;
  traceId?: string;
};

export type ClaudeCallMetadata = {
  actionType: AiActionType;
  agentName: string;
  workspaceId?: string;
  commitmentId?: string;
  maxTokens?: number;
  confidence?: number;
  requestContext?: Json;
};

export type AiActionLogRecord = {
  workspaceId?: string;
  actionType: AiActionType;
  agentName: string;
  inputHash: string;
  output: Json;
  tokensUsed: number;
  latencyMs: number;
  modelUsed?: string;
  confidence?: number;
  commitmentId?: string;
};

type ClaudeUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

const aiContextStore = new AsyncLocalStorage<AiExecutionContext>();

let anthropicClient: Anthropic | null = null;
let serviceRoleClient: SupabaseClient<Database> | null = null;

function requireEnvValue(value: string | undefined, keyName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${keyName}`);
  }

  return value;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: requireEnvValue(env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
    });
  }

  return anthropicClient;
}

export function getServiceRoleSupabase(): SupabaseClient<Database> {
  if (!serviceRoleClient) {
    const supabaseUrl = requireEnvValue(
      env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    const serviceRoleKey = requireEnvValue(
      env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serviceRoleClient;
}

export function runWithAiContext<T>(
  context: AiExecutionContext,
  fn: () => Promise<T>,
): Promise<T> {
  return aiContextStore.run(context, fn);
}

export function getAiExecutionContext(): AiExecutionContext | undefined {
  return aiContextStore.getStore();
}

export function requireWorkspaceId(explicitWorkspaceId?: string): string {
  const workspaceId = explicitWorkspaceId ?? getAiExecutionContext()?.workspaceId;

  if (!workspaceId) {
    throw new Error(
      "No workspaceId in AI execution context. Pass metadata.workspaceId or use runWithAiContext().",
    );
  }

  return workspaceId;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function clampConfidence(value: number): number {
  const normalized = value > 1 ? value / 100 : value;

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.max(0, Math.min(1, normalized));
}

export function averageConfidence(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + clampConfidence(value), 0);
  return Number((total / values.length).toFixed(4));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return JSON.stringify(toJsonValue(error));
}

export function toJsonValue(
  value: unknown,
  visited: WeakSet<object> = new WeakSet<object>(),
): Json {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return String(value);
    }

    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item, visited));
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return "[Circular]";
    }

    visited.add(value);

    const result: { [key: string]: Json } = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = toJsonValue(item, visited);
    }

    visited.delete(value);
    return result;
  }

  return String(value);
}

export function serializeError(error: unknown): Json {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    message: toErrorMessage(error),
    raw: toJsonValue(error),
  };
}

function extractTextFromClaudeContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = content
    .map((block) => {
      if (!isRecord(block)) {
        return "";
      }

      if (block.type !== "text") {
        return "";
      }

      return typeof block.text === "string" ? block.text : "";
    })
    .filter((part) => part.trim().length > 0);

  return textParts.join("\n").trim();
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseJsonResponse(rawText: string): unknown {
  const trimmed = rawText.trim();

  if (trimmed.length === 0) {
    throw new Error("Claude returned an empty response.");
  }

  const directParse = tryParseJson(trimmed);
  if (directParse !== undefined) {
    return directParse;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fencedParse = tryParseJson(fencedMatch[1].trim());
    if (fencedParse !== undefined) {
      return fencedParse;
    }
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    const objectParse = tryParseJson(trimmed.slice(objectStart, objectEnd + 1));
    if (objectParse !== undefined) {
      return objectParse;
    }
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const arrayParse = tryParseJson(trimmed.slice(arrayStart, arrayEnd + 1));
    if (arrayParse !== undefined) {
      return arrayParse;
    }
  }

  throw new Error("Claude response was not valid JSON.");
}

function coerceClaudeUsage(value: unknown): ClaudeUsage {
  if (!isRecord(value)) {
    return {};
  }

  const readNumber = (field: string): number | null => {
    const candidate = value[field];
    return typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : null;
  };

  return {
    input_tokens: readNumber("input_tokens"),
    output_tokens: readNumber("output_tokens"),
    cache_creation_input_tokens: readNumber("cache_creation_input_tokens"),
    cache_read_input_tokens: readNumber("cache_read_input_tokens"),
  };
}

function getClaudeTokensUsed(usage: ClaudeUsage): number {
  return (
    (usage.input_tokens ?? 0) +
    (usage.output_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

export async function logAiAction(record: AiActionLogRecord): Promise<void> {
  const supabase = getServiceRoleSupabase();
  const workspaceId = requireWorkspaceId(record.workspaceId);

  const { error } = await supabase.from("ai_actions").insert({
    workspace_id: workspaceId,
    action_type: record.actionType,
    agent_name: record.agentName,
    input_hash: record.inputHash,
    output: toJsonValue(record.output),
    tokens_used: record.tokensUsed,
    latency_ms: record.latencyMs,
    model_used: record.modelUsed ?? null,
    confidence:
      typeof record.confidence === "number"
        ? clampConfidence(record.confidence)
        : null,
    commitment_id: record.commitmentId ?? null,
  });

  if (error) {
    throw new Error(`Failed to log AI action: ${error.message}`);
  }
}

export async function callClaudeWithLogging<T>(
  systemPrompt: string,
  userPrompt: string,
  metadata: ClaudeCallMetadata,
  validate: (payload: unknown) => T,
): Promise<T> {
  const model = getAnthropicModel();
  const workspaceId = requireWorkspaceId(metadata.workspaceId);
  const startedAt = Date.now();

  const inputHash = sha256Hex(
    JSON.stringify({
      model,
      systemPrompt,
      userPrompt,
      requestContext: metadata.requestContext ?? null,
    }),
  );

  let rawText = "";
  let tokensUsed = 0;

  try {
    const response = await getAnthropicClient().messages.create({
      model,
      max_tokens: metadata.maxTokens ?? 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    rawText = extractTextFromClaudeContent(response.content);
    tokensUsed = getClaudeTokensUsed(coerceClaudeUsage(response.usage));

    const parsedPayload = parseJsonResponse(rawText);
    const validatedOutput = validate(parsedPayload);

    await logAiAction({
      workspaceId,
      actionType: metadata.actionType,
      agentName: metadata.agentName,
      inputHash,
      output: {
        model,
        success: true,
        result: toJsonValue(validatedOutput),
      },
      tokensUsed,
      latencyMs: Date.now() - startedAt,
      modelUsed: model,
      confidence: metadata.confidence,
      commitmentId: metadata.commitmentId,
    });

    return validatedOutput;
  } catch (error) {
    try {
      await logAiAction({
        workspaceId,
        actionType: metadata.actionType,
        agentName: metadata.agentName,
        inputHash,
        output: {
          model,
          success: false,
          error: serializeError(error),
          raw_text: rawText.length > 0 ? rawText : null,
        },
        tokensUsed,
        latencyMs: Date.now() - startedAt,
        modelUsed: model,
        confidence: metadata.confidence,
        commitmentId: metadata.commitmentId,
      });
    } catch (loggingError) {
      throw new Error(
        `${toErrorMessage(error)} | Also failed to log AI action: ${toErrorMessage(loggingError)}`,
      );
    }

    throw error;
  }
}