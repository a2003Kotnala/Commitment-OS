import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
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
