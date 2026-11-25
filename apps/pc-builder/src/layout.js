/**
 * 真实布局：把机箱、主板、各个接口的位置集中到一张表里（单位：厘米，1 = 10mm）。
 *
 * 依据来自厂商规格与实机照片（见 README 的「真实依据」一节）：
 * - Lian Li O11 Dynamic EVO：285 × 465 × 459 mm，双仓（左侧主板仓 + 右侧电源仓），
 *   前面板与左侧板都是钢化玻璃，所以叫「海景房」。
 * - ATX 主板 305 × 244 mm：竖装，PCB 平面与侧板平行，后置 I/O 朝机箱后方、往上。
 *   CPU 插座在板上偏后偏上；四条内存插槽在插座前方（朝机箱前面板）；PCIe x16 插槽在插座下方，
 *   沿进深方向水平排列；显卡插进去以后是**横着**挂的，风扇朝下、卡身朝玻璃侧板伸出约 13cm。
 * - 塔式风冷（NH-D15，165mm 高）：塔身**垂直于主板**朝玻璃侧板方向伸出，风扇在前后两面，
 *   风道从机箱前面板吹向后置 I/O（前 → 后）。
 *
 * 坐标约定（和 Three.js 一致）：
 *   +X 朝右（主板托盘 / 电源仓那一侧），-X 朝左（玻璃侧板）
 *   +Y 朝上，+Z 朝前（前面板），-Z 朝后（后置 I/O / 背板）
 *
 * 所有部件的模型都按「装好以后的世界朝向」编写，局部原点 = 安装基准点，
 * 于是安装 = 把 group 摆到 mount 上，再绕 X 轴转 orientation 度即可。
 */

const mm = (v) => v / 10;

export const CASE = {
  /** 外壳尺寸 285 × 465 × 459 mm */
  width: mm(285),
  height: mm(465),
  depth: mm(459),
  /** 板厚：玻璃 2.5mm、钢板 10mm（含骨架） */
  glass: 0.35,
  panel: 0.25,
  /** 内部空间（世界坐标） */
  xLeft: -14.0,   // 左侧玻璃内表面
  xTray: 5.2,     // 主板托盘正面（主板铜柱就装在这上面）
  xRearChamber: 5.4, // 托盘背面 = 右侧电源仓起点
  xRight: 14.0,   // 右侧板内表面
  yFloor: 0.8,    // 机箱内底面
  yCeil: 45.0,    // 顶盖内表面
  zBack: -22.5,   // 背板内表面
  zFront: 22.5,   // 前面板内表面
  /** 主板铜柱高度 */
  standoff: 0.55
};

/** 主板：ATX 305 × 244，PCB 正面（装零件那一面）朝玻璃侧板 */
export const BOARD = {
  height: mm(305),
  width: mm(244),
  pcb: 0.16,
  /** 板子下边缘 / 后边缘（世界坐标） */
  y0: 7.6,
  z0: -18.4,
  get y1() { return this.y0 + this.height; },      // 38.1
  get z1() { return this.z0 + this.width; },       // 6.0
  /** PCB 正面：铜柱 + PCB 厚度之后 */
  get x() { return CASE.xTray - CASE.standoff - this.pcb; }  // 4.49
};

/** 板上各接口的位置。y/z 是接口中心，ax 是「离 PCB 多高」，x = BOARD.x + 朝玻璃的方向即负值。 */
export const BOARD_FEATURES = {
  socket: { y: BOARD.y1 - 8.6, z: BOARD.z0 + 9.2, size: 4.0 },
  /** 四条 DDR5 插槽，从插座往前排，节距 7.8mm */
  dimm: { centers: [2.4, 3.18, 3.96, 4.74].map((dz) => BOARD.z0 + 9.2 + dz), pitch: 0.78, length: 13.3 },
  pcie: [
    { y: BOARD.y1 - 17.8, z: BOARD.z0 + 1.0, length: 8.9 },  // 第一条 x16
    { y: BOARD.y1 - 24.2, z: BOARD.z0 + 1.0, length: 8.9 }   // 第二条 x16
  ],
  m2: { y: BOARD.y1 - 15.5, z: BOARD.z0 + 6.0, length: 8.0 },
  chipset: { y: BOARD.y1 - 27.6, z: BOARD.z0 + 12.5 },
  io: { y: BOARD.y1 - 2.2, z: BOARD.z0 + 7.9, height: 4.4, width: 15.8 },
  atx24: { y: BOARD.y1 - 8.0, z: BOARD.z1 - 1.4 },
  eps8: { y: BOARD.y1 - 0.5, z: BOARD.z0 + 12.0 }
};

/** 板外接口的插槽定义：拖拽时用来判定「放对位置没有」 */
export const MOUNTS = {
  case: {
    axis: 'y',                 // 机箱落在桌面上
    point: [0, 0, 0],
    tolerance: 16,
    keyed: null,
    size: [CASE.width, CASE.height, CASE.depth]
  },
  motherboard: {
    axis: 'x',
    point: [BOARD.x + 0.081, BOARD.y0, BOARD.z0],   // PCB 的中心（原点是板的左下后角）
    originOffset: [0, BOARD.height / 2, BOARD.width / 2],
    tolerance: 1.6,
    keyed: [0],
    size: [0.16, BOARD.height, BOARD.width]
  },
  cpu: {
    axis: 'x',
    point: [BOARD.x, BOARD_FEATURES.socket.y, BOARD_FEATURES.socket.z],
    tolerance: 0.75,
    keyed: [0],
    size: [1.2, 4.0, 4.0]
  },
  cooler: {
    axis: 'x',
    point: [BOARD.x - 1.0, BOARD_FEATURES.socket.y, BOARD_FEATURES.socket.z], // CPU 顶盖上方
    tolerance: 1.3,
    keyed: null,          // 能转，但转错了有后果（见 assembly.js）
    size: [16.5, 15.0, 16.2]
  },
  ram: {
    axis: 'x',
    point: [BOARD.x, 0, 0],   // y/z 由具体插槽给
    slots: [BOARD_FEATURES.dimm.centers[1], BOARD_FEATURES.dimm.centers[3]],
    tolerance: 0.8,
    keyed: [0],
    size: [3.3, 13.3, 0.85]
  },
  gpu: {
    axis: 'x',
    point: [BOARD.x, BOARD_FEATURES.pcie[0].y, BOARD_FEATURES.pcie[0].z],
    tolerance: 1.0,
    keyed: [0],
    size: [13.2, 5.4, 33.6]
  },
  storage: {
    axis: 'x',
    point: [BOARD.x, BOARD_FEATURES.m2.y, BOARD_FEATURES.m2.z + 4.0],
    tolerance: 0.6,
    keyed: [0],
    size: [0.6, 2.2, 8.0]
  },
  psu: {
    axis: 'x',
    point: [(CASE.xRearChamber + CASE.xRight) / 2, 12.5, -6.0],
    tolerance: 1.8,
    keyed: null,
    size: [8.6, 15.0, 16.0]
  }
};

/** 机箱内部可用空间（物理碰撞用） */
export function interiorBounds() {
  return {
    min: [CASE.xLeft, CASE.yFloor, CASE.zBack],
    max: [CASE.xRight, CASE.yCeil, CASE.zFront]
  };
}

/** 某个轴上的「装好以后中心点」——机箱是特例（原点在底面中心） */
export function mountPoint(category, slotIndex = 0) {
  const mount = MOUNTS[category];
  if (category === 'ram') {
    const z = mount.slots[Math.min(slotIndex, mount.slots.length - 1)];
    return [BOARD.x, BOARD.y1 - BOARD_FEATURES.dimm.length, z];
  }
  if (category === 'motherboard') {
    const [x, y, z] = mount.point;
    return [x, y + mount.originOffset[1], z + mount.originOffset[2]];
  }
  return [...mount.point];
}

/** 旋转 90° 的整数倍时，AABB 可以直接交换 Y/Z 两个半长 */
export function rotateBox(box, degrees) {
  const steps = ((Math.round(degrees / 90) % 4) + 4) % 4;
  const { min, max } = box;
  if (steps % 2 === 0) {
    if (steps === 2) {
      // 绕 X 轴转 180°：只有 Y/Z 变号，X（离主板的距离）不变
      return { min: [min[0], -max[1], -max[2]], max: [max[0], -min[1], -min[2]] };
    }
    return { min: [...min], max: [...max] };
  }
  // 绕 X 轴转 90°：y' = -z, z' = y
  const corners = [];
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) {
        const ny = steps === 1 ? -z : z;
        const nz = steps === 1 ? y : -y;
        corners.push([x, ny, nz]);
      }
    }
  }
  return {
    min: [0, 1, 2].map((i) => Math.min(...corners.map((c) => c[i]))),
    max: [0, 1, 2].map((i) => Math.max(...corners.map((c) => c[i])))
  };
}

/** AABB 平移 */
export function translateBox(box, offset) {
  return {
    min: box.min.map((v, i) => v + offset[i]),
    max: box.max.map((v, i) => v + offset[i])
  };
}

/** 两个 AABB 是否相交（留一点公差，贴着不算撞） */
export function boxesOverlap(a, b, epsilon = 0.05) {
  return [0, 1, 2].every((i) => a.min[i] < b.max[i] - epsilon && b.min[i] < a.max[i] - epsilon);
}

/** 相交体积（cm³），用来判断碰撞严重程度 */
export function overlapVolume(a, b) {
  let volume = 1;
  for (let i = 0; i < 3; i += 1) {
    const overlap = Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]);
    if (overlap <= 0) return 0;
    volume *= overlap;
  }
  return volume;
}

/** 每个类别自己的包围盒（局部坐标，原点 = 安装基准点，单位 cm） */
export const PART_BOXES = {
  motherboard: { min: [-0.08, -BOARD.height / 2, -BOARD.width / 2], max: [0.08, BOARD.height / 2, BOARD.width / 2] },
  cpu: { min: [-0.5, -2.0, -2.0], max: [0.02, 2.0, 2.0] },
  cooler: { min: [-16.5, -7.5, -8.1], max: [0.1, 7.5, 8.1] },
  ram: { min: [-3.5, 0, -0.35], max: [0.16, 13.3, 0.35] },
  gpu: { min: [-13.2, -2.7, -0.4], max: [0.1, 2.7, 33.6] },
  storage: { min: [-0.6, -1.1, -4.0], max: [0.05, 1.1, 4.0] },
  psu: { min: [-4.3, -7.5, -8.0], max: [4.3, 7.5, 8.0] },
  case: { min: [-CASE.width / 2, 0, -CASE.depth / 2], max: [CASE.width / 2, CASE.height, CASE.depth / 2] }
};

/**
 * 散热器的子盒：整台散热器套一个大盒子会把内存、显卡都算成干涉，
 * 真机上真正会撞的是「塔身」和「正面风扇」，所以单独列出来做检查。
 */
export const COOLER_SUBBOXES = [
  { name: '扣具底座', min: [-1.0, -2.4, -2.4], max: [0.2, 2.4, 2.4] },
  { name: '塔身（前）', min: [-15.9, -7.3, 2.2], max: [-3.4, 7.3, 6.8] },
  { name: '塔身（后）', min: [-15.9, -7.3, -6.8], max: [-3.4, 7.3, -2.2] },
  { name: '正面风扇', min: [-15.9, -7.25, 6.6], max: [-2.3, 7.25, 9.0] },
  { name: '中间风扇', min: [-15.9, -7.25, -0.2], max: [-2.3, 7.25, 2.2] }
];

/** 每个类别参与干涉检查的子盒；没有列出来的用 PART_BOXES */
export const SUBBOXES = {
  cooler: COOLER_SUBBOXES,
  ram: [
    { name: '内存 1', min: [-3.5, 0, -0.35], max: [0.16, 13.3, 0.35] },
    { name: '内存 2', min: [-3.5, 0, -0.35], max: [0.16, 13.3, 0.35] }
  ]
};

