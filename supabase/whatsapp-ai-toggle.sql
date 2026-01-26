-- WhatsApp AI toggle (default ON)
-- Run in Supabase SQL editor after creating whatsapp_threads.

alter table public.whatsapp_threads
    add column if not exists ai_enabled boolean;

alter table public.whatsapp_threads
    alter column ai_enabled set default true;

update public.whatsapp_threads
    set ai_enabled = true
    where ai_enabled is null;

alter table public.whatsapp_threads
    alter column ai_enabled set not null;
