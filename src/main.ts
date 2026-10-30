import Phaser from "phaser";
import { PrototypeScene } from "./scenes/PrototypeScene";
import { MazeScene } from "./scenes/MazeScene";
import "./style.css";
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#101820",
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  input: { activePointers: 2 },
  scene: [MazeScene, PrototypeScene],
});
