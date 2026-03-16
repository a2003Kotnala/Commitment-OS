import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ingestSourceAndProcess } from "@/lib/integrations/source-ingestion";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        event?: string;
        payload?: {
          plainToken?: string;
          object?: { topic?: string; id?: string | number; account_id?: string; start_time?: string };
          account_id?: string;
        };
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // Zoom endpoint validation handshake
  if (body.event === "endpoint.url_validation" && body.payload?.plainToken) {
    const secret = env.ZOOM_VERIFICATION_TOKEN ?? "";
    const encryptedToken = createHmac("sha256", secret)
      .update(body.payload.plainToken)
      .digest("hex");

    return NextResponse.json({
      plainToken: body.payload.plainToken,
      encryptedToken,
    });
  }

  const accountId = body.payload?.object?.account_id ?? body.payload?.account_id;
  if (!accountId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("workspace_id")
    .eq("type", "zoom")
    .eq("status", "active")
    .eq("capture_settings->>account_id", accountId)
    .maybeSingle();

  if (!integration?.workspace_id) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No matching workspace integration." });
  }

  const title = body.payload?.object?.topic ?? "Zoom event";
  const meetingId = body.payload?.object?.id ? String(body.payload.object.id) : null;
  const eventText = `Zoom event detected: ${body.event ?? "unknown"} | meeting: ${title}`;

  const ingestion = await ingestSourceAndProcess({
    workspaceId: integration.workspace_id,
    type: "zoom",
    title,
    externalId: meetingId,
    occurredAt: body.payload?.object?.start_time ?? null,
    rawContent: eventText,
    metadata: {
      account_id: accountId,
      event: body.event ?? null,
      meeting_id: meetingId,
    },
  });

  return NextResponse.json({ ok: true, ingestion });
}