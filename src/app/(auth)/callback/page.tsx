import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CallbackPageProps = {
  searchParams: {
    code?: string;
    error?: string;
    error_description?: string;
  };
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  if (searchParams.error) {
    redirect(`/login?error=${encodeURIComponent(searchParams.error_description ?? searchParams.error)}`);
  }

  if (!searchParams.code) {
    redirect("/login?error=Missing%20OAuth%20code");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(searchParams.code);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Unable%20to%20load%20authenticated%20user");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("workspace_id,onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.workspace_id || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  redirect("/inbox");
}
