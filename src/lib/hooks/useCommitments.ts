"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type CommitmentStatus =
  | "inbox"
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "delegated"
  | "snoozed"
  | "dismissed";

export type SourceSummary = {
  id: string;
  type: string;
  title: string | null;
  url: string | null;
  occurred_at: string | null;
};

export type Commitment = {
  id: string;
  title: string;
  status: CommitmentStatus;
  type: string;
  urgency_score: number;
  importance_score: number;
  due_date: string | null;
  snoozed_until: string | null;
  ai_confidence: number;
  created_by_ai: boolean;
  source_id: string | null;
  source_quote: string;
  owner_id: string | null;
  project_id: string | null;
  source: SourceSummary | null;
};

type MutationContext = {
  previousInbox: Commitment[];
};

export const commitmentQueryKeys = {
  all: ["commitments"] as const,
  inbox: () => [...commitmentQueryKeys.all, "inbox"] as const,
  today: (dateKey: string) => [...commitmentQueryKeys.all, "today", dateKey] as const,
};

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchInboxCommitments(): Promise<Commitment[]> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("commitments")
    .select(
      [
        "id",
        "title",
        "status",
        "type",
        "urgency_score",
        "importance_score",
        "due_date",
        "snoozed_until",
        "ai_confidence",
        "created_by_ai",
        "source_id",
        "source_quote",
        "owner_id",
        "project_id",
        "source:sources(id,type,title,url,occurred_at)",
      ].join(","),
    )
    .eq("status", "inbox")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const source = row.source as unknown as SourceSummary | null | undefined;

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      status: String(row.status) as CommitmentStatus,
      type: String(row.type ?? "task"),
      urgency_score: toNumber(row.urgency_score, 3),
      importance_score: toNumber(row.importance_score, 3),
      due_date: (row.due_date as string | null) ?? null,
      snoozed_until: (row.snoozed_until as string | null) ?? null,
      ai_confidence: toNumber(row.ai_confidence, 0),
      created_by_ai: Boolean(row.created_by_ai),
      source_id: (row.source_id as string | null) ?? null,
      source_quote: String(row.source_quote ?? ""),
      owner_id: (row.owner_id as string | null) ?? null,
      project_id: (row.project_id as string | null) ?? null,
      source: source
        ? {
            id: String(source.id),
            type: String(source.type ?? "manual"),
            title: source.title ?? null,
            url: source.url ?? null,
            occurred_at: source.occurred_at ?? null,
          }
        : null,
    };
  });
}

export function useCommitments() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("commitments-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commitments" },
        () => {
          void queryClient.invalidateQueries({ queryKey: commitmentQueryKeys.inbox() });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: commitmentQueryKeys.inbox(),
    queryFn: fetchInboxCommitments,
    staleTime: 30_000,
  });
}

export function useApproveCommitment() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string, MutationContext>({
    mutationFn: async (commitmentId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("commitments")
        .update({ status: "open" })
        .eq("id", commitmentId);

      if (error) throw new Error(error.message);
      return commitmentId;
    },
    onMutate: async (commitmentId: string) => {
      await queryClient.cancelQueries({ queryKey: commitmentQueryKeys.inbox() });

      const previousInbox =
        queryClient.getQueryData<Commitment[]>(commitmentQueryKeys.inbox()) ?? [];

      queryClient.setQueryData<Commitment[]>(
        commitmentQueryKeys.inbox(),
        (current) => (current ?? []).filter((c) => c.id !== commitmentId),
      );

      return { previousInbox };
    },
    onError: (_error, _commitmentId, context) => {
      if (context) {
        queryClient.setQueryData(commitmentQueryKeys.inbox(), context.previousInbox);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commitmentQueryKeys.all });
    },
  });
}

export function useDismissCommitment() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string, MutationContext>({
    mutationFn: async (commitmentId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("commitments")
        .update({ status: "dismissed" })
        .eq("id", commitmentId);

      if (error) throw new Error(error.message);
      return commitmentId;
    },
    onMutate: async (commitmentId: string) => {
      await queryClient.cancelQueries({ queryKey: commitmentQueryKeys.inbox() });

      const previousInbox =
        queryClient.getQueryData<Commitment[]>(commitmentQueryKeys.inbox()) ?? [];

      queryClient.setQueryData<Commitment[]>(
        commitmentQueryKeys.inbox(),
        (current) => (current ?? []).filter((c) => c.id !== commitmentId),
      );

      return { previousInbox };
    },
    onError: (_error, _commitmentId, context) => {
      if (context) {
        queryClient.setQueryData(commitmentQueryKeys.inbox(), context.previousInbox);
      }
    },
  });
}

type UpdateFieldsInput = {
  id: string;
  urgency_score?: number;
  importance_score?: number;
  due_date?: string | null;
  snoozed_until?: string | null;
  project_id?: string | null;
  owner_id?: string | null;
};

export function useUpdateCommitmentFields() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, UpdateFieldsInput>({
    mutationFn: async (input: UpdateFieldsInput) => {
      const supabase = createClient();
      const { id, ...patch } = input;

      const { error } = await supabase.from("commitments").update(patch).eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commitmentQueryKeys.all });
    },
  });
}