import "server-only";

import { randomUUID } from "node:crypto";

import {
  averageConfidence,
  getServiceRoleSupabase,
  isRecord,
  logAiAction,
  runWithAiContext,
  sha256Hex,
  toJsonValue,
} from "./core";
import {
  runClassifierAgent,
  runDueDateInferencer,
  runEffortEstimator,
  runExtractorAgent,
  runOwnerInferencer,
  runPriorityScorer,
  runRiskDetector,
  type ClassifierResult,
  type DueDateInferenceResult,
  type EffortEstimateResult,
  type ExtractedCommitmentCandidate,
  type OwnerInferenceResult,
  type PriorityScoreResult,
  type RiskScoreResult,
} from "./agents";
import { detectDuplicate, generateEmbedding } from "./embeddings";

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

type InsertedCandidateResult = {
  title: string;
  status: "inserted";
  commitmentId: string;
  aiConfidence: number;
  confidenceBucket: "high" | "medium";
};

type DuplicateCandidateResult = {
  title: string;
  status: "duplicate";
  duplicateOfId: string | null;
  similarity: number | null;
};

type RejectedCandidateResult = {
  title: string;
  status: "rejected";
  aiConfidence: number;
};

type FailedCandidateResult = {
  title: string;
  status: "failed";
  error: string;
};

export type CandidateProcessResult =
  | InsertedCandidateResult
  | DuplicateCandidateResult
  | RejectedCandidateResult
  | FailedCandidateResult;

export type ProcessRawSourceResult = {
  sourceId: string;
  workspaceId: string;
  extractedCount: number;
  processedCount: number;
  insertedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  failedCount: number;
  results: CandidateProcessResult[];
};

type CandidateProcessingArtifacts = {
  classification: ClassifierResult;
  owner: OwnerInferenceResult;
  dueDate: DueDateInferenceResult;
  priority: PriorityScoreResult;
  effort: EffortEstimateResult;
  risk: RiskScoreResult;
  embedding: number[];
  finalConfidence: number;
};

type ConfidenceBucket = "high" | "medium" | "low";

function getConfidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return "high";
  }

  if (confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return "medium";
  }

  return "low";
}

function dedupeCandidates(
  candidates: ExtractedCommitmentCandidate[],
): ExtractedCommitmentCandidate[] {
  const seen = new Set<string>();
  const unique: ExtractedCommitmentCandidate[] = [];

  for (const candidate of candidates) {
    const key = sha256Hex(
      JSON.stringify({
        title: candidate.title,
        source_quote: candidate.source_quote,
      }),
    );

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(candidate);
  }

  return unique;
}

function buildEmbeddingInput(
  candidate: ExtractedCommitmentCandidate,
  artifacts: Omit<CandidateProcessingArtifacts, "embedding" | "finalConfidence">,
): string {
  return [
    `Title: ${candidate.title}`,
    `Type: ${artifacts.classification.type}`,
    `Source Quote: ${candidate.source_quote}`,
    `Reasoning: ${candidate.ai_reasoning}`,
    `Owner Reference: ${artifacts.owner.owner_reference ?? "unknown"}`,
    `Due Date: ${artifacts.dueDate.due_date ?? "none"}`,
    `Urgency: ${artifacts.priority.urgency_score}`,
    `Importance: ${artifacts.priority.importance_score}`,
    `Effort Hours: ${
      artifacts.effort.effort_estimate_hours === null
        ? "unknown"
        : artifacts.effort.effort_estimate_hours
    }`,
    `Risk Score: ${artifacts.risk.risk_score}`,
  ].join("\n");
}

function extractInsertedCommitmentId(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new Error("Supabase insert did not return a commitment object.");
  }

  const id = payload.id;

  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }

  throw new Error("Inserted commitment record is missing id.");
}

async function resolveSourceText(
  sourceId: string,
  workspaceId: string,
  rawText: string,
): Promise<string> {
  const inlineText = rawText.trim();
  if (inlineText.length > 0) {
    return inlineText;
  }

  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("sources")
    .select("workspace_id, raw_content")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load source: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Source not found for sourceId=${sourceId}`);
  }

  if (data.workspace_id !== workspaceId) {
    throw new Error("Source/workspace mismatch while processing source.");
  }

  const sourceText = data.raw_content?.trim() ?? "";

  return sourceText;
}

async function structureCandidate(
  candidate: ExtractedCommitmentCandidate,
  contextDate: string,
  workspaceId: string,
): Promise<CandidateProcessingArtifacts> {
  const [classification, owner, dueDate, priority, effort] = await Promise.all([
    runClassifierAgent(candidate),
    runOwnerInferencer(candidate),
    runDueDateInferencer(candidate, contextDate),
    runPriorityScorer(candidate),
    runEffortEstimator(candidate),
  ]);

  const risk = await runRiskDetector(
    candidate,
    dueDate.due_date,
    priority.urgency_score,
    priority.importance_score,
  );

  const embeddingInput = buildEmbeddingInput(candidate, {
    classification,
    owner,
    dueDate,
    priority,
    effort,
    risk,
  });

  const embedding = await generateEmbedding(embeddingInput, workspaceId);

  const finalConfidence = averageConfidence([
    candidate.extraction_confidence,
    classification.classification_confidence,
    owner.owner_confidence,
    dueDate.due_date_confidence,
    priority.priority_confidence,
    effort.effort_confidence,
    risk.risk_confidence,
  ]);

  return {
    classification,
    owner,
    dueDate,
    priority,
    effort,
    risk,
    embedding,
    finalConfidence,
  };
}

async function processCandidate(
  candidate: ExtractedCommitmentCandidate,
  sourceId: string,
  workspaceId: string,
  contextDate: string,
): Promise<CandidateProcessResult> {
  const artifacts = await structureCandidate(candidate, contextDate, workspaceId);

  const duplicateCheck = await detectDuplicate(artifacts.embedding, workspaceId);

  if (duplicateCheck.isDuplicate) {
    return {
      title: candidate.title,
      status: "duplicate",
      duplicateOfId: duplicateCheck.bestMatch?.id ?? null,
      similarity: duplicateCheck.bestMatch?.similarity ?? null,
    };
  }

  const confidenceBucket = getConfidenceBucket(artifacts.finalConfidence);

  if (confidenceBucket === "low") {
    return {
      title: candidate.title,
      status: "rejected",
      aiConfidence: artifacts.finalConfidence,
    };
  }

  const isSuggestion = confidenceBucket === "medium";
  const aiReasoning = [
    candidate.ai_reasoning,
    `Owner inference: ${artifacts.owner.owner_reasoning}`,
    `Risk factors: ${
      artifacts.risk.risk_factors.length > 0
        ? artifacts.risk.risk_factors.join("; ")
        : "No elevated risk factors."
    }`,
  ].join(" ");

  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      workspace_id: workspaceId,
      source_id: sourceId,
      title: candidate.title,
      status: "inbox",
      type: artifacts.classification.type,
      due_date: artifacts.dueDate.due_date,
      due_date_confidence: artifacts.dueDate.due_date_confidence,
      urgency_score: artifacts.priority.urgency_score,
      importance_score: artifacts.priority.importance_score,
      effort_estimate_hours: artifacts.effort.effort_estimate_hours,
      ai_confidence: artifacts.finalConfidence,
      ai_reasoning: aiReasoning,
      source_quote: candidate.source_quote,
      risk_score: artifacts.risk.risk_score,
      embedding: artifacts.embedding,
      created_by_ai: true,
      context_snapshot: toJsonValue({
        gating_bucket: confidenceBucket,
        is_suggestion: isSuggestion,
        confidence_breakdown: {
          extraction: candidate.extraction_confidence,
          classification: artifacts.classification.classification_confidence,
          owner: artifacts.owner.owner_confidence,
          due_date: artifacts.dueDate.due_date_confidence,
          priority: artifacts.priority.priority_confidence,
          effort: artifacts.effort.effort_confidence,
          risk: artifacts.risk.risk_confidence,
        },
        owner_inference: artifacts.owner,
        risk_details: artifacts.risk,
      }),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert commitment: ${error.message}`);
  }

  return {
    title: candidate.title,
    status: "inserted",
    commitmentId: extractInsertedCommitmentId(data),
    aiConfidence: artifacts.finalConfidence,
    confidenceBucket,
  };
}

export async function processRawSource(
  sourceId: string,
  rawText: string,
  workspaceId: string,
): Promise<ProcessRawSourceResult> {
  return runWithAiContext(
    {
      workspaceId,
      sourceId,
      traceId: randomUUID(),
    },
    async () => {
      const normalizedText = await resolveSourceText(sourceId, workspaceId, rawText);

      if (normalizedText.length === 0) {
        return {
          sourceId,
          workspaceId,
          extractedCount: 0,
          processedCount: 0,
          insertedCount: 0,
          duplicateCount: 0,
          rejectedCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      const extractedCandidates = await runExtractorAgent(normalizedText);
      const uniqueCandidates = dedupeCandidates(extractedCandidates);

      if (uniqueCandidates.length === 0) {
        return {
          sourceId,
          workspaceId,
          extractedCount: extractedCandidates.length,
          processedCount: 0,
          insertedCount: 0,
          duplicateCount: 0,
          rejectedCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      const contextDate = new Date().toISOString();

      const settlements = await Promise.allSettled(
        uniqueCandidates.map((candidate) =>
          processCandidate(candidate, sourceId, workspaceId, contextDate),
        ),
      );

      const results: CandidateProcessResult[] = settlements.map((settlement, index) => {
        if (settlement.status === "fulfilled") {
          return settlement.value;
        }

        const reason = settlement.reason;
        return {
          title: uniqueCandidates[index]?.title ?? `candidate-${index + 1}`,
          status: "failed",
          error:
            reason instanceof Error
              ? reason.message
              : JSON.stringify(toJsonValue(reason)),
        };
      });

      const summary: ProcessRawSourceResult = {
        sourceId,
        workspaceId,
        extractedCount: extractedCandidates.length,
        processedCount: uniqueCandidates.length,
        insertedCount: results.filter((result) => result.status === "inserted").length,
        duplicateCount: results.filter((result) => result.status === "duplicate").length,
        rejectedCount: results.filter((result) => result.status === "rejected").length,
        failedCount: results.filter((result) => result.status === "failed").length,
        results,
      };

      await logAiAction({
        workspaceId,
        actionType: "generate_plan",
        agentName: "pipeline_orchestrator",
        inputHash: sha256Hex(
          JSON.stringify({
            sourceId,
            workspaceId,
            sourceTextLength: normalizedText.length,
            extractedCount: extractedCandidates.length,
            processedCount: uniqueCandidates.length,
          }),
        ),
        output: toJsonValue(summary),
        tokensUsed: 0,
        latencyMs: 0,
      });

      return summary;
    },
  );
}