import { Client, type Room } from '@colyseus/sdk';
import { protocolVersion } from '../shared/raceProtocol';
import type { LobbyConfig, LobbyView, RaceWelcome } from '../shared/lobby';
import { PredictionBuffer } from './PredictionBuffer';
export class RaceClient {
  private sdk: Client;
  private room: Room | null = null;
  welcome: RaceWelcome | null = null;
  view: LobbyView | null = null;
  prediction: PredictionBuffer | null = null;
  connected = false;
  private seq = 0;
  private previousView: LobbyView | null = null;
  private previousAt = 0;
  private receivedAt = 0;
  private storedAt = 0;
  onChange: () => void = () => {};
  onNotice: (text: string) => void = () => {};
  constructor(readonly endpoint: string) { this.sdk = new Client(endpoint); }
  async connect(join: { roomId?: string; code?: string; token: string; config?: LobbyConfig; name?: string }): Promise<void> {
    if (!this.endpoint) throw Error('Service de jeu non configuré');
    const options = { name: join.name, protocol: protocolVersion, token: join.token, code: join.code, config: join.config };
    this.room = join.config ? await this.sdk.create('race', options) : await this.sdk.joinById(join.roomId!, options);
    this.attach();
  }
  private attach(): void {
    if (!this.room) return;
    this.room.reconnection.minUptime = 0;
    this.connected = true;
    this.room.onMessage<RaceWelcome>('welcome', w => {
      if (w.protocol !== protocolVersion) { this.onNotice('Version incompatible. Rechargez le jeu.'); return; }
      this.welcome = w; this.prediction = new PredictionBuffer(w.terrain, w.rules.physics, w.rules.contactsEnabled, w.playerId); this.seq = 0;
      this.onChange();
    });
    this.room.onMessage<LobbyView>('view', v => {
      const now = performance.now(); this.previousView = this.view; this.previousAt = this.receivedAt;
      this.view = v; this.receivedAt = now;
      if (v.status === 'running') this.prediction?.reconcile(v.snapshot);
      this.seq = Math.max(this.seq, v.snapshot.players.find(p => p.id === this.welcome?.playerId)?.lastReceived ?? 0);
      if (Date.now() - this.storedAt > 1000) {
        this.storedAt = Date.now();
        try { sessionStorage.setItem('spin:rejoin', JSON.stringify({ endpoint: this.endpoint, token: this.room?.reconnectionToken, at: this.storedAt })); } catch { /* optional on reload */ }
      }
      this.onChange();
    });
    this.room.onMessage<string>('notice', text => this.onNotice(text));
    this.room.onDrop(() => { this.connected = false; this.onNotice('Connexion interrompue. Retour en cours…'); this.onChange(); });
    this.room.onReconnect(() => { this.connected = true; this.onChange(); });
    this.room.onLeave(() => { this.connected = false; this.onNotice('Vous avez quitté la partie.'); this.onChange(); });
    this.room.onError((_code, message) => this.onNotice(message ?? 'Connexion impossible'));
  }
  async resume(): Promise<boolean> {
    try {
      const saved = JSON.parse(sessionStorage.getItem('spin:rejoin') ?? 'null');
      if (!saved || saved.endpoint !== this.endpoint || Date.now() - saved.at > 30000) return false;
      this.room = await this.sdk.reconnect(saved.token); this.attach(); return true;
    } catch { return false; }
  }
  spin(): void {
    if (!this.connected || !this.room || this.view?.status !== 'running' || !this.prediction?.getLocalPose()) return;
    const command = { seq: ++this.seq, requestedTick: this.prediction.tick + 1 };
    this.prediction.record(command); this.room.send('spin', command);
  }
  poses() {
    const current = this.view?.snapshot.players ?? [];
    const ratio = this.receivedAt <= this.previousAt ? 1 : Math.max(0, Math.min(1, (performance.now() - 100 - this.previousAt) / (this.receivedAt - this.previousAt)));
    return current.map(p => {
      const local = p.id === this.welcome?.playerId && this.view?.status === 'running' && this.connected ? this.prediction?.getLocalPose() : null;
      if (local) return { id: p.id, motion: local };
      const old = this.previousView?.snapshot.players.find(q => q.id === p.id)?.motion;
      if (!old) return { id: p.id, motion: p.motion };
      const lerp = (a: number, b: number) => a + (b - a) * ratio;
      const a = { x: lerp(old.a.x, p.motion.a.x), y: lerp(old.a.y, p.motion.a.y) };
      // Interpolate angle, then reconstruct the other endpoint to preserve rigid length.
      const oldAngle = Math.atan2(old.b.y - old.a.y, old.b.x - old.a.x), angle = Math.atan2(p.motion.b.y - p.motion.a.y, p.motion.b.x - p.motion.a.x);
      const delta = Math.atan2(Math.sin(angle - oldAngle), Math.cos(angle - oldAngle)), interpolated = oldAngle + delta * ratio;
      return { id: p.id, motion: { ...p.motion, a, b: { x: a.x + Math.cos(interpolated) * p.motion.length, y: a.y + Math.sin(interpolated) * p.motion.length } } };
    });
  }
  async disconnect(): Promise<void> { const room = this.room; this.room = null; this.connected = false; try { sessionStorage.removeItem('spin:rejoin'); } catch { /* optional */ } await room?.leave(); }
}
