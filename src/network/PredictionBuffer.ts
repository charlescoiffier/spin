import { RaceWorld } from '../simulation/RaceWorld';
import type { RacePhysics } from '../shared/raceSettings';
import type { RaceSnapshot, SpinCommand } from '../shared/raceProtocol';
import type { TerrainV2 } from '../shared/terrain';
export class PredictionBuffer {
  private world: RaceWorld;
  private authoritativeTick = -1;
  private pending: SpinCommand[] = [];
  constructor(terrain: TerrainV2, physics: RacePhysics, contacts: boolean, private playerId: string) { this.world = new RaceWorld(terrain, physics, contacts); }
  get tick(): number { return this.world.tick; }
  record(command: SpinCommand): void {
    this.pending.push({ ...command }); if (this.pending.length > 60) this.pending.shift();
    this.world.enqueue(this.playerId, command);
  }
  advance(ticks: number): void {
    const end = Math.min(this.world.tick + ticks, this.authoritativeTick + 480);
    while (this.world.tick < end) this.world.step();
  }
  reconcile(snapshot: RaceSnapshot): boolean {
    if (snapshot.tick <= this.authoritativeTick) return false;
    const previousTick = this.world.tick; this.authoritativeTick = snapshot.tick;
    const self = snapshot.players.find(p => p.id === this.playerId);
    this.pending = this.pending.filter(c => c.seq > (self?.lastReceived ?? Infinity));
    this.world.restore(snapshot);
    for (const c of this.pending) this.world.enqueue(this.playerId, c);
    this.advance(Math.max(0, Math.min(480, previousTick - snapshot.tick)));
    return true;
  }
  getLocalPose() { return this.world.snapshot().players.find(p => p.id === this.playerId)?.motion ?? null; }
}
