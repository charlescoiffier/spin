import Phaser from "phaser";
import { EditorDocument, type EditorTool } from "../editor/EditorDocument";
import { EditorPanel } from "../editor/EditorPanel";
import { newCourse } from "../editor/newCourse";
import { showPanel } from "../ui/appShell";
import { drawCourse, courseBounds } from "../rendering/drawCourse";
import { defaultTheme, colorNumber } from "../modes/maze/theme";
import { getCourseStore } from "../modes/maze/services";
import { courses } from "../modes/maze/courses";
import { validateMaze, parseMaze } from "../modes/maze/MazeDefinition";
import type { Point } from "../core/SpinMotion";
interface Gesture {
  tool: EditorTool;
  world: Point;
  screen: Point;
  scroll: Point;
}
export class EditorScene extends Phaser.Scene {
  private doc!: EditorDocument;
  private panel!: EditorPanel;
  private drawing!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Graphics;
  private gesture: Gesture | null = null;
  constructor() {
    super("editor");
  }
  init(data: { document?: EditorDocument } = {}): void {
    this.doc = data.document ?? new EditorDocument(newCourse());
    this.gesture = null;
  }
  create(): void {
    const root = showPanel("editor-ui", "Éditeur");
    this.drawing = this.add.graphics();
    this.ghost = this.add.graphics();
    const refresh = () => {
      this.redraw();
      this.panel?.update();
    };
    this.panel = new EditorPanel(root, this.doc, {
      changed: refresh,
      fit: () => this.fit(),
      zoom: (f) => {
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(this.cameras.main.zoom * f, 0.1, 2),
        );
      },
      save: () => {
        try {
          this.doc.markSaved(getCourseStore().save(this.doc.course));
          this.panel.setCourses([...courses, ...getCourseStore().list()]);
          this.panel.notice(
            getCourseStore().persisted
              ? "Parcours enregistré dans ce navigateur."
              : "Parcours gardé pour cette session. Exportez le JSON pour le conserver.",
          );
          this.panel.update();
        } catch (e) {
          this.panel.notice(
            e instanceof Error ? e.message : "Enregistrement impossible",
            true,
          );
        }
      },
      test: () => {
        if (!validateMaze(this.doc.course).length)
          this.scene.start("maze", {
            course: parseMaze(this.doc.course),
            editor: this.doc,
          });
      },
      new: () =>
        this.scene.restart({ document: new EditorDocument(newCourse()) }),
      load: (id) => {
        const m = [...courses, ...getCourseStore().list()].find(
          (c) => c.id === id,
        );
        if (m) this.scene.restart({ document: new EditorDocument(m) });
      },
      import: (raw) => {
        this.scene.restart({
          document: new EditorDocument(getCourseStore().importJson(raw)),
        });
      },
      export: () => {
        const m = parseMaze(this.doc.course),
          url = URL.createObjectURL(
            new Blob([JSON.stringify(m, null, 2)], {
              type: "application/json",
            }),
          );
        const a = document.createElement("a");
        a.href = url;
        a.download = `${m.title.replace(/[^a-z0-9_-]/gi, "-") || "parcours"}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      back: () => this.scene.start("maze", {}),
    });
    this.panel.setCourses([...courses, ...getCourseStore().list()]);
    this.redraw();
    this.fit();
    this.input.on("pointerdown", this.down, this);
    this.input.on("pointermove", this.move, this);
    this.input.on("pointerup", this.up, this);
    this.input.on("pointerupoutside", this.up, this);
    this.input.on("wheel", this.wheel, this);
    this.events.once("shutdown", () => {
      this.panel.destroy();
      root.hidden = true;
      this.input.off("pointerdown", this.down, this);
      this.input.off("pointermove", this.move, this);
      this.input.off("pointerup", this.up, this);
      this.input.off("pointerupoutside", this.up, this);
      this.input.off("wheel", this.wheel, this);
    });
  }
  private point(p: Phaser.Input.Pointer): Point {
    const v = this.cameras.main.getWorldPoint(p.x, p.y);
    return {
      x: Phaser.Math.Clamp(v.x, -7800, 7800),
      y: Phaser.Math.Clamp(v.y, -7800, 7800),
    };
  }
  private down(p: Phaser.Input.Pointer): void {
    if (this.gesture || (!p.leftButtonDown() && !p.middleButtonDown())) return;
    const world = this.point(p),
      c = this.cameras.main,
      tool = p.middleButtonDown() ? "pan" : this.doc.tool;
    this.gesture = {
      tool,
      world,
      screen: { x: p.x, y: p.y },
      scroll: { x: c.scrollX, y: c.scrollY },
    };
    if (tool === "select") {
      this.doc.selectAt(world);
      this.panel.update();
      this.redraw();
    }
  }
  private move(p: Phaser.Input.Pointer): void {
    const g = this.gesture;
    if (!g || !p.isDown) return;
    const c = this.cameras.main;
    if (g.tool === "pan") {
      c.setScroll(
        g.scroll.x - (p.x - g.screen.x) / c.zoom,
        g.scroll.y - (p.y - g.screen.y) / c.zoom,
      );
      return;
    }
    const q = this.point(p);
    this.ghost.clear().lineStyle(2, 0xffbc79, 1);
    if (g.tool === "wall")
      this.ghost.strokeRect(
        Math.min(q.x, g.world.x),
        Math.min(q.y, g.world.y),
        Math.max(40, Math.abs(q.x - g.world.x)),
        Math.max(40, Math.abs(q.y - g.world.y)),
      );
    if (g.tool === "select") {
      const r = this.doc.selectedRect();
      if (r)
        this.ghost.strokeRect(
          r.x + q.x - g.world.x,
          r.y + q.y - g.world.y,
          r.width,
          r.height,
        );
    }
  }
  private up(p: Phaser.Input.Pointer): void {
    const g = this.gesture;
    if (!g) return;
    this.gesture = null;
    this.ghost.clear();
    const q = this.point(p);
    try {
      switch (g.tool) {
        case "wall":
          this.doc.addWall(
            g.world,
            Math.hypot(p.x - g.screen.x, p.y - g.screen.y) < 5
              ? { x: g.world.x + 80, y: g.world.y + 80 }
              : q,
          );
          break;
        case "spawn":
          this.doc.placeSpawn(q);
          break;
        case "exit":
          this.doc.placeExit(q);
          break;
        case "select":
          if (Math.hypot(p.x - g.screen.x, p.y - g.screen.y) < 4) break;
          this.doc.moveSelected({ x: q.x - g.world.x, y: q.y - g.world.y });
          break;
      }
    } catch (e) {
      this.panel.notice(
        e instanceof Error ? e.message : "Modification impossible",
        true,
      );
    }
    this.redraw();
    this.panel.update();
  }
  private wheel(
    _p: Phaser.Input.Pointer,
    _objects: unknown[],
    _dx: number,
    dy: number,
  ): void {
    this.cameras.main.setZoom(
      Phaser.Math.Clamp(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1), 0.1, 2),
    );
  }
  private fit(): void {
    const b = courseBounds(this.doc.course),
      c = this.cameras.main;
    c.setZoom(
      Phaser.Math.Clamp(
        Math.min(
          c.width / (b.right - b.left + 160),
          c.height / (b.bottom - b.top + 160),
        ),
        0.1,
        1.2,
      ),
    );
    c.centerOn((b.left + b.right) / 2, (b.top + b.bottom) / 2);
  }
  private redraw(): void {
    const t = { ...defaultTheme, ...this.doc.course.theme };
    this.cameras.main.setBackgroundColor(colorNumber(t.background));
    this.drawing.clear();
    drawCourse(this.drawing, this.doc.course, true);
    const r = this.doc.selectedRect();
    if (r)
      this.drawing
        .lineStyle(3, 0xffbc79)
        .strokeRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8);
  }
}
