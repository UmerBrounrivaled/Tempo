"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { planYourDay, skipPlanning } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

type Task = { id: string; title: string };

function SortableRow({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab text-neutral-300 active:cursor-grabbing dark:text-neutral-600"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {task.title}
    </li>
  );
}

export function PlanYourDay({ tasks }: { tasks: Task[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [order, setOrder] = useState(tasks.map((t) => t.id));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const orderedTasks = order
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => Boolean(t));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return arrayMove(current, oldIndex, newIndex);
    });
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
    formData.set("orderedTaskIds", JSON.stringify(order));
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
            Prepare yourself for the productive day by starting with planning.
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
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h3 className="mb-1 text-base font-semibold">Plan your day</h3>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Reorder today&apos;s tasks by priority, and optionally set a focus goal.
            </p>

            <form action={handleSubmit} className="flex flex-col gap-4">
              {orderedTasks.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                      {orderedTasks.map((task) => (
                        <SortableRow key={task.id} task={task} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  No tasks yet — you can still set a goal and jump in.
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goalMinutes">Focus goal for today (minutes, optional)</Label>
                <Input id="goalMinutes" name="goalMinutes" type="number" min={0} step={5} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Quick note (optional)</Label>
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  className="rounded-md border border-neutral-200 bg-white p-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                />
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
