import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { localSupabaseEnvironment } from '../scripts/localSupabaseEnv';
const status = 'API_URL="http://127.0.0.1:21000"\nANON_KEY="public-test-key"\nSERVICE_ROLE_KEY="secret-test-key"\n';
test('local configuration keeps secrets off public Vite variables and preserves unrelated values', () => {
  const result = parseEnv(localSupabaseEnvironment(status, '# keep this\nPORT=2667\nUNRELATED="some value"\n'));
  assert.equal(result.PORT, '2667');
  assert.equal(result.UNRELATED, 'some value');
  assert.equal(result.VITE_SUPABASE_ANON_KEY, 'public-test-key');
  assert.equal(result.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.ok(!Object.values(result).includes('secret-test-key'));
  assert.ok(!Object.entries(result).some(([key, value]) => key.startsWith('VITE_') && value === 'secret-test-key'));
});
test('local setup refuses remote endpoints, missing keys and overwriting hosted configuration', () => {
  assert.throws(() => localSupabaseEnvironment(status.replace('127.0.0.1', 'db.example.com'), ''), /local/);
  assert.throws(() => localSupabaseEnvironment('API_URL=http://localhost:2000', ''), /clé/);
  assert.throws(() => localSupabaseEnvironment(status, 'SUPABASE_URL=https://example.supabase.co'), /distante/);
});
