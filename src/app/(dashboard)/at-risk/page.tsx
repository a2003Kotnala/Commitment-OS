import { scoreDeterministicRisk } from "@/lib/risk/scorer";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AtRiskPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("commitments")
    .select("id, title, status, due_date, urgency_score, importance_score")
    .eq("workspace_id", result.profile.workspace_id)
    .in("status", ["open", "in_progress", "blocked", "delegated"]);

  const scored = (data ?? []).map((item) => ({
    item,
    risk: scoreDeterministicRisk(item),
  }));

  const grouped = {
    overdue: scored.filter((x) => x.risk.bucket === "overdue"),
    highRisk: scored.filter((x) => x.risk.bucket === "high_risk"),
    watch: scored.filter((x) => x.risk.bucket === "watch"),
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">At Risk</h1>

      {[
        { label: "Overdue", rows: grouped.overdue },
        { label: "High Risk", rows: grouped.highRisk },
        { label: "Watch", rows: grouped.watch },
      ].map((section) => (
        <section key={section.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
          <div className="mt-4 space-y-3">
            {section.rows.map(({ item, risk }) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  risk {(risk.score * 100).toFixed(0)}% | {risk.factors.join(", ")}
                </p>
              </article>
            ))}
            {section.rows.length === 0 ? (
              <p className="text-sm text-slate-500">No items in this section.</p>
            ) : null}
          </div>
        </section>
      ))}
    </main>
  );
}