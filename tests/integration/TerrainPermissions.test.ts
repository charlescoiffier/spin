import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { CloudTerrainStore } from '../../src/terrain/CloudTerrainStore';
import { migrateLegacyTerrain } from '../../src/shared/terrainMigration';
import { courses } from '../../src/modes/maze/courses';
import { randomUUID } from 'node:crypto';
import { Client } from '@colyseus/sdk';
import { SupabaseIdentityVerifier } from '../../server/auth/IdentityVerifier';
import { SupabaseTerrainRepository } from '../../server/persistence/TerrainRepository';
import { LobbyDirectory } from '../../server/race/LobbyDirectory';
import { createServer } from '../../server/createServer';
import type { LobbyView, RaceWelcome } from '../../src/shared/lobby';
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
    const repository = new SupabaseTerrainRepository({ url, key: anon });
    const ownerToken = (await clients[0].auth.getSession()).data.session!.access_token;
    const otherToken = (await clients[1].auth.getSession()).data.session!.access_token;
    assert.equal((await repository.getForOwner(ids[0], saved.id, 1, ownerToken)).id, saved.id);
    await assert.rejects(repository.getForOwner(ids[0], saved.id, 1, otherToken), /inaccessible/);
    assert.equal((await a.list()).length, 1); assert.deepEqual(await b.list(), []);
    await assert.rejects(a.save(saved, 0), /changé/);
    const denied = await clients[1].from('terrains').update({ document: {} }).eq('owner_id', ids[0]); assert.ok(denied.error);
    const bypass = await clients[0].from('terrain_revisions').insert({ owner_id: ids[0], terrain_id: original.id, revision: 99, document: saved });
    assert.ok(bypass.error, 'Even an owner cannot bypass the revision RPC');
    const attempts = await Promise.allSettled([
      a.save({ ...saved, title: 'Révision concurrente A' }, 1),
      a.save({ ...saved, title: 'Révision concurrente B' }, 1),
    ]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    const history = await clients[0].from('terrain_revisions').select('document').eq('terrain_id', original.id).eq('revision', 1).single();
    assert.ifError(history.error); assert.equal(history.data.document.title, saved.title);
    const guest = createClient(url, anon); assert.ok((await guest.rpc('save_private_terrain', { document: original, expected_revision: 0 })).error);
  } finally { for (const id of ids) await admin.auth.admin.deleteUser(id); }
});
test('an unverified email cannot create an authenticated account session', { skip: !process.env.TEST_SUPABASE_URL && 'Supabase local absent' }, async () => {
  const url = process.env.TEST_SUPABASE_URL!;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
  const anon = createClient(url, process.env.TEST_SUPABASE_ANON_KEY!);
  const admin = createClient(url, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await anon.auth.signUp({ email: `spin-verify-${randomUUID()}@example.test`, password: randomUUID() });
  try { assert.ifError(error); assert.ok(data.user); assert.equal(data.session === null, true, 'Email verification must precede a session'); }
  finally { if (data.user) await admin.auth.admin.deleteUser(data.user.id); }
});
test('real account creates a race on its private terrain and a guest receives the same result', { skip: !process.env.TEST_SUPABASE_URL && 'Supabase local absent' }, async () => {
  const url = process.env.TEST_SUPABASE_URL!, key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!, anonKey = process.env.TEST_SUPABASE_ANON_KEY!;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
  const admin = createClient(url, key), auth = createClient(url, anonKey);
  const email = `spin-race-${randomUUID()}@example.test`, password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error); const userId = created.data.user!.id;
  const identity = new SupabaseIdentityVerifier(createClient(url, anonKey));
  const { server, transport, start } = createServer({ identity, terrains: new SupabaseTerrainRepository({ url, key: anonKey }), directory: new LobbyDirectory() }, []);
  let host: Awaited<ReturnType<Client['create']>> | undefined, guest: typeof host;
  try {
    const login = await auth.auth.signInWithPassword({ email, password }); assert.ifError(login.error);
    const terrain = migrateLegacyTerrain(courses[0]).terrain;
    terrain.id = randomUUID(); terrain.goal = { mode: 'touch', rect: { x: 100, y: 150, width: 300, height: 300 } };
    const saved = await new CloudTerrainStore(auth).save(terrain, 0);
    await start(0, '127.0.0.1');
    const endpoint = `http://127.0.0.1:${(transport.server!.address() as { port: number }).port}`;
    host = await new Client(endpoint).create('race', { protocol: 1, token: login.data.session!.access_token,
      config: { terrainId: saved.id, revision: saved.revision, seats: 2, visibility: 'private', contactsEnabled: true, physics: { speed: 5, length: 80, recoilDistance: 8 } } });
    host.onMessage('view', () => {});
    const welcome = await new Promise<RaceWelcome>(resolve => host!.onMessage('welcome', resolve));
    assert.equal(welcome.terrain.id, saved.id);
    const invited = identity.createGuest('Invité de test');
    guest = await new Client(endpoint).joinById(host.roomId, { protocol: 1, token: invited.token, code: welcome.code });
    guest.onMessage('welcome', () => {}); guest.onMessage('view', () => {});
    const results = await Promise.all([host, guest].map(room => new Promise<LobbyView>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Résultat de partie absent')), 7000);
      room.onMessage('view', view => { if (view.status === 'finished') { clearTimeout(timer); resolve(view); } });
    })));
    assert.deepEqual(results[0].result, results[1].result);
    assert.equal(results[0].result!.winners.length, 2);
  } finally { await guest?.leave(); await host?.leave(); await server.gracefullyShutdown(false); await admin.auth.admin.deleteUser(userId); }
});
