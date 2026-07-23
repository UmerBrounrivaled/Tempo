"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function WidgetToggle() {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("focusWidget.autoExpand");
      setEnabled(raw === "true");
    } catch (e) {
      setEnabled(false);
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem("focusWidget.autoExpand", String(next));
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">Timer widget behavior</div>
        <div className="text-xs text-neutral-500">Keep the floating timer collapsed on the Focus page unless enabled.</div>
      </div>
      <div>
        <Button onClick={toggle} variant={enabled ? "default" : "outline"} size="sm">
          {enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>
    </div>
  );
}
