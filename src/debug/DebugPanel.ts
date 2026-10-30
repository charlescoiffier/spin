import type { SpinMotion } from "../core/SpinMotion";
import { defaults, type Settings } from "../core/settings";
export class DebugPanel {
  private status: HTMLElement;
  private controller = new AbortController();
  constructor(
    private root: HTMLElement,
    settings: Settings,
    onChange: (key: keyof Settings) => void,
    reset: () => void,
  ) {
    root.innerHTML = `<div class="panel-heading"><span>ATELIER DE TEST</span><span class="live">● LIVE</span></div><h1>Le mouvement,<br>en équilibre.</h1><p class="intro">Alternez les points d’ancrage pour explorer le terrain.</p><div id="status" class="status" aria-live="polite"></div><h2>PARAMÈTRES</h2>`;
    this.status = root.querySelector("#status")!;
    const syncControls: (() => void)[] = [];
    const ranges: [
      keyof Omit<Settings, "trail">,
      string,
      number,
      number,
      number,
      string,
    ][] = [
      ["speed", "Vitesse angulaire", 0, 6, 0.1, "rad/s"],
      ["length", "Longueur de barre", 60, 280, 1, "px"],
      ["zoom", "Zoom caméra", 0.4, 2, 0.05, "×"],
      ["smoothing", "Lissage caméra", 0, 1.5, 0.05, "s"],
    ];
    ranges.forEach(([key, title, min, max, step, unit]) => {
      const label = document.createElement("label");
      label.className = "control";
      label.innerHTML = `<span>${title}<output></output></span><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${title}">`;
      const input = label.querySelector("input")!,
        output = label.querySelector("output")!;
      const sync = () => {
        input.value = String(settings[key]);
        output.value = `${Number(settings[key].toFixed(2))} ${unit}`;
      };
      syncControls.push(sync);
      sync();
      input.addEventListener(
        "input",
        () => {
          settings[key] = Number(input.value);
          onChange(key);
          sync();
        },
        { signal: this.controller.signal },
      );
      root.append(label);
    });
    const toggle = document.createElement("label");
    toggle.className = "toggle";
    toggle.innerHTML =
      '<span>Afficher la trajectoire</span><input type="checkbox" checked>';
    toggle.querySelector("input")!.addEventListener(
      "change",
      (e) => {
        settings.trail = (e.target as HTMLInputElement).checked;
        onChange("trail");
      },
      { signal: this.controller.signal },
    );
    root.append(toggle);
    const button = document.createElement("button");
    button.textContent = "↺ Réinitialiser le prototype";
    button.addEventListener(
      "click",
      () => {
        Object.assign(settings, defaults);
        reset();
        syncControls.forEach((sync) => sync());
        toggle.querySelector("input")!.checked = settings.trail;
      },
      { signal: this.controller.signal },
    );
    root.append(button);
    const foot = document.createElement("p");
    foot.className = "note";
    foot.textContent =
      "A · menthe / B · abricot\nMurs avec rebond · trajectoire du centre\nLissage : constante de temps (0 = immédiat).";
    root.append(foot);
  }
  update(m: SpinMotion): void {
    this.status.textContent = `PIVOT ${m.pivot}   ·   ${m.direction === 1 ? "↻ HORAIRE" : "↺ ANTIHORAIRE"}`;
  }
  destroy(): void {
    this.controller.abort();
    this.root.replaceChildren();
  }
}
