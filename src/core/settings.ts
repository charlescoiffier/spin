export const defaults = {
  speed: 5,
  length: 80,
  zoom: 0.7,
  smoothing: 0.3,
  recoilDistance: 8,
  trail: true,
};
export type Settings = typeof defaults;

export function parseSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const limits: Record<Exclude<keyof Settings, "trail">, [number, number]> = {
    speed: [0, 6],
    length: [60, 280],
    zoom: [0.4, 2],
    smoothing: [0, 1.5],
    recoilDistance: [0, 100],
  };
  for (const [key, [low, high]] of Object.entries(limits)) {
    const n = input[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < low || n > high)
      return null;
  }
  if (typeof input.trail !== "boolean") return null;
  return {
    speed: input.speed as number,
    length: input.length as number,
    zoom: input.zoom as number,
    smoothing: input.smoothing as number,
    recoilDistance: input.recoilDistance as number,
    trail: input.trail,
  };
}
