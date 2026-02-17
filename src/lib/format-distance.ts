export function formatDistance(meters: string | undefined): string | undefined {
  if (!meters) return undefined;
  const m = parseInt(meters, 10);
  if (isNaN(m)) return undefined;
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
