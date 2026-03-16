import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CommitmentsPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("commitments")
    .select("id, title, status, type, due_date, urgency_score, importance_score, ai_confidence, created_by_ai")
    .eq("workspace_id", result.profile.workspace_id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Commitments</h1>
        <p className="mt-4 text-sm text-rose-600">Failed to load commitments: {error.message}</p>
      </main>
    );
  }

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Commitments</h1>
        <p className="mt-2 text-sm text-slate-600">All commitments across statuses in your workspace.</p>
      </header>

      <div className="space-y-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  type: {item.type} | status: {item.status}
                  {item.due_date ? ` | due: ${item.due_date}` : ""}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>urgency: {item.urgency_score ?? 0}/5</p>
                <p>importance: {item.importance_score ?? 0}/5</p>
                <p>ai: {Math.round((item.ai_confidence ?? 0) * 100)}%</p>
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No commitments yet.
          </p>
        ) : null}
      </div>
    </main>
  );
}