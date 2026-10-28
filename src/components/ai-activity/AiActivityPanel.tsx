"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import {
  C,
  avatarOf,
  fmtDuration,
  fmtTokens,
  hueOf,
  inkMix,
  tint,
  topicBase,
  fnv,
} from "@/lib/ai-activity/format";
import type { ActivityPrompt, KnowledgeNote } from "@/lib/ai-activity/types";
import { groupView, isLive, toPromptRows, type GroupView, type RowView } from "@/lib/ai-activity/view";
import { AIACT_CSS } from "@/components/ai-activity/aiact-css";
import { AiConfirm, type ConfirmRequest } from "@/components/ai-activity/AiConfirm";
import { AiConnectModal } from "@/components/ai-activity/AiConnectModal";
import { AiKnowledgeTab } from "@/components/ai-activity/AiKnowledgeTab";
import { PersonCard, SelectionTables } from "@/components/ai-activity/AiPeople";
import { AnimatedCount, Dropdown, PulseDot, Svg } from "@/components/ai-activity/AiBits";
import {
  BTN,
  BTN_PRIMARY,
  BTN_SM,
  CARD,
  CHIP,
  COUNT,
  INPUT,
  SEG_WRAP,
  segButton,
} from "@/components/ai-activity/AiStyles";

const LIVE_POLL_MS = 4_000;
const IDLE_POLL_MS = 20_000;
const MAX_CHIPS = 8;
const fmtFull = (n: number) => Math.round(n).toLocaleString("pt-BR");

type Conn = "connecting" | "on" | "error";
type Tab = "activity" | "kb";
type Sort = "az" | "recent";
type Theme = "light" | "dark" | "system";

const CONN: Record<Conn, [string, string]> = {
  on: ["Ao vivo", C.ok],
  connecting: ["Conectando…", C.amber],
  error: ["Sem conexão", C.red],
};

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <Svg>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </Svg>
    );
  }
  if (theme === "system") {
    return (
      <Svg>
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </Svg>
    );
  }
  return (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Svg>
  );
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("aiact:theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function MenuItem({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="hv-accent"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        height: 32,
        padding: "0 8px",
        border: 0,
        borderRadius: 5,
        background: "transparent",
        color: "var(--foreground)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        font: "400 14px var(--sans)",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  extra,
}: {
  label: string;
  value: string;
  sub?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ ...CARD, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 26, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{sub}</span>}
      </div>
      {extra}
    </div>
  );
}

function chipStyle(on: boolean, base: string) {
  return {
    ...CHIP,
    border: `1px ${on ? "solid" : "dashed"} ${on ? tint(base, 55) : "var(--border)"}`,
    background: on ? tint(base, 16) : "transparent",
    color: on ? inkMix(base) : "var(--foreground)",
  };
}

export function AiActivityPanel() {
  const { user } = useUser();
  const [prompts, setPrompts] = useState<ActivityPrompt[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeNote[] | null>(null);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [conn, setConn] = useState<Conn>("connecting");
  const [loaded, setLoaded] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState<[number, number][]>([]);
  const [tab, setTab] = useState<Tab>("activity");
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("az");
  const [selected, setSelected] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [themeOpen, setThemeOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const revRef = useRef("");
  const tabRef = useRef<Tab>("activity");
  const liveRef = useRef(false);
  const countRef = useRef(0);
  const kbFetchedRef = useRef(-1);
  const loadedRef = useRef(false);
  const tokensRef = useRef(0);
  const scrollSelRef = useRef(false);
  const loadNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    tabRef.current = tab;
    loadNowRef.current();
  }, [tab]);

  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (!loadedRef.current) return;
      setHistory((h) => {
        if (h.length && t - h[h.length - 1][0] < 1000) return h;
        const next: [number, number][] = [...h, [t, tokensRef.current]];
        while (next.length && t - next[0][0] > 61000) next.shift();
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      if (!document.hidden || !loadedRef.current) {
        const needKnowledge = tabRef.current === "kb" && kbFetchedRef.current !== countRef.current;
        const params = new URLSearchParams({ since: revRef.current });
        if (needKnowledge) params.set("kb", "1");

        try {
          const res = await fetch(`/api/ai-activity?${params}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (cancelled) return;

          setConn("on");
          loadedRef.current = true;
          setLoaded(true);
          if (!data.unchanged) {
            revRef.current = data.rev;
            countRef.current = data.knowledgeCount;
            liveRef.current = (data.prompts as ActivityPrompt[]).some(
              (p) => p.status === "running" || p.status === "waiting"
            );
            setPrompts(data.prompts);
            setKnowledgeCount(data.knowledgeCount);
          }
          if (data.knowledge) {
            setKnowledge(data.knowledge);
            kbFetchedRef.current = data.knowledgeCount;
          }
        } catch {
          if (!cancelled) setConn("error");
        }
      }
      if (!cancelled) timer = setTimeout(load, liveRef.current ? LIVE_POLL_MS : IDLE_POLL_MS);
    }

    loadNowRef.current = () => {
      clearTimeout(timer);
      load();
    };
    const onVisible = () => {
      if (!document.hidden) loadNowRef.current();
    };

    document.addEventListener("visibilitychange", onVisible);
    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => setSeeded(true), 50);
    return () => clearTimeout(timer);
  }, [loaded]);

  const rows = useMemo(() => toPromptRows(prompts, now), [prompts, now]);

  const activeProjects = useMemo(
    () => projects.filter((p) => rows.some((r) => r.project === p)),
    [projects, rows]
  );
  const activeSubjects = useMemo(
    () => subjects.filter((x) => rows.some((r) => r.subject === x)),
    [subjects, rows]
  );
  const hasFilters = !!query.trim() || activeProjects.length > 0 || activeSubjects.length > 0;

  function clearFilters() {
    setQuery("");
    setProjects([]);
    setSubjects([]);
  }

  const groups = useMemo<GroupView[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (r: (typeof rows)[number]) =>
      (!activeProjects.length || activeProjects.includes(r.project)) &&
      (!activeSubjects.length || activeSubjects.includes(r.subject)) &&
      (!q || `${r.summary} ${r.project} ${r.user} ${r.subject} ${r.area ?? ""}`.toLowerCase().includes(q));

    const byUser: Record<string, typeof rows> = {};
    for (const row of rows) (byUser[row.user] ??= []).push(row);

    const list = Object.entries(byUser).flatMap(([name, all]) => {
      const visible = all.filter(match);
      return visible.length ? [groupView(name, all, visible, now)] : [];
    });

    return list.sort(
      sort === "recent" ? (a, b) => b.last - a.last : (a, b) => a.name.localeCompare(b.name, "pt")
    );
  }, [rows, query, activeProjects, activeSubjects, sort, now]);

  const totals = useMemo(() => {
    const tokens = rows.reduce((sum, r) => sum + r.tokensIn + r.tokensOut, 0);
    const users = new Set(rows.map((r) => r.user));
    return { tokens, users: users.size, live: rows.filter(isLive).length };
  }, [rows]);

  const stats = useMemo(() => {
    const byUser: Record<string, typeof rows> = {};
    for (const r of rows) (byUser[r.user] ??= []).push(r);
    const active = Object.entries(byUser)
      .filter(([, list]) => list.some(isLive))
      .map(([name, list]) => ({
        name,
        waiting: list.some((r) => r.effective === "waiting"),
        ...avatarOf(name),
      }));
    const done = rows.filter((r) => r.effective === "done" && r.endMs);
    const avg = done.length
      ? done.reduce((sum, r) => sum + ((r.endMs as number) - r.startMs), 0) / done.length
      : 0;
    return { users: Object.keys(byUser).length, active, total: rows.length, avg, hasDone: done.length > 0 };
  }, [rows]);

  useEffect(() => {
    tokensRef.current = totals.tokens;
  }, [totals.tokens]);

  useEffect(() => {
    liveRef.current = totals.live > 0;
  }, [totals.live]);

  const tokRate = useMemo(() => {
    const delta = history.length > 1 ? Math.max(0, totals.tokens - history[0][1]) : 0;
    return delta ? `+${fmtTokens(delta)} no último minuto` : "sem consumo no último minuto";
  }, [history, totals.tokens]);

  const projectChips = useMemo(() => {
    const seen: Record<string, number> = {};
    const count: Record<string, number> = {};
    for (const r of rows) {
      seen[r.project] = Math.max(seen[r.project] ?? 0, r.updatedMs);
      count[r.project] = (count[r.project] ?? 0) + 1;
    }
    const names = Object.keys(seen)
      .sort((a, b) => seen[b] - seen[a])
      .slice(0, MAX_CHIPS);
    for (const p of projects) if (seen[p] !== undefined && !names.includes(p)) names.push(p);
    return names.map((name) => ({ name, n: count[name] }));
  }, [rows, projects]);

  const subjectChips = useMemo(() => {
    const seen: Record<string, number> = {};
    const count: Record<string, number> = {};
    for (const r of rows) {
      seen[r.subject] = Math.max(seen[r.subject] ?? 0, r.updatedMs);
      count[r.subject] = (count[r.subject] ?? 0) + 1;
    }
    const names = Object.keys(seen)
      .sort((a, b) => seen[b] - seen[a])
      .slice(0, MAX_CHIPS);
    for (const s of subjects) if (seen[s] !== undefined && !names.includes(s)) names.push(s);
    return names.map((name) => ({ name, n: count[name] }));
  }, [rows, subjects]);

  const selectedGroups = useMemo(
    () => selected.map((name) => groups.find((g) => g.name === name)).filter((g): g is GroupView => !!g),
    [selected, groups]
  );

  useEffect(() => {
    if (!scrollSelRef.current || !selectedGroups.length) return;
    scrollSelRef.current = false;
    const timer = setTimeout(() => {
      const el = document.querySelector("[data-seltable]");
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top > innerHeight - 120) window.scrollTo({ top: window.scrollY + top - 96, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedGroups.length]);

  const toggleSelect = useCallback((name: string) => {
    setSelected((current) => {
      const isSel = current.includes(name);
      scrollSelRef.current = !isSel;
      return isSel ? current.filter((n) => n !== name) : [...current, name];
    });
  }, []);

  const openKnowledge = useCallback((id: string) => {
    setFocusId(id);
    setTab("kb");
  }, []);

  useEffect(() => {
    if (tab !== "kb" || !focusId || !knowledge) return;
    const timer = setTimeout(
      () =>
        document
          .querySelector(`[data-kb="${CSS.escape(focusId)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      120
    );
    return () => clearTimeout(timer);
  }, [tab, focusId, knowledge]);

  const viewPrompt = useCallback(
    (note: KnowledgeNote) => {
      const prompt = prompts.find((p) => p.id === note.promptId);
      setQuery(prompt?.summary ?? "");
      setTab("activity");
    },
    [prompts]
  );

  const promptIds = useMemo(() => new Set(prompts.map((p) => p.id)), [prompts]);

  function pickTheme(next: Theme) {
    setTheme(next);
    setThemeOpen(false);
    try {
      localStorage.setItem("aiact:theme", next);
    } catch {}
  }

  function ask(request: ConfirmRequest) {
    setConfirmError(null);
    setConfirm(request);
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Erro ao apagar.");
    } finally {
      setConfirmBusy(false);
    }
  }

  async function remove(query: string) {
    const res = await fetch(`/api/ai-activity?${query}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erro ao apagar.");
    revRef.current = "";
    kbFetchedRef.current = -1;
    loadNowRef.current();
  }

  function deleteRow(row: RowView) {
    ask({
      title: "Apagar este pedido?",
      description: `"${row.summary}" será removido do banco de dados.`,
      confirmLabel: "Apagar pedido",
      run: async () => {
        await remove(`prompt=${encodeURIComponent(row.id)}`);
        setPrompts((list) => list.filter((p) => p.id !== row.id));
      },
    });
  }

  function deleteUser(group: GroupView) {
    ask({
      title: `Apagar os pedidos de ${group.name}?`,
      description: `${group.meta} serão removidos do banco de dados. A base de conhecimento não é afetada.`,
      confirmLabel: "Apagar pedidos",
      run: async () => {
        await remove(`user=${encodeURIComponent(group.name)}`);
        setPrompts((list) => list.filter((p) => p.user !== group.name));
        setSelected((list) => list.filter((n) => n !== group.name));
      },
    });
  }

  function deleteAllPrompts() {
    setClearOpen(false);
    ask({
      title: "Apagar todos os pedidos?",
      description: `${prompts.length} pedidos de todas as pessoas serão removidos do banco de dados. A base de conhecimento não é afetada.`,
      confirmLabel: "Apagar tudo",
      run: async () => {
        await remove("all=prompts");
        setPrompts([]);
        setSelected([]);
      },
    });
  }

  function deleteAllKnowledge() {
    setClearOpen(false);
    ask({
      title: "Apagar toda a base de conhecimento?",
      description: `${knowledgeCount} notas serão removidas do banco de dados.`,
      confirmLabel: "Apagar tudo",
      run: async () => {
        await remove("all=kb");
        setKnowledge([]);
        setKnowledgeCount(0);
      },
    });
  }

  function deleteNote(note: KnowledgeNote) {
    ask({
      title: "Apagar esta nota?",
      description: `"${note.title}" será removida do banco de dados.`,
      confirmLabel: "Apagar nota",
      run: async () => {
        await remove(`kb=${encodeURIComponent(note.id)}`);
        setKnowledge((list) => (list ? list.filter((n) => n.id !== note.id) : list));
        setKnowledgeCount((n) => Math.max(0, n - 1));
      },
    });
  }

  const [connLabel, connColor] = CONN[conn];
  const hasRows = rows.length > 0;
  const showOnboard = loaded && onboardOpen && !hasRows;
  const tabs: [Tab, string][] = [
    ["activity", "Atividade"],
    ["kb", "Base de conhecimento"],
  ];

  return (
    <div className="aiact" data-theme={theme} suppressHydrationWarning style={{ minHeight: "100vh", fontFamily: "var(--sans)" }}>
      <style>{AIACT_CSS}</style>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 72px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px 24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontWeight: 600, fontSize: 24, letterSpacing: "-0.02em" }}>Atividade de IA</h1>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 22,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: connColor,
                }}
              >
                <PulseDot color={connColor} live={conn === "on"} />
                {connLabel}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)" }}>
              Cada linha é um pedido feito à IA, agrupado por pessoa.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <button onClick={() => setConnectOpen(true)} className="hv-op" style={BTN_PRIMARY}>
              <Svg>
                <rect width="14" height="14" x="8" y="8" rx="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </Svg>
              Conectar IA
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setClearOpen(true)} className="hv-accent" style={BTN}>
                <Svg>
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </Svg>
                Apagar dados
              </button>
              <div style={{ position: "absolute", right: 0, top: 42, zIndex: 21 }}>
                <Dropdown open={clearOpen} onClose={() => setClearOpen(false)}>
                  <div
                    style={{
                      minWidth: 240,
                      padding: 4,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      boxShadow: "0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <MenuItem
                      label={`Todos os pedidos (${prompts.length})`}
                      disabled={!prompts.length}
                      onClick={deleteAllPrompts}
                    />
                    <MenuItem
                      label={`Toda a base de conhecimento (${knowledgeCount})`}
                      disabled={!knowledgeCount}
                      onClick={deleteAllKnowledge}
                    />
                  </div>
                </Dropdown>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setThemeOpen((v) => !v)}
                aria-label="Alternar tema"
                title="Tema"
                className="hv-accent"
                style={{ ...BTN, width: 36, padding: 0 }}
              >
                <ThemeIcon theme={theme === "system" ? "light" : theme} />
              </button>
              <div style={{ position: "absolute", right: 0, top: 42, zIndex: 21 }}>
                <Dropdown open={themeOpen} onClose={() => setThemeOpen(false)}>
                  <div
                    style={{
                      minWidth: 160,
                      padding: 4,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      boxShadow: "0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {THEMES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => pickTheme(t.value)}
                        className="hv-accent"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          border: 0,
                          borderRadius: 5,
                          background: "transparent",
                          color: "var(--foreground)",
                          cursor: "pointer",
                          font: "400 14px var(--sans)",
                          textAlign: "left",
                        }}
                      >
                        <ThemeIcon theme={t.value} />
                        <span style={{ flex: 1 }}>{t.label}</span>
                        {theme === t.value && (
                          <Svg size={14}>
                            <path d="M20 6 9 17l-5-5" />
                          </Svg>
                        )}
                      </button>
                    ))}
                  </div>
                </Dropdown>
              </div>
            </div>
          </div>
        </header>

        <div style={{ ...SEG_WRAP, alignSelf: "flex-start" }}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ ...segButton(tab === key), display: "inline-flex", alignItems: "center", gap: 8, padding: "0 14px" }}
            >
              {label}
              {key === "kb" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 18,
                    padding: "0 6px",
                    borderRadius: 5,
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                    fontSize: 11.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {knowledgeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "activity" ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "24px 40px" }}>
            <section style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>Tokens gastos</div>
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px 14px" }}>
                <AnimatedCount
                  value={totals.tokens}
                  format={fmtFull}
                  fromZero={false}
                  style={{
                    fontWeight: 600,
                    fontSize: "clamp(40px, 6vw, 64px)",
                    lineHeight: 1,
                    letterSpacing: "-0.035em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {tokRate}
                </span>
              </div>
            </section>
              <section
                style={{
                  flex: "1 1 460px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 16,
                  minWidth: 0,
                }}
              >
                <StatCard
                  label="Pessoas usando agora"
                  value={String(stats.active.length)}
                  sub={`de ${stats.users}`}
                  extra={(
                    <div style={{ display: "flex", alignItems: "center", paddingLeft: 6, minHeight: 28 }}>
                      {stats.active.length === 0 && (
                        <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>ninguém no momento</span>
                      )}
                      {stats.active.map((a) => (
                        <div
                          key={a.name}
                          title={`${a.name} · ${a.waiting ? "aguardando resposta" : "em andamento"}`}
                          style={{
                            position: "relative",
                            width: 28,
                            height: 28,
                            marginLeft: -6,
                            borderRadius: "50%",
                            border: "2px solid var(--card)",
                            background: a.avBg,
                            color: a.avFg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10.5,
                            fontWeight: 600,
                          }}
                        >
                          {a.initials}
                          <span
                            style={{
                              position: "absolute",
                              right: -2,
                              bottom: -2,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              border: "2px solid var(--card)",
                              background: a.waiting ? C.amber : C.blue,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                />
                <StatCard label="Pedidos" value={String(stats.total)} sub={`${totals.live} em andamento`} />
                <StatCard
                  label="Tempo médio de resposta"
                  value={stats.hasDone ? fmtDuration(stats.avg) : "—"}
                />
              </section>
            </div>

            <section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px" }}>
              <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340, display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", color: "var(--muted-foreground)" }}>
                  <Svg>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </Svg>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar pedido, pessoa ou projeto"
                  style={{ ...INPUT, width: "100%", padding: "0 12px 0 34px" }}
                />
              </div>
              <div style={{ ...SEG_WRAP, marginLeft: "auto" }}>
                {([
                  ["az", "A–Z"],
                  ["recent", "Recentes"],
                ] as [Sort, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSort(key)} style={segButton(sort === key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 72, fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)" }}>Projetos</span>
                  {projectChips.map(({ name, n }) => {
                    const on = activeProjects.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => setProjects(on ? projects.filter((x) => x !== name) : [...projects, name])}
                        style={chipStyle(on, topicBase(fnv(name) % 360))}
                      >
                        {name}
                        <span style={COUNT}>{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 72, fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)" }}>Assuntos</span>
                  {subjectChips.map(({ name, n }) => {
                    const on = activeSubjects.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => setSubjects(on ? subjects.filter((x) => x !== name) : [...subjects, name])}
                        style={chipStyle(on, topicBase(hueOf(name)))}
                      >
                        {name}
                        <span style={COUNT}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {showOnboard && (
              <div style={{ ...CARD, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Começando a receber eventos</div>
                  <button
                    onClick={() => setOnboardOpen(false)}
                    aria-label="Fechar"
                    className="hv-fg"
                    style={{ border: 0, background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <PulseDot color={conn === "on" ? C.ok : C.red} size={8} />
                    <span>{conn === "on" ? "Conectado ao painel." : "Sem conexão com o servidor."}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: "var(--ok)" }} />
                    <span>Gere o prompt em Conectar IA e cole no Claude Code.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
                    <PulseDot color="var(--run)" size={8} />
                    <span>Aguardando o primeiro pedido. Ele aparece aqui assim que a IA enviar.</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button onClick={() => setConnectOpen(true)} className="hv-accent" style={BTN_SM}>
                    Ver prompt de novo
                  </button>
                </div>
              </div>
            )}

            {!groups.length && (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  border: "1px dashed var(--border)",
                  borderRadius: 12,
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.6,
                }}
              >
                {!loaded
                  ? "Carregando…"
                  : hasRows
                    ? "Nenhum pedido corresponde aos filtros."
                    : "Nenhum pedido nas últimas 12 horas. Clique em Conectar IA para gerar o prompt e começar."}
                {loaded && hasRows && hasFilters && (
                  <div style={{ marginTop: 14 }}>
                    <button onClick={clearFilters} className="hv-accent" style={BTN_SM}>
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                gap: 12,
              }}
            >
              {groups.map((group) => (
                <motion.div key={group.name} layout="position" style={{ display: "flex", minWidth: 0 }}>
                  <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <PersonCard
                          group={group}
                          selected={selected.includes(group.name)}
                          dimmed={selected.length > 0 && !selected.includes(group.name)}
                          seeded={seeded}
                          onSelect={() => toggleSelect(group.name)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <SelectionTables
              open={selectedGroups.length > 0}
              groups={selectedGroups}
              seeded={seeded}
              onClose={toggleSelect}
              onOpenKnowledge={openKnowledge}
              onDeleteRow={deleteRow}
              onDeleteUser={deleteUser}
            />
          </>
        ) : (
          <AiKnowledgeTab
            notes={knowledge ?? []}
            loading={knowledge === null}
            focusId={focusId}
            promptIds={promptIds}
            onViewPrompt={viewPrompt}
            onDelete={deleteNote}
            onDeleteAll={deleteAllKnowledge}
          />
        )}
      </div>

      <AiConnectModal
        key={user?.fullName ?? ""}
        open={connectOpen}
        defaultName={user?.fullName ?? ""}
        onClose={() => setConnectOpen(false)}
      />
      <AiConfirm
        request={confirm}
        busy={confirmBusy}
        error={confirmError}
        onCancel={() => !confirmBusy && setConfirm(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
