"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
};

export type FocusBlock = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  type: "focus" | "break";
};

const START_HOUR = 7;
const END_HOUR = 19; // 7am - 7pm
const HOUR_HEIGHT = 56; // px

function minutesFromWindowStart(iso: string) {
  const d = new Date(iso);
  return (d.getHours() - START_HOUR) * 60 + d.getMinutes();
}

function offsetPx(iso: string) {
  return (minutesFromWindowStart(iso) / 60) * HOUR_HEIGHT;
}

function durationPx(startIso: string, endIso: string) {
  const minutes = Math.max(15, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return (minutes / 60) * HOUR_HEIGHT;
}

export function DayTimeline({
  events,
  focusBlocks,
  hasCalendarConnection,
}: {
  events: CalendarEvent[];
  focusBlocks: FocusBlock[];
  hasCalendarConnection: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Deliberately set on mount rather than as a lazy useState initializer:
    // seeding this during SSR would bake the server's clock into the markup
    // and cause a hydration mismatch against the client's actual time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    nowLineRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  const nowOffset =
    now && now.getHours() >= START_HOUR && now.getHours() < END_HOUR
      ? ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT
      : null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
        <span className="text-sm font-medium">Today&apos;s Calendar</span>
        {!hasCalendarConnection && (
          <Link
            href="/settings"
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Connect Google Calendar
          </Link>
        )}
      </div>

      {hasCalendarConnection && allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
          {allDayEvents.map((e) => (
            <span
              key={e.id}
              className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              {e.title}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-neutral-100 dark:border-neutral-800"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 left-2 bg-white pr-1 text-[10px] text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                {hour % 12 === 0 ? 12 : hour % 12}
                {hour < 12 ? "am" : "pm"}
              </span>
            </div>
          ))}

          {hasCalendarConnection &&
            timedEvents.map((e) => (
              <div
                key={e.id}
                className="absolute left-14 right-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                style={{ top: offsetPx(e.start), height: durationPx(e.start, e.end) }}
              >
                <span className="truncate block font-medium">{e.title}</span>
              </div>
            ))}

          {focusBlocks.map((b) => (
            <div
              key={b.id}
              className={`absolute left-14 right-2 rounded-md border px-2 py-1 text-xs ${
                b.type === "focus"
                  ? "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
              style={{ top: offsetPx(b.start), height: durationPx(b.start, b.end) }}
            >
              <span className="truncate block font-medium">{b.title}</span>
            </div>
          ))}

          {nowOffset !== null && (
            <div
              ref={nowLineRef}
              className="absolute left-2 right-2 z-10 flex items-center gap-1"
              style={{ top: nowOffset }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
