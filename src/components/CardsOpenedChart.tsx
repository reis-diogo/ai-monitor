"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function CardsOpenedChart({
  data,
  config,
}: {
  data: Record<string, number | string>[];
  config: ChartConfig;
}) {
  const seriesKeys = Object.keys(config);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5">
      <p className="mb-4 text-sm text-black/60 dark:text-white/60">Cards abertos por dia</p>
      {data.length === 0 ? (
        <p className="text-sm text-black/30 dark:text-white/30">Nenhum card no período selecionado.</p>
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
                new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
                  }
                  indicator="dot"
                />
              }
            />
            {seriesKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`var(--color-${key})`}
                fillOpacity={0.35}
                stroke={`var(--color-${key})`}
                stackId="a"
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
