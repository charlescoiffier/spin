import test from 'node:test';
import assert from 'node:assert/strict';
import { SpinMotion } from '../src/core/SpinMotion';
import { finishFraction } from '../src/simulation/finishTime';
test('finish distinguishes two contacts inside the same simulation tick', () => {
  const m = new SpinMotion(80); m.resetAt({ x: 0, y: 50 }, Math.PI / 2);
  const before = m.snapshot(); m.translate({ x: 10, y: 0 }); const after = m.snapshot();
  const f = finishFraction({ mode: 'touch', rect: { x: 20, y: 30, width: 50, height: 150 } }, before, after)!;
  assert.ok(Math.abs(f - .3) < .001);
  assert.equal(finishFraction({ mode: 'whole', rect: { x: 500, y: 30, width: 150, height: 150 } }, before, after), null);
});
