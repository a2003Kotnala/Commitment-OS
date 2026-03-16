import { createAdminClient } from "@/lib/supabase/server";
import { processRawSource, type ProcessRawSourceResult } from "@/lib/ai/orchestrator";
import type { Tables } from "@/types/database";

type SourceType = Tables<"sources">["type"];

export type IngestSourceInput = {
  workspaceId: string;
  type: SourceType;
  title?: string | null;
  url?: string | null;
  externalId?: string | null;
  occurredAt?: string | null;
  rawContent: string;
  metadata?: Record<string, unknown>;
};

export type IngestSourceResult = {
  sourceId: string;
  processingResult: ProcessRawSourceResult | null;
  processingError: string | null;
};

export async function ingestSourceAndProcess(input: IngestSourceInput): Promise<IngestSourceResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sources")
    .insert({
      workspace_id: input.workspaceId,
      type: input.type,
      title: input.title ?? null,
      url: input.url ?? null,
      external_id: input.externalId ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      raw_content: input.rawContent,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to create source row.");
  }

  const sourceId = data.id;

  if (input.rawContent.trim().length === 0) {
    return { sourceId, processingResult: null, processingError: null };
  }

  try {
    const processingResult = await processRawSource(sourceId, input.rawContent, input.workspaceId);
    return { sourceId, processingResult, processingError: null };
  } catch (processingError) {
    return {
      sourceId,
      processingResult: null,
      processingError:
        processingError instanceof Error ? processingError.message : "Source processing failed.",
    };
  }
}