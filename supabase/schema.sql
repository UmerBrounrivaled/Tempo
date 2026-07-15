-- Focus app schema
-- Paste this whole file into Supabase SQL Editor and run it.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  daily_goal_minutes int default 240,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  description text,
  priority text check (priority in ('low','medium','high')) default 'medium',
  status text check (status in ('todo','in_progress','done')) default 'todo',
  due_date date,
  order_index int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete set null,
  title text,
  content jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  session_type text check (session_type in ('focus','break')) default 'focus',
  interrupted boolean default false,
  created_at timestamptz default now()
);

create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_date date not null,
  goal_minutes int,
  reflection text,
  unique(user_id, plan_date)
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table focus_sessions enable row level security;
alter table daily_plans enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own focus_sessions" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own daily_plans" on daily_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
