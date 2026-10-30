import { test } from "node:test";
import assert from "node:assert/strict";
import { RecordStore } from "../src/modes/maze/RecordStore.ts";
import { courses } from "../src/modes/maze/courses.ts";
const maze = courses[0];
function storage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
test("premier record, amélioration seulement, séparation par parcours/version", () => {
  const mem = storage(),
    s = new RecordStore(mem);
  assert.equal(s.get(maze), null);
  assert.deepEqual(s.submit(maze, 1234), { bestMs: 1234, improved: true });
  assert.equal(s.submit(maze, 1300).improved, false);
  assert.equal(s.submit(maze, 1234).improved, false);
  assert.equal(s.submit(maze, 1200).bestMs, 1200);
  assert.equal(new RecordStore(mem).get(maze), 1200);
  assert.equal(s.get({ ...maze, version: 2 }), null);
  assert.equal(s.get(courses[1]), null);
});
test("valeurs invalides et stockage indisponible restent non bloquants", () => {
  for (const value of ["oops", '"12"', "null", "-1", "0", "1e999"]) {
    const s = new RecordStore({ getItem: () => value, setItem: () => {} });
    assert.equal(s.get(maze), null);
  }
  const s = new RecordStore({
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("quota");
    },
  });
  assert.equal(s.get(maze), null);
  s.submit(maze, 100);
  assert.equal(s.get(maze), 100);
  assert.throws(() => s.submit(maze, NaN));
  assert.throws(() => s.submit(maze, -1));
  assert.throws(() => s.submit(maze, Infinity));
  assert.equal(new RecordStore(null).submit(maze, 120).bestMs, 120);
});

test("podium trié limité à trois noms, égalités stables et migration", () => {
  const mem = storage(),
    s = new RecordStore(mem);
  assert.ok(s.qualifies(maze, 1500));
  s.submitNamed(maze, 1500, " Alice ");
  s.submitNamed(maze, 1200, "Bob");
  s.submitNamed(maze, 1800, "Chloé");
  assert.equal(s.qualifies(maze, 1800), false);
  s.submitNamed(maze, 1300, "Denis");
  assert.deepEqual(
    s.top(maze).map((e) => [e.name, e.timeMs]),
    [
      ["Bob", 1200],
      ["Denis", 1300],
      ["Alice", 1500],
    ],
  );
  assert.deepEqual(new RecordStore(mem).top(maze), s.top(maze));
  assert.throws(() => s.submitNamed(maze, 1000, "  "));
  const legacy = new RecordStore({
    getItem: (k) => (k.includes("rules-v1") ? "900" : null),
    setItem: () => {},
  });
  assert.equal(legacy.top(maze)[0].name, "Anonyme");
  assert.equal(legacy.get(maze), 900);
});
