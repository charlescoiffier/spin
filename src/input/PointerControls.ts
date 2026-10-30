import Phaser from "phaser";
export class PointerControls {
  constructor(
    private scene: Phaser.Scene,
    private onPress: () => void,
  ) {
    scene.input.on("pointerdown", this.press, this);
  }
  private press(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown()) this.onPress();
  }
  destroy(): void {
    this.scene.input.off("pointerdown", this.press, this);
  }
}
