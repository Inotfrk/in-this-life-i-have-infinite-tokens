/**
 * 程序化几何：按真实比例把每个部件搭出来（单位：厘米，1 = 10mm）。
 *
 * 三条约定：
 * 1. 局部原点 = 安装基准点（见 layout.js 的 MOUNTS / mountPoint），摆到机箱里只需要定位 + 绕 X 轴转；
 * 2. 模型直接按「装好以后的世界朝向」写：-X 朝玻璃侧板、+Y 朝上、+Z 朝前面板；
 * 3. 想换成真模型（GLB）时，保持 makePart 返回 Group、原点在同一位置即可，其余代码不用动。
 */

import * as THREE from 'three';
import { BOARD, BOARD_FEATURES, CASE, PART_BOXES } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function metal(color, { roughness = 0.42, metalness = 0.85, opacity = 1, transparent = false } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness,
    transparent, opacity,
    side: THREE.FrontSide,
    depthWrite: !transparent
  });
}

function plastic(color, { roughness = 0.62, metalness = 0.08, opacity = 1, transparent = false } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness,
    transparent, opacity,
    side: THREE.FrontSide,
    depthWrite: !transparent
  });
}

function glass(color = 0x9fb4c7, opacity = 0.09) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.06, metalness: 0.2,
    transparent: true, opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

function emissive(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, material, x, y, z, axis = 'y', segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function ring(radius, tube, material, x, y, z, axis = 'y') {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32), material);
  // TorusGeometry 默认躺在 XY 平面（轴 = +Z）
  if (axis === 'x') mesh.rotation.y = Math.PI / 2;
  else if (axis === 'y') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * 一把风扇：外框 + 轮毂 + 七片扇叶。
 * axis 是扇叶的转轴方向：'x' 表示风沿 X 轴吹，'y' 朝上，'z' 朝前。
 */
function fan({ radius, thickness = 2.5, axis = 'z', frame = 0x1b1b1f, blade = 0x2a2a30, hub = 0x3f3f46 }) {
  // 先在「转轴 = +Z」的局部坐标里搭好，最后整体转到目标朝向
  const g = new THREE.Group();
  const frameMat = plastic(frame, { roughness: 0.75 });
  const bladeMat = plastic(blade, { roughness: 0.5 });
  const hubMat = plastic(hub, { roughness: 0.4, metalness: 0.3 });
  const side = radius * 2 + 0.5;

  // 方形外框（四根窄条）
  g.add(box(side, 0.5, thickness, frameMat, 0, radius, 0));
  g.add(box(side, 0.5, thickness, frameMat, 0, -radius, 0));
  g.add(box(0.5, side, thickness, frameMat, radius, 0, 0));
  g.add(box(0.5, side, thickness, frameMat, -radius, 0, 0));
  // 外圈 + 轮毂
  g.add(ring(radius * 0.96, 0.12, frameMat, 0, 0, 0, 'z'));
  g.add(cylinder(radius * 0.27, thickness * 1.02, hubMat, 0, 0, 0, 'z', 16));

  // 七片扇叶：绕轴均分，各自带迎风角
  for (let i = 0; i < 7; i += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 7) * Math.PI * 2;
    const bladeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.62, radius * 0.5, 0.045),
      bladeMat
    );
    bladeMesh.position.set(radius * 0.58, 0, 0);
    bladeMesh.rotation.x = 0.42;
    pivot.add(bladeMesh);
    g.add(pivot);
  }

  if (axis === 'x') g.rotation.y = Math.PI / 2;
  else if (axis === 'y') g.rotation.x = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------- 机箱

function makeCase() {
  const g = new THREE.Group();
  const W = CASE.width;
  const H = CASE.height;
  const D = CASE.depth;
  const shell = plastic(0x22262c, { roughness: 0.55, metalness: 0.35 });
  const frameMat = metal(0x4c535c, { roughness: 0.35, metalness: 0.7 });
  const glassMat = glass();
  const meshMat = plastic(0x15181c, { roughness: 0.9 });

  // 底板 / 顶盖
  g.add(box(W, 0.8, D, shell, 0, 0.4, 0));
  g.add(box(W, 0.5, D, meshMat, 0, H - 0.25, 0));            // 顶盖防尘网
  // 左侧玻璃 + 前面玻璃（海景房）
  g.add(box(0.35, H - 1.4, D - 1.2, glassMat, -W / 2 + 0.175, H / 2, 0));
  g.add(box(W - 1.2, H - 1.4, 0.35, glassMat, 0, H / 2, D / 2 - 0.175));
  // 右侧钢板（电源仓外面）与背板
  g.add(box(0.25, H - 1.4, D - 1.2, shell, W / 2 - 0.125, H / 2, 0));
  g.add(box(W, H - 1.4, 0.4, shell, 0, H / 2, -D / 2 + 0.2));

  // 玻璃四周的金属边框，暗场里能看出轮廓
  for (const [x, y, z, w, h, d] of [
    [-W / 2 + 0.175, H / 2, -D / 2 + 0.9, 0.5, H - 1.0, 1.8],
    [-W / 2 + 0.175, H / 2, D / 2 - 0.9, 0.5, H - 1.0, 1.8],
    [-W / 2 + 0.175, H - 0.9, 0, 0.5, 1.8, D - 2.0],
    [-W / 2 + 0.175, 0.9, 0, 0.5, 1.8, D - 2.0]
  ]) {
    g.add(box(w, h, d, frameMat, x, y, z));
  }

  // 主板托盘：半透明（X 光视角），否则双仓机箱根本看不到右边的电源
  const trayMat = new THREE.MeshStandardMaterial({
    color: 0x2a3138, roughness: 0.55, metalness: 0.3, transparent: true, opacity: 0.45, depthWrite: false
  });
  g.add(box(0.2, H - 6.0, D - 6.0, trayMat, CASE.xTray + 0.1, H / 2 - 0.5, -2));
  // 托盘上的走线孔
  const grommet = plastic(0x0e1013, { roughness: 0.9 });
  for (const z of [-16.0, -3.0, 8.0]) {
    g.add(box(0.6, 5.0, 3.0, grommet, CASE.xTray + 0.1, H / 2 - 3.0, z));
  }
  // 主板铜柱
  const standoffMat = metal(0xb08d57, { roughness: 0.4, metalness: 0.9 });
  for (const [y, z] of [[BOARD.y0 + 1.2, BOARD.z0 + 1.2], [BOARD.y0 + 1.2, BOARD.z1 - 1.4],
    [BOARD.y1 - 3.0, BOARD.z0 + 1.2], [BOARD.y1 - 3.0, BOARD.z1 - 1.4], [BOARD.y0 + 14.0, BOARD.z0 + 1.2]]) {
    g.add(cylinder(0.3, CASE.standoff, standoffMat, CASE.xTray - CASE.standoff / 2, y, z, 'x', 10));
  }

  // 背板开孔：后置 I/O、PCIe 挡板、电源、风扇
  const cover = metal(0x353a41, { roughness: 0.45 });
  const io = BOARD_FEATURES.io;
  g.add(box(0.3, io.height + 0.6, io.width + 0.6, plastic(0x0b0d10), CASE.xTray + 0.15, io.y, io.z));
  // 七条 PCIe 挡板（第一条装显卡的位置留空由显卡自己带）
  for (let i = 0; i < 7; i += 1) {
    const y = BOARD_FEATURES.pcie[0].y - i * 2.03;
    g.add(box(0.35, 1.7, 12.0, cover, CASE.xTray + 0.2, y, -14.0));
  }
  // 后置 120mm 排风扇 + 顶部三把、底部三把
  const rear = fan({ radius: 5.4, thickness: 2.2, axis: 'z' });
  rear.position.set(-5.0, 41.0, -21.4);
  g.add(rear);
  for (const z of [-13.0, 0.0, 13.0]) {
    const top = fan({ radius: 5.6, thickness: 2.4, axis: 'y' });
    top.position.set(-3.0, 44.0, z);
    g.add(top);
    const bottom = fan({ radius: 5.6, thickness: 2.4, axis: 'y' });
    bottom.position.set(-3.0, 2.0, z);
    g.add(bottom);
  }

  // 脚垫
  for (const x of [-W / 2 + 1.6, W / 2 - 1.6]) {
    for (const z of [-D / 2 + 1.6, D / 2 - 1.6]) {
      g.add(cylinder(0.85, 0.8, plastic(0x0a0b0d), x, -0.4, z, 'y', 12));
    }
  }

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
    new THREE.LineBasicMaterial({ color: 0x7f8b99, transparent: true, opacity: 0.35 })
  );
  outline.position.y = H / 2;
  g.add(outline);

  // 电源仓（右侧）的通风网，从右面看能隐约看到电源
  g.add(box(0.15, 20, 26, plastic(0x0f1115, { roughness: 0.9 }), W / 2 - 0.3, 12, -2));
  return g;
}

// ---------------------------------------------------------------- 主板

const BOARD_CY = BOARD.y0 + BOARD.height / 2;
const BOARD_CZ = BOARD.z0 + BOARD.width / 2;
const ly = (y) => y - BOARD_CY;
const lz = (z) => z - BOARD_CZ;

function makeMotherboard() {
  const g = new THREE.Group();
  const pcbMat = plastic(0x1d3a2a, { roughness: 0.82 });
  const slotMat = plastic(0x22282f, { roughness: 0.72 });
  const metalMat = metal(0xa8afb8, { roughness: 0.35 });
  const silkMat = plastic(0xcfd6cf, { roughness: 0.8 });

  // PCB + 边缘丝印
  g.add(box(0.16, BOARD.height, BOARD.width, pcbMat, -0.08, 0, 0));
  // 丝印框线：真实板子上到处都是，能明显改善「一块黑板」的观感
  for (const [dy, dz, len] of [[12.0, 8.0, 14.0], [-11.0, 6.0, 10.0], [4.0, -9.0, 6.0]]) {
    g.add(box(0.02, 0.08, len, silkMat, -0.17, dy, dz));
    g.add(box(0.02, len, 0.08, silkMat, -0.17, dy, dz));
  }

  const socket = BOARD_FEATURES.socket;
  // 供电相位的固态电容（插座旁边一排）
  for (let i = 0; i < 8; i += 1) {
    const y = ly(socket.y) - 5.4;
    const z = lz(socket.z) - 4.0 + Math.floor(i / 2) * 2.4;
    g.add(cylinder(0.32, 1.0, metal(0x9aa3ad, { roughness: 0.4 }), -0.7, y, z, 'x', 10));
  }
  // 插座底座 + 压扣
  g.add(box(0.5, 5.2, 5.2, plastic(0x1f2937, { roughness: 0.7 }), -0.4, ly(socket.y), lz(socket.z)));
  g.add(box(0.12, 4.4, 4.4, metal(0xc8ccd2, { roughness: 0.25, metalness: 0.95 }), -0.68, ly(socket.y), lz(socket.z)));
  g.add(box(0.4, 0.5, 3.6, metalMat, -0.75, ly(socket.y) + 2.6, lz(socket.z)));

  // 四条内存插槽（含卡扣），只给两条装内存，但四条都画出来
  BOARD_FEATURES.dimm.centers.forEach((z) => {
    g.add(box(0.55, 13.3, 0.5, slotMat, -0.45, ly(BOARD.y1 - 13.3 / 2), lz(z)));
    g.add(box(0.6, 0.5, 0.55, metalMat, -0.5, ly(BOARD.y1 - 13.3) + 0.1, lz(z) + 0.0));
    g.add(box(0.6, 0.5, 0.55, metalMat, -0.5, ly(BOARD.y1) - 0.1, lz(z)));
  });

  // PCIe 插槽（第一条带金属加固）
  BOARD_FEATURES.pcie.forEach((slot, i) => {
    const mat = i === 0 ? metal(0x9aa3ad, { roughness: 0.3 }) : slotMat;
    g.add(box(0.7, 1.0, slot.length, mat, -0.5, ly(slot.y), lz(slot.z + slot.length / 2)));
    g.add(box(0.9, 1.2, 1.4, slotMat, -0.55, ly(slot.y), lz(slot.z + slot.length + 0.4)));
  });

  // M.2 插槽 + 散热马甲
  const m2 = BOARD_FEATURES.m2;
  g.add(box(0.55, 2.4, 1.0, slotMat, -0.45, ly(m2.y), lz(m2.z)));
  g.add(box(0.9, 2.2, m2.length, metal(0x6b7280, { roughness: 0.4 }), -0.7, ly(m2.y), lz(m2.z + m2.length / 2 + 0.6)));

  // 芯片组散热片
  const chip = BOARD_FEATURES.chipset;
  g.add(box(1.6, 5.6, 6.0, metal(0x3a4250, { roughness: 0.35 }), -1.0, ly(chip.y), lz(chip.z)));
  g.add(box(0.4, 4.0, 4.4, metal(0x596273, { roughness: 0.3 }), -1.7, ly(chip.y), lz(chip.z)));

  // VRM 散热片：插座上方和后方
  g.add(box(1.1, 2.2, 9.0, metal(0x2f3742, { roughness: 0.35 }), -0.8, ly(socket.y) + 3.6, lz(socket.z)));
  g.add(box(1.1, 6.0, 2.2, metal(0x2f3742, { roughness: 0.35 }), -0.8, ly(socket.y) + 0.2, lz(socket.z) - 3.6));

  // 后置 I/O 罩与接口
  const io = BOARD_FEATURES.io;
  g.add(box(0.9, io.height, io.width, metal(0x22282f, { roughness: 0.5 }), -0.55, ly(io.y), lz(io.z)));
  for (let i = 0; i < 6; i += 1) {
    g.add(box(0.5, 1.2, 1.4, metal(0xb08d57, { metalness: 0.9 }), -0.95, ly(io.y) - 1.0 + (i % 3) * 1.1, lz(io.z) - 6.0 + Math.floor(i / 3) * 2.0));
  }

  // 24-pin / 8-pin 供电接口
  const atx = BOARD_FEATURES.atx24;
  g.add(box(1.2, 5.4, 2.2, plastic(0x0d1013), -0.7, ly(atx.y), lz(atx.z)));
  const eps = BOARD_FEATURES.eps8;
  g.add(box(1.2, 2.4, 4.4, plastic(0x0d1013), -0.7, ly(eps.y), lz(eps.z)));

  // 各种小接口：SATA、风扇针脚、前面板跳线
  for (let i = 0; i < 4; i += 1) {
    g.add(box(0.8, 1.2, 1.6, plastic(0x11151a), -0.6, ly(BOARD.y0 + 4.0), lz(BOARD.z1 - 2.0 - i * 2.0)));
  }
  for (const [y, z] of [[BOARD.y1 - 4.0, BOARD.z0 + 3.0], [BOARD.y0 + 2.0, BOARD.z1 - 6.0]]) {
    g.add(box(0.5, 0.5, 1.2, plastic(0x1a1f26), -0.4, ly(y), lz(z)));
  }
  return g;
}

// ---------------------------------------------------------------- CPU

function makeCpu() {
  const g = new THREE.Group();
  const socket = BOARD_FEATURES.socket;
  // 基板：AM5 是 40 × 40 的正方形，边角有防呆缺口
  g.add(box(0.12, 4.0, 4.0, plastic(0x0d2a10, { roughness: 0.8 }), -0.06, 0, 0));
  // 顶盖（IHS）：略小于基板，四周留出黑边
  g.add(box(0.26, 3.2, 3.2, metal(0xcbd5e1, { metalness: 0.95, roughness: 0.18 }), -0.24, 0, 0));
  // 防呆三角：真实 CPU 上印在基板一角，装反了根本压不下去
  g.add(box(0.02, 0.5, 0.5, emissive(0xf59e0b, 1.2), -0.13, -1.6, -1.6));
  // 顶盖上的型号丝印
  g.add(box(0.02, 0.3, 1.8, plastic(0x94a3b8, { roughness: 0.5 }), -0.38, 0.9, 0));
  g.userData.socket = socket;
  return g;
}

// ---------------------------------------------------------------- 内存

function makeRam(part) {
  const g = new THREE.Group();
  const length = BOARD_FEATURES.dimm.length;
  for (const dz of [-0.42, 0.42]) {
    const stick = new THREE.Group();
    // PCB
    stick.add(box(0.12, length, 0.15, plastic(0x0b3d2e, { roughness: 0.7 }), -0.06, length / 2, dz));
    // 金属马甲：DDR5 UDIMM 带马甲是 133.35 × 34.9 × 6.62mm
    stick.add(box(2.7, length - 0.6, 0.62, metal(part.color, { roughness: 0.4, metalness: 0.7 }), -1.75, length / 2, dz));
    // 顶部 RGB 导光条
    stick.add(box(0.55, 0.55, 0.58, emissive(0x22d3ee, 1.6), -3.1, length - 0.25, dz));
    // 防呆缺口（金手指中间偏一侧）
    stick.add(box(0.02, 0.12, 0.16, plastic(0xd4af37, { metalness: 1 }), -0.02, 0.6, dz));
    stick.add(box(0.02, 0.12, 0.16, plastic(0x111827), -0.02, 4.4, dz));
    g.add(stick);
  }
  return g;
}

// ---------------------------------------------------------------- 散热器

function makeCooler(part) {
  const g = new THREE.Group();
  // 高度读真实规格（165 / 158 / 155 / 145mm），塔身高度跟着变
  const height = (part?.metrics?.heightMM ?? 165) / 10;
  const towerTop = -(height - 1.0);
  const finTop = towerTop + 0.4;
  const fanRadius = Math.min(7.0, Math.max(5.0, height * 0.43));
  const copper = metal(0xc98a52, { roughness: 0.28, metalness: 0.95 });
  const alu = metal(0xb9bec6, { roughness: 0.3, metalness: 0.9 });
  const noctua = plastic(0x8c6b4f, { roughness: 0.55 });
  const noctuaDark = plastic(0x5d4632, { roughness: 0.6 });

  // 底座 + 压板（贴着 CPU 顶盖，x=0 就是 CPU 顶面）
  g.add(box(0.7, 4.6, 4.6, copper, -0.35, 0, 0));
  g.add(box(0.35, 8.0, 8.0, metal(0x3f3f46, { roughness: 0.4 }), -0.85, 0, 0));

  // 六根热管：从底座沿 -X 穿过两个塔（每塔三根）
  const pipeLength = Math.abs(towerTop) - 1.4;
  for (const towerZ of [-4.5, 4.5]) {
    for (const dy of [-1.1, 0, 1.1]) {
      g.add(cylinder(0.32, pipeLength, copper, -(1.0 + pipeLength / 2), dy, towerZ, 'x', 12));
    }
    // 热管在塔顶弯回去，做成 U 形收尾
    g.add(ring(0.9, 0.32, copper, towerTop + 0.3, 0, towerZ, 'x'));
  }

  // 双塔：鳍片沿 X 叠（塔身朝玻璃侧板延伸），两组塔在 Z 方向前后排开
  const finGeo = new THREE.BoxGeometry(0.08, 14.6, 4.6);
  const finMat = metal(0xc7ccd2, { roughness: 0.35, metalness: 0.85 });
  const finCount = Math.max(20, Math.round((Math.abs(finTop) - 3.4) / 0.3));
  const finSpan = Math.abs(finTop) - 3.4;
  for (const towerZ of [-4.5, 4.5]) {
    const fins = new THREE.InstancedMesh(finGeo, finMat, finCount);
    const m = new THREE.Matrix4();
    for (let i = 0; i < finCount; i += 1) {
      m.makeTranslation(-3.4 - i * 0.3, 0, towerZ);
      fins.setMatrixAt(i, m);
    }
    fins.castShadow = true;
    g.add(fins);
    // 塔顶装饰条（Noctua 的减震垫位置）
    g.add(box(finSpan, 0.22, 4.2, noctua, -(3.4 + finSpan / 2), 7.35, towerZ));
    g.add(box(finSpan, 0.22, 4.2, noctuaDark, -(3.4 + finSpan / 2), -7.35, towerZ));
  }

  // 两把 140mm 风扇：一把在最前（推），一把夹在两塔之间（接力），风朝后置 I/O 吹
  const fanX = -(height * 0.55);
  for (const [z, tone] of [[7.8, noctua], [1.0, noctuaDark]]) {
    const f = fan({ radius: fanRadius, thickness: 2.4, axis: 'z', frame: tone, blade: 0x6b5138, hub: 0x2c2620 });
    f.position.set(fanX, 0, z);
    g.add(f);
    // 风扇线
    g.add(box(0.06, 3.2, 0.06, plastic(0x111111), fanX, -fanRadius + 0.6, z));
  }

  // 顶盖装饰
  g.add(box(0.3, 3.2, 10.0, noctua, towerTop - 0.1, 5.6, 0));
  return g;
}

// ---------------------------------------------------------------- 显卡

function makeGpu(part) {
  const g = new THREE.Group();
  // 长度读真实规格（245 / 267 / 310 / 336mm…）
  const L = (part?.metrics?.lengthMM ?? 336) / 10;
  const TH = 5.4;          // 三槽厚
  const H = 13.2;          // 从 PCB 到挡板顶边
  const shroud = plastic(part.color, { roughness: 0.5, metalness: 0.25 });
  const backplate = metal(0x1a1e24, { roughness: 0.45, metalness: 0.55 });

  // 卡身：X 方向是「从主板往玻璃伸出 13.2cm」，Y 是厚度。
  // PCB 贴着插槽那一层（y≈0），散热器和风扇整块挂在下面——真机就是这样，
  // 之前以插槽为中心上下各一半，会插进上面的 M.2 马甲里。
  const bodyY = -TH / 2 + 0.35;
  g.add(box(H, TH, L, shroud, -H / 2, bodyY, L / 2));
  // 背板（朝上，正好压在插槽上方一点点）
  g.add(box(H, 0.25, L, backplate, -H / 2, bodyY + TH / 2 + 0.12, L / 2));
  // 三把 100mm 风扇朝下
  for (const z of [L * 0.22, L * 0.5, L * 0.78]) {
    const f = fan({ radius: 5.0, thickness: 0.8, axis: 'y', frame: 0x0b0d10, blade: 0x15171b, hub: 0x2a2d33 });
    f.position.set(-H / 2, bodyY - TH / 2 - 0.1, z);
    g.add(f);
  }
  // 侧面（朝玻璃）的导光条，模拟 GEFORCE RTX 灯条
  g.add(box(0.15, 0.9, L * 0.55, emissive(0x8b9bff, 1.1), -H - 0.02, bodyY + 0.9, L * 0.45));
  // 银灰色腰线，让卡身侧面不至于一条黑
  g.add(box(0.12, 1.1, L * 0.92, metal(0x7c8592, { roughness: 0.35 }), -H - 0.01, bodyY - 1.7, L * 0.5));
  // 金手指（插进 PCIe 插槽）+ PCB：贴着槽那一层
  g.add(box(3.0, 0.35, 8.6, plastic(0x0e1a12, { roughness: 0.8 }), -1.5, 0.1, 4.4));
  g.add(box(2.8, 0.05, 8.4, plastic(0xd4af37, { metalness: 1, roughness: 0.3 }), -1.5, -0.08, 4.4));
  // 后置挡板（贴机箱背板，从插槽往下一整块）+ 三个 DP + 一个 HDMI
  g.add(box(0.35, TH + 0.6, 1.2, metal(0x9aa3ad, { roughness: 0.35 }), -TH / 2 + 1.0, bodyY, -0.4));
  for (let i = 0; i < 3; i += 1) {
    g.add(box(0.5, 0.9, 0.5, plastic(0x11151a), -TH / 2 + 1.0, bodyY - 1.2 + i * 1.0, -0.9));
  }
  // 16-pin 供电口（在背板这一侧）
  g.add(box(0.9, 1.1, 2.0, plastic(0x0b0d10), -H + 0.6, bodyY + TH / 2 + 0.15, L * 0.62));
  // 支撑条
  g.add(box(0.4, 0.4, L * 0.8, metal(0x4b5563, { roughness: 0.4 }), -H * 0.55, bodyY + TH / 2 + 0.3, L * 0.5));
  return g;
}

// ---------------------------------------------------------------- 固态硬盘

function makeSsd(part) {
  const g = new THREE.Group();
  const len = 8.0;
  // 2280：8cm 长、2.2cm 宽、PCB 0.3cm 厚，M key 金手指在最前（-Z 端）
  g.add(box(0.28, 2.2, len, plastic(0x11161c, { roughness: 0.7 }), -0.14, 0, len / 2));
  // 贴纸 / 颗粒
  g.add(box(0.06, 1.6, 4.0, metal(part.color, { roughness: 0.45 }), -0.3, 0, len * 0.55));
  // 金手指与防呆缺口
  g.add(box(0.06, 2.0, 0.9, plastic(0xd4af37, { metalness: 1, roughness: 0.3 }), -0.3, 0, 0.5));
  g.add(box(0.08, 0.5, 0.22, plastic(0x0a0d10), -0.31, 0.55, 0.5));
  // 尾部固定螺丝
  g.add(cylinder(0.22, 0.3, metal(0xb08d57, { metalness: 0.9 }), -0.2, 0, len - 0.3, 'x', 10));
  return g;
}

// ---------------------------------------------------------------- 电源

function makePsu(part) {
  const g = new THREE.Group();
  const shellMat = metal(part.color, { roughness: 0.5, metalness: 0.6 });
  // 15 × 8.6 × 16 cm，风扇朝右侧板（+X，机箱通风面）
  g.add(box(8.6, 15.0, 16.0, shellMat, 0, 0, 0));
  const f = fan({ radius: 6.8, thickness: 1.0, axis: 'x', frame: 0x0b0d10, blade: 0x17191d, hub: 0x2b2f36 });
  f.position.set(4.4, 0, 0);
  g.add(f);
  g.add(ring(6.9, 0.12, metal(0x9aa3ad), 4.5, 0, 0, 'x'));
  // 模组接口（朝前面板那一侧）
  for (let i = 0; i < 4; i += 1) {
    g.add(box(0.5, 2.2, 1.6, plastic(0x11161c), 0, -4.5 + i * 3.0, 8.1));
  }
  // 电源线插座 + 开关（朝后）
  g.add(box(3.0, 3.6, 0.5, plastic(0x0b0d10), -1.2, 3.6, -8.1));
  g.add(box(1.2, 1.0, 0.5, plastic(0x2b2f36), 2.4, 3.6, -8.1));

  // 模组线：从接口出来往上、往前甩一段，走线才像真的
  const cableMat = plastic(0x15181d, { roughness: 0.92 });
  for (let i = 0; i < 3; i += 1) {
    const y0 = -4.5 + i * 3.0;
    const curve = new THREE.CatmullRomCurve3([
      V(0, y0, 8.2), V(0.4, y0 + 0.6, 10.5), V(-0.6, y0 + 2.4, 12.4), V(-1.4, y0 + 4.2, 13.2)
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.42, 7, false), cableMat);
    tube.castShadow = true;
    g.add(tube);
  }
  // 铭牌
  g.add(box(4.4, 5.0, 0.06, metal(0xd6d3cd, { roughness: 0.6, metalness: 0.2 }), -2.6, -4.4, -8.06));
  return g;
}

const BUILDERS = {
  case: makeCase,
  motherboard: makeMotherboard,
  cpu: makeCpu,
  cooler: makeCooler,
  ram: makeRam,
  gpu: makeGpu,
  storage: makeSsd,
  psu: makePsu
};

/**
 * 把一个部件数据变成 Three.js Group（局部原点 = 安装基准点）。
 * @param {object} part catalog.js 里的部件
 */
export function makePart(part) {
  const builder = BUILDERS[part.category];
  if (!builder) throw new Error(`没有 ${part.category} 的模型`);
  const group = builder(part);
  group.name = part.id;
  group.userData = {
    partId: part.id,
    category: part.category,
    box: PART_BOXES[part.category]
  };
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

export const PART_BUILDERS = BUILDERS;
export { fan };
