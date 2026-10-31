import type { Point } from "../core/SpinMotion";
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Wall extends Rect {
  id: string;
}
export interface Contact {
  wallId: string;
  normal: Point;
  depth: number;
}
const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n));
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

function nearestOnSegment(p: Point, a: Point, b: Point): Point {
  const d = sub(b, a),
    length2 = dot(d, d);
  const t = length2 === 0 ? 0 : clamp(dot(sub(p, a), d) / length2, 0, 1);
  return { x: a.x + t * d.x, y: a.y + t * d.y };
}

// The closest pair is either an intersection or an endpoint projected on the other segment.
export function segmentPair(a: Point, b: Point, c: Point, d: Point): [Point, Point] {
  const u = sub(b, a),
    v = sub(d, c),
    w = sub(c, a),
    cross = u.x * v.y - u.y * v.x;
  if (Math.abs(cross) > 1e-12) {
    const t = (w.x * v.y - w.y * v.x) / cross,
      s = (w.x * u.y - w.y * u.x) / cross;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
      const p = { x: a.x + t * u.x, y: a.y + t * u.y };
      return [p, p];
    }
  }
  const pairs: [Point, Point][] = [
    [a, nearestOnSegment(a, c, d)],
    [b, nearestOnSegment(b, c, d)],
    [nearestOnSegment(c, a, b), c],
    [nearestOnSegment(d, a, b), d],
  ];
  return pairs.reduce((best, pair) =>
    dot(sub(pair[0], pair[1]), sub(pair[0], pair[1])) <
    dot(sub(best[0], best[1]), sub(best[0], best[1]))
      ? pair
      : best,
  );
}
function inside(p: Point, r: Rect): boolean {
  return (
    p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
  );
}
function interiorContact(
  p: Point,
  r: Rect,
  radius: number,
): Omit<Contact, "wallId"> {
  const faces = [
    { distance: p.x - r.x, normal: { x: -1, y: 0 } },
    { distance: r.x + r.width - p.x, normal: { x: 1, y: 0 } },
    { distance: p.y - r.y, normal: { x: 0, y: -1 } },
    { distance: r.y + r.height - p.y, normal: { x: 0, y: 1 } },
  ];
  const face = faces.reduce((a, b) => (a.distance <= b.distance ? a : b));
  return { normal: face.normal, depth: radius + Math.max(0, face.distance) };
}
function pairContact(
  p: Point,
  q: Point,
  r: Rect,
  radius: number,
): Omit<Contact, "wallId"> | null {
  const dx = p.x - q.x,
    dy = p.y - q.y,
    distance = Math.hypot(dx, dy);
  if (distance > radius + 1e-10) return null;
  if (distance < 1e-10) return interiorContact(p, r, radius);
  return {
    normal: { x: dx / distance, y: dy / distance },
    depth: Math.max(0, radius - distance),
  };
}
export function getContacts(
  a: Point,
  b: Point,
  ballRadius: number,
  barRadius: number,
  walls: readonly Wall[],
  margin = 0,
): Contact[] {
  const result: Contact[] = [];
  for (const wall of walls) {
    const candidates: Omit<Contact, "wallId">[] = [];
    for (const p of [a, b]) {
      const radius = ballRadius + margin;
      const contact = inside(p, wall)
        ? interiorContact(p, wall, radius)
        : pairContact(
            p,
            {
              x: clamp(p.x, wall.x, wall.x + wall.width),
              y: clamp(p.y, wall.y, wall.y + wall.height),
            },
            wall,
            radius,
          );
      if (contact) candidates.push(contact);
    }
    const corners = [
      { x: wall.x, y: wall.y },
      { x: wall.x + wall.width, y: wall.y },
      { x: wall.x + wall.width, y: wall.y + wall.height },
      { x: wall.x, y: wall.y + wall.height },
    ];
    for (let i = 0; i < 4; i++) {
      const [p, q] = segmentPair(a, b, corners[i], corners[(i + 1) % 4]);
      const contact = pairContact(p, q, wall, barRadius + margin);
      if (contact) candidates.push(contact);
    }
    if (inside(a, wall) && inside(b, wall))
      candidates.push(interiorContact(a, wall, barRadius + margin));
    if (candidates.length) {
      const deepest = candidates.reduce((x, y) => (x.depth >= y.depth ? x : y));
      result.push({ wallId: wall.id, ...deepest });
    }
  }
  return result.sort((x, y) => x.wallId.localeCompare(y.wallId));
}
export function containsDisk(
  rect: Rect,
  center: Point,
  radius: number,
): boolean {
  return (
    center.x - radius >= rect.x &&
    center.y - radius >= rect.y &&
    center.x + radius <= rect.x + rect.width &&
    center.y + radius <= rect.y + rect.height
  );
}
