import { createClient } from "@/lib/supabase/server";
import { dayBoundsInTimezone } from "@/lib/date";

const GOOGLE_OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type NormalizedCalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local (see .env.local.example) before using Google Calendar sync.`
    );
  }
  return value;
}

/** Builds the URL to send the user to for Google's OAuth consent screen. */
export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const params = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };
}

async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${await res.text()}`);
  }

  return (await res.json()) as { access_token: string; expires_in: number };
}

/**
 * Server-side helper: returns today's events for the user (in their local
 * timezone), refreshing the access token if it's expired. Read-only for v1
 * — no write-back to Google is implemented.
 */
export async function getTodayEvents(userId: string): Promise<NormalizedCalendarEvent[]> {
  const supabase = await createClient();

  const [{ data: connection }, { data: profile }] = await Promise.all([
    supabase
      .from("calendar_connections")
      .select("access_token, refresh_token, token_expires_at, calendar_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", userId).single(),
  ]);

  if (!connection) return [];

  let accessToken = connection.access_token;
  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (Date.now() >= expiresAt - 60_000) {
    const refreshed = await refreshAccessToken(connection.refresh_token);
    accessToken = refreshed.access_token;
    await supabase
      .from("calendar_connections")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("user_id", userId);
  }

  const { startUtc, endUtc } = dayBoundsInTimezone(new Date(), profile?.timezone);
  const calendarId = encodeURIComponent(connection.calendar_id || "primary");
  const params = new URLSearchParams({
    timeMin: startUtc.toISOString(),
    timeMax: endUtc.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    // Fail soft: the timeline just shows focus-session blocks if the
    // calendar API call fails (expired/revoked grant, transient error, etc).
    return [];
  }

  const json = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      start?: { date?: string; dateTime?: string };
      end?: { date?: string; dateTime?: string };
    }[];
  };

  return (json.items ?? []).map((item) => {
    const allDay = Boolean(item.start?.date && !item.start?.dateTime);
    return {
      id: item.id,
      title: item.summary || "(untitled event)",
      start: item.start?.dateTime ?? `${item.start?.date}T00:00:00.000Z`,
      end: item.end?.dateTime ?? `${item.end?.date}T00:00:00.000Z`,
      allDay,
    };
  });
}
