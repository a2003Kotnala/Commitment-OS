"use client";

import type { KeyboardEvent } from "react";
import { Check, Sparkles, X } from "lucide-react";

import type { Commitment } from "@/lib/hooks/useCommitments";
import type { ProjectOption } from "@/lib/hooks/useProjects";

type CommitmentCardProps = {
  commitment: Commitment;
  projects: ProjectOption[];
  selected?: boolean;
  onSelect?: (commitment: Commitment) => void;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onUpdate?: (input: {
    id: string;
    urgency_score?: number;
    importance_score?: number;
    due_date?: string | null;
    project_id?: string | null;
  }) => void;
  isApproving?: boolean;
  isDismissing?: boolean;
};

type SourceMeta = {
  label: string;
  className: string;
};

function getSourceMeta(sourceType: string): SourceMeta {
  const normalizedType = sourceType.trim().toLowerCase();

  if (normalizedType.includes("zoom")) {
    return { label: "Zoom", className: "border-purple-200 bg-purple-50 text-purple-700" };
  }
  if (normalizedType.includes("slack")) {
    return { label: "Slack", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (normalizedType.includes("gmail") || normalizedType.includes("email") || normalizedType.includes("outlook")) {
    return { label: "Email", className: "border-red-200 bg-red-50 text-red-700" };
  }
  if (normalizedType.includes("calendar")) {
    return { label: "Calendar", className: "border-blue-200 bg-blue-50 text-blue-700" };
  }
  if (normalizedType.includes("manual")) {
    return { label: "Manual", className: "border-slate-200 bg-slate-100 text-slate-700" };
  }
  return { label: sourceType || "Source", className: "border-slate-200 bg-slate-100 text-slate-700" };
}

type PriorityLevel = "low" | "normal" | "high" | "critical";

function priorityFromScores(urgency: number, importance: number): PriorityLevel {
  const score = Math.round((urgency + importance) / 2);
  if (score >= 5) return "critical";
  if (score >= 4) return "high";
  if (score >= 3) return "normal";
  return "low";
}

function scoresFromPriority(priority: PriorityLevel): { urgency: number; importance: number } {
  if (priority === "critical") return { urgency: 5, importance: 5 };
  if (priority === "high") return { urgency: 4, importance: 4 };
  if (priority === "normal") return { urgency: 3, importance: 3 };
  return { urgency: 2, importance: 2 };
}

function labelForPriority(priority: PriorityLevel): string {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  if (priority === "normal") return "Normal";
  return "Low";
}

export function CommitmentCard({
  commitment,
  projects,
  selected = false,
  onSelect,
  onApprove,
  onDismiss,
  onUpdate,
  isApproving = false,
  isDismissing = false,
}: CommitmentCardProps) {
  const sourceType = commitment.source?.type ?? "manual";
  const sourceMeta = getSourceMeta(sourceType);
  const isAISuggested = commitment.created_by_ai && commitment.status === "inbox";
  const priority = priorityFromScores(commitment.urgency_score, commitment.importance_score);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSelect) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(commitment);
    }
  };

  return (
    <article
      className={[
        "rounded-3xl border bg-white p-5 shadow-sm transition-all",
        selected ? "border-[#2E86AB]/40 ring-2 ring-[#2E86AB]/15" : "border-slate-200/80 hover:border-slate-300 hover:shadow-md",
        isAISuggested ? "border-dashed" : "border-solid",
        onSelect ? "cursor-pointer" : "",
      ].join(" ")}
      onClick={onSelect ? () => onSelect(commitment) : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                sourceMeta.className,
              ].join(" ")}
            >
              {sourceMeta.label}
            </span>

            {isAISuggested ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#2E86AB]/40 bg-[#2E86AB]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3A5C]">
                <Sparkles className="h-3.5 w-3.5" />
                Suggested
              </span>
            ) : null}
          </div>

          <h3 className="text-base font-semibold leading-7 text-slate-900 sm:text-lg">
            {commitment.title}
          </h3>

          {commitment.source?.title ? (
            <p className="text-xs text-slate-500">from: {commitment.source.title}</p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => {
              const next = e.target.value as PriorityLevel;
              const mapped = scoresFromPriority(next);
              onUpdate?.({
                id: commitment.id,
                urgency_score: mapped.urgency,
                importance_score: mapped.importance,
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
          >
            <option value="low">{labelForPriority("low")}</option>
            <option value="normal">{labelForPriority("normal")}</option>
            <option value="high">{labelForPriority("high")}</option>
            <option value="critical">{labelForPriority("critical")}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Source quote
          </p>
          <blockquote className="text-sm leading-6 text-slate-700">
            {commitment.source_quote.trim().length > 0 ? commitment.source_quote : "No quote captured."}
          </blockquote>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Due date
            </label>
            <input
              type="date"
              value={commitment.due_date ?? ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                onUpdate?.({ id: commitment.id, due_date: value.length > 0 ? value : null });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Project
            </label>
            <select
              value={commitment.project_id ?? ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                onUpdate?.({ id: commitment.id, project_id: value.length > 0 ? value : null });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {onApprove || onDismiss ? (
        <div className="mt-5 flex items-center justify-end gap-2">
          {onDismiss ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(commitment.id);
              }}
              disabled={isApproving || isDismissing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              {isDismissing ? "Dismissing..." : "Dismiss"}
            </button>
          ) : null}

          {onApprove ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onApprove(commitment.id);
              }}
              disabled={isApproving || isDismissing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B3A5C] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#15304B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isApproving ? "Approving..." : "Approve"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}