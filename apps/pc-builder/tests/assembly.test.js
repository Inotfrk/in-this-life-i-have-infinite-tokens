import test from 'node:test';
import assert from 'node:assert/strict';

import { seatAttempt, orientationInfo, postCheck, thermalReport } from '../src/assembly.js';
import { evaluatePaste } from '../src/paste.js';
import { CASE } from '../src/layout.js';

const coolerPart = { metrics: { tdpCapacity: 250 } };
const cpuPart = { metrics: { tdp: 120 } };

test('拖得不够近就装不上（不能一键到位）', () => {
  const result = seatAttempt({ category: 'gpu', degrees: 0, distance: 4.5 });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'far');
});

test('对准了、方向对了才装得上', () => {
  const result = seatAttempt({ category: 'gpu', degrees: 0, distance: 0.4 });
  assert.equal(result.ok, true);
});

test('CPU 方向错了会被防呆挡住', () => {
  for (const deg of [90, 180, 270]) {
    const result = seatAttempt({ category: 'cpu', degrees: deg, distance: 0 });
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'keyed');
    assert.match(result.reason, /三角|针/);
  }
});

test('散热器反过来能装上，但风道有惩罚', () => {
  const seat = seatAttempt({ category: 'cooler', degrees: 180, distance: 0.2, installed: {} });
  assert.equal(seat.ok, true);
  const info = orientationInfo('cooler', 180);
  assert.ok(info.penaltyC >= 6);
  assert.ok(info.note.includes('前面板'));
});

test('散热器竖装能装上，但风道对不上机箱，温度吃亏', () => {
  const result = seatAttempt({ category: 'cooler', degrees: 90, distance: 0.2, installed: { ram: { degrees: 0 } } });
  assert.equal(result.ok, true, 'NH-D15 转 90° 在 AM5 上装得下，只是风道不对');
  const info = orientationInfo('cooler', 90);
  assert.ok(info.penaltyC >= 4);
  assert.match(info.note, /风道/);
});

test('散热器被机箱顶盖挡住时真的装不进去', () => {
  // 把顶盖压到 34cm：塔身 16.5cm 从插座往上量必然穿顶
  const original = CASE.yCeil;
  CASE.yCeil = 34;
  try {
    const result = seatAttempt({ category: 'cooler', degrees: 0, distance: 0.2, installed: {} });
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'blocked');
    assert.match(result.reason, /顶盖/);
  } finally {
    CASE.yCeil = original;
  }
});

test('电源横过来塞不进 8.6cm 宽的电源仓', () => {
  const result = seatAttempt({ category: 'psu', degrees: 90, distance: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'blocked');
});

test('硅脂覆盖率越高温度越低', () => {
  const thin = evaluatePaste({ patternId: 'dot', amount: 0.03 });
  const good = evaluatePaste({ patternId: 'dot', amount: 0.1 });
  assert.ok(thin.penaltyC > good.penaltyC);

  const pressed = { ...good, pressed: true };
  const withPaste = thermalReport({ parts: { cpu: cpuPart, cooler: coolerPart }, paste: pressed });
  const without = thermalReport({ parts: { cpu: cpuPart, cooler: coolerPart }, paste: null });
  assert.ok(withPaste.cpuTemp < without.cpuTemp, '没硅脂一定更热');
});

test('散热器装反了温度更高', () => {
  const paste = { ...evaluatePaste({ patternId: 'dot', amount: 0.1 }), pressed: true };
  const normal = thermalReport({ parts: { cpu: cpuPart, cooler: coolerPart }, paste, orientations: { cooler: 0 } });
  const flipped = thermalReport({ parts: { cpu: cpuPart, cooler: coolerPart }, paste, orientations: { cooler: 180 } });
  assert.ok(flipped.cpuTemp > normal.cpuTemp + 5);
});

test('开机自检：缺件、没硅脂、风道反了都会被点出来', () => {
  const paste = { ...evaluatePaste({ patternId: 'dot', amount: 0.1 }), pressed: true };
  const full = {
    case: {}, motherboard: {}, cpu: cpuPart, cooler: coolerPart, ram: {}, gpu: {}, storage: {}, psu: {}
  };
  const ok = postCheck({ parts: full, paste, installed: { cooler: { degrees: 0 } } });
  assert.equal(ok.ok, true);

  const noPaste = postCheck({ parts: full, paste: null, installed: {} });
  assert.equal(noPaste.ok, false);
  assert.ok(noPaste.errors.some((e) => e.code === 'no-paste'));

  const reversed = postCheck({ parts: full, paste, installed: { cooler: { degrees: 180 } } });
  assert.ok(reversed.warnings.some((w) => w.code === 'orient-cooler'));

  const missing = postCheck({ parts: { cpu: cpuPart }, paste: null, installed: {} });
  assert.equal(missing.ok, false);
});

test('每个类别在安装位上都能装上（机箱不能卡自己、电源不能卡托盘）', () => {
  const categories = ['case', 'motherboard', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu'];
  for (const category of categories) {
    const result = seatAttempt({ category, degrees: 0, distance: 0, installed: { ram: { degrees: 0 } } });
    assert.equal(result.ok, true, `${category} 应该装得上，实际：${result.reason}`);
  }
});

test('机箱自己的包围盒比内腔大，也不能被判成撞墙', () => {
  const result = seatAttempt({ category: 'case', degrees: 0, distance: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'ok');
});

test('机箱离桌面中心太远还是不给装', () => {
  const result = seatAttempt({ category: 'case', degrees: 0, distance: 24 });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'far');
});

test('电源在副仓里，贴着托盘也算装好（只是不能横过来）', () => {
  const ok = seatAttempt({ category: 'psu', degrees: 0, distance: 0.5 });
  assert.equal(ok.ok, true);
  const flipped = seatAttempt({ category: 'psu', degrees: 180, distance: 0.5 });
  assert.equal(flipped.ok, true, '风扇朝托盘能塞进去，只是温度遭罪');
  const sideways = seatAttempt({ category: 'psu', degrees: 90, distance: 0.5 });
  assert.equal(sideways.ok, false);
});
