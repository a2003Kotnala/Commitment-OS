import { NextResponse } from "next/server";

import { buildOAuthState, buildProviderAuthUrl } from "@/lib/integrations/oauth";
import { isIntegrationProvider } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.workspace_id) {
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_workspace", process.env.NEXT_PUBLIC_APP_URL),
    );
  }

  try {
    const state = buildOAuthState(params.provider, profile.workspace_id, user.id);
    const authUrl = buildProviderAuthUrl(params.provider, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize OAuth.";
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(message)}`,
        process.env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
}