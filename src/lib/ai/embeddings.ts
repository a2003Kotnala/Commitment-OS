import "server-only";

import OpenAI from "openai";

import {
  getServiceRoleSupabase,
  isRecord,
  logAiAction,
  requireWorkspaceId,
  serializeError,
  sha256Hex,
  toErrorMessage,
  toJsonValue,
} from "./core";
import { env } from "@/lib/env";

export type DuplicateMatch = {
  id: string;
  similarity: number;
  title: string | null;
  source_id: string | null;
};

export type DuplicateDetectionResult = {
  isDuplicate: boolean;
  threshold: number;
  bestMatch: DuplicateMatch | null;
  matches: DuplicateMatch[];
};

const DUPLICATE_THRESHOLD = 0.88;
const DUPLICATE_MATCH_COUNT = 3;

let openAiClient: OpenAI | null = null;

function requireOpenAiKey(): string {
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim().length === 0) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return env.OPENAI_API_KEY;
}

export function getOpenAiClient(): OpenAI {
  if (!openAiClient) {
    openAiClient = new OpenAI({
      apiKey: requireOpenAiKey(),
    });
  }

  return openAiClient;
}

export function getEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

function parseDuplicateMatches(payload: unknown): DuplicateMatch[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const matches: DuplicateMatch[] = [];

  for (const row of payload) {
    if (!isRecord(row)) {
      continue;
    }

    const idValue = row.id;
    const similarityValue = row.similarity;
    const titleValue = row.title;
    const sourceIdValue = row.source_id;

    const parsedId =
      typeof idValue === "string" || typeof idValue === "number"
        ? String(idValue)
        : null;

    const parsedSimilarity =
      typeof similarityValue === "number"
        ? similarityValue
        : typeof similarityValue === "string"
          ? Number(similarityValue)
          : Number.NaN;

    if (!parsedId || !Number.isFinite(parsedSimilarity)) {
      continue;
    }

    matches.push({
      id: parsedId,
      similarity: parsedSimilarity,
      title: typeof titleValue === "string" ? titleValue : null,
      source_id: typeof sourceIdValue === "string" ? sourceIdValue : null,
    });
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

export async function generateEmbedding(
  text: string,
  workspaceId?: string,
): Promise<number[]> {
  const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
  const model = getEmbeddingModel();
  const normalizedText = text.trim();

  if (normalizedText.length === 0) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const startedAt = Date.now();
  const inputHash = sha256Hex(normalizedText);

  try {
    const response = await getOpenAiClient().embeddings.create({
      model,
      input: normalizedText,
      encoding_format: "float",
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error("OpenAI returned an empty embedding vector.");
    }

    await logAiAction({
      workspaceId: resolvedWorkspaceId,
      actionType: "detect_duplicate",
      agentName: "embedding_generator",
      inputHash,
      output: {
        model,
        stage: "embedding_generation",
        dimensions: embedding.length,
      },
      tokensUsed: response.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - startedAt,
      modelUsed: model,
    });

    return embedding;
  } catch (error) {
    try {
      await logAiAction({
        workspaceId: resolvedWorkspaceId,
        actionType: "detect_duplicate",
        agentName: "embedding_generator",
        inputHash,
        output: {
          model,
          stage: "embedding_generation",
          success: false,
          error: serializeError(error),
        },
        tokensUsed: 0,
        latencyMs: Date.now() - startedAt,
        modelUsed: model,
      });
    } catch (loggingError) {
      throw new Error(
        `${toErrorMessage(error)} | Also failed to log AI action: ${toErrorMessage(loggingError)}`,
      );
    }

    throw error;
  }
}

async function queryDuplicateMatches(
  embedding: number[],
  workspaceId: string,
): Promise<DuplicateMatch[]> {
  const supabase = getServiceRoleSupabase();

  const argumentVariants: ReadonlyArray<Record<string, unknown>> = [
    {
      query_embedding: embedding,
      match_threshold: DUPLICATE_THRESHOLD,
      match_count: DUPLICATE_MATCH_COUNT,
      workspace_id: workspaceId,
    },
    {
      query_embedding: embedding,
      match_threshold: DUPLICATE_THRESHOLD,
      match_count: DUPLICATE_MATCH_COUNT,
      workspace_id_filter: workspaceId,
    },
  ];

  let lastError: string | null = null;

  for (const args of argumentVariants) {
    const { data, error } = await supabase.rpc("match_commitments", args);

    if (!error) {
      return parseDuplicateMatches(data);
    }

    lastError = error.message;
  }

  throw new Error(
    lastError ??
      "match_commitments RPC failed. Verify function exists and args.",
  );
}

export async function detectDuplicate(
  embedding: number[],
  workspaceId: string,
): Promise<DuplicateDetectionResult> {
  const resolvedWorkspaceId = requireWorkspaceId(workspaceId);

  if (embedding.length === 0) {
    throw new Error("Cannot detect duplicate using an empty embedding.");
  }

  const startedAt = Date.now();
  const inputHash = sha256Hex(
    JSON.stringify({
      workspaceId: resolvedWorkspaceId,
      embeddingLength: embedding.length,
    }),
  );

  try {
    const matches = await queryDuplicateMatches(embedding, resolvedWorkspaceId);
    const bestMatch = matches[0] ?? null;
    const isDuplicate =
      bestMatch !== null && bestMatch.similarity >= DUPLICATE_THRESHOLD;

    const result: DuplicateDetectionResult = {
      isDuplicate,
      threshold: DUPLICATE_THRESHOLD,
      bestMatch,
      matches,
    };

    await logAiAction({
      workspaceId: resolvedWorkspaceId,
      actionType: "detect_duplicate",
      agentName: "duplicate_detector_agent",
      inputHash,
      output: toJsonValue(result),
      tokensUsed: 0,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    try {
      await logAiAction({
        workspaceId: resolvedWorkspaceId,
        actionType: "detect_duplicate",
        agentName: "duplicate_detector_agent",
        inputHash,
        output: {
          success: false,
          error: serializeError(error),
        },
        tokensUsed: 0,
        latencyMs: Date.now() - startedAt,
      });
    } catch (loggingError) {
      throw new Error(
        `${toErrorMessage(error)} | Also failed to log AI action: ${toErrorMessage(loggingError)}`,
      );
    }

    throw error;
  }
}