import type Phaser from "phaser";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import { drawCourse } from "./drawCourse";
import { defaultTheme, colorNumber } from "../modes/maze/theme";
export class MazeRenderer {
  constructor(scene: Phaser.Scene, maze: MazeDefinition) {
    const t = { ...defaultTheme, ...maze.theme };
    scene.cameras.main.setBackgroundColor(colorNumber(t.background));
    drawCourse(scene.add.graphics(), maze);
    const e = maze.exit;
    scene.add
      .text(
        e.x + e.width / 2,
        e.y + e.height / 2,
        maze.finishMode === "touch" ? "CIBLE" : "ARRIVÉE",
        {
          fontFamily: "monospace",
          fontSize: maze.finishMode === "touch" ? "12px" : "18px",
          color: t.exitOutline,
        },
      )
      .setOrigin(0.5);
    scene.add
      .text(maze.spawn.a.x, maze.spawn.a.y - 64, "DÉPART", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: t.start,
      })
      .setOrigin(0.5);
  }
}
