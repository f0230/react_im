-- studio_generations
-- Append-only history of every image/video generated in the AI Studio.
-- One row per generated asset, independent of the workflow graph, so results
-- survive even when their Output node is deleted.

-- Drop any partial/leftover table so this migration can be safely re-run.
drop table if exists public.studio_generations cascade;

create table public.studio_generations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  model         text,
  prompt        text,
  result_url    text,
  storage_path  text,
  result_type   text,
  aspect_ratio  text,
  task_id       text,
  provider      text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists studio_generations_project_created_idx
  on public.studio_generations(project_id, created_at desc);

-- RLS — same project-access model as studio_workflow_snapshots
alter table public.studio_generations enable row level security;

create policy "project members can read generations"
  on public.studio_generations for select
  using (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can insert generations"
  on public.studio_generations for insert
  with check (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can delete generations"
  on public.studio_generations for delete
  using (public.fn_has_project_access(project_id, auth.uid()));
