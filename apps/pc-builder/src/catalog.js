/**
 * 部件目录：一个类别只放一个部件，够跑通 demo 即可。
 *
 * 每个部件分三层信息：
 * - specs：给人看的参数（频率、容量、接口……）
 * - metrics：给算分和兼容性检查用的数字与枚举
 * - 外观：color + 几何体在 models.js 里按 category 生成
 */

export const VENDORS = ['AMD', 'ASUS', 'Kingston', 'NVIDIA', 'Samsung', 'Corsair', 'Noctua', 'Lian Li'];

export const CATEGORIES = [
  { id: 'case', label: '机箱', icon: '🗄️', slot: 'case' },
  { id: 'motherboard', label: '主板', icon: '🧩', slot: 'motherboard' },
  { id: 'cpu', label: '处理器', icon: '🧠', slot: 'cpu' },
  { id: 'cooler', label: '散热器', icon: '🌀', slot: 'cooler' },
  { id: 'ram', label: '内存', icon: '📏', slot: 'ram' },
  { id: 'gpu', label: '显卡', icon: '🎮', slot: 'gpu' },
  { id: 'storage', label: '硬盘', icon: '💾', slot: 'storage' },
  { id: 'psu', label: '电源', icon: '🔌', slot: 'psu' }
];

export const PARTS = [
  {
    id: 'case-lianli-o11d',
    category: 'case',
    vendor: 'Lian Li',
    name: 'Lian Li O11 Dynamic EVO',
    price: 1099,
    color: 0x3a3f47,
    summary: '双仓海景房，玻璃侧透，显卡最长 420mm。',
    specs: {
      形态: '中塔 ATX',
      尺寸: '465 × 285 × 459 mm',
      显卡限长: '420 mm',
      散热器限高: '167 mm',
      硬盘位: '2.5" ×4 / 3.5" ×2'
    },
    metrics: { gpuMaxMM: 420, coolerMaxMM: 167, formFactor: 'ATX', volumeL: 50 }
  },
  {
    id: 'mb-asus-b650e-f',
    category: 'motherboard',
    vendor: 'ASUS',
    name: 'ASUS ROG STRIX B650E-F GAMING WIFI',
    price: 1899,
    color: 0x1f2937,
    summary: 'AM5 平台，DDR5 双通道，PCIe 5.0 显卡插槽。',
    specs: {
      芯片组: 'AMD B650E',
      插槽: 'AM5',
      内存: 'DDR5 ×4，最高 128GB',
      板型: 'ATX',
      'M.2': '4 个（1× PCIe 5.0）'
    },
    metrics: { socket: 'AM5', memType: 'DDR5', formFactor: 'ATX', m2Slots: 4 }
  },
  {
    id: 'cpu-amd-7800x3d',
    category: 'cpu',
    vendor: 'AMD',
    name: 'AMD Ryzen 7 7800X3D',
    price: 2599,
    color: 0xb45309,
    summary: '8 核 16 线程，3D V-Cache，游戏性能强、功耗温和。',
    specs: {
      核心: '8 核 16 线程',
      基础频率: '4.2 GHz',
      加速频率: '5.0 GHz',
      'L3 缓存': '96 MB（3D V-Cache）',
      插槽: 'AM5',
      TDP: '120 W'
    },
    metrics: { score: 88, cores: 8, threads: 16, baseClock: 4.2, boostClock: 5.0, tdp: 120, socket: 'AM5' }
  },
  {
    id: 'cooler-noctua-nhd15',
    category: 'cooler',
    vendor: 'Noctua',
    name: 'Noctua NH-D15',
    price: 899,
    color: 0x8b5a2b,
    summary: '双塔双风扇，压 250W 级别的风冷。',
    specs: {
      类型: '双塔风冷',
      热管: '6 × 6mm',
      高度: '165 mm',
      风扇: '2 × NF-A15 140mm',
      解热能力: '约 250 W'
    },
    metrics: { tdpCapacity: 250, heightMM: 165, type: '双塔风冷' }
  },
  {
    id: 'ram-kingston-ddr5-6000',
    category: 'ram',
    vendor: 'Kingston',
    name: 'Kingston FURY Beast DDR5-6000 32GB',
    price: 699,
    color: 0x4b5563,
    summary: '2×16GB 双通道，EXPO/XMP 一键 6000MT/s。',
    specs: {
      容量: '32 GB（2 × 16 GB）',
      规格: 'DDR5',
      频率: '6000 MT/s',
      时序: 'CL36',
      电压: '1.35 V'
    },
    metrics: { type: 'DDR5', capacityGB: 32, speedMTs: 6000, sticks: 2 }
  },
  {
    id: 'gpu-nvidia-4070tis',
    category: 'gpu',
    vendor: 'NVIDIA',
    name: 'GeForce RTX 4070 Ti SUPER 16GB',
    price: 6499,
    color: 0x111827,
    summary: '16GB 显存，2K 高帧、4K 可玩，长度 336mm。',
    specs: {
      显存: '16 GB GDDR6X',
      位宽: '256-bit',
      加速频率: '2610 MHz',
      TDP: '285 W',
      长度: '336 mm',
      供电: '16-pin'
    },
    metrics: { score: 92, vramGB: 16, boostClock: 2610, busBits: 256, tdp: 285, lengthMM: 336 }
  },
  {
    id: 'ssd-samsung-990pro',
    category: 'storage',
    vendor: 'Samsung',
    name: 'Samsung 990 PRO 2TB',
    price: 1099,
    color: 0x374151,
    summary: 'PCIe 4.0 满速盘，顺序读 7450MB/s。',
    specs: {
      容量: '2 TB',
      接口: 'PCIe 4.0 ×4 / NVMe 2.0',
      顺序读取: '7450 MB/s',
      顺序写入: '6900 MB/s',
      耐久: '1200 TBW'
    },
    metrics: { capacityGB: 2048, readMBs: 7450, writeMBs: 6900, interface: 'PCIe 4.0' }
  },
  {
    id: 'psu-corsair-rm850x',
    category: 'psu',
    vendor: 'Corsair',
    name: 'Corsair RM850x (2024)',
    price: 999,
    color: 0x1e3a5f,
    summary: '850W 金牌全模组，ATX 3.0，原生 12VHPWR。',
    specs: {
      额定功率: '850 W',
      认证: '80 PLUS Gold',
      规范: 'ATX 3.0',
      模组: '全模组',
      风扇: '135mm 磁悬浮'
    },
    metrics: { wattage: 850, efficiency: '80+ Gold' }
  }
];

/** 全量数据，方便测试与 UI 遍历。 */
export function partsByCategory() {
  const map = new Map(CATEGORIES.map((c) => [c.id, []]));
  for (const part of PARTS) {
    if (!map.has(part.category)) throw new Error(`未知类别 ${part.category}`);
    map.get(part.category).push(part);
  }
  return map;
}

export function partById(id) {
  return PARTS.find((p) => p.id === id) ?? null;
}

export function partsFiltered({ category = null, vendor = null } = {}) {
  return PARTS.filter((p) => (!category || p.category === category) && (!vendor || p.vendor === vendor));
}
