import { Room, type Client } from '@colyseus/core';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { RaceSessionController } from './RaceSessionController';
import type { IdentityVerifier, VerifiedIdentity } from '../auth/IdentityVerifier';
import type { TerrainRepository } from '../persistence/TerrainRepository';
import { LobbyDirectory } from './LobbyDirectory';
import { parseRacePhysics } from '../../src/shared/raceSettings';
import { protocolVersion } from '../../src/shared/raceProtocol';
import type { LobbyConfig } from '../../src/shared/lobby';
export interface RoomServices { identity: IdentityVerifier; terrains: TerrainRepository; directory: LobbyDirectory }
export function createRaceRoom(services: RoomServices) {
  const counts = new Map<string, number>();
  let total = 0;
  return class RaceRoom extends Room {
    maxMessagesPerSecond = 40;
    private session!: RaceSessionController;
    private creatorId = '';
    private quotaOwnerId = '';
    private code = '';
    private names = new Map<string, VerifiedIdentity>();
    private counted = false;
    private closing = false;
    async onCreate(options: { token: string; protocol: number; config: LobbyConfig }) {
      if (options.protocol !== protocolVersion) throw Error('Version du jeu incompatible');
      const identity = await services.identity.verify(options.token);
      if (identity.kind !== 'account') throw Error('Un compte est nécessaire pour créer une partie');
      const c = options.config;
      if (!c || typeof c.terrainId !== 'string' || !Number.isSafeInteger(c.revision)) throw Error('Terrain invalide');
      const terrain = await services.terrains.getForOwner(identity.id, c.terrainId, c.revision);
      this.session = new RaceSessionController(terrain, { seats: c.seats, visibility: c.visibility, contactsEnabled: c.contactsEnabled, physics: parseRacePhysics(c.physics) });
      this.creatorId = identity.id; this.quotaOwnerId = identity.id;
      if ((counts.get(identity.id) ?? 0) >= 3 || total >= 64) throw Error('Limite de parties atteinte');
      counts.set(identity.id, (counts.get(identity.id) ?? 0) + 1); total++; this.counted = true;
      this.maxClients = c.seats;
      this.code = randomBytes(9).toString('base64url');
      await this.setPrivate(true); // Own filtered directory; never leak private room metadata through default listings.
      this.onMessage('spin', (client, command) => {
        try { this.session.spin(this.names.get(client.sessionId)!.id, command); } catch { client.send('notice', 'Commande refusée'); }
      });
      this.setSimulationInterval(() => this.session.advance(performance.now()), 1000 / 60);
      this.clock.setInterval(() => { this.updateDirectory(); this.broadcast('view', this.session.view(performance.now())); }, 50);
      this.updateDirectory();
    }
    async onAuth(_client: Client, options: { token: string; code?: string; protocol: number; name?: string }) {
      if (options.protocol !== protocolVersion) throw Error('Version du jeu incompatible');
      const identity = await services.identity.verify(options.token);
      if (this.session.rules.visibility === 'private' && identity.id !== this.creatorId && options.code !== this.code) throw Error('Code privé requis');
      if (this.session.view(performance.now()).members.some(m => m.id === identity.id)) throw Error('Ce joueur est déjà présent');
      return { ...identity, displayName: typeof options.name === 'string' ? options.name.trim().slice(0, 24) || identity.displayName : identity.displayName };
    }
    onJoin(client: Client, _options: unknown, identity: VerifiedIdentity) {
      this.session.join(identity.id, identity.displayName, performance.now());
      this.names.set(client.sessionId, identity);
      this.welcome(client, identity.id); this.updateDirectory();
    }
    private welcome(client: Client, playerId: string) {
      client.send('welcome', { protocol: protocolVersion, playerId, terrain: this.session.terrain, rules: this.session.rules, code: this.code });
      client.send('view', this.session.view(performance.now()));
    }
    async onDrop(client: Client) {
      const identity = this.names.get(client.sessionId); if (!identity) return;
      this.session.drop(identity.id, performance.now()); this.updateDirectory();
      try { await this.allowReconnection(client, 30); }
      catch { /* Colyseus invokes onLeave next; retain identity for ownership transfer/closure. */ }
    }
    onReconnect(client: Client) {
      const identity = this.names.get(client.sessionId)!;
      try { this.session.reconnect(identity.id, performance.now()); this.welcome(client, identity.id); }
      catch { client.send('notice', 'Retour impossible : départ occupé ou délai dépassé'); void client.leave(); }
      this.updateDirectory();
    }
    onLeave(client: Client) {
      const identity = this.names.get(client.sessionId);
      if (identity) this.session.leave(identity.id, performance.now());
      this.names.delete(client.sessionId);
      const status = this.session?.view(performance.now()).status;
      if (!this.closing && identity?.id === this.creatorId && (status === 'waiting' || status === 'countdown')) {
        const successor = [...this.names.values()].find(p => p.kind === 'account');
        if (successor) this.creatorId = successor.id;
        else { this.closing = true; this.broadcast('notice', 'Le créateur a quitté le salon.'); void this.disconnect(); }
      }
      this.updateDirectory();
    }
    onDispose() {
      services.directory.remove(this.roomId);
      if (this.counted) { counts.set(this.quotaOwnerId, Math.max(0, (counts.get(this.quotaOwnerId) ?? 1) - 1)); total--; }
    }
    private updateDirectory() {
      if (!this.session) return;
      const v = this.session.view(performance.now());
      services.directory.set(this.roomId, this.code, this.session.rules.visibility, {
        title: this.session.terrain.title, seats: this.session.rules.seats,
        present: v.members.filter(m => m.connected).length, contactsEnabled: this.session.rules.contactsEnabled,
      }, v.status === 'waiting' && v.members.length < this.session.rules.seats);
    }
  };
}
