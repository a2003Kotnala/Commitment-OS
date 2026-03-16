import { buildDailyPlan } from "@/lib/planning/daily-plan";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id || !result.authUser) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const plan = await buildDailyPlan(result.profile.workspace_id, result.authUser.id);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Today</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Daily plan</h1>
        <p className="text-sm text-slate-600">{plan.narrative}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Top focus</h2>
          <ul className="mt-4 space-y-3">
            {plan.topFocus.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">urgency {item.urgency_score ?? 0}/5</p>
              </li>
            ))}
            {plan.topFocus.length === 0 ? <li className="text-sm text-slate-500">No focus commitments.</li> : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Waiting on</h2>
          <ul className="mt-4 space-y-3">
            {plan.waitingOn.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">status: {item.status}</p>
              </li>
            ))}
            {plan.waitingOn.length === 0 ? <li className="text-sm text-slate-500">Nothing blocked.</li> : null}
          </ul>
        </div>
      </section>
    </main>
  );
}