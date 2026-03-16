import { NextResponse } from "next/server";
import { z } from "zod";

import {
  runFollowUpDrafter,
  type ExtractedCommitmentCandidate,
} from "@/lib/ai/agents";
import { clampConfidence, runWithAiContext } from "@/lib/ai/core";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const candidateSchema = z.object({
  title: z.string().trim().min(3).max(300),
  source_quote: z.string().trim().min(1),
  ai_reasoning: z.string().trim().min(1),
  extraction_confidence: z.number().min(0).max(1).optional(),
});

const followUpSchema = z
  .object({
    channel: z.enum(["email", "slack"]).default("email"),
    commitmentId: z.string().uuid().optional(),
    candidate: candidateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.commitmentId && !value.candidate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide commitmentId or candidate.",
        path: ["commitmentId"],
      });
    }
  });

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

async function loadCandidateFromCommitment(
  commitmentId: string,
  workspaceId: string,
): Promise<{
  candidate: ExtractedCommitmentCandidate;
  sourceId: string | undefined;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commitments")
    .select("id, workspace_id, title, source_quote, ai_reasoning, ai_confidence, source_id")
    .eq("id", commitmentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Commitment not found in your workspace.");
  }

  const candidate: ExtractedCommitmentCandidate = {
    title: data.title,
    source_quote: data.source_quote?.trim() || data.title,
    ai_reasoning:
      data.ai_reasoning?.trim() || "Draft follow-up requested for this commitment.",
    extraction_confidence: clampConfidence(data.ai_confidence ?? 0.8),
  };

  return {
    candidate,
    sourceId: data.source_id ?? undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = followUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid draft-follow-up payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, workspaceId } = await getWorkspaceContext();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to draft follow-ups." },
        { status: 401 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found for current user." },
        { status: 400 },
      );
    }

    let candidate: ExtractedCommitmentCandidate;
    let sourceId: string | undefined;

    if (parsed.data.commitmentId) {
      const loaded = await loadCandidateFromCommitment(
        parsed.data.commitmentId,
        workspaceId,
      );
      candidate = loaded.candidate;
      sourceId = loaded.sourceId;
    } else {
      const payloadCandidate = parsed.data.candidate!;
      candidate = {
        ...payloadCandidate,
        extraction_confidence: clampConfidence(
          payloadCandidate.extraction_confidence ?? 0.8,
        ),
      };
      sourceId = undefined;
    }

    const draft = await runWithAiContext(
      {
        workspaceId,
        sourceId,
      },
      () => runFollowUpDrafter(candidate, parsed.data.channel),
    );

    return NextResponse.json({
      ok: true,
      draft,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to draft follow-up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}