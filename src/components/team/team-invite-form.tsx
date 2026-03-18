"use client";

import { useState } from "react";

export function TeamInviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onInvite = async () => {
    setMessage(null);
    setIsPending(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Invite failed.");
      }

      setMessage("Invite sent.");
      setEmail("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invite failed.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Invite teammate</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_140px]">
        <input
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>

        <button
          type="button"
          onClick={onInvite}
          disabled={isPending || email.trim().length < 5}
          className="h-11 rounded-xl bg-[#1B3A5C] px-4 text-sm font-medium text-white hover:bg-[#15304B] disabled:opacity-60"
        >
          {isPending ? "Inviting..." : "Invite"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}