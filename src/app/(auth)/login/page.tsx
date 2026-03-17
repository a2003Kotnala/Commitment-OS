import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
      description="Sign in to review AI-detected commitments, manage ownership, and keep execution visible."
      eyebrow="Secure Access"
      footer={
        <>
          New workspace?{" "}
          <Link className="font-medium text-accent hover:underline" href="/signup">
            Create an account
          </Link>
        </>
      }
      title="Sign in to your workspace"
    >
      <LoginForm initialError={searchParams.error} />
    </AuthShell>
  );
}