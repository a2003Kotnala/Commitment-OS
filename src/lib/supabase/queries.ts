import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { CommitmentRecord, UserProfile, Workspace } from "@/types";

export async function getAuthenticatedUserProfile() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  return {
    authUser: user,
    profile: profile as UserProfile | null
  };
}

export async function requireAuthenticatedUserProfile() {
  const result = await getAuthenticatedUserProfile();

  if (!result?.authUser) {
    redirect("/login");
  }

  return result;
}

export async function getWorkspaceForCurrentUser() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return null;
  }

  const supabase = createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", result.profile.workspace_id)
    .maybeSingle();

  return workspace as Workspace | null;
}

export async function getInboxCommitmentsForCurrentUser() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.profile?.workspace_id) {
    return [] satisfies CommitmentRecord[];
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("commitments")
    .select("*")
    .eq("workspace_id", result.profile.workspace_id)
    .eq("status", "inbox")
    .order("created_at", { ascending: false });

  return (data ?? []) as CommitmentRecord[];
}
