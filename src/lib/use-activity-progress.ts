"use client";

import { useEffect, useState } from "react";
import type { ActivityProgress } from "@/lib/types";

const POLL_MS = 8000;

// A IA local roda no terminal, sem canal de volta para a aba aberta: a tela so
// descobre que alguma etapa avancou perguntando de novo.
export function useActivityProgress(): Map<string, ActivityProgress> {
  const [progress, setProgress] = useState<Map<string, ActivityProgress>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/architect/progress");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.progress)) return;
        setProgress(
          new Map((data.progress as ActivityProgress[]).map((item) => [item.activityId, item]))
        );
      } catch {
        // Uma leitura perdida so adia o indicador ate o proximo ciclo.
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return progress;
}
