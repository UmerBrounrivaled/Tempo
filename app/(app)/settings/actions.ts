"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = formData.get("fullName") as string;
  const dailyGoalMinutes = Number(formData.get("dailyGoalMinutes"));

  await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      daily_goal_minutes: dailyGoalMinutes,
      auto_start_break: formData.get("autoStartBreak") === "on",
      sound_on_session_end: formData.get("soundOnSessionEnd") === "on",
    })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}

export async function updatePlanningStyle(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please log in again." };

  const planningStyle = formData.get("planningStyle") as string;
  if (!["priorities", "timeline", "quickadd"].includes(planningStyle)) {
    return { error: "Invalid planning style." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ planning_style: planningStyle })
    .eq("id", user.id);

  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/", "layout");
  return {};
}

export async function disconnectCalendar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("calendar_connections").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/today");
}
