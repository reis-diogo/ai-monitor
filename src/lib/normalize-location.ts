export function normalizeLocation(raw: string, projectNames: string[]): string {
  const lowerRaw = raw.toLowerCase();
  const match = projectNames.find((name) => lowerRaw.includes(name.toLowerCase()));
  return match ?? raw;
}
