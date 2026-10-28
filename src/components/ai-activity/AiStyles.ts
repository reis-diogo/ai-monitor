import type { CSSProperties } from "react";

export const BTN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-xs)",
  cursor: "pointer",
  font: "500 14px var(--sans)",
  whiteSpace: "nowrap",
};

export const BTN_SM: CSSProperties = { ...BTN, height: 32, padding: "0 12px", gap: 6, font: "500 13px var(--sans)" };

export const BTN_PRIMARY: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: 0,
  background: "var(--primary)",
  color: "var(--primary-foreground)",
  boxShadow: "var(--shadow-xs)",
  cursor: "pointer",
  font: "500 14px var(--sans)",
  whiteSpace: "nowrap",
};

export const BTN_GHOST_SM: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: 0,
  background: "transparent",
  color: "var(--muted-foreground)",
  cursor: "pointer",
  font: "500 13px var(--sans)",
  whiteSpace: "nowrap",
};

export const INPUT: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--input)",
  background: "transparent",
  boxShadow: "var(--shadow-xs)",
  fontSize: 14,
  outline: "none",
};

export const CHIP: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  cursor: "pointer",
  padding: "0 10px",
  borderRadius: 6,
  font: "500 12.5px var(--sans)",
  whiteSpace: "nowrap",
};

export const COUNT: CSSProperties = { fontFamily: "var(--mono)", fontSize: 11, opacity: 0.65 };

export const BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 500,
  height: 22,
  padding: "0 8px",
  borderRadius: 6,
  whiteSpace: "nowrap",
};

export const CARD: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  boxShadow: "var(--shadow-xs)",
};

export function seg(active: boolean) {
  return {
    bg: active ? "var(--tab)" : "transparent",
    fg: active ? "var(--foreground)" : "var(--muted-foreground)",
    shadow: active ? "var(--shadow-sm)" : "none",
    border: active ? "var(--border)" : "transparent",
  };
}

export function segButton(active: boolean): CSSProperties {
  const s = seg(active);
  return {
    border: `1px solid ${s.border}`,
    cursor: "pointer",
    padding: "0 12px",
    borderRadius: 7,
    font: "500 14px var(--sans)",
    whiteSpace: "nowrap",
    background: s.bg,
    color: s.fg,
    boxShadow: s.shadow,
  };
}

export const SEG_WRAP: CSSProperties = {
  display: "inline-flex",
  height: 36,
  padding: 3,
  borderRadius: 10,
  background: "var(--muted)",
  gap: 2,
};
