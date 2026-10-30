"use client";

import { useEffect, useState } from "react";
import { stageDurations } from "@/lib/monitor/model";

const REFRESH_MS = 5 * 60 * 1000;

export function useStageTimes(ids: string[]): Map<string, (number | null)[]> {
  const [times, setTimes] = useState<Map<string, (number | null)[]>>(new Map());
  const key = [...ids].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/clickup/status-times?ids=${encodeURIComponent(key)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.times) return;
        setTimes(
          new Map(
            Object.entries(
              data.times as Record<string, Record<string, number>>,
            ).map(([id, byStatus]) => [id, stageDurations(byStatus)]),
          ),
        );
      } catch {}
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key]);

  return times;
}
