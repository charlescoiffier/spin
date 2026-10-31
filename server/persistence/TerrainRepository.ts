import { createClient } from '@supabase/supabase-js';
import { courses } from '../../src/modes/maze/courses';
import { migrateLegacyTerrain } from '../../src/shared/terrainMigration';
import { parseTerrain, type TerrainV2 } from '../../src/shared/terrain';
export interface TerrainRepository { getForOwner(ownerId: string, terrainId: string, revision: number, accessToken: string): Promise<TerrainV2> }
export class SupabaseTerrainRepository implements TerrainRepository {
  constructor(private config: { url: string; key: string } | null) {}
  async getForOwner(ownerId: string, terrainId: string, revision: number, accessToken: string): Promise<TerrainV2> {
    const base = courses.find(t => t.id === terrainId);
    if (base && revision === base.version) return migrateLegacyTerrain(base).terrain;
    if (!this.config || !accessToken) throw Error('Terrain inaccessible ou sauvegarde non configurée');
    const db = createClient(this.config.url, this.config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data, error } = await db.from('terrain_revisions').select('document').eq('owner_id', ownerId).eq('terrain_id', terrainId).eq('revision', revision).single();
    if (error || !data) throw Error('Terrain inaccessible');
    return parseTerrain(data.document);
  }
}
