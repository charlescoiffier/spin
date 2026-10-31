import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { localSupabaseEnvironment } from './localSupabaseEnv';
const root = resolve(import.meta.dirname, '..');
const home = resolve(root, '.supabase-local');
mkdirSync(home, { recursive: true, mode: 0o700 }); chmodSync(home, 0o700);
const env = { ...process.env, SUPABASE_HOME: home };
const cli = resolve(root, 'node_modules/.bin/supabase');
const action = process.argv[2] ?? 'status';
function run(args: string[]): string {
  try { return execFileSync(cli, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    writeFileSync(resolve(home, 'last-error.log'), `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`, { mode: 0o600 });
    throw Error('Commande Supabase impossible. Journal local privé : .supabase-local/last-error.log');
  }
}
try {
  if (action === 'start') {
    console.log('Démarrage de Supabase local (premier téléchargement parfois long)…');
    run(['start', '--runtime', 'native', '--exclude', 'realtime,storage,functions,analytics,pooler', '--eager']);
  } else if (action === 'stop') { run(['stop']); console.log('Supabase local arrêté ; données conservées.'); process.exit(0); }
  else if (!['status', 'configure', 'test'].includes(action)) throw Error('Action inconnue');
  const raw = run(['status', '--env', '--output-format', 'text']);
  const settings = parseEnv(raw);
  // Validate before using any returned credentials, including in tests.
  localSupabaseEnvironment(raw, '');
  if (action === 'start' || action === 'configure') {
    const file = resolve(root, '.env'), previous = existsSync(file) ? readFileSync(file, 'utf8') : '';
    writeFileSync(file, localSupabaseEnvironment(raw, previous), { mode: 0o600 }); chmodSync(file, 0o600);
    console.log('.env local configuré (clés masquées). Redémarrez Vite et le serveur de jeu.');
  }
  if (action === 'test') {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'tests/integration/TerrainPermissions.test.ts'], {
      cwd: root, stdio: 'inherit', env: { ...env, TEST_SUPABASE_URL: settings.API_URL,
        TEST_SUPABASE_ANON_KEY: settings.ANON_KEY ?? settings.PUBLISHABLE_KEY,
        TEST_SUPABASE_SERVICE_ROLE_KEY: settings.SERVICE_ROLE_KEY ?? settings.SECRET_KEY },
    });
    process.exitCode = result.status ?? 1;
  } else {
    console.log(`API locale : ${settings.API_URL}`);
    if (settings.MAILPIT_URL) console.log(`Emails de test : ${settings.MAILPIT_URL}`);
    if (settings.STUDIO_URL) console.log(`Administration locale : ${settings.STUDIO_URL}`);
  }
} catch (error) { console.error(error instanceof Error ? error.message : 'Erreur de configuration locale'); process.exitCode = 1; }
