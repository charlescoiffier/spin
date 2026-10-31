import { EditorDocument, type EditorTool } from "./EditorDocument";
import { validateMaze, type FinishMode } from "../modes/maze/MazeDefinition";
import { defaultTheme, type CourseTheme } from "../modes/maze/theme";
import type { MazeDefinition } from "../modes/maze/MazeDefinition";
export class EditorPanel {
  private controller = new AbortController();
  constructor(
    private root: HTMLElement,
    private doc: EditorDocument,
    callbacks: {
      changed: () => void;
      save: () => void;
      test: () => void;
      fit: () => void;
      zoom: (factor: number) => void;
      new: () => void;
      load: (id: string) => void;
      import: (raw: string) => void;
      export: () => void;
      back: () => void;
    },
  ) {
    root.innerHTML = `<h1>Éditeur de parcours</h1><label>Nom du parcours<input class="course-name" maxlength="80"></label><div class="editor-tools" aria-label="Outils"><button data-tool="select">Sélection</button><button data-tool="wall">Dessiner un mur</button><button data-tool="spawn">Placer le départ</button><button data-tool="exit">Placer l’arrivée</button><button data-tool="pan">Déplacer la vue</button></div><p class="editor-help">Dessinez par glissement. Sélectionnez un élément pour le déplacer. Grille : 20 px.</p><div class="button-row"><button class="undo">Annuler</button><button class="redo">Rétablir</button></div><fieldset><legend>Élément sélectionné</legend><div class="button-row"><label>Largeur<input class="object-width" type="number" min="24" max="4000" step="20"></label><label>Hauteur<input class="object-height" type="number" min="24" max="4000" step="20"></label></div><button class="delete">Supprimer le mur</button></fieldset><label>Nombre de départs<input class="spawn-count" type="number" min="1" max="4" step="1"></label><label>Départ à modifier<select class="spawn-index"><option value="0">1</option><option value="1">2</option><option value="2">3</option><option value="3">4</option></select></label><label>Orientation du départ (degrés)<input class="angle" type="number" step="15" min="-360" max="360"></label><label>Condition d’arrivée<select class="finish-mode"><option value="pivot">Une boule pivot immobile dans la zone</option><option value="whole">L’ensemble dans la zone</option><option value="touch">Une cible à toucher (boule ou barre)</option></select></label><details class="colors"><summary>Couleurs du décor</summary></details><div class="button-row"><button class="zoom-out" aria-label="Dézoomer">−</button><button class="fit">Cadrer</button><button class="zoom-in" aria-label="Zoomer">+</button></div><p class="editor-errors" role="status"></p><p class="editor-notice" role="status"></p><button class="test primary">Tester le parcours</button><button class="save">Enregistrer le parcours</button><label>Charger un parcours<select class="load-course"><option value="">Choisir…</option></select></label><button class="new-course">Nouveau parcours</button><div class="button-row"><label class="file-button">Importer JSON<input class="import-file" type="file" accept=".json,application/json"></label><button class="export">Exporter JSON</button></div><button class="back">Retour aux parcours</button>`;
    const oldArrival = root.querySelector<HTMLOptionElement>('.finish-mode option[value="pivot"]')!;
    if (doc.course.finishMode !== 'pivot') oldArrival.remove();
    else { oldArrival.textContent = 'Ancienne arrivée : pivot seul (à convertir)'; oldArrival.disabled = true; }
    const signal = this.controller.signal,
      act = (selector: string, fn: () => void) =>
        root.querySelector(selector)!.addEventListener("click", fn, { signal });
    root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) =>
      b.addEventListener(
        "click",
        () => {
          doc.tool = b.dataset.tool as EditorTool;
          callbacks.changed();
        },
        { signal },
      ),
    );
    const change = (selector: string, fn: (value: string) => void) =>
      root.querySelector<HTMLInputElement>(selector)!.addEventListener(
        [".course-name", ".angle", ".object-width", ".object-height", ".spawn-count"].includes(
          selector,
        )
          ? "input"
          : "change",
        (e) => {
          fn((e.target as HTMLInputElement).value);
          callbacks.changed();
        },
        { signal },
      );
    change(".course-name", (v) => doc.setTitle(v));
    change(".spawn-count", v => doc.setRaceSpawnCount(Number(v)));
    change(".spawn-index", v => { doc.activeSpawnIndex = Math.min(Number(v), (doc.course.raceSpawns?.length ?? 1) - 1); });
    change(".angle", (v) => {
      if (Number.isFinite(Number(v))) doc.setSpawnAngle(Number(v));
    });
    change(".finish-mode", (v) => doc.setFinishMode(v as FinishMode));
    const resize = () => {
      const w = Number(
          root.querySelector<HTMLInputElement>(".object-width")!.value,
        ),
        h = Number(
          root.querySelector<HTMLInputElement>(".object-height")!.value,
        );
      if (Number.isFinite(w) && Number.isFinite(h)) doc.resizeSelected(w, h);
    };
    change(".object-width", resize);
    change(".object-height", resize);
    act(".delete", () => {
      doc.deleteSelected();
      callbacks.changed();
    });
    act(".undo", () => {
      doc.undo();
      callbacks.changed();
    });
    act(".redo", () => {
      doc.redo();
      callbacks.changed();
    });
    for (const [selector, fn] of [
      [".save", callbacks.save],
      [".test", callbacks.test],
      [".fit", callbacks.fit],
      [".zoom-in", () => callbacks.zoom(1.2)],
      [".zoom-out", () => callbacks.zoom(1 / 1.2)],
      [".new-course", callbacks.new],
      [".export", callbacks.export],
      [".back", callbacks.back],
    ] as const)
      act(selector, fn);
    change(".load-course", (id) => {
      if (id) callbacks.load(id);
    });
    root.querySelector<HTMLInputElement>(".import-file")!.addEventListener(
      "change",
      async (e) => {
        const input = e.target as HTMLInputElement,
          file = input.files?.[0];
        try {
          if (file) {
            if (file.size > 1000000)
              throw Error("Fichier trop volumineux (maximum 1 Mo)");
            callbacks.import(await file.text());
          }
        } catch (error) {
          this.notice(
            error instanceof Error ? error.message : "Import impossible",
            true,
          );
        }
        input.value = "";
      },
      { signal },
    );
    const labels: Record<keyof CourseTheme, string> = {
      background: "Fond",
      grid: "Quadrillage",
      wallFill: "Remplissage des blocs",
      wallOutline: "Contours des blocs",
      exitFill: "Remplissage de l’arrivée",
      exitOutline: "Contour de l’arrivée",
      start: "Départ",
    };
    for (const key of Object.keys(defaultTheme) as (keyof CourseTheme)[]) {
      const label = document.createElement("label");
      label.className = "color-control";
      label.textContent = labels[key];
      const input = document.createElement("input");
      input.type = "color";
      input.dataset.color = key;
      input.setAttribute("aria-label", labels[key]);
      input.addEventListener(
        "input",
        () => {
          doc.setTheme(key, input.value);
          callbacks.changed();
        },
        { signal },
      );
      label.append(input);
      root.querySelector(".colors")!.append(label);
    }
    this.update();
  }
  setCourses(list: readonly MazeDefinition[]): void {
    const select = this.root.querySelector<HTMLSelectElement>(".load-course")!;
    while (select.options.length > 1) select.remove(1);
    for (const m of list) {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.title;
      select.append(o);
    }
  }
  update(): void {
    const set = (selector: string, value: string) => {
      const input = this.root.querySelector<HTMLInputElement>(selector)!;
      if (document.activeElement !== input) input.value = value;
    };
    set(".course-name", this.doc.course.title);
    set(".spawn-count", String(this.doc.course.raceSpawns?.length ?? 1));
    set(".spawn-index", String(this.doc.activeSpawnIndex));
    for (const option of Array.from(this.root.querySelector<HTMLSelectElement>(".spawn-index")!.options)) option.disabled = Number(option.value) >= (this.doc.course.raceSpawns?.length ?? 1);
    set(
      ".angle",
      String(Math.round((this.doc.activeSpawn.angle * 180) / Math.PI)),
    );
    set(".finish-mode", this.doc.course.finishMode ?? "whole");
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-tool]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.tool === this.doc.tool),
        ),
      );
    const r = this.doc.selectedRect();
    for (const [selector, value] of [
      [".object-width", r?.width],
      [".object-height", r?.height],
    ] as const) {
      const input = this.root.querySelector<HTMLInputElement>(selector)!;
      input.disabled = !r;
      if (document.activeElement !== input)
        input.value = value === undefined ? "" : String(value);
    }
    this.root.querySelector<HTMLButtonElement>(".delete")!.disabled =
      !this.doc.selected || ["spawn", "exit"].includes(this.doc.selected);
    this.root.querySelector<HTMLButtonElement>(".undo")!.disabled =
      !this.doc.canUndo;
    this.root.querySelector<HTMLButtonElement>(".redo")!.disabled =
      !this.doc.canRedo;
    for (const input of Array.from(
      this.root.querySelectorAll<HTMLInputElement>("[data-color]"),
    ))
      input.value =
        this.doc.course.theme![input.dataset.color as keyof CourseTheme];
    const errors = validateMaze(this.doc.course);
    this.root.querySelector(".editor-errors")!.textContent = errors.length
      ? errors.join(" · ")
      : "Parcours valide. Testez-le pour vérifier ses passages.";
    for (const selector of [".save", ".test", ".export"])
      this.root.querySelector<HTMLButtonElement>(selector)!.disabled =
        errors.length > 0;
  }
  notice(text: string, error = false): void {
    const p = this.root.querySelector<HTMLElement>(".editor-notice");
    if (!p) return;
    p.textContent = text;
    p.dataset.error = String(error);
  }
  destroy(): void {
    this.controller.abort();
    this.root.replaceChildren();
  }
}
