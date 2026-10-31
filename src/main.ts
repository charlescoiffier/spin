import Phaser from "phaser";
import { PrototypeScene } from "./scenes/PrototypeScene";
import { MazeScene } from "./scenes/MazeScene";
import { EditorScene } from "./scenes/EditorScene";
import { OnlineRaceScene } from './scenes/OnlineRaceScene';
import { parseJoinLink, hasRecentRejoin } from './network/JoinLink';
import { setupPanelToggle } from "./ui/appShell";
import "./style.css";
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#101820",
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  input: { activePointers: 2 },
  scene: parseJoinLink(window.location.href) || hasRecentRejoin() ? [OnlineRaceScene, MazeScene, PrototypeScene, EditorScene] : [MazeScene, PrototypeScene, EditorScene, OnlineRaceScene],
});
document.getElementById('open-online')!.addEventListener('click', () => {
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
  game.scene.start('online', {});
});

const resize = () => {
  const root = document.getElementById("game")!;
  if (game.isBooted && root.clientWidth > 0 && root.clientHeight > 0)
    game.scale.resize(root.clientWidth, root.clientHeight);
};
setupPanelToggle(resize);
new ResizeObserver(resize).observe(document.getElementById("game")!);
