import type { Point } from "../../core/SpinMotion";
import { getContacts, type Rect, type Wall } from "../../collision/geometry";
import { defaultTheme, type CourseTheme } from "./theme";
export type FinishMode = "pivot" | "whole" | "touch";
export interface MazeDefinition {
  id: string;
  version: number;
  title: string;
  walls: readonly Wall[];
  spawn: { a: Point; angle: number };
  raceSpawns?: readonly { a: Point; angle: number }[];
  exit: Rect;
  finishMode?: FinishMode;
  theme?: CourseTheme;
}
export function validateMaze(maze: MazeDefinition): string[] {
  const errors: string[] = [];
  if (!maze || typeof maze !== "object") return ["Parcours invalide"];
  if (
    typeof maze.id !== "string" ||
    !maze.id ||
    maze.id.length > 80 ||
    !Number.isInteger(maze.version) ||
    maze.version < 1
  )
    errors.push("Identité ou version invalide");
  if (
    typeof maze.title !== "string" ||
    !maze.title.trim() ||
    maze.title.length > 80
  )
    errors.push("Titre invalide (1 à 80 caractères)");
  const validRect = (r: Rect) =>
    r &&
    [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
    Math.abs(r.x) <= 8000 &&
    Math.abs(r.y) <= 8000 &&
    r.width > 0 &&
    r.height > 0 &&
    r.width <= 8000 &&
    r.height <= 8000 &&
    Math.abs(r.x + r.width) <= 8000 &&
    Math.abs(r.y + r.height) <= 8000;
  const mode = maze.finishMode ?? "whole";
  if (maze.raceSpawns !== undefined && (!Array.isArray(maze.raceSpawns) || maze.raceSpawns.length < 1 || maze.raceSpawns.length > 4 ||
    maze.raceSpawns.some(s => !s?.a || ![s.a.x, s.a.y, s.angle].every(Number.isFinite))))
    errors.push("Départs multijoueurs invalides");
  if (!["pivot", "whole", "touch"].includes(mode))
    errors.push("Type d’arrivée inconnu");
  const min = mode === "whole" ? 114 : mode === "pivot" ? 34 : 24;
  if (!validRect(maze.exit) || maze.exit.width < min || maze.exit.height < min)
    errors.push(`Arrivée trop petite ou invalide (minimum ${min} px)`);
  if (!Array.isArray(maze.walls) || maze.walls.length > 128)
    return [...errors, "Maximum 128 murs"];
  if (
    maze.walls.some(
      (w) =>
        !w ||
        typeof w.id !== "string" ||
        !w.id ||
        w.id.length > 80 ||
        !validRect(w) ||
        w.width < 24 ||
        w.height < 24,
    )
  )
    errors.push("Mur invalide (épaisseur minimale 24 px)");
  if (new Set(maze.walls.map((w) => w?.id)).size !== maze.walls.length)
    errors.push("Identifiants des murs dupliqués");
  if (
    !maze.spawn?.a ||
    ![maze.spawn.a.x, maze.spawn.a.y, maze.spawn.angle].every(
      Number.isFinite,
    ) ||
    Math.abs(maze.spawn.a.x) > 8000 ||
    Math.abs(maze.spawn.a.y) > 8000
  )
    errors.push("Départ invalide");
  if (
    maze.theme &&
    Object.keys(defaultTheme).some(
      (k) => !/^#[0-9a-f]{6}$/i.test(maze.theme![k as keyof CourseTheme]),
    )
  )
    errors.push("Couleur invalide");
  if (errors.length) return errors;
  const a = maze.spawn.a,
    b = {
      x: a.x + 80 * Math.cos(maze.spawn.angle),
      y: a.y + 80 * Math.sin(maze.spawn.angle),
    };
  if (getContacts(a, b, 17, 3.5, maze.walls).length)
    errors.push("Départ dans un mur");
  const e = maze.exit;
  if (
    maze.walls.some(
      (w) =>
        w.x < e.x + e.width &&
        w.x + w.width > e.x &&
        w.y < e.y + e.height &&
        w.y + w.height > e.y,
    )
  )
    errors.push("Arrivée dans un mur");
  return errors;
}
/** Import treats all fields as untrusted and returns only the supported schema. */
export function parseMaze(value: unknown): MazeDefinition {
  const errors = validateMaze(value as MazeDefinition);
  if (errors.length) throw Error(errors.join(" · "));
  const m = value as MazeDefinition;
  return {
    id: m.id,
    version: m.version,
    title: m.title,
    finishMode: m.finishMode ?? "whole",
    theme: { ...defaultTheme, ...m.theme },
    walls: m.walls.map((w) => ({
      id: w.id,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
    })),
    spawn: { a: { x: m.spawn.a.x, y: m.spawn.a.y }, angle: m.spawn.angle },
    ...(m.raceSpawns ? { raceSpawns: m.raceSpawns.map(s => ({ a: { x: s.a.x, y: s.a.y }, angle: s.angle })) } : {}),
    exit: {
      x: m.exit.x,
      y: m.exit.y,
      width: m.exit.width,
      height: m.exit.height,
    },
  };
}
