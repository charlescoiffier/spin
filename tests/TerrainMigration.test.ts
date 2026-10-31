import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';
import { parseTerrain } from '../src/shared/terrain';
import { courses } from '../src/modes/maze/courses';
import { EditorDocument } from '../src/editor/EditorDocument';

test('preservesLegacySource and requiresConfirmationForPivotGoal', () => {
  const source = { ...structuredClone(courses[0]), finishMode: 'pivot' };
  const original = JSON.stringify(source);
  const result = migrateLegacyTerrain(source);
  assert.equal(JSON.stringify(source), original);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.terrain.goal.mode, 'touch');
  assert.ok(result.warnings.length);
});
test('rejectsNonFiniteGeometry and duplicate or colliding starts', () => {
  const { terrain } = migrateLegacyTerrain(courses[0]);
  assert.equal(parseTerrain(terrain).schemaVersion, 2);
  assert.throws(() => parseTerrain({ ...terrain, bounds: { ...terrain.bounds, width: Infinity } }));
  assert.throws(() => parseTerrain({ ...terrain, raceSpawns: [terrain.raceSpawns[0], terrain.raceSpawns[0]] }));
  assert.throws(() => parseTerrain({ ...terrain, raceSpawns: [{ a: { x: 10, y: 10 }, angle: 0 }] }));
});
test('all base terrains provide four safe starts and isolated copies', () => {
  for (const course of courses) {
    const { terrain } = migrateLegacyTerrain(course);
    assert.equal(terrain.raceSpawns.length, 4);
    const parsed = parseTerrain(terrain);
    parsed.raceSpawns[0].a.x++;
    assert.notEqual(parsed.raceSpawns[0].a.x, terrain.raceSpawns[0].a.x);
  }
});
test('editor moves the selected multiplayer start and undo restores it', () => {
  const doc = new EditorDocument(courses[0]);
  doc.setRaceSpawnCount(2);
  doc.activeSpawnIndex = 1;
  doc.placeSpawn({ x: 170, y: 300 });
  assert.equal(doc.course.raceSpawns![1].a.y, 300);
  assert.equal(doc.course.spawn.a.y, 200);
  doc.undo();
  assert.notEqual(doc.course.raceSpawns![1].a.y, 300);
  doc.undo();
  assert.equal(doc.activeSpawnIndex, 0);
});
