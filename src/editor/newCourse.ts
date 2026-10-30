import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import { defaultTheme } from "../modes/maze/theme";
export function newCourse(): MazeDefinition {
  return {
    id: "draft",
    version: 1,
    title: "Mon parcours",
    finishMode: "whole",
    theme: { ...defaultTheme },
    spawn: { a: { x: 180, y: 200 }, angle: 0 },
    exit: { x: 1120, y: 720, width: 240, height: 220 },
    walls: [
      { id: "north", x: 0, y: 0, width: 1440, height: 40 },
      { id: "south", x: 0, y: 1000, width: 1440, height: 40 },
      { id: "west", x: 0, y: 40, width: 40, height: 960 },
      { id: "east", x: 1400, y: 40, width: 40, height: 960 },
    ],
  };
}
