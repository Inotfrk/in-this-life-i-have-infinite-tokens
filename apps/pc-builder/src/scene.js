/**
 * Three.js 场景：相机、灯光、地面、轨道控制，以及「插槽」的位置表。
 *
 * 所有尺寸单位都是厘米，和真实机箱一致（机箱 24 × 50 × 48）。
 * 插槽位置写死在这里，拖拽时用射线打这些隐形盒子来决定部件落到哪。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** 每个类别一个插槽：位置是部件 group 的原点，size 是命中盒大小。 */
export const SLOTS = {
  case: { position: [0, 0, 0], size: [24, 50, 48], hitOffset: [0, 25, 0] },
  motherboard: { position: [0, 23.2, -22], size: [24.4, 30.5, 1] },
  cpu: { position: [0, 30.3, -21.4], size: [5, 1.2, 5] },
  ram: { position: [9, 30.1, -21.6], size: [4.6, 13.6, 4] },
  cooler: { position: [0, 30.9, -21.2], size: [18, 18, 14] },
  gpu: { position: [0, 23.5, -5], size: [5.4, 12.4, 34] },
  storage: { position: [8.5, 14, -21.5], size: [7.6, 10.4, 1.4] },
  psu: { position: [0, 5.5, -12], size: [15.2, 9, 16.2] }
};

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b12);
  scene.fog = new THREE.Fog(0x070b12, 190, 340);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1200);
  camera.position.set(74, 62, 92);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 24, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 45;
  controls.maxDistance = 210;
  controls.maxPolarAngle = Math.PI * 0.52;

  // 灯光：冷色环境 + 暖色主光 + 背后轮廓光
  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x0b1220, 1.1));
  const key = new THREE.DirectionalLight(0xfff0d6, 2.4);
  key.position.set(70, 90, 60);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5eead4, 0.9);
  rim.position.set(-80, 40, -70);
  scene.add(rim);
  const fill = new THREE.PointLight(0x60a5fa, 120, 200);
  fill.position.set(-30, 20, 60);
  scene.add(fill);

  // 地面：一块暗色圆台 + 网格
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  const grid = new THREE.GridHelper(240, 48, 0x1e3a8a, 0x111827);
  grid.position.y = 0;
  scene.add(grid);

  // 装机台：一圈发光呼吸边
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(52, 54, 96),
    new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);

  const slots = new THREE.Group();
  scene.add(slots);

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  }
  resize();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(container);
  }

  let frameCallback = null;
  renderer.setAnimationLoop(() => {
    controls.update();
    if (frameCallback) frameCallback(performance.now());
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    slots,
    render() {
      renderer.render(scene, camera);
    },
    onFrame(cb) {
      frameCallback = cb;
    }
  };
}
