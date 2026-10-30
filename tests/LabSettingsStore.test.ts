import { test } from "node:test";
import assert from "node:assert/strict";
import { LabSettingsStore } from "../src/core/LabSettingsStore.ts";
import { defaults } from "../src/core/settings.ts";
test("réglages sauvegardés, relus et isolés des modifications ultérieures", () => {
  const memory = new Map<string, string>(),
    storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
    };
  const store = new LabSettingsStore(storage);
  assert.equal(store.get(), null);
  const input = {
    ...defaults,
    speed: 4,
    length: 100,
    recoilDistance: 90,
    zoom: 1.2,
    smoothing: 0.5,
    trail: false,
  };
  store.save(input);
  input.speed = 0;
  const restored = new LabSettingsStore(storage).get()!;
  assert.equal(restored.speed, 4);
  assert.equal(restored.trail, false);
  assert.equal(restored.recoilDistance, 90);
  restored.length = 60;
  assert.equal(store.get()!.length, 100);
});
test("stockage refusé, valeurs corrompues ou hors limites", () => {
  const store = new LabSettingsStore({
    getItem: () => "{bad",
    setItem: () => {
      throw Error("quota");
    },
  });
  assert.equal(store.get(), null);
  store.save({ ...defaults, recoilDistance: 100 });
  assert.equal(store.get()!.recoilDistance, 100);
  assert.equal(store.persisted, false);
  assert.throws(() => store.save({ ...defaults, length: 500 }));
  assert.throws(() => store.save({ ...defaults, speed: NaN }));
  assert.equal(
    new LabSettingsStore({
      getItem: () => JSON.stringify({ ...defaults, trail: "false" }),
      setItem: () => {},
    }).get(),
    null,
  );
});
