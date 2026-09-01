export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function splitCardTitle(title: string): { code: string | null; description: string } {
  const match = title.match(/^([a-z]+)[\s-]*(\d+)\s*[:\-]?\s*(.*)$/i);
  if (!match) return { code: null, description: title };

  const [, prefix, number, rest] = match;
  return { code: `${prefix.toUpperCase()}-${number}`, description: rest.trim() || title };
}
