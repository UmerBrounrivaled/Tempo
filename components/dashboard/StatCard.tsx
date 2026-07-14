import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
            {value}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {label}
            {sublabel ? ` · ${sublabel}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
