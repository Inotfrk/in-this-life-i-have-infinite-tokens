/**
 * 渲染进程：部件库 ↔ 3D 场景 ↔ 评估面板。
 *
 * 这一版的交互链路（每一步都跟真机对齐）：
 * 1. 按住部件卡片拖动 → 部件跟着鼠标在机箱里飘，**不会直接飞到插槽里**；
 * 2. 靠近安装位到容差以内、朝向也对，才显示绿色可装；否则松手就是掉件（有物理）；
 * 3. 装错方向：CPU / 内存 / 显卡 / M.2 有防呆，直接塞不进去；散热器和电源装得上但温度遭罪；
 * 4. 装完 CPU 先涂硅脂，再压散热器——覆盖率直接决定温度。
 */

import * as THREE from 'three';
import { CATEGORIES, PARTS, VENDORS, partById } from './catalog.js';
import { createScene, HOME_CAMERA } from './scene.js';
import { makePart } from './models.js';
import { disposeObject } from './resources.js';
import { checkCompatibility } from './compat.js';
import { scoreBuild } from './perf.js';
import { BOARD, BOARD_FEATURES, CASE, MOUNTS, PART_BOXES, mountPoint } from './layout.js';
import { normDeg, orientationInfo, postCheck, seatAttempt, thermalReport } from './assembly.js';
import { IDEAL_ML, PATTERNS, evaluatePaste, makePasteMesh, usablePaste } from './paste.js';
import { createBody, settleAll, stepBody } from './physics.js';

const viewport = document.getElementById('viewport');
const partsEl = document.getElementById('parts');
const filtersEl = document.getElementById('filters');
const detailEl = document.getElementById('detailCard');
const pasteEl = document.getElementById('pasteCard');
const thermalEl = document.getElementById('thermalCard');
const scoreEl = document.getElementById('scoreCard');
const bomEl = document.getElementById('bomCard');
const hintEl = document.getElementById('dropHint');
const quickEl = document.getElementById('quickStats');
const fpsEl = document.getElementById('fpsChip');
const hudEl = document.getElementById('hud');
const hudOri = document.getElementById('hudOri');
const hudAim = document.getElementById('hudAim');

let world;
try {
  world = createScene(viewport);
} catch (error) {
  const notice = document.createElement('div');
  notice.className = 'drop-hint';
  notice.textContent = `这个环境不支持 WebGL，3D 视图无法显示（${error.message}）`;
  viewport.appendChild(notice);
  throw error;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const X_AXIS = new THREE.Vector3(1, 0, 0);

/** 类别 → { part, group, degrees } */
const installed = new Map();
/** 掉在地上 / 没装上的部件：{ body, group, localCenter } */
const loose = [];

const state = {
  selected: null,
  vendor: null,
  carrying: null,
  paste: null,
  pastePattern: 'dot',
  pasteAmount: IDEAL_ML,
  boot: null,
  anim: null,
  grab: null
};

const bounds = {
  min: [CASE.xLeft, CASE.yFloor, CASE.zBack],
  max: [CASE.xRight, CASE.yCeil, CASE.zFront]
};

const categoryOf = (id) => CATEGORIES.find((c) => c.id === id);
const labelOf = (id) => categoryOf(id)?.label ?? id;
const installedParts = () => Object.fromEntries([...installed].map(([k, v]) => [k, v.part]));
const installedRecord = () => Object.fromEntries([...installed].map(([k, v]) => [k, { degrees: v.degrees }]));
const orientations = () => Object.fromEntries([...installed].map(([k, v]) => [k, v.degrees]));

let quickText = '—';
let fpsFrames = 0;
let fpsLast = performance.now();

// ---------------------------------------------------------------- 插槽提示

const ghostByCategory = new Map();
const aim = document.createElement('div');
aim.className = 'aim-dot';
viewport.appendChild(aim);

function boxCenter(category) {
  const box = PART_BOXES[category];
  return new THREE.Vector3(
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2
  );
}

function makeGhost(category, position) {
  const [w, h, d] = MOUNTS[category].size;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xc9d2da, transparent: true, opacity: 0.05, depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.5 })
  );
  mesh.add(lines);
  mesh.visible = false;
  mesh.userData.category = category;
  world.scene.add(mesh);
  return mesh;
}

function buildGhosts() {
  for (const cat of CATEGORIES) {
    const id = cat.id;
    if (id === 'ram') {
      ghostByCategory.set(id, MOUNTS.ram.slots.map((z) => makeGhost(id, [BOARD.x, BOARD.y1 - BOARD_FEATURES.dimm.length + 6.6, z])));
    } else if (id === 'case') {
      ghostByCategory.set(id, [makeGhost(id, [0, CASE.height / 2, 0])]);
    } else {
      ghostByCategory.set(id, [makeGhost(id, mountPoint(id))]);
    }
  }
}
buildGhosts();

function showGhosts(category) {
  for (const [id, list] of ghostByCategory) {
    for (const ghost of list) ghost.visible = id === category;
  }
  world.render();
}

function tintGhosts(category, ok) {
  for (const ghost of ghostByCategory.get(category) ?? []) {
    const color = ok ? 0x4ade80 : 0xe0a458;
    ghost.material.opacity = ok ? 0.12 : 0.05;
    ghost.children[0].material.color.set(color);
    ghost.children[0].material.opacity = ok ? 0.95 : 0.55;
  }
  world.render();
}

// ---------------------------------------------------------------- 拖拽

/** 拖拽平面：主板类部件在主板前面的一块竖直平面，机箱是桌面 */
function dragPlane(category) {
  if (category === 'case') return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const x = mountPoint(category)[0] - 7.5;
  return new THREE.Plane(new THREE.Vector3(1, 0, 0), -x);
}

const pointerToNdc = (event) => {
  const rect = viewport.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
};

function carryDistance(carry) {
  const [mx, my, mz] = mountPoint(carry.part.category);
  const p = carry.group.position;
  if (carry.part.category === 'case') return Math.hypot(p.x - mx, p.z - mz);
  return Math.hypot(p.y - my, p.z - mz);
}

function updateCarry(event) {
  const carry = state.carrying;
  if (!carry) return;
  pointerToNdc(event);
  raycaster.setFromCamera(pointer, world.camera);
  const hit = new THREE.Vector3();
  const plane = dragPlane(carry.part.category);
  if (!raycaster.ray.intersectPlane(plane, hit)) return;

  const [mx, my, mz] = mountPoint(carry.part.category);
  carry.moved = true;
  if (carry.part.category === 'case') {
    carry.group.position.set(hit.x, 0, hit.z);
  } else {
    carry.group.position.set(hit.x, hit.y, hit.z);
  }
  void mx; void my; void mz;

  carry.distance = carryDistance(carry);
  const verdict = seatAttempt({
    category: carry.part.category,
    degrees: carry.degrees,
    distance: carry.distance,
    installed: installedRecord()
  });
  carry.verdict = verdict;
  hudOri.textContent = `${normDeg(carry.degrees)}°`;
  hudOri.className = verdict.ok ? 'ok' : (verdict.kind === 'far' ? 'warn' : 'bad');
  hudAim.textContent = verdict.ok
    ? '已对准，松手装入'
    : (verdict.kind === 'far' ? `还差 ${carry.distance.toFixed(1)}cm` : verdict.reason);
  hudAim.className = verdict.ok ? 'ok' : 'bad';

  const rect = viewport.getBoundingClientRect();
  aim.classList.add('on');
  aim.style.left = `${event.clientX - rect.left}px`;
  aim.style.top = `${event.clientY - rect.top}px`;
  aim.style.borderColor = verdict.ok ? '#4ade80' : '#e0a458';

  tintGhosts(carry.part.category, verdict.ok);
  world.invalidate();
}

function startCarry(part, event) {
  cancelCarry();
  const group = makePart(part);
  const [x, y, z] = mountPoint(part.category);
  group.position.set(x, y, z);
  group.traverse((child) => {
    if (child.isMesh) child.material = child.material.clone();
  });
  world.scene.add(group);

  state.carrying = {
    part,
    group,
    degrees: 0,
    distance: Infinity,
    verdict: null,
    moved: false,
    lastPointer: event ? { x: event.clientX, y: event.clientY, t: performance.now() } : null,
    velocity: new THREE.Vector3()
  };
  hudEl.hidden = false;
  hudOri.textContent = '0°';
  hudAim.textContent = '拖到插槽附近';
  hudAim.className = 'warn';
  showGhosts(part.category);
  tintGhosts(part.category, false);
  world.invalidate();
}

function cancelCarry() {
  const carry = state.carrying;
  if (!carry) return;
  // onCancel：库里的部件直接丢掉；从安装位/桌面拿起来的放回原处
  if (carry.onCancel) carry.onCancel();
  else disposeObject(carry.group);
  state.carrying = null;
  hudEl.hidden = true;
  aim.classList.remove('on');
  showGhosts(null);
  world.render();
}

function rotateCarry(step = 90) {
  if (!state.carrying) {
    toast('先按住一个部件再旋转');
    return;
  }
  state.carrying.degrees = normDeg(state.carrying.degrees + step);
  const carry = state.carrying;
  carry.group.rotation.x = THREE.MathUtils.degToRad(carry.degrees);
  const verdict = seatAttempt({
    category: carry.part.category,
    degrees: carry.degrees,
    distance: carry.distance,
    installed: installedRecord()
  });
  carry.verdict = verdict;
  hudOri.textContent = `${carry.degrees}° · ${orientationInfo(carry.part.category, carry.degrees).label}`;
  hudAim.textContent = verdict.ok ? '已对准，松手装入' : verdict.reason;
  hudAim.className = verdict.ok ? 'ok' : 'bad';
  tintGhosts(carry.part.category, verdict.ok);
  world.invalidate();
}

/** 掉件：把部件交给物理引擎，落进机箱里 */
function dropLoose(carry, velocity) {
  const box = PART_BOXES[carry.part.category];
  const center = boxCenter(carry.part.category);
  const rot = THREE.MathUtils.degToRad(carry.degrees);
  const offset = center.clone().applyAxisAngle(X_AXIS, rot);
  const position = [
    carry.group.position.x + offset.x,
    carry.group.position.y + offset.y,
    carry.group.position.z + offset.z
  ];
  const half = [
    (box.max[0] - box.min[0]) / 2,
    (box.max[1] - box.min[1]) / 2,
    (box.max[2] - box.min[2]) / 2
  ];
  // 落点决定它落在哪：在机箱投影范围内就掉进机箱，否则落在桌面上
  const dropped = carry.group.position;
  const overCase = installed.has('case')
    && Math.abs(dropped.x) < CASE.width / 2
    && Math.abs(dropped.z) < CASE.depth / 2;
  const bodyBounds = overCase
    ? { min: [...bounds.min], max: [...bounds.max] }
    : { min: [-200, 0, -200], max: [200, 120, 200] };

  const body = createBody({
    half,
    position,
    rotation: carry.degrees,
    velocity: [velocity.x * 0.4, Math.min(0, velocity.y) * 0.3 - 6, velocity.z * 0.4],
    spin: [40, 0, 0]
  });
  loose.push({ body, group: carry.group, center, bounds: bodyBounds });
  state.carrying = null;
  hudEl.hidden = true;
  aim.classList.remove('on');
  showGhosts(null);
  world.invalidate();
}

function finishCarry(event) {
  const carry = state.carrying;
  if (!carry) return;
  // 只是点了一下卡片、没真的拖动：不动手也不算「掉件」
  if (!carry.moved) {
    cancelCarry();
    toast('按住部件拖到机箱里再松手');
    return;
  }
  const verdict = carry.verdict ?? seatAttempt({
    category: carry.part.category,
    degrees: carry.degrees,
    distance: carry.distance,
    installed: installedRecord()
  });

  if (verdict.ok) {
    const group = carry.group;
    const from = group.position.clone();
    group.rotation.x = THREE.MathUtils.degToRad(carry.degrees);
    commitInstall(carry.part, group, carry.degrees, from);
    state.carrying = null;
    hudEl.hidden = true;
    aim.classList.remove('on');
    showGhosts(null);
    const blocked = prerequisiteOf(carry.part.category);
    toast(blocked ? `${carry.part.name} 放好了，但${blocked}` : `已装入 ${carry.part.name}`);
  } else {
    const velocity = carry.velocity ?? new THREE.Vector3();
    toast(`${verdict.reason ?? '没对准'}——先放在这里，等下再拖一次`);
    dropLoose(carry, velocity);
  }
  void event;
}

// ---------------------------------------------------------------- 装机

/**
 * 有没有「起作用」：不再拦着装，缺前置条件也能放上去，只是不参与评分。
 * 返回 null 表示生效，否则返回一句说明。
 */
function prerequisiteOf(category) {
  if (category === 'case') return null;
  if (!installed.has('case')) return '还没有机箱，暂时不起作用';
  if (['motherboard', 'cpu', 'ram', 'gpu', 'storage'].includes(category) && !installed.has('motherboard')) {
    return '还没有主板，插不上去，暂时不起作用';
  }
  if (category === 'cooler' && !installed.has('cpu')) return '还没有 CPU，散热器没得扣';
  return null;
}

/** 类别 → { effective, reason } */
function effectiveness() {
  const map = {};
  for (const category of installed.keys()) {
    const reason = prerequisiteOf(category);
    map[category] = { effective: reason === null, reason };
  }
  return map;
}

/** 只有生效的部件才进评分 / 兼容性 / 温度 */
function effectiveParts() {
  const mask = effectiveness();
  return Object.fromEntries([...installed]
    .filter(([category]) => mask[category]?.effective)
    .map(([category, entry]) => [category, entry.part]));
}

function commitInstall(part, group, degrees, from = null) {
  const existing = installed.get(part.category);
  if (existing) disposeObject(existing.group);
  world.scene.add(group);
  const target = new THREE.Vector3(...mountPoint(part.category));
  group.position.copy(target);
  group.rotation.x = THREE.MathUtils.degToRad(degrees);
  installed.set(part.category, { part, group, degrees });
  state.selected = part.category;
  hintEl.classList.add('hidden');

  if (part.category === 'cooler') pressPaste();
  if (part.category === 'cpu') state.paste = null;
  // 滑进插槽的那一下：机箱例外（整台滑过去很怪），其余 0.3 秒缓出
  if (from && part.category !== 'case' && from.distanceTo(target) > 0.05) {
    state.anim = { group, from: from.clone(), to: target.clone(), t: 0 };
  }
  refresh();
}

function removeCategory(category) {
  const entry = installed.get(category);
  if (entry) {
    disposeObject(entry.group);
    installed.delete(category);
  }
  if (category === 'case') {
    // 机箱拆了，里面的部件一起拆（地上的散件留着，改落到桌面）
    for (const key of [...installed.keys()]) removeCategory(key);
    hintEl.classList.remove('hidden');
    for (const item of loose) item.bounds = { min: [-200, 0, -200], max: [200, 120, 200] };
    if (installed.size) toast('机箱拆下来了');
  }
  if (category === 'cpu') state.paste = null;
  if (category === 'cooler' && state.paste) state.paste = { ...state.paste, pressed: true };
  if (state.selected === category) state.selected = null;
  refresh();
}

function clearAll() {
  for (const entry of installed.values()) disposeObject(entry.group);
  installed.clear();
  for (const item of loose) disposeObject(item.group);
  loose.length = 0;
  state.paste = null;
  state.selected = null;
  state.boot = null;
  hintEl.classList.remove('hidden');
  refresh();
}

/** 示例装机：按真机顺序走一遍（含涂硅脂） */
function autoFill() {
  clearAll();
  const byCategory = Object.fromEntries(PARTS.map((p) => [p.category, p]));
  const order = [
    ['case', 0], ['motherboard', 0], ['cpu', 0], ['ram', 0],
    ['paste', 0], ['cooler', 0], ['gpu', 0], ['storage', 0], ['psu', 0]
  ];
  for (const [category, degrees] of order) {
    if (category === 'paste') {
      applyPasteNow({ patternId: 'dot', amount: IDEAL_ML });
      continue;
    }
    const part = byCategory[category];
    if (!part) continue;
    const group = makePart(part);
    commitInstall(part, group, degrees);
  }
  state.selected = 'gpu';
  refresh();
}

// ---------------------------------------------------------------- 硅脂

function applyPasteNow({ patternId, amount }) {
  if (!installed.has('cpu')) {
    toast('先装 CPU 再涂硅脂');
    return;
  }
  const paste = evaluatePaste({ patternId, amount });
  state.paste = { ...paste, pressed: false, patternId, amount };
  mountPasteMesh();
  refresh();
}

function pressPaste() {
  if (!state.paste || state.paste.pressed) return;
  const pressed = evaluatePaste({
    patternId: state.paste.patternId,
    amount: state.paste.amount,
    offset: state.paste.offset ?? 0
  });
  state.paste = { ...pressed, pressed: true, patternId: state.paste.patternId, amount: state.paste.amount };
  mountPasteMesh();
}

function wipePaste() {
  state.paste = null;
  mountPasteMesh();
  refresh();
}

function mountPasteMesh() {
  const cpu = installed.get('cpu');
  if (!cpu) return;
  const old = cpu.group.children.find((child) => child.userData.isPaste);
  if (old) disposeObject(old);
  if (!state.paste) return;
  const mesh = makePasteMesh(state.paste);
  mesh.position.set(-0.4, 0, 0);
  cpu.group.add(mesh);
  world.invalidate();
}

// ---------------------------------------------------------------- 开机自检

function runBoot() {
  const parts = effectiveParts();
  const result = postCheck({
    parts,
    installed: installedRecord(),
    paste: state.paste,
    orientations: orientations()
  });
  state.boot = { ...result, thermal: thermalReport({ parts, paste: state.paste, orientations: orientations() }) };
  refresh();
  toast(result.ok ? '自检通过，可以开机' : `自检没过：${result.errors.map((e) => e.text).join('；')}`);
}

// ---------------------------------------------------------------- UI

function renderFilters() {
  filtersEl.innerHTML = '';
  const all = document.createElement('button');
  all.className = `chip${state.vendor ? '' : ' active'}`;
  all.textContent = '全部厂商';
  all.onclick = () => { state.vendor = null; renderFilters(); renderParts(); };
  filtersEl.appendChild(all);

  for (const vendor of VENDORS) {
    const chip = document.createElement('button');
    chip.className = `chip${state.vendor === vendor ? ' active' : ''}`;
    chip.textContent = vendor;
    chip.onclick = () => {
      state.vendor = state.vendor === vendor ? null : vendor;
      renderFilters();
      renderParts();
    };
    filtersEl.appendChild(chip);
  }
}

function renderParts() {
  partsEl.innerHTML = '';
  for (const cat of CATEGORIES) {
    const list = PARTS.filter((p) => p.category === cat.id && (!state.vendor || p.vendor === state.vendor));
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
      const blocked = isInstalled ? prerequisiteOf(part.category) : null;
      const badge = !isInstalled
        ? ''
        : blocked
          ? '<span class="badge idle" title="' + blocked + '">未生效</span>'
          : '<span class="badge">已装</span>';
      el.className = `part${isInstalled ? ' installed' : ''}${blocked ? ' idle' : ''}`;
      el.dataset.id = part.id;
      el.dataset.category = part.category;
      el.innerHTML = `
        <div>
          <div class="name">${part.name}${badge}</div>
          <div class="meta">${part.vendor} · ¥${part.price.toLocaleString('zh-CN')}</div>
        </div>`;
      el.title = part.summary;
      group.appendChild(el);
    }
    partsEl.appendChild(group);
  }
}

function renderDetail() {
  if (!state.selected || !installed.has(state.selected)) {
    detailEl.innerHTML = `<h3>部件详情</h3><p class="muted">点一下机箱里的部件，或者从左边拖一个进来。</p>`;
    return;
  }
  const { part, degrees } = installed.get(state.selected);
  const info = orientationInfo(part.category, degrees);
  const rows = Object.entries(part.specs)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  const pasteRow = part.category === 'cooler' || part.category === 'cpu'
    ? `<div class="paste-note${state.paste ? '' : ' error'}">${state.paste
      ? `硅脂覆盖率 ${Math.round(state.paste.coverage * 100)}% · ${state.paste.pressed ? '已压开' : '还没压开'}`
      : '还没涂硅脂'}</div>`
    : '';
  const blocked = prerequisiteOf(part.category);
  const idleRow = blocked
    ? `<div class="paste-note error">未生效：${blocked}</div>`
    : '';
  detailEl.innerHTML = `
    <h3>部件详情</h3>
    <div style="font-weight:600;margin-bottom:2px">${part.name}</div>
    <div class="muted" style="margin-bottom:8px">${part.vendor} · ${labelOf(part.category)} · ¥${part.price.toLocaleString('zh-CN')}</div>
    <p class="muted" style="margin:0 0 8px">${part.summary}</p>
    <table class="specs">${rows}</table>
    <div class="paste-note">安装朝向：${info.label}${info.note ? ` · ${info.note}` : ''}</div>
    ${idleRow}
    ${pasteRow}
    <p class="muted" style="margin:8px 0 0">按住它就能拖出来重新摆，按 Delete 直接拆下。</p>
    <button class="remove" id="btnRemove">拆下这个部件</button>`;
  detailEl.querySelector('#btnRemove').onclick = () => removeCategory(part.category);
}

function renderPaste() {
  const hasCpu = installed.has('cpu');
  const paste = state.paste;
  const stats = paste ? `
    <div class="paste-stats">
      <div class="paste-stat"><b>${Math.round(paste.coverage * 100)}%</b><span>覆盖率</span></div>
      <div class="paste-stat"><b>${(paste.amount * 1000).toFixed(0)}</b><span>μl 用量</span></div>
      <div class="paste-stat"><b>+${paste.penaltyC.toFixed(1)}</b><span>°C 惩罚</span></div>
    </div>
    <div class="paste-note${paste.quality === 'poor' ? ' error' : ''}">${paste.pressed ? '已经压开' : '还没压'} · ${paste.patternLabel}${paste.notes.length ? ' · ' + paste.notes[0].text : ''}</div>
  ` : '';

  pasteEl.innerHTML = `
    <h3>硅脂</h3>
    ${!hasCpu ? '<p class="muted">先装 CPU，才有顶盖可以涂。</p>' : `
      <div class="paste-row">
        ${PATTERNS.map((p) => `<button data-pattern="${p.id}" class="${state.pastePattern === p.id ? 'active' : ''}" title="${p.hint}">${p.label}</button>`).join('')}
      </div>
      <div class="paste-slider">
        <span>用量</span>
        <input id="pasteAmount" type="range" min="2" max="30" step="1" value="${Math.round(state.pasteAmount * 100)}" />
        <span id="pasteAmountLabel">${(state.pasteAmount * 1000).toFixed(0)} μl</span>
      </div>
      <div class="paste-actions">
        <button id="btnPaste" class="primary">涂上</button>
        <button id="btnWipe">擦干净</button>
      </div>
      ${stats}
    `}`;

  pasteEl.querySelectorAll('[data-pattern]').forEach((btn) => {
    btn.onclick = () => { state.pastePattern = btn.dataset.pattern; renderPaste(); };
  });
  const slider = pasteEl.querySelector('#pasteAmount');
  if (slider) {
    slider.oninput = () => {
      state.pasteAmount = Number(slider.value) / 100;
      pasteEl.querySelector('#pasteAmountLabel').textContent = `${slider.value}0 μl`;
    };
  }
  const btnPaste = pasteEl.querySelector('#btnPaste');
  if (btnPaste) btnPaste.onclick = () => applyPasteNow({ patternId: state.pastePattern, amount: state.pasteAmount });
  const btnWipe = pasteEl.querySelector('#btnWipe');
  if (btnWipe) btnWipe.onclick = wipePaste;
}

function bar(label, value) {
  return `<div class="bar"><span>${label}</span><span class="track"><span class="fill" style="width:${value}%"></span></span><span class="val">${value}</span></div>`;
}

function renderThermal() {
  const parts = effectiveParts();
  const report = thermalReport({ parts, paste: state.paste, orientations: orientations() });
  const cls = (t) => (t == null ? '' : t >= 90 ? 'hot' : t >= 75 ? 'warm' : 'cool');
  const boot = state.boot;
  const bootRows = boot ? [
    ...boot.errors.map((e) => `<li class="error">✕ ${e.text}</li>`),
    ...boot.warnings.map((w) => `<li class="warn">! ${w.text}</li>`),
    ...(boot.ok ? ['<li class="ok">✓ 自检通过，可以点亮开机</li>'] : [])
  ].join('') : '';

  thermalEl.innerHTML = `
    <h3>温度与风道</h3>
    <div class="temp-grid">
      <div class="temp ${cls(report.cpuTemp)}"><b>${report.cpuTemp ?? '—'}</b><span>CPU ℃</span><div class="temp-bar"><i style="width:${Math.min(100, (report.cpuTemp ?? 0))}%"></i></div></div>
      <div class="temp ${cls(report.gpuTemp)}"><b>${report.gpuTemp ?? '—'}</b><span>显卡 ℃</span><div class="temp-bar"><i style="width:${Math.min(100, (report.gpuTemp ?? 0))}%"></i></div></div>
    </div>
    <ul class="boot-list">
      ${report.issues.map((i) => `<li class="${i.level}">${i.text}</li>`).join('')}
      ${bootRows}
    </ul>`;
}

function renderScore() {
  const parts = effectiveParts();
  const score = scoreBuild(parts);
  const issues = checkCompatibility(parts);
  const totalPrice = Object.values(parts).reduce((sum, p) => sum + p.price, 0);
  const missing = CATEGORIES.filter((c) => !parts[c.id]).map((c) => c.label);
  const idleCount = [...installed.keys()].filter((category) => !parts[category]).length;
  const issueRows = [
    ...issues.filter((i) => i.level !== 'info').map((i) => `<li class="${i.level}">${i.text}</li>`),
    missing.length ? `<li class="info">还缺：${missing.join('、')}</li>` : '',
    idleCount ? `<li class="warn">有 ${idleCount} 件装上了但未生效（缺前置条件）</li>` : '',
    !missing.length && !idleCount && !issues.some((i) => i.level !== 'info')
      ? '<li class="info">所有检查通过，可以开机。</li>'
      : ''
  ].join('');

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

let selectionBox = null;

function drawSelection() {
  if (selectionBox) {
    disposeObject(selectionBox);
    selectionBox = null;
  }
  if (!state.selected || !installed.has(state.selected)) return;
  selectionBox = new THREE.BoxHelper(installed.get(state.selected).group, 0xe0a458);
  world.scene.add(selectionBox);
}

function refresh() {
  renderParts();
  renderDetail();
  renderPaste();
  renderThermal();
  renderScore();
  renderBom();
  drawSelection();
  world.render();
}

function toast(text) {
  hintEl.textContent = text;
  hintEl.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    if (installed.size) hintEl.classList.add('hidden');
    else hintEl.textContent = '把「机箱」拖进来开始装机';
  }, 2600);
}

// ---------------------------------------------------------------- 交互

partsEl.addEventListener('pointerdown', (event) => {
  const el = event.target.closest('.part');
  if (!el) return;
  event.preventDefault();
  const part = partById(el.dataset.id);
  if (!part) return;
  startCarry(part, event);
});

/** 点中机箱里的某个部件：优先非机箱 */
function hitPart(event) {
  pointerToNdc(event);
  raycaster.setFromCamera(pointer, world.camera);
  const targets = [
    ...[...installed.values()].map((v) => v.group),
    ...loose.map((item) => item.group)
  ];
  const hits = raycaster.intersectObjects(targets, true);
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
  return node ?? fallback;
}

/** 把已经装好的部件重新拿起来拖（移动 / 换位置 / 丢掉） */
function beginGrab(category, event) {
  cancelCarry();
  const entry = installed.get(category);
  if (!entry) return;
  const { part, group, degrees } = entry;
  installed.delete(category);
  if (category === 'cooler' && state.paste) state.paste = { ...state.paste, pressed: true };
  if (state.selected === category) state.selected = null;
  state.carrying = {
    part, group, degrees,
    onCancel: () => commitInstall(part, group, degrees),
    distance: Infinity,
    verdict: null,
    moved: true,
    lastPointer: { x: event.clientX, y: event.clientY, t: performance.now() },
    velocity: new THREE.Vector3()
  };
  hudEl.hidden = false;
  hudOri.textContent = `${degrees}°`;
  showGhosts(category);
  tintGhosts(category, false);
  refresh();
  updateCarry(event);
}

function beginGrabLoose(item, event) {
  cancelCarry();
  const index = loose.indexOf(item);
  if (index < 0) return;
  loose.splice(index, 1);
  const part = partById(item.group.userData.partId);
  if (!part) return;
  const degrees = normDeg(item.body.rotation);
  const saved = {
    position: [...item.body.position],
    rotation: item.body.rotation,
    groupPosition: item.group.position.clone(),
    groupRotation: item.group.rotation.x
  };
  item.group.rotation.x = THREE.MathUtils.degToRad(degrees);
  state.carrying = {
    part, group: item.group, degrees,
    onCancel: () => {
      item.body.position = saved.position;
      item.body.rotation = saved.rotation;
      item.body.velocity = [0, 0, 0];
      item.body.spin = [0, 0, 0];
      item.body.resting = true;
      item.group.position.copy(saved.groupPosition);
      item.group.rotation.x = saved.groupRotation;
      loose.push(item);
    },
    distance: Infinity,
    verdict: null,
    moved: true,
    lastPointer: { x: event.clientX, y: event.clientY, t: performance.now() },
    velocity: new THREE.Vector3()
  };
  hudEl.hidden = false;
  hudOri.textContent = `${degrees}°`;
  showGhosts(part.category);
  tintGhosts(part.category, false);
  refresh();
  updateCarry(event);
}

document.addEventListener('pointermove', (event) => {
  // 按住机箱里的部件拖动 = 把它拿起来
  if (state.grab && !state.carrying) {
    if (Math.hypot(event.clientX - state.grab.x, event.clientY - state.grab.y) > 4) {
      const target = state.grab.target;
      state.grab = null;
      if (target.loose) beginGrabLoose(target.loose, event);
      else beginGrab(target.category, event);
      return;
    }
  }

  const carry = state.carrying;
  if (!carry) return;
  if (carry.lastPointer) {
    const dt = Math.max(16, performance.now() - carry.lastPointer.t) / 1000;
    carry.velocity.set(
      (event.clientX - carry.lastPointer.x) * 0.35 / dt,
      0,
      (event.clientY - carry.lastPointer.y) * -0.35 / dt
    );
  }
  carry.lastPointer = { x: event.clientX, y: event.clientY, t: performance.now() };
  updateCarry(event);
});

document.addEventListener('pointerup', (event) => {
  if (!state.carrying) return;
  finishCarry(event);
});

document.addEventListener('pointercancel', () => cancelCarry());

window.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') {
    rotateCarry(90);
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape') {
    cancelCarry();
    return;
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selected) {
    removeCategory(state.selected);
  }
});

// 点击选择已装部件；按住拖动则把它拿起来（移动 / 拆下 / 丢掉）
const down = new THREE.Vector2();
viewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || state.carrying) return;
  down.set(event.clientX, event.clientY);
  const node = hitPart(event);
  if (!node) {
    state.grab = null;
    return;
  }
  const category = node.userData.category;
  const looseItem = loose.find((item) => item.group === node || item.group.getObjectById(node.id));
  state.grab = { x: event.clientX, y: event.clientY, target: { category, loose: looseItem ?? null } };
});
viewport.addEventListener('pointerup', (event) => {
  const grab = state.grab;
  state.grab = null;
  if (event.button !== 0 || state.carrying) return;
  if (!grab) return;
  if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) return;
  state.selected = grab.target.loose ? null : grab.target.category;
  refresh();
});

// ---------------------------------------------------------------- 每帧

let lastFrame = 0;

world.onFrame((time) => {
  const dt = lastFrame ? Math.min(0.05, (time - lastFrame) / 1000) : 1 / 60;
  lastFrame = time;

  fpsFrames += 1;
  if (time - fpsLast >= 600) {
    const fps = Math.round((fpsFrames * 1000) / (time - fpsLast));
    fpsFrames = 0;
    fpsLast = time;
    if (fpsEl) fpsEl.textContent = `${fps} fps`;
  }

  let active = false;

  for (const item of loose) {
    if (item.body.resting) continue;
    stepBody(item.body, dt, item.bounds ?? bounds);
    const rot = THREE.MathUtils.degToRad(item.body.rotation);
    const offset = item.center.clone().applyAxisAngle(X_AXIS, rot);
    item.group.position.set(
      item.body.position[0] - offset.x,
      item.body.position[1] - offset.y,
      item.body.position[2] - offset.z
    );
    item.group.rotation.x = rot;
    active = true;
  }

  if (state.anim) {
    const anim = state.anim;
    anim.t = Math.min(1, anim.t + dt * 3.4);
    const k = 1 - (1 - anim.t) ** 3;
    anim.group.position.lerpVectors(anim.from, anim.to, k);
    active = anim.t < 1;
    if (!active) {
      anim.group.position.copy(anim.to);
      state.anim = null;
    }
  }

  if (state.carrying) active = true;

  if (active) world.invalidate();
  if (active) world.render();
  return active;
});

// ---------------------------------------------------------------- 按钮

document.getElementById('btnAuto').onclick = autoFill;
document.getElementById('btnReset').onclick = clearAll;
document.getElementById('btnBoot').onclick = runBoot;
document.getElementById('btnRotate').onclick = () => rotateCarry(90);
document.getElementById('btnView').onclick = () => {
  world.camera.position.set(...HOME_CAMERA.position);
  world.controls.target.set(...HOME_CAMERA.target);
  world.controls.update();
  world.render();
};

renderFilters();
refresh();

// 截图 / 自动化验收用：?autofill=1 直接装满，?cam=x,y,z,tx,ty,tz 指定机位
const params = new URLSearchParams(location.search);
if (params.has('autofill')) autoFill();
// ?parts=case,motherboard,cpu,paste —— 只装指定的几件，方便截局部图
if (params.has('parts')) {
  const wanted = params.get('parts').split(',').map((s) => s.trim()).filter(Boolean);
  const byCategory = Object.fromEntries(PARTS.map((p) => [p.category, p]));
  for (const category of wanted) {
    if (category === 'paste') {
      applyPasteNow({ patternId: 'dot', amount: IDEAL_ML });
      continue;
    }
    const part = byCategory[category];
    if (part) commitInstall(part, makePart(part), 0);
  }
  state.selected = null;
  refresh();
}
if (params.has('cam')) {
  const [x, y, z, tx, ty, tz] = params.get('cam').split(',').map(Number);
  if ([x, y, z, tx, ty, tz].every((v) => Number.isFinite(v))) {
    world.camera.position.set(x, y, z);
    world.controls.target.set(tx, ty, tz);
    world.controls.update();
    world.render();
  }
}

// ?snapshot=1 / ?probe=1：无头环境里读回像素，证明 3D 真的画出了东西
if (params.has('snapshot') || params.has('probe')) {
  requestAnimationFrame(() => {
    world.render();
    const gl = world.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (params.has('snapshot')) {
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
    }
    if (params.has('probe')) {
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 150) lit += 1;
      }
      const stats = world.renderer.info.render;
      console.log('[pcbuilder] pixel-probe', {
        w, h, lit, ratio: +(lit / (w * h)).toFixed(4),
        drawCalls: stats.calls, triangles: stats.triangles
      });
    }
  });
}

// ---------------------------------------------------------------- 自检（?selftest=1）
// 在真实浏览器里跑一遍「装、涂、装错、掉件、自检」的完整链路，把结果打到控制台。
// 无头环境没有可点的鼠标，这个入口能把交互相关的代码路径也跑一遍。
/** 模拟「拖到安装位 → 松手」：判定走真实的 seatAttempt，安装走真实的 finishCarry */
function dragInstall(part, degrees = 0) {
  startCarry(part, null);
  const carry = state.carrying;
  if (!carry) return false;
  carry.moved = true;
  carry.degrees = normDeg(degrees);
  carry.group.rotation.x = THREE.MathUtils.degToRad(carry.degrees);
  carry.group.position.set(...mountPoint(part.category));
  carry.distance = 0;
  carry.verdict = seatAttempt({
    category: part.category, degrees: carry.degrees, distance: 0, installed: installedRecord()
  });
  const ok = carry.verdict.ok;
  if (ok) finishCarry(null);
  else cancelCarry();
  return ok;
}

function runSelfTest() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`[selftest] ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
  };

  clearAll();
  const byCategory = Object.fromEntries(PARTS.map((p) => [p.category, p]));

  check('机箱能被拖进桌面（不被内腔墙卡住）', dragInstall(byCategory.case));
  check('机箱确实装上了', installed.has('case'));
  check('主板能对准装好', dragInstall(byCategory.motherboard));
  check('CPU 能对准装好', dragInstall(byCategory.cpu));
  check('主板 + CPU 在位', installed.has('motherboard') && installed.has('cpu'));

  applyPasteNow({ patternId: 'dot', amount: IDEAL_ML });
  check('硅脂涂上了', state.paste && state.paste.coverage > 0.9, `coverage=${state.paste?.coverage}`);
  const cpuGroup = installed.get('cpu').group;
  check('硅脂在顶盖上出现', Boolean(cpuGroup.children.find((c) => c.userData.isPaste)));

  // 拖散热器：离得远 → 不许装
  startCarry(byCategory.cooler, null);
  const carry = state.carrying;
  carry.moved = true;
  carry.group.position.set(-8, 6, 14);
  carry.distance = carryDistance(carry);
  carry.verdict = seatAttempt({ category: 'cooler', degrees: 0, distance: carry.distance, installed: installedRecord() });
  check('拖得远不许装', carry.verdict.ok === false, carry.verdict.reason);
  finishCarry(null);
  check('装不上就掉件', loose.length === 1);
  settleAll(loose.map((item) => item.body), bounds);
  check('掉件会落到机箱底板上', loose[0].body.resting === true, `y=${loose[0].body.position[1].toFixed(2)}`);

  // 内存方向错了：塞不进去
  startCarry(byCategory.ram, null);
  state.carrying.moved = true;
  rotateCarry(90);
  state.carrying.distance = 0.2;
  state.carrying.verdict = seatAttempt({ category: 'ram', degrees: 90, distance: 0.2, installed: installedRecord() });
  check('内存装反被防呆挡住', state.carrying.verdict.kind === 'keyed', state.carrying.verdict.reason);
  cancelCarry();

  // 散热器装反：能装上，但温度更高
  commitInstall(byCategory.cooler, makePart(byCategory.cooler), 0);
  const tempNormal = thermalReport({ parts: installedParts(), paste: state.paste, orientations: { cooler: 0 } }).cpuTemp;
  removeCategory('cooler');
  commitInstall(byCategory.cooler, makePart(byCategory.cooler), 180);
  check('散热器装反也能扣上', installed.has('cooler') && installed.get('cooler').degrees === 180);
  check('硅脂被压开', state.paste.pressed === true);
  const tempFlipped = thermalReport({ parts: installedParts(), paste: state.paste, orientations: orientations() }).cpuTemp;
  check('风道反了更热', tempFlipped > tempNormal, `${tempNormal} → ${tempFlipped}`);

  // 清空重来，走一遍正常装机 + 自检
  // 电源在副仓：贴着托盘也算装好
  removeCategory('psu');
  check('电源能被拖进副仓（不卡主板托盘）', dragInstall(byCategory.psu));

  autoFill();
  check('示例装机 8 件齐全', CATEGORIES.every((c) => installed.has(c.id)));
  runBoot();
  check('开机自检通过', state.boot?.ok === true, JSON.stringify(state.boot?.errors ?? []));
  check('温度在合理区间', state.boot?.thermal.cpuTemp > 40 && state.boot?.thermal.cpuTemp < 90, `${state.boot?.thermal.cpuTemp}℃`);

  const failed = results.filter((r) => !r.ok);
  console.log(`[selftest] ${failed.length ? 'SELFTEST_FAIL' : 'SELFTEST_PASS'} (${results.length - failed.length}/${results.length})`);
}

if (new URLSearchParams(location.search).has('selftest')) {
  setTimeout(runSelfTest, 120);
}


// 自由摆放相关的补充自检：拿起来移动、丢到桌面、缺前置条件只是「不生效」
function runFreePlacementTest() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok });
    console.log(`[selftest] ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
  };
  const byCategory = Object.fromEntries(PARTS.map((p) => [p.category, p]));

  clearAll();
  dragInstall(byCategory.case);
  dragInstall(byCategory.gpu);
  check('没有主板也能把显卡放上去', installed.has('gpu'));
  check('但显卡此刻不生效', effectiveParts().gpu === undefined);
  check('面板给得出原因', Boolean(prerequisiteOf('gpu')));

  dragInstall(byCategory.motherboard);
  check('补上主板后显卡自动生效', Boolean(effectiveParts().gpu));

  // 拿起来 → 放回原处
  beginGrab('gpu', { clientX: 400, clientY: 300 });
  check('已装部件能被拿起来', !installed.has('gpu') && state.carrying?.part.category === 'gpu');
  check('拿起来时挂上了「取消即归位」', typeof state.carrying.onCancel === 'function');
  check('先装个电源好测 Esc', dragInstall(byCategory.psu));
  beginGrab('psu', { clientX: 400, clientY: 300 });
  cancelCarry();
  check('Esc 取消会把部件放回原位', installed.has('psu'));

  // 拿起来 → 直接丢到桌面上
  beginGrab('gpu', { clientX: 400, clientY: 300 });
  state.carrying.group.position.set(60, 10, 0);
  state.carrying.distance = 60;
  state.carrying.verdict = null;
  finishCarry(null);
  check('丢得远就落在桌面上', loose.length === 1 && loose[0].bounds.min[0] < -100);
  check('桌面散件可以被重新拿起', (() => { beginGrabLoose(loose[0], { clientX: 10, clientY: 10 }); return Boolean(state.carrying); })());
  cancelCarry();
  check('取消后散件回到桌面', loose.length === 1);

  const failed = results.filter((r) => !r.ok);
  console.log(`[selftest] ${failed.length ? 'FREEPLACE_FAIL' : 'FREEPLACE_PASS'} (${results.length - failed.length}/${results.length})`);
}

if (new URLSearchParams(location.search).has('selftest')) {
  setTimeout(runFreePlacementTest, 600);
}
