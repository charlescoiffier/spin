import type { RaceStatus } from "../modes/maze/RaceSession";
import { courses } from "../modes/maze/courses";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import type { Point } from "../core/SpinMotion";
export function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}
export class RaceHud {
  private controller = new AbortController();
  private timer: HTMLElement;
  private best: HTMLElement;
  private message: HTMLElement;
  private marker: SVGCircleElement | null = null;
  private lastStatus: RaceStatus | null = null;
  constructor(
    private root: HTMLElement,
    callbacks: {
      restart: () => void;
      selectCourse: (id: string) => void;
      openLab: () => void;
    },
  ) {
    root.innerHTML = `<div class="race-heading">Contre-la-montre</div><h1 class="course-title"></h1><div class="race-clock"><span>Votre temps</span><strong class="timer">0.00 s</strong><span class="best"></span></div><p class="race-message" role="status"></p><button class="restart primary">Recommencer</button><div class="course-list" aria-label="Choisir un parcours"></div><div class="course-overview" aria-label="Carte du parcours"></div><p class="race-rules">Touchez pour changer de pivot.<br>Les murs vous font rebondir.<br>Amenez les deux boules dans la sortie.</p><button class="open-lab">Ouvrir le laboratoire</button>`;
    this.timer = root.querySelector(".timer")!;
    this.best = root.querySelector(".best")!;
    this.message = root.querySelector(".race-message")!;
    root
      .querySelector(".restart")!
      .addEventListener("click", callbacks.restart, {
        signal: this.controller.signal,
      });
    root
      .querySelector(".open-lab")!
      .addEventListener("click", callbacks.openLab, {
        signal: this.controller.signal,
      });
    const list = root.querySelector(".course-list")!;
    courses.forEach((course) => {
      const button = document.createElement("button");
      button.textContent = course.title;
      button.dataset.course = course.id;
      button.addEventListener(
        "click",
        () => callbacks.selectCourse(course.id),
        { signal: this.controller.signal },
      );
      list.append(button);
    });
  }
  setCourse(maze: MazeDefinition): void {
    const width = Math.max(...maze.walls.map((w) => w.x + w.width)),
      height = Math.max(...maze.walls.map((w) => w.y + w.height));
    const e = maze.exit;
    this.root.querySelector(".course-overview")!.innerHTML =
      `<svg viewBox="-20 -20 ${width + 40} ${height + 40}" role="img" aria-label="Plan du labyrinthe : point abricot pour votre position, zone menthe pour la sortie"><rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="#7ce5c2" opacity=".6"/>${maze.walls.map((w) => `<rect x="${w.x}" y="${w.y}" width="${w.width}" height="${w.height}" fill="#8ba8b8"/>`).join("")}<circle class="position" r="22" fill="#ffbc79"/></svg>`;
    this.marker = this.root.querySelector(".position");
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-course]")
      .forEach((button) => {
        const active = button.dataset.course === maze.id;
        button.setAttribute("aria-pressed", String(active));
      });
  }
  updatePosition(point: Point): void {
    this.marker?.setAttribute("cx", String(point.x));
    this.marker?.setAttribute("cy", String(point.y));
  }
  update(view: {
    status: RaceStatus;
    elapsedMs: number;
    bestMs: number | null;
    courseTitle: string;
  }): void {
    this.timer.textContent = formatTime(view.elapsedMs);
    this.best.textContent =
      view.bestMs === null
        ? "Aucun record pour le moment"
        : `Meilleur temps : ${formatTime(view.bestMs)}`;
    this.root.querySelector(".course-title")!.textContent = view.courseTitle;
    if (this.lastStatus !== view.status) {
      this.lastStatus = view.status;
      this.message.textContent = {
        ready: "Touchez le terrain pour démarrer.",
        running: "Rejoignez la zone menthe.",
        finished: "Arrivée ! Rejouez pour améliorer votre temps.",
        interrupted: "Tentative interrompue. Recommencez pour un temps valide.",
      }[view.status];
      this.root.dataset.status = view.status;
    }
  }
  destroy(): void {
    this.controller.abort();
    this.root.replaceChildren();
  }
}
