"use client";

import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";

type GeneratedItem = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
};

export default function ManageMePage() {
  const [title, setTitle] = useState("Transcript import");
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [items, setItems] = useState<GeneratedItem[]>([]);

  const canSubmit = useMemo(() => text.trim().length >= 10, [text]);

  const onGenerate = async () => {
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch("/api/manage-me/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; sourceId: string; commitments: GeneratedItem[] }
        | { ok?: false; error?: string };

      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        throw new Error((json as any)?.error ?? "Failed to process text.");
      }

      setSourceId(json.sourceId);
      setItems(json.commitments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate schedule.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Manage Me
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Paste anything → get a schedule
        </h1>
        <p className="text-sm text-slate-600">
          Paste meeting transcripts or notes. We’ll turn them into a structured schedule table.
          (Deterministic parsing now; later you can switch to AI.)
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Title</label>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canSubmit || isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#15304B] disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              {isPending ? "Generating..." : "Generate schedule"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-900">Paste transcript / notes</label>
          <textarea
            className="mt-2 h-56 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="- Send proposal to client by Friday
- Follow up with legal next week
- Schedule Zoom with design team"
          />
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          {sourceId ? (
            <p className="mt-2 text-xs text-slate-500">
              Source created: <span className="font-mono">{sourceId}</span>
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Generated schedule</h2>
        <p className="mt-1 text-sm text-slate-600">
          These commitments are created in your Inbox for review.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                  <td className="px-4 py-3 text-slate-600">{item.status}</td>
                  <td className="px-4 py-3 text-slate-600">{item.due_date ?? "-"}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    Paste notes and generate a schedule.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}