import { SpinMotion } from "../../core/SpinMotion";
import { FixedStepper } from "../../core/FixedStepper";
import { CollisionMotion } from "../../collision/CollisionMotion";
import { containsDisk } from "../../collision/geometry";
import { RaceSession } from "./RaceSession";
import { type MazeDefinition, validateMaze } from "./MazeDefinition";
import type { RecordStore } from "./RecordStore";
export class MazeRun {
  readonly motion = new SpinMotion(80, 5);
  readonly session = new RaceSession();
  private stepper = new FixedStepper();
  private collisions: CollisionMotion;
  constructor(
    readonly maze: MazeDefinition,
    private records: RecordStore,
  ) {
    const errors = validateMaze(maze);
    if (errors.length) throw Error(errors.join("; "));
    this.collisions = new CollisionMotion(this.motion, maze.walls);
  }
  reset(nowMs: number): void {
    this.motion.resetAt(this.maze.spawn.a, this.maze.spawn.angle);
    this.collisions.reset();
    this.session.reset();
    this.stepper.reset(nowMs);
  }
  press(nowMs: number): void {
    if (this.session.status === "ready") {
      this.session.start(nowMs);
      this.stepper.reset(nowMs);
    }
    if (this.session.status === "running") this.stepper.enqueuePress(nowMs);
  }
  update(nowMs: number): void {
    if (this.session.status !== "running") return;
    const okay = this.stepper.advance(
      nowMs,
      () => {
        if (this.session.status === "running") this.motion.switchPivot();
      },
      (dt, stepTime) => {
        if (this.session.status !== "running") return;
        this.collisions.step(dt);
        if (
          containsDisk(this.maze.exit, this.motion.a, 17) &&
          containsDisk(this.maze.exit, this.motion.b, 17)
        ) {
          this.session.finish(stepTime);
          this.records.submit(this.maze, this.session.elapsedMs(stepTime));
        }
      },
    );
    if (!okay) this.interrupt(nowMs);
  }
  interrupt(nowMs: number): void {
    this.session.elapsedMs(nowMs);
    this.session.interrupt();
  }
}
