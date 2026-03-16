import Link from "next/link";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-slate-100 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70" href="/">
            AI Commitment OS
          </Link>
          <div className="mt-16 max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent/80">{eyebrow}</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Capture promises before they become invisible work.
            </h1>
            <p className="mt-6 text-lg text-white/75">
              This platform turns meetings, messages, and emails into structured commitments
              with ownership, deadlines, and auditability.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
          <p className="text-sm font-medium text-white/70">Operating model</p>
          <p className="mt-3 text-xl font-medium">
            Work is created conversationally but tracked manually. We fix that.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <Link className="text-sm font-semibold uppercase tracking-[0.3em] text-primary" href="/">
              AI Commitment OS
            </Link>
          </div>
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-3 text-base text-slate-600">{description}</p>
          </div>
          {children}
          {footer ? <div className="mt-6 text-sm text-slate-500">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
