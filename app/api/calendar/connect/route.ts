import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    path: "/",
    maxAge: 60 * 10,
    httpOnly: true,
  });

  try {
    const authUrl = buildGoogleAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Calendar isn't configured yet.";
    return NextResponse.redirect(
      new URL(`/settings?calendarError=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_SITE_URL)
    );
  }
}
