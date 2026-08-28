"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DateRangePicker({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const range: DateRange | undefined =
    start || end
      ? {
          from: start ? new Date(`${start}T00:00:00`) : undefined,
          to: end ? new Date(`${end}T00:00:00`) : undefined,
        }
      : undefined;

  const label =
    range?.from && range?.to
      ? `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`
      : range?.from
        ? format(range.from, "dd/MM/yyyy")
        : "escolher período";

  return (
    <Popover>
      <PopoverTrigger className="rounded-md border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs text-foreground/70 outline-none hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30">
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto border-border bg-popover p-2 text-popover-foreground">
        <Calendar
          mode="range"
          locale={ptBR}
          selected={range}
          onSelect={(next) => {
            onChange(next?.from ? toIso(next.from) : "", next?.to ? toIso(next.to) : "");
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
