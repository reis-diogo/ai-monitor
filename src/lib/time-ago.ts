export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `há ${days}d atrás`;
}
