import { NextResponse } from "next/server";
import { z } from "zod";

import { processRawSource } from "@/lib/ai/orchestrator";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const sourceTypeSchema = z.enum([
  "zoom",
  "slack",
  "gmail",
  "google_calendar",
  "browser",
  "manual",
  "jira",
  "github",
  "notion",
  "teams",
  "outlook",
]);

const processSourceSchema = z
  .object({
    sourceId: z.string().uuid().optional(),
    rawText: z.string().trim().optional(),
    source: z
      .object({
        type: sourceTypeSchema.default("manual"),
        title: z.string().trim().min(1).max(300).optional(),
        url: z.string().url().optional(),
        externalId: z.string().trim().max(255).optional(),
        occurredAt: z.string().datetime().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const hasSourceId = Boolean(value.sourceId);
    const hasRawText = Boolean(value.rawText && value.rawText.length > 0);

    if (!hasSourceId && !hasRawText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either sourceId or rawText.",
        path: ["rawText"],
      });
    }
  });

type ProcessSourcePayload = z.infer<typeof processSourceSchema>;

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

async function resolveSourceId(
  payload: ProcessSourcePayload,
  workspaceId: string,
): Promise<string> {
  if (payload.sourceId) {
    return payload.sourceId;
  }

  const supabase = createClient();

  const rawText = payload.rawText?.trim() ?? "";
  const sourceType = payload.source?.type ?? "manual";

  const { data, error } = await supabase
    .from("sources")
    .insert({
      workspace_id: workspaceId,
      type: sourceType,
      title: payload.source?.title ?? `Manual ${sourceType} source`,
      url: payload.source?.url ?? null,
      external_id: payload.source?.externalId ?? null,
      occurred_at: payload.source?.occurredAt ?? new Date().toISOString(),
      raw_content: rawText,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to create source.");
  }

  return data.id;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = processSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid process-source payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, workspaceId } = await getWorkspaceContext();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to process sources." },
        { status: 401 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found for current user." },
        { status: 400 },
      );
    }

    const sourceId = await resolveSourceId(parsed.data, workspaceId);
    const rawText = parsed.data.rawText?.trim() ?? "";

    const result = await processRawSource(sourceId, rawText, workspaceId);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}