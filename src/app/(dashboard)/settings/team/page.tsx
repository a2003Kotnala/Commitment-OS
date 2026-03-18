import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TeamInviteForm } from "@/components/team/team-invite-form";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return <main className="p-6">Missing workspace.</main>;
  }

  const supabase = createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id,email,display_name,role,created_at")
    .eq("workspace_id", result.profile.workspace_id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Team</h1>
        <p className="mt-2 text-sm text-slate-600">
          Invite teammates so they can collaborate on the same commitments and schedules in real time.
        </p>
      </header>

      <TeamInviteForm />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Members</h2>
        <div className="mt-4 space-y-2">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{m.display_name ?? "Member"}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {m.role}
              </span>
            </div>
          ))}
          {(members ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No members found.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}