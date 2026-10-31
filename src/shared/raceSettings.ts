import { defaults, parseSettings, type Settings } from '../core/settings';
export interface RacePhysics { speed: number; length: number; recoilDistance: number }
export function parseRacePhysics(input: unknown): RacePhysics {
  if (!input || typeof input !== 'object') throw Error('Réglages invalides');
  const p = input as RacePhysics;
  const parsed = parseSettings({ ...defaults, speed: p.speed, length: p.length, recoilDistance: p.recoilDistance });
  if (!parsed) throw Error('Réglages physiques invalides');
  return { speed: parsed.speed, length: parsed.length, recoilDistance: parsed.recoilDistance };
}
export function physicsFromSettings(settings: Settings): RacePhysics { return parseRacePhysics(settings); }
