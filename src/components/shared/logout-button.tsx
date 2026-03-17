"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutIconButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onLogout = async () => {
    setIsPending(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });

      router.replace("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onLogout}
      disabled={isPending}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? "..." : "Logout"}
    </Button>
  );
}