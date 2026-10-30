import { test } from "node:test";
import assert from "node:assert/strict";
import { CourseStore } from "../src/editor/CourseStore.ts";
import { courses } from "../src/modes/maze/courses.ts";
test("sauvegarde versionnée : géométrie modifiée, couleur sans nouvelle version", () => {
  const s = new CourseStore(null);
  const first = s.save(courses[0]);
  assert.ok(first.id.startsWith("custom-"));
  assert.equal(s.list().length, 1);
  const color = s.save({
    ...first,
    theme: {
      background: "#112233",
      grid: "#112233",
      wallFill: "#112233",
      wallOutline: "#112233",
      exitFill: "#112233",
      exitOutline: "#112233",
      start: "#112233",
    },
  });
  assert.equal(color.version, 1);
  const changed = s.save({
    ...color,
    spawn: { a: { x: 180, y: 200 }, angle: 0 },
  });
  assert.equal(changed.version, 2);
  assert.equal(s.list().length, 1);
  assert.throws(() => s.importJson("{bad"));
  assert.throws(() =>
    s.importJson(JSON.stringify({ ...first, walls: [null] })),
  );
});
test("stockage corrompu, interdit et données trop grandes contrôlés", () => {
  const s = new CourseStore({
    getItem: () => "{bad",
    setItem: () => {
      throw Error("blocked");
    },
  });
  assert.deepEqual(s.list(), []);
  s.save(courses[0]);
  assert.equal(s.list().length, 1);
  assert.throws(() => s.importJson("x".repeat(1000001)));
});
