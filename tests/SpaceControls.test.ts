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
test("les raccourcis modifiés et les champs de texte conservent leur comportement", () => {
  const target = new EventTarget();
  let count = 0;
  const controls = new SpaceControls(target, () => count++);
  for (const key of ["altKey", "ctrlKey", "metaKey", "shiftKey"])
    assert.equal(press(target, { [key]: true }).defaultPrevented, false);
  // EventTarget represents the focused control without requiring a DOM emulator.
  Object.assign(target, { tagName: "INPUT", type: "text" });
  assert.equal(press(target).defaultPrevented, false);
  assert.equal(count, 0);
  controls.destroy();
});

test("espace reste actif avec le focus sur les boutons et réglages", () => {
  for (const properties of [
    { tagName: "BUTTON" },
    { tagName: "A" },
    { tagName: "SELECT" },
    { tagName: "INPUT", type: "range" },
    { tagName: "INPUT", type: "checkbox" },
    { tagName: "INPUT", type: "number" },
  ]) {
    const target = Object.assign(new EventTarget(), properties);
    Object.assign(target, { closest: () => target });
    let count = 0;
    const controls = new SpaceControls(target, () => count++);
    assert.ok(press(target).defaultPrevented);
    assert.equal(count, 1);
    assert.ok(press(target, { repeat: true }).defaultPrevented);
    assert.equal(count, 1);
    controls.destroy();
  }
});
test("la saisie du nom et les zones éditables acceptent les espaces", () => {
  for (const properties of [
    { tagName: "INPUT", type: "text" },
    { tagName: "TEXTAREA" },
    { tagName: "SPAN", isContentEditable: true },
  ]) {
    const target = Object.assign(new EventTarget(), properties);
    let count = 0;
    const controls = new SpaceControls(target, () => count++);
    assert.equal(press(target).defaultPrevented, false);
    assert.equal(count, 0);
    controls.destroy();
  }
});
