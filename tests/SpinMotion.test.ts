import { test } from "node:test";
import assert from "node:assert/strict";
import { SpinMotion } from "../src/core/SpinMotion.ts";
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("rotation maintient le pivot fixe et la longueur constante", () => {
  const m = new SpinMotion(100, Math.PI);
  m.update(0.5);
  near(m.a.x, 0);
  near(m.a.y, 0);
  near(m.b.x, 0);
  near(m.b.y, 100);
});
test("changer de pivot conserve exactement les positions et inverse le sens", () => {
  const m = new SpinMotion(100, 2);
  m.update(0.3);
  const before = JSON.stringify([m.a, m.b]);
  m.switchPivot();
  assert.equal(JSON.stringify([m.a, m.b]), before);
  assert.equal(m.pivot, "B");
  assert.equal(m.direction, -1);
  const pivot = { ...m.b };
  m.update(0.2);
  assert.deepEqual(m.b, pivot);
  near(Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y), 100);
});
test("la trajectoire dépend du temps écoulé, pas du découpage des images", () => {
  const a = new SpinMotion(140, 2),
    b = new SpinMotion(140, 2);
  a.update(1);
  for (let i = 0; i < 100; i++) b.update(0.01);
  near(a.b.x, b.b.x);
  near(a.b.y, b.b.y);
});
test("longueur réglable conserve le pivot et reset restaure les positions", () => {
  const m = new SpinMotion(100, 2);
  m.switchPivot();
  const p = { ...m.b };
  m.setLength(200);
  assert.deepEqual(m.b, p);
  near(Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y), 200);
  m.reset();
  assert.equal(m.pivot, "A");
  assert.equal(m.direction, 1);
  near(m.b.x, 200);
});
test("reverse conserve positions et pivot, translate conserve la barre", () => {
  const m = new SpinMotion(80, 5);
  m.update(0.2);
  const before = JSON.stringify([m.a, m.b, m.pivot]);
  m.reverse();
  assert.equal(JSON.stringify([m.a, m.b, m.pivot]), before);
  assert.equal(m.direction, -1);
  const a = { ...m.a };
  m.translate({ x: 8, y: -3 });
  near(m.a.x, a.x + 8);
  near(m.a.y, a.y - 3);
  near(Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y), 80);
});
test("snapshot indépendant, restore reproductible et spawn orienté", () => {
  const m = new SpinMotion(80, 5);
  m.resetAt({ x: 100, y: 200 }, Math.PI / 2);
  near(m.b.x, 100);
  near(m.b.y, 280);
  const state = m.snapshot();
  m.update(0.2);
  const result = m.snapshot();
  m.restore(state);
  m.update(0.2);
  assert.deepEqual(m.snapshot(), result);
  state.a.x = 999;
  assert.notEqual(m.a.x, 999);
});
