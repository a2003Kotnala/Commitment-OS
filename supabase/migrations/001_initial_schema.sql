CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    last_active_at = NOW();

  RETURN NEW;
END;
$$;

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  ai_confidence_threshold FLOAT DEFAULT 0.75,
  capture_policy JSONB DEFAULT '{}'::jsonb,
  data_retention_days INTEGER,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  timezone TEXT DEFAULT 'UTC',
  work_hours_start TIME DEFAULT '09:00',
  work_hours_end TIME DEFAULT '18:00',
  energy_profile JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  color TEXT DEFAULT '#2E86AB',
  external_refs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  crm_id TEXT,
  relationship_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'zoom',
      'slack',
      'gmail',
      'google_calendar',
      'browser',
      'manual',
      'jira',
      'github',
      'notion',
      'teams',
      'outlook'
    )
  ),
  external_id TEXT,
  title TEXT,
  url TEXT,
  occurred_at TIMESTAMPTZ,
  participants UUID[],
  raw_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (
    status IN ('inbox', 'open', 'in_progress', 'blocked', 'done', 'delegated', 'snoozed', 'dismissed')
  ),
  type TEXT NOT NULL DEFAULT 'task' CHECK (
    type IN ('task', 'request', 'promise', 'question', 'decision', 'follow_up', 'reminder')
  ),
  owner_id UUID REFERENCES public.users(id),
  counterparty_id UUID REFERENCES public.contacts(id),
  project_id UUID REFERENCES public.projects(id),
  due_date DATE,
  due_date_confidence FLOAT CHECK (due_date_confidence BETWEEN 0 AND 1),
  urgency_score INTEGER DEFAULT 3 CHECK (urgency_score BETWEEN 1 AND 5),
  importance_score INTEGER DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 5),
  effort_estimate_hours FLOAT,
  ai_confidence FLOAT CHECK (ai_confidence BETWEEN 0 AND 1),
  ai_reasoning TEXT,
  source_id UUID REFERENCES public.sources(id),
  source_quote TEXT,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  risk_score FLOAT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 1),
  created_by_ai BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by_id UUID REFERENCES public.users(id),
  snoozed_until TIMESTAMPTZ,
  recurrence_rule TEXT,
  completion_signal TEXT CHECK (
    completion_signal IN ('manual', 'email_sent', 'pr_merged', 'ticket_closed', 'meeting_done', 'delegate', 'chat_resolved')
  ),
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.commitment_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  to_commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('blocks', 'depends_on', 'duplicates', 'follows_from', 'related_to')
  ),
  created_by TEXT DEFAULT 'user' CHECK (created_by IN ('ai', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (
    type IN ('slack', 'zoom', 'gmail', 'google_calendar', 'jira', 'github', 'notion', 'salesforce', 'hubspot', 'linear')
  ),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'revoked')),
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  scopes TEXT[],
  external_user_id TEXT,
  capture_settings JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, type)
);

CREATE TABLE public.ai_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  commitment_id UUID REFERENCES public.commitments(id),
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'extract',
      'classify',
      'infer_owner',
      'infer_due_date',
      'score_priority',
      'estimate_effort',
      'detect_duplicate',
      'map_dependency',
      'detect_risk',
      'draft_followup',
      'detect_completion',
      'memory_retrieve',
      'generate_plan'
    )
  ),
  agent_name TEXT NOT NULL,
  input_hash TEXT,
  output JSONB,
  model_used TEXT,
  confidence FLOAT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  user_feedback TEXT CHECK (user_feedback IN ('accepted', 'rejected', 'edited')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  commitment_id UUID REFERENCES public.commitments(id),
  type TEXT NOT NULL CHECK (
    type IN (
      'due_soon',
      'overdue',
      'at_risk',
      'new_assignment',
      'ai_suggestion',
      'follow_up_ready',
      'completion_detected',
      'team_mention',
      'workload_alert'
    )
  ),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'slack', 'push')),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commitments_workspace ON public.commitments(workspace_id);
CREATE INDEX idx_commitments_owner ON public.commitments(owner_id);
CREATE INDEX idx_commitments_status ON public.commitments(status);
CREATE INDEX idx_commitments_due_date ON public.commitments(due_date);
CREATE INDEX idx_commitments_embedding
  ON public.commitments
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX idx_sources_workspace ON public.sources(workspace_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, status);

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_commitments_updated_at
BEFORE UPDATE ON public.commitments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.users
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_workspaces"
ON public.workspaces
FOR SELECT
USING (id = public.current_workspace_id());

CREATE POLICY "authenticated_users_can_create_workspaces"
ON public.workspaces
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspace_admins_can_update_workspaces"
ON public.workspaces
FOR UPDATE
USING (id = public.current_workspace_id() AND public.current_user_role() IN ('owner', 'admin'))
WITH CHECK (id = public.current_workspace_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY "workspace_admins_can_delete_workspaces"
ON public.workspaces
FOR DELETE
USING (id = public.current_workspace_id() AND public.current_user_role() = 'owner');

CREATE POLICY "users_can_view_own_or_workspace_members"
ON public.users
FOR SELECT
USING (id = auth.uid() OR workspace_id = public.current_workspace_id());

CREATE POLICY "users_can_insert_own_record"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own_record_or_admins_manage_workspace"
ON public.users
FOR UPDATE
USING (
  id = auth.uid()
  OR (
    workspace_id = public.current_workspace_id()
    AND public.current_user_role() IN ('owner', 'admin')
  )
)
WITH CHECK (
  id = auth.uid()
  OR (
    workspace_id = public.current_workspace_id()
    AND public.current_user_role() IN ('owner', 'admin')
  )
);

CREATE POLICY "workspace_isolation_projects"
ON public.projects
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_contacts"
ON public.contacts
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_sources"
ON public.sources
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_commitments"
ON public.commitments
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_integrations"
ON public.integrations
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_ai_actions"
ON public.ai_actions
FOR ALL
USING (workspace_id = public.current_workspace_id())
WITH CHECK (workspace_id = public.current_workspace_id());

CREATE POLICY "workspace_isolation_commitment_relationships"
ON public.commitment_relationships
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.commitments c
    WHERE c.id = from_commitment_id
      AND c.workspace_id = public.current_workspace_id()
  )
  AND EXISTS (
    SELECT 1
    FROM public.commitments c
    WHERE c.id = to_commitment_id
      AND c.workspace_id = public.current_workspace_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.commitments c
    WHERE c.id = from_commitment_id
      AND c.workspace_id = public.current_workspace_id()
  )
  AND EXISTS (
    SELECT 1
    FROM public.commitments c
    WHERE c.id = to_commitment_id
      AND c.workspace_id = public.current_workspace_id()
  )
);

CREATE POLICY "own_notifications"
ON public.notifications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
