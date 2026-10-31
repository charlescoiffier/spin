import type { SupabaseClient } from '@supabase/supabase-js';
import { parseTerrain, type TerrainV2 } from '../shared/terrain';
export class CloudTerrainStore {
  constructor(private db: SupabaseClient | null) {}
  async list(): Promise<TerrainV2[]> {
    if (!this.db) return [];
    const { data, error } = await this.db.from('terrains').select('document').order('updated_at', { ascending: false });
    if (error) throw Error('Lecture des terrains impossible. Reconnectez-vous.');
    return (data ?? []).map(row => parseTerrain(row.document));
  }
  async save(terrain: TerrainV2, expectedRevision: number): Promise<TerrainV2> {
    const document = parseTerrain(terrain);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw Error('Révision invalide');
    if (!this.db) throw Error('Service de sauvegarde non configuré');
    const { data, error } = await this.db.rpc('save_private_terrain', { document, expected_revision: expectedRevision });
    if (error) throw Error(error.message.includes('revision_conflict') ? 'Ce terrain a changé. Rechargez-le avant de sauvegarder.' : 'Sauvegarde refusée. Votre copie locale est conservée.');
    return parseTerrain(data);
  }
}
