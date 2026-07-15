"use client";

import { useEffect, useRef } from "react";
import { useTimerStore, durationFor } from "@/lib/store/timerStore";
import { useTimerTick } from "@/lib/hooks/useTimerTick";
import { logSession } from "@/app/(app)/focus/actions";
import { playSessionEndChime } from "@/lib/sound/chime";

export function TimerEngine({
  soundOnSessionEnd = true,
  autoStartBreak = true,
}: {
  soundOnSessionEnd?: boolean;
  autoStartBreak?: boolean;
}) {
  // Mounted once at the (app) layout level so the countdown survives
  // navigation between /today, /focus, /tasks, /notes, etc.
  useTimerTick();

  const {
    mode,
    phase,
    isRunning,
    secondsRemaining,
    taskId,
    startedAt,
    customFocusMinutes,
    customBreakMinutes,
    completePhase,
    start,
  } = useTimerStore();

  // Ask for notification permission once, on mount.
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Guard against firing the completion side-effects more than once for the
  // same phase-end (e.g. re-renders while secondsRemaining sits at 0).
  const firedForStartedAt = useRef<string | null>(null);

  useEffect(() => {
    if (secondsRemaining !== 0 || !isRunning) return;
    if (firedForStartedAt.current === startedAt) return;
    firedForStartedAt.current = startedAt;

    const totalDuration = durationFor(mode, phase, customFocusMinutes, customBreakMinutes);

    if (startedAt) {
      logSession({
        taskId: phase === "focus" ? taskId : null,
        startedAt,
        durationSeconds: totalDuration,
        sessionType: phase,
        interrupted: false,
      });
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(phase === "focus" ? "Focus session complete" : "Break's over", {
          body: phase === "focus" ? "Time for a break." : "Ready for another focus session?",
        });
      }
    }

    // WI-11: audio cue specifically when a FOCUS session ends.
    if (phase === "focus" && soundOnSessionEnd) {
      playSessionEndChime();
    }

    const completedPhase = completePhase();

    // WI-12: optionally auto-start the break the moment a focus session ends.
    // Scope: only focus -> break auto-continues; resuming focus after a
    // break remains manual.
    if (completedPhase === "focus" && autoStartBreak) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining, isRunning, startedAt]);

  return null;
}
