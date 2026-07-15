export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-neutral-900 transition-[width] duration-500 ease-out dark:bg-neutral-50"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
