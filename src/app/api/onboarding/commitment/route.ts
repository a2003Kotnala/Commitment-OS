import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const commitmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(500).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = commitmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid commitment payload." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to continue." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Create a workspace before adding commitments." }, { status: 400 });
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      workspace_id: profile.workspace_id,
      type: "manual",
      title: "Onboarding seed commitment",
      raw_content: parsed.data.description ?? parsed.data.title
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    return NextResponse.json(
      { error: sourceError?.message ?? "Unable to create commitment source." },
      { status: 400 }
    );
  }

  const { error: commitmentError } = await supabase.from("commitments").insert({
    workspace_id: profile.workspace_id,
    title: parsed.data.title,
    description: parsed.data.description,
    status: "open",
    type: "task",
    owner_id: user.id,
    urgency_score: 3,
    importance_score: 4,
    ai_confidence: 1,
    source_id: source.id,
    created_by_ai: false
  });

  if (commitmentError) {
    return NextResponse.json({ error: commitmentError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ onboarding_completed: true, last_active_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
