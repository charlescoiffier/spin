export type RaceStatus = "ready" | "running" | "finished" | "interrupted";
export class RaceSession {
  status: RaceStatus = "ready";
  private startedAt = 0;
  private elapsed = 0;
  start(nowMs: number): void {
    if (this.status !== "ready") return;
    this.status = "running";
    this.startedAt = nowMs;
    this.elapsed = 0;
  }
  finish(nowMs: number): void {
    if (this.status !== "running") return;
    this.elapsedMs(nowMs);
    this.status = "finished";
  }
  interrupt(): void {
    if (this.status === "running") this.status = "interrupted";
  }
  reset(): void {
    this.status = "ready";
    this.startedAt = 0;
    this.elapsed = 0;
  }
  elapsedMs(nowMs: number): number {
    if (this.status === "running")
      this.elapsed = Math.max(0, nowMs - this.startedAt);
    return this.elapsed;
  }
}
