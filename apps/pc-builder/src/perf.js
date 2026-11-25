/**
 * 综合性能评估。
 *
 * 分数只是 demo 用的经验模型：把各部件参数归一化到 0~100，再按不同用途加权。
 * 真实平台应该换成实测跑分库，但接口（scoreBuild → 分数 / 帧数 / 瓶颈）可以先定下来。
 */

import { CATEGORIES } from './catalog.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v);

/** 整机功耗估算：CPU + 显卡 + 主板/内存/硬盘/风扇的固定开销。 */
export function loadEstimate(parts) {
  const cpuTdp = parts.cpu?.metrics.tdp ?? 0;
  const gpuTdp = parts.gpu?.metrics.tdp ?? 0;
  const rest = 70;
  const total = cpuTdp + gpuTdp + rest;
  // 电源通常留 30%~40% 余量，向上取到 50W 的整数倍
  const recommendedPsu = Math.ceil((total * 1.4) / 50) * 50;
  return { cpuTdp, gpuTdp, rest, total, recommendedPsu };
}

function memoryScore(ram) {
  if (!ram) return 0;
  const { capacityGB, speedMTs } = ram.metrics;
  return clamp((capacityGB / 64) * 55 + (speedMTs / 8000) * 45);
}

function storageScore(ssd) {
  if (!ssd) return 0;
  const { readMBs, writeMBs } = ssd.metrics;
  return clamp((readMBs / 7450) * 70 + (writeMBs / 6900) * 30);
}

function coolingScore(parts) {
  const { cpu, cooler } = parts;
  if (!cpu || !cooler) return 0;
  const headroom = cooler.metrics.tdpCapacity - cpu.metrics.tdp;
  return clamp(55 + (headroom / 250) * 45);
}

function tierOf(score) {
  if (score >= 88) return '旗舰';
  if (score >= 75) return '高端';
  if (score >= 60) return '主流偏高';
  if (score >= 40) return '主流';
  return '入门';
}

/**
 * @param {Record<string, object>} parts 以类别为键的已装部件
 */
export function scoreBuild(parts) {
  const cpu = parts.cpu ? parts.cpu.metrics.score : 0;
  const gpu = parts.gpu ? parts.gpu.metrics.score : 0;
  const memory = memoryScore(parts.ram);
  const storage = storageScore(parts.storage);
  const cooling = coolingScore(parts);
  const load = loadEstimate(parts);

  const gaming = cpu * 0.25 + gpu * 0.5 + memory * 0.1 + storage * 0.1 + cooling * 0.05;
  const productivity = cpu * 0.5 + gpu * 0.2 + memory * 0.15 + storage * 0.15;
  const total = round(gaming * 0.6 + productivity * 0.4);

  // 帧数只是比例估算：显卡决定上限，CPU 决定能不能喂饱它
  const cpuFactor = clamp(0.55 + cpu / 200, 0.55, 1.05);
  const fhd = round(gpu * 2.2 * cpuFactor);
  const qhd = round(fhd * 0.62);
  const uhd = round(fhd * 0.33);

  const psuHeadroom = (parts.psu?.metrics.wattage ?? 0) - load.total;
  const bottlenecks = [];
  if (parts.gpu && parts.cpu && gpu - cpu > 15) {
    bottlenecks.push('显卡强于 CPU：1080p 下 CPU 可能先到顶，显卡吃不满。');
  }
  if (parts.cpu && parts.gpu && cpu - gpu > 15) {
    bottlenecks.push('CPU 强于显卡：瓶颈在显卡，升级显卡收益更大。');
  }
  if (parts.cooler && parts.cpu && parts.cooler.metrics.tdpCapacity < parts.cpu.metrics.tdp * 0.9) {
    bottlenecks.push('散热解热能力低于 CPU TDP，长时间高负载会降频。');
  }
  if (parts.psu && psuHeadroom < load.total * 0.2) {
    bottlenecks.push('电源余量偏小（不足 20%），建议换更大瓦数。');
  }

  const missing = CATEGORIES.filter((c) => !parts[c.id]).map((c) => c.label);

  return {
    total,
    gaming: round(gaming),
    productivity: round(productivity),
    cpu, gpu, memory: round(memory), storage: round(storage), cooling: round(cooling),
    load, psuHeadroom: round(psuHeadroom),
    fps: { fhd, qhd, uhd },
    tier: tierOf(total),
    bottlenecks,
    missing
  };
}
