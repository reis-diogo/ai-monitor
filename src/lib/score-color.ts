export function scoreColor(score: number): { color: string; bg: string } {
  if (score >= 7) return { color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (score >= 4) return { color: "#eab308", bg: "rgba(234,179,8,0.12)" };
  return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
}
