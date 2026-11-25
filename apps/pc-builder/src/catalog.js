/**
 * 部件目录：每个类别放几个真实型号，够对比、够翻车就行。
 *
 * 每个部件分三层信息：
 * - specs：给人看的参数（频率、容量、接口……）
 * - metrics：给算分、兼容性检查、3D 尺寸用的数字与枚举
 * - 外观：color + 几何体在 models.js 里按 category 生成（显卡长度、散热器高度会读 metrics）
 *
 * 想加型号：照着已有条目补一条，metrics 里把该类别检查要用的字段写全即可
 * （见文件末尾 REQUIRED_METRICS）。
 */

export const VENDORS = [
  'AMD', 'Intel', 'ASUS', 'MSI', 'Kingston', 'Corsair', 'NVIDIA', 'Samsung',
  'WD', 'Crucial', 'Noctua', 'DeepCool', 'Thermalright', 'Lian Li', 'G.Skill', 'Seasonic'
];

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

/** 每个类别做兼容性 / 尺寸判断时要有的 metrics 字段 */
export const REQUIRED_METRICS = {
  case: ['gpuMaxMM', 'coolerMaxMM', 'formFactor'],
  motherboard: ['socket', 'memType', 'formFactor'],
  cpu: ['socket', 'tdp', 'score', 'cores', 'threads'],
  cooler: ['tdpCapacity', 'heightMM'],
  ram: ['type', 'capacityGB', 'speedMTs', 'sticks'],
  gpu: ['lengthMM', 'tdp', 'score', 'vramGB'],
  storage: ['capacityGB', 'readMBs', 'writeMBs'],
  psu: ['wattage']
};

export const PARTS = [
  // ---------------------------------------------------------------- 机箱
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

  // ---------------------------------------------------------------- 主板
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
    id: 'mb-msi-b760-tomahawk',
    category: 'motherboard',
    vendor: 'MSI',
    name: 'MSI MAG B760 TOMAHAWK WIFI',
    price: 1499,
    color: 0x22303c,
    summary: 'LGA1700 平台，DDR5，供电扎实的性价比板。',
    specs: {
      芯片组: 'Intel B760',
      插槽: 'LGA1700',
      内存: 'DDR5 ×4，最高 192GB',
      板型: 'ATX',
      'M.2': '3 个'
    },
    metrics: { socket: 'LGA1700', memType: 'DDR5', formFactor: 'ATX', m2Slots: 3 }
  },
  {
    id: 'mb-asus-x670e-e',
    category: 'motherboard',
    vendor: 'ASUS',
    name: 'ASUS ROG CROSSHAIR X670E HERO',
    price: 4299,
    color: 0x2b2033,
    summary: 'AM5 旗舰板，PCIe 5.0 全速 M.2，20+2 相供电。',
    specs: {
      芯片组: 'AMD X670E',
      插槽: 'AM5',
      内存: 'DDR5 ×4，最高 192GB',
      板型: 'ATX',
      'M.2': '5 个（2× PCIe 5.0）'
    },
    metrics: { socket: 'AM5', memType: 'DDR5', formFactor: 'ATX', m2Slots: 5 }
  },

  // ---------------------------------------------------------------- CPU
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
    id: 'cpu-amd-7600',
    category: 'cpu',
    vendor: 'AMD',
    name: 'AMD Ryzen 5 7600',
    price: 1499,
    color: 0x92400e,
    summary: '6 核 12 线程，65W 低功耗，装机入门好选择。',
    specs: {
      核心: '6 核 12 线程',
      基础频率: '3.8 GHz',
      加速频率: '5.1 GHz',
      'L3 缓存': '32 MB',
      插槽: 'AM5',
      TDP: '65 W'
    },
    metrics: { score: 74, cores: 6, threads: 12, baseClock: 3.8, boostClock: 5.1, tdp: 65, socket: 'AM5' }
  },
  {
    id: 'cpu-amd-7950x',
    category: 'cpu',
    vendor: 'AMD',
    name: 'AMD Ryzen 9 7950X',
    price: 4299,
    color: 0x7c2d12,
    summary: '16 核 32 线程，生产力猛兽，170W 需要像样的散热。',
    specs: {
      核心: '16 核 32 线程',
      基础频率: '4.5 GHz',
      加速频率: '5.7 GHz',
      'L3 缓存': '64 MB',
      插槽: 'AM5',
      TDP: '170 W'
    },
    metrics: { score: 96, cores: 16, threads: 32, baseClock: 4.5, boostClock: 5.7, tdp: 170, socket: 'AM5' }
  },
  {
    id: 'cpu-intel-14600k',
    category: 'cpu',
    vendor: 'Intel',
    name: 'Intel Core i5-14600K',
    price: 1999,
    color: 0x1e40af,
    summary: '14 核 20 线程，LGA1700，游戏与生产力均衡。',
    specs: {
      核心: '14 核 20 线程（6P + 8E）',
      基础频率: '3.5 GHz',
      加速频率: '5.3 GHz',
      'L3 缓存': '24 MB',
      插槽: 'LGA1700',
      功耗: '125 W 基础 / 181 W 睿频'
    },
    metrics: { score: 85, cores: 14, threads: 20, baseClock: 3.5, boostClock: 5.3, tdp: 181, socket: 'LGA1700' }
  },
  {
    id: 'cpu-intel-14900k',
    category: 'cpu',
    vendor: 'Intel',
    name: 'Intel Core i9-14900K',
    price: 4299,
    color: 0x1d4ed8,
    summary: '24 核 32 线程，253W 满载，散热和电源都得跟上。',
    specs: {
      核心: '24 核 32 线程（8P + 16E）',
      基础频率: '3.2 GHz',
      加速频率: '6.0 GHz',
      'L3 缓存': '36 MB',
      插槽: 'LGA1700',
      功耗: '125 W 基础 / 253 W 睿频'
    },
    metrics: { score: 97, cores: 24, threads: 32, baseClock: 3.2, boostClock: 6.0, tdp: 253, socket: 'LGA1700' }
  },

  // ---------------------------------------------------------------- 散热器
  {
    id: 'cooler-noctua-nhd15',
    category: 'cooler',
    vendor: 'Noctua',
    name: 'Noctua NH-D15',
    price: 899,
    color: 0x8b5a2b,
    summary: '双塔双风扇，165mm 高，压 250W 级别的风冷。',
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
    id: 'cooler-noctua-nhu12a',
    category: 'cooler',
    vendor: 'Noctua',
    name: 'Noctua NH-U12A',
    price: 799,
    color: 0x9a6b3f,
    summary: '单塔双扇，158mm 高，兼容性好、噪音低。',
    specs: {
      类型: '单塔风冷',
      热管: '7 × 6mm',
      高度: '158 mm',
      风扇: '2 × NF-A12x25 120mm',
      解热能力: '约 220 W'
    },
    metrics: { tdpCapacity: 220, heightMM: 158, type: '单塔风冷' }
  },
  {
    id: 'cooler-deepcool-ak400',
    category: 'cooler',
    vendor: 'DeepCool',
    name: 'DeepCool AK400',
    price: 159,
    color: 0x4b5563,
    summary: '155mm 入门单塔，压 180W 以内够用，性价比高。',
    specs: {
      类型: '单塔风冷',
      热管: '4 × 6mm',
      高度: '155 mm',
      风扇: '1 × 120mm PWM',
      解热能力: '约 180 W'
    },
    metrics: { tdpCapacity: 180, heightMM: 155, type: '单塔风冷' }
  },
  {
    id: 'cooler-thermalright-ax120',
    category: 'cooler',
    vendor: 'Thermalright',
    name: 'Thermalright Assassin X 120',
    price: 109,
    color: 0x3f4650,
    summary: '145mm 矮塔，小机箱友好，但压不住高 TDP。',
    specs: {
      类型: '单塔风冷',
      热管: '4 × 6mm',
      高度: '145 mm',
      风扇: '1 × 120mm',
      解热能力: '约 150 W'
    },
    metrics: { tdpCapacity: 150, heightMM: 145, type: '单塔风冷' }
  },

  // ---------------------------------------------------------------- 内存
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
    id: 'ram-corsair-ddr5-6400',
    category: 'ram',
    vendor: 'Corsair',
    name: 'Corsair Vengeance DDR5-6400 32GB',
    price: 799,
    color: 0x2f3a45,
    summary: '2×16GB，低矮马甲，兼容大多数塔冷。',
    specs: {
      容量: '32 GB（2 × 16 GB）',
      规格: 'DDR5',
      频率: '6400 MT/s',
      时序: 'CL32',
      电压: '1.4 V'
    },
    metrics: { type: 'DDR5', capacityGB: 32, speedMTs: 6400, sticks: 2 }
  },
  {
    id: 'ram-gskill-ddr5-7200',
    category: 'ram',
    vendor: 'G.Skill',
    name: 'G.Skill Trident Z5 RGB DDR5-7200 32GB',
    price: 1099,
    color: 0x3b3f4a,
    summary: '2×16GB 高频条，带 RGB 导光条，马甲偏高压散热器前扇。',
    specs: {
      容量: '32 GB（2 × 16 GB）',
      规格: 'DDR5',
      频率: '7200 MT/s',
      时序: 'CL34',
      电压: '1.4 V'
    },
    metrics: { type: 'DDR5', capacityGB: 32, speedMTs: 7200, sticks: 2 }
  },
  {
    id: 'ram-kingston-ddr4-3200',
    category: 'ram',
    vendor: 'Kingston',
    name: 'Kingston FURY Beast DDR4-3200 32GB',
    price: 459,
    color: 0x3f4b57,
    summary: '2×16GB DDR4，老平台沿用条——插 DDR5 板子上装不进去。',
    specs: {
      容量: '32 GB（2 × 16 GB）',
      规格: 'DDR4',
      频率: '3200 MT/s',
      时序: 'CL16',
      电压: '1.35 V'
    },
    metrics: { type: 'DDR4', capacityGB: 32, speedMTs: 3200, sticks: 2 }
  },

  // ---------------------------------------------------------------- 显卡
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
    id: 'gpu-nvidia-4060ti',
    category: 'gpu',
    vendor: 'NVIDIA',
    name: 'GeForce RTX 4060 Ti 8GB',
    price: 3199,
    color: 0x1b2431,
    summary: '1080p 甜点卡，245mm 短卡，小机箱也放得下。',
    specs: {
      显存: '8 GB GDDR6',
      位宽: '128-bit',
      加速频率: '2535 MHz',
      TDP: '160 W',
      长度: '245 mm',
      供电: '8-pin'
    },
    metrics: { score: 74, vramGB: 8, boostClock: 2535, busBits: 128, tdp: 160, lengthMM: 245 }
  },
  {
    id: 'gpu-nvidia-4080s',
    category: 'gpu',
    vendor: 'NVIDIA',
    name: 'GeForce RTX 4080 SUPER 16GB',
    price: 8999,
    color: 0x141b26,
    summary: '4K 高帧，310mm 卡身，320W 需要 850W 以上电源。',
    specs: {
      显存: '16 GB GDDR6X',
      位宽: '256-bit',
      加速频率: '2550 MHz',
      TDP: '320 W',
      长度: '310 mm',
      供电: '16-pin'
    },
    metrics: { score: 95, vramGB: 16, boostClock: 2550, busBits: 256, tdp: 320, lengthMM: 310 }
  },
  {
    id: 'gpu-nvidia-4090',
    category: 'gpu',
    vendor: 'NVIDIA',
    name: 'GeForce RTX 4090 24GB',
    price: 15999,
    color: 0x0d1320,
    summary: '旗舰卡，450W 功耗、336mm 长、3.5 槽厚。',
    specs: {
      显存: '24 GB GDDR6X',
      位宽: '384-bit',
      加速频率: '2520 MHz',
      TDP: '450 W',
      长度: '336 mm',
      供电: '16-pin'
    },
    metrics: { score: 99, vramGB: 24, boostClock: 2520, busBits: 384, tdp: 450, lengthMM: 336 }
  },
  {
    id: 'gpu-amd-7800xt',
    category: 'gpu',
    vendor: 'AMD',
    name: 'Radeon RX 7800 XT 16GB',
    price: 3999,
    color: 0x3b1d1d,
    summary: '16GB 大显存 2K 卡，267mm，双 8-pin 供电。',
    specs: {
      显存: '16 GB GDDR6',
      位宽: '256-bit',
      加速频率: '2430 MHz',
      TDP: '263 W',
      长度: '267 mm',
      供电: '8-pin ×2'
    },
    metrics: { score: 86, vramGB: 16, boostClock: 2430, busBits: 256, tdp: 263, lengthMM: 267 }
  },

  // ---------------------------------------------------------------- 硬盘
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
    id: 'ssd-wd-sn850x',
    category: 'storage',
    vendor: 'WD',
    name: 'WD_BLACK SN850X 1TB',
    price: 599,
    color: 0x2a3038,
    summary: 'PCIe 4.0 游戏盘，1TB 容量，带散热片版本可选。',
    specs: {
      容量: '1 TB',
      接口: 'PCIe 4.0 ×4',
      顺序读取: '7300 MB/s',
      顺序写入: '6300 MB/s',
      耐久: '600 TBW'
    },
    metrics: { capacityGB: 1024, readMBs: 7300, writeMBs: 6300, interface: 'PCIe 4.0' }
  },
  {
    id: 'ssd-crucial-t700',
    category: 'storage',
    vendor: 'Crucial',
    name: 'Crucial T700 2TB（PCIe 5.0）',
    price: 1899,
    color: 0x1f2937,
    summary: 'PCIe 5.0 旗舰盘，读 12400MB/s，发热也大。',
    specs: {
      容量: '2 TB',
      接口: 'PCIe 5.0 ×4',
      顺序读取: '12400 MB/s',
      顺序写入: '11800 MB/s',
      耐久: '1200 TBW'
    },
    metrics: { capacityGB: 2048, readMBs: 12400, writeMBs: 11800, interface: 'PCIe 5.0' }
  },

  // ---------------------------------------------------------------- 电源
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
  },
  {
    id: 'psu-seasonic-gx650',
    category: 'psu',
    vendor: 'Seasonic',
    name: 'Seasonic FOCUS GX-650',
    price: 549,
    color: 0x243b2f,
    summary: '650W 金牌，中端配置够用，带旗舰卡会吃紧。',
    specs: {
      额定功率: '650 W',
      认证: '80 PLUS Gold',
      规范: 'ATX 2.4',
      模组: '全模组',
      风扇: '120mm FDB'
    },
    metrics: { wattage: 650, efficiency: '80+ Gold' }
  },
  {
    id: 'psu-corsair-hx1200',
    category: 'psu',
    vendor: 'Corsair',
    name: 'Corsair HX1200 (2024)',
    price: 1899,
    color: 0x2b1f3a,
    summary: '1200W 白金，4090 + i9 这种组合也不虚。',
    specs: {
      额定功率: '1200 W',
      认证: '80 PLUS Platinum',
      规范: 'ATX 3.0',
      模组: '全模组',
      风扇: '140mm'
    },
    metrics: { wattage: 1200, efficiency: '80+ Platinum' }
  }
];

/** 默认演示配置：类别 → 部件 id（各部件互相兼容，autofill / 测试都用这一套） */
export const DEMO_BUILD = {
  case: 'case-lianli-o11d',
  motherboard: 'mb-asus-b650e-f',
  cpu: 'cpu-amd-7800x3d',
  cooler: 'cooler-noctua-nhd15',
  ram: 'ram-kingston-ddr5-6000',
  gpu: 'gpu-nvidia-4070tis',
  storage: 'ssd-samsung-990pro',
  psu: 'psu-corsair-rm850x'
};

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

/** 演示配置的部件对象（类别 → part） */
export function demoBuild() {
  return Object.fromEntries(
    Object.entries(DEMO_BUILD).map(([category, id]) => {
      const part = partById(id);
      if (!part) throw new Error(`DEMO_BUILD 里的 ${category} 找不到部件 ${id}`);
      return [category, part];
    })
  );
}

/** 目录里实际出现过的厂商（筛选芯片只显示这些） */
export function usedVendors() {
  return [...new Set(PARTS.map((p) => p.vendor))];
}
