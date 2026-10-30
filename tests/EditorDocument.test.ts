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

test("un clic sans déplacement ne réaligne ni le mur ni le départ", () => {
  const d = new EditorDocument(courses[0]);
  const before = structuredClone(d.course);
  d.selectAt({ x: 460, y: 200 });
  d.moveSelected({ x: 0, y: 0 });
  assert.deepEqual(d.course, before);
  assert.equal(d.canUndo, false);
  d.selectAt({ x: 170, y: 200 });
  d.moveSelected({ x: 0, y: 0 });
  assert.deepEqual(d.course, before);
});

test("les murs importés nommés spawn et exit restent des murs indépendants", () => {
  for (const id of ["spawn", "exit"]) {
    const d = new EditorDocument({
      ...courses[0],
      walls: [
        ...courses[0].walls,
        { id, x: 600, y: 500, width: 80, height: 80 },
      ],
    });
    const goal = structuredClone(d.course.exit),
      spawn = structuredClone(d.course.spawn);
    d.selectAt({ x: 620, y: 520 });
    assert.equal(d.selectedRect()!.x, 600);
    d.moveSelected({ x: 20, y: 0 });
    assert.equal(d.course.walls.at(-1)!.x, 620);
    d.resizeSelected(100, 80);
    assert.equal(d.course.walls.at(-1)!.width, 100);
    d.deleteSelected();
    assert.equal(d.course.walls.length, courses[0].walls.length);
    assert.deepEqual(d.course.exit, goal);
    assert.deepEqual(d.course.spawn, spawn);
  }
});
