"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  CalendarDays,
  ChevronLeft,
  FolderKanban,
  Inbox,
  Menu,
  Sparkles,
  Wand2,
} from "lucide-react";

import { SettingsHoverMenu } from "@/components/shared/settings-hover-menu";

type NavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: true }>;
  badge?: string;
};

const navigation: NavItem[] = [
  { name: "Today", href: "/today", icon: CalendarDays },
  { name: "Inbox", href: "/inbox", icon: Inbox, badge: "Live" },
  { name: "Manage Me", href: "/manage-me", icon: Wand2 },
  { name: "Projects", href: "/projects", icon: FolderKanban },
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-full flex-col border-r border-slate-200/80 bg-white md:flex">
      <div
        className={[
          "flex h-16 shrink-0 items-center border-b border-slate-200/70",
          collapsed ? "px-2" : "px-4",
        ].join(" ")}
      >
        {collapsed ? (
          <div className="flex w-full items-center justify-center">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B3A5C] text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>

            <p className="truncate font-semibold tracking-tight text-slate-900">
              Commitment OS
            </p>

            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <nav
        className={[
          "flex flex-1 flex-col",
          collapsed ? "px-2 py-3" : "px-4 py-4",
        ].join(" ")}
      >
        <ul role="list" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            if (collapsed) {
              return (
                <li key={item.name} className="flex justify-center">
                  <Link
                    href={item.href}
                    title={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                      isActive
                        ? "bg-slate-100 text-[#1B3A5C]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <item.icon
                      className={[
                        "h-5 w-5",
                        isActive ? "text-[#2E86AB]" : "text-slate-400",
                      ].join(" ")}
                      aria-hidden={true}
                    />
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "group flex h-11 w-full items-center rounded-2xl px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 text-[#1B3A5C]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <item.icon
                      className={[
                        isActive
                          ? "text-[#2E86AB]"
                          : "text-slate-400 group-hover:text-slate-600",
                        "h-5 w-5 shrink-0",
                      ].join(" ")}
                      aria-hidden={true}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.badge ? (
                    <span className="ml-auto inline-flex items-center rounded-full bg-[#2E86AB]/10 px-2 py-0.5 text-xs font-semibold text-[#1B3A5C]">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}

          <li className="mt-auto pt-3">
            <div className={collapsed ? "flex justify-center" : ""}>
              <SettingsHoverMenu
                placement="up"
                align="left"
                variant={collapsed ? "icon" : "row"}
              />
            </div>
          </li>
        </ul>
      </nav>
    </aside>
  );
}