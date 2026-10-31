import { account, cloudTerrains, raceEndpoint } from '../account/services';
import { getCourseStore, getLabSettingsStore } from '../modes/maze/services';
import { courses } from '../modes/maze/courses';
import { migrateLegacyTerrain, terrainToLegacy } from '../shared/terrainMigration';
import { defaults } from '../core/settings';
import { physicsFromSettings } from '../shared/raceSettings';
import { createId } from '../core/createId';
import { RaceClient } from '../network/RaceClient';
import { makeJoinLink } from '../network/JoinLink';
import type { TerrainV2 } from '../shared/terrain';
import type { LobbyConfig } from '../shared/lobby';
import type { MazeDefinition } from '../modes/maze/MazeDefinition';
export class LobbyPanel {
  private controller = new AbortController();
  private timer: ReturnType<typeof setInterval>;
  private token = '';
  private isAccount = false;
  private personal: TerrainV2[] = [];
  private pendingConversion = '';
  private pending = false;
  constructor(private root: HTMLElement, readonly network: RaceClient, callbacks: { back(): void; edit(course?: MazeDefinition, cloud?: { id: string; revision: number }): void }, invite?: string) {
    root.innerHTML = `<h1>Course en ligne</h1><p class="online-notice" role="status"></p>
      <section class="online-menu"><details open><summary>Mon compte</summary><p class="account-state"></p><p class="auth-preview note" hidden>Pendant ces essais, la connexion par email est réservée aux testeurs autorisés. Les autres joueurs peuvent rejoindre comme invités.</p>
      <form class="login-form"><label>Email<input type="email" name="email" autocomplete="email" required></label><button>Recevoir un lien de connexion</button></form><button class="logout" hidden>Se déconnecter</button></details>
      <label>Votre pseudo<input class="nickname" type="text" maxlength="24" autocomplete="nickname" value="Invité"></label>
      <h2>Rejoindre une partie</h2><form class="join-form"><label>Code de la partie<input class="invite-code" maxlength="12" type="text" autocapitalize="off" spellcheck="false"></label><button>Rejoindre par code</button></form>
      <div class="public-lobbies"></div><button class="refresh-lobbies">Actualiser la liste</button>
      <details class="create-options"><summary>Créer une partie</summary><p class="account-required">Connectez-vous pour créer et sauvegarder.</p>
      <form class="create-form"><label>Terrain<select class="online-terrain"></select></label><label>Places<select class="seats"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
      <label>Accès<select class="visibility"><option value="public">Public</option><option value="private">Privé</option></select></label>
      <label>Contacts<select class="contacts"><option value="true">Les joueurs se repoussent</option><option value="false">Les joueurs se traversent</option></select></label>
      <label><input class="use-saved" type="checkbox"> Utiliser mes réglages physiques du laboratoire</label><p class="physics-info"></p><button class="create primary">Créer la partie</button></form>
      <h2>Mes terrains privés</h2><button class="new-terrain">Créer un terrain</button><button class="edit-terrain">Modifier le terrain personnel sélectionné</button>
      <label>Terrain de ce navigateur<select class="local-terrain"></select></label><button class="import-local">Importer ce terrain dans mon compte</button><p class="conversion" role="status"></p></details></section>
      <section class="online-session" hidden><h2 class="session-title"></h2><p class="session-status" role="status"></p><strong class="online-time"></strong><ol class="members"></ol><label>Lien pour rejoindre<input class="share-link" type="text" readonly></label><p class="online-result" role="status"></p><button class="leave-room">Quitter la partie</button></section><button class="back-local">Retour aux parcours</button>`;
    const signal = this.controller.signal;
    const action = (selector: string, fn: () => void | Promise<void>, event = 'click') => root.querySelector(selector)!.addEventListener(event, e => {
      e.preventDefault(); if (this.pending) return;
      this.pending = true;
      Promise.resolve().then(fn).catch(error => this.notice(error instanceof Error ? error.message : 'Action impossible')).finally(() => { this.pending = false; });
    }, { signal });
    const value = (selector: string) => root.querySelector<HTMLInputElement>(selector)!.value;
    action('.login-form', async () => { await account.requestSignIn(value('[name=email]')); this.notice('Si cette adresse est valide, un lien de connexion vous sera envoyé.'); }, 'submit');
    action('.logout', async () => { await account.signOut(); this.token = ''; this.isAccount = false; await this.restore(); });
    action('.refresh-lobbies', () => this.refreshPublic());
    action('.back-local', async () => { await network.disconnect(); callbacks.back(); });
    action('.leave-room', async () => { await network.disconnect(); network.view = null; network.welcome = null; this.update(); await this.refreshPublic(); });
    action('.join-form', async () => {
      const code = value('.invite-code').trim();
      if (!/^[A-Za-z0-9_-]{12}$/.test(code)) throw Error('Code de partie invalide');
      const { roomId } = await this.json(`/api/invite/${encodeURIComponent(code)}`);
      await this.join(roomId, code);
    }, 'submit');
    action('.create-form', async () => {
      if (!this.isAccount) throw Error('Un compte est nécessaire pour créer une partie');
      const session = await account.restoreSession(); if (!session) throw Error('Reconnectez-vous avant de créer');
      this.token = session.access_token;
      const terrain = this.terrains().find(t => t.id === value('.online-terrain'));
      if (!terrain) throw Error('Choisissez un terrain');
      const saved = root.querySelector<HTMLInputElement>('.use-saved')!.checked ? getLabSettingsStore().get() : null;
      if (root.querySelector<HTMLInputElement>('.use-saved')!.checked && !saved) throw Error('Enregistrez des réglages dans le laboratoire');
      const config: LobbyConfig = { terrainId: terrain.id, revision: terrain.revision, seats: Number(value('.seats')) as LobbyConfig['seats'],
        visibility: value('.visibility') as LobbyConfig['visibility'], contactsEnabled: value('.contacts') === 'true', physics: physicsFromSettings(saved ?? defaults) };
      if (config.seats > terrain.raceSpawns.length) throw Error(`Ce terrain possède ${terrain.raceSpawns.length} départ(s)`);
      this.notice('Création de la partie…'); await network.connect({ token: this.token, config, name: value('.nickname') });
    }, 'submit');
    action('.new-terrain', () => { if (!this.isAccount) throw Error('Connectez-vous pour conserver vos terrains'); callbacks.edit(); });
    action('.edit-terrain', () => {
      const t = this.personal.find(t => t.id === value('.online-terrain'));
      if (!t) throw Error('Choisissez un terrain personnel dans la liste');
      callbacks.edit(terrainToLegacy(t), { id: t.id, revision: t.revision });
    });
    action('.import-local', async () => {
      if (!this.isAccount) throw Error('Connectez-vous pour importer un terrain');
      const source = getCourseStore().list().find(t => t.id === value('.local-terrain')); if (!source) throw Error('Choisissez un terrain local');
      const conversion = migrateLegacyTerrain(source), fingerprint = JSON.stringify(source);
      if (conversion.needsConfirmation && this.pendingConversion !== fingerprint) {
        this.pendingConversion = fingerprint;
        root.querySelector('.conversion')!.textContent = conversion.warnings.join(' ') + ' Cliquez à nouveau pour confirmer cette copie.'; return;
      }
      await cloudTerrains.save({ ...conversion.terrain, id: `personal-${createId()}` }, 0);
      this.pendingConversion = ''; this.notice('Copie enregistrée dans votre compte. Original local conservé.'); await this.restore();
    });
    const local = root.querySelector<HTMLSelectElement>('.local-terrain')!;
    for (const course of getCourseStore().list()) { const option = document.createElement('option'); option.value = course.id; option.textContent = course.title; local.append(option); }
    if (invite) root.querySelector<HTMLInputElement>('.invite-code')!.value = invite;
    this.timer = setInterval(() => { if (!network.view && !this.pending) void this.refreshPublic().catch(() => {}); }, 5000);
    void this.restore().catch(e => this.notice(e.message));
    void this.refreshPublic().catch(e => this.notice(e.message));
    this.update();
  }
  private terrains(): TerrainV2[] { return [...courses.map(c => migrateLegacyTerrain(c).terrain), ...this.personal]; }
  private async restore() {
    const session = await account.restoreSession(); this.isAccount = !!session; this.token = session?.access_token ?? '';
    this.root.querySelector('.account-state')!.textContent = session ? 'Compte connecté' : account.client ? 'Vous jouez comme invité.' : 'Les comptes ne sont pas encore configurés sur cette installation.';
    this.root.querySelector<HTMLElement>('.login-form')!.hidden = !!session || !account.client;
    this.root.querySelector<HTMLElement>('.logout')!.hidden = !session;
    this.root.querySelector<HTMLElement>('.auth-preview')!.hidden = !!session || import.meta.env.VITE_AUTH_PREVIEW !== 'true';
    this.root.querySelector<HTMLButtonElement>('.create')!.disabled = !session;
    this.root.querySelector<HTMLElement>('.account-required')!.hidden = !!session;
    this.personal = session ? await cloudTerrains.list() : [];
    const select = this.root.querySelector<HTMLSelectElement>('.online-terrain')!; select.replaceChildren();
    for (const t of this.terrains()) { const option = document.createElement('option'); option.value = t.id; option.textContent = `${t.title} · ${t.raceSpawns.length} départ(s)`; select.append(option); }
    const saved = getLabSettingsStore().get();
    this.root.querySelector('.physics-info')!.textContent = saved ? `Enregistrés : ${saved.speed} rad/s · barre ${saved.length} px · recul ${saved.recoilDistance} px` : 'Réglages standards : 5 rad/s · barre 80 px · recul 8 px';
  }
  private async json(path: string, init?: RequestInit) {
    try {
      if (!raceEndpoint) throw Error('Le service en ligne n’est pas encore activé sur cette installation.');
      const response = await fetch(`${raceEndpoint}${path}`, { ...init, signal: this.controller.signal });
      const data = await response.json(); if (!response.ok) throw Error(data.error ?? 'Requête refusée'); return data;
    } catch (e) { if (e instanceof TypeError) throw Error('Serveur de jeu indisponible. Les parcours solo restent accessibles.'); throw e; }
  }
  private async ensureToken() {
    const session = await account.restoreSession(); if (session) { this.token = session.access_token; return; }
    if (!this.token) { const data = await this.json('/api/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: this.root.querySelector<HTMLInputElement>('.nickname')!.value }) }); this.token = data.token; }
  }
  private async join(roomId: string, code?: string) { await this.ensureToken(); this.notice('Connexion…'); await this.network.connect({ roomId, code, token: this.token, name: this.root.querySelector<HTMLInputElement>('.nickname')!.value }); }
  private async refreshPublic() {
    const rooms = await this.json('/api/lobbies') as { roomId: string; title: string; present: number; seats: number; contactsEnabled: boolean }[];
    if (this.controller.signal.aborted) return;
    const root = this.root.querySelector('.public-lobbies')!; root.replaceChildren();
    if (!rooms.length) root.textContent = 'Aucune partie publique en attente.';
    for (const room of rooms) {
      const button = document.createElement('button'); button.textContent = `${room.title} · ${room.present}/${room.seats} · ${room.contactsEnabled ? 'Contacts' : 'Sans contacts'}`;
      button.addEventListener('click', () => { if (this.pending) return; this.pending = true; void this.join(room.roomId).catch(e => this.notice(e.message)).finally(() => { this.pending = false; }); }, { signal: this.controller.signal }); root.append(button);
    }
  }
  notice(text: string): void { if (!this.controller.signal.aborted) this.root.querySelector('.online-notice')!.textContent = text; }
  update(): void {
    const view = this.network.view, welcome = this.network.welcome;
    document.getElementById('app')!.classList.toggle('online-idle', !view);
    document.getElementById('panel-toggle')!.hidden = !view;
    this.root.querySelector<HTMLElement>('.online-menu')!.hidden = !!view;
    this.root.querySelector<HTMLElement>('.online-session')!.hidden = !view;
    if (!view || !welcome) return;
    this.root.querySelector('.session-title')!.textContent = welcome.terrain.title;
    this.root.querySelector('.session-status')!.textContent = !this.network.connected ? 'Reconnexion en cours…' : view.status === 'waiting' ? `En attente : ${view.members.filter(m => m.connected).length}/${welcome.rules.seats} joueurs` : view.status === 'countdown' ? `Départ dans ${Math.ceil(view.countdownMs / 1000)}…` : view.status === 'running' ? 'Course en cours' : 'Course terminée';
    this.root.querySelector('.online-time')!.textContent = `${(view.elapsedMs / 1000).toFixed(2)} s`;
    const members = this.root.querySelector('.members')!; members.replaceChildren();
    for (const member of view.members) { const li = document.createElement('li'); li.textContent = `${member.name}${member.id === welcome.playerId ? ' (vous)' : ''}${member.connected ? '' : ' · déconnecté'}`; members.append(li); }
    this.root.querySelector<HTMLInputElement>('.share-link')!.value = makeJoinLink(window.location.href, welcome.code);
    this.root.querySelector('.online-result')!.textContent = view.result ? view.result.winners.length ? `Victoire : ${view.result.winners.map(id => view.members.find(m => m.id === id)?.name ?? 'Joueur').join(', ')}` : 'Partie abandonnée' : '';
    this.notice('');
  }
  destroy(): void {
    clearInterval(this.timer); this.controller.abort(); this.root.replaceChildren();
    document.getElementById('app')!.classList.remove('online-idle');
    document.getElementById('panel-toggle')!.hidden = false;
  }
}
