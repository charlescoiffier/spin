import { test } from "node:test";
import assert from "node:assert/strict";
import { wallOutline } from "../src/rendering/wallOutline.ts";
const perimeter = (rects: any[]) =>
  wallOutline(rects).reduce(
    (sum, s) => sum + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y),
    0,
  );
test("murs jointifs sans arête intérieure et contour fusionné", () => {
  const rects = [
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 100, y: 0, width: 100, height: 100 },
  ];
  assert.equal(perimeter(rects), 600);
  assert.equal(wallOutline(rects).length, 4);
  assert.ok(!wallOutline(rects).some((s) => s.a.x === 100 && s.b.x === 100));
});
test("jonctions partielles, chevauchements, doublons et L", () => {
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 100, y: 20, width: 100, height: 60 },
    ]),
    600,
  );
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 0, width: 100, height: 100 },
    ]),
    500,
  );
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 0, width: 100, height: 100 },
    ]),
    400,
  );
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 100, height: 200 },
      { x: 100, y: 100, width: 100, height: 100 },
    ]),
    800,
  );
});
test("trou conserve son contour et blocs séparés restent séparés", () => {
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 300, height: 100 },
      { x: 0, y: 200, width: 300, height: 100 },
      { x: 0, y: 100, width: 100, height: 100 },
      { x: 200, y: 100, width: 100, height: 100 },
    ]),
    1600,
  );
  assert.equal(
    perimeter([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 200, y: 0, width: 100, height: 100 },
    ]),
    800,
  );
});
