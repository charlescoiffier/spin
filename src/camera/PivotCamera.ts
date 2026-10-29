import type Phaser from 'phaser';
import type { Point } from '../core/SpinMotion';
export class PivotCamera {
 private center: Point = { x: 0, y: 0 };
 constructor(private camera: Phaser.Cameras.Scene2D.Camera) {}
 reset(point: Point): void { this.center = { ...point }; this.camera.centerOn(point.x, point.y); }
 update(target: Point, seconds: number, smoothing: number, zoom: number): void {
  const blend = smoothing <= 0 ? 1 : -Math.expm1(-seconds / smoothing);
  this.center.x += (target.x-this.center.x)*blend;
  this.center.y += (target.y-this.center.y)*blend;
  this.camera.setZoom(zoom).centerOn(this.center.x,this.center.y);
 }
}
