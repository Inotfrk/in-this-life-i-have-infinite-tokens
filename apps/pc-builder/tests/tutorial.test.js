import test from 'node:test';
import assert from 'node:assert/strict';

import { PASTE_TUTORIAL, firstUnfinished, stepStatus, tutorialProgress } from '../src/tutorial.js';

const EMPTY = {
  hasCpu: false, pastePattern: 'dot', patternChosen: false, pasteAmount: 0.1,
  amountChosen: false, pasteApplied: false, pastePressed: false,
  coolerMounted: false, coverage: 0, spill: 0
};

const PERFECT = {
  hasCpu: true, pastePattern: 'dot', patternChosen: true, pasteAmount: 0.1,
  amountChosen: true, pasteApplied: true, pastePressed: true,
  coolerMounted: true, coverage: 0.99, spill: 0.05
};

test('教程一共六步，每步都有标题、正文、提示与检查点', () => {
  assert.equal(PASTE_TUTORIAL.length, 6);
  for (const step of PASTE_TUTORIAL) {
    assert.ok(step.id && step.title && step.body && step.tip);
    assert.ok(typeof step.check === 'function');
    if (step.target) assert.match(step.target, /^#/);
  }
  assert.deepEqual(PASTE_TUTORIAL.map((s) => s.id), ['cpu', 'pattern', 'amount', 'apply', 'mount', 'check']);
});

test('什么都没做时一步都没完成，从第一步开始', () => {
  const progress = tutorialProgress(PASTE_TUTORIAL, EMPTY);
  assert.equal(progress.completed, 0);
  assert.equal(progress.finished, false);
  assert.equal(firstUnfinished(PASTE_TUTORIAL, EMPTY), 0);
});

test('完整走完流程后六步全绿', () => {
  const progress = tutorialProgress(PASTE_TUTORIAL, PERFECT);
  assert.equal(progress.completed, 6);
  assert.equal(progress.finished, true);
});

test('没动过滑杆 / 用量超出 0.08~0.15ml 都不算完成', () => {
  const untouched = { ...PERFECT, amountChosen: false };
  assert.equal(stepStatus(PASTE_TUTORIAL[2], untouched), 'pending');
  const tooMuch = { ...EMPTY, hasCpu: true, amountChosen: true, pasteAmount: 0.25 };
  const tooLittle = { ...EMPTY, hasCpu: true, amountChosen: true, pasteAmount: 0.03 };
  assert.equal(stepStatus(PASTE_TUTORIAL[2], tooMuch), 'pending');
  assert.equal(stepStatus(PASTE_TUTORIAL[2], tooLittle), 'pending');
  assert.equal(stepStatus(PASTE_TUTORIAL[2], PERFECT), 'done');
});

test('涂了但没压散热器，第五步不算完成', () => {
  const applied = { ...PERFECT, pastePressed: false, coolerMounted: false };
  assert.equal(stepStatus(PASTE_TUTORIAL[3], applied), 'done');
  assert.equal(stepStatus(PASTE_TUTORIAL[4], applied), 'pending');
});

test('覆盖率不够时最后一步不给过', () => {
  const poor = { ...PERFECT, coverage: 0.7 };
  assert.equal(stepStatus(PASTE_TUTORIAL[5], poor), 'pending');
});

test('firstUnfinished 会跳过已完成的前几步', () => {
  const half = {
    ...EMPTY, hasCpu: true, pastePattern: 'line', patternChosen: true,
    pasteAmount: 0.12, amountChosen: true, pasteApplied: false
  };
  assert.equal(firstUnfinished(PASTE_TUTORIAL, half), 3);
});

test('检查点抛异常也不会把教程弄崩', () => {
  const bad = { check: () => { throw new Error('boom'); } };
  assert.equal(stepStatus(bad, EMPTY), 'pending');
  const progress = tutorialProgress([bad], EMPTY);
  assert.equal(progress.completed, 0);
});
