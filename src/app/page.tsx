import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-24">
      <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          AI Commitment OS
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
          Work is created conversationally but tracked manually.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          This repository is bootstrapped for the Commitment Intelligence Platform
          foundation. Auth, Supabase wiring, and core schema follow next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-primary/90"
            href="/login"
          >
            Go to login
          </Link>
          <Link
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/signup"
          >
            Create workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
