import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id || !result.profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <QueryProvider>
      <DashboardShell>{children}</DashboardShell>
    </QueryProvider>
  );
}