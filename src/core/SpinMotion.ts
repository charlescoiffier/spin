export interface Point { x: number; y: number }
export type Pivot = 'A' | 'B';

/** Pure world-space kinematics; independent of rendering and camera. */
export class SpinMotion {
 readonly a: Point = { x: 0, y: 0 };
 readonly b: Point = { x: 0, y: 0 };
 pivot: Pivot = 'A';
 direction: 1 | -1 = 1;
 private angle = 0;
 constructor(public length = 140, public angularSpeed = 2) { this.reset(); }
 get pivotPosition(): Point { return this.pivot === 'A' ? this.a : this.b; }
 private get orbiting(): Point { return this.pivot === 'A' ? this.b : this.a; }
 update(seconds: number): void {
  this.angle = (this.angle + this.angularSpeed * this.direction * seconds) % (2 * Math.PI);
  this.placeOrbiting();
 }
 switchPivot(): void {
  this.pivot = this.pivot === 'A' ? 'B' : 'A';
  this.direction = this.direction === 1 ? -1 : 1;
  // Reconstruct the opposite vector without ever rewriting either position.
  const p = this.pivotPosition, q = this.orbiting;
  this.angle = Math.atan2(q.y - p.y, q.x - p.x);
 }
 setLength(length: number): void { this.length = length; this.placeOrbiting(); }
 reset(): void {
  this.pivot = 'A'; this.direction = 1; this.angle = 0;
  this.a.x = 0; this.a.y = 0; this.b.x = this.length; this.b.y = 0;
 }
 private placeOrbiting(): void {
  const p = this.pivotPosition, q = this.orbiting;
  q.x = p.x + Math.cos(this.angle) * this.length;
  q.y = p.y + Math.sin(this.angle) * this.length;
 }
}
