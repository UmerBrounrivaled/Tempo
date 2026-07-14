"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  useTimerStore,
  durationFor,
  CUSTOM_LIMITS,
  type TimerMode,
} from "@/lib/store/timerStore";
import { primeAudio } from "@/lib/sound/chime";
import { Button } from "@/components/ui/button";
import { FloatingNotes } from "./FloatingNotes";
import { ChevronDown, NotebookPen, Repeat, Timer as TimerIcon } from "lucide-react";

type Task = { id: string; title: string };

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DURATION_OPTIONS: { label: string; mode: TimerMode; customMinutes?: number }[] = [
  { label: "25 min", mode: "pomodoro" },
  { label: "45 min", mode: "custom", customMinutes: 45 },
  { label: "90 min", mode: "ultradian" },
  { label: "Custom", mode: "custom" },
];

export function FocusWidget({ tasks }: { tasks: Task[] }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const {
    mode,
    phase,
    isRunning,
    secondsRemaining,
    taskId,
    taskTitle,
    customFocusMinutes,
    customBreakMinutes,
    setMode,
    setCustomDurations,
    start,
    pause,
    resume,
    reset,
  } = useTimerStore();

  const priorityTasks = tasks.slice(0, 5);

  const totalDuration = durationFor(mode, phase, customFocusMinutes, customBreakMinutes);
  const atStart = !isRunning && secondsRemaining === totalDuration && !taskTitle;

  // Landing directly on /focus (e.g. a bookmark) expands this same widget
  // rather than showing separate full-page timer UI, so no existing links
  // break while there's still only one timer surface in the app.
  const autoExpandedForRoute = useRef(false);
  useEffect(() => {
    if (pathname === "/focus" && !autoExpandedForRoute.current) {
      autoExpandedForRoute.current = true;
      setExpanded(true);
    }
  }, [pathname]);

  const handleDurationPick = (opt: (typeof DURATION_OPTIONS)[number]) => {
    setMode(opt.mode);
    if (opt.mode === "custom" && opt.customMinutes) {
      setCustomDurations(opt.customMinutes, customBreakMinutes);
    }
  };

  const handleStart = () => {
    primeAudio();
    const task = tasks.find((t) => t.id === selectedTaskId);
    start(task ? { id: task.id, title: task.title } : undefined);
  };

  const handleSwapTask = (id: string) => {
    setSelectedTaskId(id);
    const task = tasks.find((t) => t.id === id);
    if (task) start({ id: task.id, title: task.title });
  };

  // Collapsed pill
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow dark:border-neutral-800 dark:bg-neutral-900"
      >
        <TimerIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        {isRunning ? (
          <span className="text-sm font-medium tabular-nums">
            {formatTime(secondsRemaining)}
            <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
              {phase === "focus" ? "focus" : "break"}
            </span>
          </span>
        ) : (
          <span className="text-sm font-medium">Start a focus session</span>
        )}
      </button>
    );
  }

  // Expanded panel
  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-[320px] flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Focus session</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Collapse"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {atStart ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                type="button"
                size="sm"
                variant={
                  mode === opt.mode && (!opt.customMinutes || customFocusMinutes === opt.customMinutes)
                    ? "default"
                    : "outline"
                }
                onClick={() => handleDurationPick(opt)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {mode === "custom" && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                type="number"
                min={CUSTOM_LIMITS.focus.min}
                max={CUSTOM_LIMITS.focus.max}
                value={customFocusMinutes}
                onChange={(e) =>
                  setCustomDurations(Number(e.target.value) || 1, customBreakMinutes)
                }
                className="h-8 w-16 rounded-md border border-neutral-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-950"
              />
              min focus
            </div>
          )}

          {tasks.length > 0 && (
            <select
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
            >
              <option value="">No task (freeform focus)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          <Button type="button" onClick={handleStart} className="w-full">
            Start Session
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-950">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {taskTitle ?? (phase === "focus" ? "Freeform focus" : "Break")}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {phase === "focus" ? "Focusing" : "On break"}
              </p>
            </div>
            <span className="text-lg font-semibold tabular-nums">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button type="button" size="sm" onClick={resume} className="flex-1">
                Resume
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={pause} className="flex-1">
                Pause
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              End
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Toggle floating notes"
              onClick={() => setShowNotes((v) => !v)}
            >
              <NotebookPen className="h-4 w-4" />
            </Button>
          </div>

          {showNotes && <FloatingNotes taskId={taskId} />}

          {priorityTasks.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                Today&apos;s Priority
              </p>
              {priorityTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwapTask(t.id)}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Repeat className="h-3 w-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
