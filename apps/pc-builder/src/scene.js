/**
 * Three.js 场景：相机、灯光、地面、轨道控制。
 *
 * 尺寸单位统一是厘米，跟 layout.js 里的真实尺寸一致（机箱 28.5 × 46.5 × 45.9）。
 * 插槽位置不在这里写死——那是 layout.js 的 MOUNTS，app.js 按它生成命中盒。
 *
 * 性能上的取舍（笔记本核显 / Wayland 高分屏尤其明显）：
 * - 像素比封顶 1.5，别让高分屏按 DPR=2 去渲染两倍多的像素；
 * - 用 RoomEnvironment 生成 IBL（PBR 金属没有环境贴图就是黑的），再加四盏灯；
 * - 容器尺寸或 devicePixelRatio 变化时才重设缓冲区；
 * - 页面不可见时跳过渲染；
 * - 只有需要的时候（拖拽、物理、阻尼没收敛）才提交新帧。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CASE } from './layout.js';

const MAX_PIXEL_RATIO = 1.5;
const BG = 0x0a0b0d;

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 260, 520);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1600);
  camera.position.set(-62, 42, 68);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();

  {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const name = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    console.log('[pcbuilder] webgl', name);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-1, 21, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 34;
  controls.maxDistance = 210;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.zoomSpeed = 0.9;

  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x24222a, 1.05));
  const key = new THREE.DirectionalLight(0xffe6c2, 2.5);
  key.position.set(-40, 100, 80);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0d6, 0.85);
  rim.position.set(80, 50, -80);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
  fill.position.set(30, 20, -30);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(160, 64),
    new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.95, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.22;
  scene.add(floor);

  const grid = new THREE.GridHelper(300, 60, 0x3a3d44, 0x1e2024);
  grid.position.y = -0.2;
  scene.add(grid);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(46, 48, 96),
    new THREE.MeshBasicMaterial({ color: 0xe0a458, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // 按需调度：静止后不提交 GPU 帧，阻尼未收敛 / 有物理在跑时继续下一帧。
  let frameCallback = null;
  let frame = 0;
  let disposed = false;
  let width = 0;
  let height = 0;
  let pixelRatio = 0;

  function invalidate() {
    if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(time) {
    frame = 0;
    if (disposed || document.hidden) return;
    const moving = controls.update();
    renderer.render(scene, camera);
    const keep = frameCallback ? frameCallback(time) : false;
    if (moving || keep === true) invalidate();
  }

  function resize() {
    const w = Math.round(container.clientWidth);
    const h = Math.round(container.clientHeight);
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (w !== width || h !== height || dpr !== pixelRatio) {
      width = w;
      height = h;
      pixelRatio = dpr;
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
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      resize();
    }
  };
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', invalidate);
  const restored = () => resize();
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  watchPixelRatio();
  resize();

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    render() { renderer.render(scene, camera); invalidate(); },
    /** 每帧回调：返回 true 表示「还需要下一帧」 */
    onFrame(cb) { frameCallback = cb; },
    invalidate,
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

/** 默认机位：正视玻璃侧板，稍微偏前一点，能同时看到主板和显卡 */
export const HOME_CAMERA = {
  position: [-62, 42, 68],
  target: [-1, 21, 0]
};

export const CASE_BOUNDS = () => ({
  min: [CASE.xLeft, CASE.yFloor, CASE.zBack],
  max: [CASE.xRight, CASE.yCeil, CASE.zFront]
});
