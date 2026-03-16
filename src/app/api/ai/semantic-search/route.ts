import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getServiceRoleSupabase,
  isRecord,
  logAiAction,
  sha256Hex,
  toJsonValue,
} from "@/lib/ai/core";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const semanticSearchSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  matchThreshold: z.number().min(0).max(1).default(0.75),
  matchCount: z.number().int().min(1).max(20).default(8),
});

type RpcMatch = {
  id: string;
  similarity: number;
};

type SemanticSearchItem = {
  id: string;
  similarity: number;
  title: string | null;
  status: string | null;
  type: string | null;
  due_date: string | null;
  urgency_score: number | null;
  importance_score: number | null;
  ai_confidence: number | null;
  source_quote: string | null;
};

async function getWorkspaceContext() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    return { userId: null, workspaceId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    userId: user.id,
    workspaceId: profile?.workspace_id ?? null,
  };
}

function parseRpcMatches(payload: unknown): RpcMatch[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const parsed: RpcMatch[] = [];

  for (const row of payload) {
    if (!isRecord(row)) {
      continue;
    }

    const idValue = row.id;
    const similarityValue = row.similarity;

    const id =
      typeof idValue === "string" || typeof idValue === "number"
        ? String(idValue)
        : null;

    const similarity =
      typeof similarityValue === "number"
        ? similarityValue
        : typeof similarityValue === "string"
          ? Number(similarityValue)
          : Number.NaN;

    if (!id || !Number.isFinite(similarity)) {
      continue;
    }

    parsed.push({ id, similarity });
  }

  return parsed.sort((a, b) => b.similarity - a.similarity);
}

async function queryMatchCommitmentsRpc(
  workspaceId: string,
  embedding: number[],
  threshold: number,
  matchCount: number,
): Promise<RpcMatch[]> {
  const supabase = getServiceRoleSupabase();

  const variants: ReadonlyArray<Record<string, unknown>> = [
    {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: matchCount,
      workspace_id: workspaceId,
    },
    {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: matchCount,
      workspace_id_filter: workspaceId,
    },
  ];

  let lastError: string | null = null;

  for (const args of variants) {
    const { data, error } = await supabase.rpc("match_commitments", args);

    if (!error) {
      return parseRpcMatches(data);
    }

    lastError = error.message;
  }

  throw new Error(
    lastError ??
      "match_commitments RPC failed. Create/verify this RPC before semantic search.",
  );
}

async function loadCommitmentDetails(
  workspaceId: string,
  ids: string[],
): Promise<Map<string, SemanticSearchItem>> {
  if (ids.length === 0) {
    return new Map<string, SemanticSearchItem>();
  }

  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("commitments")
    .select(
      "id, title, status, type, due_date, urgency_score, importance_score, ai_confidence, source_quote, workspace_id",
    )
    .eq("workspace_id", workspaceId)
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to load commitments for search results: ${error.message}`);
  }

  const map = new Map<string, SemanticSearchItem>();

  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      similarity: 0,
      title: row.title ?? null,
      status: row.status ?? null,
      type: row.type ?? null,
      due_date: row.due_date ?? null,
      urgency_score: row.urgency_score ?? null,
      importance_score: row.importance_score ?? null,
      ai_confidence: row.ai_confidence ?? null,
      source_quote: row.source_quote ?? null,
    });
  }

  return map;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = await request.json().catch(() => null);
    const parsed = semanticSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid semantic-search payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, workspaceId } = await getWorkspaceContext();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to run semantic search." },
        { status: 401 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found for current user." },
        { status: 400 },
      );
    }

    const { query, matchThreshold, matchCount } = parsed.data;

    const embedding = await generateEmbedding(query, workspaceId);
    const matches = await queryMatchCommitmentsRpc(
      workspaceId,
      embedding,
      matchThreshold,
      matchCount,
    );

    const detailMap = await loadCommitmentDetails(
      workspaceId,
      matches.map((m) => m.id),
    );

    const results: SemanticSearchItem[] = matches.map((match) => {
      const detail = detailMap.get(match.id);

      if (!detail) {
        return {
          id: match.id,
          similarity: match.similarity,
          title: null,
          status: null,
          type: null,
          due_date: null,
          urgency_score: null,
          importance_score: null,
          ai_confidence: null,
          source_quote: null,
        };
      }

      return {
        ...detail,
        similarity: match.similarity,
      };
    });

    await logAiAction({
      workspaceId,
      actionType: "memory_retrieve",
      agentName: "semantic_search_route",
      inputHash: sha256Hex(
        JSON.stringify({
          query,
          matchThreshold,
          matchCount,
        }),
      ),
      output: toJsonValue({
        result_count: results.length,
        top_similarity: results[0]?.similarity ?? null,
      }),
      tokensUsed: 0,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Semantic search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}