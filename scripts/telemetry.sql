-- Jungle Jam usage feed.
-- Target — browser (supabase.com → SQL editor)
-- Intent — [RUN THIS]
-- Location — paste the whole file into the new project's SQL editor
-- Done check — SQL Editor succeeds; family-sync deploy succeeds; Bennett hears a Fun clip dropped on Dad's laptop.
-- Paste this whole file again to add missing columns, family tables, and the family-library Storage bucket. Existing devices, events, and notes stay.
--
-- Do not commit the service role key. Do not put the family token in git.

create table if not exists public.devices (
  device_id text primary key,
  role text,
  family_token text not null,
  last_seen timestamptz not null default now(),
  user_agent text
);

create table if not exists public.events (
  id text primary key,
  ts timestamptz not null default now(),
  term_id text,
  device_id text not null,
  role text,
  type text not null,
  page text,
  class_id text,
  assignment_id text,
  ms integer,
  message text,
  href text,
  family_token text not null
);

create index if not exists events_ts_idx on public.events (ts desc);
create index if not exists events_family_term_idx on public.events (family_token, term_id, ts desc);
create index if not exists events_family_class_idx on public.events (family_token, class_id, assignment_id);

alter table public.devices enable row level security;
alter table public.events enable row level security;

create or replace function public.requesting_family_token()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.header.x-family-token', true), ''),
    coalesce((current_setting('request.headers', true)::json ->> 'x-family-token'), '')
  );
$$;

drop policy if exists family_devices_all on public.devices;
create policy family_devices_all on public.devices
  for all to anon
  using (family_token = public.requesting_family_token())
  with check (family_token = public.requesting_family_token());

drop policy if exists family_events_select on public.events;
create policy family_events_select on public.events
  for select to anon
  using (family_token = public.requesting_family_token());

drop policy if exists family_events_insert on public.events;
create policy family_events_insert on public.events
  for insert to anon
  with check (family_token = public.requesting_family_token());

grant select, insert, update on public.devices to anon;
grant select, insert on public.events to anon;

create table if not exists public.family_notes (
  id text primary key,
  family_token text not null,
  target_type text,
  target_id text,
  from_role text,
  kind text,
  reply_to text,
  text text,
  at timestamptz not null default now(),
  class_id text,
  term_id text,
  test boolean
);

alter table public.family_notes add column if not exists family_token text;
alter table public.family_notes add column if not exists target_type text;
alter table public.family_notes add column if not exists target_id text;
alter table public.family_notes add column if not exists from_role text;
alter table public.family_notes add column if not exists kind text;
alter table public.family_notes add column if not exists reply_to text;
alter table public.family_notes add column if not exists text text;
alter table public.family_notes add column if not exists at timestamptz default now();
alter table public.family_notes add column if not exists class_id text;
alter table public.family_notes add column if not exists term_id text;
alter table public.family_notes add column if not exists test boolean;

create index if not exists family_notes_family_at_idx on public.family_notes (family_token, at desc);

alter table public.family_notes enable row level security;

drop policy if exists family_notes_all on public.family_notes;
create policy family_notes_all on public.family_notes
  for all to anon
  using (family_token = public.requesting_family_token())
  with check (family_token = public.requesting_family_token());

grant select, insert, update, delete on public.family_notes to anon;

create table if not exists public.family_progress (
  family_token text not null,
  assignment_id text not null,
  id text,
  started boolean,
  started_at timestamptz,
  done bigint,
  started_history jsonb,
  started_awarded boolean,
  done_awarded boolean,
  updated_at timestamptz not null default now(),
  device_id text,
  primary key (family_token, assignment_id)
);

alter table public.family_progress add column if not exists family_token text;
alter table public.family_progress add column if not exists assignment_id text;
alter table public.family_progress add column if not exists id text;
alter table public.family_progress add column if not exists started boolean;
alter table public.family_progress add column if not exists started_at timestamptz;
alter table public.family_progress add column if not exists done bigint;
alter table public.family_progress add column if not exists started_history jsonb;
alter table public.family_progress add column if not exists started_awarded boolean;
alter table public.family_progress add column if not exists done_awarded boolean;
alter table public.family_progress add column if not exists updated_at timestamptz default now();
alter table public.family_progress add column if not exists device_id text;
update public.family_progress
  set assignment_id = coalesce(nullif(assignment_id, ''), id)
  where assignment_id is null or assignment_id = '';
update public.family_progress
  set id = coalesce(nullif(id, ''), assignment_id)
  where id is null or id = '';

create index if not exists family_progress_family_updated_idx on public.family_progress (family_token, updated_at desc);
create unique index if not exists family_progress_id_uidx on public.family_progress (id);
create unique index if not exists family_progress_assignment_uidx on public.family_progress (family_token, assignment_id);

alter table public.family_progress enable row level security;

drop policy if exists family_progress_all on public.family_progress;
create policy family_progress_all on public.family_progress
  for all to anon
  using (family_token = public.requesting_family_token())
  with check (family_token = public.requesting_family_token());

grant select, insert, update, delete on public.family_progress to anon;

create table if not exists public.family_work (
  id text primary key,
  family_token text not null,
  payload jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  class_id text,
  term_id text
);

alter table public.family_work add column if not exists family_token text;
alter table public.family_work add column if not exists payload jsonb default '{}'::jsonb;
alter table public.family_work add column if not exists deleted boolean default false;
alter table public.family_work add column if not exists updated_at timestamptz default now();
alter table public.family_work add column if not exists class_id text;
alter table public.family_work add column if not exists term_id text;

create index if not exists family_work_family_updated_idx on public.family_work (family_token, updated_at desc);

alter table public.family_work enable row level security;

drop policy if exists family_work_all on public.family_work;
create policy family_work_all on public.family_work
  for all to anon
  using (family_token = public.requesting_family_token())
  with check (family_token = public.requesting_family_token());

grant select, insert, update, delete on public.family_work to anon;

create table if not exists public.family_overlay (
  family_token text primary key,
  week jsonb,
  progress jsonb,
  updated_at timestamptz not null default now()
);

alter table public.family_overlay add column if not exists week jsonb;
alter table public.family_overlay add column if not exists progress jsonb;
alter table public.family_overlay add column if not exists updated_at timestamptz default now();

alter table public.family_overlay enable row level security;

drop policy if exists family_overlay_all on public.family_overlay;
create policy family_overlay_all on public.family_overlay
  for all to anon
  using (family_token = public.requesting_family_token())
  with check (family_token = public.requesting_family_token());

grant select, insert, update, delete on public.family_overlay to anon;

-- Family audio/stills live in Storage, not git. Public-read objects, unguessable clip ids.
-- Service role (family-sync) uploads. Anon can read so Bennett's phone can play without the family token in the URL.
insert into storage.buckets (id, name, public, file_size_limit)
values ('family-library', 'family-library', true, 2097152)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152;

drop policy if exists family_library_public_read on storage.objects;
create policy family_library_public_read
on storage.objects
for select
to public
using (bucket_id = 'family-library');
