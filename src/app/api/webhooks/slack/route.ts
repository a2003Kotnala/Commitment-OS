import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ingestSourceAndProcess } from "@/lib/integrations/source-ingestion";
import { createAdminClient } from "@/lib/supabase/server";

function verifySlackSignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = env.SLACK_SIGNING_SECRET;
  if (!secret) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  const rawBody = await request.text();

  if (!timestamp || !signature || !verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    type?: string;
    challenge?: string;
    team_id?: string;
    event?: { type?: string; text?: string; channel?: string; ts?: string };
  };

  if (body.type === "url_verification" && body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const teamId = body.team_id;
  const text = body.event?.text?.trim() ?? "";

  if (!teamId || text.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("workspace_id")
    .eq("type", "slack")
    .eq("status", "active")
    .eq("capture_settings->>team_id", teamId)
    .maybeSingle();

  if (!integration?.workspace_id) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No matching workspace integration." });
  }

  const ingestion = await ingestSourceAndProcess({
    workspaceId: integration.workspace_id,
    type: "slack",
    title: "Slack event",
    externalId: body.event?.ts ?? null,
    rawContent: text,
    metadata: {
      team_id: teamId,
      channel: body.event?.channel ?? null,
      event_type: body.event?.type ?? null,
    },
  });

  return NextResponse.json({ ok: true, ingestion });
}