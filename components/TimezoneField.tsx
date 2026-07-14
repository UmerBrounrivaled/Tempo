"use client";

import { useEffect, useRef } from "react";

export function TimezoneField() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
  }, []);

  return <input ref={ref} type="hidden" name="timezone" defaultValue="UTC" />;
}
