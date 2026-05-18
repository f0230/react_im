-- studio_templates
-- Reusable, org-wide workflow templates for the AI Studio. A template stores
-- a full node/edge graph (with output runtime data stripped) that any team
-- member can apply as a starting point on any project.

drop table if exists public.studio_templates cascade;

create table public.studio_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  nodes        jsonb not null default '[]'::jsonb,
  edges        jsonb not null default '[]'::jsonb,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists studio_templates_created_at_idx
  on public.studio_templates(created_at desc);

alter table public.studio_templates enable row level security;

-- Any authenticated team member can read templates.
create policy "authenticated can read templates"
  on public.studio_templates for select
  using (auth.uid() is not null);

-- A user can create templates and manage the ones they created.
create policy "authenticated can create templates"
  on public.studio_templates for insert
  with check (created_by = auth.uid());

create policy "creators can delete their templates"
  on public.studio_templates for delete
  using (created_by = auth.uid());
