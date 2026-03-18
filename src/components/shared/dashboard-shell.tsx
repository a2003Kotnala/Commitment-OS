"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FileText, Inbox, PanelRightOpen, Sparkles } from "lucide-react";

import { Sidebar } from "@/components/shared/Sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

const STORAGE_KEY = "commitment_os_sidebar_collapsed";

export function DashboardShell({ children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setIsCollapsed(stored === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const gridColsClass = useMemo(() => {
    const collapsed = "md:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[72px_minmax(0,1fr)_360px]";
    const expanded = "md:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_360px]";
    return isCollapsed ? collapsed : expanded;
  }, [isCollapsed]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className={["mx-auto grid min-h-screen max-w-[1800px]", gridColsClass].join(" ")}>
        <Sidebar collapsed={isCollapsed} onToggleCollapsed={() => setIsCollapsed((v) => !v)} />

        <main className="min-w-0 bg-slate-50">
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
                  Context rail
                </p>
                <h2 className="text-lg font-semibold text-slate-900">Source & history</h2>
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-[#2E86AB]/30 bg-slate-50 p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2E86AB]/10 px-3 py-1 text-xs font-semibold text-[#1B3A5C]">
                <Sparkles className="h-3.5 w-3.5" />
                Ready for task selection
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Next: when you click a task in Inbox/Today, show the original quote,
                source link, owner, and change history here.
              </p>
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2 text-purple-700">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selected task preview</p>
                  <p className="text-xs text-slate-500">Connect selection state later.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Quote evidence
                </p>
                <div className="mt-3 flex gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                  <p className="text-sm leading-6 text-slate-600">
                    Select a task to inspect its originating message/transcript snippet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}