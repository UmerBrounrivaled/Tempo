"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE, getActiveProjectId } from "@/lib/projects";

export async function createNote(taskId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const projectId = await getActiveProjectId(
    supabase,
    user.id,
    cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value
  );

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      project_id: projectId,
      task_id: taskId,
      title: "Untitled note",
      content: null,
    })
    .select("id")
    .single();

  if (error) return null;

  revalidatePath("/notes");
  return data.id as string;
}

export async function saveNote(
  noteId: string,
  data: { title: string; content: unknown }
) {
  const supabase = await createClient();
  await supabase
    .from("notes")
    .update({
      title: data.title,
      content: data.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);

  revalidatePath("/notes");
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", noteId);
  revalidatePath("/notes");
}
