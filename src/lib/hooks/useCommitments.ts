"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type Commitment = {
  id: string;
  title: string;
  status: "inbox" | "open" | "done";
  type: string;
  urgency_score: number;
  ai_confidence: number;
  source_quote: string;
  created_by_ai: boolean;
  source_id: string;
};

type MutationContext = {
  previousInbox: Commitment[];
};

export const commitmentQueryKeys = {
  all: ["commitments"] as const,
  inbox: () => [...commitmentQueryKeys.all, "inbox"] as const,
};

async function fetchInboxCommitments(): Promise<Commitment[]> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("commitments")
    .select(
      "id, title, status, type, urgency_score, ai_confidence, source_quote, created_by_ai, source_id",
    )
    .eq("status", "inbox")
    .order("urgency_score", { ascending: false })
    .order("ai_confidence", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Commitment[];

  return rows.map((row) => ({
    ...row,
    type: row.type ?? "unknown",
    source_quote: row.source_quote ?? "",
    urgency_score: Number(row.urgency_score),
    ai_confidence: Number(row.ai_confidence),
    created_by_ai: Boolean(row.created_by_ai),
  }));
}

export function useCommitments() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("commitments-inbox-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commitments",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: commitmentQueryKeys.inbox(),
          });
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

      if (error) {
        throw new Error(error.message);
      }

      return commitmentId;
    },
    onMutate: async (commitmentId: string) => {
      await queryClient.cancelQueries({
        queryKey: commitmentQueryKeys.inbox(),
      });

      const previousInbox =
        queryClient.getQueryData<Commitment[]>(
          commitmentQueryKeys.inbox(),
        ) ?? [];

      queryClient.setQueryData<Commitment[]>(
        commitmentQueryKeys.inbox(),
        (current) =>
          (current ?? []).filter(
            (commitment) => commitment.id !== commitmentId,
          ),
      );

      return { previousInbox };
    },
    onError: (_error, _commitmentId, context) => {
      if (context) {
        queryClient.setQueryData<Commitment[]>(
          commitmentQueryKeys.inbox(),
          context.previousInbox,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: commitmentQueryKeys.all,
      });
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

      if (error) {
        throw new Error(error.message);
      }

      return commitmentId;
    },
    onMutate: async (commitmentId: string) => {
      await queryClient.cancelQueries({
        queryKey: commitmentQueryKeys.inbox(),
      });

      const previousInbox =
        queryClient.getQueryData<Commitment[]>(
          commitmentQueryKeys.inbox(),
        ) ?? [];

      queryClient.setQueryData<Commitment[]>(
        commitmentQueryKeys.inbox(),
        (current) =>
          (current ?? []).filter(
            (commitment) => commitment.id !== commitmentId,
          ),
      );

      return { previousInbox };
    },
    onError: (_error, _commitmentId, context) => {
      if (context) {
        queryClient.setQueryData<Commitment[]>(
          commitmentQueryKeys.inbox(),
          context.previousInbox,
        );
      }
    },
  });
}