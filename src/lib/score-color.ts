// Mesma escala dos status: luminosidade e croma fixos, so a matiz muda. O fundo sai
// da propria cor via color-mix, entao nao existe um rgba desalinhado do texto.
function tone(hue: number, chroma = 0.13): { color: string; bg: string } {
  const color = `oklch(0.72 ${chroma} ${hue})`;
  return { color, bg: `color-mix(in srgb, ${color} 12%, transparent)` };
}

export function scoreColor(score: number): { color: string; bg: string } {
  if (score >= 7) return tone(155);
  if (score >= 4) return tone(85);
  return tone(25, 0.17);
}
