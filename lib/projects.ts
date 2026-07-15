import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVE_PROJECT_COOKIE = "tempo_active_project";

/**
 * Resolves which project should scope the current request's queries.
 * Falls back to the user's default ("Personal") project if no cookie is
 * set, or if the cookied project no longer belongs to this user (e.g. after
 * switching accounts in the same browser).
 */
export async function getActiveProjectId(
  supabase: SupabaseClient,
  userId: string | undefined,
  cookieProjectId: string | undefined
): Promise<string | null> {
  if (!userId) return null;

  if (cookieProjectId) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("id", cookieProjectId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (data) return data.id as string;
  }

  const { data: defaultProject } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (defaultProject) return defaultProject.id as string;

  // Extremely defensive fallback: any project owned by the user.
  const { data: anyProject } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  return anyProject?.id ?? null;
}
