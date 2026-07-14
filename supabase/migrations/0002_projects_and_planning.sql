-- Tempo v2 migration: projects/workspaces + Google Calendar connections +
-- per-user timer preferences. Apply after the original schema.sql.

-- Projects / workspaces
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table tasks add column project_id uuid references projects(id) on delete set null;
alter table notes add column project_id uuid references projects(id) on delete set null;
alter table daily_plans add column project_id uuid references projects(id) on delete set null;

-- Google Calendar connection (one row per user; tokens stored as text here —
-- for production, prefer Supabase Vault or app-level encryption before
-- storing access_token/refresh_token at rest)
create table calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text default 'google',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_id text default 'primary',
  connected_at timestamptz default now()
);

alter table projects enable row level security;
alter table calendar_connections enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own calendar_connections" on calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a default project per new user
create function public.handle_new_user_project()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.projects (owner_id, name, is_default)
  values (new.id, 'Personal', true);
  return new;
end;
$$;

create trigger on_auth_user_created_project
  after insert on auth.users
  for each row execute procedure public.handle_new_user_project();

-- WI-12: auto-start the break immediately after a focus session ends
alter table profiles add column auto_start_break boolean default true;

-- WI-11: play an audio cue when a focus session ends
alter table profiles add column sound_on_session_end boolean default true;

-- Cross-cutting: all "today" boundaries must use the user's local timezone
-- consistently rather than the server's. Defaulted from the browser at
-- signup (see app/(auth)/actions.ts); falls back to UTC for existing rows.
alter table profiles add column timezone text default 'UTC';

-- Backfill: give every existing user without a project a "Personal" default
-- project, so pre-migration tasks/notes/daily_plans have something to fall
-- back to once the app starts scoping by project_id.
insert into public.projects (owner_id, name, is_default)
select id, 'Personal', true
from auth.users u
where not exists (
  select 1 from public.projects p where p.owner_id = u.id
);

-- Backfill existing rows onto each user's default project.
update tasks t
set project_id = p.id
from projects p
where p.owner_id = t.user_id and p.is_default = true and t.project_id is null;

update notes n
set project_id = p.id
from projects p
where p.owner_id = n.user_id and p.is_default = true and n.project_id is null;

update daily_plans d
set project_id = p.id
from projects p
where p.owner_id = d.user_id and p.is_default = true and d.project_id is null;

-- Daily plans are now scoped per project, not just per user/day.
alter table daily_plans drop constraint if exists daily_plans_user_id_plan_date_key;
alter table daily_plans add constraint daily_plans_user_project_date_key
  unique (user_id, project_id, plan_date);

-- Note: no new "sort order" column needed here — tasks.order_index already
-- exists in schema.sql (previously unused). WI-7's "Plan Your Day" reorder
-- step (app/(app)/planning/actions.ts) now writes to it directly.
