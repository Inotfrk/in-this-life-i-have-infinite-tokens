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
  for (const part of PARTS) {
    const group = makePart(part);
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    assert.ok(size.length() > 0, `${part.id} 的包围盒是空的`);
    assert.ok(size.y < 120 && size.x < 120 && size.z < 120, `${part.id} 尺寸异常：${size.toArray()}`);
    if (part.category === 'case') {
      assert.ok(Math.abs(size.y - 46.5) < 1, `${part.id} 机箱高度应该 46.5cm，实际 ${size.y.toFixed(2)}`);
    }
  }
});

test('显卡长度、散热器高度都读 metrics（换型号模型真的会变）', () => {
  const gpus = PARTS.filter((p) => p.category === 'gpu');
  for (const gpu of gpus) {
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(makePart(gpu)).getSize(size);
    const expected = gpu.metrics.lengthMM / 10;
    // 挡板会往卡尾多伸出约 1cm，留 1.5cm 容差
    assert.ok(Math.abs(size.z - expected) < 1.5, `${gpu.id} 长度应约 ${expected}cm，实际 ${size.z.toFixed(2)}`);
  }
  const coolers = PARTS.filter((p) => p.category === 'cooler');
  for (const cooler of coolers) {
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(makePart(cooler)).getSize(size);
    const expected = cooler.metrics.heightMM / 10;
    assert.ok(Math.abs(size.x - expected) < 1.2, `${cooler.id} 塔高应约 ${expected}cm，实际 ${size.x.toFixed(2)}`);
    assert.ok(size.y >= 14, `${cooler.id} 塔宽应该在 15cm 左右`);
  }
});

test('拖拽后不会残留上一个部件的引用', () => {
  const casePart = PARTS.find((p) => p.category === 'case');
  const a = makePart(casePart);
  const b = makePart(casePart);
  assert.notEqual(a, b);
  assert.notEqual(a.uuid, b.uuid);
});
