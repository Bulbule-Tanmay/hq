-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  module     text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_module_created_idx
  on public.entries (module, created_at desc);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Lock both tables. With row level security on and no policies,
-- the public anon key can read nothing. Only the server, using the
-- service role key, can reach the data.
alter table public.entries  enable row level security;
alter table public.settings enable row level security;
