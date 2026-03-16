"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  AlertTriangle, 
  CalendarDays, 
  CheckCircle2, 
  FolderKanban, 
  Hourglass, 
  Inbox, 
  Settings, 
  Sparkles 
} from "lucide-react";

const navigation: Array<{ name: string; href: string; icon: any; badge?: string }> = [
    { name: "Today", href: "/today", icon: CalendarDays },
    { name: "Inbox", href: "/inbox", icon: Inbox, badge: "Live" },
    { name: "Commitments", href: "/commitments", icon: CheckCircle2 },
    { name: "Waiting On", href: "/waiting-on", icon: Hourglass },
    { name: "At Risk", href: "/at-risk", icon: AlertTriangle },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-full flex-col bg-white md:flex">
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
                        isActive ? "text-[#2E86AB]" : "text-slate-400 group-hover:text-slate-600",
                        "h-5 w-5 shrink-0",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {item.name}
                  </div>
                  {item.badge && (
                    <span className="inline-flex items-center rounded-full bg-[#2E86AB]/10 px-2 py-0.5 text-xs font-semibold text-[#1B3A5C]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}