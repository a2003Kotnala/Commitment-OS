import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  markAll: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!parsed.data.id && !parsed.data.markAll) {
    return NextResponse.json({ error: "Provide id or markAll=true." }, { status: 400 });
  }

  let query = supabase.from("notifications").update({ status: "read" }).eq("user_id", user.id);

  if (parsed.data.id) {
    query = query.eq("id", parsed.data.id);
  } else {
    query = query.in("status", ["pending", "sent"]);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}