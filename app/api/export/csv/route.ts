import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  let query = supabase
    .from("focus_sessions")
    .select("started_at, ended_at, duration_seconds, session_type, interrupted, tasks(title)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  // No params => entire history, unchanged from the original behavior.
  if (fromParam) {
    query = query.gte("started_at", startOfDay(new Date(fromParam)).toISOString());
  }
  if (toParam) {
    query = query.lt("started_at", addDays(startOfDay(new Date(toParam)), 1).toISOString());
  }

  const { data: sessions } = await query;

  const rows = [
    ["Date", "Task", "Type", "Duration (min)", "Interrupted"],
    ...(sessions ?? []).map((s) => {
      const task = Array.isArray(s.tasks) ? s.tasks[0] : s.tasks;
      return [
        new Date(s.started_at).toLocaleString(),
        task?.title ?? "",
        s.session_type,
        (s.duration_seconds ? (s.duration_seconds / 60).toFixed(1) : "0"),
        s.interrupted ? "yes" : "no",
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const filenameSuffix = fromParam && toParam ? `-${fromParam}-to-${toParam}` : "";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="focus-sessions${filenameSuffix}.csv"`,
    },
  });
}
