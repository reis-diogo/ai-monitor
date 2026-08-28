"use client";

import { useId } from "react";
import type { AiProvider } from "@/lib/types";

const HEXAFOIL_CENTERS = [
  { cx: 17, cy: 12 },
  { cx: 14.5, cy: 16.33 },
  { cx: 9.5, cy: 16.33 },
  { cx: 7, cy: 12 },
  { cx: 9.5, cy: 7.67 },
  { cx: 14.5, cy: 7.67 },
];

export function ProviderIcon({ provider, size = 13 }: { provider: AiProvider; size?: number }) {
  const gradientId = useId();

  if (provider === "anthropic") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <g stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="4.4" y1="7.5" x2="19.6" y2="16.5" />
          <line x1="19.6" y1="7.5" x2="4.4" y2="16.5" />
        </g>
      </svg>
    );
  }

  if (provider === "openai") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <g stroke="currentColor" strokeWidth={1.6} fill="none">
          {HEXAFOIL_CENTERS.map(({ cx, cy }) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4.2} />
          ))}
        </g>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#9B72CB" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 8 14 10 20 12C14 14 12 16 12 22C12 16 10 14 4 12C10 10 12 8 12 2Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
