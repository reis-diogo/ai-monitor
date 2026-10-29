"use client";

import { formatSpan } from "@/lib/monitor/model";

const STALE_MS = 24 * 60 * 60 * 1000;

export function ZoneTabs({
  tabs,
  active,
  onSelect,
  badgeLabel,
}: {
  tabs: { key: string; label: string; badge: number; idleMs: number | null }[];
  active: string;
  onSelect: (key: string) => void;
  badgeLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-3 pr-16" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const stale = tab.idleMs === null || tab.idleMs > STALE_MS;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            title={tab.idleMs === null ? "sem atividade registrada" : `sem atividade há ${formatSpan(tab.idleMs)}`}
            className={`flex h-[60px] items-center gap-3 rounded-xl border-2 px-5 text-[22px] transition-colors ${
              stale
                ? `border-transparent bg-[#fef2f2] text-[#dc2626] dark:bg-[#2c1a1d] dark:text-[#ff9d96] ${selected ? "font-bold" : "hover:opacity-80"}`
                : selected
                  ? "border-primary font-bold text-foreground"
                  : "border-line-card text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            <span className="truncate">{tab.label}</span>
            <span
              className={`rounded-lg px-2.5 py-0.5 text-[18px] font-bold ${
                stale
                  ? selected
                    ? "bg-[#dc2626] text-white dark:bg-[#e5524b]"
                    : "bg-white text-[#dc2626] dark:bg-[#1b1012] dark:text-[#ff9d96]"
                  : selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-raised text-foreground"
              }`}
              title={badgeLabel}
            >
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
