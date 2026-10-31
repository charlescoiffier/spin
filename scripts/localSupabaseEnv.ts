import { parseEnv } from 'node:util';
const isLocal = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); }
  catch { return false; }
};
/** Generate dotenv without shell evaluation, never copying a service key into VITE_. */
export function localSupabaseEnvironment(status: string, existing: string): string {
  const values = parseEnv(status), previous = parseEnv(existing);
  const api = values.API_URL, anon = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const secret = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!api || !isLocal(api)) throw Error('Supabase doit utiliser une URL HTTP locale');
  if (!anon || !secret) throw Error('Une clé locale Supabase est manquante');
  for (const name of ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'VITE_RACE_SERVER_URL']) {
    if (previous[name] && !isLocal(previous[name])) throw Error('Configuration distante existante : aucun remplacement automatique');
  }
  const updates: Record<string, string> = {
    VITE_SUPABASE_URL: api, VITE_SUPABASE_ANON_KEY: anon,
    SUPABASE_URL: api, SUPABASE_ANON_KEY: anon,
    VITE_RACE_SERVER_URL: previous.VITE_RACE_SERVER_URL || 'http://localhost:2567',
    ALLOWED_ORIGINS: previous.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174',
  };
  const untouched = existing.split('\n').filter(line => {
    const name = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line)?.[1];
    return !name || (!(name in updates) && name !== 'SUPABASE_SERVICE_ROLE_KEY');
  }).join('\n').trimEnd();
  return `${untouched}${untouched ? '\n' : ''}${Object.entries(updates).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n')}\n`;
}
