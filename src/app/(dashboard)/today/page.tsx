"use client";

import { useMemo } from "react";
import { addDays, formatISO, isBefore, parseISO } from "date-fns";
import { CheckCircle2, CalendarDays, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Row = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  snoozed_until: string | null;
  project_id: string | null;
};

const queryKey = ["today-board"] as const;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchTodayBoard(): Promise<Row[]> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("commitments")
    .select("id,title,status,due_date,snoozed_until,project_id")
    .in("status", ["open", "in_progress", "blocked", "delegated", "snoozed"])
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    status: String(r.status ?? "open"),
    due_date: (r.due_date as string | null) ?? null,
    snoozed_until: (r.snoozed_until as string | null) ?? null,
    project_id: (r.project_id as string | null) ?? null,
  }));
}

export default function TodayPage() {
  const qc = useQueryClient();
  const today = todayKey();
  const tomorrow = formatISO(addDays(new Date(today), 1), { representation: "date" });

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchTodayBoard,
    staleTime: 30_000,
  });

  const schedule = useMutation({
    mutationFn: async (input: { id: string; snoozed_until: string | null }) => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("commitments")
        .update({ snoozed_until: input.snoozed_until })
        .eq("id", input.id);
      if (e) throw new Error(e.message);
      return input.id;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey });
    },
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("commitments")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (e) throw new Error(e.message);
      return id;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey });
    },
  });

  const categorized = useMemo(() => {
    const todayDate = new Date(today);
    const isOverdue = (r: Row) =>
      r.due_date ? isBefore(parseISO(r.due_date), todayDate) : false;

    const scheduledFor = (r: Row, dateStr: string) =>
      r.snoozed_until ? r.snoozed_until.slice(0, 10) === dateStr : false;

    const overdue = rows.filter(isOverdue);
    const doToday = rows.filter((r) => !isOverdue(r) && (scheduledFor(r, today) || r.due_date === today));
    const upcoming = rows.filter((r) => !isOverdue(r) && !scheduledFor(r, today) && r.due_date !== today);

    return { overdue, doToday, upcoming };
  }, [rows, today]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-0 py-2">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#1B3A5C] shadow-sm ring-1 ring-slate-200">
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">What needs to be done</h1>
        <p className="text-sm text-slate-600">
          Focus on a short, realistic list. If it can’t fit today, schedule it for tomorrow.
        </p>
      </header>

      {isError ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700">
          {error instanceof Error ? error.message : "Failed to load today board."}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Do today</h2>
            <div className="mt-4 space-y-3">
              {categorized.doToday.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{t.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => markDone.mutate(t.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1B3A5C] px-3 py-2 text-sm font-medium text-white hover:bg-[#15304B]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => schedule.mutate({ id: t.id, snoozed_until: `${tomorrow}T09:00:00.000Z` })}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Clock className="h-4 w-4" />
                      Tomorrow
                    </button>
                  </div>
                </div>
              ))}
              {categorized.doToday.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing scheduled for today.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Overdue</h2>
            <p className="mt-1 text-sm text-slate-600">These need attention first.</p>
            <div className="mt-4 space-y-3">
              {categorized.overdue.map((t) => (
                <div key={t.id} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                  <p className="font-medium text-slate-900">{t.title}</p>
                  <p className="mt-1 text-xs text-slate-600">due: {t.due_date}</p>
                </div>
              ))}
              {categorized.overdue.length === 0 ? (
                <p className="text-sm text-slate-500">No overdue tasks.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming</h2>
            <p className="mt-1 text-sm text-slate-600">Schedule what doesn’t fit today.</p>
            <div className="mt-4 space-y-3">
              {categorized.upcoming.slice(0, 8).map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{t.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.due_date ? `due: ${t.due_date}` : "no due date"}
                  </p>
                </div>
              ))}
              {categorized.upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming tasks.</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}