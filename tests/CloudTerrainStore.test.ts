import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudTerrainStore } from '../src/terrain/CloudTerrainStore';
import { migrateLegacyTerrain } from '../src/shared/terrainMigration';
import { courses } from '../src/modes/maze/courses';
test('private save validates data and never mutates source after remote failure', async () => {
  const store = new CloudTerrainStore(null);
  const t = migrateLegacyTerrain(courses[0]).terrain, before = JSON.stringify(t);
  await assert.rejects(store.save(t, 0), /configuré/);
  assert.equal(JSON.stringify(t), before);
  await assert.rejects(store.save({ ...t, title: '' }, 0), /invalide/);
});
