# AI Commitment OS (AutoToDo)

AI Commitment OS is a Commitment Intelligence Platform that captures commitments from conversations and turns them into trackable execution workflows.

## Product Thesis

Work is created conversationally but tracked manually. This project closes that gap.

## Current Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Supabase (PostgreSQL + Auth + Realtime + pgvector)
- Tailwind CSS + shadcn/ui
- Zustand + TanStack Query
- Anthropic + OpenAI (for full AI pipeline, when keys are available)

## Project Phases

### Phase 1 (Completed)

- Project setup
- Auth + onboarding
- Supabase schema + RLS

### Phase 2 (Completed)

- Dashboard shell
- Sidebar + inbox UI
- Commitment cards/list
- Query provider + optimistic flows

### Phase 3 (Implemented in code)

- AI core (`src/lib/ai/*`)
- Agent pipeline + orchestrator
- Process-source / draft-follow-up / semantic-search API routes

### Phase 4 (In progress)

- Integrations OAuth + callbacks
- Webhook ingestion
- Source creation and pipeline triggers

### Phase 5 (In progress)

- Today / Waiting On / At Risk / Projects workflows
- Notifications endpoints
- Deterministic risk + daily planning foundations

## Key App Routes

- `/today`
- `/inbox`
- `/commitments`
- `/waiting-on`
- `/at-risk`
- `/projects`
- `/settings`
- `/settings/integrations`

## Key API Routes

### AI

- `POST /api/ai/process-source`
- `POST /api/ai/draft-follow-up`
- `POST /api/ai/semantic-search`

### Integrations

- `GET /api/integrations/connect/[provider]`
- `GET /api/integrations/callback/[provider]`
- `POST /api/integrations/disconnect/[provider]`
- `GET /api/integrations/list`

### Webhooks

- `POST /api/webhooks/slack`
- `POST /api/webhooks/zoom`
- `POST /api/webhooks/gmail`

### Notifications

- `GET /api/notifications/list`
- `POST /api/notifications/mark-read`


## Local Setup

```bash
npm install
npm run dev
```
