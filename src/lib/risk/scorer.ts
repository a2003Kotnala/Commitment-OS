import type { Tables } from "@/types/database";

export type CommitmentRiskBucket = "overdue" | "high_risk" | "watch" | "healthy";

export type DeterministicRiskResult = {
  commitmentId: string;
  score: number; // 0..1
  bucket: CommitmentRiskBucket;
  factors: string[];
};

type CommitmentRow = Pick<
  Tables<"commitments">,
  "id" | "status" | "due_date" | "urgency_score" | "importance_score"
>;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysUntil(dueDate: string): number {
  const today = new Date(toDateOnly(new Date()));
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const diffMs = due.valueOf() - today.valueOf();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function scoreDeterministicRisk(commitment: CommitmentRow): DeterministicRiskResult {
  const factors: string[] = [];
  let score = 0.05;

  if (commitment.status === "blocked") {
    score += 0.35;
    factors.push("Blocked status");
  }

  if (commitment.status === "delegated") {
    score += 0.2;
    factors.push("Delegated ownership");
  }

  if (commitment.urgency_score && commitment.urgency_score >= 4) {
    score += 0.15;
    factors.push("High urgency");
  }

  if (commitment.importance_score && commitment.importance_score >= 4) {
    score += 0.1;
    factors.push("High importance");
  }

  if (commitment.due_date) {
    const delta = daysUntil(commitment.due_date);

    if (delta < 0) {
      score = 1;
      factors.push("Overdue");
    } else if (delta <= 1) {
      score += 0.35;
      factors.push("Due within 24 hours");
    } else if (delta <= 3) {
      score += 0.2;
      factors.push("Due within 3 days");
    }
  } else {
    score += 0.05;
    factors.push("No due date");
  }

  const bounded = Math.max(0, Math.min(1, Number(score.toFixed(3))));

  let bucket: CommitmentRiskBucket = "healthy";
  if (bounded >= 0.9 || factors.includes("Overdue")) bucket = "overdue";
  else if (bounded >= 0.65) bucket = "high_risk";
  else if (bounded >= 0.4) bucket = "watch";

  return {
    commitmentId: commitment.id,
    score: bounded,
    bucket,
    factors,
  };
}