import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJoinLink } from '../src/network/JoinLink';
test('private join uses a query compatible with Pages and rejects malformed codes', () => {
  assert.deepEqual(parseJoinLink('https://example.com/spin/?partie=abcdEFGH1234'), { code: 'abcdEFGH1234' });
  assert.equal(parseJoinLink('https://example.com/?partie=<script>'), null);
  assert.equal(parseJoinLink('bad'), null);
});
