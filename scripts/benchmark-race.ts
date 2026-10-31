import { performance } from 'node:perf_hooks';
import { SpinMotion } from '../src/core/SpinMotion';
import { CollisionMotion } from '../src/collision/CollisionMotion';
import { courses } from '../src/modes/maze/courses';
import { RaceWorld } from '../src/simulation/RaceWorld';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';

// Wall-contact baseline only. Repeat with RaceWorld once pair contacts exist.
const ticks = 240 * 60;
function run() {
  const players = Array.from({ length: 4 }, (_, i) => {
    const motion = new SpinMotion(80, 5);
    motion.resetAt({ x: 330, y: 130 + i * 70 }, 0);
    return { motion, collisions: new CollisionMotion(motion, courses[0].walls) };
  });
  const start = performance.now();
  for (let tick = 0; tick < ticks; tick++) {
    for (const { motion, collisions } of players) {
      if (tick % 101 === 0) motion.switchPivot();
      collisions.step(1 / 240);
    }
  }
  return performance.now() - start;
}
run(); // warm JIT
const samples = Array.from({ length: 5 }, run).sort((a, b) => a - b);
console.log(JSON.stringify({
  scenario: '4 independent players, wall contacts; excludes networking and pair collisions',
  node: process.version, ticks, simulatedSeconds: 60,
  medianMs: samples[2], maxMs: samples[4],
  medianMsPerTick: samples[2] / ticks,
  estimatedSingleCorePercent: samples[2] / 600,
  heapUsedMiB: process.memoryUsage().heapUsed / 1024 ** 2,
}, null, 2));
function runShared() {
  const world = new RaceWorld(migrateLegacyTerrain(courses[0]).terrain, { speed: 5, length: 80, recoilDistance: 8 }, true);
  for (let i = 0; i < 4; i++) world.addPlayer(`player-${i}`, i);
  const start = performance.now();
  for (let tick = 0; tick < ticks; tick++) {
    if (tick % 101 === 0) for (let i = 0; i < 4; i++) world.enqueue(`player-${i}`, { seq: tick + 1, requestedTick: tick + 1 });
    world.step();
    if (tick % 12 === 0) JSON.stringify(world.snapshot());
  }
  return performance.now() - start;
}
runShared();
const shared = Array.from({ length: 3 }, runShared).sort((a, b) => a - b);
console.log(JSON.stringify({ scenario: '4 shared players with pair collisions and JSON snapshots at 20Hz; excludes transport/auth',
  simulatedSeconds: 60, medianMs: shared[1], maxMs: shared[2], medianMsPerTick: shared[1] / ticks,
  estimatedSingleCorePercent: shared[1] / 600, heapUsedMiB: process.memoryUsage().heapUsed / 1024 ** 2 }, null, 2));
