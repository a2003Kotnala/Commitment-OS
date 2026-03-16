import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { generateUniqueWorkspaceSlug } from "@/lib/workspaces";

const workspaceSchema = z.object({
  workspaceName: z.string().min(2)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = workspaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspace payload." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to continue." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Your profile row was not found. Run the migration and retry." },
      { status: 400 }
    );
  }

  if (profile.workspace_id) {
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ name: parsed.data.workspaceName })
      .eq("id", profile.workspace_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  const slug = generateUniqueWorkspaceSlug(parsed.data.workspaceName);
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data.workspaceName, slug })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: workspaceError?.message ?? "Unable to create workspace." },
      { status: 400 }
    );
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ workspace_id: workspace.id, role: "owner", onboarding_completed: false })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
