-- studio_workflow_snapshots
-- One row per project. Stores the full workflow graph state (nodes, edges, viewport).
-- Persisted via debounced upsert from the studio-dte client.
-- Optimistic locking via `revision` prevents silent overwrites on concurrent edits.

create table if not exists public.studio_workflow_snapshots (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  nodes       jsonb not null default '[]'::jsonb,
  edges       jsonb not null default '[]'::jsonb,
  viewport    jsonb,
  revision    integer not null default 0,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- One snapshot per project
create unique index if not exists studio_workflow_snapshots_project_id_key
  on public.studio_workflow_snapshots(project_id);

create index if not exists studio_workflow_snapshots_updated_at_idx
  on public.studio_workflow_snapshots(updated_at desc);

-- RLS
alter table public.studio_workflow_snapshots enable row level security;

create policy "project members can read workflow"
  on public.studio_workflow_snapshots for select
  using (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can write workflow"
  on public.studio_workflow_snapshots for insert
  with check (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can update workflow"
  on public.studio_workflow_snapshots for update
  using (public.fn_has_project_access(project_id, auth.uid()));
