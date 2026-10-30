"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityProgress } from "@/lib/types";

const POLL_MS = 8000;
const FINISH_HOLD_MS = 3000;
const EXPIRED_AFTER_MS = 25 * 60 * 1000;

export function useActivityProgress(): Map<string, ActivityProgress> {
  const [progress, setProgress] = useState<Map<string, ActivityProgress>>(
    new Map(),
  );
  const [finishing, setFinishing] = useState<Map<string, ActivityProgress>>(
    new Map(),
  );
  const lastSeen = useRef<Map<string, ActivityProgress>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function hold(item: ActivityProgress) {
      const done: ActivityProgress = {
        ...item,
        percent: 100,
        stage: "concluído",
        state: "running",
      };
      setFinishing((current) => new Map(current).set(item.activityId, done));
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setFinishing((current) => {
            const next = new Map(current);
            next.delete(item.activityId);
            return next;
          });
        }, FINISH_HOLD_MS),
      );
    }

    async function load() {
      try {
        const res = await fetch("/api/architect/progress");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.progress)) return;

        const next = new Map(
          (data.progress as ActivityProgress[]).map((item) => [
            item.activityId,
            item,
          ]),
        );

        for (const [id, previous] of lastSeen.current) {
          const age = Date.now() - new Date(previous.updatedAt).getTime();
          if (
            !next.has(id) &&
            previous.percent !== null &&
            previous.state === "running" &&
            age < EXPIRED_AFTER_MS
          ) {
            hold(previous);
          }
        }

        lastSeen.current = next;
        setProgress(next);
      } catch {}
    }

    load();
    const interval = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return useMemo(
    () => new Map([...finishing, ...progress]),
    [finishing, progress],
  );
}
