"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { createTask, toggleTask, deleteTask } from "@/app/(app)/tasks/actions";
import { useTimerStore } from "@/lib/store/timerStore";
import { primeAudio } from "@/lib/sound/chime";
import { formatFocusTotal } from "@/lib/focus-totals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, Play } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

type OptimisticAction =
  | { type: "add"; task: Task }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "remove"; id: string };

export function TaskList({
  tasks,
  focusSecondsByTask = {},
}: {
  tasks: Task[];
  focusSecondsByTask?: Record<string, number>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const startFocus = useTimerStore((s) => s.start);

  const [optimisticTasks, applyOptimistic] = useOptimistic(
    tasks,
    (state: Task[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.task];
        case "toggle":
          return state.map((t) =>
            t.id === action.id ? { ...t, status: action.done ? "done" : "todo" } : t
          );
        case "remove":
          return state.filter((t) => t.id !== action.id);
        default:
          return state;
      }
    }
  );

  function handleAdd(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title) return;

    setError(null);
    formRef.current?.reset();

    startTransition(async () => {
      applyOptimistic({
        type: "add",
        task: { id: `temp-${Date.now()}`, title, status: "todo", priority: "medium" },
      });
      const result = await createTask(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleToggle(id: string, done: boolean) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id, done });
      const result = await toggleTask(id, done);
      if (result?.error) setError(result.error);
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      const result = await deleteTask(id);
      if (result?.error) setError(result.error);
    });
  }

  function handleStartFocus(task: Task) {
    primeAudio();
    startFocus({ id: task.id, title: task.title });
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <Input name="title" placeholder="Add a task..." required className="flex-1" />
        <Button type="submit" disabled={isPending} className="shrink-0 gap-2">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {optimisticTasks.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
            No tasks yet — add your first one above.
          </p>
        )}
        {optimisticTasks.map((task) => {
          const isTemp = task.id.startsWith("temp-");
          const focusLabel = formatFocusTotal(focusSecondsByTask[task.id]);
          return (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2"
              style={{ opacity: isTemp ? 0.6 : 1 }}
            >
              <input
                type="checkbox"
                checked={task.status === "done"}
                disabled={isTemp}
                onChange={(e) => handleToggle(task.id, e.target.checked)}
                className="h-4 w-4"
              />
              <div className="min-w-0 flex-1">
                <span
                  className={
                    task.status === "done"
                      ? "block truncate text-sm text-neutral-400 dark:text-neutral-500 line-through"
                      : "block truncate text-sm text-neutral-900 dark:text-neutral-50"
                  }
                >
                  {task.title}
                </span>
                {focusLabel && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {focusLabel}
                  </span>
                )}
              </div>
              <span className="text-xs capitalize text-neutral-400 dark:text-neutral-500">
                {task.priority}
              </span>
              {task.status !== "done" && (
                <button
                  type="button"
                  onClick={() => handleStartFocus(task)}
                  disabled={isTemp}
                  aria-label={`Start focus on ${task.title}`}
                  className="text-neutral-300 hover:text-neutral-700 disabled:pointer-events-none dark:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(task.id)}
                disabled={isTemp}
                className="text-neutral-300 hover:text-red-500 dark:text-neutral-600 disabled:pointer-events-none"
                aria-label="Delete task"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
