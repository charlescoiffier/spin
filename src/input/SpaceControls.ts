/** One action per physical press, without stealing space from focused UI controls. */
export class SpaceControls {
  constructor(
    private target: EventTarget,
    private onPress: () => void,
  ) {
    target.addEventListener("keydown", this.keydown);
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
    const element = key.target as Element | null;
    if (
      element?.closest?.(
        "input, textarea, select, button, a, [contenteditable], [role=button], [role=slider]",
      )
    )
      return;
    key.preventDefault();
    if (!key.repeat) this.onPress();
  };
  destroy(): void {
    this.target.removeEventListener("keydown", this.keydown);
  }
}
