import type { Tables } from "@/types/database";

export type CommitmentStatus =
  | "inbox"
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "delegated"
  | "snoozed"
  | "dismissed";

export type CommitmentType =
  | "task"
  | "request"
  | "promise"
  | "question"
  | "decision"
  | "follow_up"
  | "reminder";

export type SourceType =
  | "zoom"
  | "slack"
  | "gmail"
  | "google_calendar"
  | "browser"
  | "manual"
  | "jira"
  | "github"
  | "notion";

export type ConfidenceLevel = "high" | "medium" | "low";

export type WorkspacePlan = Tables<"workspaces">["plan"];
export type IntegrationType = Tables<"integrations">["type"];
export type NotificationType = Tables<"notifications">["type"];

export type Workspace = Tables<"workspaces">;
export type UserProfile = Tables<"users">;
export type Project = Tables<"projects">;
export type Contact = Tables<"contacts">;
export type Source = Tables<"sources">;
export type Integration = Tables<"integrations">;
export type AiAction = Tables<"ai_actions">;
export type Notification = Tables<"notifications">;
export type CommitmentRelationship = Tables<"commitment_relationships">;

export type Commitment = {
  id: string;
  title: string;
  description?: string | null;
  status: CommitmentStatus;
  type: CommitmentType;
  owner_id?: string | null;
  counterparty_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  due_date_confidence?: number | null;
  urgency_score: 1 | 2 | 3 | 4 | 5;
  importance_score: 1 | 2 | 3 | 4 | 5;
  effort_estimate_hours?: number | null;
  ai_confidence: number;
  ai_reasoning?: string | null;
  source_id?: string | null;
  source_quote?: string | null;
  context_snapshot?: Record<string, unknown> | null;
  risk_score?: number | null;
  created_by_ai: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  approved_at?: string | null;
  approved_by_id?: string | null;
  snoozed_until?: string | null;
  recurrence_rule?: string | null;
  completion_signal?: Tables<"commitments">["completion_signal"];
};

export type CommitmentRecord = Tables<"commitments">;

export type WorkspaceMember = UserProfile & {
  workspace?: Workspace | null;
};
