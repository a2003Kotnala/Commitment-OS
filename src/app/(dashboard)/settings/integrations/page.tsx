// import Link from "next/link";

import { providerLabels, type IntegrationProvider } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

const providers: IntegrationProvider[] = ["slack", "zoom", "gmail", "google_calendar"];

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id || !result.authUser) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const supabase = createClient();

  const { data } = await supabase
    .from("integrations")
    .select("type, status, last_synced_at")
    .eq("workspace_id", result.profile.workspace_id)
    .eq("user_id", result.authUser.id);

  const statusMap = new Map((data ?? []).map((item) => [item.type, item.status]));

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Integrations</h1>
      <p className="text-sm text-slate-600">Connect Slack, Zoom, Gmail and Google Calendar for automatic capture.</p>

      <div className="space-y-3">
        {providers.map((provider) => {
          const status = statusMap.get(provider) ?? "not_connected";
          const isActive = status === "active";

          return (
            <div key={provider} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium text-slate-900">{providerLabels[provider]}</p>
                <p className="text-xs text-slate-500">status: {status}</p>
              </div>

              <div className="flex items-center gap-2">
                {!isActive ? (
                  <a
                  className="rounded-xl bg-[#1B3A5C] px-3 py-2 text-sm font-medium text-white hover:bg-[#15304B]"
                  href={`/api/integrations/connect/${provider}`}
                >
                  Connect
                </a>
                ) : (
                  <form action={`/api/integrations/disconnect/${provider}`} method="post">
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Disconnect
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}