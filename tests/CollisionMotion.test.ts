import { test } from "node:test";
import assert from "node:assert/strict";
import { SpinMotion } from "../src/core/SpinMotion.ts";
import { CollisionMotion } from "../src/collision/CollisionMotion.ts";
import { getContacts, type Wall } from "../src/collision/geometry.ts";
const dt = 1 / 240;
const floor: Wall = { id: "floor", x: -300, y: 70, width: 600, height: 24 };
function free(m: SpinMotion, walls: Wall[]) {
  assert.equal(getContacts(m.a, m.b, 17, 3.5, walls, -0.001).length, 0);
  assert.ok(Math.abs(Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y) - 80) < 1e-8);
}
test("rebond inverse une fois, conserve pivot B et ne pénètre pas", () => {
  const m = new SpinMotion(80, 5);
  m.switchPivot();
  const c = new CollisionMotion(m, [floor]);
  let reversals = 0;
  for (let i = 0; i < 120; i++) {
    const before = m.direction;
    c.step(dt);
    if (before !== m.direction) reversals++;
    assert.equal(m.pivot, "B");
    free(m, [floor]);
  }
  assert.ok(reversals >= 1);
  assert.ok(reversals <= 3);
});
test("inversion au contact sans saut et recul progressif", () => {
  const m = new SpinMotion(80, 5);
  const c = new CollisionMotion(m, [floor]);
  for (let i = 0; i < 100; i++) {
    const before = m.snapshot();
    c.step(dt);
    free(m, [floor]);
    if (before.direction !== m.direction) {
      assert.deepEqual(m.a, before.a);
      assert.ok(Math.hypot(m.b.x - before.b.x, m.b.y - before.b.y) < 2);
      const p = { ...m.a };
      c.step(dt);
      assert.ok(Math.hypot(m.a.x - p.x, m.a.y - p.y) < 2);
      return;
    }
  }
  assert.fail("rebond attendu");
});
test("coin, mur opposé, contacts simultanés et toucher pendant recul restent sûrs", () => {
  const walls = [
    floor,
    { id: "right", x: 100, y: -200, width: 24, height: 294 },
    { id: "top", x: -300, y: -45, width: 600, height: 24 },
  ];
  const m = new SpinMotion(80, 5),
    c = new CollisionMotion(m, walls);
  let flips = 0;
  for (let i = 0; i < 1500; i++) {
    if (i % 43 === 0) m.switchPivot();
    const before = m.direction;
    c.step(dt);
    if (before !== m.direction) flips++;
    free(m, walls);
  }
  assert.ok(flips < 200, "pas de boucle de rebond à chaque frame");
  c.reset();
  free(m, walls);
});
test("contact persistant ne réinverse pas à chaque pas", () => {
  const m = new SpinMotion(80, 5);
  const walls = [
    floor,
    { id: "ceiling", x: -300, y: -70, width: 600, height: 24 },
  ];
  const c = new CollisionMotion(m, walls);
  let changes = 0;
  for (let i = 0; i < 1000; i++) {
    const d = m.direction;
    c.step(dt);
    if (m.direction !== d) changes++;
    free(m, walls);
  }
  assert.ok(changes < 30);
});
test("deux murs superposés au même impact donnent une seule inversion", () => {
  const m = new SpinMotion(80, 5),
    walls = [floor, { ...floor, id: "duplicate-face" }],
    c = new CollisionMotion(m, walls);
  for (let i = 0; i < 100; i++) {
    const d = m.direction;
    c.step(dt);
    if (m.direction !== d) {
      assert.equal(m.direction, -1);
      free(m, walls);
      return;
    }
  }
  assert.fail("un seul rebond doit être détecté");
});
test("séparation puis nouveau contact réarme le rebond", () => {
  const m = new SpinMotion(80, 5),
    walls = [floor],
    c = new CollisionMotion(m, walls);
  let first = false;
  for (let i = 0; i < 200; i++) {
    const d = m.direction;
    c.step(dt);
    if (d !== m.direction) {
      first = true;
      break;
    }
  }
  assert.ok(first);
  m.resetAt({ x: 0, y: 0 }, 0);
  c.step(dt);
  let second = false;
  for (let i = 0; i < 200; i++) {
    const d = m.direction;
    c.step(dt);
    if (d !== m.direction) {
      second = true;
      break;
    }
  }
  assert.ok(second);
});
