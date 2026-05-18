-- studio_assets
-- Per-project library of reference images uploaded into the AI Studio, so a
-- reference can be reused across workflows without re-uploading the file.

drop table if exists public.studio_assets cascade;

create table public.studio_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  storage_path  text not null,
  result_url    text,
  aspect_ratio  numeric,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists studio_assets_project_created_idx
  on public.studio_assets(project_id, created_at desc);

-- Avoid duplicate rows for the same uploaded file within a project.
create unique index if not exists studio_assets_project_path_key
  on public.studio_assets(project_id, storage_path);

alter table public.studio_assets enable row level security;

create policy "project members can read assets"
  on public.studio_assets for select
  using (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can insert assets"
  on public.studio_assets for insert
  with check (public.fn_has_project_access(project_id, auth.uid()));

create policy "project members can delete assets"
  on public.studio_assets for delete
  using (public.fn_has_project_access(project_id, auth.uid()));
