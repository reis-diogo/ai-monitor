"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMonitor } from "@/components/Dashboard";
import { useActivityProgress } from "@/lib/use-activity-progress";
import { Icon } from "@/components/monitor/Icon";
import { CursorColorPicker } from "@/components/monitor/CursorColorPicker";
import { LiveCursors } from "@/components/monitor/LiveCursors";
import {
  defaultCursorColor,
  useRemoteCursors,
} from "@/lib/monitor/use-cursors";
import { useUser } from "@clerk/nextjs";
import { MiniLaptop } from "@/components/monitor/MiniLaptop";
import { NewCardForm } from "@/components/monitor/NewCardForm";
import { CardDetailModal } from "@/components/monitor/CardDetailModal";
import {
  NODE_GAP,
  NODE_H,
  NODE_W,
  ProjectUpdatesNode,
} from "@/components/monitor/ProjectUpdatesNode";
import { AnimatedPercent } from "@/components/monitor/AnimatedPercent";
import { PipelineSteps } from "@/components/monitor/PipelineSteps";
import { useStatusLimits } from "@/lib/monitor/limits-store";
import {
  healthStyle,
  stuckRatio,
  STAGES,
  STAGE_NAMES,
  buildCards,
  buildProjects,
  formatSpan,
  isDoneStatus,
  spanColor,
  type MonitorCard,
  type ProjectSummary,
} from "@/lib/monitor/model";
import { buildUpdates } from "@/lib/monitor/updates";
import { normalizeLocation } from "@/lib/normalize-location";
import type { ProjectProgress, ProjectStatusCount } from "@/lib/types";

const REGION_W = 760;
const GAP = 140;
const CARD_H = 148;
const RECENT_WINDOW_MS = 5 * 60 * 60 * 1000;
const HEAD_H = 410;
const MAX_CARDS = 6;
const TITLE_H = 130;
const KIND_STAGE = { architect: 1, dev: 2, review: 3 } as const;
const DEV_STAGE = KIND_STAGE.dev;
const KIND_LABEL = {
  architect: "Arquiteto",
  dev: "Dev",
  review: "Revisor",
} as const;
const OPEN_W = 1300;
const MIN_Z = 0.15;
const MAX_Z = 2.5;
const EASE = "cubic-bezier(.45,.05,.35,1)";

type Cam = { tx: number; ty: number; z: number };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function readHashCam(): { x: number; y: number; z: number } | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const z = Number(params.get("z"));
  if (!z) return null;
  return {
    x: Number(params.get("x")) || 0,
    y: Number(params.get("y")) || 0,
    z,
  };
}

function ZoneTitle({
  x,
  label,
  count,
}: {
  x: number;
  label: string;
  count: number;
}) {
  return (
    <h2
      className="absolute m-0 flex items-baseline gap-5 whitespace-nowrap text-[64px] font-bold tracking-[-0.02em] transition-[left] duration-300"
      style={{ left: x, top: 0 }}
    >
      {label}
      <span className="text-[40px] font-normal text-muted-foreground">
        {count}
      </span>
    </h2>
  );
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function progressOf(
  project: string,
  entries: ProjectProgress[],
): { percent: number; statuses: ProjectStatusCount[] } | null {
  const key = slug(project);
  const own = entries.filter((entry) => {
    const name = slug(entry.name);
    return name === key || name.startsWith(`${key}-`);
  });
  if (!own.length) return null;

  const merged = new Map<string, ProjectStatusCount>();
  for (const entry of own) {
    for (const item of entry.statuses ?? []) {
      const current = merged.get(item.status);
      if (current) current.count += item.count;
      else merged.set(item.status, { ...item });
    }
  }

  return {
    percent: Math.round(
      own.reduce((sum, entry) => sum + entry.percent, 0) / own.length,
    ),
    statuses: [...merged.values()].sort((a, b) => b.count - a.count),
  };
}

function estimateRemaining(
  percent: number | null,
  startedAt: string | null,
  now: number,
): string | null {
  if (percent === null || percent < 5 || percent >= 100 || !startedAt)
    return null;
  const elapsed = now - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 30_000) return null;
  const minutes = Math.ceil((elapsed * ((100 - percent) / percent)) / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `~${hours}h ${rest}min` : `~${hours}h`;
}

function visibleCards(project: ProjectSummary): MonitorCard[] {
  return [...project.cards]
    .sort((a, b) => (b.elapsedMs ?? -1) - (a.elapsedMs ?? -1))
    .slice(0, MAX_CARDS);
}

export function MapView() {
  const {
    activityItems,
    dwellMap,
    projectNames,
    nowTick,
    flowLog,
    statusEvents,
    projectProgress,
    clickupTasks,
    fetchClickupTasks,
    updateClickupTaskStatus,
  } = useMonitor();
  const { limits } = useStatusLimits();

  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hitRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initialisedRef = useRef(false);

  const [cam, setCam] = useState<Cam>({ tx: 40, ty: 80, z: 0.3 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anim, setAnim] = useState(false);
  const [refreshingProject, setRefreshingProject] = useState<string | null>(
    null,
  );
  const [detailCard, setDetailCard] = useState<MonitorCard | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [hit, setHit] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [clickupUrl, setClickupUrl] = useState<string | null>(null);
  const progressMap = useActivityProgress();
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newCardProject, setNewCardProject] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const lastSendRef = useRef(0);
  const { user } = useUser();
  const myName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ??
    "";
  const myColor = pickedColor ?? defaultCursorColor(myName);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [nodes, setNodes] = useState<string[]>([]);

  const allCards = useMemo(
    () => buildCards(activityItems, dwellMap, nowTick),
    [activityItems, dwellMap, nowTick],
  );
  const progressCards = allCards;
  const workload = useMemo(() => {
    const since = nowTick - RECENT_WINDOW_MS;
    const byId = new Map(activityItems.map((item) => [item.id, item]));
    const people = new Map<string, { actions: number; open: number }>();
    const entry = (name: string) => {
      const current = people.get(name) ?? { actions: 0, open: 0 };
      people.set(name, current);
      return current;
    };
    const owners = (item: { assignees?: string[]; authorName: string }) =>
      item.assignees?.length ? item.assignees : [item.authorName];

    for (const event of statusEvents) {
      if (new Date(event.at).getTime() < since) continue;
      const item = byId.get(event.taskId);
      if (item) for (const name of owners(item)) entry(name).actions += 1;
    }
    for (const card of allCards) {
      for (const name of card.assignees.length ? card.assignees : [card.owner])
        entry(name).open += 1;
    }
    return people;
  }, [activityItems, statusEvents, allCards, nowTick]);
  const delivery = useMemo(() => {
    const totals = new Map<string, { count: number; totalMs: number }>();
    for (const task of clickupTasks) {
      if (!isDoneStatus(task.status) || !task.dateClosed) continue;
      const span =
        new Date(task.dateClosed).getTime() - new Date(task.date).getTime();
      if (!Number.isFinite(span) || span < 0) continue;
      const project = normalizeLocation(task.location, projectNames);
      const entry = totals.get(project) ?? { count: 0, totalMs: 0 };
      entry.count += 1;
      entry.totalMs += span;
      totals.set(project, entry);
    }
    return totals;
  }, [clickupTasks, projectNames]);
  const projects = useMemo(
    () =>
      buildProjects(progressCards, projectNames, limits).filter(
        (project) => project.pending > 0,
      ),
    [progressCards, projectNames, limits],
  );
  const updates = useMemo(
    () =>
      buildUpdates(
        activityItems.filter((item) => item.source === "clickup"),
        statusEvents,
        flowLog,
        true,
        200,
      ),
    [activityItems, statusEvents, flowLog],
  );
  const titleByTicket = useMemo(
    () => new Map(allCards.map((card) => [card.customId, card.title])),
    [allCards],
  );
  const layout = useMemo(() => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(projects.length)));
    const rows = Math.max(1, Math.ceil(projects.length / cols));
    const maxCards = Math.max(
      1,
      ...projects.map((project) => visibleCards(project).length),
    );
    const regionH = HEAD_H + maxCards * CARD_H;
    const gridH = rows * (regionH + GAP) - GAP;
    const pos: { x: number; y: number; w: number }[] = [];
    let gridW = REGION_W;
    for (let row = 0; row < rows; row++) {
      let x = 0;
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        if (index >= projects.length) break;
        const w = openKeys.includes(projects[index].name) ? OPEN_W : REGION_W;
        pos[index] = { x, y: TITLE_H + row * (regionH + GAP), w };
        x += w + GAP;
      }
      gridW = Math.max(gridW, x - GAP);
    }
    const nodePos = new Map<
      string,
      { x: number; y: number; dir: "up" | "down"; anchorX: number; gap: number }
    >();
    for (const dir of ["up", "down"] as const) {
      const group = nodes
        .map((name) => ({
          name,
          index: projects.findIndex((project) => project.name === name),
        }))
        .filter(
          (item) =>
            item.index >= 0 &&
            (Math.floor(item.index / cols) < rows / 2 ? "up" : "down") === dir,
        )
        .sort((a, b) => pos[a.index].x - pos[b.index].x);
      const gap = dir === "up" ? NODE_GAP + TITLE_H : NODE_GAP;
      let cursor = Number.NEGATIVE_INFINITY;
      for (const item of group) {
        const p = pos[item.index];
        const x = Math.max(p.x + (p.w - NODE_W) / 2, cursor);
        cursor = x + NODE_W + GAP;
        nodePos.set(item.name, {
          x,
          y: dir === "up" ? p.y - gap - NODE_H : p.y + regionH + gap,
          dir,
          anchorX: p.x + p.w / 2,
          gap,
        });
      }
    }
    const width = gridW;
    const height = TITLE_H + gridH;
    const scale = Math.min(160 / width, 110 / height);
    return {
      regionH,
      cols,
      pos,
      nodePos,
      width,
      height,
      scale,
      offX: (180 - width * scale) / 2,
      offY: (130 - height * scale) / 2,
    };
  }, [projects, openKeys, nodes]);

  const remote = useRemoteCursors(myName, myColor);

  useEffect(() => {
    fetch("/api/clickup/list-url")
      .then((res) => res.json())
      .then((data) =>
        setClickupUrl(typeof data?.url === "string" ? data.url : null),
      )
      .catch(() => setClickupUrl(null));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem("monitor:cursor-color");
        if (saved) setPickedColor(saved);
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function chooseColor(color: string) {
    setPickedColor(color);
    try {
      window.localStorage.setItem("monitor:cursor-color", color);
    } catch {}
  }

  const settle = useCallback(() => {
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => setAnim(false), 650);
  }, []);

  const flyTo = useCallback(
    (bx: number, by: number, bw: number, bh: number, pad = 0.9) => {
      if (!size.w) return;
      const z = clamp(Math.min(size.w / bw, size.h / bh) * pad, MIN_Z, MAX_Z);
      setAnim(true);
      setCam({
        z,
        tx: size.w / 2 - (bx + bw / 2) * z,
        ty: size.h / 2 - (by + bh / 2) * z,
      });
      settle();
    },
    [size, settle],
  );

  const flyToPoint = useCallback(
    (x: number, y: number, z: number) => {
      if (!size.w) return;
      setAnim(true);
      setCam({ z, tx: size.w / 2 - x * z, ty: size.h / 2 - y * z });
      settle();
    },
    [size, settle],
  );

  const fitAll = useCallback(
    (animate = true) => {
      if (!size.w) return;
      const top = 64;
      const z = clamp(
        Math.min(
          size.w / (layout.width + 80),
          (size.h - top) / (layout.height + 80),
        ) * 0.92,
        MIN_Z,
        MAX_Z,
      );
      setAnim(animate);
      setCam({
        z,
        tx: size.w / 2 - (layout.width / 2) * z,
        ty: top + (size.h - top) / 2 - (layout.height / 2) * z,
      });
      if (animate) settle();
    },
    [size, layout, settle],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(el);

    function onWheel(event: WheelEvent) {
      const scroller = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-scroll]",
      );
      if (
        scroller &&
        !event.ctrlKey &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        const atTop = scroller.scrollTop <= 0 && event.deltaY < 0;
        const atBottom =
          scroller.scrollTop + scroller.clientHeight >=
            scroller.scrollHeight - 1 && event.deltaY > 0;
        if (!atTop && !atBottom) return;
      }
      event.preventDefault();
      const rect = el!.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const mouseWheel =
        !event.ctrlKey &&
        event.deltaX === 0 &&
        (event.deltaMode !== 0 ||
          (Number.isInteger(event.deltaY) && Math.abs(event.deltaY) >= 50));
      setAnim(false);
      if (!event.ctrlKey && !mouseWheel) {
        setCam((current) => ({
          ...current,
          tx: current.tx - event.deltaX,
          ty: current.ty - event.deltaY,
        }));
        return;
      }
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      setCam((current) => {
        const z = clamp(current.z * factor, MIN_Z, MAX_Z);
        const k = z / current.z;
        return {
          z,
          tx: px - (px - current.tx) * k,
          ty: py - (py - current.ty) * k,
        };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });

    let gestureBase = 1;
    function onGestureStart(event: Event) {
      event.preventDefault();
      gestureBase = 1;
    }
    function onGestureChange(event: Event) {
      event.preventDefault();
      const gesture = event as Event & {
        scale: number;
        clientX: number;
        clientY: number;
      };
      const rect = el!.getBoundingClientRect();
      const px = gesture.clientX - rect.left;
      const py = gesture.clientY - rect.top;
      const factor = gesture.scale / gestureBase;
      gestureBase = gesture.scale;
      setAnim(false);
      setCam((current) => {
        const z = clamp(current.z * factor, MIN_Z, MAX_Z);
        const k = z / current.z;
        return {
          z,
          tx: px - (px - current.tx) * k,
          ty: py - (py - current.ty) * k,
        };
      });
    }
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);

    function onMove(event: PointerEvent) {
      const start = dragRef.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      dragRef.current = { x: event.clientX, y: event.clientY };
      setCam((current) => ({
        ...current,
        tx: current.tx + dx,
        ty: current.ty + dy,
      }));
    }
    function onUp() {
      if (dragRef.current) {
        dragRef.current = null;
        setDragging(false);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      clearTimeout(settleRef.current);
      clearTimeout(hitRef.current);
    };
  }, []);

  useEffect(() => {
    if (!size.w || initialisedRef.current || !projects.length) return;
    initialisedRef.current = true;
    const frame = requestAnimationFrame(() => {
      const saved = readHashCam();
      if (saved) {
        setAnim(false);
        setCam({
          z: saved.z,
          tx: size.w / 2 - saved.x * saved.z,
          ty: size.h / 2 - saved.y * saved.z,
        });
      } else {
        fitAll(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [size, projects.length, fitAll]);

  useEffect(() => {
    if (!size.w || !initialisedRef.current) return;
    const timer = setTimeout(() => {
      const x = Math.round((size.w / 2 - cam.tx) / cam.z);
      const y = Math.round((size.h / 2 - cam.ty) / cam.z);
      try {
        window.history.replaceState(
          null,
          "",
          `#x=${x}&y=${y}&z=${cam.z.toFixed(2)}`,
        );
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [cam, size]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenKeys((current) => (current.length ? [] : current));
      setNodes((current) => (current.length ? [] : current));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    if ((event.target as HTMLElement).closest("a, button, input")) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    downRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }

  function onCanvasMove(event: React.PointerEvent) {
    const now = performance.now();
    if (now - lastSendRef.current < 100) return;
    lastSendRef.current = now;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    remote.send(
      (event.clientX - rect.left - cam.tx) / cam.z,
      (event.clientY - rect.top - cam.ty) / cam.z,
    );
  }

  function openProject(index: number, event?: React.MouseEvent) {
    const down = downRef.current;
    if (
      event &&
      down &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5
    )
      return;
    openKey(projects[index].name);
  }

  function zoomCenter(factor: number) {
    setAnim(true);
    setCam((current) => {
      const z = clamp(current.z * factor, MIN_Z, MAX_Z);
      const k = z / current.z;
      return {
        z,
        tx: size.w / 2 - (size.w / 2 - current.tx) * k,
        ty: size.h / 2 - (size.h / 2 - current.ty) * k,
      };
    });
    settle();
  }

  function focusProject(index: number) {
    const p = layout.pos[index];
    flyTo(p.x, p.y, p.w, layout.regionH, 0.92);
  }

  function toggleNode(name: string) {
    setNodes((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function openKey(key: string) {
    setOpenKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
  }

  function closeKey(key: string) {
    setOpenKeys((current) => current.filter((item) => item !== key));
  }

  function liveFor(card: MonitorCard) {
    const signal = progressMap.get(card.id);
    const workerName = card.assignees[0] ?? card.owner;
    const workerColor =
      workerName.toLowerCase() === myName.toLowerCase()
        ? myColor
        : (remote.cursors.find(
            (cursor) => cursor.name.toLowerCase() === workerName.toLowerCase(),
          )?.color ?? defaultCursorColor(workerName));
    const workerAvatar =
      card.assigneeAvatars[workerName] ??
      (workerName === card.owner ? card.ownerAvatarUrl : null);
    const stats = workload.get(workerName) ?? { actions: 0, open: 0 };
    const worker = (
      <span className="group relative flex shrink-0">
        <span
          className="flex size-9 items-center justify-center overflow-hidden rounded-full border-2 text-[12px] font-bold"
          style={{
            color: `color-mix(in srgb, ${workerColor} 55%, var(--foreground))`,
            borderColor: workerColor,
            background: `color-mix(in srgb, ${workerColor} 14%, var(--card))`,
          }}
        >
          {workerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workerAvatar}
              alt={workerName}
              className="size-full object-cover"
            />
          ) : (
            workerName.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-max flex-col gap-1 rounded-lg border border-line-input bg-card px-3 py-2 text-[11px] text-muted-foreground shadow-[0_8px_24px_var(--shadow-pop)] group-hover:flex">
          <span className="text-xs font-semibold text-foreground">
            {workerName}
          </span>
          <span>
            <span className="font-bold text-foreground">{stats.actions}</span>{" "}
            {stats.actions === 1 ? "ação" : "ações"} nas últimas 5h
          </span>
          <span>
            <span className="font-bold text-foreground">{stats.open}</span>{" "}
            {stats.open === 1 ? "card aberto" : "cards abertos"}
          </span>
        </span>
      </span>
    );
    if (!signal) {
      if (card.stage === DEV_STAGE) {
        return {
          stage: card.stage,
          node: (
            <div className="flex w-16 flex-col items-center pt-3">
              <div className="relative">
                <MiniLaptop label="Em desenvolvimento" />
                <span className="absolute -right-5 top-0">{worker}</span>
              </div>
            </div>
          ),
        };
      }
      return undefined;
    }
    const kindLabel = KIND_LABEL[signal.kind] ?? "IA";
    const eta = estimateRemaining(signal.percent, signal.startedAt, nowTick);
    const label = `IA local (${kindLabel}): ${signal.stage}${signal.detail ? ` — ${signal.detail}` : ""}`;
    const stage =
      signal.kind === "architect"
        ? card.stage
        : (KIND_STAGE[signal.kind] ?? card.stage);
    return {
      stage,
      node: (
        <div className="flex w-16 flex-col items-center pt-3">
          <div className="relative">
            <MiniLaptop label={label} failed={signal.state === "failed"} />
            <span className="absolute -right-5 top-0">{worker}</span>
          </div>
          {signal.percent !== null && (
            <div
              className="mt-2 flex w-full flex-col items-center gap-1 text-center"
              title={`${signal.percent}% concluído`}
            >
              <AnimatedPercent
                value={signal.percent}
                className="text-sm font-bold leading-none text-primary"
              />
              <span className="h-1 w-full overflow-hidden rounded-full bg-track">
                <motion.span
                  className="block h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${signal.percent}%` }}
                  transition={{ duration: 0.6, ease: [0.45, 0.05, 0.35, 1] }}
                />
              </span>
              {eta && (
                <span
                  className="whitespace-nowrap text-[10px] leading-none text-muted-foreground"
                  title="Tempo estimado até o fim"
                >
                  {eta}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    };
  }

  async function refreshCards(projectName: string) {
    if (refreshingProject) return;
    setRefreshingProject(projectName);
    try {
      await fetchClickupTasks();
    } finally {
      setRefreshingProject(null);
    }
  }

  function runSearch() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setNotFound(false);

    const byProject = projects.findIndex((project) =>
      project.name.toLowerCase().includes(q),
    );
    if (byProject >= 0) {
      openKey(projects[byProject].name);
      focusProject(byProject);
      return;
    }

    for (let i = 0; i < projects.length; i++) {
      const card = projects[i].cards.find(
        (c) =>
          c.customId.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q),
      );
      if (card) {
        openKey(projects[i].name);
        focusProject(i);
        setHit(card.id);
        clearTimeout(hitRef.current);
        hitRef.current = setTimeout(() => setHit(null), 4000);
        return;
      }
    }

    setNotFound(true);
  }

  function onMinimapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const wx = (event.clientX - rect.left - layout.offX) / layout.scale;
    const wy = (event.clientY - rect.top - layout.offY) / layout.scale;
    flyToPoint(wx, wy, cam.z);
  }

  const level = openKeys.length ? "detalhes" : "projetos";
  const transition = anim ? `transform .6s ${EASE}` : "none";
  const grid = 28 * cam.z;

  return (
    <main className="relative min-h-[calc(100vh-7.5rem)] min-w-0 flex-1 overflow-hidden rounded-[14px] border border-border md:min-h-[calc(100vh-2rem)]">
      <div
        ref={rootRef}
        className="absolute inset-0 select-none overflow-hidden bg-background"
        style={{
          backgroundImage:
            "radial-gradient(var(--grid-dot) 1.2px, transparent 1.2px)",
          backgroundSize: `${grid}px ${grid}px`,
          backgroundPosition: `${cam.tx}px ${cam.ty}px`,
        }}
      >
        <div
          onPointerMove={onCanvasMove}
          onPointerDown={onPointerDown}
          className="absolute inset-0"
          style={{
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`,
              transition,
            }}
          >
            <ZoneTitle
              x={0}
              label="Em andamento"
              count={progressCards.length}
            />

            {projects.map((project, index) => {
              const health = healthStyle(project);
              const pos = layout.pos[index];
              const allShown = visibleCards(project);
              const shown = allShown;
              const hidden = project.pending - shown.length;
              const progress = progressOf(project.name, projectProgress);
              const percent = progress?.percent ?? null;
              const isOpen = openKeys.includes(project.name);
              const near = isOpen;

              return (
                <section
                  key={project.name}
                  role={isOpen ? undefined : "button"}
                  tabIndex={isOpen ? undefined : 0}
                  aria-label={
                    isOpen ? undefined : `Abrir detalhes de ${project.name}`
                  }
                  onClick={
                    isOpen ? undefined : (event) => openProject(index, event)
                  }
                  onKeyDown={
                    isOpen
                      ? undefined
                      : (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProject(index);
                          }
                        }
                  }
                  className={`absolute box-border flex flex-col gap-5 rounded-3xl border-2 bg-card px-[34px] py-[30px] transition-[width,left,border-color] duration-300 ${
                    isOpen
                      ? "border-line-input"
                      : "border-line hover:border-primary"
                  }`}
                  style={{
                    width: pos.w,
                    height: layout.regionH,
                    left: pos.x,
                    top: pos.y,
                    zIndex: isOpen ? 10 : undefined,
                    cursor: isOpen ? undefined : "pointer",
                  }}
                >
                  {!isOpen ? (
                    <div className="flex flex-1 flex-col justify-start gap-10 pt-[110px]">
                      <div className="flex min-w-0 items-center gap-7">
                        <span
                          className="size-14 shrink-0 rounded-full"
                          style={{
                            background: health.color,
                            boxShadow: `0 0 0 12px ${health.soft}`,
                          }}
                        />
                        <span className="truncate rounded-3xl border-4 border-line-input bg-surface-raised px-8 py-3 text-[62px] font-bold tracking-[-0.02em]">
                          {project.name}
                        </span>
                      </div>
                      {percent !== null && (
                        <span className="text-[190px] font-bold leading-none tracking-[-0.04em]">
                          {percent}%
                        </span>
                      )}
                      <div className="flex flex-wrap gap-x-8 gap-y-1 whitespace-nowrap text-[36px] text-muted-foreground">
                        <span>
                          <span
                            className="font-bold"
                            style={{ color: health.color }}
                          >
                            {project.stuck}
                          </span>{" "}
                          parados{" "}
                          <span style={{ color: health.color }}>
                            ({Math.round(stuckRatio(project) * 100)}%)
                          </span>
                        </span>
                        <span>
                          <span className="font-bold text-foreground">
                            {project.pending}
                          </span>{" "}
                          pendentes
                        </span>
                        {delivery.get(project.name) && (
                          <span title="Média da criação até a conclusão no ClickUp">
                            <span className="font-bold text-foreground">
                              {formatSpan(
                                delivery.get(project.name)!.totalMs /
                                  delivery.get(project.name)!.count,
                              )}
                            </span>{" "}
                            entrega média ({delivery.get(project.name)!.count})
                          </span>
                        )}
                      </div>
                      {progress && progress.statuses.length > 0 && (
                        <div className="flex flex-col gap-3 text-[30px]">
                          {progress.statuses.slice(0, 6).map((item) => (
                            <div
                              key={item.status}
                              className="flex min-w-0 items-center gap-4"
                            >
                              <span
                                className="size-5 shrink-0 rounded-full"
                                style={{
                                  background:
                                    item.color ?? "var(--muted-foreground)",
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate uppercase tracking-[0.02em] text-muted-foreground">
                                {item.status}
                              </span>
                              <span className="font-bold">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleNode(project.name);
                        }}
                        aria-pressed={nodes.includes(project.name)}
                        className={`mt-auto flex h-[76px] items-center justify-center gap-4 rounded-2xl border-4 text-[32px] font-semibold transition-colors ${
                          nodes.includes(project.name)
                            ? "border-primary text-primary"
                            : "border-line-input text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        <Icon name="history" size={36} />
                        ver detalhes
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => closeKey(project.name)}
                        aria-label="Voltar para o resumo"
                        className="flex h-[92px] w-full shrink-0 items-center justify-center gap-4 rounded-2xl border-2 border-line-input bg-surface-raised text-[34px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Icon name="back" size={38} />
                        Voltar ao resumo
                      </button>
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className="size-4 shrink-0 rounded-full"
                          style={{
                            background: health.color,
                            boxShadow: `0 0 0 5px ${health.soft}`,
                          }}
                        />
                        <span className="truncate rounded-xl border-2 border-line-input bg-surface-raised px-4 py-1.5 text-[26px] font-bold">
                          {project.name}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: health.color }}
                        >
                          {health.label}
                        </span>
                        <span className="ml-auto whitespace-nowrap text-[15px] text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {project.pending}
                          </span>{" "}
                          pendentes
                        </span>
                        {delivery.get(project.name) && (
                          <span
                            className="ml-4 whitespace-nowrap text-[15px] text-muted-foreground"
                            title="Média da criação até a conclusão no ClickUp"
                          >
                            <span className="font-bold text-foreground">
                              {formatSpan(
                                delivery.get(project.name)!.totalMs /
                                  delivery.get(project.name)!.count,
                              )}
                            </span>{" "}
                            entrega média ({delivery.get(project.name)!.count})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setNewCardProject(project.name);
                            setNewCardOpen(true);
                          }}
                          title={`Nova tarefa em ${project.name}`}
                          className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <Icon name="add" size={14} />
                          nova tarefa
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            refreshCards(project.name);
                          }}
                          disabled={refreshingProject === project.name}
                          aria-label={`Atualizar os cards de ${project.name}`}
                          title="Atualizar os cards deste projeto"
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
                        >
                          <Icon
                            name="refresh"
                            size={16}
                            className={
                              refreshingProject === project.name
                                ? "animate-spin"
                                : undefined
                            }
                          />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {STAGES.map((label, stage) => (
                          <span
                            key={label}
                            title={STAGE_NAMES[stage]}
                            className="flex items-baseline gap-2 rounded-[10px] border-[1.5px] border-line-input px-3.5 py-2"
                          >
                            <span className="text-[13px] font-semibold text-muted-foreground">
                              {label}
                            </span>
                            <span className="text-lg font-bold">
                              {project.byStage[stage]}
                            </span>
                          </span>
                        ))}
                      </div>
                      <div className="flex min-h-0 flex-col gap-3">
                        {shown.map((card) => (
                          <div
                            key={card.id}
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              const down = downRef.current;
                              if (
                                down &&
                                Math.hypot(
                                  event.clientX - down.x,
                                  event.clientY - down.y,
                                ) > 5
                              )
                                return;
                              setDetailCard(card);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") setDetailCard(card);
                            }}
                            className="flex cursor-pointer flex-col gap-2.5 rounded-[14px] bg-surface-raised px-[18px] py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{
                              border: `2px solid ${hit === card.id ? "var(--primary)" : "var(--line-card)"}`,
                              transition: "border-color .3s",
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="shrink-0 text-base font-bold text-link">
                                {card.customId}
                              </span>
                              {near && (
                                <span className="min-w-0 flex-1 truncate text-[15px] text-text-soft">
                                  {card.title}
                                </span>
                              )}
                              <span
                                className="ml-auto flex shrink-0 items-center gap-1 text-sm font-semibold"
                                style={{ color: spanColor(card, limits) }}
                                title={`Desde a criação no ClickUp${
                                  card.elapsedMs !== null
                                    ? ` · nesta etapa: ${formatSpan(card.elapsedMs)}`
                                    : ""
                                }`}
                              >
                                <Icon name="schedule" size={17} />
                                {card.ageMs !== null
                                  ? formatSpan(card.ageMs)
                                  : "—"}
                              </span>
                            </div>
                            <PipelineSteps
                              stage={card.stage}
                              compact
                              live={liveFor(card)}
                            />
                          </div>
                        ))}
                        {hidden > 0 && (
                          <span className="px-1 text-[13px] text-faint">
                            + {hidden} {hidden === 1 ? "card" : "cards"} neste
                            projeto
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </section>
              );
            })}
            <AnimatePresence>
              {nodes.map((name) => {
                const index = projects.findIndex(
                  (project) => project.name === name,
                );
                if (index < 0) return null;
                const node = layout.nodePos.get(name);
                if (!node) return null;
                return (
                  <ProjectUpdatesNode
                    key={`node-${name}`}
                    project={name}
                    updates={updates
                      .filter((update) => update.project === name)
                      .slice(0, 40)}
                    titles={titleByTicket}
                    now={nowTick}
                    dir={node.dir}
                    x={node.x}
                    y={node.y}
                    anchorX={node.anchorX}
                    gap={node.gap}
                    onClose={() => toggleNode(name)}
                  />
                );
              })}
            </AnimatePresence>
            <LiveCursors cursors={remote.cursors} zoom={cam.z} />
          </div>
        </div>
      </div>

      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-[280px] items-center gap-2 rounded-[9px] border border-line-input bg-card px-3">
          <Icon name="search" size={18} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setNotFound(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
              if (event.key === "Escape") {
                setQuery("");
                setNotFound(false);
                event.currentTarget.blur();
              }
            }}
            placeholder="Buscar projeto ou card ↵"
            aria-label="Buscar projeto ou card"
            className="min-w-0 flex-1 border-none bg-transparent text-xs outline-none placeholder:text-faint"
          />
        </div>
        <span className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-line-input bg-card px-3 text-[11px] text-muted-foreground">
          <Icon name="layers" size={16} />
          {level}
        </span>
        <CursorColorPicker color={myColor} onChange={chooseColor} />
        <span
          className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-line-input bg-card px-3 text-[11px] text-muted-foreground"
          title={
            remote.online.length
              ? remote.online.map((person) => person.name).join(", ")
              : "só você por aqui"
          }
        >
          <span className="flex -space-x-1">
            <span
              className="size-3 rounded-full border border-card"
              style={{ background: myColor }}
            />
            {remote.online.slice(0, 4).map((person) => (
              <span
                key={person.id}
                className="size-3 rounded-full border border-card"
                style={{ background: person.color }}
              />
            ))}
          </span>
          {remote.online.length + 1} online
        </span>
        <button
          type="button"
          onClick={() => {
            setNewCardProject(null);
            setNewCardOpen((value) => !value);
          }}
          aria-pressed={newCardOpen}
          className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Icon name="add" size={16} />
          novo card
        </button>
        {clickupUrl && (
          <a
            href={clickupUrl}
            target="_blank"
            rel="noreferrer"
            title="Abrir a lista no ClickUp"
            className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-line-input bg-card px-3 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Icon name="open_in_new" size={16} />
            clickup
          </a>
        )}
        {notFound && (
          <span className="flex h-9 items-center rounded-[9px] border border-danger/40 bg-card px-3 text-[11px] text-danger">
            nada encontrado
          </span>
        )}
      </div>

      {allCards.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-faint">
          Nenhum card para mostrar no mapa.
        </div>
      )}

      <CardDetailModal
        key={detailCard?.id ?? "none"}
        onDecided={updateClickupTaskStatus}
        onDeleted={() => {
          setDetailCard(null);
          fetchClickupTasks();
        }}
        card={detailCard}
        description={
          activityItems.find((item) => item.id === detailCard?.id)?.content ??
          ""
        }
        onClose={() => setDetailCard(null)}
      />

      <NewCardForm
        open={newCardOpen}
        onClose={() => setNewCardOpen(false)}
        onCreated={fetchClickupTasks}
        defaultProject={newCardProject}
      />

      <div
        onClick={onMinimapClick}
        className="absolute bottom-4 left-4 h-[130px] w-[180px] cursor-pointer overflow-hidden rounded-[9px] border border-line-input bg-card max-sm:hidden"
        aria-label="Minimapa"
      >
        {projects.map((project, index) => {
          const health = healthStyle(project);
          const pos = layout.pos[index];
          return (
            <span
              key={project.name}
              className="absolute rounded-[3px]"
              style={{
                left: layout.offX + pos.x * layout.scale,
                top: layout.offY + pos.y * layout.scale,
                width: pos.w * layout.scale,
                height: layout.regionH * layout.scale,
                background: health.soft,
                border: `1px solid color-mix(in srgb, ${health.color} 33%, transparent)`,
              }}
            />
          );
        })}
        {size.w > 0 && (
          <span
            className="pointer-events-none absolute rounded-[3px] border border-primary bg-primary/15"
            style={{
              left: layout.offX + (-cam.tx / cam.z) * layout.scale,
              top: layout.offY + (-cam.ty / cam.z) * layout.scale,
              width: (size.w / cam.z) * layout.scale,
              height: (size.h / cam.z) * layout.scale,
            }}
          />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-faint max-md:hidden">
        role para zoom · arraste para mover · clique no projeto para ver
        detalhes · esc fecha
      </div>

      <div className="absolute bottom-4 right-4 flex h-9 items-center rounded-[9px] border border-line-input bg-card">
        <button
          type="button"
          onClick={() => zoomCenter(0.8)}
          aria-label="Diminuir zoom"
          className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="remove" size={18} />
        </button>
        <span className="w-12 text-center text-xs tabular-nums">
          {Math.round(cam.z * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomCenter(1.25)}
          aria-label="Aumentar zoom"
          className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="add" size={18} />
        </button>
        <span className="h-5 w-px bg-line-input" />
        <button
          type="button"
          onClick={() => fitAll(true)}
          aria-label="Enquadrar tudo"
          className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="fit_screen" size={18} />
        </button>
      </div>
    </main>
  );
}
