import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams?: {
    mode?: string;
  };
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const result = await requireAuthenticatedUserProfile();
  const supabase = createClient();
  const isRevisitMode = searchParams?.mode === "revisit";

  if (result.profile?.workspace_id && result.profile.onboarding_completed && !isRevisitMode) {
    redirect("/inbox");
  }

  const { data: workspace } = result.profile?.workspace_id
    ? await supabase.from("workspaces").select("name,capture_policy").eq("id", result.profile.workspace_id).maybeSingle()
    : { data: null };

  const preferredSurfaceRaw =
    workspace?.capture_policy &&
    typeof workspace.capture_policy === "object" &&
    !Array.isArray(workspace.capture_policy) &&
    "preferred_surface" in workspace.capture_policy
      ? workspace.capture_policy.preferred_surface
      : undefined;

  const preferredSurface =
    preferredSurfaceRaw === "slack" || preferredSurfaceRaw === "zoom" || preferredSurfaceRaw === "gmail"
      ? preferredSurfaceRaw
      : undefined;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <OnboardingFlow
          initialPreferredSurface={preferredSurface}
          initialWorkspaceName={workspace?.name ?? ""}
          isRevisitMode={isRevisitMode}
          userDisplayName={result.profile?.display_name ?? ""}
        />
      </div>
    </main>
  );
}
