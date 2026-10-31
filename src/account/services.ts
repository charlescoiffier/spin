import { AccountClient } from './AccountClient';
import { CloudTerrainStore } from '../terrain/CloudTerrainStore';
export const account = new AccountClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
export const cloudTerrains = new CloudTerrainStore(account.client);
export const raceEndpoint = import.meta.env.VITE_RACE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:2567' : '');
