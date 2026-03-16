import { NextResponse } from "next/server";

import { buildProviderAuthUrl, decodeOAuthState, exchangeOAuthCode } from "@/lib/integrations/oauth";
import { isIntegrationProvider } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

function redirectToIntegrations(params: Record<string, string>) {
  const url = new URL("/settings/integrations", process.env.NEXT_PUBLIC_APP_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  { params }: { params: { provider: string } },
) {
  if (!isIntegrationProvider(params.provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectToIntegrations({ error: oauthError });
  }

  if (!code || !stateRaw) {
    return redirectToIntegrations({ error: "Missing code/state from provider callback." });
  }

  const state = decodeOAuthState(stateRaw);

  if (!state || state.provider !== params.provider) {
    return redirectToIntegrations({ error: "Invalid OAuth state." });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  if (user.id !== state.userId) {
    return redirectToIntegrations({ error: "OAuth user mismatch." });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.workspace_id || profile.workspace_id !== state.workspaceId) {
    return redirectToIntegrations({ error: "Workspace context mismatch." });
  }

  try {
    const tokens = await exchangeOAuthCode(params.provider, code);

    const { error } = await supabase.from("integrations").upsert(
      {
        workspace_id: profile.workspace_id,
        user_id: user.id,
        type: params.provider,
        status: "active",
        oauth_access_token: tokens.accessToken,
        oauth_refresh_token: tokens.refreshToken,
        scopes: tokens.scopes,
        external_user_id: tokens.externalUserId,
        capture_settings: {
          ...tokens.captureSettings,
          oauth_connected_at: new Date().toISOString(),
        },
      },
      { onConflict: "workspace_id,user_id,type" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return redirectToIntegrations({ success: `${params.provider}_connected` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed.";
    return redirectToIntegrations({ error: message });
  }
}