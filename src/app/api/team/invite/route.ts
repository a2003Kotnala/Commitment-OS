import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient, createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]).default("member"),
});

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
    .select("workspace_id,role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Missing workspace context." }, { status: 400 });
  }

  if (profile.role !== "owner" && profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createAdminClient();

  // Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
  );

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Invite failed." },
      { status: 400 },
    );
  }

  // Ensure they belong to the same workspace in public.users
  const { error: upsertError } = await admin.from("users").upsert(
    {
      id: inviteData.user.id,
      email: parsed.data.email,
      workspace_id: profile.workspace_id,
      role: parsed.data.role,
      onboarding_completed: false,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}