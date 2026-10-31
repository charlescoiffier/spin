import type Phaser from 'phaser';
import type { MotionState } from '../core/SpinMotion';
export const playerColors = [0x9bd9c2, 0xf0b9b0, 0xbcc9f1, 0xf3d992];
export class OnlinePlayerRenderer {
  private g: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, private color: number, name: string) {
    this.g = scene.add.graphics();
    this.name = scene.add.text(0, 0, name, { fontSize: '12px', color: '#f5f4ee', backgroundColor: '#111820aa' }).setOrigin(.5);
  }
  draw(m: MotionState): void {
    const g = this.g; g.clear();
    g.lineStyle(10, 0x111111).lineBetween(m.a.x, m.a.y, m.b.x, m.b.y);
    g.lineStyle(5, this.color).lineBetween(m.a.x, m.a.y, m.b.x, m.b.y);
    for (const p of [m.a, m.b]) g.fillStyle(this.color).fillCircle(p.x, p.y, 17).lineStyle(4, 0x111111).strokeCircle(p.x, p.y, 17);
    const pivot = m.pivot === 'A' ? m.a : m.b;
    g.lineStyle(2, 0xffffff, .75).strokeCircle(pivot.x, pivot.y, 24);
    this.name.setPosition((m.a.x + m.b.x) / 2, Math.min(m.a.y, m.b.y) - 33);
  }
  destroy(): void { this.g.destroy(); this.name.destroy(); }
}
