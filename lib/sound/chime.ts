let audioCtx: AudioContext | null = null;

/**
 * Must be called synchronously inside a real user gesture handler (the
 * "Start Session" click) — browsers block audio without one. Creating and/or
 * resuming the AudioContext here "unlocks" it so a later, gesture-less call
 * to playSessionEndChime() (fired from a timer effect) is allowed to play.
 */
export function primeAudio() {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

/** A short, non-jarring two-tone chime, synthesized (no bundled audio asset). */
export function playSessionEndChime() {
  if (typeof window === "undefined" || !audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;

  const playTone = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.2, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  };

  playTone(880, 0, 0.25);
  playTone(1174.66, 0.18, 0.35);
}
