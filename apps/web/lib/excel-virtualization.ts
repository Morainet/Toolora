/** Return an overscanned, end-exclusive slice of a fixed-size grid axis. */
export function visibleRange(
  offset: number,
  viewportSize: number,
  itemSize: number,
  itemCount: number,
  overscan: number,
): { start: number; end: number } {
  if (itemCount === 0) return { start: 0, end: 0 };
  const first = Math.min(itemCount - 1, Math.floor(Math.max(0, offset) / itemSize));
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(itemCount, Math.max(first + 1, Math.ceil((Math.max(0, offset) + viewportSize) / itemSize) + overscan)),
  };
}

/** Spreadsheet column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
