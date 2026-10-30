import { parseSettings, type Settings } from "./settings";
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const key = "spin:lab-settings:v1";
export class LabSettingsStore {
  private settings: Settings | null = null;
  persisted = false;
  constructor(private storage: StoragePort | null) {
    try {
      const raw = storage?.getItem(key);
      if (raw) {
        this.settings = parseSettings(JSON.parse(raw));
        this.persisted = this.settings !== null;
      }
    } catch {
      /* session fallback */
    }
  }
  get(): Settings | null {
    return this.settings ? { ...this.settings } : null;
  }
  save(input: Settings): Settings {
    const settings = parseSettings(input);
    if (!settings) throw Error("Réglages invalides ou hors limites");
    this.settings = settings;
    try {
      this.storage?.setItem(key, JSON.stringify(settings));
      this.persisted = this.storage !== null;
    } catch {
      this.persisted = false;
    }
    return { ...settings };
  }
}
