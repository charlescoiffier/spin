import Phaser from "phaser";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
export class MazeRenderer {
  constructor(scene: Phaser.Scene, maze: MazeDefinition) {
    const g = scene.add.graphics();
    const right = Math.max(...maze.walls.map((w) => w.x + w.width));
    const bottom = Math.max(...maze.walls.map((w) => w.y + w.height));
    g.lineStyle(1, 0x658080, 0.12);
    for (let x = 0; x < right; x += 80) g.lineBetween(x, 0, x, bottom);
    for (let y = 0; y < bottom; y += 80) g.lineBetween(0, y, right, y);
    const e = maze.exit;
    g.fillStyle(0x7ce5c2, 0.12).fillRoundedRect(
      e.x,
      e.y,
      e.width,
      e.height,
      12,
    );
    g.lineStyle(2, 0x7ce5c2, 0.8).strokeRoundedRect(
      e.x,
      e.y,
      e.width,
      e.height,
      12,
    );
    scene.add
      .text(e.x + e.width / 2, e.y + e.height / 2, "SORTIE", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#7ce5c2",
      })
      .setOrigin(0.5);
    g.lineStyle(2, 0x7d9ca8, 0.6).strokeCircle(
      maze.spawn.a.x,
      maze.spawn.a.y,
      40,
    );
    scene.add
      .text(maze.spawn.a.x, maze.spawn.a.y - 64, "DÉPART", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#96aeb9",
      })
      .setOrigin(0.5);
    maze.walls.forEach((w) => {
      g.fillStyle(0x2c3e4a).fillRect(w.x, w.y, w.width, w.height);
      g.lineStyle(2, 0x93aebc).strokeRect(w.x, w.y, w.width, w.height);
    });
  }
}
