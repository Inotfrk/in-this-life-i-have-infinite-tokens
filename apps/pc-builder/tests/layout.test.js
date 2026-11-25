import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOARD, BOARD_FEATURES, CASE, MOUNTS, PART_BOXES,
  boxesOverlap, interiorBounds, mountPoint, overlapVolume, rotateBox, translateBox
} from '../src/layout.js';
import { coolerInterference, installedBoxes, normDeg } from '../src/assembly.js';

test('机箱按 O11D EVO 的真实尺寸建（285 × 465 × 459 mm）', () => {
  assert.equal(CASE.width, 28.5);
  assert.equal(CASE.height, 46.5);
  assert.equal(CASE.depth, 45.9);
  // 主仓在左（玻璃侧板），电源仓在右，托盘夹在中间
  assert.ok(CASE.xTray > 0 && CASE.xTray < CASE.xRight);
  assert.ok(CASE.xLeft < 0 && CASE.xLeft < CASE.xTray);
  assert.ok(CASE.xTray - CASE.xLeft > 18, '主板仓至少要放得下 130mm 高的显卡 + 余量');
});

test('主板是 ATX 305 × 244，竖装、贴着托盘', () => {
  assert.equal(BOARD.height, 30.5);
  assert.equal(BOARD.width, 24.4);
  assert.ok(BOARD.x < CASE.xTray, 'PCB 在托盘前面（朝玻璃侧板）');
  assert.ok(BOARD.y0 > CASE.yFloor && BOARD.y1 < CASE.yCeil);
  assert.ok(BOARD.z0 > CASE.zBack && BOARD.z1 < CASE.zFront);
});

test('CPU 插座在板上偏后偏上，内存插槽在插座前方，PCIe 在下方', () => {
  const socket = BOARD_FEATURES.socket;
  assert.ok(socket.z < BOARD.z0 + BOARD.width * 0.5, '插座靠后置 I/O 那一侧');
  assert.ok(socket.y > BOARD.y0 + BOARD.height * 0.55, '插座偏上');
  for (const z of BOARD_FEATURES.dimm.centers) {
    assert.ok(z > socket.z + socket.size / 2, '内存插槽在插座前方，不压在插座上');
    assert.ok(z < BOARD.z1, '内存插槽还在板子范围内');
  }
  for (const slot of BOARD_FEATURES.pcie) {
    assert.ok(slot.y < socket.y - 5, 'PCIe 在插座下方');
    assert.ok(slot.z + slot.length < BOARD.z1);
  }
});

test('显卡横着挂：朝前延伸 336mm，风扇朝下，能塞进机箱', () => {
  const [gpu] = installedBoxes('gpu', 0);
  const slot = BOARD_FEATURES.pcie[0];
  assert.ok(gpu.max[2] - gpu.min[2] > 33, '长度 336mm');
  assert.ok(gpu.max[2] > slot.z + 30, '从插槽向机箱前面延伸');
  assert.ok(gpu.min[0] > CASE.xLeft + 1, '朝玻璃侧板伸出 13cm 但不能穿模');
  assert.ok(gpu.min[1] > CASE.yFloor && gpu.max[1] < CASE.yCeil);
});

test('塔冷朝玻璃侧板伸出，默认朝向前 → 后且不碰内存', () => {
  const boxes = installedBoxes('cooler', 0);
  const tower = boxes[1];   // 塔身（前）
  assert.ok(tower.max[2] - tower.min[2] < 6, '塔身进深 4.6cm');
  assert.ok(tower.min[0] < CASE.xLeft + 3, '塔身一直伸到玻璃侧板附近');
  assert.ok(tower.max[0] <= BOARD.x + 0.2, '从 CPU 顶盖往外伸，不插进主板');
  assert.ok(tower.max[0] <= BOARD.x - 3.3, '塔底离主板 44mm 以上，才压不到 34.9mm 高的内存');
  assert.equal(coolerInterference(0, { ram: { degrees: 0 } }).length, 0, '正装不压内存');
});

test('散热器四个朝向都不压内存（塔底离主板 44mm > 马甲 34.9mm）', () => {
  for (const deg of [0, 90, 180, 270]) {
    assert.equal(coolerInterference(deg, { ram: { degrees: 0 } }).length, 0, `${deg}° 不该报干涉`);
  }
});

test('散热器竖装时塔身会横着扫过整块主板仓，但仍在机箱内部', () => {
  const upright = installedBoxes('cooler', 90)[1];
  const flat = installedBoxes('cooler', 0)[1];
  assert.ok(upright.max[2] - upright.min[2] > flat.max[2] - flat.min[2], '竖装后进深方向变成塔宽');
  assert.ok(upright.min[0] > CASE.xLeft, '还是没穿玻璃');
  assert.ok(upright.max[1] < CASE.yCeil);
});

test('朝向前保持 0/90/180/270 四档', () => {
  assert.equal(normDeg(450), 90);
  assert.equal(normDeg(-90), 270);
  assert.equal(normDeg(89), 90);
});

test('旋转 90° 的盒子把 Y/Z 对调', () => {
  const box = { min: [-1, -2, -3], max: [1, 2, 3] };
  const rotated = rotateBox(box, 90);
  assert.deepEqual(rotated.min.map((v) => +v.toFixed(6)), [-1, -3, -2]);
  assert.deepEqual(rotated.max.map((v) => +v.toFixed(6)), [1, 3, 2]);
});

test('内存盒按两条插槽展开', () => {
  const boxes = installedBoxes('ram', 0);
  assert.equal(boxes.length, 2);
  assert.ok(boxes[0].min[1] > BOARD.y0 + 10, '内存立插、贴着主板上边缘');
  assert.ok(boxes[0].max[1] <= BOARD.y1 + 0.01);
  assert.ok(!boxesOverlap(boxes[0], boxes[1]), '两条内存不能重叠');
});

test('机箱内部范围就是物理模拟的边界', () => {
  const bounds = interiorBounds();
  assert.deepEqual(bounds.min, [CASE.xLeft, CASE.yFloor, CASE.zBack]);
  assert.deepEqual(bounds.max, [CASE.xRight, CASE.yCeil, CASE.zFront]);
  for (const category of ['motherboard', 'cooler', 'gpu', 'psu']) {
    const box = PART_BOXES[category];
    assert.ok(box.max[0] > box.min[0] && box.max[1] > box.min[1] && box.max[2] > box.min[2]);
  }
});

test('安装基准点都在机箱内部（机箱自己的基准点在底板上）', () => {
  for (const category of Object.keys(MOUNTS)) {
    const [x, y, z] = mountPoint(category);
    assert.ok(x > CASE.xLeft && x < CASE.xRight, `${category} x`);
    assert.ok(y >= 0 && y <= CASE.yCeil, `${category} y`);
    assert.ok(z > CASE.zBack && z < CASE.zFront, `${category} z`);
  }
});
