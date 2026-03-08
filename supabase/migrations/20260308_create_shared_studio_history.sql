create or replace function public.fn_is_admin_or_worker(u_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = u_id
      and role = any (array['admin'::text, 'worker'::text])
  );
$$;

create table if not exists public.studio_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prompt text,
  model text,
  aspect_ratio text,
  image_size text,
  status text not null default 'generating' check (status = any (array['generating'::text, 'completed'::text, 'failed'::text])),
  storage_path text,
  error text,
  kie_task_id text,
  created_by uuid references public.profiles(id) on delete set null,
  processing_by uuid references public.profiles(id) on delete set null,
  processing_started_at timestamptz,
  constraint studio_generations_model_check check (
    model is null or model = any (array['nano-banana-2'::text, 'nano-banana'::text, 'nano-banana-pro'::text])
  ),
  constraint studio_generations_storage_path_key unique (storage_path),
  constraint studio_generations_kie_task_id_key unique (kie_task_id)
);

create index if not exists studio_generations_created_at_idx on public.studio_generations (created_at desc);
create index if not exists studio_generations_status_idx on public.studio_generations (status);

alter table public.studio_generations enable row level security;

drop policy if exists "studio_generations_select_staff" on public.studio_generations;
create policy "studio_generations_select_staff"
on public.studio_generations
for select
to authenticated
using (public.fn_is_admin_or_worker(auth.uid()));

drop policy if exists "studio_generations_insert_staff" on public.studio_generations;
create policy "studio_generations_insert_staff"
on public.studio_generations
for insert
to authenticated
with check (
  public.fn_is_admin_or_worker(auth.uid())
  and coalesce(created_by, auth.uid()) = auth.uid()
);

drop policy if exists "studio_generations_update_staff" on public.studio_generations;
create policy "studio_generations_update_staff"
on public.studio_generations
for update
to authenticated
using (public.fn_is_admin_or_worker(auth.uid()))
with check (public.fn_is_admin_or_worker(auth.uid()));

drop policy if exists "studio_generations_delete_staff" on public.studio_generations;
create policy "studio_generations_delete_staff"
on public.studio_generations
for delete
to authenticated
using (public.fn_is_admin_or_worker(auth.uid()));

drop trigger if exists set_studio_generations_updated_at on public.studio_generations;
create trigger set_studio_generations_updated_at
before update on public.studio_generations
for each row
execute function public.update_updated_at_column();

create or replace function public.fn_claim_studio_generation(p_generation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if not public.fn_is_admin_or_worker(auth.uid()) then
    return false;
  end if;

  update public.studio_generations
  set processing_by = auth.uid(),
      processing_started_at = now(),
      updated_at = now()
  where id = p_generation_id
    and status = 'generating'
    and (
      processing_by is null
      or processing_by = auth.uid()
      or processing_started_at is null
      or processing_started_at < now() - interval '10 minutes'
    );

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.fn_claim_studio_generation(uuid) to authenticated;

insert into public.studio_generations (
  prompt,
  model,
  aspect_ratio,
  image_size,
  status,
  storage_path,
  created_at,
  updated_at,
  created_by
)
select
  nullif(o.user_metadata ->> 'prompt', ''),
  nullif(o.user_metadata ->> 'model', ''),
  nullif(o.user_metadata ->> 'aspect_ratio', ''),
  nullif(o.user_metadata ->> 'image_size', ''),
  'completed',
  o.name,
  coalesce(o.created_at, now()),
  coalesce(o.updated_at, o.created_at, now()),
  p.id
from storage.objects o
left join public.profiles p on p.id = o.owner
where o.bucket_id = 'banana-ai'
  and not exists (
    select 1
    from public.studio_generations sg
    where sg.storage_path = o.name
  );

update storage.buckets
set public = false
where id = 'banana-ai';

drop policy if exists "banana-ai: select public" on storage.objects;
drop policy if exists "banana-ai: select authenticated" on storage.objects;
drop policy if exists "banana-ai: insert authenticated" on storage.objects;
drop policy if exists "banana-ai: delete authenticated" on storage.objects;
drop policy if exists "banana-ai: select staff" on storage.objects;
drop policy if exists "banana-ai: insert staff" on storage.objects;
drop policy if exists "banana-ai: update staff" on storage.objects;
drop policy if exists "banana-ai: delete staff" on storage.objects;

create policy "banana-ai: select staff"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'banana-ai'
  and public.fn_is_admin_or_worker(auth.uid())
);

create policy "banana-ai: insert staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'banana-ai'
  and public.fn_is_admin_or_worker(auth.uid())
);

create policy "banana-ai: update staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'banana-ai'
  and public.fn_is_admin_or_worker(auth.uid())
)
with check (
  bucket_id = 'banana-ai'
  and public.fn_is_admin_or_worker(auth.uid())
);

create policy "banana-ai: delete staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'banana-ai'
  and public.fn_is_admin_or_worker(auth.uid())
);
