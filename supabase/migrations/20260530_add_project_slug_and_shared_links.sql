-- Hybrid pretty-URL support:
--   1. projects.slug  → human-readable identifier used in dashboard URLs
--                       (e.g. /dashboard/projects/acme-agency/services/...)
--   2. shared_links    → short codes (/s/:code) generated when copying a link to share,
--                       so the long Notion page IDs are hidden from shared URLs.

-- Required for accent-insensitive slugs (á → a, ñ → n, …).
create extension if not exists unaccent;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. projects.slug
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.projects
  add column if not exists slug text;

comment on column public.projects.slug is
  'Human-readable, URL-safe identifier derived from the project title. '
  'Used in dashboard URLs instead of the UUID. Auto-generated on insert.';

-- Slugify helper: lowercase, strip accents, keep [a-z0-9-], collapse dashes.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(coalesce(input, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- Returns a unique slug for the given base text, appending -2, -3, … on collision.
-- `current_id` lets a row keep its own slug when re-checked.
create or replace function public.unique_project_slug(base text, current_id uuid default null)
returns text
language plpgsql
as $$
declare
  root text := nullif(public.slugify(base), '');
  candidate text;
  n int := 1;
begin
  if root is null then
    root := 'proyecto';
  end if;
  candidate := root;
  while exists (
    select 1 from public.projects
    where slug = candidate
      and (current_id is null or id <> current_id)
  ) loop
    n := n + 1;
    candidate := root || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- Trigger: fill slug on insert (or when set to null) from the project's title.
-- The title column varies across environments (title / name / project_name),
-- so we read it safely via to_jsonb instead of referencing columns directly.
create or replace function public.set_project_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.unique_project_slug(
      coalesce(
        to_jsonb(new) ->> 'title',
        to_jsonb(new) ->> 'name',
        to_jsonb(new) ->> 'project_name'
      ),
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_project_slug on public.projects;
create trigger trg_set_project_slug
  before insert on public.projects
  for each row execute function public.set_project_slug();

-- Backfill existing rows that have no slug yet.
do $$
declare
  r record;
begin
  for r in select id, to_jsonb(p) as j from public.projects p
           where p.slug is null or btrim(p.slug) = '' loop
    update public.projects
      set slug = public.unique_project_slug(
        coalesce(r.j ->> 'title', r.j ->> 'name', r.j ->> 'project_name'),
        r.id
      )
      where id = r.id;
  end loop;
end $$;

create unique index if not exists projects_slug_key on public.projects (slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. shared_links
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.shared_links (
  code         text primary key,
  target_path  text not null,
  project_id   uuid references public.projects (id) on delete cascade,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table public.shared_links is
  'Short codes for shareable dashboard links. /s/:code redirects to target_path.';

-- One short code per (target_path) so re-copying the same page reuses the link.
create unique index if not exists shared_links_target_path_key
  on public.shared_links (target_path);

alter table public.shared_links enable row level security;

-- Any authenticated user can resolve a short link (they still hit the dashboard's
-- own access control once redirected) and create new ones.
drop policy if exists "Authenticated can read shared_links" on public.shared_links;
create policy "Authenticated can read shared_links" on public.shared_links
  for select to authenticated using (true);

drop policy if exists "Authenticated can create shared_links" on public.shared_links;
create policy "Authenticated can create shared_links" on public.shared_links
  for insert to authenticated with check (created_by = auth.uid());
