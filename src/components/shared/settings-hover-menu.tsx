"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Plug, Settings, Users, Wand2, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type SettingsHoverMenuProps = {
  placement?: "up" | "down";
  variant?: "icon" | "row";
  align?: "left" | "right";
};

export function SettingsHoverMenu({
  placement = "down",
  variant = "icon",
  align = "left",
}: SettingsHoverMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const side = placement === "up" ? "top" : "bottom";
  const radixAlign = align === "right" ? "end" : "start";

  const trigger = useMemo(() => {
    if (variant === "icon") {
      return (
        <button
          type="button"
          aria-label="Open settings menu"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
        </button>
      );
    }

    return (
      <button
        type="button"
        aria-label="Open settings menu"
        className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-slate-400" />
          Settings
        </div>
      </button>
    );
  }, [variant]);

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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align={radixAlign}
          sideOffset={10}
          collisionPadding={12}
          avoidCollisions
          className={cn(
            "z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10",
            // Dynamic sizing for small screens:
            "w-[min(18rem,calc(100vw-1rem))]",
            // Dynamic height so it never looks broken on small laptops:
            "max-h-[min(70vh,420px)] overflow-y-auto",
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="rounded-2xl bg-[#1B3A5C]/10 p-2 text-[#1B3A5C]">
              <Settings className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Workspace menu</p>
              <p className="text-xs text-slate-500">
                Profile, collaboration, integrations
              </p>
            </div>
          </div>

          <div className="p-2">
            <DropdownMenu.Item asChild>
              <Link
                href="/settings/profile"
                className="flex select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-slate-50"
              >
                <User className="h-4 w-4 text-slate-400" />
                Profile
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/manage-me"
                className="flex select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-slate-50"
              >
                <Wand2 className="h-4 w-4 text-slate-400" />
                Manage Me
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/settings/team"
                className="flex select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-slate-50"
              >
                <Users className="h-4 w-4 text-slate-400" />
                Team
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/settings/integrations"
                className="flex select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-slate-50"
              >
                <Plug className="h-4 w-4 text-slate-400" />
                Integrations
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />

            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                void onLogout();
              }}
              disabled={isLoggingOut}
              className={cn(
                "flex select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none",
                "focus:bg-slate-50",
                "data-[disabled]:opacity-60",
              )}
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              {isLoggingOut ? "Signing out..." : "Logout"}
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}