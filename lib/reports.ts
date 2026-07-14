import { addDays, addWeeks, addMonths, format, startOfWeek, startOfMonth, startOfDay } from "date-fns";
import { dateKeyInTimezone } from "@/lib/date";

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export function resolveRange(
  preset: RangePreset | null | undefined,
  fromParam: string | null | undefined,
  toParam: string | null | undefined
): { from: Date; to: Date; preset: RangePreset } {
  const now = new Date();

  if (preset === "custom" && fromParam && toParam) {
    const from = startOfDay(new Date(fromParam));
    const to = addDays(startOfDay(new Date(toParam)), 1); // inclusive end day
    return { from, to, preset: "custom" };
  }

  const days = preset === "90d" ? 89 : preset === "30d" ? 29 : 6;
  const from = startOfDay(addDays(now, -days));
  const to = addDays(startOfDay(now), 1);
  return { from, to, preset: preset && preset !== "custom" ? preset : "7d" };
}

export type Granularity = "day" | "week" | "month";

/** Same span-based rule the History page uses to decide chart bucket size. */
export function granularityForRange(from: Date, to: Date): Granularity {
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  if (spanDays <= 31) return "day";
  if (spanDays <= 180) return "week";
  return "month";
}

export type InsightSession = {
  started_at: string;
  duration_seconds: number | null;
  interrupted: boolean | null;
};

const TIME_OF_DAY_BUCKETS = [
  { label: "Early morning (5–9am)", startHour: 5, endHour: 9 },
  { label: "Late morning (9am–12pm)", startHour: 9, endHour: 12 },
  { label: "Afternoon (12–5pm)", startHour: 12, endHour: 17 },
  { label: "Evening (5–9pm)", startHour: 17, endHour: 21 },
  { label: "Night (9pm–5am)", startHour: 21, endHour: 29 }, // wraps past midnight
];

export function computeInsights(sessions: InsightSession[]) {
  if (sessions.length === 0) {
    return {
      averageSessionMinutes: 0,
      mostFocusedTimeOfDay: null as string | null,
      completionRate: 0,
      totalSessions: 0,
    };
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60;
  const averageSessionMinutes = Math.round(totalMinutes / sessions.length);

  const bucketCounts = new Map<string, number>();
  sessions.forEach((s) => {
    let hour = new Date(s.started_at).getHours();
    if (hour < 5) hour += 24; // fold early-morning hours into the "night" wrap-around bucket
    const bucket = TIME_OF_DAY_BUCKETS.find((b) => hour >= b.startHour && hour < b.endHour);
    if (bucket) bucketCounts.set(bucket.label, (bucketCounts.get(bucket.label) ?? 0) + 1);
  });
  let mostFocusedTimeOfDay: string | null = null;
  let maxCount = 0;
  bucketCounts.forEach((count, label) => {
    if (count > maxCount) {
      maxCount = count;
      mostFocusedTimeOfDay = label;
    }
  });

  const completed = sessions.filter((s) => !s.interrupted).length;
  const completionRate = Math.round((completed / sessions.length) * 100);

  return {
    averageSessionMinutes,
    mostFocusedTimeOfDay,
    completionRate,
    totalSessions: sessions.length,
  };
}

export type BucketedSession = { started_at: string; duration_seconds: number | null };

/** Buckets sessions into {label, minutes}[] for TimeChart, using the user's timezone for day boundaries. */
export function bucketSessions(
  sessions: BucketedSession[],
  from: Date,
  to: Date,
  granularity: Granularity,
  timezone: string | null | undefined
): { label: string; minutes: number }[] {
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];

  if (granularity === "day") {
    for (let d = new Date(from); d < to; d = addDays(d, 1)) {
      buckets.push({
        key: dateKeyInTimezone(d, timezone),
        label: format(d, "EEE d"),
        start: d,
        end: addDays(d, 1),
      });
    }
  } else if (granularity === "week") {
    for (let d = startOfWeek(from); d < to; d = addWeeks(d, 1)) {
      buckets.push({
        key: `w-${dateKeyInTimezone(d, timezone)}`,
        label: `Wk of ${format(d, "MMM d")}`,
        start: d,
        end: addWeeks(d, 1),
      });
    }
  } else {
    for (let d = startOfMonth(from); d < to; d = addMonths(d, 1)) {
      buckets.push({
        key: `m-${dateKeyInTimezone(d, timezone)}`,
        label: format(d, "MMM yyyy"),
        start: d,
        end: addMonths(d, 1),
      });
    }
  }

  return buckets.map((bucket) => {
    const minutes = Math.round(
      sessions
        .filter((s) => {
          const t = new Date(s.started_at);
          return t >= bucket.start && t < bucket.end;
        })
        .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60
    );
    return { label: bucket.label, minutes };
  });
}
