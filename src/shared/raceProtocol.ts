import type { MotionState } from '../core/SpinMotion';
import type { CollisionState } from '../collision/CollisionMotion';
export const protocolVersion = 1;
export type PlayerId = string;
export type Tick = number;
export interface SpinCommand { seq: number; requestedTick: Tick }
export interface QueuedSpin extends SpinCommand { acceptedTick: Tick }
export interface PlayerSnapshot {
  id: PlayerId; spawnIndex: number; motion: MotionState; collision: CollisionState;
  ack: number; lastReceived: number; queue: QueuedSpin[]; rateTicks: Tick[];
}
export interface RaceEvent { id: string; type: 'player-impact'; players: [PlayerId, PlayerId] }
export interface RaceSnapshot { tick: Tick; players: PlayerSnapshot[]; lockedPairs: string[]; events: RaceEvent[] }
