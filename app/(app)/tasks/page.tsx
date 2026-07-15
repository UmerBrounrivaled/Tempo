import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/tasks/TaskList";
import { getActiveProject } from "@/app/(app)/projects/actions";
import { getFocusTotalsByTask } from "@/lib/focus-totals";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activeProject = await getActiveProject();

  let query = supabase
    .from("tasks")
    .select("id, title, status, priority")
    .eq("user_id", user?.id)
    .eq("project_id", activeProject?.id ?? "")
    .is("parent_task_id", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: tasks } = await query;

  const focusSecondsByTask = await getFocusTotalsByTask(
    supabase,
    user?.id,
    (tasks ?? []).map((t) => t.id)
  );

  const filters = [
    { key: "all", label: "All" },
    { key: "todo", label: "To do" },
    { key: "in_progress", label: "In progress" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="mt-3 flex gap-2">
          {filters.map((f) => (
            <a
              key={f.key}
              href={`/tasks?status=${f.key}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                (status ?? "all") === f.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>
      <TaskList tasks={tasks ?? []} focusSecondsByTask={focusSecondsByTask} />
    </div>
  );
}
