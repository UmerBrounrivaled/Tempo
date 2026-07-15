import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NewNoteButton } from "@/components/notes/NewNoteButton";
import { DeleteNoteButton } from "@/components/notes/DeleteNoteButton";
import { getActiveProject } from "@/app/(app)/projects/actions";
import { cn } from "@/lib/utils";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeProject = await getActiveProject();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, updated_at")
    .eq("user_id", user?.id)
    .eq("project_id", activeProject?.id ?? "")
    .order("updated_at", { ascending: false });

  let activeNote = null;
  if (id) {
    const { data } = await supabase
      .from("notes")
      .select("id, title, content")
      .eq("id", id)
      .single();
    activeNote = data;
  }

  return (
    <div className="flex h-[85vh] gap-6">
      <div className="flex w-64 flex-col gap-2 border-r border-neutral-200 dark:border-neutral-800 pr-4">
        <NewNoteButton />
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {notes?.map((n) => (
            <li key={n.id} className="group flex items-center">
              <Link
                href={`/notes?id=${n.id}`}
                className={cn(
                  "flex-1 truncate rounded-md px-2 py-2 text-sm hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-800",
                  n.id === id ? "bg-neutral-100 dark:bg-neutral-800 font-medium" : "text-neutral-700 dark:text-neutral-300"
                )}
              >
                {n.title || "Untitled note"}
              </Link>
              <DeleteNoteButton noteId={n.id} />
            </li>
          ))}
          {notes?.length === 0 && (
            <p className="px-2 py-4 text-sm text-neutral-400 dark:text-neutral-500">No notes yet.</p>
          )}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeNote ? (
          <NoteEditor note={activeNote} />
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Select a note, or create a new one.
          </p>
        )}
      </div>
    </div>
  );
}
