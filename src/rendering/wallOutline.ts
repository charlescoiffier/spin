import type { Rect } from "../collision/geometry";
import type { Point } from "../core/SpinMotion";
export interface Segment {
  a: Point;
  b: Point;
}
type Interval = [number, number];
function subtract(parts: Interval[], low: number, high: number): Interval[] {
  return parts.flatMap(([a, b]) =>
    high <= a || low >= b
      ? [[a, b] as Interval]
      : ([
          [a, Math.min(b, low)],
          [Math.max(a, high), b],
        ].filter(([x, y]) => y > x) as Interval[]),
  );
}
/** Exact boundary of the union of axis-aligned blocks, including partial joins and holes. */
export function wallOutline(rects: readonly Rect[]): Segment[] {
  const lines = new Map<
    string,
    { horizontal: boolean; position: number; intervals: Interval[] }
  >();
  for (const r of rects)
    for (const side of ["top", "bottom", "left", "right"] as const) {
      const horizontal = side === "top" || side === "bottom";
      const position =
        side === "top"
          ? r.y
          : side === "bottom"
            ? r.y + r.height
            : side === "left"
              ? r.x
              : r.x + r.width;
      let parts: Interval[] = [
        [horizontal ? r.x : r.y, horizontal ? r.x + r.width : r.y + r.height],
      ];
      for (const other of rects) {
        if (other === r) continue;
        const covers =
          side === "top"
            ? other.y < position && other.y + other.height >= position
            : side === "bottom"
              ? other.y <= position && other.y + other.height > position
              : side === "left"
                ? other.x < position && other.x + other.width >= position
                : other.x <= position && other.x + other.width > position;
        if (covers)
          parts = subtract(
            parts,
            horizontal ? other.x : other.y,
            horizontal ? other.x + other.width : other.y + other.height,
          );
      }
      const key = `${horizontal ? "h" : "v"}:${position}`;
      if (!lines.has(key))
        lines.set(key, { horizontal, position, intervals: [] });
      lines.get(key)!.intervals.push(...parts);
    }
  const result: Segment[] = [];
  for (const { horizontal, position, intervals } of lines.values()) {
    const merged: Interval[] = [];
    for (const [low, high] of intervals.sort((a, b) => a[0] - b[0])) {
      const last = merged.at(-1);
      if (last && low <= last[1]) last[1] = Math.max(last[1], high);
      else merged.push([low, high]);
    }
    for (const [a, b] of merged)
      result.push(
        horizontal
          ? { a: { x: a, y: position }, b: { x: b, y: position } }
          : { a: { x: position, y: a }, b: { x: position, y: b } },
      );
  }
  return result;
}
