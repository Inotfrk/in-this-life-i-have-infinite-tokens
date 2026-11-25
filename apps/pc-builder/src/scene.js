/**
 * Three.js 场景：相机、灯光、地面、轨道控制，以及「插槽」的位置表。
 *
 * 所有尺寸单位都是厘米，和真实机箱一致（机箱 24 × 50 × 48）。
 * 插槽位置写死在这里，拖拽时用射线打这些隐形盒子来决定部件落到哪。
 *
 * 性能上的取舍（笔记本核显 / Wayland 高分屏尤其明显）：
 * - 像素比封顶 1.5，别让高分屏按 DPR=2 去渲染两倍多的像素；
 * - 灯光只留三盏；
 * - 容器尺寸或 devicePixelRatio 变化时才重设缓冲区；
 * - 页面不可见时跳过渲染。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX_PIXEL_RATIO = 1.5;
const BG = 0x0b0b0d;

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
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 200, 380);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1200);
  camera.position.set(64, 50, 78);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 22, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 40;
  controls.maxDistance = 190;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.zoomSpeed = 0.9;

  // 三盏灯：暖环境光 + 主光 + 冷轮廓
  scene.add(new THREE.HemisphereLight(0xffe9d0, 0x151312, 1.0));
  const key = new THREE.DirectionalLight(0xffe2bd, 2.1);
  key.position.set(70, 90, 60);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd3c7, 0.8);
  rim.position.set(-80, 40, -70);
  scene.add(rim);

  // 地面：暗色圆台 + 细网格 + 暖色呼吸边
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0x131315, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  const grid = new THREE.GridHelper(240, 48, 0x3a3a3f, 0x1c1c1f);
  scene.add(grid);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(52, 54, 96),
    new THREE.MeshBasicMaterial({ color: 0xe0a458, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);

  const slots = new THREE.Group();
  scene.add(slots);

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(container);
  }

  // 浏览器缩放 / 换显示器时 devicePixelRatio 会变，matchMedia 是唯一可靠的信号
  function watchPixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => {
      resize();
      watchPixelRatio();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange, { once: true });
    else if (mq.addListener) mq.addListener(onChange);
  }
  watchPixelRatio();

  let frameCallback = null;
  renderer.setAnimationLoop((time) => {
    if (document.hidden) return;
    controls.update();
    if (frameCallback) frameCallback(time);
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    slots,
    resize,
    render() {
      renderer.render(scene, camera);
    },
    onFrame(cb) {
      frameCallback = cb;
    }
  };
}
