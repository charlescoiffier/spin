import test from 'node:test';
import assert from 'node:assert/strict';
import { SpinMotion } from '../src/core/SpinMotion';
import { playerContact } from '../src/simulation/PlayerContacts';
import { RaceWorld } from '../src/simulation/RaceWorld';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';
import { courses } from '../src/modes/maze/courses';
test('bar-only crossing contacts and separated characters', () => {
  const a = new SpinMotion(100), b = new SpinMotion(100);
  a.resetAt({ x: 0, y: 0 }, 0); b.resetAt({ x: 50, y: -50 }, Math.PI / 2);
  assert.ok(playerContact(a.snapshot(), b.snapshot()));
  b.translate({ x: 200, y: 0 });
  assert.equal(playerContact(a.snapshot(), b.snapshot()), null);
});
test('reciprocal collisions keep pivot, reverse and recoil without sustained penetration', () => {
  const terrain = migrateLegacyTerrain(courses[0]).terrain;
  const w = new RaceWorld(terrain, { length: 80, speed: 5, recoilDistance: 20 }, true);
  w.addPlayer('a', 0); w.addPlayer('b', 1);
  let contacts = 0;
  for (let i = 0; i < 2400; i++) {
    const before = w.snapshot(); w.step();
    const after = w.snapshot();
    contacts += after.events.filter(e => e.type === 'player-impact').length;
    for (const p of after.players) assert.equal(p.motion.pivot, 'A');
    if (after.events.some(e => e.type === 'player-impact')) {
      for (let k = 0; k < 2; k++) assert.equal(after.players[k].motion.direction, -before.players[k].motion.direction);
    }
    const hit = playerContact(after.players[0].motion, after.players[1].motion);
    assert.ok(!hit || hit.depth < 0.02);
  }
  assert.ok(contacts > 0);
});
test('ghost race has no player impact', () => {
  const w = new RaceWorld(migrateLegacyTerrain(courses[0]).terrain, { length: 80, speed: 5, recoilDistance: 8 }, false);
  w.addPlayer('a', 0); w.addPlayer('b', 1);
  for (let i = 0; i < 500; i++) { w.step(); assert.equal(w.snapshot().events.length, 0); }
});
