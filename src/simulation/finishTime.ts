import type { MotionState } from '../core/SpinMotion';
import type { TerrainV2 } from '../shared/terrain';
import { containsDisk, getContacts } from '../collision/geometry';
/** Fractional contact along one short simulation step; visual clocks never decide results. */
export function finishFraction(goal: TerrainV2['goal'], previous: MotionState, current: MotionState): number | null {
  const r = goal.rect, points = [previous.a, previous.b, current.a, current.b];
  if (Math.max(...points.map(p => p.x)) + 17 < r.x || Math.min(...points.map(p => p.x)) - 17 > r.x + r.width ||
    Math.max(...points.map(p => p.y)) + 17 < r.y || Math.min(...points.map(p => p.y)) - 17 > r.y + r.height) return null;
  const reached = (f: number) => {
    const point = (key: 'a' | 'b') => ({ x: previous[key].x + (current[key].x - previous[key].x) * f, y: previous[key].y + (current[key].y - previous[key].y) * f });
    const a = point('a'), b = point('b');
    return goal.mode === 'whole' ? containsDisk(r, a, 17) && containsDisk(r, b, 17) : getContacts(a, b, 17, 3.5, [{ ...r, id: 'goal' }]).length > 0;
  };
  if (reached(0)) return 0;
  for (let sample = 1; sample <= 16; sample++) if (reached(sample / 16)) {
    let low = (sample - 1) / 16, high = sample / 16;
    for (let n = 0; n < 12; n++) { const middle = (low + high) / 2; if (reached(middle)) high = middle; else low = middle; }
    return high;
  }
  return null;
}
