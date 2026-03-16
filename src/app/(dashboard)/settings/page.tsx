import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
      <div className="grid gap-3">
        <Link className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50" href="/settings/integrations">
          Integrations
        </Link>
      </div>
    </main>
  );
}