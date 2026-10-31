import type { MotionState, Point } from '../core/SpinMotion';
import { segmentPair } from '../collision/geometry';
export interface PlayerContact { normal: Point; depth: number }
export function playerContact(a: MotionState, b: MotionState, margin = 0): PlayerContact | null {
  const parts = (m: MotionState) => [
    { p: m.a, q: m.a, radius: 17 }, { p: m.b, q: m.b, radius: 17 }, { p: m.a, q: m.b, radius: 3.5 },
  ];
  let best: PlayerContact | null = null;
  for (const x of parts(a)) for (const y of parts(b)) {
    const [p, q] = segmentPair(x.p, x.q, y.p, y.q);
    const d = Math.hypot(p.x - q.x, p.y - q.y), radius = x.radius + y.radius + margin;
    if (d > radius) continue;
    const centerDelta = { x: (a.a.x + a.b.x - b.a.x - b.b.x) / 2, y: (a.a.y + a.b.y - b.a.y - b.b.y) / 2 };
    const fallback = Math.hypot(centerDelta.x, centerDelta.y);
    const normal = d > 1e-8 ? { x: (p.x - q.x) / d, y: (p.y - q.y) / d } : fallback > 1e-8
      ? { x: centerDelta.x / fallback, y: centerDelta.y / fallback } : { x: 1, y: 0 };
    const hit = { normal, depth: radius - d };
    if (!best || hit.depth > best.depth) best = hit;
  }
  return best;
}
