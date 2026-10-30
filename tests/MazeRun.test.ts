import { test } from "node:test";
import assert from "node:assert/strict";
import { MazeRun } from "../src/modes/maze/MazeRun.ts";
import { courses } from "../src/modes/maze/courses.ts";
import { RecordStore } from "../src/modes/maze/RecordStore.ts";
test("premier geste démarre et échange le pivot, restart rétablit tout", () => {
  const run = new MazeRun(courses[0], new RecordStore(null));
  run.reset(0);
  const before = run.motion.snapshot();
  run.update(100);
  assert.deepEqual(run.motion.snapshot(), before);
  run.press(100);
  run.update(110);
  assert.equal(run.session.status, "running");
  assert.equal(run.motion.pivot, "B");
  run.reset(120);
  assert.equal(run.session.status, "ready");
  assert.deepEqual(run.motion.snapshot(), before);
});
test("arrivée partielle refusée, complète termine une seule fois avec record", () => {
  const store = new RecordStore(null),
    run = new MazeRun(courses[0], store);
  run.reset(0);
  run.press(0);
  run.update(10);
  const e = courses[0].exit;
  run.motion.resetAt({ x: e.x + 10, y: e.y + 80 }, 0);
  run.update(20);
  assert.equal(run.session.status, "running");
  run.motion.resetAt({ x: e.x + 50, y: e.y + 80 }, 0);
  run.update(30);
  assert.equal(run.session.status, "finished");
  const result = run.session.elapsedMs(30);
  assert.ok(result > 0);
  assert.equal(store.get(courses[0]), result);
  const state = run.motion.snapshot();
  run.press(40);
  run.update(100);
  assert.deepEqual(run.motion.snapshot(), state);
});
test("arrière-plan, longue frame, ready et reprise ne faussent pas les temps", () => {
  const r = new MazeRun(courses[0], new RecordStore(null));
  r.reset(0);
  r.interrupt(10);
  assert.equal(r.session.status, "ready");
  r.press(20);
  r.update(30);
  r.interrupt(40);
  r.press(50);
  r.update(60);
  assert.equal(r.session.status, "interrupted");
  r.reset(100);
  r.press(100);
  r.update(351);
  assert.equal(r.session.status, "interrupted");
  r.update(999);
  assert.equal(r.session.status, "interrupted");
});

test("un parcours utilise les réglages du laboratoire et ne soumet pas de record", () => {
  const maze = {
      ...courses[0],
      exit: { x: 80, y: 100, width: 300, height: 300 },
    },
    records = new RecordStore(null);
  const run = new MazeRun(maze, records, true, {
    speed: 3,
    length: 100,
    recoilDistance: 60,
    zoom: 1.3,
    smoothing: 0.6,
    trail: false,
  });
  run.reset(0);
  assert.equal(run.motion.length, 100);
  assert.equal(run.motion.angularSpeed, 3);
  run.press(0);
  run.update(20);
  assert.equal(run.session.status, "finished");
  assert.equal(records.get(maze), null);
});
test("un réglage de barre qui chevauche un mur au départ est refusé", () => {
  assert.throws(
    () =>
      new MazeRun(courses[0], new RecordStore(null), false, {
        speed: 5,
        length: 280,
        recoilDistance: 8,
        zoom: 0.7,
        smoothing: 0.3,
        trail: true,
      }),
    /départ/i,
  );
});

test("le recul enregistré est réellement utilisé par les collisions du parcours", () => {
  const maze = {
    ...courses[0],
    spawn: { a: { x: 0, y: 0 }, angle: 0 },
    walls: [{ id: "floor", x: -300, y: 70, width: 600, height: 24 }],
    exit: { x: 1000, y: 1000, width: 200, height: 200 },
  };
  const run = new MazeRun(maze, new RecordStore(null), false, {
    speed: 5,
    length: 80,
    recoilDistance: 60,
    zoom: 0.7,
    smoothing: 0.3,
    trail: true,
  });
  run.reset(0);
  run.press(0);
  run.update(1000 / 240);
  const pivot = { ...run.motion.pivotPosition };
  let tick = 2;
  for (; tick < 240 && run.motion.direction === -1; tick++)
    run.update((tick * 1000) / 240);
  assert.equal(run.motion.direction, 1);
  run.motion.angularSpeed = 0;
  for (let i = 0; i < 25; i++) run.update(((tick + i) * 1000) / 240);
  assert.ok(
    Math.abs(
      Math.hypot(
        run.motion.pivotPosition.x - pivot.x,
        run.motion.pivotPosition.y - pivot.y,
      ) - 60,
    ) < 1e-6,
  );
});
