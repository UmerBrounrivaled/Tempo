"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveProject } from "@/app/(app)/projects/actions";

export async function logSession(params: {
  taskId: string | null;
  startedAt: string;
  durationSeconds: number;
  sessionType: "focus" | "break";
  interrupted: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("focus_sessions").insert({
    user_id: user.id,
    task_id: params.taskId,
    started_at: params.startedAt,
    ended_at: new Date().toISOString(),
    duration_seconds: params.durationSeconds,
    session_type: params.sessionType,
    interrupted: params.interrupted,
  });

  revalidatePath("/history");
  revalidatePath("/today");
}

export async function getIncompleteTasks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const activeProject = await getActiveProject();

  const { data } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("project_id", activeProject?.id ?? "")
    .neq("status", "done")
    .order("created_at", { ascending: true });

  return data ?? [];
}
