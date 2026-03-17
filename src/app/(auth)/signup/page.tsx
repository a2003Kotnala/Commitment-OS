import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("workspace_id,onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const nextPath =
      profile?.workspace_id && profile.onboarding_completed ? "/inbox" : "/onboarding";

    redirect(nextPath);
  }

  return (
    <AuthShell
      description="Create the workspace, provision the tenant, and start capturing commitments from real work."
      eyebrow="Workspace Setup"
      footer={
        <>
          Already provisioned?{" "}
          <Link className="font-medium text-accent hover:underline" href="/login">
            Sign in
          </Link>
        </>
      }
      title="Create your AI Commitment OS workspace"
    >
      <SignupForm />
    </AuthShell>
  );
}