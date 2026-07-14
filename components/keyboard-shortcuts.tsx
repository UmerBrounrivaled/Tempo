"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/app/(app)/tasks/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SHORTCUTS = [
  { keys: "N or ⌘/Ctrl K", action: "Quick-add a task" },
  { keys: "?", action: "Show this help" },
  { keys: "Esc", action: "Close a dialog" },
];

export function KeyboardShortcuts() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        setQuickAddOpen(false);
        setHelpOpen(false);
        return;
      }

      if (isTyping) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (e.key.toLowerCase() === "n" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-32"
          onClick={() => setQuickAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              action={(formData) =>
                startTransition(async () => {
                  await createTask(formData);
                  setQuickAddOpen(false);
                  router.refresh();
                })
              }
              className="flex gap-2"
            >
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <Input
                name="title"
                autoFocus
                placeholder="Quick-add a task..."
                required
              />
              <Button type="submit" disabled={isPending}>
                Add
              </Button>
            </form>
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Keyboard shortcuts</h2>
            <ul className="flex flex-col gap-2">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{s.action}</span>
                  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
