"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { planYourDay, skipPlanning } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, X } from "lucide-react";

type Task = { id: string; title: string };
type Block = { taskId: string; startMinutes: number; durationMinutes: number };

const START_HOUR = 6;
const END_HOUR = 22; // exclusive
const DURATIONS = [15, 30, 45, 60, 90, 120];

function formatHour(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

function PoolChip({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${task.id}`,
    data: { taskId: task.id },
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
    >
      <GripVertical className="h-3 w-3 text-neutral-300 dark:text-neutral-600" />
      {task.title}
    </button>
  );
}

function PlacedBlock({
  task,
  block,
  onDurationChange,
  onRemove,
}: {
  task: Task;
  block: Block;
  onDurationChange: (minutes: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${task.id}`,
    data: { taskId: task.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-xs dark:border-indigo-900 dark:bg-indigo-950"
    >
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3 w-3 text-indigo-300 dark:text-indigo-700" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-indigo-900 dark:text-indigo-100">
        {task.title}
      </span>
      <select
        value={block.durationMinutes}
        onChange={(e) => onDurationChange(Number(e.target.value))}
        className="h-6 rounded border border-indigo-200 bg-white px-1 text-[11px] dark:border-indigo-800 dark:bg-neutral-950"
      >
        {DURATIONS.map((d) => (
          <option key={d} value={d}>
            {d}m
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Unschedule ${task.title}`}
        className="text-indigo-300 hover:text-red-500 dark:text-indigo-700"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function HourRow({
  hour,
  children,
}: {
  hour: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[44px] items-start gap-3 border-b border-neutral-100 px-2 py-1.5 dark:border-neutral-800 ${
        isOver ? "bg-indigo-50/60 dark:bg-indigo-950/40" : ""
      }`}
    >
      <span className="w-12 shrink-0 pt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        {formatHour(hour)}
      </span>
      <div className="flex flex-1 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function PlanYourDayTimeline({ tasks }: { tasks: Task[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [blocks, setBlocks] = useState<Record<string, Block>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const unscheduled = tasks.filter((t) => !blocks[t.id]);
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = (active.data.current as { taskId: string } | undefined)?.taskId;
    if (!taskId || !String(over.id).startsWith("hour-")) return;
    const hour = Number(String(over.id).replace("hour-", ""));
    setBlocks((current) => ({
      ...current,
      [taskId]: {
        taskId,
        startMinutes: hour * 60,
        durationMinutes: current[taskId]?.durationMinutes ?? 30,
      },
    }));
  }

  function handleSkip() {
    setError(null);
    startTransition(async () => {
      const result = await skipPlanning();
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("orderedTaskIds", JSON.stringify(Object.keys(blocks)));
    formData.set("taskBlocks", JSON.stringify(Object.values(blocks)));
    setError(null);
    startTransition(async () => {
      const result = await planYourDay(formData);
      if (result?.error) setError(result.error);
      else {
        setModalOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <h2 className="text-lg font-semibold">
            You don&apos;t have any planned tasks for today
          </h2>
          <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
            Drag today&apos;s tasks onto a timeline and see your day laid out hour by hour.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>Plan Your Day</Button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isPending}
              className="text-sm text-neutral-400 underline hover:text-neutral-600 disabled:pointer-events-none dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              Skip Planning
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h3 className="mb-1 text-base font-semibold">Plan your day</h3>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Drag a task onto the hour you want to work on it.
            </p>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {unscheduled.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5 rounded-md border border-dashed border-neutral-200 p-2 dark:border-neutral-700">
                  {unscheduled.map((task) => (
                    <PoolChip key={task.id} task={task} />
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                {hours.map((hour) => (
                  <HourRow key={hour} hour={hour}>
                    {tasks
                      .filter((t) => blocks[t.id] && blocks[t.id].startMinutes === hour * 60)
                      .map((t) => (
                        <PlacedBlock
                          key={t.id}
                          task={t}
                          block={blocks[t.id]}
                          onDurationChange={(minutes) =>
                            setBlocks((current) => ({
                              ...current,
                              [t.id]: { ...current[t.id], durationMinutes: minutes },
                            }))
                          }
                          onRemove={() =>
                            setBlocks((current) => {
                              const next = { ...current };
                              delete next[t.id];
                              return next;
                            })
                          }
                        />
                      ))}
                  </HourRow>
                ))}
              </div>
            </DndContext>

            <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goalMinutes">Focus goal for today (minutes, optional)</Label>
                <Input id="goalMinutes" name="goalMinutes" type="number" min={0} step={5} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Start My Day
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
