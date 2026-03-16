import { NextResponse } from "next/server";

import { buildOAuthState, buildProviderAuthUrl } from "@/lib/integrations/oauth";
import { isIntegrationProvider } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

function appUrlFromRequest(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl;
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(
  request: Request,
  { params }: { params: { provider: string } },
) {
  if (!isIntegrationProvider(params.provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  const baseUrl = appUrlFromRequest(request);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(profileError.message)}`, baseUrl),
    );
  }

  if (!profile?.workspace_id) {
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_workspace", baseUrl),
    );
  }

  try {
    const state = buildOAuthState(params.provider, profile.workspace_id, user.id);
    const authUrl = buildProviderAuthUrl(params.provider, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize OAuth.";
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(message)}`, baseUrl),
    );
  }
}