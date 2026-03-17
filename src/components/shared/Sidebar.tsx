"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Hourglass,
  Inbox,
  LogOut,
  Plug,
  Settings,
  Sparkles,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const navigation: Array<{ name: string; href: string; icon: any; badge?: string }> = [
  { name: "Today", href: "/today", icon: CalendarDays },
  { name: "Inbox", href: "/inbox", icon: Inbox, badge: "Live" },
  { name: "Commitments", href: "/commitments", icon: CheckCircle2 },
  { name: "Waiting On", href: "/waiting-on", icon: Hourglass },
  { name: "At Risk", href: "/at-risk", icon: AlertTriangle },
  { name: "Projects", href: "/projects", icon: FolderKanban },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });

      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="hidden h-screen w-full flex-col bg-white md:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1B3A5C] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight text-slate-900">
            Commitment OS
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col px-4 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href as any}
                  className={[
                    isActive
                      ? "bg-slate-100 text-[#1B3A5C]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={[
                        isActive
                          ? "text-[#2E86AB]"
                          : "text-slate-400 group-hover:text-slate-600",
                        "h-5 w-5 shrink-0",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {item.name}
                  </div>

                  {item.badge ? (
                    <span className="inline-flex items-center rounded-full bg-[#2E86AB]/10 px-2 py-0.5 text-xs font-semibold text-[#1B3A5C]">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}

          {/* Settings pinned to bottom */}
          <li className="mt-auto pt-3">
            <div className="group relative px-1">
              {/* Trigger */}
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                  Settings
                </div>
              </div>

              {/* Popup: bottom-full removes the gap */}
              <div
                className={[
                  "absolute bottom-full left-0 right-0 z-50 px-1 pb-2",
                  "invisible opacity-0 translate-y-2 scale-[0.99]",
                  "transition duration-150 ease-out",
                  "group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100",
                  "group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100",
                ].join(" ")}
              >
                <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  {/* Arrow is INSIDE and overlaps downward => no dead gap */}
                  <div className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />

                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="rounded-2xl bg-[#1B3A5C]/10 p-2 text-[#1B3A5C]">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Settings
                      </p>
                      <p className="text-xs text-slate-500">
                        Profile, integrations, session
                      </p>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/settings/profile"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>

                    <Link
                      href="/settings/integrations"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    >
                      <Plug className="h-4 w-4 text-slate-400" />
                      Integrations
                    </Link>

                    <button
                      type="button"
                      onClick={onLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4 text-slate-400" />
                      {isLoggingOut ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </aside>
  );
}