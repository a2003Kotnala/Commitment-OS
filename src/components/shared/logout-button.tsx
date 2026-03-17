"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setError(null);
    setIsPending(true);

    try {
      // Clear browser auth state (client)
      const supabase = createClient();
      await supabase.auth.signOut();

      // Clear server cookies/session (server)
      await fetch("/api/auth/logout", { method: "POST" });

      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logout failed.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={onLogout}
        disabled={isPending}
        className="w-full justify-start"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isPending ? "Signing out..." : "Logout"}
      </Button>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}