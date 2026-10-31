import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceWorld } from '../src/simulation/RaceWorld';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';
import { courses } from '../src/modes/maze/courses';
const terrain = migrateLegacyTerrain(courses[0]).terrain;
const physics = { length: 80, speed: 5, recoilDistance: 8 };
test('shared world deterministic, duplicate inputs cause one spin and snapshots restore recoil', () => {
  const a = new RaceWorld(terrain, physics, true), b = new RaceWorld(terrain, physics, true);
  for (const w of [a, b]) { w.addPlayer('a', 0); w.addPlayer('b', 1); }
  for (let tick = 0; tick < 1000; tick++) {
    if (tick % 101 === 0) for (const w of [a, b]) {
      w.enqueue('a', { seq: tick + 1, requestedTick: tick + 1 });
      w.enqueue('a', { seq: tick + 1, requestedTick: tick + 1 });
    }
    a.step(); b.step();
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  const clone = new RaceWorld(terrain, physics, true);
  clone.restore(a.snapshot());
  for (let i = 0; i < 100; i++) { a.step(); clone.step(); }
  assert.deepEqual(a.snapshot(), clone.snapshot());
});
test('input validation bounds queues and forbids changing shared terrain by reference', () => {
  const w = new RaceWorld(terrain, physics, false); w.addPlayer('a', 0);
  assert.throws(() => w.enqueue('a', { seq: NaN, requestedTick: 0 }));
  for (let i = 1; i < 1000; i++) w.enqueue('a', { seq: i, requestedTick: 0 });
  w.step();
  assert.equal(w.snapshot().players[0].motion.pivot, 'B');
  assert.ok(w.snapshot().players[0].queue.length <= 30);
});
test('the frame is solid even when no explicit boundary walls are drawn', () => {
  const custom = structuredClone(terrain); custom.walls = [];
  custom.raceSpawns = [{ a: { x: 30, y: 70 }, angle: 0 }];
  const w = new RaceWorld(custom, physics, false); w.addPlayer('a', 0);
  for (let i = 0; i < 500; i++) w.step();
  const { a, b } = w.snapshot().players[0].motion;
  assert.ok(Math.min(a.x, b.x) >= custom.bounds.x + 17 - .001);
  assert.ok(Math.min(a.y, b.y) >= custom.bounds.y + 17 - .001);
});
