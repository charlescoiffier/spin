import {
  parseMaze,
  type MazeDefinition,
  type FinishMode,
} from "../modes/maze/MazeDefinition";
import type { CourseTheme } from "../modes/maze/theme";
import type { Point } from "../core/SpinMotion";
import type { Rect } from "../collision/geometry";
export type EditorTool = "select" | "wall" | "spawn" | "exit" | "pan";
export const snap = (n: number) =>
  Math.max(-7800, Math.min(7800, Math.round(n / 20) * 20));
const contains = (r: Rect, p: Point) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
export class EditorDocument {
  course: MazeDefinition;
  selected: "spawn" | "exit" | `wall:${string}` | null = null;
  tool: EditorTool = "select";
  activeSpawnIndex = 0;
  cloudTarget?: { id: string; revision: number };
  get activeSpawn() { return this.course.raceSpawns?.[this.activeSpawnIndex] ?? this.course.spawn; }
  setRaceSpawnCount(count: number): void {
    if (!Number.isInteger(count) || count < 1 || count > 4) return;
    this.change(() => {
      const previous = this.course.raceSpawns ?? [this.course.spawn];
      this.course.raceSpawns = Array.from({ length: count }, (_, i) => structuredClone(previous[i] ?? {
        a: { x: this.course.spawn.a.x, y: this.course.spawn.a.y + i * 60 }, angle: this.course.spawn.angle,
      }));
    });
    this.activeSpawnIndex = Math.min(this.activeSpawnIndex, count - 1);
  }
  private past: MazeDefinition[] = [];
  private future: MazeDefinition[] = [];
  private serial = 0;
  constructor(course: MazeDefinition) {
    this.course = parseMaze(course);
  }
  markSaved(saved: MazeDefinition): void {
    this.course = parseMaze(saved);
    for (const state of [...this.past, ...this.future]) {
      state.id = saved.id;
      state.version = saved.version;
    }
  }
  private change(action: () => void): void {
    const before = structuredClone(this.course);
    action();
    if (JSON.stringify(before) !== JSON.stringify(this.course)) {
      this.past.push(before);
      if (this.past.length > 60) this.past.shift();
      this.future = [];
    }
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  undo(): void {
    const p = this.past.pop();
    if (p) {
      this.future.push(this.course);
      this.course = p;
      this.selected = null;
    }
  }
  redo(): void {
    const p = this.future.pop();
    if (p) {
      this.past.push(this.course);
      this.course = p;
      this.selected = null;
    }
  }
  addWall(a: Point, b: Point): void {
    if (this.course.walls.length >= 128) throw Error("Maximum 128 murs");
    let id: string;
    do {
      id = `wall-${++this.serial}`;
    } while (this.course.walls.some((w) => w.id === id));
    this.change(() => {
      this.course.walls = [
        ...this.course.walls,
        {
          id,
          x: snap(Math.min(a.x, b.x)),
          y: snap(Math.min(a.y, b.y)),
          width: Math.max(40, Math.abs(snap(b.x) - snap(a.x))),
          height: Math.max(40, Math.abs(snap(b.y) - snap(a.y))),
        },
      ];
    });
    this.selected = `wall:${id}`;
  }
  selectAt(p: Point): void {
    if (contains(this.course.exit, p)) {
      this.selected = "exit";
      return;
    }
    if (
      Math.hypot(p.x - this.activeSpawn.a.x, p.y - this.activeSpawn.a.y) < 50
    ) {
      this.selected = "spawn";
      return;
    }
    const wall = [...this.course.walls].reverse().find((w) => contains(w, p));
    this.selected = wall ? `wall:${wall.id}` : null;
  }
  selectedRect(): Rect | null {
    return this.selected === "exit"
      ? this.course.exit
      : (this.course.walls.find((w) => `wall:${w.id}` === this.selected) ??
          null);
  }
  moveSelected(delta: Point): void {
    if (delta.x === 0 && delta.y === 0) return;
    this.change(() => {
      if (this.selected === "spawn") {
        this.activeSpawn.a = {
          x: snap(this.activeSpawn.a.x + delta.x),
          y: snap(this.activeSpawn.a.y + delta.y),
        };
        if (this.activeSpawnIndex === 0) this.course.spawn = structuredClone(this.activeSpawn);
        return;
      }
      const r = this.selectedRect();
      if (r) {
        r.x = snap(r.x + delta.x);
        r.y = snap(r.y + delta.y);
      }
    });
  }
  placeSpawn(p: Point): void {
    this.change(() => {
      this.activeSpawn.a = { x: snap(p.x), y: snap(p.y) };
      if (this.activeSpawnIndex === 0) this.course.spawn = structuredClone(this.activeSpawn);
    });
    this.selected = "spawn";
  }
  placeExit(p: Point): void {
    this.change(() => {
      this.course.exit.x = snap(p.x - this.course.exit.width / 2);
      this.course.exit.y = snap(p.y - this.course.exit.height / 2);
    });
    this.selected = "exit";
  }
  resizeSelected(width: number, height: number): void {
    this.change(() => {
      const r = this.selectedRect();
      if (r) {
        r.width = Math.max(24, Math.min(4000, Math.round(width)));
        r.height = Math.max(24, Math.min(4000, Math.round(height)));
      }
    });
  }
  deleteSelected(): void {
    if (this.selected === "spawn" || this.selected === "exit") return;
    this.change(() => {
      this.course.walls = this.course.walls.filter(
        (w) => `wall:${w.id}` !== this.selected,
      );
    });
    this.selected = null;
  }
  setTitle(title: string): void {
    this.change(() => {
      this.course.title = title.slice(0, 80);
    });
  }
  setSpawnAngle(degrees: number): void {
    this.change(() => {
      this.activeSpawn.angle = (degrees * Math.PI) / 180;
      if (this.activeSpawnIndex === 0) this.course.spawn = structuredClone(this.activeSpawn);
    });
  }
  setFinishMode(mode: FinishMode): void {
    this.change(() => {
      this.course.finishMode = mode;
    });
  }
  setTheme(key: keyof CourseTheme, value: string): void {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    this.change(() => {
      this.course.theme![key] = value;
    });
  }
}
