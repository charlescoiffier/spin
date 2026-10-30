import { SpinMotion, type Point } from "../core/SpinMotion";
import { getContacts, type Contact, type Wall } from "./geometry";

/** Collision response wraps pure kinematics. All proposals are checked before commit. */
export class CollisionMotion {
  private locked = new Set<string>();
  private recoilDistance = 8;
  private recoil: { normal: Point; age: number; distance: number } | null =
    null;
  constructor(
    private motion: SpinMotion,
    private walls: readonly Wall[],
  ) {}
  setRecoilDistance(distance: number): void {
    if (!Number.isFinite(distance) || distance < 0 || distance > 100) {
      throw new RangeError("Le recul doit être compris entre 0 et 100 px");
    }
    this.recoilDistance = distance;
  }
  reset(): void {
    this.locked.clear();
    this.recoil = null;
  }
  private contacts(margin = 0): Contact[] {
    return getContacts(
      this.motion.a,
      this.motion.b,
      17,
      3.5,
      this.walls,
      margin,
    );
  }
  // Return contact(s) at the rejected proposal, keeping the last free state.
  private safeMove(move: (fraction: number) => void): Contact[] {
    const before = this.motion.snapshot();
    move(1);
    const hits = this.contacts();
    if (!hits.length) return [];
    let low = 0,
      high = 1;
    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      this.motion.restore(before);
      move(mid);
      if (this.contacts().length) high = mid;
      else low = mid;
    }
    this.motion.restore(before);
    move(Math.max(0, low - 1e-6));
    return hits;
  }
  private impact(hits: Contact[]): void {
    const fresh = hits.filter((hit) => !this.locked.has(hit.wallId));
    if (!fresh.length) return;
    this.motion.reverse();
    hits.forEach((hit) => this.locked.add(hit.wallId));
    const sum = fresh.reduce(
      (p, c) => ({ x: p.x + c.normal.x, y: p.y + c.normal.y }),
      { x: 0, y: 0 },
    );
    const candidates = [sum, ...fresh.map((c) => c.normal)];
    const state = this.motion.snapshot();
    this.recoil = null;
    if (this.recoilDistance === 0) return;
    for (const candidate of candidates) {
      const length = Math.hypot(candidate.x, candidate.y);
      if (length < 1e-8) continue;
      const normal = { x: candidate.x / length, y: candidate.y / length };
      this.motion.translate({ x: normal.x * 0.05, y: normal.y * 0.05 });
      const free = !this.contacts().length;
      this.motion.restore(state);
      if (free) {
        this.recoil = { normal, age: 0, distance: this.recoilDistance };
        break;
      }
    }
  }
  get isRecoiling(): boolean {
    return this.recoil !== null;
  }
  step(seconds: number): void {
    // Keep both recoil and rotation proposals shorter than wall thickness.
    const pieces = Math.max(
      1,
      Math.ceil(seconds / (1 / 240)),
      Math.ceil((this.recoilDistance * 2 * seconds) / 0.08 / 2),
    );
    for (let i = 0; i < pieces; i++) this.substep(seconds / pieces);
  }
  private substep(seconds: number): void {
    // Unlock only after genuine separation, never through a timed immunity window.
    const nearby = new Set(this.contacts(1).map((c) => c.wallId));
    for (const id of this.locked) if (!nearby.has(id)) this.locked.delete(id);
    if (this.recoil) {
      const recoil = this.recoil,
        end = Math.min(0.08, recoil.age + seconds);
      const distance =
        recoil.distance *
        (Math.pow(1 - recoil.age / 0.08, 2) - Math.pow(1 - end / 0.08, 2));
      const hits = this.safeMove((f) =>
        this.motion.translate({
          x: recoil.normal.x * distance * f,
          y: recoil.normal.y * distance * f,
        }),
      );
      recoil.age = end;
      if (hits.length) {
        this.recoil = null;
        this.impact(hits);
      } else if (end >= 0.08) this.recoil = null;
    }
    const hits = this.safeMove((f) => this.motion.update(seconds * f));
    if (hits.length) this.impact(hits);
  }
}
