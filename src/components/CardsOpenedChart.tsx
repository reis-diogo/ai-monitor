"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";

export type PersonCount = {
  name: string;
  avatarUrl: string | null;
  count: number;
};

export type ActivityDayDatum = {
  date: string;
  __breakdown: Record<string, PersonCount[]>;
  [projectSlug: string]: number | string | Record<string, PersonCount[]>;
};

function parseDayKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function ActivityTooltip({
  active,
  payload,
  label,
  config,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
  label?: string;
  config: ChartConfig;
}) {
  if (!active || !payload?.length) return null;

  const breakdown =
    (payload[0] as unknown as { payload?: ActivityDayDatum })?.payload?.__breakdown ?? {};
  const dateLabel = label
    ? parseDayKey(label).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : "";

  return (
    <div className="min-w-[260px] rounded-lg border border-border/50 bg-background p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium text-foreground">{dateLabel}</p>
      <div className="flex flex-col gap-2.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const people = breakdown[key] ?? [];
          const projectLabel = config[key]?.label ?? key;

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="font-medium text-foreground">{projectLabel}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{entry.value}</span>
              </div>

              {people.length > 0 && (
                <div className="ml-3.5 flex flex-col gap-1 border-l border-border/40 pl-2.5">
                  {people.map((person) => (
                    <div
                      key={person.name}
                      className="flex items-center justify-between gap-2 text-muted-foreground"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {person.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={person.avatarUrl}
                            alt={person.name}
                            className="h-4 w-4 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[7px] font-semibold">
                            {person.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">{person.name}</span>
                      </div>
                      <span className="shrink-0 font-mono">{person.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CardsOpenedChart({
  data,
  config,
}: {
  data: ActivityDayDatum[];
  config: ChartConfig;
}) {
  const seriesKeys = Object.keys(config);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5">
      <p className="mb-4 text-sm text-black/60 dark:text-white/60">Atividade por projeto e por dia</p>
      {data.length === 0 ? (
        <p className="text-sm text-black/30 dark:text-white/30">Nenhuma atividade no período selecionado.</p>
      ) : (
        <ChartContainer config={config} className="h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) =>
                parseDayKey(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              }
            />
            <ChartTooltip content={<ActivityTooltip config={config} />} />
            <ChartLegend content={<ChartLegendContent className="flex-wrap" />} />
            {seriesKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`var(--color-${key})`}
                fillOpacity={0.25}
                stroke={`var(--color-${key})`}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
