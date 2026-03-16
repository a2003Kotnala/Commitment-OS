import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return <main className="p-6">Missing workspace context.</main>;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, status, color, created_at")
    .eq("workspace_id", result.profile.workspace_id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-4 text-sm text-rose-600">Failed to load projects: {error.message}</p>
      </main>
    );
  }

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-2 text-sm text-slate-600">Workspace projects tied to commitments.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((project) => (
          <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color ?? "#2E86AB" }}
              />
              <h2 className="font-semibold text-slate-900">{project.name}</h2>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              {project.description?.trim() || "No project description yet."}
            </p>

            <p className="mt-3 text-xs text-slate-500">status: {project.status ?? "active"}</p>
          </article>
        ))}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No projects found for this workspace.
          </p>
        ) : null}
      </div>
    </main>
  );
}