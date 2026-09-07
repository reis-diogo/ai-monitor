export type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d";

export type DateRange = { start: Date; end: Date };

export function getPresetRange(preset: DatePreset): DateRange | null {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "all":
      return null;
    case "today":
      return { start: startOfToday, end: now };
    case "yesterday": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 1);
      const end = new Date(startOfToday.getTime() - 1);
      return { start, end };
    }
    case "7d": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 6);
      return { start, end: now };
    }
    case "30d": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      return { start, end: now };
    }
  }
}

export function isWithinRange(dateIso: string, range: DateRange | null): boolean {
  if (!range) return true;
  const time = new Date(dateIso).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}
