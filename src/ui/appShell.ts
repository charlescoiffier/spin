export function showPanel(
  id: "debug" | "race-ui" | "editor-ui",
  mode: string,
): HTMLElement {
  document.querySelectorAll<HTMLElement>(".side-panel").forEach((el) => {
    el.hidden = el.id !== id;
  });
  document.querySelector("header small")!.textContent = mode;
  document.getElementById("app")!.dataset.mode = id;
  return document.getElementById(id)!;
}
export function setupPanelToggle(onResize: () => void): void {
  const app = document.getElementById("app")!,
    button = document.getElementById("panel-toggle")!;
  button.addEventListener("click", () => {
    const hidden = app.classList.toggle("panel-collapsed");
    button.setAttribute("aria-expanded", String(!hidden));
    button.textContent = hidden ? "Afficher le panneau" : "Masquer le panneau";
    requestAnimationFrame(onResize);
  });
}
