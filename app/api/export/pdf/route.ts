import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay, format } from "date-fns";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Runs as a standard Node.js route handler — pdf-lib is not Edge-compatible.
export const runtime = "nodejs";

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

  // Mirrors app/api/export/csv/route.ts's query logic exactly, so the two
  // exports can be verified against each other for the same range.
  let query = supabase
    .from("focus_sessions")
    .select("started_at, duration_seconds, session_type, interrupted, tasks(title)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (fromParam) {
    query = query.gte("started_at", startOfDay(new Date(fromParam)).toISOString());
  }
  if (toParam) {
    query = query.lt("started_at", addDays(startOfDay(new Date(toParam)), 1).toISOString());
  }

  const { data: sessions } = await query;
  const focusSessions = (sessions ?? []).filter((s) => s.session_type === "focus");

  const totalMinutes = Math.round(
    focusSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60
  );
  const completedCount = focusSessions.filter((s) => !s.interrupted).length;

  const byTask = new Map<string, { minutes: number; count: number }>();
  focusSessions.forEach((s) => {
    const task = Array.isArray(s.tasks) ? s.tasks[0] : s.tasks;
    const label = task?.title ?? "Freeform focus";
    const existing = byTask.get(label) ?? { minutes: 0, count: 0 };
    existing.minutes += Math.round((s.duration_seconds ?? 0) / 60);
    existing.count += 1;
    byTask.set(label, existing);
  });
  const taskRows = [...byTask.entries()].sort((a, b) => b[1].minutes - a[1].minutes);

  const rangeLabel =
    fromParam && toParam
      ? `${fromParam} to ${toParam}`
      : "All time";

  // --- Render with pdf-lib ---
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  let y = 792 - margin;

  const drawText = (text: string, size: number, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x: margin, y, size, font: bold ? boldFont : font, color });
    y -= size + 8;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([612, 792]);
      y = 792 - margin;
    }
  };

  drawText("Tempo — Focus Report", 20, true);
  drawText(`Range: ${rangeLabel}`, 11, false, rgb(0.4, 0.4, 0.4));
  drawText(`Generated: ${format(new Date(), "MMM d, yyyy p")}`, 11, false, rgb(0.4, 0.4, 0.4));
  y -= 10;

  drawText("Summary", 14, true);
  drawText(`Total focus time: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)`, 11);
  drawText(`Total sessions: ${focusSessions.length}`, 11);
  drawText(
    `Completed vs interrupted: ${completedCount} completed, ${
      focusSessions.length - completedCount
    } interrupted`,
    11
  );
  y -= 10;

  drawText("Time by task", 14, true);
  if (taskRows.length === 0) {
    drawText("No focus sessions in this range.", 11, false, rgb(0.5, 0.5, 0.5));
  } else {
    const colX = { task: margin, sessions: margin + 320, minutes: margin + 420 };
    page.drawText("Task", { x: colX.task, y, size: 10, font: boldFont });
    page.drawText("Sessions", { x: colX.sessions, y, size: 10, font: boldFont });
    page.drawText("Minutes", { x: colX.minutes, y, size: 10, font: boldFont });
    y -= 16;

    taskRows.forEach(([label, stats]) => {
      ensureSpace(16);
      const truncated = label.length > 42 ? `${label.slice(0, 39)}...` : label;
      page.drawText(truncated, { x: colX.task, y, size: 10, font });
      page.drawText(String(stats.count), { x: colX.sessions, y, size: 10, font });
      page.drawText(String(stats.minutes), { x: colX.minutes, y, size: 10, font });
      y -= 16;
    });
  }

  const bytes = await pdf.save();
  const filenameSuffix = fromParam && toParam ? `-${fromParam}-to-${toParam}` : "";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="focus-report${filenameSuffix}.pdf"`,
    },
  });
}
