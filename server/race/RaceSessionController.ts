import { RaceWorld } from '../../src/simulation/RaceWorld';
import type { LobbyRules, LobbyView, RaceResult } from '../../src/shared/lobby';
import type { SpinCommand } from '../../src/shared/raceProtocol';
import type { TerrainV2 } from '../../src/shared/terrain';
import { finishFraction } from '../../src/simulation/finishTime';
export class RaceSessionController {
  readonly world: RaceWorld;
  private members = new Map<string, { id: string; name: string; spawnIndex: number; connected: boolean; droppedAt: number | null }>();
  private status: LobbyView['status'] = 'waiting';
  private countdownAt = 0;
  private startedAt = 0;
  private result: RaceResult | null = null;
  private waitingRespawns = new Set<string>();
  constructor(readonly terrain: TerrainV2, readonly rules: LobbyRules) {
    if (![1, 2, 3, 4].includes(rules.seats) || rules.seats > terrain.raceSpawns.length || !['public', 'private'].includes(rules.visibility) || typeof rules.contactsEnabled !== 'boolean')
      throw Error('Options de partie invalides');
    this.world = new RaceWorld(terrain, rules.physics, rules.contactsEnabled);
    // Validate the full layout up front with the chosen bar length, even before everyone joins.
    for (let i = 0; i < rules.seats; i++) this.world.addPlayer(`validation-${i}`, i);
    for (let i = 0; i < rules.seats; i++) this.world.removePlayer(`validation-${i}`);
    if (terrain.goal.mode === 'whole' && Math.hypot(terrain.goal.rect.width - 34, terrain.goal.rect.height - 34) < rules.physics.length)
      throw Error('Arrivée trop petite pour ces réglages');
  }
  join(id: string, name: string, now: number): void {
    if (this.status !== 'waiting' || this.members.has(id) || this.members.size >= this.rules.seats) throw Error('Partie indisponible');
    const spawnIndex = Array.from({ length: this.rules.seats }, (_, i) => i).find(i => ![...this.members.values()].some(m => m.spawnIndex === i))!;
    this.world.addPlayer(id, spawnIndex);
    this.members.set(id, { id, name: name.trim().slice(0, 24) || 'Invité', spawnIndex, connected: true, droppedAt: null });
    this.countdown(now);
  }
  private countdown(now: number): void {
    if (this.status === 'running' || this.status === 'finished') return;
    if (this.members.size === this.rules.seats && [...this.members.values()].every(m => m.connected)) {
      this.status = 'countdown'; this.countdownAt = now + 3000;
    } else this.status = 'waiting';
  }
  spin(id: string, command: SpinCommand): void { if (this.status === 'running' && this.members.get(id)?.connected) this.world.enqueue(id, command); }
  drop(id: string, now: number): void {
    const m = this.members.get(id); if (!m || !m.connected) return;
    m.connected = false; m.droppedAt = now; this.world.removePlayer(id); this.countdown(now);
  }
  reconnect(id: string, now: number): void {
    const m = this.members.get(id);
    if (!m || m.connected || m.droppedAt === null || now - m.droppedAt > 30000) throw Error('Délai de retour dépassé');
    if (this.status === 'finished') { m.connected = true; m.droppedAt = null; return; }
    try { this.world.addPlayer(id, m.spawnIndex); }
    catch { this.waitingRespawns.add(id); }
    m.connected = true; m.droppedAt = null; this.countdown(now);
  }
  leave(id: string, now: number): void { this.world.removePlayer(id); this.members.delete(id); this.waitingRespawns.delete(id); this.countdown(now); }
  advance(now: number): void {
    if (this.status === 'finished') return;
    for (const m of [...this.members.values()]) if (!m.connected && m.droppedAt !== null && now - m.droppedAt > 30000) this.leave(m.id, now);
    if (this.status === 'countdown' && now >= this.countdownAt) { this.status = 'running'; this.startedAt = this.countdownAt; }
    if (this.status !== 'running') return;
    for (const id of this.waitingRespawns) {
      const m = this.members.get(id);
      if (!m?.connected) continue;
      try { this.world.addPlayer(id, m.spawnIndex); this.waitingRespawns.delete(id); } catch { /* wait for a free start, with clock continuing */ }
    }
    if (this.members.size === 0) { this.status = 'finished'; this.result = { winners: [], elapsedMs: now - this.startedAt, reason: 'abandoned' }; return; }
    const target = Math.floor((now - this.startedAt) * RaceWorld.hz / 1000);
    // Never use browser time or drop simulation time to favour a player.
    const end = Math.min(target, this.world.tick + 2400);
    while (this.world.tick < end && this.status === 'running') {
      const before = this.world.snapshot();
      this.world.step();
      const arrivals = this.world.snapshot().players.flatMap(p => {
        const old = before.players.find(q => q.id === p.id)?.motion;
        const fraction = old ? finishFraction(this.terrain.goal, old, p.motion) : null;
        return fraction === null ? [] : [{ id: p.id, fraction }];
      });
      if (arrivals.length) {
        const first = Math.min(...arrivals.map(a => a.fraction));
        this.status = 'finished'; this.result = { winners: arrivals.filter(a => Math.abs(a.fraction - first) < 1 / 65536).map(a => a.id),
          elapsedMs: (this.world.tick - 1 + first) * 1000 / RaceWorld.hz, reason: 'finish' };
      }
    }
  }
  view(now: number): LobbyView {
    return { status: this.status, countdownMs: this.status === 'countdown' ? Math.max(0, this.countdownAt - now) : 0,
      elapsedMs: this.result?.elapsedMs ?? (this.status === 'running' ? this.world.tick * 1000 / RaceWorld.hz : 0),
      members: [...this.members.values()].map(({ droppedAt, ...m }) => m), snapshot: this.world.snapshot(), result: structuredClone(this.result) };
  }
}
