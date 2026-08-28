"use client";

import { motion } from "motion/react";
import type { AiProvider } from "@/lib/types";
import { ProviderIcon } from "@/components/ProviderIcon";

const OPTIONS: { value: AiProvider; label: string }[] = [
  { value: "anthropic", label: "Claude" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
];

export function ProviderToggle({
  value,
  onChange,
}: {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-black/10 bg-black/5 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === option.value ? "text-background" : "text-foreground/50"
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId="provider-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            <ProviderIcon provider={option.value} size={13} />
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
