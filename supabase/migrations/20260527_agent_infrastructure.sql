-- ============================================================
-- @dte Agent Infrastructure
-- ============================================================
-- Tables:
--   agent_context  → rolling message buffer + state per channel
--   agent_runs     → audit log of every agent invocation
--   agent_tasks    → orchestrator → worker task delegation queue
-- ============================================================

-- ─── agent_context ────────────────────────────────────────────────────────────

create table if not exists agent_context (
  channel_id                   uuid primary key references team_channels(id) on delete cascade,
  project_id                   uuid references projects(id) on delete set null,

  -- Rolling buffer of recent messages (max 60, trimmed on each insert)
  message_buffer               jsonb not null default '[]'::jsonb,

  -- Compressed summary of older conversation (to avoid unbounded growth)
  buffer_summary               text,

  -- How many messages have arrived since the last bot response
  message_count_since_response int not null default 0,

  last_message_at              timestamptz,
  last_bot_response_at         timestamptz,
  updated_at                   timestamptz not null default now()
);

comment on table agent_context is
  'Rolling message buffer and state per channel for the @dte ambient agent.';

comment on column agent_context.message_buffer is
  'JSONB array of the last N messages: {id, author_name, body, message_type, created_at}.';

comment on column agent_context.buffer_summary is
  'LLM-generated summary of older context, used when buffer is compressed.';

comment on column agent_context.message_count_since_response is
  'Counter reset to 0 each time @dte responds. Used by cron to find stale channels.';


-- ─── agent_runs ───────────────────────────────────────────────────────────────

create table if not exists agent_runs (
  id                   uuid primary key default gen_random_uuid(),
  channel_id           uuid references team_channels(id) on delete set null,
  project_id           uuid references projects(id) on delete set null,

  -- What caused the agent to run
  trigger_type         text not null
    check (trigger_type in ('mention', 'keyword', 'cron', 'manual')),
  trigger_message_id   uuid,   -- the message that triggered (if applicable)

  -- Lifecycle
  status               text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Models used in this run
  model_orchestrator   text,   -- e.g. 'NousResearch/Hermes-3-Llama-3.1-70B-Instruct'
  model_classifier     text,   -- e.g. 'claude-haiku-4-5'

  -- Cost tracking
  tokens_used          int not null default 0,
  cost_usd             numeric(10, 6) not null default 0,

  -- Classifier output: { should_respond: bool, reason: str, urgency: 'low'|'high' }
  classifier_decision  jsonb,

  -- Full log of tool calls executed during this run
  tool_calls_log       jsonb not null default '[]'::jsonb,

  -- The bot message that was posted as a result
  response_message_id  uuid,

  error_message        text,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);

comment on table agent_runs is
  'Audit log of every @dte agent invocation — models used, cost, tool calls, outcome.';


-- ─── agent_tasks ──────────────────────────────────────────────────────────────

create table if not exists agent_tasks (
  id             uuid primary key default gen_random_uuid(),

  -- Links
  run_id         uuid references agent_runs(id) on delete cascade,
  parent_task_id uuid references agent_tasks(id) on delete set null,
  channel_id     uuid references team_channels(id) on delete set null,
  project_id     uuid references projects(id) on delete set null,

  -- Task definition
  task_type      text not null,
  -- e.g. 'classify' | 'summarize_context' | 'fetch_notion' |
  --       'generate_copy' | 'respond' | 'create_notion_task' | 'update_task_status'

  -- Which worker handles this (orchestrator delegates)
  assigned_to    text not null default 'orchestrator',
  -- e.g. 'orchestrator' | 'classifier' | 'content_worker' | 'notion_worker'

  -- Lifecycle
  status         text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  priority       int not null default 5,  -- 1 = highest, 10 = lowest

  -- Input payload for the worker
  payload        jsonb not null default '{}'::jsonb,

  -- Worker output
  result         jsonb,
  error_message  text,

  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  completed_at   timestamptz
);

comment on table agent_tasks is
  'Orchestrator → worker task delegation. Supports nested delegation via parent_task_id.';


-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists agent_runs_channel_created_idx
  on agent_runs(channel_id, created_at desc);

create index if not exists agent_runs_status_idx
  on agent_runs(status);

create index if not exists agent_tasks_run_idx
  on agent_tasks(run_id);

create index if not exists agent_tasks_status_priority_idx
  on agent_tasks(status, priority);

create index if not exists agent_context_last_message_idx
  on agent_context(last_message_at desc);


-- ─── RLS (service role bypasses; no anon/public access) ───────────────────────

alter table agent_context enable row level security;
alter table agent_runs    enable row level security;
alter table agent_tasks   enable row level security;

-- Admins can read all agent data (for monitoring)
create policy "admins_read_agent_context"
  on agent_context for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "admins_read_agent_runs"
  on agent_runs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "admins_read_agent_tasks"
  on agent_tasks for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
