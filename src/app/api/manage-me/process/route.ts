import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200).default("Transcript import"),
  text: z.string().trim().min(10).max(50_000),
});

function extractCandidates(text: string): Array<{ title: string; quote: string }> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets = lines.filter((l) => /^(\-|\*|•|\d+\.)\s+/.test(l));
  const base = bullets.length > 0 ? bullets : lines;

  const candidates = base
    .map((l) => l.replace(/^(\-|\*|•|\d+\.)\s+/, "").trim())
    .filter((l) => l.length >= 4)
    .slice(0, 15)
    .map((title) => ({ title, quote: title }));

  return candidates;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Missing workspace context." }, { status: 400 });
  }

  // 1) Create a Source
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      workspace_id: profile.workspace_id,
      type: "manual",
      title: parsed.data.title,
      raw_content: parsed.data.text,
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    return NextResponse.json(
      { error: sourceError?.message ?? "Failed to create source." },
      { status: 400 },
    );
  }

  // 2) Deterministic extraction (no AI keys needed)
  const candidates = extractCandidates(parsed.data.text);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sourceId: source.id, commitments: [] });
  }

  // 3) Create commitments in inbox for review
  const { data: created, error: insertError } = await supabase
    .from("commitments")
    .insert(
      candidates.map((c) => ({
        workspace_id: profile.workspace_id,
        source_id: source.id,
        title: c.title,
        status: "inbox",
        type: "task",
        urgency_score: 3,
        importance_score: 3,
        ai_confidence: 0.65,
        ai_reasoning: "Generated from Manage Me input (deterministic parser).",
        source_quote: c.quote,
        created_by_ai: true,
      })),
    )
    .select("id,title,status,due_date");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    sourceId: source.id,
    commitments: (created ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      due_date: row.due_date,
    })),
  });
}