import { useCallback, useSyncExternalStore } from "react";
import type { StatusLimit, StatusLimits } from "@/lib/monitor/model";

const KEY = "monitor:limits";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(next: StatusLimits): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useStatusLimits() {
  const raw = useSyncExternalStore(subscribe, read, () => "{}");

  let limits: StatusLimits = {};
  try {
    limits = JSON.parse(raw) as StatusLimits;
  } catch {}

  const setLimit = useCallback((status: string, base: StatusLimit, patch: Partial<StatusLimit>) => {
    let current: StatusLimits = {};
    try {
      current = JSON.parse(read()) as StatusLimits;
    } catch {}
    write({ ...current, [status]: { ...base, ...current[status], ...patch } });
  }, []);

  const reset = useCallback(() => write({}), []);

  return { limits, setLimit, reset };
}
