import { test } from "node:test";
import assert from "node:assert/strict";
import { CourseStore } from "../src/editor/CourseStore.ts";
import { RecordStore } from "../src/modes/maze/RecordStore.ts";
import { courses } from "../src/modes/maze/courses.ts";
test("adresse HTTP mobile : sauvegarde et podium sans crypto.randomUUID", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "crypto")!;
  Object.defineProperty(globalThis, "crypto", {
    value: {},
    configurable: true,
  });
  try {
    const store = new CourseStore(null),
      m = store.save(courses[0]);
    assert.ok(m.id.startsWith("custom-"));
    const scores = new RecordStore(null);
    scores.submitNamed(m, 1000, "Joueur");
    assert.equal(scores.top(m)[0].name, "Joueur");
  } finally {
    Object.defineProperty(globalThis, "crypto", previous);
  }
});
