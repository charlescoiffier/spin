/** Space always spins during play, except while entering text. */
export class SpaceControls {
  constructor(
    private target: EventTarget,
    private onPress: () => void,
  ) {
    target.addEventListener("keydown", this.keydown, { capture: true });
  }
  private keydown = (event: Event): void => {
    const key = event as KeyboardEvent;
    if (
      key.code !== "Space" ||
      key.altKey ||
      key.ctrlKey ||
      key.metaKey ||
      key.shiftKey ||
      key.isComposing ||
      key.defaultPrevented
    )
      return;
    const element = key.target as HTMLElement | null;
    const tag = element?.tagName;
    const typing =
      element?.isContentEditable ||
      tag === "TEXTAREA" ||
      (tag === "INPUT" &&
        ["text", "search", "email", "password", "url", "tel"].includes(
          (element as HTMLInputElement).type,
        ));
    if (typing) return;
    key.preventDefault();
    if (!key.repeat) this.onPress();
  };
  destroy(): void {
    this.target.removeEventListener("keydown", this.keydown, { capture: true });
  }
}
