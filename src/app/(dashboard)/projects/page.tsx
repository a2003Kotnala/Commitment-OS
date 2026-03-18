import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

type Member = { id: string; display_name: string | null; email: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default async function ProjectsPage() {
  const result = await requireAuthenticatedUserProfile();
  if (!result.profile?.workspace_id) return <main className="p-6">Missing workspace context.</main>;

  const supabase = createClient();

  const [{ data: projects, error: pErr }, { data: tasks }, { data: users }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description,status,color,created_at")
      .eq("workspace_id", result.profile.workspace_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("commitments")
      .select("id,project_id,owner_id,status")
      .eq("workspace_id", result.profile.workspace_id),
    supabase
      .from("users")
      .select("id,display_name,email")
      .eq("workspace_id", result.profile.workspace_id),
  ]);

  if (pErr) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-4 text-sm text-rose-600">Failed to load projects: {pErr.message}</p>
      </main>
    );
  }

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u as Member]));

  const rows = (projects ?? []).map((project) => {
    const projectTasks = (tasks ?? []).filter((t) => t.project_id === project.id);

    const relevant = projectTasks.filter((t) => t.status !== "dismissed" && t.status !== "inbox");
    const done = relevant.filter((t) => t.status === "done").length;
    const total = relevant.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const memberIds = Array.from(
      new Set(projectTasks.map((t) => t.owner_id).filter(Boolean) as string[]),
    );

    const members = memberIds.map((id) => userMap.get(id)).filter(Boolean) as Member[];

    return { project, pct, done, total, members };
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-2 text-sm text-slate-600">
          Progress and ownership across your workspace.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ project, pct, done, total, members }) => (
          <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: (project.color as string | null) ?? "#2E86AB" }}
                  />
                  <h2 className="truncate font-semibold text-slate-900">{project.name}</h2>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {(project.description as string | null)?.trim() || "No description yet."}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{pct}%</p>
                <p className="text-xs text-slate-500">
                  {done}/{total} done
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Progress value={pct} className="bg-slate-200 [&>div]:bg-[#1B3A5C]" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Members
              </p>

              <div className="flex -space-x-2">
                {members.slice(0, 5).map((m) => {
                  const label = m.display_name ?? m.email ?? "Member";
                  return (
                    <Avatar key={m.id} className="h-8 w-8 border border-white">
                      <AvatarFallback>{initials(label)}</AvatarFallback>
                    </Avatar>
                  );
                })}
                {members.length === 0 ? (
                  <span className="text-xs text-slate-500">Unassigned</span>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No projects found.
          </p>
        ) : null}
      </div>
    </main>
  );
}