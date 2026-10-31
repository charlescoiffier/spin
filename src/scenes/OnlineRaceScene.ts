import Phaser from 'phaser';
import { RaceClient } from '../network/RaceClient';
import { parseJoinLink } from '../network/JoinLink';
import { raceEndpoint } from '../account/services';
import { LobbyPanel } from '../ui/LobbyPanel';
import { showPanel } from '../ui/appShell';
import { PointerControls } from '../input/PointerControls';
import { PivotCamera } from '../camera/PivotCamera';
import { drawCourse } from '../rendering/drawCourse';
import { OnlinePlayerRenderer, playerColors } from '../rendering/OnlinePlayerRenderer';
import { terrainToLegacy } from '../shared/terrainMigration';
import { EditorDocument } from '../editor/EditorDocument';
import { defaults } from '../core/settings';
import { getLabSettingsStore } from '../modes/maze/services';
import { colorNumber } from '../modes/maze/theme';
export class OnlineRaceScene extends Phaser.Scene {
  private network!: RaceClient;
  private panel!: LobbyPanel;
  private drawing!: Phaser.GameObjects.Graphics;
  private follow!: PivotCamera;
  private renderers = new Map<string, OnlinePlayerRenderer>();
  private drawnTerrain = '';
  private accumulator = 0;
  private following = false;
  constructor() { super('online'); }
  create(): void {
    const root = showPanel('online-ui', 'En ligne');
    this.drawnTerrain = ''; this.accumulator = 0; this.following = false; this.renderers.clear();
    this.drawing = this.add.graphics(); this.follow = new PivotCamera(this.cameras.main);
    this.network = new RaceClient(raceEndpoint);
    this.panel = new LobbyPanel(root, this.network, {
      back: () => this.scene.start('maze', {}),
      edit: (course, cloud) => {
        if (course) { const document = new EditorDocument(course); document.cloudTarget = cloud; this.scene.start('editor', { document }); }
        else this.scene.start('editor', {});
      },
    }, parseJoinLink(window.location.href)?.code);
    this.network.onChange = () => this.panel.update(); this.network.onNotice = text => this.panel.notice(text);
    void this.network.resume();
    const controls = new PointerControls(this, () => this.network.spin());
    this.events.once('shutdown', () => {
      controls.destroy(); this.panel.destroy(); this.network.onChange = () => {}; this.network.onNotice = () => {};
      void this.network.disconnect(); root.hidden = true;
      for (const renderer of this.renderers.values()) renderer.destroy(); this.renderers.clear();
    });
  }
  update(_time: number, delta: number): void {
    const n = this.network, welcome = n?.welcome;
    if (!welcome) return;
    const terrainKey = `${welcome.terrain.id}:${welcome.terrain.revision}`;
    if (terrainKey !== this.drawnTerrain) {
      this.drawing.clear(); drawCourse(this.drawing, terrainToLegacy(welcome.terrain));
      this.cameras.main.setBackgroundColor(colorNumber(welcome.terrain.theme.background));
      this.drawnTerrain = terrainKey; this.following = false;
    }
    if (n.connected && n.view?.status === 'running') {
      this.accumulator += Math.min(delta, 100) * 240 / 1000;
      const ticks = Math.floor(this.accumulator); this.accumulator -= ticks; n.prediction?.advance(ticks);
    } else this.accumulator = 0;
    const poses = n.poses();
    for (const [id, r] of this.renderers) if (!poses.some(p => p.id === id)) { r.destroy(); this.renderers.delete(id); }
    for (const pose of poses) {
      const member = n.view?.members.find(m => m.id === pose.id);
      if (!this.renderers.has(pose.id)) this.renderers.set(pose.id, new OnlinePlayerRenderer(this, playerColors[(member?.spawnIndex ?? 0) % 4], member?.name ?? 'Joueur'));
      this.renderers.get(pose.id)!.draw(pose.motion);
      if (pose.id === welcome.playerId) {
        const pivot = pose.motion.pivot === 'A' ? pose.motion.a : pose.motion.b;
        if (!this.following) { this.follow.reset(pivot); this.following = true; }
        const settings = getLabSettingsStore().get() ?? defaults;
        this.follow.update(pivot, Math.min(delta, 100) / 1000, settings.smoothing, settings.zoom);
      }
    }
  }
}
