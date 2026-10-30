import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorDocument } from "../src/editor/EditorDocument.ts";
import { courses } from "../src/modes/maze/courses.ts";
test("dessin aimanté, déplacement, dimensions et annulation", () => {
  const d = new EditorDocument(courses[0]);
  const count = d.course.walls.length;
  d.addWall({ x: 601, y: 501 }, { x: 701, y: 541 });
  assert.equal(d.course.walls.length, count + 1);
  const w = d.course.walls.at(-1)!;
  assert.deepEqual([w.x, w.y, w.width, w.height], [600, 500, 100, 40]);
  d.moveSelected({ x: 40, y: 20 });
  assert.equal(d.course.walls.at(-1)!.x, 640);
  d.undo();
  assert.equal(d.course.walls.at(-1)!.x, 600);
  d.redo();
  assert.equal(d.course.walls.at(-1)!.x, 640);
  d.selectAt({ x: 660, y: 540 });
  d.deleteSelected();
  assert.equal(d.course.walls.length, count);
  d.undo();
  assert.equal(d.course.walls.length, count + 1);
});
test("couleurs et arrivée éditées, modèle source indépendant", () => {
  const d = new EditorDocument(courses[0]);
  d.setTheme("wallFill", "#ff0000");
  d.setFinishMode("pivot");
  assert.equal(d.course.theme!.wallFill, "#ff0000");
  assert.equal(d.course.finishMode, "pivot");
  assert.equal(courses[0].theme, undefined);
});

test("sauvegarder puis annuler conserve l’identité du parcours", () => {
  const d = new EditorDocument(courses[0]);
  d.setTitle("Mon tracé");
  d.markSaved({ ...d.course, id: "custom-test", version: 2 });
  d.undo();
  assert.equal(d.course.id, "custom-test");
  assert.equal(d.course.version, 2);
});
