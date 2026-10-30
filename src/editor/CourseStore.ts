import { createId } from "../core/createId";
import { parseMaze, type MazeDefinition } from "../modes/maze/MazeDefinition";
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const key = "spin:custom-courses:v1";
function rules(m: MazeDefinition): string {
  return JSON.stringify([m.walls, m.spawn, m.exit, m.finishMode ?? "whole"]);
}
export class CourseStore {
  private courses: MazeDefinition[] = [];
  persisted = true;
  constructor(private storage: StoragePort | null) {
    try {
      const raw = storage?.getItem(key);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (Array.isArray(data))
          for (const item of data.slice(0, 40)) {
            try {
              const m = parseMaze(item);
              if (
                m.id.startsWith("custom-") &&
                !this.courses.some((c) => c.id === m.id)
              )
                this.courses.push(m);
            } catch {
              /* discard invalid entry */
            }
          }
      }
    } catch {
      this.persisted = false;
    }
  }
  list(): MazeDefinition[] {
    return structuredClone(this.courses);
  }
  save(source: MazeDefinition): MazeDefinition {
    const m = parseMaze(source),
      previous = this.courses.find((c) => c.id === m.id);
    if (previous)
      m.version = previous.version + (rules(previous) === rules(m) ? 0 : 1);
    else {
      if (this.courses.length >= 40)
        throw Error("Maximum 40 parcours enregistrés");
      m.id = `custom-${createId()}`;
      m.version = 1;
    }
    this.courses = this.courses.filter((c) => c.id !== m.id);
    this.courses.push(m);
    try {
      this.storage?.setItem(key, JSON.stringify(this.courses));
      this.persisted = this.storage !== null;
    } catch {
      this.persisted = false;
    }
    return structuredClone(m);
  }
  importJson(raw: string): MazeDefinition {
    if (raw.length > 1000000)
      throw Error("Fichier trop volumineux (maximum 1 Mo)");
    return parseMaze(JSON.parse(raw));
  }
}
