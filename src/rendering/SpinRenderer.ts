import Phaser from "phaser";
import type { Point, SpinMotion } from "../core/SpinMotion";
export class SpinRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private trail: Phaser.GameObjects.Graphics;
  private points: Point[] = [];
  private labels: Phaser.GameObjects.Text[];
  private sampleTime = 0;
  constructor(scene: Phaser.Scene) {
    this.trail = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.labels = ["A", "B"].map((t) =>
      scene.add
        .text(0, 0, t, {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#101820",
        })
        .setOrigin(0.5),
    );
  }
  clearTrail(): void {
    this.points = [];
    this.trail.clear();
    this.sampleTime = 0;
  }
  draw(m: SpinMotion, showTrail: boolean, dt: number): void {
    this.sampleTime += dt;
    if (showTrail && this.sampleTime >= 1 / 30) {
      this.sampleTime = 0;
      this.points.push({ x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 });
      if (this.points.length > 1200) this.points.shift();
    }
    this.trail.clear();
    if (showTrail && this.points.length > 1) {
      this.trail.lineStyle(2, 0x7ad6c0, 0.28).beginPath();
      this.points.forEach((p, i) =>
        i === 0 ? this.trail.moveTo(p.x, p.y) : this.trail.lineTo(p.x, p.y),
      );
      this.trail.strokePath();
    }
    const g = this.graphics;
    g.clear();
    g.lineStyle(7, 0x57717a).lineBetween(m.a.x, m.a.y, m.b.x, m.b.y);
    g.lineStyle(2, 0xc7ddd9).lineBetween(m.a.x, m.a.y, m.b.x, m.b.y);
    [m.a, m.b].forEach((p, i) => {
      const active = (i === 0) === (m.pivot === "A");
      if (active) g.lineStyle(2, 0xffffff, 0.65).strokeCircle(p.x, p.y, 25);
      g.fillStyle(i === 0 ? 0x7ce5c2 : 0xffbc79).fillCircle(p.x, p.y, 17);
      this.labels[i].setPosition(p.x, p.y);
    });
  }
}
