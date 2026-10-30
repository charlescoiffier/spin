import type { SpinMotion, Point } from "../../core/SpinMotion";
import { containsDisk, getContacts } from "../../collision/geometry";
import type { MazeDefinition } from "./MazeDefinition";
export function finishReached(
  maze: MazeDefinition,
  motion: SpinMotion,
  previousPivot: Point,
  recoiling: boolean,
): boolean {
  switch (maze.finishMode ?? "whole") {
    case "touch":
      return (
        getContacts(motion.a, motion.b, 17, 3.5, [{ ...maze.exit, id: "goal" }])
          .length > 0
      );
    case "pivot":
      return (
        !recoiling &&
        Math.hypot(
          motion.pivotPosition.x - previousPivot.x,
          motion.pivotPosition.y - previousPivot.y,
        ) < 1e-7 &&
        containsDisk(maze.exit, motion.pivotPosition, 17)
      );
    case "whole":
      return (
        containsDisk(maze.exit, motion.a, 17) &&
        containsDisk(maze.exit, motion.b, 17)
      );
  }
}
