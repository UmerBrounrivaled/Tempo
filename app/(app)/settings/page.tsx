import { createClient } from "@/lib/supabase/server";
import { updateProfile, disconnectCalendar } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, CalendarCheck2, CalendarPlus, FileText } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendarConnected?: string; calendarError?: string }>;
}) {
  const { calendarConnected, calendarError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: calendarConnection }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, daily_goal_minutes, sound_on_session_end, auto_start_break, timezone")
      .eq("id", user?.id)
      .single(),
    supabase
      .from("calendar_connections")
      .select("connected_at, calendar_id")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile?.full_name ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dailyGoalMinutes">Daily focus goal (minutes)</Label>
              <Input
                id="dailyGoalMinutes"
                name="dailyGoalMinutes"
                type="number"
                min={0}
                step={5}
                defaultValue={profile?.daily_goal_minutes ?? 240}
              />
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Email: {user?.email} &middot; Timezone: {profile?.timezone ?? "UTC"}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="autoStartBreak"
                defaultChecked={profile?.auto_start_break ?? true}
                className="h-4 w-4"
              />
              Automatically start my break when a focus session ends
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="soundOnSessionEnd"
                defaultChecked={profile?.sound_on_session_end ?? true}
                className="h-4 w-4"
              />
              Play a sound when a focus session ends
            </label>
            <Button type="submit" className="w-fit">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {calendarConnected && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Google Calendar connected.
            </p>
          )}
          {calendarError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {calendarError}
            </p>
          )}

          {calendarConnection ? (
            <>
              <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <CalendarCheck2 className="h-4 w-4 text-emerald-500" />
                Connected to Google Calendar ({calendarConnection.calendar_id})
              </p>
              <form action={disconnectCalendar}>
                <Button type="submit" variant="outline" size="sm">
                  Disconnect
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Connect Google Calendar to see today&apos;s events alongside your focus sessions.
              </p>
              <a href="/api/calendar/connect">
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Connect Google Calendar
                </Button>
              </a>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a href="/api/export/csv">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download session history (CSV)
            </Button>
          </a>
          <a href="/api/export/pdf">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Download weekly report (PDF)
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
