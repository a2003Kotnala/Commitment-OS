import { randomUUID } from "node:crypto";

import { env } from "@/lib/env";
import type { IntegrationProvider } from "@/lib/integrations/types";

type OAuthState = {
  provider: IntegrationProvider;
  workspaceId: string;
  userId: string;
  nonce: string;
  createdAt: number;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
  externalUserId: string | null;
  captureSettings: Record<string, unknown>;
};

function requireEnv(name: string, value?: string) {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getProviderRedirectUri(provider: IntegrationProvider): string {
  const baseUrl = requireEnv("NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL);
  return `${baseUrl}/api/integrations/callback/${provider}`;
}

export function encodeOAuthState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeOAuthState(raw: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthState;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.provider !== "string" ||
      typeof parsed.workspaceId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildOAuthState(provider: IntegrationProvider, workspaceId: string, userId: string): string {
  return encodeOAuthState({
    provider,
    workspaceId,
    userId,
    nonce: randomUUID(),
    createdAt: Date.now(),
  });
}

export function buildProviderAuthUrl(provider: IntegrationProvider, state: string): string {
  const redirectUri = getProviderRedirectUri(provider);

  if (provider === "slack") {
    const clientId = requireEnv("SLACK_CLIENT_ID", env.SLACK_CLIENT_ID);
    const scopes = ["channels:history", "chat:write", "commands", "users:read", "channels:read"];

    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", scopes.join(","));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (provider === "zoom") {
    const clientId = requireEnv("ZOOM_CLIENT_ID", env.ZOOM_CLIENT_ID);
    const url = new URL("https://zoom.us/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  const googleClientId = requireEnv("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID);
  const googleScopes =
    provider === "gmail"
      ? ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"]
      : ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.readonly"];

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

function toExpiresAt(expiresInSeconds: number | null): string | null {
  if (!expiresInSeconds || expiresInSeconds <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export async function exchangeOAuthCode(
  provider: IntegrationProvider,
  code: string,
): Promise<OAuthTokenSet> {
  const redirectUri = getProviderRedirectUri(provider);

  if (provider === "slack") {
    const clientId = requireEnv("SLACK_CLIENT_ID", env.SLACK_CLIENT_ID);
    const clientSecret = requireEnv("SLACK_CLIENT_SECRET", env.SLACK_CLIENT_SECRET);

    const formData = new URLSearchParams();
    formData.set("client_id", clientId);
    formData.set("client_secret", clientSecret);
    formData.set("code", code);
    formData.set("redirect_uri", redirectUri);

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const tokenJson = (await tokenResponse.json()) as {
      ok?: boolean;
      error?: string;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      authed_user?: { id?: string };
      team?: { id?: string };
      scope?: string;
    };

    if (!tokenJson.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error ?? "Slack token exchange failed.");
    }

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt: toExpiresAt(tokenJson.expires_in ?? null),
      scopes: (tokenJson.scope ?? "").split(",").filter(Boolean),
      externalUserId: tokenJson.authed_user?.id ?? null,
      captureSettings: {
        team_id: tokenJson.team?.id ?? null,
      },
    };
  }

  if (provider === "zoom") {
    const clientId = requireEnv("ZOOM_CLIENT_ID", env.ZOOM_CLIENT_ID);
    const clientSecret = requireEnv("ZOOM_CLIENT_SECRET", env.ZOOM_CLIENT_SECRET);

    const formData = new URLSearchParams();
    formData.set("grant_type", "authorization_code");
    formData.set("code", code);
    formData.set("redirect_uri", redirectUri);

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      account_id?: string;
    };

    if (!tokenJson.access_token) {
      throw new Error("Zoom token exchange failed.");
    }

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt: toExpiresAt(tokenJson.expires_in ?? null),
      scopes: (tokenJson.scope ?? "").split(" ").filter(Boolean),
      externalUserId: tokenJson.account_id ?? null,
      captureSettings: {
        account_id: tokenJson.account_id ?? null,
      },
    };
  }

  const googleClientId = requireEnv("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID);
  const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET);

  const formData = new URLSearchParams();
  formData.set("code", code);
  formData.set("client_id", googleClientId);
  formData.set("client_secret", googleClientSecret);
  formData.set("redirect_uri", redirectUri);
  formData.set("grant_type", "authorization_code");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  };

  if (!tokenJson.access_token) {
    throw new Error("Google token exchange failed.");
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: toExpiresAt(tokenJson.expires_in ?? null),
    scopes: (tokenJson.scope ?? "").split(" ").filter(Boolean),
    externalUserId: null,
    captureSettings: {},
  };
}