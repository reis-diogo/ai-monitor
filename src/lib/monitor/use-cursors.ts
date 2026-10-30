"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export type CursorState = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  smooth?: boolean;
  seen?: number;
};

export type OnlinePerson = { id: string; name: string; color: string; avatar: string | null };

export type CursorBounds = { x: number; y: number; w: number; h: number };

export const CURSOR_COLORS = [
  "#a974ff",
  "#2dd4bf",
  "#fb923c",
  "#f472b6",
  "#60a5fa",
  "#facc15",
  "#34d399",
  "#f87171",
  "#94a3b8",
];

const CHANNEL = "monitor-mapa";
const STALE_MS = 6000;

export function defaultCursorColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

export function useRemoteCursors(name: string, color: string, avatar: string | null = null) {
  const [clientId] = useState(() => crypto.randomUUID());
  const [cursors, setCursors] = useState<CursorState[]>([]);
  const [online, setOnline] = useState<OnlinePerson[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const selfRef = useRef({ name, color, avatar });

  useEffect(() => {
    selfRef.current = { name, color, avatar };
    const channel = channelRef.current;
    if (channel && name) void channel.track({ name, color, avatar });
  }, [name, color, avatar]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !name) return;

    const channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: clientId } },
    });

    channel
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        const next = payload as CursorState;
        if (!next?.id || next.id === clientId) return;
        setCursors((current) => [
          ...current.filter((cursor) => cursor.id !== next.id),
          { ...next, seen: Date.now() },
        ]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; color: string; avatar?: string | null }>();
        setOnline(
          Object.entries(state)
            .filter(([id]) => id !== clientId)
            .map(([id, metas]) => ({
              id,
              name: metas[0]?.name ?? "—",
              color: metas[0]?.color ?? "#94a3b8",
              avatar: metas[0]?.avatar ?? null,
            }))
        );
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setCursors((current) => current.filter((cursor) => cursor.id !== key));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track(selfRef.current);
      });

    channelRef.current = channel;
    const sweep = setInterval(() => {
      setCursors((current) => {
        const alive = current.filter((cursor) => Date.now() - (cursor.seen ?? 0) < STALE_MS);
        return alive.length === current.length ? current : alive;
      });
    }, 2000);

    return () => {
      clearInterval(sweep);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [clientId, name]);

  const send = useCallback(
    (x: number, y: number) => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "cursor",
        payload: { id: clientId, name: selfRef.current.name, color: selfRef.current.color, x, y },
      });
    },
    [clientId]
  );

  return { cursors, online, send };
}

const SIMULATED = [
  { name: "Thaina Coutinho", color: "#a974ff" },
  { name: "Luciana Burlamaqui", color: "#2dd4bf" },
  { name: "faruk", color: "#fb923c" },
  { name: "giovanni", color: "#f472b6" },
  { name: "Gabriel", color: "#60a5fa" },
  { name: "Leonardo", color: "#facc15" },
];

function pick(bounds: CursorBounds[]): { x: number; y: number } {
  const area = bounds[Math.floor(Math.random() * bounds.length)];
  return { x: area.x + Math.random() * area.w, y: area.y + Math.random() * area.h };
}

export function useSimulatedCursors(bounds: CursorBounds[], enabled: boolean): CursorState[] {
  const boundsRef = useRef(bounds);
  const [ghosts, setGhosts] = useState<CursorState[]>([]);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    if (!enabled) {
      const reset = setTimeout(() => setGhosts([]), 0);
      return () => clearTimeout(reset);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;

    timers.push(
      setTimeout(() => {
        if (!alive || !boundsRef.current.length) return;
        setGhosts(
          SIMULATED.map((person, index) => ({
            id: `ghost-${index}`,
            ...person,
            ...pick(boundsRef.current),
            smooth: true,
          }))
        );
      }, 0)
    );

    SIMULATED.forEach((_, index) => {
      const move = () => {
        if (!alive || !boundsRef.current.length) return;
        const target = pick(boundsRef.current);
        setGhosts((current) => current.map((ghost, i) => (i === index ? { ...ghost, ...target } : ghost)));
        timers.push(setTimeout(move, 1800 + Math.random() * 2600));
      };
      timers.push(setTimeout(move, 600 + index * 700));
    });

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [enabled]);

  return enabled ? ghosts : [];
}
