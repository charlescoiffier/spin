export interface Point {
  x: number;
  y: number;
}
export type Pivot = "A" | "B";
export interface MotionState {
  a: Point;
  b: Point;
  pivot: Pivot;
  direction: 1 | -1;
  angle: number;
  length: number;
  angularSpeed: number;
}

/** Pure world-space kinematics; independent of rendering and camera. */
export class SpinMotion {
  readonly a: Point = { x: 0, y: 0 };
  readonly b: Point = { x: 0, y: 0 };
  pivot: Pivot = "A";
  direction: 1 | -1 = 1;
  private angle = 0;
  constructor(
    public length = 140,
    public angularSpeed = 2,
  ) {
    this.reset();
  }
  get pivotPosition(): Point {
    return this.pivot === "A" ? this.a : this.b;
  }
  private get orbiting(): Point {
    return this.pivot === "A" ? this.b : this.a;
  }
  update(seconds: number): void {
    this.angle =
      (this.angle + this.angularSpeed * this.direction * seconds) %
      (2 * Math.PI);
    this.placeOrbiting();
  }
  switchPivot(): void {
    this.pivot = this.pivot === "A" ? "B" : "A";
    this.direction = this.direction === 1 ? -1 : 1;
    // Reconstruct the opposite vector without ever rewriting either position.
    const p = this.pivotPosition,
      q = this.orbiting;
    this.angle = Math.atan2(q.y - p.y, q.x - p.x);
  }
  setLength(length: number): void {
    this.length = length;
    this.placeOrbiting();
  }
  reverse(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }
  translate(offset: Point): void {
    this.a.x += offset.x;
    this.a.y += offset.y;
    this.b.x += offset.x;
    this.b.y += offset.y;
  }
  snapshot(): MotionState {
    return {
      a: { ...this.a },
      b: { ...this.b },
      pivot: this.pivot,
      direction: this.direction,
      angle: this.angle,
      length: this.length,
      angularSpeed: this.angularSpeed,
    };
  }
  restore(state: MotionState): void {
    Object.assign(this.a, state.a);
    Object.assign(this.b, state.b);
    this.pivot = state.pivot;
    this.direction = state.direction;
    this.angle = state.angle;
    this.length = state.length;
    this.angularSpeed = state.angularSpeed;
  }
  resetAt(a: Point, angle: number): void {
    this.pivot = "A";
    this.direction = 1;
    this.angle = angle;
    Object.assign(this.a, a);
    this.placeOrbiting();
  }
  reset(): void {
    this.pivot = "A";
    this.direction = 1;
    this.angle = 0;
    this.a.x = 0;
    this.a.y = 0;
    this.b.x = this.length;
    this.b.y = 0;
  }
  private placeOrbiting(): void {
    const p = this.pivotPosition,
      q = this.orbiting;
    q.x = p.x + Math.cos(this.angle) * this.length;
    q.y = p.y + Math.sin(this.angle) * this.length;
  }
}
