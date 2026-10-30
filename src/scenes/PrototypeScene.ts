import Phaser from "phaser";
import { SpinMotion } from "../core/SpinMotion";
import { defaults } from "../core/settings";
import { PivotCamera } from "../camera/PivotCamera";
import { PointerControls } from "../input/PointerControls";
import { SpinRenderer } from "../rendering/SpinRenderer";
import { createTestEnvironment } from "../environment/TestEnvironment";
import { CollisionMotion } from "../collision/CollisionMotion";
import { FixedStepper } from "../core/FixedStepper";
import { getContacts } from "../collision/geometry";
import { DebugPanel } from "../debug/DebugPanel";
import { showPanel } from "../ui/appShell";
export class PrototypeScene extends Phaser.Scene {
  private motion = new SpinMotion(defaults.length, defaults.speed);
  private settings = { ...defaults };
  private spinView!: SpinRenderer;
  private follow!: PivotCamera;
  private collisions!: CollisionMotion;
  private stepper = new FixedStepper();
  private panel!: DebugPanel;
  constructor() {
    super("prototype");
  }
  create(): void {
    showPanel("debug", "Laboratoire");
    this.cameras.main.setBackgroundColor("#101820");
    const walls = createTestEnvironment(this);
    this.collisions = new CollisionMotion(this.motion, walls);
    this.collisions.setRecoilDistance(this.settings.recoilDistance);
    this.stepper.reset(performance.now());
    this.spinView = new SpinRenderer(this);
    this.follow = new PivotCamera(this.cameras.main);
    this.follow.reset(this.motion.pivotPosition);
    const controls = new PointerControls(this, () =>
      this.stepper.enqueuePress(performance.now()),
    );
    const reset = () => {
      this.motion.angularSpeed = this.settings.speed;
      this.motion.setLength(this.settings.length);
      this.motion.reset();
      this.collisions.setRecoilDistance(this.settings.recoilDistance);
      this.collisions.reset();
      this.stepper.reset(performance.now());
      this.spinView.clearTrail();
      this.follow.reset(this.motion.pivotPosition);
    };
    this.panel = new DebugPanel(
      document.getElementById("debug")!,
      this.settings,
      (key) => {
        if (key === "recoilDistance")
          this.collisions.setRecoilDistance(this.settings.recoilDistance);
        if (key === "speed") this.motion.angularSpeed = this.settings.speed;
        if (key === "length") {
          const before = this.motion.snapshot();
          this.motion.setLength(this.settings.length);
          if (
            getContacts(this.motion.a, this.motion.b, 17, 3.5, walls).length
          ) {
            this.motion.restore(before);
            this.settings.length = before.length;
          }
          this.collisions.reset();
          this.stepper.reset(performance.now());
          this.spinView.clearTrail();
        }
        if (key === "trail") this.spinView.clearTrail();
      },
      reset,
    );
    const back = document.createElement("button");
    back.textContent = "Jouer aux labyrinthes";
    back.addEventListener("click", () => this.scene.start("maze", {}), {
      once: true,
    });
    const editor = document.createElement("button");
    editor.textContent = "Éditeur de parcours";
    editor.addEventListener("click", () => this.scene.start("editor", {}), {
      once: true,
    });
    document.getElementById("debug")!.append(editor, back);
    this.events.once("shutdown", () => {
      controls.destroy();
      this.panel.destroy();
    });
  }
  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const now = performance.now();
    if (
      !this.stepper.advance(
        now,
        () => this.motion.switchPivot(),
        (step) => this.collisions.step(step),
      )
    )
      this.stepper.reset(now);
    this.follow.update(
      this.motion.pivotPosition,
      dt,
      this.settings.smoothing,
      this.settings.zoom,
    );
    this.spinView.draw(this.motion, this.settings.trail, dt);
    this.panel.update(this.motion);
  }
}
