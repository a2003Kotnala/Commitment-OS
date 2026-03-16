import { createAdminClient } from "@/lib/supabase/server";
import { scoreDeterministicRisk } from "@/lib/risk/scorer";
import type { Tables } from "@/types/database";

type CommitmentRow = Tables<"commitments">;

export type DailyPlan = {
  date: string;
  topFocus: CommitmentRow[];
  waitingOn: CommitmentRow[];
  completedToday: CommitmentRow[];
  riskHighlights: Array<{
    commitmentId: string;
    score: number;
    bucket: string;
    factors: string[];
  }>;
  narrative: string;
};

export async function buildDailyPlan(workspaceId: string, userId: string): Promise<DailyPlan> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: commitments, error } = await supabase
    .from("commitments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "in_progress", "blocked", "delegated", "done"])
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to build daily plan: ${error.message}`);
  }

  const rows = (commitments ?? []) as CommitmentRow[];

  const active = rows.filter((item) => item.status !== "done");
  const completedToday = rows.filter(
    (item) => item.status === "done" && (item.completed_at?.startsWith(today) ?? false),
  );

  const topFocus = active
    .filter((item) => item.status === "open" || item.status === "in_progress")
    .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))
    .slice(0, 5);

  const waitingOn = active.filter((item) => item.status === "blocked" || item.status === "delegated");

  const riskHighlights = active
    .map((item) => {
      const scored = scoreDeterministicRisk(item);
      return {
        commitmentId: item.id,
        score: scored.score,
        bucket: scored.bucket,
        factors: scored.factors,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const narrative = `You have ${topFocus.length} focus commitments, ${waitingOn.length} waiting-on items, and ${completedToday.length} completed today.`;

  await supabase.from("daily_plans").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      plan_date: today,
      plan_payload: {
        topFocusIds: topFocus.map((x) => x.id),
        waitingOnIds: waitingOn.map((x) => x.id),
        completedTodayIds: completedToday.map((x) => x.id),
        riskHighlights,
      },
      ai_narrative: narrative,
    },
    { onConflict: "workspace_id,user_id,plan_date" },
  );

  return {
    date: today,
    topFocus,
    waitingOn,
    completedToday,
    riskHighlights,
    narrative,
  };
}