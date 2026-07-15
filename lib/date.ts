/**
 * Shared timezone-aware date helpers. Every "what day is it for this user"
 * question in the app (today's tasks, streaks, the timeline, daily_plans
 * lookups) should go through here rather than a bare `new Date()`, which
 * reflects the SERVER's timezone, not the user's.
 */

const DEFAULT_TIMEZONE = "UTC";

/** Returns "YYYY-MM-DD" for the given instant, as a calendar date in `timezone`. */
export function dateKeyInTimezone(date: Date, timezone: string | null | undefined): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date); // en-CA formats as YYYY-MM-DD
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/** True if `a` and `b` fall on the same calendar day in the user's timezone. */
export function isSameDayInTimezone(a: Date, b: Date, timezone: string | null | undefined): boolean {
  return dateKeyInTimezone(a, timezone) === dateKeyInTimezone(b, timezone);
}

/** "YYYY-MM-DD" for "today" in the user's timezone — the canonical key for daily_plans.plan_date. */
export function todayKeyInTimezone(timezone: string | null | undefined): string {
  return dateKeyInTimezone(new Date(), timezone);
}

/**
 * Returns the UTC instants bounding the user's local calendar day containing
 * `date`, suitable for a `.gte(...).lt(...)` Supabase range query.
 */
export function dayBoundsInTimezone(
  date: Date,
  timezone: string | null | undefined
): { startUtc: Date; endUtc: Date } {
  const tz = timezone || DEFAULT_TIMEZONE;
  const key = dateKeyInTimezone(date, tz);

  // Binary-search-free approach: walk from a UTC midnight guess and correct
  // using the offset implied by formatting that instant back in `tz`.
  const naiveMidnightUtc = new Date(`${key}T00:00:00.000Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(naiveMidnightUtc, tz);
  const startUtc = new Date(naiveMidnightUtc.getTime() + offsetMinutes * 60_000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000);
  return { startUtc, endUtc };
}

/** Minutes to ADD to a UTC instant's "naive" wall-clock reading to get true UTC, for `tz`. */
function getTimezoneOffsetMinutes(utcDate: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(utcDate).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (utcDate.getTime() - asUtc) / 60_000;
}

export { DEFAULT_TIMEZONE };
