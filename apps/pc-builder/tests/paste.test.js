import test from 'node:test';
import assert from 'node:assert/strict';

import { PATTERNS, evaluatePaste, usablePaste, IDEAL_ML } from '../src/paste.js';

test('四种涂法都在，参数完好', () => {
  assert.deepEqual(PATTERNS.map((p) => p.id), ['dot', 'line', 'cross', 'spread']);
  for (const pattern of PATTERNS) {
    assert.ok(pattern.label && pattern.hint);
    assert.ok(pattern.spread > 0 && pattern.bubble >= 0);
  }
});

test('理想用量下覆盖率接近满', () => {
  const result = evaluatePaste({ patternId: 'dot', amount: IDEAL_ML });
  assert.ok(result.coverage > 0.9, `覆盖率 ${result.coverage}`);
  assert.ok(result.penaltyC < 3, `惩罚 ${result.penaltyC}`);
  assert.equal(result.quality, 'good');
});

test('挤太少盖不满，惩罚明显', () => {
  const result = evaluatePaste({ patternId: 'dot', amount: 0.03 });
  assert.ok(result.coverage < 0.6);
  assert.ok(result.penaltyC > 8);
  assert.ok(result.notes.some((n) => n.text.includes('太少')));
});

test('挤太多会溢出', () => {
  const result = evaluatePaste({ patternId: 'dot', amount: 0.3 });
  assert.ok(result.spill > 0.5);
  assert.ok(result.notes.some((n) => n.text.includes('溢出')));
});

test('涂偏了覆盖率打折', () => {
  const centred = evaluatePaste({ patternId: 'dot', amount: 0.1 });
  const off = evaluatePaste({ patternId: 'dot', amount: 0.1, offset: 1.6 });
  assert.ok(off.coverage < centred.coverage);
  assert.ok(off.notes.some((n) => n.text.includes('偏')));
});

test('刮平覆盖率高但有气泡惩罚', () => {
  const spread = evaluatePaste({ patternId: 'spread', amount: 0.1 });
  const dot = evaluatePaste({ patternId: 'dot', amount: 0.1 });
  assert.ok(spread.bubble > dot.bubble);
});

test('拆过散热器的硅脂不能直接复用', () => {
  const fresh = evaluatePaste({ patternId: 'dot', amount: 0.1 });
  assert.equal(usablePaste(fresh), true);
  assert.equal(usablePaste({ ...fresh, pressed: true }), false);
  assert.equal(usablePaste(null), false);
});
