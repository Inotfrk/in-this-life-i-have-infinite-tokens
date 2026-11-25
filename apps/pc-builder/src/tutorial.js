/**
 * 硅脂教程：分步引导 + 每步的完成条件。
 *
 * 步骤数据是纯的（title / body / target / check），所以能在 node 里直接测；
 * 高亮和卡片渲染在 app.js 里做，检查点读的是真实装配状态。
 *
 * 内容依据装机常识（也写进了 README）：黄豆大小中点法最稳、覆盖均匀比形状重要、
 * 太多会溢出、太少盖不满、拆过散热器必须擦掉重涂。
 */

/** @typedef {{hasCpu:boolean, pastePattern:string, patternChosen:boolean, pasteAmount:number,
 *   amountChosen:boolean, pasteApplied:boolean, pastePressed:boolean, coolerMounted:boolean,
 *   coverage:number, spill:number}} TutorialFacts */

export const PASTE_TUTORIAL = [
  {
    id: 'cpu',
    title: '① 先把 CPU 放进插座',
    body: 'AM5 的三角对准插座的三角，两侧缺口对凸台，再压下扣具。方向错了压不下去——别硬来，针弯了就废了。',
    tip: '没有 CPU 就没有顶盖可涂，硅脂只涂在 CPU 顶盖上。',
    target: '#parts',
    check: (facts) => facts.hasCpu
  },
  {
    id: 'pattern',
    title: '② 选一种涂法',
    body: '中点法最稳：正中挤一颗黄豆大小，靠扣具压力自己摊开。一条线、十字也行；刮平覆盖最快，但容易裹气泡。',
    tip: '新手别纠结形状，「盖得均匀」比「涂得好看」重要得多。',
    target: '#pastePatterns',
    check: (facts) => Boolean(facts.patternChosen)
  },
  {
    id: 'amount',
    title: '③ 调用量',
    body: '0.08 ~ 0.15ml 就够（面板上的单位是 μl，100μl = 0.1ml）。多了会往顶盖外面溢、弄脏主板；少了压开后四角是空的。',
    tip: '真实用量参考：一支 1g 的硅脂大概能用 3~4 次。',
    target: '#pasteAmountRow',
    check: (facts) => Boolean(facts.amountChosen) && facts.pasteAmount >= 0.08 && facts.pasteAmount <= 0.15
  },
  {
    id: 'apply',
    title: '④ 涂上去',
    body: '点「涂上」，顶盖上会先出现一小团硅脂——这时候还没摊开，覆盖率是「压开以后」的预估。',
    tip: '工具只是涂，真正让它铺满的是散热器的扣具压力。',
    target: '#btnPaste',
    check: (facts) => facts.pasteApplied
  },
  {
    id: 'mount',
    title: '⑤ 压上散热器',
    body: '把散热器拖到 CPU 上方、对准扣具位置松手。扣具一压，硅脂才会摊开成薄薄一层——这一步做完才算真的涂好。',
    tip: '散热器的风道要朝机箱尾部（前 → 后），装反了温度会明显变高。',
    target: '#parts',
    check: (facts) => facts.coolerMounted && facts.pastePressed
  },
  {
    id: 'check',
    title: '⑥ 检查覆盖',
    body: '看覆盖率：90% 以上、并且没有明显溢出，就是一次合格的涂抹。挤压出来的硅脂别用手抹，用无绒布加酒精擦。',
    tip: '拆下散热器后硅脂已经被压过一次，重新安装必须擦掉重涂。',
    target: '#pasteStats',
    check: (facts) => facts.pastePressed && facts.coverage >= 0.9 && facts.spill < 0.3
  }
];

/** 每一步的完成情况 */
export function tutorialProgress(steps = PASTE_TUTORIAL, facts = {}) {
  const done = steps.map((step) => {
    try {
      return Boolean(step.check(facts));
    } catch {
      return false;
    }
  });
  return {
    done,
    completed: done.filter(Boolean).length,
    total: steps.length,
    finished: done.every(Boolean)
  };
}

/** 当前这一步要不要提示「条件还没满足」 */
export function stepStatus(step, facts) {
  if (!step) return 'unknown';
  try {
    return step.check(facts) ? 'done' : 'pending';
  } catch {
    return 'pending';
  }
}

/** 从某一步开始找第一个没完成的（关掉教程再打开时接着走） */
export function firstUnfinished(steps = PASTE_TUTORIAL, facts = {}) {
  const index = steps.findIndex((step) => !stepStatus(step, facts) || stepStatus(step, facts) === 'pending');
  return index < 0 ? steps.length - 1 : index;
}
