import type Phaser from "phaser";
import { SpaceControls } from "./SpaceControls";
export class PointerControls {
  private keyboard: SpaceControls;
  constructor(
    private scene: Phaser.Scene,
    private onPress: () => void,
  ) {
    this.keyboard = new SpaceControls(document, onPress);
    scene.input.on("pointerdown", this.press, this);
  }
  private press(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown()) this.onPress();
  }
  destroy(): void {
    this.keyboard.destroy();
    this.scene.input.off("pointerdown", this.press, this);
  }
}
