"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { createTask, toggleTask, deleteTask } from "@/app/(app)/tasks/actions";
import { useTimerStore } from "@/lib/store/timerStore";
import { primeAudio } from "@/lib/sound/chime";
import { formatFocusTotal } from "@/lib/focus-totals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, Play, ChevronDown, ChevronRight } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  parent_task_id: string | null;
};

type OptimisticAction =
  | { type: "add"; task: Task }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "remove"; id: string };

function TaskRow({
  task,
  indent,
  onToggle,
  onDelete,
  onStartFocus,
  disabled,
  focusSeconds,
}: {
  task: Task;
  indent: boolean;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onStartFocus: (task: Task) => void;
  disabled: boolean;
  focusSeconds?: number;
}) {
  const focusLabel = formatFocusTotal(focusSeconds);
  return (
    <li
      className={`flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 ${
        indent ? "ml-6" : ""
      }`}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        disabled={disabled}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        className="h-4 w-4"
      />
      <div className="min-w-0 flex-1">
        <span
          className={
            task.status === "done"
              ? "block truncate text-sm text-neutral-400 line-through dark:text-neutral-500"
              : "block truncate text-sm text-neutral-900 dark:text-neutral-50"
          }
        >
          {task.title}
        </span>
        {focusLabel && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">{focusLabel}</span>
        )}
      </div>
      {task.status !== "done" && (
        <button
          type="button"
          onClick={() => onStartFocus(task)}
          disabled={disabled}
          aria-label={`Start focus on ${task.title}`}
          className="text-neutral-300 hover:text-neutral-700 disabled:pointer-events-none dark:text-neutral-600 dark:hover:text-neutral-300"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={() => onDelete(task.id)}
        disabled={disabled}
        className="text-neutral-300 hover:text-red-500 disabled:pointer-events-none dark:text-neutral-600"
        aria-label="Delete task"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

export function PriorityList({
  tasks,
  focusSecondsByTask = {},
}: {
  tasks: Task[];
  focusSecondsByTask?: Record<string, number>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loggedOpen, setLoggedOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const start = useTimerStore((s) => s.start);

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

  const { openParents, loggedTasks } = useMemo(() => {
    const byParent = new Map<string, Task[]>();
    optimisticTasks.forEach((t) => {
      if (t.parent_task_id) {
        byParent.set(t.parent_task_id, [...(byParent.get(t.parent_task_id) ?? []), t]);
      }
    });
    const topLevel = optimisticTasks.filter((t) => !t.parent_task_id);
    return {
      openParents: topLevel
        .filter((t) => t.status !== "done")
        .map((parent) => ({ parent, children: byParent.get(parent.id) ?? [] })),
      loggedTasks: optimisticTasks.filter(
        (t) => t.status === "done" && !t.parent_task_id
      ),
    };
  }, [optimisticTasks]);

  function handleAdd(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title) return;

    setError(null);
    formRef.current?.reset();

    startTransition(async () => {
      applyOptimistic({
        type: "add",
        task: {
          id: `temp-${Date.now()}`,
          title,
          status: "todo",
          priority: "medium",
          parent_task_id: null,
        },
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
    start({ id: task.id, title: task.title });
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

      <ul className="flex flex-col gap-1.5">
        {openParents.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
            No tasks yet — add your first one above.
          </p>
        )}
        {openParents.map(({ parent, children }) => (
          <div key={parent.id} className="flex flex-col gap-1.5">
            <TaskRow
              task={parent}
              indent={false}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onStartFocus={handleStartFocus}
              disabled={parent.id.startsWith("temp-")}
              focusSeconds={focusSecondsByTask[parent.id]}
            />
            {children.map((child) => (
              <TaskRow
                key={child.id}
                task={child}
                indent
                onToggle={handleToggle}
                onDelete={handleDelete}
                onStartFocus={handleStartFocus}
                disabled={child.id.startsWith("temp-")}
                focusSeconds={focusSecondsByTask[child.id]}
              />
            ))}
          </div>
        ))}
      </ul>

      {loggedTasks.length > 0 && (
        <div className="border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setLoggedOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            {loggedOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Logged Tasks ({loggedTasks.length})
          </button>
          {loggedOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {loggedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  indent={false}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onStartFocus={handleStartFocus}
                  disabled={false}
                  focusSeconds={focusSecondsByTask[task.id]}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
