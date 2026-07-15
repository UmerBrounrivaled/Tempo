import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns total focused seconds per task, for the given task ids, scoped to
 * one user. Only counts completed 'focus' phase sessions (breaks don't
 * count toward a task's invested time). Used to show "X focused so far" on
 * task rows (see TaskList, PriorityList).
 */
export async function getFocusTotalsByTask(
  supabase: SupabaseClient,
  userId: string | undefined,
  taskIds: string[]
): Promise<Record<string, number>> {
  if (!userId || taskIds.length === 0) return {};

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("task_id, duration_seconds")
    .eq("user_id", userId)
    .eq("session_type", "focus")
    .in("task_id", taskIds);

  if (error || !data) return {};

  const totals: Record<string, number> = {};
  for (const row of data) {
    if (!row.task_id) continue;
    totals[row.task_id] = (totals[row.task_id] ?? 0) + (row.duration_seconds ?? 0);
  }
  return totals;
}

/** Formats a seconds count as e.g. "1h 20m focused" / "45m focused". Omits zero. */
export function formatFocusTotal(totalSeconds: number | undefined): string | null {
  if (!totalSeconds || totalSeconds < 60) return null;
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m focused`;
  if (m === 0) return `${h}h focused`;
  return `${h}h ${m}m focused`;
}
