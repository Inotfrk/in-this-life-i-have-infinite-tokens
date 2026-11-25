import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { PARTS } from '../src/catalog.js';
import { makePart } from '../src/models.js';

const MIN_MESHES = { case: 6, motherboard: 6, cpu: 2, cooler: 8, ram: 4, gpu: 5, storage: 2, psu: 4 };

test('每个部件都能生成非空 Group，并带上识别信息', () => {
  for (const part of PARTS) {
    const group = makePart(part);
    assert.ok(group.isGroup, `${part.id} 不是 Group`);
    assert.equal(group.userData.partId, part.id);
    assert.equal(group.userData.category, part.category);
    let meshes = 0;
    group.traverse((o) => { if (o.isMesh) meshes += 1; });
    assert.ok(
      meshes >= MIN_MESHES[part.category],
      `${part.id} 只有 ${meshes} 个 mesh，少于预期的 ${MIN_MESHES[part.category]}`
    );
  }
});

test('外形尺寸与机箱/插槽量级匹配（单位：厘米）', () => {
  const sizes = {};
  for (const part of PARTS) {
    const group = makePart(part);
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    sizes[part.category] = size;
    assert.ok(size.length() > 0, `${part.id} 的包围盒是空的`);
    assert.ok(size.y < 120 && size.x < 120 && size.z < 120, `${part.id} 尺寸异常：${size.toArray()}`);
  }
  assert.ok(sizes.case.y >= 45 && sizes.case.y <= 55, '机箱高度应该在 50cm 左右');
  assert.ok(sizes.gpu.z >= 30 && sizes.gpu.z <= 40, '显卡长度应该在 34cm 左右');
  assert.ok(sizes.cooler.y >= 15, '双塔散热应该高于 15cm');
});

test('拖拽后不会残留上一个部件的引用', () => {
  const casePart = PARTS.find((p) => p.category === 'case');
  const a = makePart(casePart);
  const b = makePart(casePart);
  assert.notEqual(a, b);
  assert.notEqual(a.uuid, b.uuid);
});
