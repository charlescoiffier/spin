import type { RaceStatus } from "../modes/maze/RaceSession";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
import type { Point } from "../core/SpinMotion";
import type { ScoreEntry } from "../modes/maze/RecordStore";
import { defaultTheme } from "../modes/maze/theme";
import { courseBounds } from "../rendering/drawCourse";
import { wallOutline } from "../rendering/wallOutline";
export const formatTime = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
export class RaceHud {
  private controller = new AbortController();
  private pending: ((name: string) => void) | null = null;
  private lastStatus: RaceStatus | null = null;
  constructor(
    private root: HTMLElement,
    callbacks: {
      restart: () => void;
      selectCourse: (id: string) => void;
      openLab: () => void;
      openEditor: () => void;
      courseList: readonly MazeDefinition[];
      preview?: boolean;
    },
  ) {
    root.innerHTML = `<div class="race-heading">${callbacks.preview ? "Essai du parcours" : "Contre-la-montre"}</div><h1 class="course-title"></h1><div class="race-clock"><span>Votre temps</span><strong class="timer">0.00 s</strong><span class="best"></span></div><p class="race-message" role="status"></p><form class="score-form" hidden><label>Votre nom<input name="player" maxlength="24" autocomplete="nickname" required></label><button class="primary" type="submit">Enregistrer le temps</button><button type="button" class="skip-name">Passer (Anonyme)</button></form><button class="restart primary">Recommencer</button><section class="podium"><h2>Les trois meilleurs temps</h2><ol></ol><small>Enregistrés dans ce navigateur</small></section><div class="course-list" aria-label="Choisir un parcours"></div><div class="course-overview" aria-label="Carte du parcours"></div><p class="race-rules"></p><button class="open-editor">${callbacks.preview ? "Retour à l’éditeur" : "Éditeur de parcours"}</button><button class="open-lab">Laboratoire</button>`;
    const signal = this.controller.signal;
    root.querySelector(".restart")!.addEventListener(
      "click",
      () => {
        this.pending = null;
        root.querySelector<HTMLElement>(".score-form")!.hidden = true;
        callbacks.restart();
      },
      { signal },
    );
    root
      .querySelector(".open-editor")!
      .addEventListener("click", callbacks.openEditor, { signal });
    root
      .querySelector(".open-lab")!
      .addEventListener("click", callbacks.openLab, { signal });
    for (const m of callbacks.courseList) {
      const b = document.createElement("button");
      b.textContent = m.title;
      b.dataset.course = m.id;
      b.addEventListener("click", () => callbacks.selectCourse(m.id), {
        signal,
      });
      root.querySelector(".course-list")!.append(b);
    }
    const form = root.querySelector<HTMLFormElement>("form")!,
      input = form.querySelector("input")!;
    const save = (name: string) => {
      if (!this.pending) return;
      const callback = this.pending;
      this.pending = null;
      form.hidden = true;
      callback(name);
    };
    form.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        if (!input.value.trim()) {
          input.setCustomValidity("Indiquez votre nom");
          input.reportValidity();
          return;
        }
        save(input.value.trim());
      },
      { signal },
    );
    input.addEventListener("input", () => input.setCustomValidity(""), {
      signal,
    });
    root
      .querySelector(".skip-name")!
      .addEventListener("click", () => save("Anonyme"), { signal });
  }
  setCourse(m: MazeDefinition): void {
    this.root.querySelector(".course-title")!.textContent = m.title;
    const t = { ...defaultTheme, ...m.theme },
      b = courseBounds(m),
      e = m.exit,
      ns = "http://www.w3.org/2000/svg",
      svg = document.createElementNS(ns, "svg");
    svg.setAttribute(
      "viewBox",
      `${b.left - 20} ${b.top - 20} ${b.right - b.left + 40} ${b.bottom - b.top + 40}`,
    );
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "Plan du parcours : point pour votre position et zone d’arrivée",
    );
    const goal = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      fill: t.exitFill,
    }))
      goal.setAttribute(k, String(v));
    svg.append(goal);
    for (const w of m.walls) {
      const r = document.createElementNS(ns, "rect");
      for (const [k, v] of Object.entries({
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        fill: t.wallFill,
      }))
        r.setAttribute(k, String(v));
      svg.append(r);
    }
    const path = document.createElementNS(ns, "path");
    path.setAttribute(
      "d",
      wallOutline(m.walls)
        .map((s) => `M${s.a.x},${s.a.y}L${s.b.x},${s.b.y}`)
        .join(""),
    );
    path.setAttribute("stroke", t.wallOutline);
    path.setAttribute("stroke-width", "8");
    path.setAttribute("fill", "none");
    svg.append(path);
    const marker = document.createElementNS(ns, "circle");
    marker.classList.add("position");
    marker.setAttribute("r", "22");
    marker.setAttribute("fill", "#ffbc79");
    svg.append(marker);
    this.root.querySelector(".course-overview")!.replaceChildren(svg);
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-course]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.course === m.id),
        ),
      );
    this.root.querySelector(".race-rules")!.textContent = {
      whole: "Placez les deux boules entièrement dans la zone d’arrivée.",
      pivot: "Immobilisez la boule pivot entièrement dans la zone d’arrivée.",
      touch: "Touchez la cible avec une boule ou la barre.",
    }[m.finishMode ?? "whole"];
  }
  setPodium(entries: ScoreEntry[]): void {
    const ol = this.root.querySelector(".podium ol")!;
    ol.replaceChildren();
    for (let i = 0; i < 3; i++) {
      const li = document.createElement("li"),
        name = document.createElement("span"),
        time = document.createElement("strong");
      name.textContent = entries[i]?.name ?? "—";
      time.textContent = entries[i] ? formatTime(entries[i].timeMs) : "—";
      li.append(name, time);
      ol.append(li);
    }
    this.root.querySelector(".best")!.textContent = entries[0]
      ? `Record : ${formatTime(entries[0].timeMs)}`
      : "Aucun temps enregistré";
  }
  requestName(submit: (name: string) => void): void {
    this.pending = submit;
    const form = this.root.querySelector<HTMLFormElement>("form")!;
    form.hidden = false;
    form.reset();
    document.getElementById("app")!.classList.remove("panel-collapsed");
    const toggle = document.getElementById("panel-toggle")!;
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "Masquer le panneau";
    requestAnimationFrame(() => {
      form.scrollIntoView({ block: "nearest" });
      form.querySelector("input")!.focus({ preventScroll: true });
    });
  }
  updatePosition(p: Point): void {
    const marker = this.root.querySelector(".position");
    marker?.setAttribute("cx", String(p.x));
    marker?.setAttribute("cy", String(p.y));
  }
  update(view: { status: RaceStatus; elapsedMs: number }): void {
    this.root.querySelector(".timer")!.textContent = formatTime(view.elapsedMs);
    if (view.status !== this.lastStatus) {
      this.lastStatus = view.status;
      this.root.dataset.status = view.status;
      this.root.querySelector(".race-message")!.textContent = {
        ready: "Touchez le terrain ou appuyez sur espace pour démarrer.",
        running: "Rejoignez l’arrivée.",
        finished: "Arrivée ! Rejouez pour améliorer votre temps.",
        interrupted: "Tentative interrompue. Recommencez pour un temps valide.",
      }[view.status];
    }
  }
  destroy(): void {
    this.controller.abort();
    this.root.replaceChildren();
  }
}
