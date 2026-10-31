import { randomBytes, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
export interface VerifiedIdentity { id: string; kind: 'account' | 'guest'; displayName: string }
export interface IdentityVerifier { verify(token: string): Promise<VerifiedIdentity> }
export class SupabaseIdentityVerifier implements IdentityVerifier {
  private guests = new Map<string, { identity: VerifiedIdentity; expires: number }>();
  constructor(private auth: SupabaseClient | null) {}
  createGuest(name: string): { token: string; identity: VerifiedIdentity } {
    const now = Date.now();
    for (const [key, guest] of this.guests) if (guest.expires <= now) this.guests.delete(key);
    if (this.guests.size >= 1000) throw Error('Trop de visiteurs, réessayez plus tard');
    const token = randomBytes(32).toString('base64url');
    const identity: VerifiedIdentity = { id: randomUUID(), kind: 'guest', displayName: name.trim().slice(0, 24) || 'Invité' };
    this.guests.set(token, { identity, expires: now + 12 * 3600_000 });
    return { token, identity };
  }
  async verify(token: string): Promise<VerifiedIdentity> {
    if (typeof token !== 'string' || token.length > 8192) throw Error('Connexion requise');
    const guest = this.guests.get(token);
    if (guest && guest.expires > Date.now()) return { ...guest.identity };
    if (!this.auth) throw Error('Service de comptes non configuré');
    const { data, error } = await this.auth.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) throw Error('Connexion requise');
    return { id: data.user.id, kind: 'account', displayName: String(data.user.user_metadata?.display_name ?? 'Joueur').slice(0, 24) };
  }
}
