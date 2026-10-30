import type Phaser from "phaser";
import type { Rect } from "../collision/geometry";
import { wallOutline } from "./wallOutline";
export function drawWalls(
  g: Phaser.GameObjects.Graphics,
  walls: readonly Rect[],
  fill: number,
  outline: number,
): void {
  g.fillStyle(fill, 1);
  for (const w of walls) g.fillRect(w.x, w.y, w.width, w.height);
  g.lineStyle(2, outline, 1);
  g.beginPath();
  for (const s of wallOutline(walls)) {
    g.moveTo(s.a.x, s.a.y);
    g.lineTo(s.b.x, s.b.y);
  }
  g.strokePath();
}
