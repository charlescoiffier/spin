import { performance } from 'node:perf_hooks';
import { SpinMotion } from '../src/core/SpinMotion';
import { CollisionMotion } from '../src/collision/CollisionMotion';
import { courses } from '../src/modes/maze/courses';

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
