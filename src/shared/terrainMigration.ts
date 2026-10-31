import { parseMaze, type MazeDefinition } from '../modes/maze/MazeDefinition';
import { defaultTheme } from '../modes/maze/theme';
import { parseTerrain, type TerrainV2, type Spawn } from './terrain';

// Explicit layouts for the three supplied terrains; custom terrain owners place their own starts.
const baseStarts: Record<string, number[]> = {
  initiation: [200, 260, 320, 380], precision: [200, 260, 320, 380], choice: [430, 490, 550, 610],
};
export function migrateLegacyTerrain(value: unknown): { terrain: TerrainV2; warnings: string[]; needsConfirmation: boolean } {
  if ((value as TerrainV2)?.schemaVersion === 2) return { terrain: parseTerrain(value), warnings: [], needsConfirmation: false };
  const m = parseMaze(value);
  const minX = Math.min(0, ...m.walls.map(w => w.x), m.spawn.a.x - 120, m.exit.x);
  const minY = Math.min(0, ...m.walls.map(w => w.y), m.spawn.a.y - 120, m.exit.y);
  const maxX = Math.max(...m.walls.map(w => w.x + w.width), m.spawn.a.x + 200, m.exit.x + m.exit.width);
  const maxY = Math.max(...m.walls.map(w => w.y + w.height), m.spawn.a.y + 120, m.exit.y + m.exit.height);
  const raceSpawns: readonly Spawn[] = m.raceSpawns ?? (baseStarts[m.id] && !m.id.startsWith('custom-')
    ? baseStarts[m.id].map(y => ({ a: { x: 170, y }, angle: 0 })) : [m.spawn]);
  const changed = m.finishMode === 'pivot';
  const terrain = parseTerrain({ schemaVersion: 2, id: m.id, revision: m.version, title: m.title,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }, walls: m.walls,
    raceSpawns, goal: { rect: m.exit, mode: changed ? 'touch' : m.finishMode ?? 'whole' },
    theme: { ...defaultTheme, ...m.theme } });
  return { terrain, warnings: changed ? ['L’arrivée pivot seul devient une cible à toucher. L’original et ses records sont conservés.'] : [], needsConfirmation: changed };
}
export function terrainToLegacy(t: TerrainV2): MazeDefinition {
  const m = parseTerrain(t);
  return { id: m.id, version: m.revision, title: m.title, walls: m.walls, spawn: m.raceSpawns[0],
    raceSpawns: m.raceSpawns, exit: m.goal.rect, finishMode: m.goal.mode, theme: m.theme };
}
