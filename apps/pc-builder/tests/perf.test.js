import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORIES, demoBuild } from '../src/catalog.js';
import { loadEstimate, scoreBuild } from '../src/perf.js';

const byCategory = () => demoBuild();

test('功耗估算与电源建议合理', () => {
  const load = loadEstimate(byCategory());
  assert.equal(load.total, 120 + 285 + 70);
  assert.ok(load.recommendedPsu >= load.total * 1.3, '应该留出足够余量');
  assert.equal(load.recommendedPsu % 50, 0);
});

test('完整装机分数在 0~100，并给出档位与帧数', () => {
  const score = scoreBuild(byCategory());
  for (const key of ['total', 'gaming', 'productivity', 'cpu', 'gpu', 'memory', 'storage', 'cooling']) {
    assert.ok(score[key] >= 0 && score[key] <= 100, `${key} 超出 0~100`);
  }
  assert.ok(['入门', '主流', '主流偏高', '高端', '旗舰'].includes(score.tier));
  assert.ok(score.fps.fhd > score.fps.qhd && score.fps.qhd > score.fps.uhd);
  assert.deepEqual(score.missing, []);
});

test('缺件时列在 missing 里，分数不被部分部件撑满', () => {
  const parts = byCategory();
  const full = scoreBuild(parts).total;
  delete parts.gpu;
  const partial = scoreBuild(parts);
  assert.ok(partial.missing.includes('显卡'));
  assert.ok(partial.total < full);
});

test('显卡更强时 1080p 帧数更高，并报出 CPU 瓶颈', () => {
  const parts = byCategory();
  parts.gpu = { ...parts.gpu, metrics: { ...parts.gpu.metrics, score: 99 } };
  parts.cpu = { ...parts.cpu, metrics: { ...parts.cpu.metrics, score: 60 } };
  const score = scoreBuild(parts);
  assert.ok(score.bottlenecks.some((t) => t.includes('显卡强于 CPU')));
  assert.ok(score.fps.fhd > 0);
});

test('电源余量不足会出现在瓶颈里', () => {
  const parts = byCategory();
  parts.psu = { ...parts.psu, metrics: { ...parts.psu.metrics, wattage: 500 } };
  const score = scoreBuild(parts);
  assert.ok(score.bottlenecks.some((t) => t.includes('电源余量')));
});

test('性能相关类别都参与评分（少一个都会掉分）', () => {
  // 机箱只影响兼容性（限长/限高），主板只影响插槽与内存类型，都不进性能分
  const scoreNeutral = new Set(['case', 'motherboard', 'psu']);
  const base = scoreBuild(byCategory()).total;
  for (const c of CATEGORIES) {
    if (scoreNeutral.has(c.id)) continue;
    const parts = byCategory();
    delete parts[c.id];
    assert.ok(scoreBuild(parts).total < base, `去掉 ${c.id} 分数应该下降`);
  }
});
