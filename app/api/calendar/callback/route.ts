import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings?calendarError=${encodeURIComponent("Google Calendar connection was cancelled.")}`, siteUrl)
    );
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL(`/settings?calendarError=${encodeURIComponent("Couldn't verify the Google Calendar connection request. Please try again.")}`, siteUrl)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google only returns a refresh_token on the FIRST consent (or when
      // prompt=consent forces re-consent, which buildGoogleAuthUrl always
      // sets) — if it's still missing here, surface a clear error instead
      // of silently storing a connection that will die in an hour.
      throw new Error(
        "Google didn't return a refresh token. Please revoke Tempo's access in your Google Account and try connecting again."
      );
    }

    await supabase.from("calendar_connections").upsert({
      user_id: user.id,
      provider: "google",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      calendar_id: "primary",
    });

    return NextResponse.redirect(new URL("/settings?calendarConnected=1", siteUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't connect Google Calendar.";
    return NextResponse.redirect(new URL(`/settings?calendarError=${encodeURIComponent(message)}`, siteUrl));
  }
}
