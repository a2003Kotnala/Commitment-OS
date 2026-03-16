import { NextResponse } from "next/server";

import { isIntegrationProvider } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: { provider: string } },
) {
  if (!isIntegrationProvider(params.provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
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

  const { error } = await supabase
    .from("integrations")
    .update({
      status: "revoked",
      oauth_access_token: null,
      oauth_refresh_token: null,
      last_synced_at: null,
    })
    .eq("workspace_id", profile.workspace_id)
    .eq("user_id", user.id)
    .eq("type", params.provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}