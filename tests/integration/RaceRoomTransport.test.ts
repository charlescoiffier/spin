import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { createServer } from '../../server/createServer';
import { LobbyDirectory } from '../../server/race/LobbyDirectory';
import { migrateLegacyTerrain } from '../../src/shared/terrainMigration';
import { courses } from '../../src/modes/maze/courses';
import type { LobbyView, RaceWelcome } from '../../src/shared/lobby';
test('real transport refuses guests creating, hides private rooms and runs two clients', async () => {
  const directory = new LobbyDirectory();
  const { server, transport, start } = createServer({ directory,
    identity: { async verify(token) {
      if (!['account', 'guest', 'guest2', 'guest3'].includes(token)) throw Error('bad token');
      return { id: token, kind: token === 'account' ? 'account' : 'guest', displayName: token };
    } }, terrains: { async getForOwner(_owner, id) {
      const terrain = migrateLegacyTerrain(courses[0]).terrain;
      if (id === 'quick') { terrain.id = 'quick'; terrain.goal = { mode: 'touch', rect: { x: 100, y: 150, width: 300, height: 300 } }; }
      return terrain;
    } },
  }, []);
  await start(0, '127.0.0.1');
  const address = transport.server!.address() as { port: number };
  const endpoint = `http://127.0.0.1:${address.port}`;
  const client = new Client(endpoint);
  const forbidden = await fetch(`${endpoint}/matchmake/create/race`, { method: 'POST', headers: { Origin: 'https://unapproved.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(forbidden.status, 403);
  const config = { seats: 2, visibility: 'private', terrainId: 'initiation', revision: 1, contactsEnabled: true, physics: { length: 80, speed: 5, recoilDistance: 8 } };
  let a: Awaited<ReturnType<typeof client.create>> | undefined, b: typeof a;
  const extra: NonNullable<typeof a>[] = [];
  try {
    await assert.rejects(client.create('race', { protocol: 1, token: 'guest', config }));
    a = await client.create('race', { protocol: 1, token: 'account', config });
    a.onMessage('view', () => {});
    const welcome = await new Promise<RaceWelcome>(resolve => a!.onMessage('welcome', resolve));
    assert.deepEqual(await (await fetch(`${endpoint}/api/lobbies`)).json(), []);
    await assert.rejects(client.joinById(a.roomId, { token: 'guest', protocol: 1, code: 'wrong' }));
    b = await new Client(endpoint).joinById(a.roomId, { token: 'guest', protocol: 1, code: welcome.code });
    b.onMessage('welcome', () => {});
    const view = await new Promise<LobbyView>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No running state')), 7000);
      b!.onMessage('view', view => { if ((view as LobbyView).status === 'running') { clearTimeout(timeout); resolve(view); } });
    });
    assert.equal(view.members.length, 2);
    assert.equal(view.snapshot.players.length, 2);
    b.send('spin', { seq: 1, requestedTick: view.snapshot.tick + 1 });
    const after = await new Promise<LobbyView>(resolve => b!.onMessage('view', v => { if (v.snapshot.players.some((p: { id: string; ack: number }) => p.id === 'guest' && p.ack === 1)) resolve(v); }));
    assert.equal(after.snapshot.players.find(p => p.id === 'guest')!.motion.pivot, 'B');
    const reconnected = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No reconnect')), 8000);
      b!.onReconnect(() => { clearTimeout(timeout); resolve(); });
    });
    b.reconnection.minUptime = 0;
    b.connection.close(4010);
    await reconnected;
    const c = await client.create('race', { protocol: 1, token: 'account', config: { ...config, seats: 4, visibility: 'public', terrainId: 'quick' } });
    extra.push(c); c.onMessage('welcome', () => {}); c.onMessage('view', () => {});
    for (const token of ['guest', 'guest2', 'guest3']) {
      const joined = await new Client(endpoint).joinById(c.roomId, { token, protocol: 1 });
      joined.onMessage('welcome', () => {}); joined.onMessage('view', () => {}); extra.push(joined);
    }
    const results = await Promise.all(extra.map(room => new Promise<LobbyView>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No four-player result')), 7000);
      room.onMessage('view', v => { if (v.status === 'finished') { clearTimeout(timeout); resolve(v); } });
    })));
    assert.equal(results[0].result!.winners.length, 4);
    for (const v of results) assert.deepEqual(v.result, results[0].result);
  } finally { for (const room of extra) await room.leave(); await b?.leave(); await a?.leave(); await server.gracefullyShutdown(false); }
});
