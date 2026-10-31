import { SpinMotion, type Point } from '../core/SpinMotion';
import { containsDisk, getContacts, segmentPair, type Rect, type Wall } from '../collision/geometry';
import { defaultTheme, type CourseTheme } from '../modes/maze/theme';

export interface Spawn { a: Point; angle: number }
export interface TerrainV2 {
  schemaVersion: 2;
  id: string;
  revision: number;
  title: string;
  bounds: Rect;
  walls: readonly Wall[];
  raceSpawns: readonly Spawn[];
  goal: { rect: Rect; mode: 'touch' | 'whole' };
  theme: CourseTheme;
}
function rect(value: unknown): Rect {
  const r = value as Rect;
  if (!r || ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
    r.width < 24 || r.height < 24 || r.width > 8000 || r.height > 8000 ||
    Math.abs(r.x) > 8000 || Math.abs(r.y) > 8000 ||
    Math.abs(r.x + r.width) > 8000 || Math.abs(r.y + r.height) > 8000)
    throw Error('Dimensions du terrain invalides');
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
export function parseTerrain(value: unknown): TerrainV2 {
  const t = value as TerrainV2;
  if (!t || t.schemaVersion !== 2 || typeof t.id !== 'string' || !t.id || t.id.length > 80 ||
    !Number.isSafeInteger(t.revision) || t.revision < 1 || typeof t.title !== 'string' ||
    !t.title.trim() || t.title.length > 80) throw Error('Identité du terrain invalide');
  const bounds = rect(t.bounds);
  const within = (r: Rect) => r.x >= bounds.x && r.y >= bounds.y &&
    r.x + r.width <= bounds.x + bounds.width && r.y + r.height <= bounds.y + bounds.height;
  if (!Array.isArray(t.walls) || t.walls.length > 128) throw Error('Maximum 128 murs');
  const walls = t.walls.map(w => {
    if (!w || typeof w.id !== 'string' || !w.id || w.id.length > 80) throw Error('Mur invalide');
    const r = rect(w);
    if (!within(r)) throw Error('Mur hors du cadre');
    return { ...r, id: w.id };
  });
  if (new Set(walls.map(w => w.id)).size !== walls.length) throw Error('Identifiants dupliqués');
  if (!t.goal || !['touch', 'whole'].includes(t.goal.mode)) throw Error('Arrivée invalide');
  const goal = { rect: rect(t.goal.rect), mode: t.goal.mode };
  if (!within(goal.rect) || walls.some(w => w.x < goal.rect.x + goal.rect.width &&
    w.x + w.width > goal.rect.x && w.y < goal.rect.y + goal.rect.height && w.y + w.height > goal.rect.y))
    throw Error('Arrivée dans un mur ou hors du cadre');
  if (!t.theme || Object.keys(defaultTheme).some(k => !/^#[0-9a-f]{6}$/i.test(t.theme[k as keyof CourseTheme])))
    throw Error('Couleur invalide');
  if (!Array.isArray(t.raceSpawns) || t.raceSpawns.length < 1 || t.raceSpawns.length > 4)
    throw Error('Prévoir entre 1 et 4 départs');
  const poses: SpinMotion[] = [];
  const raceSpawns = t.raceSpawns.map(s => {
    if (!s?.a || ![s.a.x, s.a.y, s.angle].every(Number.isFinite)) throw Error('Départ invalide');
    const m = new SpinMotion(80, 5);
    m.resetAt(s.a, s.angle);
    if (![m.a, m.b].every(p => containsDisk(bounds, p, 17)) || getContacts(m.a, m.b, 17, 3.5, walls).length)
      throw Error('Départ dans un mur ou hors du cadre');
    for (const previous of poses) {
      const [p, q] = segmentPair(m.a, m.b, previous.a, previous.b);
      if (Math.hypot(p.x - q.x, p.y - q.y) <= 34) throw Error('Départs trop proches');
    }
    poses.push(m);
    return { a: { x: s.a.x, y: s.a.y }, angle: s.angle };
  });
  return { schemaVersion: 2, id: t.id, revision: t.revision, title: t.title.trim(), bounds, walls,
    raceSpawns, goal, theme: Object.fromEntries(Object.keys(defaultTheme).map(k => [k, t.theme[k as keyof CourseTheme]])) as unknown as CourseTheme };
}
