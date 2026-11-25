/**
 * Three.js 场景：相机、灯光、地面、轨道控制，以及「插槽」的位置表。
 *
 * 所有尺寸单位都是厘米，和真实机箱一致（机箱 24 × 50 × 48）。
 * 插槽位置写死在这里，拖拽时用射线打这些隐形盒子来决定部件落到哪。
 *
 * 性能上的取舍（笔记本核显 / Wayland 高分屏尤其明显）：
 * - 像素比封顶 1.5，别让高分屏按 DPR=2 去渲染两倍多的像素；
 * - 用 RoomEnvironment 生成 IBL（PBR 金属没有环境贴图就是黑的），再加四盏灯；
 * - 容器尺寸或 devicePixelRatio 变化时才重设缓冲区；
 * - 页面不可见时跳过渲染。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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

  // PBR 金属没有环境贴图就是一坨黑，用内置的 RoomEnvironment 生成一张 IBL
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // 把实际用的 GPU 打出来，方便判断到底有没有硬件加速
  {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const name = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    console.log('[pcbuilder] webgl', name);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 22, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 40;
  controls.maxDistance = 190;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.zoomSpeed = 0.9;

  // 环境光打底 + 暖色主光 + 冷色轮廓 + 正面补光
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x2a2622, 0.9));
  const key = new THREE.DirectionalLight(0xffe6c2, 2.4);
  key.position.set(70, 90, 60);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0d6, 0.7);
  rim.position.set(-80, 40, -70);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.45);
  fill.position.set(-30, 20, 80);
  scene.add(fill);

  // 地面：暗色圆台 + 细网格 + 暖色呼吸边
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.94, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  const grid = new THREE.GridHelper(240, 48, 0x4a4a50, 0x26262a);
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

  // 按需调度：静止后不提交 GPU 帧，阻尼未收敛时继续下一帧。
  let frameCallback = null;
  let frame = 0;
  let disposed = false;
  let width = 0, height = 0, pixelRatio = 0;
  function invalidate() {
    if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(time) {
    frame = 0;
    if (disposed || document.hidden) return;
    const moving = controls.update();
    renderer.render(scene, camera);
    if (frameCallback) frameCallback(time);
    if (moving) invalidate();
  }
  function resize() {
    const w = Math.round(container.clientWidth);
    const h = Math.round(container.clientHeight);
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (w !== width || h !== height || dpr !== pixelRatio) {
      width = w; height = h; pixelRatio = dpr;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  let removeDprListener = () => {};
  function watchPixelRatio() {
    removeDprListener();
    const mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    const change = () => { resize(); watchPixelRatio(); };
    mq.addEventListener('change', change, { once: true });
    removeDprListener = () => mq.removeEventListener('change', change);
  }
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resize();
  };
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', invalidate);
  const restored = () => resize();
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  watchPixelRatio();
  resize();

  return {
    scene, camera, renderer, controls, slots, resize,
    render() { renderer.render(scene, camera); invalidate(); },
    onFrame(cb) { frameCallback = cb; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeDprListener();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      controls.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    }
  };
}
