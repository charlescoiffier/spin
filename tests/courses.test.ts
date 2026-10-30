import { test } from "node:test";
import assert from "node:assert/strict";
import { courses } from "../src/modes/maze/courses.ts";
import { validateMaze } from "../src/modes/maze/MazeDefinition.ts";
test("trois parcours uniques et valides, spawn libre et sortie accessible géométriquement", () => {
  assert.equal(courses.length, 3);
  assert.equal(new Set(courses.map((c) => c.id)).size, 3);
  for (const c of courses) assert.deepEqual(validateMaze(c), [], c.id);
});
test("dimensions invalides et spawn dans mur refusés", () => {
  assert.ok(
    validateMaze({
      ...courses[0],
      exit: { x: 0, y: 0, width: NaN, height: -1 },
    }).length,
  );
  assert.ok(
    validateMaze({ ...courses[0], spawn: { a: { x: 0, y: 0 }, angle: 0 } })
      .length,
  );
  assert.ok(
    validateMaze({
      ...courses[0],
      walls: [{ id: "bad", x: 0, y: 0, width: 2, height: 2 }],
    }).length,
  );
});
