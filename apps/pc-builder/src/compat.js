/**
 * 兼容性检查：装机 demo 里最容易翻车的地方——
 * 插槽、内存类型、电源功率、显卡长度、散热器高度、板型。
 */

import { CATEGORIES } from './catalog.js';
import { loadEstimate } from './perf.js';

/**
 * @param {Record<string, object>} parts 以类别为键的已装部件
 * @returns {{level: 'error'|'warn'|'info', code: string, text: string}[]}
 */
export function checkCompatibility(parts) {
  const issues = [];
  const add = (level, code, text) => issues.push({ level, code, text });

  for (const c of CATEGORIES) {
    if (!parts[c.id]) add('info', `missing-${c.id}`, `还没选${c.label}`);
  }

  const { cpu, motherboard: mb, ram, gpu, psu, cooler, case: chassis } = parts;

  if (cpu && mb && cpu.metrics.socket !== mb.metrics.socket) {
    add('error', 'socket', `CPU 插槽 ${cpu.metrics.socket} 与主板 ${mb.metrics.socket} 不匹配`);
  }

  if (ram && mb && ram.metrics.type !== mb.metrics.memType) {
    add('error', 'ram-type', `内存是 ${ram.metrics.type}，主板只支持 ${mb.metrics.memType}`);
  }

  if (gpu && chassis && gpu.metrics.lengthMM > chassis.metrics.gpuMaxMM) {
    add('error', 'gpu-length', `显卡 ${gpu.metrics.lengthMM}mm 超过机箱限长 ${chassis.metrics.gpuMaxMM}mm`);
  }

  if (cooler && chassis && cooler.metrics.heightMM > chassis.metrics.coolerMaxMM) {
    add('error', 'cooler-height', `散热器 ${cooler.metrics.heightMM}mm 超过机箱限高 ${chassis.metrics.coolerMaxMM}mm`);
  }

  if (psu) {
    const load = loadEstimate(parts);
    if (psu.metrics.wattage < load.total * 1.1) {
      add('error', 'psu-power', `整机估算 ${load.total}W，${psu.metrics.wattage}W 电源扛不住`);
    } else if (psu.metrics.wattage < load.total * 1.35) {
      add('warn', 'psu-headroom', `${psu.metrics.wattage}W 对 ${load.total}W 的负载余量偏紧`);
    }
  }

  if (cooler && cpu && cooler.metrics.tdpCapacity < cpu.metrics.tdp) {
    add('warn', 'cooler-tdp', `散热器解热 ${cooler.metrics.tdpCapacity}W 低于 CPU TDP ${cpu.metrics.tdp}W`);
  }

  if (mb && chassis && mb.metrics.formFactor !== chassis.metrics.formFactor) {
    add('warn', 'form-factor', `主板板型 ${mb.metrics.formFactor} 与机箱 ${chassis.metrics.formFactor} 不一致`);
  }

  return issues;
}

/** 没有 error 且每个类别都装了东西，才算装完。 */
export function isBuildComplete(parts) {
  return CATEGORIES.every((c) => parts[c.id]) && !checkCompatibility(parts).some((i) => i.level === 'error');
}
