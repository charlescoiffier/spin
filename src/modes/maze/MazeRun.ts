import { SpinMotion } from "../../core/SpinMotion";
import { FixedStepper } from "../../core/FixedStepper";
import { CollisionMotion } from "../../collision/CollisionMotion";
import { finishReached } from "./finishReached";
import { RaceSession } from "./RaceSession";
import { type MazeDefinition, validateMaze } from "./MazeDefinition";
import type { RecordStore } from "./RecordStore";
import { defaults, type Settings } from "../../core/settings";
import { validateRunSettings } from "./validateRunSettings";
export class MazeRun {
  readonly motion: SpinMotion;
  readonly session = new RaceSession();
  private stepper = new FixedStepper();
  private collisions: CollisionMotion;
  constructor(
    readonly maze: MazeDefinition,
    private records: RecordStore,
    private autoSubmit = true,
    settings: Settings = defaults,
  ) {
    const errors = validateMaze(maze);
    if (!errors.length) errors.push(...validateRunSettings(maze, settings));
    if (errors.length) throw Error(errors.join("; "));
    this.motion = new SpinMotion(settings.length, settings.speed);
    this.collisions = new CollisionMotion(this.motion, maze.walls);
    this.collisions.setRecoilDistance(settings.recoilDistance);
    this.autoSubmit =
      autoSubmit &&
      settings.length === defaults.length &&
      settings.speed === defaults.speed &&
      settings.recoilDistance === defaults.recoilDistance;
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
        const previousPivot = { ...this.motion.pivotPosition };
        this.collisions.step(dt);
        if (
          finishReached(
            this.maze,
            this.motion,
            previousPivot,
            this.collisions.isRecoiling,
          )
        ) {
          this.session.finish(stepTime);
          if (this.autoSubmit)
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
