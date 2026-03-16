import { NextResponse } from "next/server";

import { ingestSourceAndProcess } from "@/lib/integrations/source-ingestion";
import { createAdminClient } from "@/lib/supabase/server";

type GmailPushPayload = {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

type DecodedGmailData = {
  emailAddress?: string;
  historyId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GmailPushPayload | null;

  if (!body?.message?.data) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const decodedData = JSON.parse(
    Buffer.from(body.message.data, "base64").toString("utf8"),
  ) as DecodedGmailData;

  const emailAddress = decodedData.emailAddress;
  if (!emailAddress) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("workspace_id")
    .eq("type", "gmail")
    .eq("status", "active")
    .eq("capture_settings->>email", emailAddress)
    .maybeSingle();

  if (!integration?.workspace_id) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No matching workspace integration." });
  }

  // At webhook stage we only receive mailbox change metadata.
  const rawContent = `Gmail mailbox update for ${emailAddress}. historyId=${decodedData.historyId ?? "unknown"}.`;

  const ingestion = await ingestSourceAndProcess({
    workspaceId: integration.workspace_id,
    type: "gmail",
    title: "Gmail mailbox update",
    externalId: decodedData.historyId ?? null,
    rawContent,
    metadata: {
      email_address: emailAddress,
      history_id: decodedData.historyId ?? null,
      message_id: body.message.messageId ?? null,
      subscription: body.subscription ?? null,
    },
  });

  return NextResponse.json({ ok: true, ingestion });
}