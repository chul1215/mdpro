type ScrollSource = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type ScrollTarget = {
  scrollHeight: number;
  clientHeight: number;
};

export function getSyncedScrollTop(source: ScrollSource, target: ScrollTarget): number {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  if (sourceRange <= 0 || targetRange <= 0) return 0;

  const progress = Math.min(1, Math.max(0, source.scrollTop / sourceRange));
  return progress * targetRange;
}