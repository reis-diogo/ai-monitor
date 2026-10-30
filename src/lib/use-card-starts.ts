"use client";

import { useEffect, useState } from "react";

const POLL_MS = 15000;

export function useCardStarts(): Record<string, string> {
  const [starts, setStarts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/clickup/started");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.started && typeof data.started === "object") setStarts(data.started);
      } catch {}
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return starts;
}
