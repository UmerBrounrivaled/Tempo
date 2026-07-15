import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PriorityList } from "@/components/tasks/PriorityList";
import { DayTimeline, type FocusBlock } from "@/components/calendar/DayTimeline";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveProject } from "@/app/(app)/projects/actions";
import { getTodaysPlan } from "@/app/(app)/planning/actions";
import { PlanYourDayPriorities } from "@/components/planning/PlanYourDayPriorities";
import { PlanYourDayTimeline } from "@/components/planning/PlanYourDayTimeline";
import { PlanYourDayQuickAdd } from "@/components/planning/PlanYourDayQuickAdd";
import { getTodayEvents } from "@/lib/google/calendar";
import { getFocusTotalsByTask } from "@/lib/focus-totals";
import { isSameDayInTimezone } from "@/lib/date";
import { calculateStreaks } from "@/lib/streak";
import { subDays, format } from "date-fns";
import { CheckCircle2, Clock, Flame, Target, Timer as TimerIcon, ChevronDown } from "lucide-react";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeProject = await getActiveProject();

  const [{ data: tasks }, { data: profile }, { data: sessions }, { data: calendarConnection }, todaysPlan] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, status, priority, parent_task_id")
        .eq("user_id", user?.id ?? "")
        .eq("project_id", activeProject?.id ?? "")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("full_name, daily_goal_minutes, timezone, planning_style")
        .eq("id", user?.id ?? "")
        .single(),
      supabase
        .from("focus_sessions")
        .select("id, started_at, duration_seconds, session_type")
        .eq("user_id", user?.id ?? "")
        .gte("started_at", subDays(new Date(), 29).toISOString()),
      supabase
        .from("calendar_connections")
        .select("user_id")
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
      getTodaysPlan(),
    ]);

  const timezone = profile?.timezone;
  const focusOnlySessions = sessions?.filter((s) => s.session_type === "focus") ?? [];

  const doneCount = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalCount = tasks?.length ?? 0;

  const todaySessions = sessions?.filter((s) =>
    isSameDayInTimezone(new Date(s.started_at), new Date(), timezone)
  ) ?? [];

  const focusMinutesToday = Math.round(
    todaySessions
      .filter((s) => s.session_type === "focus")
      .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60
  );

  const dailyGoalMinutes = profile?.daily_goal_minutes ?? 240;
  const goalPercent = dailyGoalMinutes > 0 ? (focusMinutesToday / dailyGoalMinutes) * 100 : 0;

  const { current: streak } = calculateStreaks(focusOnlySessions, timezone);

  const firstName = profile?.full_name?.split(" ")[0];

  const focusBlocks: FocusBlock[] = todaySessions.map((s) => ({
    id: s.id,
    title: s.session_type === "focus" ? "Focus session" : "Break",
    start: s.started_at,
    end: new Date(new Date(s.started_at).getTime() + (s.duration_seconds ?? 0) * 1000).toISOString(),
    type: s.session_type === "focus" ? "focus" : "break",
  }));

  const hasCalendarConnection = Boolean(calendarConnection);
  const calendarEvents = hasCalendarConnection && user ? await getTodayEvents(user.id) : [];

  const focusSecondsByTask = await getFocusTotalsByTask(
    supabase,
    user?.id,
    (tasks ?? []).map((t) => t.id)
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {format(new Date(), "EEEE, MMMM d")} · {doneCount} / {totalCount} tasks done
        </p>
      </div>

      {/* Slim, collapsible stat strip — same metrics as before, tucked away by default */}
      <details className="group rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <span>Stats &amp; daily goal</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-neutral-100 p-4 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={CheckCircle2} label="Tasks done" value={`${doneCount}/${totalCount}`} />
            <StatCard icon={Clock} label="Focus today" value={`${focusMinutesToday}m`} />
            <StatCard icon={Flame} label="Streak" value={`${streak}d`} />
            <StatCard
              icon={Target}
              label="Daily goal"
              value={`${Math.min(100, Math.round(goalPercent))}%`}
            />
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Daily focus goal</CardTitle>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {focusMinutesToday} / {dailyGoalMinutes} min
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ProgressBar percent={goalPercent} />
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/focus">
                  <Button size="sm" className="gap-2">
                    <TimerIcon className="h-4 w-4" />
                    Start a focus session
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button size="sm" variant="outline">
                    Adjust goal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </details>

      {todaysPlan ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Today&apos;s Priority
            </h2>
            <PriorityList tasks={tasks ?? []} focusSecondsByTask={focusSecondsByTask} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400 lg:invisible">
              Timeline
            </h2>
            <DayTimeline
              events={calendarEvents}
              focusBlocks={focusBlocks}
              hasCalendarConnection={hasCalendarConnection}
            />
          </div>
        </div>
      ) : (
        (() => {
          const unplannedTasks = (tasks ?? [])
            .filter((t) => t.status !== "done" && !t.parent_task_id)
            .map((t) => ({ id: t.id, title: t.title }));
          switch (profile?.planning_style) {
            case "timeline":
              return <PlanYourDayTimeline tasks={unplannedTasks} />;
            case "quickadd":
              return <PlanYourDayQuickAdd tasks={unplannedTasks} />;
            default:
              return <PlanYourDayPriorities tasks={unplannedTasks} />;
          }
        })()
      )}
    </div>
  );
}
