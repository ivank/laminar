export const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value ? [value] : [];

const isInRange = (from: number, to: number, num: number): boolean => num >= from && num <= to;

export type Range = { start: number; end: number };

export const parseRange = (range: string, totalLength: number): Range | undefined => {
  const fullRange = range.match(/^bytes=(\d+)-(\d+)/);
  if (fullRange) {
    const range: Range = { start: Number(fullRange[1]), end: Number(fullRange[2]) };

    if (!isInRange(0, totalLength, range.start) || !isInRange(0, totalLength, range.end)) {
      return undefined;
    }
    return range;
  }

  const startRange = range.match(/^bytes=(\d+)-$/);
  if (startRange) {
    const range: Range = { start: Number(startRange[1]), end: totalLength };
    return isInRange(0, totalLength, range.start) ? range : undefined;
  }

  const endRange = range.match(/^bytes=-(\d+)$/);
  if (endRange) {
    const range: Range = { start: 0, end: Number(endRange[1]) };
    return isInRange(0, totalLength, range.end) ? range : undefined;
  }
  return undefined;
};
