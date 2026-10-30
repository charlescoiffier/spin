import Phaser from "phaser";
import { MazeRun } from "../modes/maze/MazeRun";
import { courses } from "../modes/maze/courses";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import { MazeRenderer } from "../rendering/MazeRenderer";
import { SpinRenderer } from "../rendering/SpinRenderer";
import { PivotCamera } from "../camera/PivotCamera";
import { PointerControls } from "../input/PointerControls";
import { RaceHud } from "../ui/RaceHud";
import { showPanel } from "../ui/appShell";
import { getRecords, getCourseStore } from "../modes/maze/services";
import { EditorDocument } from "../editor/EditorDocument";
export class MazeScene extends Phaser.Scene {
  private courseId = courses[0].id;
  private custom?: MazeDefinition;
  private editor?: EditorDocument;
  private run!: MazeRun;
  private spinView!: SpinRenderer;
  private follow!: PivotCamera;
  private hud!: RaceHud;
  private finished = false;
  constructor() {
    super("maze");
  }
  init(
    data: {
      courseId?: string;
      course?: MazeDefinition;
      editor?: EditorDocument;
    } = {},
  ): void {
    this.courseId = data.courseId ?? courses[0].id;
    this.custom = data.course;
    this.editor = data.editor;
    this.finished = false;
  }
  create(): void {
    const list = [...courses, ...getCourseStore().list()],
      maze =
        this.custom ?? list.find((c) => c.id === this.courseId) ?? courses[0],
      root = showPanel("race-ui", this.editor ? "Essai" : "Parcours");
    this.run = new MazeRun(maze, getRecords(), false);
    new MazeRenderer(this, maze);
    this.spinView = new SpinRenderer(this);
    this.follow = new PivotCamera(this.cameras.main);
    const restart = () => {
      this.run.reset(performance.now());
      this.spinView.clearTrail();
      this.follow.reset(this.run.motion.pivotPosition);
      this.finished = false;
    };
    restart();
    this.hud = new RaceHud(root, {
      restart,
      selectCourse: (id) => this.scene.restart({ courseId: id }),
      openLab: () => this.scene.start("prototype", {}),
      openEditor: () =>
        this.scene.start("editor", {
          document: this.editor ?? new EditorDocument(maze),
        }),
      courseList: this.editor ? [] : list,
      preview: !!this.editor,
    });
    this.hud.setCourse(maze);
    this.hud.setPodium(getRecords().top(maze));
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
    this.hud.update({ status: s.status, elapsedMs: s.elapsedMs(now) });
    this.hud.updatePosition({ x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 });
    if (s.status === "finished" && !this.finished) {
      this.finished = true;
      const time = s.elapsedMs(now);
      if (!this.editor && getRecords().qualifies(this.run.maze, time))
        this.hud.requestName((name) => {
          getRecords().submitNamed(this.run.maze, time, name);
          this.hud.setPodium(getRecords().top(this.run.maze));
        });
    }
  }
}
