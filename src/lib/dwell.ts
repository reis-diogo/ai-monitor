export const DWELL_STATUSES = [
  "refinar po",
  "refinar arquiteto",
  "dev liberado",
  "dev finalizado",
  "em qa",
] as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Faixas de atraso. O corte nao e linear de proposito: a diferenca entre 2h e 6h
// parado nao interessa, a diferenca entre 2 e 10 dias interessa muito.
export const DWELL_BUCKETS = [
  { key: "novo", label: "< 1d", maxMs: DAY_MS, color: "#34d399" },
  { key: "atencao", label: "1-3d", maxMs: 3 * DAY_MS, color: "#fbbf24" },
  { key: "atraso", label: "3-7d", maxMs: 7 * DAY_MS, color: "#fb923c" },
  { key: "critico", label: "> 7d", maxMs: Infinity, color: "#f87171" },
] as const;

export type DwellBucketKey = (typeof DWELL_BUCKETS)[number]["key"];

export function dwellBucket(elapsedMs: number): DwellBucketKey {
  return (DWELL_BUCKETS.find((bucket) => elapsedMs < bucket.maxMs) ?? DWELL_BUCKETS[3]).key;
}

// "3d 11h", "18h", "45min". Sem o sufixo "atrás": a coluna ja diz que e tempo parado,
// e repetir come largura numa tabela apertada.
export function formatDwell(since: string, now: number = Date.now()): string {
  const elapsed = now - new Date(since).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "—";

  const days = Math.floor(elapsed / DAY_MS);
  const hours = Math.floor((elapsed % DAY_MS) / HOUR_MS);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;

  return `${Math.max(Math.floor(elapsed / 60000), 1)}min`;
}
