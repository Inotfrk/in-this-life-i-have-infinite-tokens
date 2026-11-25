import test from 'node:test';
import assert from 'node:assert/strict';

import { createBody, stepBody, settleAll, orientedHalfExtents, PHYSICS } from '../src/physics.js';
import { interiorBounds } from '../src/layout.js';

const bounds = interiorBounds();

test('重力是真的：自由落体的加速度约 9.8 m/s²', () => {
  const openBounds = { min: [-1e5, -1e5, -1e5], max: [1e5, 1e5, 1e5] };
  const body = createBody({ half: [1, 1, 1], position: [0, 30, 0] });
  const dt = 1 / 60;
  for (let i = 0; i < 30; i += 1) stepBody(body, dt, openBounds);
  const vy = body.velocity[1];
  assert.ok(vy < -400 && vy > -520, `0.5 秒后竖直速度 ${vy.toFixed(0)} cm/s`);
  assert.ok(PHYSICS.GRAVITY < 0);
});

test('掉下来的部件会停在机箱底板上', () => {
  const body = createBody({ half: [2, 3, 4], position: [0, 40, 0], spin: [90, 0, 0] });
  settleAll([body], bounds);
  assert.equal(body.resting, true);
  const halfY = orientedHalfExtents(body.half, body.rotation)[1];
  assert.ok(Math.abs(body.position[1] - (bounds.min[1] + halfY)) < 0.05, '贴着地板');
  assert.ok(body.velocity.every((v) => v === 0), '静止后速度为 0');
});

test('不会穿出机箱，反弹后也不会飞出去', () => {
  const body = createBody({ half: [3, 3, 3], position: [10, 30, 10], velocity: [900, 0, 900], spin: [360, 0, 0] });
  for (let i = 0; i < 600; i += 1) stepBody(body, 1 / 60, bounds);
  for (let axis = 0; axis < 3; axis += 1) {
    const half = orientedHalfExtents(body.half, body.rotation)[axis];
    assert.ok(body.position[axis] >= bounds.min[axis] + half - 0.01, `轴 ${axis} 左越界`);
    assert.ok(body.position[axis] <= bounds.max[axis] - half + 0.01, `轴 ${axis} 右越界`);
  }
  assert.equal(body.resting, true);
});

test('任意角度都按真实投影算半长（斜着躺也不会陷进地板）', () => {
  assert.deepEqual(orientedHalfExtents([1, 2, 3], 0), [1, 2, 3]);
  const flat = orientedHalfExtents([1, 2, 3], 90).map((v) => +v.toFixed(6));
  assert.deepEqual(flat, [1, 3, 2]);
  const slant = orientedHalfExtents([1, 2, 3], 45).map((v) => +v.toFixed(6));
  assert.ok(Math.abs(slant[1] - (2 + 3) * Math.SQRT1_2) < 1e-6, '45° 时的竖直半长应该更大');
  assert.ok(slant[1] > 3, '斜着时竖直投影比不转时更大');
});

test('斜着落地的部件不会陷进地板', () => {
  const body = createBody({ half: [2, 4, 6], position: [0, 30, 0], rotation: 37 });
  settleAll([body], bounds);
  const halfY = orientedHalfExtents(body.half, body.rotation)[1];
  assert.ok(body.position[1] >= bounds.min[1] + halfY - 0.05, '底面不能低于地板');
});

test('掉下来的部件会在地板上滑一段然后停住', () => {
  const body = createBody({ half: [2, 2, 2], position: [0, 20, 0], velocity: [220, 0, 120] });
  settleAll([body], bounds, 10);
  assert.equal(body.resting, true, '有摩擦，最终必须停下来');
  assert.ok(Math.abs(body.velocity[0]) < 0.01);
});

test('静止的部件不再参与积分', () => {
  const body = createBody({ half: [1, 1, 1], position: [0, bounds.min[1] + 1, 0] });
  settleAll([body], bounds);
  const y = body.position[1];
  stepBody(body, 1 / 60, bounds);
  assert.equal(body.position[1], y);
});
