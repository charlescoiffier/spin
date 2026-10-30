import { test } from "node:test";
import assert from "node:assert/strict";
import { SpaceControls } from "../src/input/SpaceControls.ts";
function press(target: EventTarget, props: Record<string, unknown> = {}) {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperties(
    event,
    Object.fromEntries(
      Object.entries({ code: "Space", repeat: false, ...props }).map(
        ([key, value]) => [key, { value }],
      ),
    ),
  );
  target.dispatchEvent(event);
  return event;
}
test("espace déclenche une action, empêche le défilement et ignore la répétition", () => {
  const target = new EventTarget();
  let count = 0;
  const controls = new SpaceControls(target, () => count++);
  assert.ok(press(target).defaultPrevented);
  assert.equal(count, 1);
  press(target, { repeat: true });
  assert.equal(count, 1);
  press(target, { code: "Enter" });
  assert.equal(count, 1);
  controls.destroy();
  press(target);
  assert.equal(count, 1);
});
test("les raccourcis modifiés et les contrôles DOM conservent leur comportement", () => {
  const target = new EventTarget();
  let count = 0;
  const controls = new SpaceControls(target, () => count++);
  for (const key of ["altKey", "ctrlKey", "metaKey", "shiftKey"])
    assert.equal(press(target, { [key]: true }).defaultPrevented, false);
  // EventTarget represents the focused control without requiring a DOM emulator.
  Object.assign(target, { closest: () => ({ tagName: "INPUT" }) });
  assert.equal(press(target).defaultPrevented, false);
  assert.equal(count, 0);
  controls.destroy();
});
