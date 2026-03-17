import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  display_name: z.string().trim().min(2),
  timezone: z.string().trim().min(1),
  work_hours_start: z.string().regex(/^\d{2}:\d{2}$/),
  work_hours_end: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      display_name: parsed.data.display_name,
      timezone: parsed.data.timezone,
      work_hours_start: parsed.data.work_hours_start,
      work_hours_end: parsed.data.work_hours_end,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}