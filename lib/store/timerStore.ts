"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimerMode = "pomodoro" | "ultradian" | "custom";
export type SessionPhase = "focus" | "break";

const DURATIONS: Record<Exclude<TimerMode, "custom">, { focus: number; break: number }> = {
  pomodoro: { focus: 25 * 60, break: 5 * 60 },
  ultradian: { focus: 90 * 60, break: 20 * 60 },
};

const CUSTOM_LIMITS = {
  focus: { min: 1, max: 180 },
  break: { min: 1, max: 60 },
};

interface TimerState {
  mode: TimerMode;
  phase: SessionPhase;
  taskId: string | null;
  taskTitle: string | null;
  isRunning: boolean;
  secondsRemaining: number;
  startedAt: string | null; // ISO timestamp of the ORIGINAL start of this phase (for DB logging) — never mutated by pause/resume
  // Internal bookkeeping for deriving secondsRemaining from wall-clock time,
  // so throttled/suspended setInterval ticks self-correct instead of drifting:
  elapsedBeforePauseSeconds: number; // seconds accumulated across previous running segments of this phase
  runningSince: string | null; // ISO timestamp the current running segment began, or null if paused
  interrupted: boolean;
  customFocusMinutes: number;
  customBreakMinutes: number;

  setMode: (mode: TimerMode) => void;
  setCustomDurations: (focusMinutes: number, breakMinutes: number) => void;
  start: (task?: { id: string; title: string }) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  completePhase: () => SessionPhase; // returns the phase that just completed
}

/** Derives the true elapsed seconds for the current phase from wall-clock time. */
function deriveElapsedSeconds(elapsedBeforePauseSeconds: number, runningSince: string | null) {
  if (!runningSince) return elapsedBeforePauseSeconds;
  const runningMs = Date.now() - new Date(runningSince).getTime();
  return elapsedBeforePauseSeconds + Math.max(0, runningMs) / 1000;
}

function durationsFor(
  mode: TimerMode,
  customFocusMinutes: number,
  customBreakMinutes: number
) {
  if (mode === "custom") {
    return { focus: customFocusMinutes * 60, break: customBreakMinutes * 60 };
  }
  return DURATIONS[mode];
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: "pomodoro",
      phase: "focus",
      taskId: null,
      taskTitle: null,
      isRunning: false,
      secondsRemaining: DURATIONS.pomodoro.focus,
      startedAt: null,
      elapsedBeforePauseSeconds: 0,
      runningSince: null,
      interrupted: false,
      customFocusMinutes: 45,
      customBreakMinutes: 10,

      setMode: (mode) => {
        const { customFocusMinutes, customBreakMinutes } = get();
        set({
          mode,
          phase: "focus",
          isRunning: false,
          secondsRemaining: durationsFor(mode, customFocusMinutes, customBreakMinutes)
            .focus,
          startedAt: null,
          elapsedBeforePauseSeconds: 0,
          runningSince: null,
        });
      },

      setCustomDurations: (focusMinutes, breakMinutes) => {
        const clampedFocus = Math.min(
          Math.max(Math.round(focusMinutes) || 1, CUSTOM_LIMITS.focus.min),
          CUSTOM_LIMITS.focus.max
        );
        const clampedBreak = Math.min(
          Math.max(Math.round(breakMinutes) || 1, CUSTOM_LIMITS.break.min),
          CUSTOM_LIMITS.break.max
        );
        const { mode, phase, isRunning } = get();
        set({
          customFocusMinutes: clampedFocus,
          customBreakMinutes: clampedBreak,
          // Live-update the visible countdown if the user tweaks settings
          // before starting (or between phases) in custom mode.
          ...(mode === "custom" && !isRunning
            ? {
                secondsRemaining:
                  phase === "focus" ? clampedFocus * 60 : clampedBreak * 60,
              }
            : {}),
        });
      },

      start: (task) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          isRunning: true,
          startedAt: nowIso,
          elapsedBeforePauseSeconds: 0,
          runningSince: nowIso,
          taskId: task?.id ?? state.taskId,
          taskTitle: task?.title ?? state.taskTitle,
          interrupted: false,
        }));
      },

      pause: () => {
        const { elapsedBeforePauseSeconds, runningSince } = get();
        set({
          isRunning: false,
          interrupted: true,
          elapsedBeforePauseSeconds: deriveElapsedSeconds(
            elapsedBeforePauseSeconds,
            runningSince
          ),
          runningSince: null,
        });
      },

      resume: () => set({ isRunning: true, runningSince: new Date().toISOString() }),

      reset: () => {
        const { mode, customFocusMinutes, customBreakMinutes } = get();
        set({
          phase: "focus",
          isRunning: false,
          secondsRemaining: durationsFor(mode, customFocusMinutes, customBreakMinutes)
            .focus,
          startedAt: null,
          elapsedBeforePauseSeconds: 0,
          runningSince: null,
          taskId: null,
          taskTitle: null,
          interrupted: false,
        });
      },

      // Self-correcting: always recompute from wall-clock time rather than
      // decrementing by a fixed step, so a throttled/delayed/backgrounded
      // tick snaps straight to the correct value instead of drifting.
      tick: () => {
        const {
          mode,
          phase,
          customFocusMinutes,
          customBreakMinutes,
          elapsedBeforePauseSeconds,
          runningSince,
          isRunning,
        } = get();
        if (!isRunning || !runningSince) return;
        const total = durationsFor(mode, customFocusMinutes, customBreakMinutes)[phase];
        const elapsed = deriveElapsedSeconds(elapsedBeforePauseSeconds, runningSince);
        set({ secondsRemaining: Math.max(0, Math.round(total - elapsed)) });
      },

      completePhase: () => {
        const { mode, phase, customFocusMinutes, customBreakMinutes } = get();
        const nextPhase: SessionPhase = phase === "focus" ? "break" : "focus";
        set({
          phase: nextPhase,
          isRunning: false,
          secondsRemaining: durationsFor(mode, customFocusMinutes, customBreakMinutes)[
            nextPhase
          ],
          startedAt: null,
          elapsedBeforePauseSeconds: 0,
          runningSince: null,
        });
        return phase;
      },
    }),
    { name: "focus-timer-storage" }
  )
);

export function durationFor(
  mode: TimerMode,
  phase: SessionPhase,
  customFocusMinutes?: number,
  customBreakMinutes?: number
) {
  return durationsFor(mode, customFocusMinutes ?? 45, customBreakMinutes ?? 10)[phase];
}

export { CUSTOM_LIMITS };
