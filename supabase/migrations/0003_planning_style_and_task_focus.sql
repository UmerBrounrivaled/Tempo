-- Tempo v3 migration: selectable "Plan Your Day" style + timeline blocks for
-- the timebox planning variant. Apply after 0002_projects_and_planning.sql.

-- WI-14: user picks which Plan Your Day experience they want (Settings ->
-- Plan Your Day style). Defaults to the original reorder-and-goal flow.
alter table profiles add column planning_style text
  check (planning_style in ('priorities', 'timeline', 'quickadd'))
  default 'priorities';

-- WI-14 (timeline variant only): stores each task's assigned start time and
-- duration for the day, e.g. [{"taskId": "...", "startMinutes": 540, "durationMinutes": 60}].
-- startMinutes is minutes since local midnight. Null/absent for users who
-- never use the timeline planning style.
alter table daily_plans add column task_blocks jsonb;
