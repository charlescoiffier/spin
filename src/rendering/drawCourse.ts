import type Phaser from "phaser";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import { defaultTheme, colorNumber } from "../modes/maze/theme";
import { drawWalls } from "./drawWalls";
export function courseBounds(m: MazeDefinition) {
  const xs = [m.spawn.a.x - 100, m.exit.x, ...m.walls.map((w) => w.x)],
    ys = [m.spawn.a.y - 100, m.exit.y, ...m.walls.map((w) => w.y)];
  const left = Math.min(...xs),
    top = Math.min(...ys),
    right = Math.max(
      m.spawn.a.x + 180,
      m.exit.x + m.exit.width,
      ...m.walls.map((w) => w.x + w.width),
    ),
    bottom = Math.max(
      m.spawn.a.y + 100,
      m.exit.y + m.exit.height,
      ...m.walls.map((w) => w.y + w.height),
    );
  return { left, top, right, bottom };
}
export function drawCourse(
  g: Phaser.GameObjects.Graphics,
  m: MazeDefinition,
  editor = false,
): void {
  const t = { ...defaultTheme, ...m.theme },
    b = courseBounds(m),
    step = editor ? 20 : 80;
  g.lineStyle(1, colorNumber(t.grid), editor ? 0.14 : 0.12);
  for (
    let x = Math.floor((b.left - 160) / step) * step;
    x <= b.right + 160;
    x += step
  )
    g.lineBetween(x, b.top - 160, x, b.bottom + 160);
  for (
    let y = Math.floor((b.top - 160) / step) * step;
    y <= b.bottom + 160;
    y += step
  )
    g.lineBetween(b.left - 160, y, b.right + 160, y);
  const e = m.exit;
  g.fillStyle(colorNumber(t.exitFill), 0.3).fillRect(
    e.x,
    e.y,
    e.width,
    e.height,
  );
  g.lineStyle(2, colorNumber(t.exitOutline), 1).strokeRect(
    e.x,
    e.y,
    e.width,
    e.height,
  );
  if (m.finishMode === "touch") {
    g.lineBetween(e.x, e.y, e.x + e.width, e.y + e.height);
    g.lineBetween(e.x + e.width, e.y, e.x, e.y + e.height);
  }
  drawWalls(g, m.walls, colorNumber(t.wallFill), colorNumber(t.wallOutline));
  const a = m.spawn.a;
  g.lineStyle(2, colorNumber(t.start), 0.7).strokeCircle(a.x, a.y, 25);
  if (editor) {
    const x = a.x + 80 * Math.cos(m.spawn.angle),
      y = a.y + 80 * Math.sin(m.spawn.angle);
    g.lineStyle(4, colorNumber(t.start), 0.7).lineBetween(a.x, a.y, x, y);
    g.fillStyle(colorNumber(t.start), 0.8)
      .fillCircle(a.x, a.y, 17)
      .fillCircle(x, y, 17);
  }
}
