import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORIES, PARTS, VENDORS, partById, partsFiltered } from '../src/catalog.js';

test('每个类别恰好一个部件，id 唯一', () => {
  assert.equal(CATEGORIES.length, 8);
  const ids = PARTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'id 不能重复');
  for (const c of CATEGORIES) {
    const list = PARTS.filter((p) => p.category === c.id);
    assert.equal(list.length, 1, `类别 ${c.id} 应该只有一个 demo 部件`);
  }
});

test('厂商都在 VENDORS 里，且每个部件有参数与指标', () => {
  for (const part of PARTS) {
    assert.ok(VENDORS.includes(part.vendor), `${part.id} 的厂商 ${part.vendor} 不在列表里`);
    assert.ok(Object.keys(part.specs).length >= 4, `${part.id} 的参数太少`);
    assert.ok(Object.keys(part.metrics).length >= 2, `${part.id} 缺少 metrics`);
    assert.ok(part.price > 0);
  }
});

test('按 id 与厂商过滤', () => {
  const cpu = partById('cpu-amd-7800x3d');
  assert.equal(cpu.vendor, 'AMD');
  assert.equal(partById('不存在'), null);
  assert.deepEqual(partsFiltered({ vendor: 'NVIDIA' }).map((p) => p.category), ['gpu']);
});
