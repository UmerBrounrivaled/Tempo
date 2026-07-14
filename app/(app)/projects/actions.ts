"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE, getActiveProjectId } from "@/lib/projects";

export async function listProjects() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("projects")
    .select("id, name, color, is_default")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getActiveProject() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeId = await getActiveProjectId(
    supabase,
    user.id,
    cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value
  );
  if (!activeId) return null;

  const { data } = await supabase
    .from("projects")
    .select("id, name, color, is_default")
    .eq("id", activeId)
    .single();

  return data;
}

export async function createProject(formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Project name can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please log in again." };

  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();

  if (error) return { error: `Couldn't create project: ${error.message}` };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROJECT_COOKIE, data.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return {};
}

export async function setActiveProject(projectId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
