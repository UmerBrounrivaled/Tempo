import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TimeChart } from "@/components/reports/TimeChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveProject } from "@/app/(app)/projects/actions";
import { resolveRange, granularityForRange, bucketSessions, computeInsights, type RangePreset } from "@/lib/reports";
import { calculateStreaks } from "@/lib/streak";
import { format, subDays } from "date-fns";
import { Download, FileText, Clock3, Sunrise, CheckCircle2, Flame, Trophy } from "lucide-react";

const RANGE_LABELS: { preset: RangePreset; label: string }[] = [
  { preset: "7d", label: "7 days" },
  { preset: "30d", label: "30 days" },
  { preset: "90d", label: "90 days" },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from: fromParam, to: toParam } = await searchParams;
  const preset = (range as RangePreset) || (fromParam && toParam ? "custom" : "7d");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [activeProject, { data: profile }] = await Promise.all([
    getActiveProject(),
    supabase.from("profiles").select("timezone").eq("id", user?.id ?? "").single(),
  ]);
  const timezone = profile?.timezone;

  const { from, to } = resolveRange(preset, fromParam, toParam);

  const { data: rawSessions } = await supabase
    .from("focus_sessions")
    .select("id, started_at, duration_seconds, session_type, interrupted, task_id, tasks(title, project_id)")
    .eq("user_id", user?.id ?? "")
    .gte("started_at", from.toISOString())
    .lt("started_at", to.toISOString())
    .order("started_at", { ascending: false });

  // focus_sessions has no project_id of its own — attribute a session to the
  // active project via its task's project_id, and always include freeform
  // (task-less) sessions since they aren't attributable to any project.
  const sessions = (rawSessions ?? []).filter((s) => {
    const task = Array.isArray(s.tasks) ? s.tasks[0] : s.tasks;
    return !task || !activeProject || task.project_id === activeProject.id;
  });

  const focusSessions = sessions.filter((s) => s.session_type === "focus");

  const granularity = granularityForRange(from, to);
  const chartData = bucketSessions(focusSessions, from, to, granularity, timezone);
  const insights = computeInsights(focusSessions);

  // Streak is a global signal, not scoped to the picked range, so it's
  // computed from a separate, wider fetch.
  const { data: streakSessions } = await supabase
    .from("focus_sessions")
    .select("started_at")
    .eq("user_id", user?.id ?? "")
    .eq("session_type", "focus")
    .gte("started_at", subDays(new Date(), 365).toISOString());
  const { current: currentStreak, best: bestStreak } = calculateStreaks(streakSessions ?? [], timezone);

  // Group sessions by day for the list
  const grouped = new Map<string, typeof sessions>();
  sessions.forEach((s) => {
    const key = format(new Date(s.started_at), "EEEE, MMM d");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  const exportQuery = `from=${format(from, "yyyy-MM-dd")}&to=${format(new Date(to.getTime() - 1), "yyyy-MM-dd")}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {currentStreak > 0 ? `${currentStreak}-day streak` : "No active streak yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/export/csv?${exportQuery}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </a>
          <a href={`/api/export/pdf?${exportQuery}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RANGE_LABELS.map((r) => (
          <Link key={r.preset} href={`/history?range=${r.preset}`}>
            <Button variant={preset === r.preset ? "default" : "outline"} size="sm">
              {r.label}
            </Button>
          </Link>
        ))}
        <form action="/history" className="flex items-center gap-1.5">
          <input type="hidden" name="range" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={fromParam}
            className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-800 dark:bg-neutral-950"
          />
          <span className="text-xs text-neutral-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={toParam}
            className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-800 dark:bg-neutral-950"
          />
          <Button type="submit" size="sm" variant={preset === "custom" ? "default" : "outline"}>
            Go
          </Button>
        </form>
      </div>

      <TimeChart data={chartData} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Focus Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <Clock3 className="h-3.5 w-3.5" /> Avg. session
            </span>
            <span className="text-lg font-semibold">{insights.averageSessionMinutes}m</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <Sunrise className="h-3.5 w-3.5" /> Most focused
            </span>
            <span className="text-sm font-semibold">{insights.mostFocusedTimeOfDay ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completion rate
            </span>
            <span className="text-lg font-semibold">{insights.completionRate}%</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <Flame className="h-3.5 w-3.5" /> Current streak
            </span>
            <span className="text-lg font-semibold">{currentStreak}d</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <Trophy className="h-3.5 w-3.5" /> Best streak
            </span>
            <span className="text-lg font-semibold">{bestStreak}d</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {[...grouped.entries()].map(([day, daySessions]) => (
          <div key={day}>
            <h2 className="mb-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">{day}</h2>
            <ul className="flex flex-col gap-1">
              {daySessions?.map((s) => {
                const task = Array.isArray(s.tasks) ? s.tasks[0] : s.tasks;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                  >
                    <span>
                      {task?.title ?? "Freeform focus"}
                      {s.session_type !== "focus" && (
                        <span className="ml-1.5 text-xs text-neutral-400">(break)</span>
                      )}
                      {s.interrupted && (
                        <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">interrupted</span>
                      )}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {Math.round((s.duration_seconds ?? 0) / 60)} min
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
            No focus sessions in this range — head to the Focus tab to start one.
          </p>
        )}
      </div>
    </div>
  );
}
