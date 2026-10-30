let serial = 0;
/** Local data identity, not an authentication secret; also works on LAN HTTP. */
export function createId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function")
      return globalThis.crypto.randomUUID();
  } catch {
    /* use a local identifier on older or restricted browsers */
  }
  return `local-${Date.now().toString(36)}-${(++serial).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
