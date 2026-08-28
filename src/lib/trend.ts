import type { AnalyzedActivityRecord } from "@/lib/types";

export type TrendPeriod = "30d" | "3m" | "12m";

export type TrendPoint = {
  key: string;
  label: string;
  averageScore: number | null;
  count: number;
  records: AnalyzedActivityRecord[];
};

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildDailyTrend(records: AnalyzedActivityRecord[], daysBack: number): TrendPoint[] {
  const now = new Date();
  const buckets: TrendPoint[] = [];

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      key: dayKey(d),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      averageScore: null,
      count: 0,
      records: [],
    });
  }

  for (const bucket of buckets) {
    const inDay = records.filter((r) => dayKey(new Date(r.date)) === bucket.key);
    if (inDay.length > 0) {
      bucket.count = inDay.length;
      bucket.averageScore = inDay.reduce((sum, r) => sum + r.score, 0) / inDay.length;
      bucket.records = inDay;
    }
  }

  return buckets;
}

function buildMonthlyTrend(records: AnalyzedActivityRecord[], monthsBack: number): TrendPoint[] {
  const now = new Date();
  const buckets: TrendPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: MONTH_LABELS[d.getMonth()],
      averageScore: null,
      count: 0,
      records: [],
    });
  }

  for (const bucket of buckets) {
    const inMonth = records.filter((r) => monthKey(new Date(r.date)) === bucket.key);
    if (inMonth.length > 0) {
      bucket.count = inMonth.length;
      bucket.averageScore = inMonth.reduce((sum, r) => sum + r.score, 0) / inMonth.length;
      bucket.records = inMonth;
    }
  }

  return buckets;
}

export function buildTrend(
  records: AnalyzedActivityRecord[],
  authorName: string,
  period: TrendPeriod
): TrendPoint[] {
  const authorRecords = records.filter((r) => r.authorName === authorName);

  if (period === "30d") return buildDailyTrend(authorRecords, 30);
  if (period === "12m") return buildMonthlyTrend(authorRecords, 12);
  return buildMonthlyTrend(authorRecords, 3);
}
