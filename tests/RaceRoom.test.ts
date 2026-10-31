import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSessionController } from '../server/race/RaceSessionController';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';
import { courses } from '../src/modes/maze/courses';
const t = migrateLegacyTerrain(courses[0]).terrain;
const config = { seats: 2 as const, visibility: 'private' as const, contactsEnabled: false, physics: { speed: 5, length: 80, recoilDistance: 8 } };
test('automatic countdown waits for seats, drop cancels and reconnect starts it again', () => {
  const s = new RaceSessionController(t, config);
  s.join('a', 'Alice', 0); assert.equal(s.view(0).status, 'waiting');
  s.join('b', 'Bob', 100); assert.equal(s.view(100).countdownMs, 3000);
  s.drop('b', 200); assert.equal(s.view(200).status, 'waiting');
  s.reconnect('b', 300); s.advance(3300);
  assert.equal(s.view(3300).status, 'running');
});
test('one seat starts automatically, sequence does not double spin and disconnect expires', () => {
  const s = new RaceSessionController(t, { ...config, seats: 1 });
  s.join('a', 'Alice', 0); s.advance(3000);
  s.spin('a', { seq: 1, requestedTick: 1 }); s.spin('a', { seq: 1, requestedTick: 1 });
  s.advance(3010); assert.equal(s.view(3010).snapshot.players[0].motion.pivot, 'B');
  s.drop('a', 3010); assert.equal(s.view(3010).snapshot.players.length, 0);
  s.advance(33011); assert.equal(s.view(33011).status, 'finished');
  assert.equal(s.view(33011).result?.reason, 'abandoned');
});
test('ready result cannot change if client drops after the finishing tick', () => {
  const terrain = structuredClone(t);
  terrain.goal = { mode: 'touch', rect: { x: 150, y: 170, width: 150, height: 60 } };
  const s = new RaceSessionController(terrain, { ...config, seats: 1 });
  s.join('a', 'Alice', 0); s.advance(3010);
  const result = s.view(3010).result;
  assert.deepEqual(result?.winners, ['a']);
  s.drop('a', 3010); s.advance(4000);
  s.reconnect('a', 4100);
  assert.deepEqual(s.view(4000).result, result);
});
test('a dropped racer can reconnect after another racer has won and receives the result', () => {
  const terrain = structuredClone(t);
  terrain.goal = { mode: 'touch', rect: { x: 150, y: 170, width: 150, height: 60 } };
  const s = new RaceSessionController(terrain, config);
  s.join('a', 'Alice', 0); s.join('b', 'Bob', 0); s.advance(3000);
  s.drop('b', 3000); s.advance(3010);
  assert.equal(s.view(3010).status, 'finished');
  s.reconnect('b', 3100);
  assert.deepEqual(s.view(3100).result!.winners, ['a']);
});
