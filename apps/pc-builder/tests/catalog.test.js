import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORIES, DEMO_BUILD, PARTS, REQUIRED_METRICS, VENDORS,
  demoBuild, partById, partsByCategory, partsFiltered, usedVendors
} from '../src/catalog.js';
import { checkCompatibility } from '../src/compat.js';

test('每个类别都有至少两个型号可选，id 唯一', () => {
  assert.equal(CATEGORIES.length, 8);
  const ids = PARTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'id 不能重复');
  const byCategory = partsByCategory();
  for (const c of CATEGORIES) {
    // 机箱目前只有 O11D EVO 一个型号：整套布局（托盘、仓体、风道）就是按它写的
    const min = c.id === 'case' ? 1 : 2;
    assert.ok(byCategory.get(c.id).length >= min, `类别 ${c.id} 至少要有 ${min} 个型号`);
  }
  assert.ok(PARTS.length >= 20, `总型号数偏少：${PARTS.length}`);
});

test('厂商都在 VENDORS 里，参数与指标齐全', () => {
  for (const part of PARTS) {
    assert.ok(VENDORS.includes(part.vendor), `${part.id} 的厂商 ${part.vendor} 不在列表里`);
    assert.ok(Object.keys(part.specs).length >= 4, `${part.id} 的参数太少`);
    assert.ok(part.price > 0);
    for (const field of REQUIRED_METRICS[part.category]) {
      assert.ok(part.metrics[field] !== undefined, `${part.id} 缺少 metrics.${field}`);
    }
  }
});

test('同一类别里能找出明显不同的型号（用来做对比）', () => {
  const cpus = partsByCategory().get('cpu');
  assert.ok(new Set(cpus.map((c) => c.metrics.socket)).size >= 2, '要有不同插槽的 CPU');
  const gpus = partsByCategory().get('gpu');
  assert.ok(Math.max(...gpus.map((g) => g.metrics.lengthMM)) - Math.min(...gpus.map((g) => g.metrics.lengthMM)) >= 80);
  const coolers = partsByCategory().get('cooler');
  assert.ok(coolers.some((c) => c.metrics.tdpCapacity < 200), '要有一个压不住高功率的散热器');
});

test('DEMO_BUILD 的八个部件互相兼容', () => {
  const parts = demoBuild();
  assert.deepEqual(Object.keys(parts).sort(), CATEGORIES.map((c) => c.id).sort());
  const errors = checkCompatibility(parts).filter((i) => i.level === 'error');
  assert.deepEqual(errors, []);
});

test('DEMO_BUILD 里的 id 都能在目录里找到', () => {
  for (const [category, id] of Object.entries(DEMO_BUILD)) {
    const part = partById(id);
    assert.ok(part, `找不到 ${id}`);
    assert.equal(part.category, category);
  }
});

test('按 id 与厂商过滤', () => {
  const cpu = partById('cpu-amd-7800x3d');
  assert.equal(cpu.vendor, 'AMD');
  assert.equal(partById('不存在'), null);
  assert.deepEqual(partsFiltered({ vendor: 'NVIDIA' }).map((p) => p.category), ['gpu', 'gpu', 'gpu', 'gpu']);
  assert.ok(usedVendors().every((v) => VENDORS.includes(v)));
  assert.ok(usedVendors().includes('Intel'));
});

test('真实的翻车组合：插槽 / 内存世代 / 电源都拦得住', () => {
  const intel = partById('cpu-intel-14900k');
  const amdBoard = partById('mb-asus-b650e-f');
  const base = demoBuild();
  assert.ok(checkCompatibility({ ...base, cpu: intel }).some((i) => i.level === 'error' && i.code === 'socket'));

  const ddr4 = partById('ram-kingston-ddr4-3200');
  assert.ok(checkCompatibility({ ...base, ram: ddr4, motherboard: amdBoard }).some((i) => i.code === 'ram-type'));

  const weakPsu = partById('psu-seasonic-gx650');
  const bigGpu = partById('gpu-nvidia-4090');
  const hot = checkCompatibility({ ...base, psu: weakPsu, gpu: bigGpu, cpu: intel });
  assert.ok(hot.some((i) => i.code === 'psu-power'));
});
