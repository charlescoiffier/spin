import { test } from "node:test";
import assert from "node:assert/strict";
import { finishReached } from "../src/modes/maze/finishReached.ts";
import { SpinMotion } from "../src/core/SpinMotion.ts";
import { courses } from "../src/modes/maze/courses.ts";
const e = { x: 100, y: 100, width: 160, height: 160 },
  base = { ...courses[0], exit: e };
test("ensemble exige les deux disques et pivot exige un pivot entièrement arrêté", () => {
  const m = new SpinMotion(80, 5);
  m.resetAt({ x: 130, y: 150 }, 0);
  assert.ok(
    finishReached({ ...base, finishMode: "whole" }, m, { ...m.a }, false),
  );
  m.resetAt({ x: 230, y: 150 }, 0);
  assert.ok(
    !finishReached({ ...base, finishMode: "whole" }, m, { ...m.a }, false),
  );
  assert.ok(
    finishReached({ ...base, finishMode: "pivot" }, m, { ...m.a }, false),
  );
  assert.ok(
    !finishReached({ ...base, finishMode: "pivot" }, m, { ...m.a }, true),
  );
  assert.ok(
    !finishReached(
      { ...base, finishMode: "pivot" },
      m,
      { x: 229, y: 150 },
      false,
    ),
  );
  m.resetAt({ x: 30, y: 150 }, 0);
  assert.ok(
    !finishReached({ ...base, finishMode: "pivot" }, m, { ...m.a }, false),
  );
});
test("cible tactile touchée par boule ou milieu de barre sans inclusion complète", () => {
  const m = new SpinMotion(80, 5);
  m.resetAt({ x: 50, y: 150 }, 0);
  assert.ok(
    finishReached(
      {
        ...base,
        exit: { x: 85, y: 145, width: 24, height: 24 },
        finishMode: "touch",
      },
      m,
      { ...m.a },
      false,
    ),
  );
  assert.ok(
    !finishReached(
      {
        ...base,
        exit: { x: 85, y: 180, width: 24, height: 24 },
        finishMode: "touch",
      },
      m,
      { ...m.a },
      false,
    ),
  );
});
