export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_actions: {
        Row: {
          action_type:
            | "extract"
            | "classify"
            | "infer_owner"
            | "infer_due_date"
            | "score_priority"
            | "estimate_effort"
            | "detect_duplicate"
            | "map_dependency"
            | "detect_risk"
            | "draft_followup"
            | "detect_completion"
            | "memory_retrieve"
            | "generate_plan";
          agent_name: string;
          commitment_id: string | null;
          confidence: number | null;
          created_at: string | null;
          id: string;
          input_hash: string | null;
          latency_ms: number | null;
          model_used: string | null;
          output: Json | null;
          tokens_used: number | null;
          user_feedback: "accepted" | "rejected" | "edited" | null;
          workspace_id: string;
        };
        Insert: {
          action_type:
            | "extract"
            | "classify"
            | "infer_owner"
            | "infer_due_date"
            | "score_priority"
            | "estimate_effort"
            | "detect_duplicate"
            | "map_dependency"
            | "detect_risk"
            | "draft_followup"
            | "detect_completion"
            | "memory_retrieve"
            | "generate_plan";
          agent_name: string;
          commitment_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          id?: string;
          input_hash?: string | null;
          latency_ms?: number | null;
          model_used?: string | null;
          output?: Json | null;
          tokens_used?: number | null;
          user_feedback?: "accepted" | "rejected" | "edited" | null;
          workspace_id: string;
        };
        Update: {
          action_type?:
            | "extract"
            | "classify"
            | "infer_owner"
            | "infer_due_date"
            | "score_priority"
            | "estimate_effort"
            | "detect_duplicate"
            | "map_dependency"
            | "detect_risk"
            | "draft_followup"
            | "detect_completion"
            | "memory_retrieve"
            | "generate_plan";
          agent_name?: string;
          commitment_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          id?: string;
          input_hash?: string | null;
          latency_ms?: number | null;
          model_used?: string | null;
          output?: Json | null;
          tokens_used?: number | null;
          user_feedback?: "accepted" | "rejected" | "edited" | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      commitment_relationships: {
        Row: {
          created_at: string | null;
          created_by: "ai" | "user" | null;
          from_commitment_id: string;
          id: string;
          relationship_type:
            | "blocks"
            | "depends_on"
            | "duplicates"
            | "follows_from"
            | "related_to";
          to_commitment_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: "ai" | "user" | null;
          from_commitment_id: string;
          id?: string;
          relationship_type:
            | "blocks"
            | "depends_on"
            | "duplicates"
            | "follows_from"
            | "related_to";
          to_commitment_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: "ai" | "user" | null;
          from_commitment_id?: string;
          id?: string;
          relationship_type?:
            | "blocks"
            | "depends_on"
            | "duplicates"
            | "follows_from"
            | "related_to";
          to_commitment_id?: string;
        };
        Relationships: [];
      };
      commitments: {
        Row: {
          ai_confidence: number | null;
          ai_reasoning: string | null;
          approved_at: string | null;
          approved_by_id: string | null;
          completed_at: string | null;
          completion_signal:
            | "manual"
            | "email_sent"
            | "pr_merged"
            | "ticket_closed"
            | "meeting_done"
            | "delegate"
            | "chat_resolved"
            | null;
          context_snapshot: Json | null;
          counterparty_id: string | null;
          created_at: string | null;
          created_by_ai: boolean | null;
          description: string | null;
          due_date: string | null;
          due_date_confidence: number | null;
          effort_estimate_hours: number | null;
          embedding: number[] | null;
          id: string;
          importance_score: number | null;
          owner_id: string | null;
          project_id: string | null;
          recurrence_rule: string | null;
          risk_score: number | null;
          snoozed_until: string | null;
          source_id: string | null;
          source_quote: string | null;
          status:
            | "inbox"
            | "open"
            | "in_progress"
            | "blocked"
            | "done"
            | "delegated"
            | "snoozed"
            | "dismissed";
          title: string;
          type:
            | "task"
            | "request"
            | "promise"
            | "question"
            | "decision"
            | "follow_up"
            | "reminder";
          updated_at: string | null;
          urgency_score: number | null;
          workspace_id: string;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_reasoning?: string | null;
          approved_at?: string | null;
          approved_by_id?: string | null;
          completed_at?: string | null;
          completion_signal?:
            | "manual"
            | "email_sent"
            | "pr_merged"
            | "ticket_closed"
            | "meeting_done"
            | "delegate"
            | "chat_resolved"
            | null;
          context_snapshot?: Json | null;
          counterparty_id?: string | null;
          created_at?: string | null;
          created_by_ai?: boolean | null;
          description?: string | null;
          due_date?: string | null;
          due_date_confidence?: number | null;
          effort_estimate_hours?: number | null;
          embedding?: number[] | null;
          id?: string;
          importance_score?: number | null;
          owner_id?: string | null;
          project_id?: string | null;
          recurrence_rule?: string | null;
          risk_score?: number | null;
          snoozed_until?: string | null;
          source_id?: string | null;
          source_quote?: string | null;
          status?:
            | "inbox"
            | "open"
            | "in_progress"
            | "blocked"
            | "done"
            | "delegated"
            | "snoozed"
            | "dismissed";
          title: string;
          type?:
            | "task"
            | "request"
            | "promise"
            | "question"
            | "decision"
            | "follow_up"
            | "reminder";
          updated_at?: string | null;
          urgency_score?: number | null;
          workspace_id: string;
        };
        Update: {
          ai_confidence?: number | null;
          ai_reasoning?: string | null;
          approved_at?: string | null;
          approved_by_id?: string | null;
          completed_at?: string | null;
          completion_signal?:
            | "manual"
            | "email_sent"
            | "pr_merged"
            | "ticket_closed"
            | "meeting_done"
            | "delegate"
            | "chat_resolved"
            | null;
          context_snapshot?: Json | null;
          counterparty_id?: string | null;
          created_at?: string | null;
          created_by_ai?: boolean | null;
          description?: string | null;
          due_date?: string | null;
          due_date_confidence?: number | null;
          effort_estimate_hours?: number | null;
          embedding?: number[] | null;
          id?: string;
          importance_score?: number | null;
          owner_id?: string | null;
          project_id?: string | null;
          recurrence_rule?: string | null;
          risk_score?: number | null;
          snoozed_until?: string | null;
          source_id?: string | null;
          source_quote?: string | null;
          status?:
            | "inbox"
            | "open"
            | "in_progress"
            | "blocked"
            | "done"
            | "delegated"
            | "snoozed"
            | "dismissed";
          title?: string;
          type?:
            | "task"
            | "request"
            | "promise"
            | "question"
            | "decision"
            | "follow_up"
            | "reminder";
          updated_at?: string | null;
          urgency_score?: number | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          company: string | null;
          created_at: string | null;
          crm_id: string | null;
          email: string | null;
          id: string;
          name: string;
          relationship_context: string | null;
          workspace_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string | null;
          crm_id?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          relationship_context?: string | null;
          workspace_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string | null;
          crm_id?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          relationship_context?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          capture_settings: Json | null;
          created_at: string | null;
          external_user_id: string | null;
          id: string;
          last_synced_at: string | null;
          oauth_access_token: string | null;
          oauth_refresh_token: string | null;
          scopes: string[] | null;
          status: "active" | "paused" | "error" | "revoked" | null;
          type:
            | "slack"
            | "zoom"
            | "gmail"
            | "google_calendar"
            | "jira"
            | "github"
            | "notion"
            | "salesforce"
            | "hubspot"
            | "linear";
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          capture_settings?: Json | null;
          created_at?: string | null;
          external_user_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          oauth_access_token?: string | null;
          oauth_refresh_token?: string | null;
          scopes?: string[] | null;
          status?: "active" | "paused" | "error" | "revoked" | null;
          type:
            | "slack"
            | "zoom"
            | "gmail"
            | "google_calendar"
            | "jira"
            | "github"
            | "notion"
            | "salesforce"
            | "hubspot"
            | "linear";
          user_id: string;
          workspace_id: string;
        };
        Update: {
          capture_settings?: Json | null;
          created_at?: string | null;
          external_user_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          oauth_access_token?: string | null;
          oauth_refresh_token?: string | null;
          scopes?: string[] | null;
          status?: "active" | "paused" | "error" | "revoked" | null;
          type?:
            | "slack"
            | "zoom"
            | "gmail"
            | "google_calendar"
            | "jira"
            | "github"
            | "notion"
            | "salesforce"
            | "hubspot"
            | "linear";
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string | null;
          channel: "in_app" | "email" | "slack" | "push";
          commitment_id: string | null;
          created_at: string | null;
          id: string;
          sent_at: string | null;
          status: "pending" | "sent" | "read" | "dismissed" | null;
          title: string;
          type:
            | "due_soon"
            | "overdue"
            | "at_risk"
            | "new_assignment"
            | "ai_suggestion"
            | "follow_up_ready"
            | "completion_detected"
            | "team_mention"
            | "workload_alert";
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          body?: string | null;
          channel?: "in_app" | "email" | "slack" | "push";
          commitment_id?: string | null;
          created_at?: string | null;
          id?: string;
          sent_at?: string | null;
          status?: "pending" | "sent" | "read" | "dismissed" | null;
          title: string;
          type:
            | "due_soon"
            | "overdue"
            | "at_risk"
            | "new_assignment"
            | "ai_suggestion"
            | "follow_up_ready"
            | "completion_detected"
            | "team_mention"
            | "workload_alert";
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          body?: string | null;
          channel?: "in_app" | "email" | "slack" | "push";
          commitment_id?: string | null;
          created_at?: string | null;
          id?: string;
          sent_at?: string | null;
          status?: "pending" | "sent" | "read" | "dismissed" | null;
          title?: string;
          type?:
            | "due_soon"
            | "overdue"
            | "at_risk"
            | "new_assignment"
            | "ai_suggestion"
            | "follow_up_ready"
            | "completion_detected"
            | "team_mention"
            | "workload_alert";
          user_id?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          external_refs: Json | null;
          id: string;
          name: string;
          owner_id: string | null;
          status: "active" | "paused" | "completed" | "archived" | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          external_refs?: Json | null;
          id?: string;
          name: string;
          owner_id?: string | null;
          status?: "active" | "paused" | "completed" | "archived" | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          external_refs?: Json | null;
          id?: string;
          name?: string;
          owner_id?: string | null;
          status?: "active" | "paused" | "completed" | "archived" | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          created_at: string | null;
          external_id: string | null;
          id: string;
          metadata: Json | null;
          occurred_at: string | null;
          participants: string[] | null;
          raw_content: string | null;
          title: string | null;
          type:
            | "zoom"
            | "slack"
            | "gmail"
            | "google_calendar"
            | "browser"
            | "manual"
            | "jira"
            | "github"
            | "notion"
            | "teams"
            | "outlook";
          url: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          external_id?: string | null;
          id?: string;
          metadata?: Json | null;
          occurred_at?: string | null;
          participants?: string[] | null;
          raw_content?: string | null;
          title?: string | null;
          type:
            | "zoom"
            | "slack"
            | "gmail"
            | "google_calendar"
            | "browser"
            | "manual"
            | "jira"
            | "github"
            | "notion"
            | "teams"
            | "outlook";
          url?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          external_id?: string | null;
          id?: string;
          metadata?: Json | null;
          occurred_at?: string | null;
          participants?: string[] | null;
          raw_content?: string | null;
          title?: string | null;
          type?:
            | "zoom"
            | "slack"
            | "gmail"
            | "google_calendar"
            | "browser"
            | "manual"
            | "jira"
            | "github"
            | "notion"
            | "teams"
            | "outlook";
          url?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string;
          energy_profile: Json | null;
          id: string;
          last_active_at: string | null;
          onboarding_completed: boolean | null;
          role: "owner" | "admin" | "member" | "viewer";
          timezone: string | null;
          work_hours_end: string | null;
          work_hours_start: string | null;
          workspace_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email: string;
          energy_profile?: Json | null;
          id: string;
          last_active_at?: string | null;
          onboarding_completed?: boolean | null;
          role?: "owner" | "admin" | "member" | "viewer";
          timezone?: string | null;
          work_hours_end?: string | null;
          work_hours_start?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string;
          energy_profile?: Json | null;
          id?: string;
          last_active_at?: string | null;
          onboarding_completed?: boolean | null;
          role?: "owner" | "admin" | "member" | "viewer";
          timezone?: string | null;
          work_hours_end?: string | null;
          work_hours_start?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          ai_confidence_threshold: number | null;
          capture_policy: Json | null;
          created_at: string | null;
          data_retention_days: number | null;
          id: string;
          name: string;
          plan: "free" | "pro" | "team" | "enterprise";
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          ai_confidence_threshold?: number | null;
          capture_policy?: Json | null;
          created_at?: string | null;
          data_retention_days?: number | null;
          id?: string;
          name: string;
          plan?: "free" | "pro" | "team" | "enterprise";
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          ai_confidence_threshold?: number | null;
          capture_policy?: Json | null;
          created_at?: string | null;
          data_retention_days?: number | null;
          id?: string;
          name?: string;
          plan?: "free" | "pro" | "team" | "enterprise";
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
