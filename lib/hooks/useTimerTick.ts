"use client";

import { useEffect, useRef } from "react";
import { useTimerStore } from "@/lib/store/timerStore";

/**
 * Drives the timer countdown. Must be mounted exactly once, at a layout level
 * that persists across route changes (see components/timer/TimerEngine.tsx),
 * so the countdown never stops when the user navigates between /today,
 * /tasks, /notes, etc.
 *
 * secondsRemaining itself is a derived value (see timerStore.tick), so a
 * throttled/delayed interval tick just recomputes the correct value instead
 * of compounding drift. On top of the 1s interval, we force an immediate
 * recompute whenever the tab regains visibility/focus so the displayed time
 * snaps correct right away rather than waiting for the next tick.
 */
export function useTimerTick() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const tick = useTimerStore((s) => s.tick);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      // Recompute immediately on start, then every second.
      tick();
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  useEffect(() => {
    const recompute = () => tick();
    document.addEventListener("visibilitychange", recompute);
    window.addEventListener("focus", recompute);
    return () => {
      document.removeEventListener("visibilitychange", recompute);
      window.removeEventListener("focus", recompute);
    };
  }, [tick]);
}
