import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { CloudTerrainStore } from '../../src/terrain/CloudTerrainStore';
import { migrateLegacyTerrain } from '../../src/shared/terrainMigration';
import { courses } from '../../src/modes/maze/courses';
import { randomUUID } from 'node:crypto';
test('real database isolates owners and rejects stale revisions', { skip: !process.env.TEST_SUPABASE_URL && 'Supabase local non démarré : droits réels non vérifiés' }, async () => {
  const url = process.env.TEST_SUPABASE_URL!, anon = process.env.TEST_SUPABASE_ANON_KEY!, key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;
  assert.ok(anon && key, 'Local test keys required');
  // Never create disposable users against an arbitrary production endpoint.
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
  const admin = createClient(url, key), ids: string[] = [];
  try {
    const clients = [];
    for (let i = 0; i < 2; i++) {
      const email = `spin-${randomUUID()}@example.test`, password = randomUUID();
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      assert.ifError(error); ids.push(data.user!.id);
      const c = createClient(url, anon); assert.ifError((await c.auth.signInWithPassword({ email, password })).error); clients.push(c);
    }
    const a = new CloudTerrainStore(clients[0]), b = new CloudTerrainStore(clients[1]);
    const original = migrateLegacyTerrain(courses[0]).terrain;
    original.id = randomUUID();
    const saved = await a.save(original, 0); assert.equal(saved.revision, 1);
    assert.equal((await a.list()).length, 1); assert.deepEqual(await b.list(), []);
    await assert.rejects(a.save(saved, 0), /changé/);
    const denied = await clients[1].from('terrains').update({ document: {} }).eq('owner_id', ids[0]); assert.ok(denied.error);
    const guest = createClient(url, anon); assert.ok((await guest.rpc('save_private_terrain', { document: original, expected_revision: 0 })).error);
  } finally { for (const id of ids) await admin.auth.admin.deleteUser(id); }
});
