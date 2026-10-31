import { createClient } from '@supabase/supabase-js';
import { createServer } from './createServer';
import { SupabaseIdentityVerifier } from './auth/IdentityVerifier';
import { SupabaseTerrainRepository } from './persistence/TerrainRepository';
import { LobbyDirectory } from './race/LobbyDirectory';
const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const auth = url && anon ? createClient(url, anon, options) : null;
const identity = new SupabaseIdentityVerifier(auth);
const { server, start } = createServer({ identity, terrains: new SupabaseTerrainRepository(url && anon ? { url, key: anon } : null), directory: new LobbyDirectory() },
  (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(','), identity);
const port = Number(process.env.PORT ?? 2567);
await start(port);
console.log(`SPIN server: port ${port}; accounts ${auth ? 'configured' : 'not configured'}`);
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => { await server.gracefullyShutdown(false); process.exit(0); });
