import test from 'node:test';
import assert from 'node:assert/strict';

import { PARTS } from '../src/catalog.js';
import { checkCompatibility, isBuildComplete } from '../src/compat.js';

const byCategory = () => Object.fromEntries(PARTS.map((p) => [p.category, p]));
const codes = (issues) => issues.map((i) => i.code);

test('整套 demo 部件是兼容的', () => {
  const parts = byCategory();
  const issues = checkCompatibility(parts);
  assert.deepEqual(issues.filter((i) => i.level === 'error'), []);
  assert.equal(isBuildComplete(parts), true);
});

test('插槽不匹配报 error', () => {
  const parts = byCategory();
  parts.cpu = { ...parts.cpu, metrics: { ...parts.cpu.metrics, socket: 'LGA1700' } };
  const issues = checkCompatibility(parts);
  assert.ok(issues.some((i) => i.level === 'error' && i.code === 'socket'));
  assert.equal(isBuildComplete(parts), false);
});

test('内存类型不匹配报 error', () => {
  const parts = byCategory();
  parts.ram = { ...parts.ram, metrics: { ...parts.ram.metrics, type: 'DDR4' } };
  assert.ok(codes(checkCompatibility(parts)).includes('ram-type'));
});

test('显卡超过机箱限长报 error', () => {
  const parts = byCategory();
  parts.case = { ...parts.case, metrics: { ...parts.case.metrics, gpuMaxMM: 300 } };
  assert.ok(checkCompatibility(parts).some((i) => i.level === 'error' && i.code === 'gpu-length'));
});

test('散热器超过机箱限高报 error', () => {
  const parts = byCategory();
  parts.case = { ...parts.case, metrics: { ...parts.case.metrics, coolerMaxMM: 150 } };
  assert.ok(checkCompatibility(parts).some((i) => i.level === 'error' && i.code === 'cooler-height'));
});

test('电源功率不够报 error', () => {
  const parts = byCategory();
  parts.psu = { ...parts.psu, metrics: { ...parts.psu.metrics, wattage: 300 } };
  assert.ok(checkCompatibility(parts).some((i) => i.level === 'error' && i.code === 'psu-power'));
});

test('缺件只报 info', () => {
  const parts = byCategory();
  delete parts.gpu;
  const issues = checkCompatibility(parts);
  assert.ok(issues.some((i) => i.code === 'missing-gpu' && i.level === 'info'));
  assert.equal(isBuildComplete(parts), false);
});
