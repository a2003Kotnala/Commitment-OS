"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Inbox,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { CommitmentList } from "@/components/commitment/CommitmentList";
import {
  useApproveCommitment,
  useCommitments,
  useDismissCommitment,
} from "@/lib/hooks/useCommitments";

function normalizeConfidence(value: number): number {
  const scaledValue = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(scaledValue)));
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`commitment-skeleton-${index}`}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-3">
                <div className="h-6 w-24 rounded-full bg-slate-200" />
                <div className="h-6 w-72 rounded-xl bg-slate-200" />
              </div>
              <div className="h-20 w-24 rounded-2xl bg-slate-200" />
            </div>

            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="h-2.5 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);

  const {
    data: commitments = [],
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useCommitments();

  const approveCommitment = useApproveCommitment();
  const dismissCommitment = useDismissCommitment();

  const filteredCommitments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return commitments;
    }

    return commitments.filter((commitment) =>
      [commitment.title, commitment.type, commitment.source_quote].some(
        (field) => field.toLowerCase().includes(query),
      ),
    );
  }, [commitments, searchValue]);

  useEffect(() => {
    if (filteredCommitments.length === 0) {
      setSelectedCommitmentId(null);
      return;
    }

    const hasSelectedCommitment = filteredCommitments.some(
      (commitment) => commitment.id === selectedCommitmentId,
    );

    if (!hasSelectedCommitment) {
      setSelectedCommitmentId(filteredCommitments[0].id);
    }
  }, [filteredCommitments, selectedCommitmentId]);

  const aiSuggestedCount = commitments.filter(
    (commitment) =>
      commitment.created_by_ai && commitment.status === "inbox",
  ).length;

  const highConfidenceCount = commitments.filter(
    (commitment) => normalizeConfidence(commitment.ai_confidence) >= 85,
  ).length;

  const mutationError =
    approveCommitment.error ?? dismissCommitment.error;

  const emptyStateTitle =
    commitments.length === 0
      ? "Your inbox is clear"
      : "No commitments match this search";

  const emptyStateDescription =
    commitments.length === 0
      ? "New commitments from Slack, Zoom, Gmail, and Calendar will appear here once ingestion is connected."
      : "Try a broader title, source quote, or source type search.";

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#1B3A5C] shadow-sm ring-1 ring-slate-200">
            <Inbox className="h-3.5 w-3.5" />
            Inbox
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Review detected commitments
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Approve what should become active work, dismiss the noise, and
              prepare the right rail for deeper context once selection state is
              shared globally.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <div className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              {commitments.length} awaiting review
            </div>

            <div className="rounded-full bg-[#2E86AB]/10 px-3 py-1.5 text-[#1B3A5C] ring-1 ring-[#2E86AB]/10">
              {aiSuggestedCount} AI suggested
            </div>

            <div className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              {highConfidenceCount} high confidence
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search title, source quote, or source type"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2E86AB] focus:ring-4 focus:ring-[#2E86AB]/10"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {searchValue.trim().length > 0
                ? `${filteredCommitments.length} matching result${
                    filteredCommitments.length === 1 ? "" : "s"
                  }`
                : "Live inbox synced from Supabase Realtime"}
            </span>

            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {mutationError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <p>
            {mutationError.message ||
              "Something went wrong while updating a commitment."}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Could not load inbox commitments
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {error instanceof Error
                    ? error.message
                    : "Please verify your Supabase connection and session, then try again."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#15304B]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : filteredCommitments.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E86AB]/10 text-[#1B3A5C]">
            {commitments.length === 0 ? (
              <Inbox className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </div>

          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            {emptyStateTitle}
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {emptyStateDescription}
          </p>
        </div>
      ) : (
        <CommitmentList
          commitments={filteredCommitments}
          selectedCommitmentId={selectedCommitmentId}
          onSelect={(commitment) => setSelectedCommitmentId(commitment.id)}
          onApprove={(id) => approveCommitment.mutate(id)}
          onDismiss={(id) => dismissCommitment.mutate(id)}
          approvingId={
            approveCommitment.isPending
              ? approveCommitment.variables ?? null
              : null
          }
          dismissingId={
            dismissCommitment.isPending
              ? dismissCommitment.variables ?? null
              : null
          }
        />
      )}
    </section>
  );
}