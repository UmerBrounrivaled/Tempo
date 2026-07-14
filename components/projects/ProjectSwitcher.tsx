"use client";

import { useRef, useState, useTransition } from "react";
import { createProject, setActiveProject } from "@/app/(app)/projects/actions";
import { ChevronsUpDown, Plus } from "lucide-react";

type Project = { id: string; name: string; color: string | null; is_default: boolean | null };

export function ProjectSwitcher({
  projects,
  activeProjectId,
}: {
  projects: Project[];
  activeProjectId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const handleSwitch = (id: string) => {
    setOpen(false);
    startTransition(async () => {
      await setActiveProject(id);
    });
  };

  const handleCreate = async (formData: FormData) => {
    const result = await createProject(formData);
    if (!result.error) {
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: active?.color ?? "#6366f1" }}
        />
        <span className="max-w-[10rem] truncate">Projects ▸ {active?.name ?? "Personal"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-56 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <ul className="flex flex-col">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSwitch(p.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    p.id === active?.id ? "font-medium" : "text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color ?? "#6366f1" }}
                  />
                  {p.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-800">
            {creating ? (
              <form
                action={handleCreate}
                className="flex items-center gap-1 px-1 py-1"
                onSubmit={() => inputRef.current?.blur()}
              >
                <input
                  ref={inputRef}
                  name="name"
                  autoFocus
                  placeholder="Project name"
                  className="h-7 flex-1 rounded border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950"
                />
                <button
                  type="submit"
                  className="rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-50 dark:text-neutral-900"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" />
                New project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
