import { parseSettings, type Settings } from "../../core/settings";
import { getContacts } from "../../collision/geometry";
import type { MazeDefinition } from "./MazeDefinition";
export function validateRunSettings(
  maze: MazeDefinition,
  settings: Settings,
): string[] {
  if (!parseSettings(settings)) return ["Réglages invalides ou hors limites"];
  const a = maze.spawn.a,
    b = {
      x: a.x + settings.length * Math.cos(maze.spawn.angle),
      y: a.y + settings.length * Math.sin(maze.spawn.angle),
    };
  const errors: string[] = [];
  if (getContacts(a, b, 17, 3.5, maze.walls).length)
    errors.push(
      "La longueur de barre provoque un contact avec un mur au départ.",
    );
  if (
    (maze.finishMode ?? "whole") === "whole" &&
    Math.hypot(maze.exit.width - 34, maze.exit.height - 34) < settings.length
  )
    errors.push(
      "La zone d’arrivée est trop petite pour cette longueur de barre.",
    );
  return errors;
}
