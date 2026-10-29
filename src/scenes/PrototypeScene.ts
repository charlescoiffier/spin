import Phaser from 'phaser';
import { SpinMotion } from '../core/SpinMotion';
import { defaults } from '../core/settings';
import { PivotCamera } from '../camera/PivotCamera';
import { PointerControls } from '../input/PointerControls';
import { SpinRenderer } from '../rendering/SpinRenderer';
import { createTestEnvironment } from '../environment/TestEnvironment';
import { DebugPanel } from '../debug/DebugPanel';
export class PrototypeScene extends Phaser.Scene {
 private motion=new SpinMotion(defaults.length,defaults.speed);
 private settings={...defaults};
 private spinView!: SpinRenderer;
 private follow!: PivotCamera;
 private panel!: DebugPanel;
 constructor(){super('prototype');}
 create(): void {
  createTestEnvironment(this);
  this.spinView=new SpinRenderer(this);
  this.follow=new PivotCamera(this.cameras.main);this.follow.reset(this.motion.pivotPosition);
  const controls=new PointerControls(this,()=>this.motion.switchPivot());
  const reset=()=>{this.motion.angularSpeed=this.settings.speed;this.motion.setLength(this.settings.length);this.motion.reset();this.spinView.clearTrail();this.follow.reset(this.motion.pivotPosition);};
  this.panel=new DebugPanel(document.getElementById('debug')!,this.settings,key=>{
   if(key==='speed') this.motion.angularSpeed=this.settings.speed;
   if(key==='length'){this.motion.setLength(this.settings.length);this.spinView.clearTrail();}
   if(key==='trail') this.spinView.clearTrail();
  },reset);
  this.events.once('shutdown',()=>{controls.destroy();this.panel.destroy();});
 }
 update(_time: number, delta: number): void {
  const dt=delta/1000;
  this.motion.update(dt);
  this.follow.update(this.motion.pivotPosition,dt,this.settings.smoothing,this.settings.zoom);
  this.spinView.draw(this.motion,this.settings.trail,dt);
  this.panel.update(this.motion);
 }
}
