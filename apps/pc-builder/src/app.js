/**
 * 渲染进程：部件库 ↔ 3D 场景 ↔ 评估面板。
 *
 * 拖拽链路：HTML 拖拽 → 画布上的射线 → 命中的插槽 → 放置 / 换件。
 * 所有状态都在这一个 Map 里（类别 → { part, group }），
 * 评分与兼容性检查只吃其中的 part，所以纯逻辑可以单独测。
 */

import * as THREE from 'three';
import { CATEGORIES, PARTS, VENDORS, partById } from './catalog.js';
import { SLOTS, createScene } from './scene.js';
import { makePart } from './models.js';
import { checkCompatibility } from './compat.js';
import { scoreBuild } from './perf.js';

const viewport = document.getElementById('viewport');
const partsEl = document.getElementById('parts');
const filtersEl = document.getElementById('filters');
const detailEl = document.getElementById('detailCard');
const scoreEl = document.getElementById('scoreCard');
const bomEl = document.getElementById('bomCard');
const hintEl = document.getElementById('dropHint');
const quickEl = document.getElementById('quickStats');
const fpsEl = document.getElementById('fpsChip');

let world;
try {
  world = createScene(viewport);
  console.log('[pcbuilder] scene ready', {
    w: viewport.clientWidth,
    h: viewport.clientHeight,
    canvas: [world.renderer.domElement.width, world.renderer.domElement.height]
  });
} catch (error) {
  const notice = document.createElement('div');
  notice.className = 'drop-hint';
  notice.textContent = `这个环境不支持 WebGL，3D 视图无法显示（${error.message}）`;
  viewport.appendChild(notice);
  throw error;
}
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/** 类别 → { part, group } */
const installed = new Map();
let selectedCategory = null;
let vendorFilter = null;
let selectionBox = null;
let hintTimer = 0;

// 帧率指示 + 页头汇总，每 0.5 秒刷新一次，不额外开定时器
let quickText = '—';
let fpsFrames = 0;
let fpsLast = performance.now();
world.onFrame((time) => {
  fpsFrames += 1;
  if (time - fpsLast < 500) return;
  const fps = Math.round((fpsFrames * 1000) / (time - fpsLast));
  fpsFrames = 0;
  fpsLast = time;
  if (fpsEl) fpsEl.textContent = `${fps} fps`;
  if (quickEl) quickEl.textContent = quickText;
});

const categoryOf = (id) => CATEGORIES.find((c) => c.id === id);
const labelOf = (id) => categoryOf(id)?.label ?? id;
const installedParts = () => Object.fromEntries([...installed].map(([k, v]) => [k, v.part]));

// ---------------------------------------------------------------- 插槽提示

const slotGhosts = new Map();

function buildSlots() {
  for (const cat of CATEGORIES) {
    const slot = SLOTS[cat.id];
    const [w, h, d] = slot.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8b8b92,
      transparent: true,
      opacity: 0.05,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    const offset = slot.hitOffset ?? [0, 0, 0];
    mesh.position.set(slot.position[0] + offset[0], slot.position[1] + offset[1], slot.position[2] + offset[2]);
    mesh.userData.category = cat.id;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xc9c9cf, transparent: true, opacity: 0.28 });
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat);
    mesh.add(lines);

    mesh.visible = false;
    world.scene.add(mesh);
    slotGhosts.set(cat.id, mesh);
  }
}
buildSlots();

/**
 * 只让「正在拖的那一类」插槽参与命中：
 * 机箱插槽是个包住全部内件的大盒子，如果它也参与射线，永远会挡在最前面，
 * 于是隔着机箱怎么放都放不进去。visible 只开目标类别，射线自然穿不过去。
 */
function showSlots(visible, onlyCategory = null) {
  for (const [id, ghost] of slotGhosts) {
    const allowed = !onlyCategory || id === onlyCategory;
    ghost.visible = visible && allowed;
    ghost.material.opacity = allowed ? 0.05 : 0;
    ghost.children[0].material.opacity = allowed ? 0.28 : 0;
  }
}

function highlight(categoryId) {
  for (const [id, ghost] of slotGhosts) {
    if (!ghost.visible) continue;
    const active = id === categoryId;
    ghost.material.opacity = active ? 0.2 : 0.04;
    ghost.children[0].material.opacity = active ? 0.95 : 0.2;
    ghost.children[0].material.color.set(active ? 0xe0a458 : 0xc9c9cf);
  }
}

function pickSlot(event) {
  const rect = viewport.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, world.camera);
  const targets = [...slotGhosts.values()].filter((g) => g.visible);
  const hits = raycaster.intersectObjects(targets, false);
  return hits[0]?.object ?? null;
}

// ---------------------------------------------------------------- 装机操作

function placePart(part) {
  if (part.category !== 'case' && !installed.has('case')) {
    toast('先把机箱拖进来，才有地方装别的');
    return;
  }
  const existing = installed.get(part.category);
  if (existing) world.scene.remove(existing.group);

  const group = makePart(part);
  const slot = SLOTS[part.category];
  group.position.set(...slot.position);
  world.scene.add(group);

  installed.set(part.category, { part, group });
  hintEl.classList.add('hidden');
  selectedCategory = part.category;
  refresh();
  toast(`已装入 ${part.name}`);
}

function removeCategory(categoryId) {
  const entry = installed.get(categoryId);
  if (!entry) return;
  world.scene.remove(entry.group);
  installed.delete(categoryId);
  if (categoryId === 'case') {
    // 机箱没了，里面的部件也没有落脚点
    for (const key of [...installed.keys()]) removeCategory(key);
    hintEl.classList.remove('hidden');
  }
  if (selectedCategory === categoryId) selectedCategory = null;
  refresh();
}

function clearAll() {
  for (const key of [...installed.keys()]) world.scene.remove(installed.get(key).group);
  installed.clear();
  selectedCategory = null;
  hintEl.classList.remove('hidden');
  refresh();
}

function autoFill() {
  for (const part of PARTS) placePart(part);
  selectedCategory = 'gpu';
  refresh();
}

// ---------------------------------------------------------------- 交互

partsEl.addEventListener('dragstart', (event) => {
  const el = event.target.closest('.part');
  if (!el) return;
  event.dataTransfer.setData('text/plain', el.dataset.id);
  event.dataTransfer.effectAllowed = 'copy';
  showSlots(true, el.dataset.category);
  highlight(el.dataset.category);
});

document.addEventListener('dragend', () => showSlots(false));

viewport.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  const hit = pickSlot(event);
  if (hit) highlight(hit.userData.category);
});

viewport.addEventListener('dragleave', () => {
  for (const ghost of slotGhosts.values()) ghost.material.opacity = 0.05;
});

viewport.addEventListener('drop', (event) => {
  event.preventDefault();
  const id = event.dataTransfer.getData('text/plain');
  const part = partById(id);
  const hit = pickSlot(event);
  showSlots(false);
  if (!part) return;
  if (!hit) {
    // 没打中插槽时兜底：机箱已经在场，就直接放进该类别的插槽，避免「隔着玻璃怎么都放不进去」
    if (part.category !== 'case' && installed.has('case')) {
      placePart(part);
      return;
    }
    toast('把机箱拖到台面上先');
    return;
  }
  if (hit.userData.category !== part.category) {
    toast(`这里是「${labelOf(hit.userData.category)}」的位置`);
    return;
  }
  placePart(part);
});

// 兜底：双击直接装（不想拖的时候）
partsEl.addEventListener('dblclick', (event) => {
  const el = event.target.closest('.part');
  if (el) placePart(partById(el.dataset.id));
});

// 点击选择已装部件
const down = new THREE.Vector2();
viewport.addEventListener('pointerdown', (event) => {
  down.set(event.clientX, event.clientY);
});
viewport.addEventListener('pointerup', (event) => {
  if (event.button !== 0) return;
  if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) return; // 拖动视角不算点击
  const rect = viewport.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, world.camera);
  const groups = [...installed.values()].map((v) => v.group);
  const hits = raycaster.intersectObjects(groups, true);
  if (!hits.length) return;
  // 机箱的玻璃壳在最前面，直接取第一个会永远选中机箱；优先选内部部件
  let node = null;
  let fallback = null;
  for (const hit of hits) {
    let n = hit.object;
    while (n && !n.userData?.partId) n = n.parent;
    if (!n) continue;
    if (n.userData.category !== 'case') {
      node = n;
      break;
    }
    fallback ??= n;
  }
  node ??= fallback;
  if (!node) return;
  selectedCategory = node.userData.category;
  refresh();
});

window.addEventListener('keydown', (event) => {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedCategory) {
    removeCategory(selectedCategory);
  }
});

// ---------------------------------------------------------------- UI

function renderFilters() {
  filtersEl.innerHTML = '';
  const all = document.createElement('button');
  all.className = `chip${vendorFilter ? '' : ' active'}`;
  all.textContent = '全部厂商';
  all.onclick = () => { vendorFilter = null; renderFilters(); renderParts(); };
  filtersEl.appendChild(all);

  for (const vendor of VENDORS) {
    const chip = document.createElement('button');
    chip.className = `chip${vendorFilter === vendor ? ' active' : ''}`;
    chip.textContent = vendor;
    chip.onclick = () => {
      vendorFilter = vendorFilter === vendor ? null : vendor;
      renderFilters();
      renderParts();
    };
    filtersEl.appendChild(chip);
  }
}

function renderParts() {
  partsEl.innerHTML = '';
  for (const cat of CATEGORIES) {
    const list = PARTS.filter((p) => p.category === cat.id && (!vendorFilter || p.vendor === vendorFilter));
    if (!list.length) continue;

    const group = document.createElement('div');
    group.className = 'part-group';
    const head = document.createElement('div');
    head.className = 'group-head';
    head.innerHTML = `<span>${cat.icon} ${cat.label}</span><span class="count">${list.length}</span>`;
    group.appendChild(head);

    for (const part of list) {
      const el = document.createElement('div');
      const isInstalled = installed.has(part.category);
      el.className = `part${isInstalled ? ' installed' : ''}`;
      el.draggable = true;
      el.dataset.id = part.id;
      el.dataset.category = part.category;
      el.innerHTML = `
        <div>
          <div class="name">${part.name}${isInstalled ? '<span class="badge">已装</span>' : ''}</div>
          <div class="meta">${part.vendor} · ¥${part.price.toLocaleString('zh-CN')}</div>
        </div>`;
      el.title = part.summary;
      group.appendChild(el);
    }
    partsEl.appendChild(group);
  }
}

function renderDetail() {
  if (!selectedCategory || !installed.has(selectedCategory)) {
    detailEl.innerHTML = `<h3>部件详情</h3><p class="muted">点一下机箱里的部件，或者从左边拖一个进来。</p>`;
    return;
  }
  const { part } = installed.get(selectedCategory);
  const rows = Object.entries(part.specs)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  detailEl.innerHTML = `
    <h3>部件详情</h3>
    <div style="font-weight:600;margin-bottom:2px">${part.name}</div>
    <div class="muted" style="margin-bottom:8px">${part.vendor} · ${labelOf(part.category)} · ¥${part.price.toLocaleString('zh-CN')}</div>
    <p class="muted" style="margin:0 0 8px">${part.summary}</p>
    <table class="specs">${rows}</table>
    <button class="remove" id="btnRemove">拆下这个部件</button>`;
  detailEl.querySelector('#btnRemove').onclick = () => removeCategory(part.category);
}

function bar(label, value) {
  return `<div class="bar"><span>${label}</span><span class="track"><span class="fill" style="width:${value}%"></span></span><span class="val">${value}</span></div>`;
}

function renderScore() {
  const parts = installedParts();
  const score = scoreBuild(parts);
  const issues = checkCompatibility(parts);
  const totalPrice = Object.values(parts).reduce((sum, p) => sum + p.price, 0);
  const issueRows = issues
    .map((i) => `<li class="${i.level}">${i.text}</li>`)
    .join('') || '<li class="info">所有检查通过，可以开机。</li>';

  scoreEl.innerHTML = `
    <h3>综合评估</h3>
    <div class="big-score"><span class="value">${score.total}</span><span class="tier">${score.tier} · 游戏 ${score.gaming} / 生产力 ${score.productivity}</span></div>
    <div class="bars">
      ${bar('CPU', score.cpu)}
      ${bar('显卡', score.gpu)}
      ${bar('内存', score.memory)}
      ${bar('硬盘', score.storage)}
      ${bar('散热', score.cooling)}
    </div>
    <div class="fps">
      <span>1080p <b>${score.fps.fhd}</b> fps</span>
      <span>2K <b>${score.fps.qhd}</b> fps</span>
      <span>整机 <b>${score.load.total}</b> W</span>
    </div>
    <ul class="issues">${issueRows}</ul>`;

  quickText = `¥${totalPrice.toLocaleString('zh-CN')} · 预估 ${score.load.total}W`;
  quickEl.textContent = quickText;
}

function renderBom() {
  const parts = installedParts();
  const rows = CATEGORIES.filter((c) => parts[c.id]).map((c) => {
    const p = parts[c.id];
    return `<div class="bom-row"><span class="cat">${c.label}</span><span class="nm" title="${p.name}">${p.name}</span><span>¥${p.price.toLocaleString('zh-CN')}</span></div>`;
  }).join('');
  const total = Object.values(parts).reduce((s, p) => s + p.price, 0);
  bomEl.innerHTML = `<h3>配置清单</h3>${rows || '<p class="muted">还是空的。</p>'}${rows ? `<div class="bom-total"><span>合计</span><span>¥${total.toLocaleString('zh-CN')}</span></div>` : ''}`;
}

function drawSelection() {
  if (selectionBox) {
    world.scene.remove(selectionBox);
    selectionBox = null;
  }
  if (!selectedCategory || !installed.has(selectedCategory)) return;
  selectionBox = new THREE.BoxHelper(installed.get(selectedCategory).group, 0xe0a458);
  world.scene.add(selectionBox);
}

function refresh() {
  renderParts();
  renderDetail();
  renderScore();
  renderBom();
  drawSelection();
  world.render(); // 静态截图 / 无动画环境下也能立刻看到画面
}

function toast(text) {
  hintEl.textContent = text;
  hintEl.classList.remove('hidden');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (installed.size) hintEl.classList.add('hidden');
    else hintEl.textContent = '把「机箱」拖进来开始装机';
  }, 2200);
}

// ---------------------------------------------------------------- 按钮

document.getElementById('btnAuto').onclick = autoFill;
document.getElementById('btnReset').onclick = clearAll;
document.getElementById('btnView').onclick = () => {
  world.camera.position.set(64, 50, 78);
  world.controls.target.set(0, 22, 0);
  world.controls.update();
};

renderFilters();
refresh();

// 截图 / 自动化验收用：?autofill=1 直接装满
const params = new URLSearchParams(location.search);
if (params.has('autofill')) autoFill();

// ?snapshot=1：把 WebGL 帧读回 2D canvas 再导出 dataURL（无头环境取 3D 预览图用）
if (params.has('snapshot')) {
  requestAnimationFrame(() => {
    world.render();
    const gl = world.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const flat = document.createElement('canvas');
    flat.width = w;
    flat.height = h;
    const ctx = flat.getContext('2d');
    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      const from = (h - 1 - y) * w * 4;
      image.data.set(pixels.subarray(from, from + w * 4), y * w * 4);
    }
    ctx.putImageData(image, 0, 0);
    console.log('SNAPSHOT:' + flat.toDataURL('image/png'));
  });
}

// ?probe=1：读回像素，证明场景真的画出了东西（无头浏览器截图抓不到 WebGL 内容时用）
if (params.has('probe')) {
  requestAnimationFrame(() => {
    world.render();
    const gl = world.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 150) lit += 1;
    }
    const stats = world.renderer.info.render;
    console.log('[pcbuilder] pixel-probe', {
      w,
      h,
      lit,
      ratio: +(lit / (w * h)).toFixed(4),
      drawCalls: stats.calls,
      triangles: stats.triangles
    });
  });
}
