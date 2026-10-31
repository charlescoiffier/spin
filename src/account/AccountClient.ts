import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
export class AccountClient {
  readonly client: SupabaseClient | null;
  constructor(url?: string, key?: string) {
    this.client = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;
  }
  async requestSignIn(email: string): Promise<void> {
    if (!this.client) throw Error('Service de comptes non configuré');
    const redirect = new URL(window.location.href); redirect.search = ''; redirect.hash = '';
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect.href } });
    if (error) throw Error('Envoi impossible. Réessayez dans quelques instants.');
  }
  async restoreSession(): Promise<Session | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.getSession();
    if (error) throw Error('Connexion expirée. Reconnectez-vous.');
    return data.session;
  }
  async signOut(): Promise<void> { const result = await this.client?.auth.signOut(); if (result?.error) throw result.error; }
}
