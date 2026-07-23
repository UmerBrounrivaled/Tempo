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
    .select("id, goal_minutes, reflection")
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
  // New: accept per-priority buckets so the Plan UI can assign tasks to
  // Today / Sooner / Later. These are submitted as JSON arrays of ids.
  const orderedTaskIds = JSON.parse((formData.get("orderedTaskIds") as string) || "[]") as string[];
  const highIds = JSON.parse((formData.get("priority_high") as string) || "[]") as string[];
  const mediumIds = JSON.parse((formData.get("priority_medium") as string) || "[]") as string[];
  const lowIds = JSON.parse((formData.get("priority_low") as string) || "[]") as string[];

  const { error } = await supabase.from("daily_plans").upsert(
    {
      user_id: user.id,
      project_id: activeProject.id,
      plan_date: planDate,
      goal_minutes: goalMinutes,
      reflection,
    },
    { onConflict: "user_id,project_id,plan_date" }
  );

  if (error) return { error: `Couldn't save your plan: ${error.message}` };

  // Persist the reordered priority as each task's order_index and the
  // explicit priority column (high/medium/low). High -> today, medium -> sooner, low -> later.
  const updates: Promise<any>[] = [];
  highIds.forEach((id, index) =>
    updates.push(
      supabase
        .from("tasks")
        .update({ order_index: index, priority: "high" })
        .eq("id", id)
        .eq("user_id", user.id)
    )
  );
  mediumIds.forEach((id, index) =>
    updates.push(
      supabase
        .from("tasks")
        .update({ order_index: index, priority: "medium" })
        .eq("id", id)
        .eq("user_id", user.id)
    )
  );
  lowIds.forEach((id, index) =>
    updates.push(
      supabase
        .from("tasks")
        .update({ order_index: index, priority: "low" })
        .eq("id", id)
        .eq("user_id", user.id)
    )
  );

  await Promise.all(updates);
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
