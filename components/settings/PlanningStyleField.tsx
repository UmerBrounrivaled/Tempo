"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlanningStyle } from "@/app/(app)/settings/actions";
import { AlertCircle } from "lucide-react";

type PlanningStyle = "priorities" | "timeline" | "quickadd";

const OPTIONS: { value: PlanningStyle; label: string; description: string }[] = [
  {
    value: "priorities",
    label: "Priorities",
    description: "Reorder today's tasks by drag-and-drop, set an optional focus goal.",
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Drag tasks onto an hour-by-hour timeline to timebox your day.",
  },
  {
    value: "quickadd",
    label: "Quick add",
    description: "Type your priorities one at a time. Fastest, no drag-and-drop.",
  },
];

export function PlanningStyleField({ value }: { value: PlanningStyle }) {
  const [selected, setSelected] = useState<PlanningStyle>(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(style: PlanningStyle) {
    const previous = selected;
    setSelected(style);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("planningStyle", style);
      const result = await updatePlanningStyle(formData);
      if (result?.error) {
        setSelected(previous);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={isPending}
          onClick={() => handleSelect(opt.value)}
          className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors disabled:pointer-events-none ${
            selected === opt.value
              ? "border-neutral-900 bg-neutral-50 dark:border-neutral-50 dark:bg-neutral-900"
              : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          }`}
        >
          <span className="text-sm font-medium">{opt.label}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {opt.description}
          </span>
        </button>
      ))}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
