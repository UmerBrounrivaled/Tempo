"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject, setActiveProject } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FolderPlus } from "lucide-react";

type Project = { id: string; name: string; color: string | null; is_default: boolean | null };

/**
 * Blocks the rest of the app until the user has a project to work in.
 * Covers two cases:
 *  - They have zero projects (e.g. signed up before the "Personal" default
 *    project existed, or its auto-create trigger didn't fire) -> only
 *    "create a project" makes sense.
 *  - They have projects but none is currently active (e.g. a stale/invalid
 *    cookie) -> let them pick one, or create a new one.
 */
export function ProjectGate({ projects }: { projects: Project[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleChoose(id: string) {
    setError(null);
    startTransition(async () => {
      await setActiveProject(id);
      router.refresh();
    });
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProject(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {projects.length > 0 ? "Choose a project" : "Create your first project"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {projects.length > 0
              ? "Pick which project you want to work in, or start a new one."
              : "Tasks, notes, and focus sessions all live inside a project. Give it a name to get started — \"Personal\" or \"Work\" both work fine."}
          </p>

          {projects.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleChoose(p.id)}
                    className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:pointer-events-none dark:border-neutral-800 dark:hover:bg-neutral-900"
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
          )}

          <form action={handleCreate} className="flex items-center gap-2">
            <Input name="name" placeholder="New project name" required className="flex-1" />
            <Button type="submit" disabled={isPending} className="shrink-0 gap-2">
              <FolderPlus className="h-4 w-4" />
              Create
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
        </CardContent>
      </Card>
    </div>
  );
}
