# 3D 装机模拟器（平台模块 · demo）

在一个 3D 机箱里拖拽装电脑：部件按厂商筛选，装完给出兼容性检查、功耗估算与综合性能评分。
定位是平台的其中一个模块，所以自带 `module.json` 描述入口与能力，方便以后挂到主平台上。

## 跑起来

```bash
cd apps/pc-builder
npm install        # 装 electron + three + esbuild（Electron 本体约 100MB）
npm start          # 先 esbuild 打包 dist/app.js，再起 Electron
```

渲染进程用的是 esbuild 打出来的单文件（`dist/app.js`），**不是**裸 ES module：
`file://` 下浏览器对模块脚本有 CORS 限制，打包后就没这个问题。改了 `src/` 记得重新
`npm run build`（`npm start` 已经自动带上了）。

Linux 无沙箱环境（容器 / 某些发行版）如果启动报 sandbox 错误：

```bash
npm start -- --no-sandbox
```

无人工验收（不弹窗，加载后截图到 `smoke.png` 再退出）：

```bash
npm run start:smoke
```

没有 GPU / 在无头环境里验收时，可以打开两个调试参数：

- `?autofill=1`：启动即装满 8 个部件；
- `?probe=1`：渲染一帧后读回像素，在控制台打印非背景像素占比（证明场景真的画出来了）；
- `?snapshot=1`：把这一帧读回 2D canvas 并输出 `SNAPSHOT:<dataURL>`，无头环境里可以把 3D 画面存成图片
  （无头浏览器的普通截图抓不到 WebGL 内容，这个参数就是为此准备的）。

## 能做什么

| 能力 | 说明 |
| --- | --- |
| 3D 场景 | Three.js 场景 + 轨道控制；机箱是半透明外壳，能看见内部 |
| 拖拽装机 | 从左侧把部件拖进机箱，射线命中高亮插槽，落位即安装；双击也能直接装 |
| 换件 / 拆件 | 同类别再拖一个会替换；选中后点「拆下」或按 Delete |
| 按厂商筛选 | 顶部芯片按厂商过滤部件库（AMD / ASUS / Kingston / NVIDIA / Samsung / Corsair / Noctua / Lian Li） |
| 参数面板 | 每个部件的真实规格：CPU 频率 / 核心数 / 缓存 / TDP、显卡显存 / 位宽 / 长度、内存频率 / 时序、SSD 读写、电源认证…… |
| 兼容性检查 | 插槽、内存类型、显卡限长、散热器限高、电源功率、板型 |
| 综合评估 | 游戏 / 生产力两套加权分数、档位、1080p/2K 帧数估算、瓶颈提示、整机功耗与价格 |

一键「装满」会把 8 个类别各放一个部件，适合演示；「清空」回到空房间。

## 目录

```text
apps/pc-builder/
  main.js            Electron 主进程（含 SMOKE 截图模式）
  module.json        平台模块描述
  src/
    index.html       布局 + importmap（three / three/addons）
    styles.css       深色玻璃风格
    app.js           拖拽、选中、面板渲染（渲染进程入口）
    scene.js         Three.js 场景、相机、灯光、插槽位置表 SLOTS
    models.js        程序化低模：机箱 / 主板 / CPU / 散热 / 内存 / 显卡 / SSD / 电源
    catalog.js       部件数据（一个类别一个 demo 部件）+ 厂商表
    compat.js        兼容性规则
    perf.js          性能评分（纯函数）
  tests/             16 个 node:test 用例，不依赖 Electron
```

## 数据模型

`catalog.js` 里每个部件三层：

```js
{
  id: 'cpu-amd-7800x3d',
  category: 'cpu',
  vendor: 'AMD',
  name: 'AMD Ryzen 7 7800X3D',
  price: 2599,
  specs: { 核心: '8 核 16 线程', 基础频率: '4.2 GHz', 加速频率: '5.0 GHz', 'L3 缓存': '96 MB', TDP: '120 W' },
  metrics: { score: 88, cores: 8, threads: 16, baseClock: 4.2, boostClock: 5.0, tdp: 120, socket: 'AM5' }
}
```

- `specs` 是给人看的字符串，直接进详情面板；
- `metrics` 是给算分与兼容性检查用的数字 / 枚举；
- 3D 外观在 `models.js` 按 `category` 生成，颜色取 `part.color`。

## 评分怎么算

`perf.js` 先归一化各部件（CPU/GPU 直接用 `metrics.score`，内存按容量与频率，SSD 按读写），再按用途加权：

- 游戏 = CPU 25% + 显卡 50% + 内存 10% + 硬盘 10% + 散热 5%
- 生产力 = CPU 50% + 显卡 20% + 内存 15% + 硬盘 15%
- 总分 = 游戏 60% + 生产力 40%，并给出档位（入门 / 主流 / 主流偏高 / 高端 / 旗舰）

帧数是比例估算：显卡决定上限，CPU 用 `0.55 + cpu/200` 折算成「能不能喂饱」，2K 取 1080p 的 0.62、4K 取 0.33。
功耗 = CPU TDP + 显卡 TDP + 70W 固定开销，电源建议按 1.4 倍向上取 50W 整数倍。

**这只是 demo 的经验模型**，真平台应换成实测跑分库；函数签名（`scoreBuild(parts)`）可以保持不变。

## 测试

```bash
cd apps/pc-builder
npm test            # node --test，19 个用例
npm run check:syntax
```

全部离线，不需要 Electron，也不需要显卡。

## 关于 3D 模型

现在用的是**程序化低模**：机箱、主板、显卡、散热器都是按真实尺寸（厘米）用 Box/Cylinder/InstancedMesh 拼的。
这样 demo 能离线跑、不背第三方模型授权，也不怕下载链接失效。

想换成网上的真实模型（Sketchfab / Poly Pizza 的 CC0 资源等）时，只需要：

1. 把 `.glb` 放进 `assets/`；
2. 在 `models.js` 里用 `GLTFLoader` 加载，返回同样的 `THREE.Group`；
3. 保持 `group.userData = { partId, category }` 不变——拖拽、选中、评分都不用改。

## 性能与体验

- **帧率**：像素比封顶 1.5（高分屏按 DPR=2 渲染等于四倍像素）；灯光只留三盏；页面隐藏时暂停渲染；
  监听 `devicePixelRatio` 变化（浏览器缩放 / 换显示器）重设缓冲区，并配合 `ResizeObserver` 做尺寸自适应。
- **拖拽不会被机箱挡住**：只有「正在拖的那一类」插槽参与射线检测——机箱插槽是个包住全部内件的大盒子，
  它若参与命中会永远挡在最前面，这正是之前「隔着玻璃怎么都放不进去」的原因。没打中插槽时还有兜底：
  机箱在场就直接放进对应插槽。
- **主题**：石墨 + 琥珀（不再是深蓝），部件按类别分组，装过的部件带「已装」角标，页头有实时帧率。

## 已知边界

- 只有一个部件 / 类别，用来演示交互与评估，不做真实比价；
- 插槽位置是按这套尺寸写死的（`scene.js` 的 `SLOTS`），换大机箱要一起调；
- 帧数是估算值，不是实测；
- 没有保存 / 导入配置，刷新即清空。
