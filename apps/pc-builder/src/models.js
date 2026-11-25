/**
 * 程序化几何：每个类别一个可辨认的低模（单位：厘米，和真实机箱尺寸同量级）。
 *
 * 为什么不用网上的 GLB：demo 要能离线跑、不背第三方模型授权。想要真模型时，
 * 在这里按 `part.category` 换成 GLTFLoader 加载即可，外部接口（makePart 返回 Group）不变。
 */

import * as THREE from 'three';

const CM = 1;

/**
 * 材质统一走 FrontSide（默认值，这里显式写出来）：背面剔除是开着的，
 * 盒子内壁不会被画，省一半填充率；透明件额外关掉 depthWrite，避免排序把内部件糊掉。
 */
function metal(color, { roughness = 0.5, metalness = 0.6, opacity = 1, transparent = false } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
    side: THREE.FrontSide,
    depthWrite: !transparent
  });
}

function plastic(color, { roughness = 0.7, metalness = 0.1, opacity = 1, transparent = false } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
    side: THREE.FrontSide,
    depthWrite: !transparent
  });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * CM, h * CM, d * CM), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, material, x, y, z, axis = 'y') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** 机箱：透明侧板 + 边框线，能看见内部 */
function makeCase(part) {
  const g = new THREE.Group();
  const W = 24, H = 50, D = 48;
  const shell = plastic(0xb9c2cc, { opacity: 0.07, transparent: true, metalness: 0.15 });
  const frame = metal(0x7d8694, { opacity: 0.95, roughness: 0.5, metalness: 0.35 });

  g.add(box(W, 1.2, D, frame, 0, 0, 0));            // 底板
  g.add(box(W, 1.2, D, frame, 0, H, 0));            // 顶板
  g.add(box(1.2, H, D, shell, -W / 2, H / 2, 0));   // 左侧板
  g.add(box(1.2, H, D, shell, W / 2, H / 2, 0));    // 玻璃侧板
  g.add(box(W, H, 1.2, shell, 0, H / 2, -D / 2));   // 背板
  g.add(box(W, H, 1.2, shell, 0, H / 2, D / 2));    // 前面板

  // 主板托盘：贴在背板内侧
  g.add(box(22, 34, 0.6, metal(0x1f2937, { metalness: 0.5 }), 0, 26, -22.4));

  // 四个脚垫
  for (const x of [-W / 2 + 1.6, W / 2 - 1.6]) {
    for (const z of [-D / 2 + 1.6, D / 2 - 1.6]) {
      g.add(cylinder(0.9, 1.2, plastic(0x111827), x, -0.8, z));
    }
  }

  // 边框高亮，暗场里也能看出轮廓
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
    new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55 })
  );
  outline.position.y = H / 2;
  g.add(outline);
  return g;
}

function makeMotherboard(part) {
  const g = new THREE.Group();
  const W = 24.4, H = 30.5;
  g.add(box(W, H, 0.35, plastic(0x0f2a1d, { roughness: 0.85 }), 0, 0, 0));

  // CPU 插槽
  g.add(box(5.4, 0.6, 5.4, metal(0x334155), 0, H / 2 - 8.2, 0.35));
  // 内存插槽 x4
  for (let i = 0; i < 4; i += 1) {
    g.add(box(0.6, 13.4, 0.25, plastic(0x111827), 7.2 + i * 1.2, H / 2 - 8.4, 0.35));
  }
  // PCIe 插槽
  g.add(box(8.6, 0.9, 0.4, plastic(0x1f2937), -5.4, 0.2, 0.4));
  g.add(box(8.6, 0.9, 0.4, plastic(0x1f2937), -5.4, -6.4, 0.4));
  // 芯片组散热片
  g.add(box(5, 5, 1.4, metal(0x475569, { roughness: 0.35 }), 2.5, -9.5, 0.7));
  // IO 挡板
  g.add(box(4.6, 6.4, 1.6, metal(0x334155), -9.4, H / 2 - 3.6, 0.8));
  // M.2 散热片
  g.add(box(2.2, 8.4, 0.8, metal(0x64748b), 6.2, -2.4, 0.5));
  return g;
}

function makeCpu(part) {
  const g = new THREE.Group();
  g.add(box(4.4, 0.25, 4.4, plastic(0x1a2e05), 0, 0, 0));                // 基板
  g.add(box(3.6, 0.35, 3.6, metal(0xcbd5e1, { metalness: 0.9, roughness: 0.2 }), 0, 0.3, 0)); // 顶盖
  const notch = box(0.5, 0.1, 0.5, metal(0xf59e0b, { metalness: 1 }), 1.6, 0.5, 1.6);
  g.add(notch);
  return g;
}

function makeRam(part) {
  const g = new THREE.Group();
  for (const offset of [-0.8, 0.9]) {
    const stick = new THREE.Group();
    stick.add(box(0.55, 13.3, 0.25, plastic(0x0b3d2e), 0, 0, 0));
    stick.add(box(0.7, 13.3, 1.6, metal(part.color, { roughness: 0.35 }), 0, 0, 0.9));
    const rgb = box(0.35, 12.6, 0.12, new THREE.MeshStandardMaterial({
      color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 1.6
    }), 0, 0, 1.75);
    stick.add(rgb);
    stick.position.x = offset;
    g.add(stick);
  }
  return g;
}

function makeGpu(part) {
  const g = new THREE.Group();
  const L = 33.6, H = 12, T = 5;
  g.add(box(T, H, L, plastic(part.color, { roughness: 0.6 }), 0, 0, 0));   // 导风罩
  g.add(box(T + 0.2, 1.2, L, metal(0x64748b, { roughness: 0.35 }), 0, H / 2 - 0.4, 0)); // 背板

  // 两个风扇，朝下吹
  for (const z of [-L / 3.4, L / 3.4]) {
    const fan = cylinder(4.4, 0.8, plastic(0x0b1220), 0, -H / 2 + 0.4, z, 'y');
    g.add(fan);
    const hub = cylinder(1.1, 1, metal(0x94a3b8), 0, -H / 2 + 0.5, z, 'y');
    g.add(hub);
  }
  // 金手指与挡板
  g.add(box(T - 1.2, 0.7, 3.2, metal(0xd4af37, { metalness: 1, roughness: 0.3 }), 0.6, -H / 2 + 1.6, -L / 2 + 2.4));
  g.add(box(T + 0.4, H, 0.8, metal(0x94a3b8), 0, 0, -L / 2 - 0.2));
  return g;
}

function makeSsd(part) {
  const g = new THREE.Group();
  g.add(box(7, 10, 0.7, metal(part.color, { roughness: 0.4 }), 0, 0, 0));
  g.add(box(5.4, 6.6, 0.1, plastic(0x0f172a), 0, 0.6, 0.4));
  return g;
}

function makePsu(part) {
  const g = new THREE.Group();
  g.add(box(15, 8.6, 16, metal(part.color, { roughness: 0.6 }), 0, 0, 0));
  const fan = cylinder(3.4, 0.5, plastic(0x0b1220), 0, 4.4, 0, 'y');
  g.add(fan);
  const grille = new THREE.Mesh(
    new THREE.TorusGeometry(3.6, 0.12, 8, 32),
    metal(0x94a3b8)
  );
  grille.rotation.x = Math.PI / 2;
  grille.position.y = 4.5;
  g.add(grille);
  // 模组接口
  for (let i = 0; i < 3; i += 1) {
    g.add(box(2.2, 1.2, 0.4, plastic(0x1e293b), -4 + i * 4, 0, -8.2));
  }
  return g;
}

function makeCooler(part) {
  const g = new THREE.Group();
  const base = metal(0x94a3b8, { roughness: 0.3 });
  g.add(box(9, 0.8, 9, base, 0, 0, 0));                     // 底座
  // 两组鳍片
  for (const x of [-3.6, 3.6]) {
    const finGeo = new THREE.BoxGeometry(0.18, 15.2, 12.4);
    const finMat = metal(0xb8b2a8, { roughness: 0.35, metalness: 0.85 });
    const fins = new THREE.InstancedMesh(finGeo, finMat, 26);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 26; i += 1) {
      m.makeTranslation(x + (i - 13) * 0.55, 8.4, 0);
      fins.setMatrixAt(i, m);
    }
    g.add(fins);
    // 塔顶盖板
    g.add(box(2.4, 0.3, 12.4, base, x, 16.4, 0));
  }
  // 六根热管
  for (let i = 0; i < 6; i += 1) {
    const pipe = cylinder(0.28, 15.6, metal(0xcbd5e1, { metalness: 1 }), -4.2 + i * 1.7, 8.2, 0, 'y');
    g.add(pipe);
  }
  // 两把风扇（前后各一）
  for (const z of [-6.6, 6.6]) {
    const fan = cylinder(6.4, 1.6, plastic(0x26262a), 0, 8.2, z, 'z');
    g.add(fan);
    g.add(cylinder(1.6, 1.7, plastic(0x9a958e), 0, 8.2, z, 'z'));
  }
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
 * 把一个部件数据变成 Three.js Group。
 * @param {object} part catalog.js 里的部件
 */
export function makePart(part) {
  const builder = BUILDERS[part.category];
  if (!builder) throw new Error(`没有 ${part.category} 的模型`);
  const group = builder(part);
  group.name = part.id;
  group.userData = { partId: part.id, category: part.category };
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

