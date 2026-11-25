/**
 * 硅脂：这一环是「能不能压住温度」的关键，也最容易翻车。
 *
 * 模型取自装机常识：
 * - AM5 顶盖 40 × 40mm，理想用量大约 0.08~0.15ml，一颗黄豆大小（中点法）最稳；
 * - 太少 → 压开后盖不满，边角有空隙，温度明显偏高；
 * - 太多 → 溢出到顶盖外、糊到插座边，虽不至于烧毁，但污染主板且容易吸附灰尘；
 * - 抹平（刮刀）覆盖率高，但容易裹进气泡，长期会「泵出」失效。
 * 拆下散热器以后硅脂已经被压过一次，再次安装必须擦掉重涂（used 标记）。
 */

import * as THREE from 'three';

/** 顶盖面积（cm²），AM5 是 40 × 40mm */
export const IHS_AREA = 4.0 * 4.0;

/** 理想用量（ml） */
export const IDEAL_ML = 0.1;

export const PATTERNS = [
  {
    id: 'dot',
    label: '中点法',
    hint: '挤一颗黄豆大小在正中，靠扣具压力自己摊开',
    spread: 1.0,
    bubble: 0.02
  },
  {
    id: 'line',
    label: '一条线',
    hint: '沿长边挤一条，适合顶盖偏长的平台',
    spread: 0.95,
    bubble: 0.04
  },
  {
    id: 'cross',
    label: '十字',
    hint: '横竖各一条，覆盖快但容易挤多',
    spread: 0.92,
    bubble: 0.05
  },
  {
    id: 'spread',
    label: '刮平',
    hint: '用刮刀抹匀，覆盖率高但容易裹气泡',
    spread: 1.06,
    bubble: 0.12
  }
];

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * @param {object} input
 * @param {string} input.patternId
 * @param {number} input.amount   毫升
 * @param {number} [input.offset] 涂抹点偏离中心的距离（cm），用来表现「挤歪了」
 */
export function evaluatePaste({ patternId, amount, offset = 0 }) {
  const pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const ml = clamp(amount, 0, 0.5);
  const ratio = ml / IDEAL_ML;

  const notes = [];
  // 覆盖：用量到 1.0 倍基本铺满，刮平/十字略快，超出后不再提升
  let coverage = clamp(0.28 + ratio * 0.78 * pattern.spread);
  // 涂偏了：中间厚、边角空，覆盖率打折
  const offFactor = clamp(1 - offset / 3.2);
  coverage = clamp(coverage * (0.55 + 0.45 * offFactor));
  // 气泡：成片的小空腔，按覆盖面积折算
  const bubble = pattern.bubble * (1 + Math.max(0, ratio - 1));
  coverage = clamp(coverage - bubble * 0.35);

  // 溢出：超过 1.25 倍理想用量就开始往外糊
  const spill = clamp((ratio - 1.25) / 0.75, 0, 1);

  // 平均厚度（cm）：体积 / 覆盖面积
  const thickness = coverage > 0.05 ? (ml / (IHS_AREA * coverage)) : 0;

  if (ml < 0.04) notes.push({ level: 'warn', text: '硅脂太少了，压开后边角肯定盖不满' });
  if (ratio > 1.5) notes.push({ level: 'warn', text: '挤太多了，会溢出到顶盖外面，弄脏主板' });
  if (offset > 1.0) notes.push({ level: 'warn', text: '涂抹点偏离中心，压开后中间厚、四角空' });
  if (pattern.id === 'spread') notes.push({ level: 'info', text: '刮平容易裹气泡，长期高低温循环会泵出' });

  // 热阻惩罚（°C）：覆盖不足是主因，气泡与溢出是小头
  const uncovered = clamp(1 - coverage);
  const penaltyC = uncovered * 22 + bubble * 14 + spill * 3;

  return {
    patternId: pattern.id,
    patternLabel: pattern.label,
    amount: ml,
    coverage: +coverage.toFixed(3),
    spill: +spill.toFixed(3),
    thickness: +thickness.toFixed(4),
    bubble: +bubble.toFixed(3),
    offset,
    penaltyC: +penaltyC.toFixed(1),
    quality: coverage > 0.92 && spill < 0.15 ? 'good' : coverage > 0.75 ? 'ok' : 'poor',
    notes
  };
}

/** 已涂好的硅脂能不能直接用：拆过散热器就得重涂 */
export function usablePaste(paste) {
  return Boolean(paste) && !paste.pressed;
}

/**
 * 视觉：顶盖上那团硅脂。扣具压下去以后按覆盖率摊开，溢出的部分在顶盖外面留一圈。
 */
export function makePasteMesh(paste) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb9b6ae,
    roughness: 0.85,
    metalness: 0.15
  });

  const spread = paste.pressed ? paste.coverage : 0.28;
  const radius = 1.9 * Math.sqrt(clamp(spread, 0.05, 1));
  const geo = new THREE.CircleGeometry(radius, 28);
  // 边缘做成不规则的，看起来像被压开的硅脂
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    if (r < 0.01) continue;
    const angle = Math.atan2(y, x);
    const noise = 1 + 0.14 * Math.sin(angle * 3 + paste.offset * 2) + 0.08 * Math.cos(angle * 5);
    pos.setXY(i, x * noise, y * noise);
  }
  geo.computeVertexNormals();
  const blob = new THREE.Mesh(geo, mat);
  blob.rotation.y = Math.PI / 2;   // 贴在顶盖上，法线朝玻璃侧板（-X）
  blob.position.x = -0.02;
  blob.castShadow = false;
  group.add(blob);

  if (paste.spill > 0.05) {
    const spillGeo = new THREE.RingGeometry(radius, radius + 0.25 + paste.spill * 0.6, 28);
    const spill = new THREE.Mesh(spillGeo, mat);
    spill.rotation.y = Math.PI / 2;
    spill.position.x = -0.03;
    group.add(spill);
  }

  group.userData.isPaste = true;
  return group;
}
