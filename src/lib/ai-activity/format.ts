import type { KnowledgeNote } from "@/lib/ai-activity/types";

export function fnv(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const C = {
  blue: "var(--run)",
  amber: "var(--wait)",
  red: "var(--err)",
  grey: "var(--muted-foreground)",
  ink: "var(--foreground)",
  ok: "var(--ok)",
};

const TOPICS: Record<string, number> = {
  Pagamentos: 250,
  Autenticação: 300,
  "Perfil de usuário": 345,
  Checkout: 25,
  Relatórios: 205,
  Deploy: 160,
  Pedidos: 55,
  Notificações: 85,
  Onboarding: 135,
  Release: 270,
  Vendas: 180,
  Manutenção: 320,
  "Folha de pagamento": 110,
  Outro: 0,
};

export const hueOf = (topic: string): number => TOPICS[topic] ?? fnv(topic) % 360;
export const topicBase = (hue: number): string => `oklch(0.62 0.14 ${hue})`;
export const tint = (color: string, percent: number): string =>
  `color-mix(in oklch, ${color} ${percent}%, transparent)`;
export const inkMix = (color: string): string => `color-mix(in oklch, ${color} 75%, var(--foreground))`;

export function avatarOf(name: string) {
  const hue = fnv(name) % 360;
  const parts = String(name).trim().split(/\s+/);
  return {
    initials: ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase(),
    avBg: `color-mix(in oklch, oklch(0.62 0.14 ${hue}) 22%, transparent)`,
    avFg: `color-mix(in oklch, oklch(0.62 0.14 ${hue}) 80%, var(--foreground))`,
  };
}

const TOKEN_UNITS: [number, string][] = [
  [1e12, " tri"],
  [1e9, " bi"],
  [1e6, " mi"],
  [1e3, "k"],
];

export function fmtTokens(value: number): string {
  const n = Math.max(0, value);
  for (const [limit, suffix] of TOKEN_UNITS) {
    if (n >= limit) return (n / limit).toFixed(limit >= 1e9 ? 2 : 1).replace(".", ",") + suffix;
  }
  return String(Math.round(n));
}

export function fmtDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function fmtAgo(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "instantes";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, "0")} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days > 1 ? "dias" : "dia"}`;
}

export function knowledgeMarkdown(note: KnowledgeNote): string {
  const out = [
    `# ${note.title}`,
    "",
    [note.user, note.project, note.subject, new Date(note.createdAt).toLocaleString("pt-BR")]
      .filter(Boolean)
      .join(" · "),
    "",
  ];
  if (note.summary) out.push("## Resumo", "", note.summary, "");
  if (note.technologies.length) {
    out.push("## Tecnologias", "", note.technologies.map((t) => `- ${t}`).join("\n"), "");
  }
  if (note.steps.length) {
    out.push("## Passos", "", note.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "");
  }
  if (note.connection) out.push("## Conexão", "", "```", note.connection, "```", "");
  if (note.gotchas.length) {
    out.push("## Atenção", "", note.gotchas.map((t) => `- ${t}`).join("\n"), "");
  }
  for (const snippet of note.snippets) out.push(`\`\`\`${snippet.lang}`, snippet.code, "```", "");
  return out.join("\n");
}

export function downloadText(name: string, text: string, type: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
