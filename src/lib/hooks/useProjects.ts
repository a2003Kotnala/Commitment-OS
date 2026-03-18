"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ProjectOption = {
  id: string;
  name: string;
  color: string | null;
};

export const projectQueryKeys = {
  all: ["projects"] as const,
  list: () => [...projectQueryKeys.all, "list"] as const,
};

async function fetchProjects(): Promise<ProjectOption[]> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id,name,color")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "Project",
    color: (row.color as string | null) ?? null,
  }));
}

export function useProjects() {
  return useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: fetchProjects,
    staleTime: 60_000,
  });
}