import Phaser from "phaser";
import { MazeRun } from "../modes/maze/MazeRun";
import { RecordStore } from "../modes/maze/RecordStore";
import { courses } from "../modes/maze/courses";
import { MazeRenderer } from "../rendering/MazeRenderer";
import { SpinRenderer } from "../rendering/SpinRenderer";
import { PivotCamera } from "../camera/PivotCamera";
import { PointerControls } from "../input/PointerControls";
import { RaceHud } from "../ui/RaceHud";

// One store per browser session: memory fallback survives scene changes and retries.
let records: RecordStore | undefined;
function getRecords(): RecordStore {
  if (!records) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* memory only */
    }
    records = new RecordStore(storage);
  }
  return records;
}
export class MazeScene extends Phaser.Scene {
  private courseId = courses[0].id;
  private run!: MazeRun;
  private spinView!: SpinRenderer;
  private follow!: PivotCamera;
  private hud!: RaceHud;
  private bestMs: number | null = null;
  constructor() {
    super("maze");
  }
  init(data: { courseId?: string } = {}): void {
    this.courseId = data.courseId ?? courses[0].id;
  }
  create(): void {
    const maze = courses.find((c) => c.id === this.courseId) ?? courses[0];
    document.getElementById("app")!.classList.add("race-mode");
    document.getElementById("debug")!.hidden = true;
    const root = document.getElementById("race-ui")!;
    root.hidden = false;
    document.querySelector(".hint")!.textContent =
      "CLIC, TOUCHER OU ESPACE · UN NOUVEAU PIVOT";
    document.querySelector("header small")!.textContent = "MAZE / 0.1";
    this.run = new MazeRun(maze, getRecords());
    new MazeRenderer(this, maze);
    this.spinView = new SpinRenderer(this);
    this.follow = new PivotCamera(this.cameras.main);
    const restart = () => {
      this.run.reset(performance.now());
      this.spinView.clearTrail();
      this.follow.reset(this.run.motion.pivotPosition);
      this.bestMs = getRecords().get(maze);
    };
    restart();
    this.hud = new RaceHud(root, {
      restart,
      selectCourse: (id) => this.scene.restart({ courseId: id }),
      openLab: () => this.scene.start("prototype"),
    });
    this.hud.setCourse(maze);
    const controls = new PointerControls(this, () =>
      this.run.press(performance.now()),
    );
    const interrupt = () => this.run.interrupt(performance.now());
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", interrupt);
    this.events.once("shutdown", () => {
      controls.destroy();
      this.hud.destroy();
      root.hidden = true;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", interrupt);
    });
  }
  update(_time: number, delta: number): void {
    const now = performance.now(),
      dt = Math.min(delta / 1000, 0.1);
    this.run.update(now);
    const m = this.run.motion,
      s = this.run.session;
    this.follow.update(m.pivotPosition, dt, 0.3, 0.7);
    this.spinView.draw(m, true, dt);
    if (s.status === "finished" && this.bestMs !== s.elapsedMs(now))
      this.bestMs = getRecords().get(this.run.maze);
    this.hud.update({
      status: s.status,
      elapsedMs: s.elapsedMs(now),
      bestMs: this.bestMs,
      courseTitle: this.run.maze.title,
    });
    this.hud.updatePosition({ x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 });
  }
}
