import { isSameDayInTimezone } from "@/lib/date";

type SessionLike = { started_at: string };

/**
 * Current streak: consecutive days (ending today) with >=1 focus session.
 * Best streak: the longest such run anywhere in the provided sessions.
 * Both evaluated in the user's local timezone.
 */
export function calculateStreaks(
  focusSessions: SessionLike[],
  timezone: string | null | undefined,
  referenceDate: Date = new Date()
): { current: number; best: number } {
  if (focusSessions.length === 0) return { current: 0, best: 0 };

  const dayKeys = Array.from(
    new Set(
      focusSessions.map((s) => {
        const d = new Date(s.started_at);
        // Use the same key format as lib/date's dateKeyInTimezone for consistent bucketing.
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone || "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      })
    )
  )
    .sort()
    .map((key) => new Date(`${key}T12:00:00.000Z`)); // noon UTC avoids DST edge cases when diffing

  let current = 0;
  for (let i = 0; i < 365; i++) {
    const day = new Date(referenceDate);
    day.setDate(day.getDate() - i);
    const hasSession = focusSessions.some((s) => isSameDayInTimezone(new Date(s.started_at), day, timezone));
    if (hasSession) {
      current++;
    } else if (i > 0 || current === 0) {
      break;
    }
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    const diffDays = Math.round((dayKeys[i].getTime() - dayKeys[i - 1].getTime()) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  best = Math.max(best, current);

  return { current, best };
}
