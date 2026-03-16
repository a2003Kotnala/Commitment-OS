"use client";

import type { KeyboardEvent } from "react";
import { Check, Sparkles, X } from "lucide-react";

import type { Commitment } from "@/lib/hooks/useCommitments";

type CommitmentCardProps = {
  commitment: Commitment;
  selected?: boolean;
  onSelect?: (commitment: Commitment) => void;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
  isApproving?: boolean;
  isDismissing?: boolean;
};

type SourceMeta = {
  label: string;
  className: string;
};

function normalizeConfidence(value: number): number {
  const scaledValue = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(scaledValue)));
}

function normalizeUrgency(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function getConfidenceTone(confidence: number): {
  barClassName: string;
  textClassName: string;
} {
  if (confidence >= 85) {
    return {
      barClassName: "bg-emerald-500",
      textClassName: "text-emerald-700",
    };
  }

  if (confidence >= 60) {
    return {
      barClassName: "bg-amber-400",
      textClassName: "text-amber-700",
    };
  }

  return {
    barClassName: "bg-rose-500",
    textClassName: "text-rose-700",
  };
}

function getSourceMeta(type: string): SourceMeta {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType.includes("zoom")) {
    return {
      label: "Zoom",
      className: "border-purple-200 bg-purple-50 text-purple-700",
    };
  }

  if (normalizedType.includes("slack")) {
    return {
      label: "Slack",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalizedType.includes("gmail") || normalizedType.includes("email")) {
    return {
      label: "Gmail",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (
    normalizedType.includes("calendar") ||
    normalizedType.includes("gcal")
  ) {
    return {
      label: "Calendar",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: type || "Source",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  };
}

export function CommitmentCard({
  commitment,
  selected = false,
  onSelect,
  onApprove,
  onDismiss,
  isApproving = false,
  isDismissing = false,
}: CommitmentCardProps) {
  const sourceMeta = getSourceMeta(commitment.type);
  const confidence = normalizeConfidence(commitment.ai_confidence);
  const urgency = normalizeUrgency(commitment.urgency_score);
  const confidenceTone = getConfidenceTone(confidence);
  const isAISuggested =
    commitment.created_by_ai && commitment.status === "inbox";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(commitment);
    }
  };

  return (
    <article
      className={[
        "rounded-3xl border bg-white p-5 shadow-sm transition-all",
        selected
          ? "border-[#2E86AB]/40 ring-2 ring-[#2E86AB]/15"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-md",
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
                AI Suggested
              </span>
            ) : null}
          </div>

          <h3 className="text-base font-semibold leading-7 text-slate-900 sm:text-lg">
            {commitment.title}
          </h3>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Urgency
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={`${commitment.id}-urgency-${index}`}
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  index < urgency ? "bg-[#1B3A5C]" : "bg-slate-200",
                ].join(" ")}
              />
            ))}
          </div>

          <p className="mt-2 text-sm font-medium text-slate-700">
            {urgency}/5
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Source quote
        </p>

        <blockquote className="mt-2 text-sm leading-6 text-slate-700">
          {commitment.source_quote.trim().length > 0
            ? commitment.source_quote
            : "No source quote captured yet."}
        </blockquote>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <span>AI confidence</span>
            <span className={confidenceTone.textClassName}>{confidence}%</span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={[
                "h-full rounded-full transition-[width]",
                confidenceTone.barClassName,
              ].join(" ")}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {onApprove || onDismiss ? (
          <div className="flex items-center justify-end gap-2">
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
      </div>
    </article>
  );
}