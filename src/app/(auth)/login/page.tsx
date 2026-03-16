import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
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
