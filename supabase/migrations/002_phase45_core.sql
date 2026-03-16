-- Phase 4/5 support tables

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  due_soon_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  overdue_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  at_risk_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_ready_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email BOOLEAN NOT NULL DEFAULT FALSE,
  channel_slack BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  plan_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, plan_date)
);

CREATE TABLE IF NOT EXISTS public.commitment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id),
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extension_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.source_storage_metadata (
  source_id UUID PRIMARY KEY REFERENCES public.sources(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  encryption_key_id TEXT,
  ciphertext_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_workspace_user_date
  ON public.daily_plans(workspace_id, user_id, plan_date);

CREATE INDEX IF NOT EXISTS idx_commitment_history_workspace_commitment
  ON public.commitment_history(workspace_id, commitment_id);

CREATE INDEX IF NOT EXISTS idx_extension_sessions_user_expiry
  ON public.extension_sessions(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_workspace
  ON public.notification_preferences(workspace_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_daily_plans_updated_at ON public.daily_plans;
CREATE TRIGGER set_daily_plans_updated_at
BEFORE UPDATE ON public.daily_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.commitment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_history FORCE ROW LEVEL SECURITY;

ALTER TABLE public.extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.source_storage_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_storage_metadata FORCE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "own_notification_preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id = public.current_workspace_id()
);

CREATE POLICY "own_daily_plans"
ON public.daily_plans
FOR ALL
USING (
  user_id = auth.uid()
  AND workspace_id = public.current_workspace_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id = public.current_workspace_id()
);

CREATE POLICY "workspace_isolation_commitment_history"
ON public.commitment_history
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "own_extension_sessions"
ON public.extension_sessions
FOR ALL
USING (
  user_id = auth.uid()
  AND workspace_id = public.current_workspace_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id = public.current_workspace_id()
);

CREATE POLICY "workspace_isolation_source_storage_metadata"
ON public.source_storage_metadata
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());