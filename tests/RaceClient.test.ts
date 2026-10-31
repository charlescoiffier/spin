import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceClient } from '../src/network/RaceClient';
test('leaving during connection closes the late room instead of occupying a ghost seat', async () => {
  let release!: (room: unknown) => void;
  let left = false;
  const pending = new Promise(resolve => { release = resolve; });
  const transport = { joinById: () => pending };
  const client = new RaceClient('http://127.0.0.1:1', transport as any);
  const connecting = client.connect({ roomId: 'test', token: 'not-a-real-token' });
  await client.disconnect();
  release({ leave: async () => { left = true; } });
  await assert.rejects(connecting, /annulée/);
  assert.equal(left, true);
  assert.equal(client.connected, false);
});
