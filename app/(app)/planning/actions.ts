"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveProject } from "@/app/(app)/projects/actions";
import { todayKeyInTimezone } from "@/lib/date";

export async function getTodaysPlan() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [activeProject, { data: profile }] = await Promise.all([
    getActiveProject(),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (!activeProject) return null;

  const planDate = todayKeyInTimezone(profile?.timezone);

  const { data } = await supabase
    .from("daily_plans")
    .select("id, goal_minutes, reflection, task_blocks")
    .eq("user_id", user.id)
    .eq("project_id", activeProject.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  return data;
}

export async function planYourDay(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please log in again." };

  const [activeProject, { data: profile }] = await Promise.all([
    getActiveProject(),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (!activeProject) return { error: "No active project." };

  const planDate = todayKeyInTimezone(profile?.timezone);
  const goalMinutesRaw = formData.get("goalMinutes") as string;
  const goalMinutes = goalMinutesRaw ? Number(goalMinutesRaw) : null;
  const reflection = (formData.get("note") as string)?.trim() || null;
  const orderedTaskIds = JSON.parse((formData.get("orderedTaskIds") as string) || "[]") as string[];
  // Only present for the "timeline" planning style — see PlanYourDayTimeline.
  const taskBlocksRaw = formData.get("taskBlocks") as string | null;
  const taskBlocks = taskBlocksRaw ? JSON.parse(taskBlocksRaw) : null;

  const { error } = await supabase.from("daily_plans").upsert(
    {
      user_id: user.id,
      project_id: activeProject.id,
      plan_date: planDate,
      goal_minutes: goalMinutes,
      reflection,
      ...(taskBlocks ? { task_blocks: taskBlocks } : {}),
    },
    { onConflict: "user_id,project_id,plan_date" }
  );
  if (error) return { error: `Couldn't save your plan: ${error.message}` };

  // Persist the reordered priority as each task's order_index (existing
  // column in schema.sql, previously unused).
  await Promise.all(
    orderedTaskIds.map((id, index) =>
      supabase.from("tasks").update({ order_index: index }).eq("id", id).eq("user_id", user.id)
    )
  );

  revalidatePath("/today");
  return {};
}

type QuickAddItem = { type: "existing"; id: string } | { type: "new"; title: string };

/**
 * Quick-add planning style: the person just types their priorities one at a
 * time (no drag-to-reorder ceremony), optionally mixed with tasks they'd
 * already added elsewhere. This creates any brand-new tasks, orders the
 * whole list, and finalizes today's plan in one step.
 */
export async function quickAddPlan(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please log in again." };

  const [activeProject, { data: profile }] = await Promise.all([
    getActiveProject(),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (!activeProject) return { error: "No active project." };

  const items = JSON.parse((formData.get("items") as string) || "[]") as QuickAddItem[];
  const goalMinutesRaw = formData.get("goalMinutes") as string;
  const goalMinutes = goalMinutesRaw ? Number(goalMinutesRaw) : null;

  const writes = items.map((item, index) => {
    if (item.type === "existing") {
      return supabase
        .from("tasks")
        .update({ order_index: index })
        .eq("id", item.id)
        .eq("user_id", user.id);
    }
    return supabase.from("tasks").insert({
      user_id: user.id,
      project_id: activeProject.id,
      title: item.title.trim(),
      order_index: index,
    });
  });

  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: `Couldn't save your tasks: ${failed.error.message}` };

  const planDate = todayKeyInTimezone(profile?.timezone);
  const { error } = await supabase.from("daily_plans").upsert(
    {
      user_id: user.id,
      project_id: activeProject.id,
      plan_date: planDate,
      goal_minutes: goalMinutes,
      reflection: null,
    },
    { onConflict: "user_id,project_id,plan_date" }
  );
  if (error) return { error: `Couldn't save your plan: ${error.message}` };

  revalidatePath("/today");
  revalidatePath("/tasks");
  return {};
}

export async function skipPlanning(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please log in again." };

  const [activeProject, { data: profile }] = await Promise.all([
    getActiveProject(),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (!activeProject) return { error: "No active project." };

  const planDate = todayKeyInTimezone(profile?.timezone);

  const { error } = await supabase.from("daily_plans").upsert(
    {
      user_id: user.id,
      project_id: activeProject.id,
      plan_date: planDate,
      goal_minutes: null,
      reflection: null,
    },
    { onConflict: "user_id,project_id,plan_date" }
  );
  if (error) return { error: `Couldn't skip planning: ${error.message}` };

  revalidatePath("/today");
  return {};
}
