import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { generateUniqueWorkspaceSlug } from "@/lib/workspaces";

const registerSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid signup payload.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const slug = generateUniqueWorkspaceSlug(parsed.data.workspaceName);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        display_name: parsed.data.displayName
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Unable to create the user account." },
        { status: 400 }
      );
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: parsed.data.workspaceName,
        slug
      })
      .select("id")
      .single();

    if (workspaceError || !workspace) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: workspaceError?.message ?? "Unable to create workspace." },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: authData.user.id,
        email: parsed.data.email,
        display_name: parsed.data.displayName,
        workspace_id: workspace.id,
        role: "owner",
        onboarding_completed: false
      },
      {
        onConflict: "id"
      }
    );

    if (profileError) {
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message ?? "Unable to create workspace membership." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
