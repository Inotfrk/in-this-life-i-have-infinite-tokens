/**
 * 装配判定：把「拖到哪、转成什么样、会不会撞」拆成纯函数，方便单测。
 *
 * 规则来自真机：
 * - CPU / 内存 / 显卡 / M.2 都有防呆（缺口、三角标记、金手指缺口），方向不对**塞不进去**；
 * - 散热器没有防呆，怎么转都能扣上，但风道方向会变，压到内存或顶盖就直接装不下；
 * - 电源同理：风扇朝托盘也能塞进去，但进不了风。
 */

import {
  BOARD, BOARD_FEATURES, CASE, MOUNTS, PART_BOXES, COOLER_SUBBOXES,
  boxesOverlap, mountPoint, overlapVolume, partBox, rotateBox, translateBox
} from './layout.js';

export const normDeg = (d) => (((Math.round(d / 90) * 90) % 360) + 360) % 360;

/** 防呆装不进去时给用户的原因 */
const KEYED_REASON = {
  cpu: 'CPU 的防呆三角没对上：真实机器上这样压下去会直接弯针',
  ram: '内存条的防呆缺口反了，插槽里根本按不下去',
  gpu: '显卡金手指的缺口对不上 PCIe 插槽，插不进去',
  storage: 'M.2 的 M key 缺口反了，SSD 插不进插槽',
  motherboard: '主板孔位和铜柱对不上，只能按这个方向装'
};

/**
 * 装好的部件在机箱里的世界 AABB（内存是一根一个盒子）。
 * 传了 part 就按它的真实长度 / 高度算，不传就用该类别的基础盒子。
 */
export function installedBoxes(category, degrees = 0, part = null) {
  const deg = normDeg(degrees);
  if (category === 'ram') {
    return MOUNTS.ram.slots.map((z) => translateBox(rotateBox(PART_BOXES.ram, deg), [
      BOARD.x,
      BOARD.y1 - BOARD_FEATURES.dimm.length,
      z
    ]));
  }
  if (category === 'cooler') return coolerBoxes(deg, part);
  const box = partBox(category, part);
  if (!box) return [];
  return [translateBox(rotateBox(box, deg), mountPoint(category))];
}

/** 散热器的子盒：矮一点的型号，塔身按比例缩，风扇也跟着挪进来 */
export function coolerBoxes(degrees = 0, part = null) {
  const deg = normDeg(degrees);
  const at = mountPoint('cooler');
  const scale = (part?.metrics?.heightMM ?? 165) / 165;
  return COOLER_SUBBOXES.map((sub) => {
    const scaled = {
      min: [sub.min[0] < 0 ? sub.min[0] * scale : sub.min[0], sub.min[1], sub.min[2]],
      max: [sub.max[0] < 0 ? sub.max[0] * scale : sub.max[0], sub.max[1], sub.max[2]]
    };
    return translateBox(rotateBox(scaled, deg), at);
  });
}

/** 散热器会不会压到内存 / 顶到玻璃、顶盖、背板 */
export function coolerInterference(degrees, installed = {}, part = null) {
  const boxes = coolerBoxes(degrees, part);
  const hits = new Set();
  if (installed.ram) {
    const ram = installedBoxes('ram', installed.ram.degrees ?? 0);
    for (const cb of boxes) {
      for (const rb of ram) {
        // 盒子是方框近似圆风扇，边缘 2~3mm 的「擦到」不算真干涉
        if (overlapVolume(cb, rb) > 1.5) hits.add('内存条');
      }
    }
  }
  for (const cb of boxes) {
    if (cb.max[1] > CASE.yCeil - 0.3) hits.add('机箱顶盖');
    if (cb.min[0] < CASE.xLeft + 0.2) hits.add('玻璃侧板');
    if (cb.min[2] < CASE.zBack + 0.2) hits.add('背板');
    if (cb.max[2] > CASE.zFront - 0.2) hits.add('前面板');
  }
  return [...hits];
}

/**
 * 除了散热器以外的部件：检查是否撞到机箱内壁。
 *
 * 两个特例不能按「主仓的墙」算：
 * - 机箱自己就是容器，它的包围盒本来就比内腔大，不能拿内腔去卡它；
 * - 电源在右侧副仓（托盘后面），卡它的是副仓的墙，不是主板托盘。
 */
export function caseInterference(category, degrees = 0, part = null) {
  if (category === 'case') return [];
  const hits = [];
  const rear = category === 'psu';
  const xMin = rear ? CASE.xRearChamber : CASE.xLeft + 0.15;
  const xMax = rear ? CASE.xRight : CASE.xTray;
  // 0.02cm 的浮点容差：贴着墙面不算撞
  for (const box of installedBoxes(category, degrees, part)) {
    if (box.min[0] < xMin - 0.02) hits.push(rear ? '副仓隔板' : '玻璃侧板');
    if (box.max[0] > xMax + 0.02) hits.push(rear ? '右侧板' : '主板托盘');
    if (box.min[1] < CASE.yFloor - 0.02) hits.push('机箱底板');
    if (box.max[1] > CASE.yCeil + 0.02) hits.push('机箱顶盖');
    if (box.min[2] < CASE.zBack - 0.02) hits.push('背板');
    if (box.max[2] > CASE.zFront + 0.02) hits.push('前面板');
  }
  return [...new Set(hits)];
}

/**
 * 尝试装入一次。
 * @param {object} input
 * @param {string} input.category
 * @param {number} input.degrees     拖拽时的朝向
 * @param {number} input.distance    部件中心离安装位的距离（cm）
 * @param {object} [input.installed] 已装部件 { category: { degrees } }
 */
export function seatAttempt({ category, degrees = 0, distance = 0, installed = {}, part = null }) {
  const mount = MOUNTS[category];
  if (!mount) return { ok: false, kind: 'unknown', reason: '不认识的部件类别' };
  const deg = normDeg(degrees);

  if (distance > mount.tolerance) {
    return {
      ok: false,
      kind: 'far',
      reason: `离安装位还差 ${distance.toFixed(1)}cm（要进到 ${mount.tolerance}cm 以内才算对准）`,
      degrees: deg
    };
  }

  if (mount.keyed && !mount.keyed.includes(deg)) {
    return { ok: false, kind: 'keyed', reason: KEYED_REASON[category] ?? '方向不对，装不进去', degrees: deg };
  }

  if (category === 'psu' && deg % 180 !== 0) {
    return { ok: false, kind: 'blocked', reason: '电源仓只有 8.6cm 宽，横过来塞不进去', degrees: deg };
  }

  const hits = category === 'cooler'
    ? coolerInterference(deg, installed, part)
    : caseInterference(category, deg, part);
  if (hits.length) {
    return { ok: false, kind: 'blocked', reason: `装不进去：${hits.join('、')} 挡住了`, degrees: deg, hits };
  }

  return { ok: true, kind: 'ok', degrees: deg, reason: null };
}

/** 各个朝向的后果：能装上，但这样会热一些 */
export const ORIENTATIONS = {
  cooler: {
    0: { label: '风道 前 → 后', penaltyC: 0, tone: 'good' },
    90: { label: '风道 下 → 上', penaltyC: 4, tone: 'warn', note: '竖着装：热风往顶上走，和机箱的前后风道对不上' },
    180: { label: '风道 后 → 前', penaltyC: 8, tone: 'bad', note: '装反了：风扇把热风往前面板吹，机箱里自己循环' },
    270: { label: '风道 上 → 下', penaltyC: 6, tone: 'bad', note: '竖着装还朝下：热风顶在显卡上' }
  },
  psu: {
    0: { label: '风扇朝侧板进风', penaltyC: 0, tone: 'good' },
    180: { label: '风扇朝托盘', penaltyC: 9, tone: 'bad', note: '风扇贴着托盘，吸不到风，电源会闷到过热' }
  },
  gpu: {
    0: { label: '风扇朝下', penaltyC: 0, tone: 'good' }
  },
  ram: {
    0: { label: '防呆缺口对正', penaltyC: 0, tone: 'good' }
  }
};

export function orientationInfo(category, degrees = 0) {
  const table = ORIENTATIONS[category];
  if (!table) return { label: '—', penaltyC: 0, tone: 'good' };
  return table[normDeg(degrees)] ?? Object.values(table)[0];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * 温度估算：只用来表达「硅脂、风道、散热能力」的相对影响，不是散热仿真。
 */
export function thermalReport({ parts = {}, paste = null, orientations = {} } = {}) {
  const issues = [];
  let cpuTemp = null;
  let gpuTemp = null;

  const { cpu, cooler, gpu, psu } = parts;
  if (cpu) {
    const capacity = cooler?.metrics.tdpCapacity ?? 0;
    let temp;
    if (!cooler) {
      temp = 97;
      issues.push({ level: 'error', text: '没装散热器，CPU 开机就会撞温度墙' });
    } else {
      const load = cpu.metrics.tdp / Math.max(capacity, 1);
      temp = 33 + 47 * clamp(load, 0.2, 1.7);
      if (!paste) {
        temp += 17;
        issues.push({ level: 'error', text: '散热器和 CPU 之间没有硅脂：空隙里全是空气，温度直接高十几度' });
      } else if (!paste.pressed) {
        issues.push({ level: 'warn', text: '硅脂还没被扣具压开，装上散热器才会摊匀' });
      } else {
        temp += paste.penaltyC;
        if (paste.coverage < 0.8) {
          issues.push({ level: 'warn', text: `硅脂只盖住 ${Math.round(paste.coverage * 100)}% 的顶盖，边角是空的` });
        }
        if (paste.spill > 0.3) {
          issues.push({ level: 'warn', text: '硅脂挤多了，已经糊到顶盖外面' });
        }
      }
      const air = orientationInfo('cooler', orientations.cooler ?? 0);
      temp += air.penaltyC;
      if (air.note) issues.push({ level: 'warn', text: air.note });
    }
    cpuTemp = Math.round(temp);
  }

  if (gpu) {
    const air = orientationInfo('gpu', orientations.gpu ?? 0);
    gpuTemp = Math.round(38 + gpu.metrics.tdp / 6 + air.penaltyC);
  }

  if (psu) {
    const air = orientationInfo('psu', orientations.psu ?? 0);
    if (air.note) issues.push({ level: 'warn', text: air.note });
  }

  return { cpuTemp, gpuTemp, issues };
}

/** 开机自检：真实机器上这一关过不了就只能看到黑屏 */
export function postCheck({ parts = {}, installed = {}, paste = null, orientations = {} } = {}) {
  const errors = [];
  const warnings = [];
  const required = ['case', 'motherboard', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu'];
  for (const category of required) {
    if (!parts[category]) errors.push({ code: `missing-${category}`, text: '还缺部件' });
  }
  if (paste && paste.quality === 'poor') {
    warnings.push({ code: 'paste-poor', text: '硅脂覆盖太差，温度会明显偏高' });
  }
  if (!paste && parts.cooler && parts.cpu) {
    errors.push({ code: 'no-paste', text: '没涂硅脂就压散热器，真机会直接过热降频' });
  }
  for (const category of Object.keys(installed)) {
    const deg = installed[category]?.degrees ?? 0;
    const info = orientationInfo(category, deg);
    if (info.tone === 'bad') warnings.push({ code: `orient-${category}`, text: info.note });
  }
  return { ok: errors.length === 0, errors, warnings };
}
