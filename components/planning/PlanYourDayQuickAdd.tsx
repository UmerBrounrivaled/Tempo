"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quickAddPlan, skipPlanning } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

type Task = { id: string; title: string };
type Item = { key: string; title: string; existingId: string | null };

export function PlanYourDayQuickAdd({ tasks }: { tasks: Task[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  // Existing unplanned tasks start pre-loaded into the list, since the
  // point of "quick add" is speed, not making people re-type things they
  // already wrote down.
  const [items, setItems] = useState<Item[]>(() =>
    tasks.map((t) => ({ key: t.id, title: t.title, existingId: t.id }))
  );
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function addFromDraft() {
    const title = draft.trim();
    if (!title) return;
    setItems((current) => [
      ...current,
      { key: `new-${Date.now()}-${current.length}`, title, existingId: null },
    ]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromDraft();
    }
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((i) => i.key !== key));
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
    addFromDraft();
    const finalItems = draft.trim()
      ? [...items, { key: "pending", title: draft.trim(), existingId: null }]
      : items;
    formData.set(
      "items",
      JSON.stringify(
        finalItems.map((i) => (i.existingId ? { type: "existing", id: i.existingId } : { type: "new", title: i.title }))
      )
    );
    setError(null);
    startTransition(async () => {
      const result = await quickAddPlan(formData);
      if (result?.error) setError(result.error);
      else {
        setModalOpen(false);
        setDraft("");
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
            Type your priorities, one at a time. No ceremony, just a list.
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
            <h3 className="mb-1 text-base font-semibold">What matters today?</h3>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Type a priority and hit Enter. Keep going until the list feels right.
            </p>

            <form action={handleSubmit} className="flex flex-col gap-4">
              <ol className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
                {items.map((item, index) => (
                  <li
                    key={item.key}
                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <span className="w-4 shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.title}`}
                      className="text-neutral-300 hover:text-red-500 dark:text-neutral-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>

              <Input
                ref={inputRef}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={items.length === 0 ? "First priority..." : "Next priority..."}
              />

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
