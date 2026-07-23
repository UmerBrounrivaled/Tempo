"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE, getActiveProjectId } from "@/lib/projects";

type ActionResult = { error?: string };

export async function createTask(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You're signed out. Please log in again." };
    }

    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      return { error: "Task title can't be empty." };
    }

    const cookieStore = await cookies();
    const projectId = await getActiveProjectId(
      supabase,
      user.id,
      cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value
    );

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      project_id: projectId,
      title,
      priority: (formData.get("priority") as string) || "medium",
    });

    if (error) {
      console.error("createTask insert error:", error.message);
      return { error: `Couldn't add task: ${error.message}` };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    console.error("createTask unexpected error:", err);
    return { error: "Something went wrong while adding the task." };
  }
}

export async function toggleTask(taskId: string, done: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You're signed out. Please log in again." };
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("toggleTask update error:", error.message);
      return { error: `Couldn't update task: ${error.message}` };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    console.error("toggleTask unexpected error:", err);
    return { error: "Something went wrong while updating the task." };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You're signed out. Please log in again." };
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("deleteTask delete error:", error.message);
      return { error: `Couldn't delete task: ${error.message}` };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    console.error("deleteTask unexpected error:", err);
    return { error: "Something went wrong while deleting the task." };
  }
}

export async function setTaskPriority(
  taskId: string,
  priority: "low" | "medium" | "high",
  restoreTodo = false
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You're signed out. Please log in again." };
    }

    const updates: any = { priority };
    if (restoreTodo) {
      updates.status = "todo";
      updates.completed_at = null;
    }

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId).eq("user_id", user.id);
    if (error) {
      console.error("setTaskPriority update error:", error.message);
      return { error: `Couldn't update task: ${error.message}` };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    console.error("setTaskPriority unexpected error:", err);
    return { error: "Something went wrong while updating the task." };
  }
}
