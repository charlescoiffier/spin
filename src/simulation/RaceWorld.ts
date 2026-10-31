import { SpinMotion } from '../core/SpinMotion';
import { CollisionMotion } from '../collision/CollisionMotion';
import { containsDisk, getContacts, type Wall } from '../collision/geometry';
import { parseTerrain, type TerrainV2 } from '../shared/terrain';
import { parseRacePhysics, type RacePhysics } from '../shared/raceSettings';
import type { PlayerSnapshot, RaceSnapshot, SpinCommand, QueuedSpin, RaceEvent } from '../shared/raceProtocol';
import { playerContact } from './PlayerContacts';
interface Player { id: string; spawnIndex: number; motion: SpinMotion; collision: CollisionMotion; ack: number; lastReceived: number; queue: QueuedSpin[]; rateTicks: number[] }
export class RaceWorld {
  static readonly hz = 240;
  readonly terrain: TerrainV2;
  readonly physics: RacePhysics;
  tick = 0;
  private players = new Map<string, Player>();
  private lockedPairs = new Set<string>();
  private events: RaceEvent[] = [];
  private walls: readonly Wall[];
  constructor(terrain: TerrainV2, physics: RacePhysics, readonly contactsEnabled: boolean) {
    this.terrain = parseTerrain(terrain); this.physics = parseRacePhysics(physics);
    const b = this.terrain.bounds;
    const frame = [
      { x: b.x - 24, y: b.y - 24, width: b.width + 48, height: 24 },
      { x: b.x - 24, y: b.y + b.height, width: b.width + 48, height: 24 },
      { x: b.x - 24, y: b.y, width: 24, height: b.height },
      { x: b.x + b.width, y: b.y, width: 24, height: b.height },
    ];
    let prefix = '__frame'; while (this.terrain.walls.some(w => w.id.startsWith(prefix))) prefix += '_';
    this.walls = [...this.terrain.walls, ...frame.map((r, i) => ({ ...r, id: `${prefix}:${i}` }))];
  }
  addPlayer(id: string, spawnIndex: number): void {
    if (!id || id.length > 80 || this.players.has(id) || this.players.size >= 4) throw Error('Joueur invalide');
    const spawn = this.terrain.raceSpawns[spawnIndex];
    if (!spawn || [...this.players.values()].some(p => p.spawnIndex === spawnIndex)) throw Error('Départ indisponible');
    const motion = new SpinMotion(this.physics.length, this.physics.speed);
    motion.resetAt(spawn.a, spawn.angle);
    if (![motion.a, motion.b].every(p => containsDisk(this.terrain.bounds, p, 17)) || getContacts(motion.a, motion.b, 17, 3.5, this.terrain.walls).length ||
      (this.contactsEnabled && [...this.players.values()].some(p => playerContact(motion.snapshot(), p.motion.snapshot()))))
      throw Error('Départ incompatible avec les réglages');
    const collision = new CollisionMotion(motion, this.walls); collision.setRecoilDistance(this.physics.recoilDistance);
    this.players.set(id, { id, spawnIndex, motion, collision, ack: 0, lastReceived: 0, queue: [], rateTicks: [] });
  }
  removePlayer(id: string): void {
    this.players.delete(id);
    this.lockedPairs.clear();
  }
  enqueue(id: string, c: SpinCommand): void {
    const p = this.players.get(id);
    if (!p) return;
    if (!c || !Number.isSafeInteger(c.seq) || c.seq < 1 || !Number.isSafeInteger(c.requestedTick) || c.requestedTick < 0)
      throw Error('Commande invalide');
    if (c.seq <= p.lastReceived) return;
    p.lastReceived = c.seq;
    p.rateTicks = p.rateTicks.filter(t => t > this.tick - RaceWorld.hz);
    if (p.rateTicks.length >= 30 || p.queue.length >= 30) return;
    const acceptedTick = Math.max(this.tick + 1, Math.min(c.requestedTick, this.tick + 120), (p.queue.at(-1)?.acceptedTick ?? this.tick) + 1);
    p.queue.push({ seq: c.seq, requestedTick: c.requestedTick, acceptedTick });
    p.rateTicks.push(this.tick);
  }
  step(): void {
    this.tick++; this.events = [];
    const players = [...this.players.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    for (const p of players) {
      while (p.queue[0]?.acceptedTick <= this.tick) { const c = p.queue.shift()!; p.motion.switchPivot(); p.ack = c.seq; }
    }
    const before = players.map(p => ({ motion: p.motion.snapshot(), collision: p.collision.snapshot() }));
    const dt = 1 / RaceWorld.hz;
    const pairs = () => players.flatMap((a, i) => players.slice(i + 1).flatMap(b => {
      const key = JSON.stringify([a.id, b.id]);
      const hit = playerContact(a.motion.snapshot(), b.motion.snapshot());
      return hit ? [{ a, b, key, hit }] : [];
    }));
    const move = (fraction: number) => players.forEach((p, i) => {
      p.motion.restore(before[i].motion); p.collision.restore(before[i].collision); p.collision.step(dt * fraction);
    });
    // Bound every proposal below 2px, including long custom bars and maximum recoil.
    const pieces = Math.max(1, Math.ceil((this.physics.length * this.physics.speed * dt + this.physics.recoilDistance * 2 * dt / .08) / 2));
    // Individual wall response already subdivides; pair response needs the same guarantee.
    for (let piece = 0; piece < pieces; piece++) {
      for (let i = 0; i < players.length; i++) for (const b of players.slice(i + 1)) {
        if (!playerContact(players[i].motion.snapshot(), b.motion.snapshot(), 1))
          this.lockedPairs.delete(JSON.stringify([players[i].id, b.id]));
      }
      for (let i = 0; i < players.length; i++) before[i] = { motion: players[i].motion.snapshot(), collision: players[i].collision.snapshot() };
      const submove = (f: number) => move(f / pieces);
      submove(1);
      if (!this.contactsEnabled) continue;
      const hits = pairs();
      if (!hits.length) continue;
      const full = players.map(p => ({ motion: p.motion.snapshot(), collision: p.collision.snapshot() }));
      let low = 0, high = 1;
      for (let n = 0; n < 12; n++) { const mid = (low + high) / 2; submove(mid); if (pairs().length) high = mid; else low = mid; }
      submove(Math.max(0, low - 1e-6));
      const safe = players.map(p => ({ motion: p.motion.snapshot(), collision: p.collision.snapshot() }));
      const affected = new Set(hits.flatMap(hit => [hit.a, hit.b]));
      // Uninvolved racers consume the full step. Expand only if their full pose
      // would overlap a participant stopped at the earlier contact.
      for (let round = 0; round <= players.length; round++) {
        players.forEach((p, i) => { const state = affected.has(p) ? safe[i] : full[i]; p.motion.restore(state.motion); p.collision.restore(state.collision); });
        const mixed = pairs().filter(hit => !affected.has(hit.a) || !affected.has(hit.b));
        if (!mixed.length) break;
        for (const hit of mixed) { affected.add(hit.a); affected.add(hit.b); if (!hits.some(h => h.key === hit.key)) hits.push(hit); }
      }
      const normals = new Map<Player, { x: number; y: number }>();
      for (const { a, b, key, hit } of hits) {
        if (this.lockedPairs.has(key)) continue;
        this.lockedPairs.add(key);
        for (const [p, sign] of [[a, 1], [b, -1]] as const) {
          const v = normals.get(p) ?? { x: 0, y: 0 };
          v.x += hit.normal.x * sign; v.y += hit.normal.y * sign; normals.set(p, v);
        }
        this.events.push({ id: `${this.tick}:${piece}:${key}`, type: 'player-impact', players: [a.id, b.id] });
      }
      for (const [p, normal] of normals) p.collision.externalImpact(normal);
    }
  }
  snapshot(): RaceSnapshot {
    return { tick: this.tick, players: [...this.players.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(p => ({
      id: p.id, spawnIndex: p.spawnIndex, motion: p.motion.snapshot(), collision: p.collision.snapshot(),
      ack: p.ack, lastReceived: p.lastReceived, queue: structuredClone(p.queue), rateTicks: [...p.rateTicks],
    })), lockedPairs: [...this.lockedPairs].sort(), events: structuredClone(this.events) };
  }
  restore(snapshot: RaceSnapshot): void {
    this.players.clear(); this.tick = snapshot.tick;
    for (const s of snapshot.players) {
      // Admission validates initial poses, not currently moving poses.
      const motion = new SpinMotion(this.physics.length, this.physics.speed); motion.restore(s.motion);
      const collision = new CollisionMotion(motion, this.walls); collision.setRecoilDistance(this.physics.recoilDistance); collision.restore(s.collision);
      this.players.set(s.id, { id: s.id, spawnIndex: s.spawnIndex, motion, collision, ack: s.ack, lastReceived: s.lastReceived, queue: structuredClone(s.queue), rateTicks: [...s.rateTicks] });
    }
    this.lockedPairs = new Set(snapshot.lockedPairs); this.events = structuredClone(snapshot.events);
  }
}
