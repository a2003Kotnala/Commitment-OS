import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FileText, Inbox, PanelRightOpen, Sparkles } from "lucide-react";

import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Sidebar } from "@/components/shared/Sidebar";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // PHASE 1 AUTH CHECK
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id || !result.profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <QueryProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto grid min-h-screen max-w-[1800px] md:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_360px]">
          <Sidebar />

          <main className="min-w-0 border-l border-slate-200/80 bg-slate-50">
            <div className="h-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>

          <aside className="hidden border-l border-slate-200/80 bg-white/90 xl:block">
            <div className="sticky top-0 flex h-screen flex-col gap-6 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#1B3A5C]/10 p-3 text-[#1B3A5C]">
                  <PanelRightOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                    Detail panel
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Commitment context
                  </h2>
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-[#2E86AB]/30 bg-slate-50 p-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2E86AB]/10 px-3 py-1 text-xs font-semibold text-[#1B3A5C]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ready for shared selection state
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  This rail is reserved for the selected commitment, source
                  evidence, ownership, and action history. The layout is already
                  structured for a full 3-column experience when you wire in
                  Zustand later.
                </p>
              </div>

              <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-50 p-2 text-purple-700">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Selected commitment preview
                    </p>
                    <p className="text-xs text-slate-500">
                      Populate this from shared UI state in the next pass.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Quote evidence
                  </p>

                  <div className="mt-3 flex gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                    <p className="text-sm leading-6 text-slate-600">
                      Select a card in the Inbox to inspect the supporting quote,
                      confidence, and follow-up actions here.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    Owner inference
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    Source metadata
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    Approval history
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </QueryProvider>
  );
}