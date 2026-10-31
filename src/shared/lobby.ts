import type { RacePhysics } from './raceSettings';
import type { TerrainV2 } from './terrain';
import type { RaceSnapshot } from './raceProtocol';
export interface LobbyRules { seats: 1 | 2 | 3 | 4; visibility: 'public' | 'private'; contactsEnabled: boolean; physics: RacePhysics }
export interface LobbyConfig extends LobbyRules { terrainId: string; revision: number }
export interface RaceResult { winners: string[]; elapsedMs: number; reason: 'finish' | 'abandoned' }
export interface LobbyView {
  status: 'waiting' | 'countdown' | 'running' | 'finished'; countdownMs: number; elapsedMs: number;
  members: { id: string; name: string; spawnIndex: number; connected: boolean }[];
  snapshot: RaceSnapshot; result: RaceResult | null;
}
export interface RaceWelcome { protocol: number; playerId: string; terrain: TerrainV2; rules: LobbyRules; code: string }
