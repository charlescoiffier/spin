import { createId } from "../../core/createId";
import type { MazeDefinition } from "./MazeDefinition";
type StoragePort = Pick<Storage, "getItem" | "setItem">;
export interface ScoreEntry {
  id: string;
  name: string;
  timeMs: number;
}
const valid = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
export class RecordStore {
  private memory = new Map<string, ScoreEntry[]>();
  constructor(private storage: StoragePort | null) {}
  private key(m: MazeDefinition): string {
    return `spin:maze:podium-v2:${m.id}:v${m.version}`;
  }
  top(maze: MazeDefinition): ScoreEntry[] {
    const key = this.key(maze);
    if (!this.memory.has(key)) {
      let entries: ScoreEntry[] = [];
      try {
        const raw = this.storage?.getItem(key);
        if (raw) {
          const data: unknown = JSON.parse(raw);
          if (Array.isArray(data))
            entries = data
              .filter(
                (e) =>
                  e &&
                  typeof e.id === "string" &&
                  typeof e.name === "string" &&
                  e.name.trim() &&
                  e.name.length <= 24 &&
                  valid(e.timeMs),
              )
              .slice(0, 100)
              .map((e) => ({ id: e.id, name: e.name, timeMs: e.timeMs }));
        }
        if (!entries.length) {
          const old = this.storage?.getItem(
            `spin:maze:rules-v1:${maze.id}:v${maze.version}`,
          );
          const value: unknown = old ? JSON.parse(old) : null;
          if (valid(value))
            entries = [{ id: "legacy", name: "Anonyme", timeMs: value }];
        }
      } catch {
        /* keep session records */
      }
      this.memory.set(
        key,
        entries.sort((a, b) => a.timeMs - b.timeMs).slice(0, 3),
      );
    }
    return structuredClone(this.memory.get(key)!);
  }
  get(maze: MazeDefinition): number | null {
    return this.top(maze)[0]?.timeMs ?? null;
  }
  qualifies(maze: MazeDefinition, timeMs: number): boolean {
    if (!valid(timeMs)) return false;
    const top = this.top(maze);
    return top.length < 3 || timeMs < top[2].timeMs;
  }
  submitNamed(
    maze: MazeDefinition,
    timeMs: number,
    name: string,
  ): ScoreEntry[] {
    if (!valid(timeMs))
      throw new RangeError("Le temps doit être positif et fini");
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!clean) throw Error("Indiquez un nom");
    if (!this.qualifies(maze, timeMs)) return this.top(maze);
    const entries = [...this.top(maze), { id: createId(), name: clean, timeMs }]
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 3);
    this.memory.set(this.key(maze), entries);
    try {
      this.storage?.setItem(this.key(maze), JSON.stringify(entries));
    } catch {
      /* memory fallback */
    }
    return structuredClone(entries);
  }
  submit(
    maze: MazeDefinition,
    elapsedMs: number,
  ): { bestMs: number; improved: boolean } {
    if (!valid(elapsedMs))
      throw new RangeError("Le temps doit être positif et fini");
    const before = this.get(maze),
      improved = before === null || elapsedMs < before;
    this.submitNamed(maze, elapsedMs, "Anonyme");
    return { bestMs: this.get(maze)!, improved };
  }
}
