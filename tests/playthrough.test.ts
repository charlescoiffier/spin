import { test } from "node:test";
import assert from "node:assert/strict";
import { MazeRun } from "../src/modes/maze/MazeRun.ts";
import { RecordStore } from "../src/modes/maze/RecordStore.ts";
import { courses } from "../src/modes/maze/courses.ts";
import { getContacts } from "../src/collision/geometry.ts";
// A deterministic driver emits only real game inputs; no teleports or wall bypass.
const routes = [
  {
    course: 0,
    path: [
      [220, 840],
      [650, 840],
      [900, 240],
    ],
  },
  {
    course: 1,
    path: [
      [220, 900],
      [650, 900],
      [650, 200],
      [1100, 200],
      [1290, 220],
    ],
  },
  {
    course: 2,
    path: [
      [340, 150],
      [1000, 150],
      [1230, 520],
    ],
  },
  {
    course: 2,
    path: [
      [340, 890],
      [980, 890],
      [980, 600],
      [1230, 520],
    ],
  },
];
for (const [index, route] of routes.entries())
  test(`parcours complet par touchers : route ${index + 1}`, () => {
    const course = courses[route.course],
      run = new MazeRun(course, new RecordStore(null));
    run.reset(0);
    run.press(0);
    let target = 0,
      lastPress = 0;
    for (let tick = 1; tick <= 240 * 30; tick++) {
      const now = (tick * 1000) / 240,
        m = run.motion,
        center = { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 };
      const [x, y] = route.path[target];
      if (
        Math.hypot(x - center.x, y - center.y) < 60 &&
        target < route.path.length - 1
      )
        target++;
      const dest = route.path[target],
        p = m.pivotPosition,
        q = m.pivot === "A" ? m.b : m.a;
      const heading = Math.atan2(
        m.direction * (q.x - p.x),
        -m.direction * (q.y - p.y),
      );
      const desired = Math.atan2(dest[1] - center.y, dest[0] - center.x),
        error = Math.atan2(
          Math.sin(desired - heading),
          Math.cos(desired - heading),
        );
      if (error * m.direction < -0.18 && now - lastPress >= 100) {
        run.press(now);
        lastPress = now;
      }
      run.update(now);
      assert.equal(
        getContacts(m.a, m.b, 17, 3.5, course.walls, -0.001).length,
        0,
      );
      if (run.session.status === "finished") break;
    }
    assert.equal(
      run.session.status,
      "finished",
      "la route doit être parcourable avec les seules commandes du jeu",
    );
  });
