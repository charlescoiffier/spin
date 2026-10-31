import type { SupabaseClient } from '@supabase/supabase-js';
import { courses } from '../../src/modes/maze/courses';
import { migrateLegacyTerrain } from '../../src/shared/terrainMigration';
import { parseTerrain, type TerrainV2 } from '../../src/shared/terrain';
export interface TerrainRepository { getForOwner(ownerId: string, terrainId: string, revision: number): Promise<TerrainV2> }
export class SupabaseTerrainRepository implements TerrainRepository {
  constructor(private db: SupabaseClient | null) {}
  async getForOwner(ownerId: string, terrainId: string, revision: number): Promise<TerrainV2> {
    const base = courses.find(t => t.id === terrainId);
    if (base && revision === base.version) return migrateLegacyTerrain(base).terrain;
    if (!this.db) throw Error('Sauvegarde distante non configurée');
    const { data, error } = await this.db.from('terrain_revisions').select('document').eq('owner_id', ownerId).eq('terrain_id', terrainId).eq('revision', revision).single();
    if (error || !data) throw Error('Terrain inaccessible');
    return parseTerrain(data.document);
  }
}
