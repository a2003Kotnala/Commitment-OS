import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function WaitingOnPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("commitments")
    .select("id, title, status, due_date, urgency_score")
    .eq("workspace_id", result.profile.workspace_id)
    .in("status", ["blocked", "delegated"])
    .order("updated_at", { ascending: false });

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Waiting On</h1>
      <p className="mt-2 text-sm text-slate-600">Blocked or delegated commitments that need follow-up.</p>

      <div className="mt-6 space-y-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              status: {item.status} {item.due_date ? `| due ${item.due_date}` : ""}
            </p>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-500">No waiting-on commitments.</p> : null}
      </div>
    </main>
  );
}