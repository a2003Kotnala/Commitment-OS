import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const preferenceSchema = z.object({
  preferredSurface: z.enum(["slack", "zoom", "gmail"])
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid integration preference." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to continue." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("workspace_id").eq("id", user.id).maybeSingle();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Create a workspace before selecting a capture surface." }, { status: 400 });
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      capture_policy: {
        preferred_surface: parsed.data.preferredSurface
      }
    })
    .eq("id", profile.workspace_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
