# 3D 装机模拟器（平台模块 · demo）

在一个真实比例的 3D 机箱里装电脑：部件要拖到插槽附近才能对准，方向装错要么塞不进去、
要么温度吃亏；装完 CPU 还得抹硅脂再压散热器，最后跑一遍开机自检。
装完给出兼容性检查、功耗估算、温度估算与综合性能评分。

定位是平台的其中一个模块，自带 `module.json` 描述入口与能力，方便以后挂到主平台上。

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

## 怎么装（这一版的核心规则）

1. **拖拽不会直接到位**：按住左边部件卡片拖动，部件跟着鼠标在机箱里飘；只有进入安装位
   容差（0.6~1.8cm，看部件）并且**朝向正确**时才显示绿框，松手才装得上。
2. **装不到就掉件**：松手时没对上，部件会被丢进机箱，走重力/反弹/摩擦的物理模拟，
   最后停在内腔底部（`physics.js`）。
3. **防呆是硬的**：CPU / 内存 / 显卡 / M.2 都有方向限制，装反直接塞不进去
   （真机上这么干就是弯针、插槽报废），会给出具体原因。
4. **没防呆但会遭罪的**：散热器转 180° 照样扣得上，但风道反了、热风往前面板吹；
   电源风扇朝托盘也能塞进电源仓，但进不了风——这两类只改温度与告警，不拦你。
5. **硅脂是必须的一步**：装好 CPU 才有顶盖可涂，四种涂法 + 用量滑杆（0.02~0.30ml），
   覆盖率/气泡/溢出/涂偏都会算进热阻；抹上之后压上散热器才会「摊开」。
   拆下散热器 = 硅脂已经被压过一次，必须擦掉重涂。
6. **开机自检**（工具栏 ⚡）：缺件、没涂硅脂、风道反了、硅脂覆盖太差都会在这里点名。

快捷键：`R` 拖拽时旋转 90°；`Esc` 取消拖拽；`Delete` 拆下选中部件。

## 真实依据（尺寸与朝向）

模型不是凭感觉摆的，关键数字来自厂商规格与实机照片：

| 部件 | 依据 |
| --- | --- |
| 机箱 Lian Li O11 Dynamic EVO | 465 × 285 × 459 mm 双仓：主板/显卡在左侧主仓（玻璃侧），电源与硬盘在右侧副仓；显卡限长 426mm、散热器限高 167mm；前面板与左侧板都是钢化玻璃（[官方规格](https://lian-li.com/product/o11-dynamic-evo/)、[TPU 评测](https://www.techpowerup.com/review/lian-li-o11-dynamic-evo/)） |
| 主板 ASUS ROG STRIX B650E-F | ATX 305 × 244mm，竖装、PCB 平面与侧板平行；插座距后置 I/O 边约 100mm、距板顶约 85mm；四条 DDR5 在插座前方；PCIe x16 在插座下方约 85mm（[官方规格](https://rog.asus.com/motherboards/rog-strix/rog-strix-b650e-f-gaming-wifi-model/spec/)） |
| 塔式风冷 NH-D15 | 165 高 × 150 宽 × 161 深（含两把 NF-A15）。塔身**垂直于主板、朝玻璃侧板**伸出，不是竖直向上；风扇从内存侧吹向机箱后部（[TPU](https://www.techpowerup.com/review/noctua-nh-d15/)） |
| 显卡 RTX 4070 Ti SUPER | 336mm 长、约 3 槽厚；水平插在第一条 x16 上，金手指靠后置 I/O，**风扇朝下、背板朝上**，从玻璃侧看到的是卡身侧面和背板 |
| DDR5 UDIMM | 133.35 × 34.9（带马甲）× 6.62mm；缺口偏置，插反/插错代进不去（[Kingston 数据表](https://www.kingston.com/datasheets/KF560C36BBEK2-32.pdf)、[PCMag](https://uk.pcmag.com/processors/136303/reminder-ddr4-ram-wont-fit-into-ddr5-slots-and-vice-versa)） |
| ATX 电源 | 150 × 86 × 140~160mm；副仓立放，风扇朝外侧网孔板吸风，模组口朝托盘（[Corsair 说明](https://www.corsair.com/us/en/explorer/diy-builder/power-supply-units/power-supply-form-factors-and-sizes-explained/)） |
| 硅脂 | 黄豆大中点法最稳，覆盖均匀比形状更重要；过多溢出、过少热点（[TermoPasty](https://termopasty.com/en/how-to-apply-thermal-paste/)） |

这些数字全部落在 [src/layout.js](src/layout.js) 里（单位 cm），`models.js` 和 `assembly.js` 都从它取值，
改机箱只要改一处。上一版把主板贴在**后板**上、散热器竖着摆在顶部、显卡立着悬空，这一版都改掉了。

## 能做什么

| 能力 | 说明 |
| --- | --- |
| 真实比例 3D | 机箱 / 主板 / CPU / 双塔风冷 / 内存 / 三风扇显卡 / M.2 / 电源，尺寸与朝向按官方规格 |
| 拖拽对准 | 3D 跟手拖拽 + 容差 + 朝向校验；绿色=能装，橙色=方向或位置不对 |
| 物理掉落 | 没对准松手 → 重力、落地反弹、摩擦，最后静止在内腔底部 |
| 装错后果 | 防呆类直接塞不进（附原因）；非防呆类装得上但温度变差 |
| 硅脂环节 | 四种涂法 × 用量滑杆 → 覆盖率 / 气泡 / 溢出 / 偏涂 → 热阻惩罚；压上散热器后摊开显示 |
| 温度与风道 | CPU / 显卡温度估算、风道方向、硅脂问题、缺件都会进面板 |
| 开机自检 | 一键跑一遍，列出必须修的错误与可以忍的告警 |
| 参数面板 | 每个部件的真实规格：CPU 频率 / 核心 / 缓存 / TDP、显卡显存 / 位宽 / 长度、内存频率 / 时序、SSD 读写、电源认证…… |
| 兼容性检查 | 插槽、内存类型、显卡限长、散热器限高、电源功率、板型 |
| 综合评估 | 游戏 / 生产力两套加权分数、档位、1080p/2K 帧数估算、瓶颈提示、整机功耗与价格 |

## 调试参数（无头验收用）

- `?autofill=1`：启动即按真机顺序装好 8 件（含涂硅脂）；
- `?parts=case,motherboard,cpu,paste`：只装指定几件，方便截局部；
- `?cam=x,y,z,tx,ty,tz`：指定机位；
- `?selftest=1`：在真实浏览器里跑一遍「装 → 涂 → 装错 → 掉件 → 自检」的链路，把
  `[selftest] ok/FAIL` 打到控制台（无头环境没有鼠标，这个入口覆盖交互相关代码）；
- `?probe=1`：读回一帧像素，打印非背景像素占比（证明场景真画出来了）；
- `?snapshot=1`：把这一帧读回 2D canvas 输出 `SNAPSHOT:<dataURL>`——无头浏览器的普通截图
  抓不到 WebGL 内容，这个参数就是为此准备的。

## 目录

```text
apps/pc-builder/
  main.js            Electron 主进程（含 SMOKE 截图模式）
  module.json        平台模块描述
  src/
    index.html       布局（部件库 / 画布 / 检查器）
    styles.css       浅色工作台 + 深色画布
    app.js           拖拽、旋转、硅脂、物理、面板渲染（渲染进程入口）
    layout.js        真实尺寸与安装基准：机箱内腔、主板特征位置、各插槽容差
    models.js        程序化几何：按真实比例和正确朝向搭每个部件
    scene.js         Three.js 场景、相机、灯光、按需渲染
    paste.js         硅脂模型（涂法 / 覆盖率 / 溢出 / 热阻惩罚）+ 硅脂网格
    physics.js       极简刚体：重力 / 反弹 / 摩擦 / 静止
    assembly.js      装配判定（容差 / 防呆 / 干涉）、朝向后果、温度与自检
    catalog.js       部件数据（一个类别一个 demo 部件）+ 厂商表
    compat.js        兼容性规则
    perf.js          性能评分（纯函数）
    resources.js     移除对象时释放 GPU 资源
  tests/             node:test 用例（57 个），不依赖 Electron
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
  specs: { 核心: '8 核 16 线程', 基础频率: '4.2 GHz', 'L3 缓存': '96 MB', TDP: '120 W' },
  metrics: { score: 88, cores: 8, threads: 16, tdp: 120, socket: 'AM5' }
}
```

- `specs` 是给人看的字符串，直接进详情面板；
- `metrics` 是给算分与兼容性检查用的数字 / 枚举；
- 3D 外观在 `models.js` 按 `category` 生成，颜色取 `part.color`；
- 插槽容差、防呆方向、碰撞盒在 `layout.js`，判定逻辑在 `assembly.js`。

## 评分与温度怎么算

`perf.js` 先归一化各部件（CPU/GPU 直接用 `metrics.score`，内存按容量与频率，SSD 按读写），再按用途加权：

- 游戏 = CPU 25% + 显卡 50% + 内存 10% + 硬盘 10% + 散热 5%
- 生产力 = CPU 50% + 显卡 20% + 内存 15% + 硬盘 15%
- 总分 = 游戏 60% + 生产力 40%，并给出档位

温度在 `assembly.js` 的 `thermalReport`：以「CPU TDP / 散热器解热能力」为基线，叠加硅脂覆盖率
惩罚、风道朝向惩罚；没有硅脂直接 +17°C，没装散热器固定 97°C。
**这是表达相对影响的估算模型，不是散热仿真**，真平台应换成实测数据。

## 测试

```bash
cd apps/pc-builder
npm test            # node --test，57 个用例
npm run build
npm run check:syntax
```

覆盖：真实尺寸与安装基准、朝向判定与防呆、硅脂模型、物理掉落、兼容性与评分。
全部离线，不需要 Electron，也不需要显卡。

浏览器里的端到端链路用 `?selftest=1` 跑（见上）。

## 关于 3D 模型

现在用的是**程序化几何**：按真实尺寸（厘米）用 Box / Cylinder / Torus / InstancedMesh / Tube 拼出来，
每个部件的局部原点就是它的**安装基准点**，模型直接按「装好以后的世界朝向」编写。
这样 demo 能离线跑、不背第三方模型授权，也不怕下载链接失效。

想换成网上的真实模型（Sketchfab / Poly Pizza 的 CC0 资源等）时：

1. 把 `.glb` 放进 `assets/`；
2. 在 `models.js` 里用 `GLTFLoader` 加载，返回同样的 `THREE.Group`；
3. 保持原点在安装基准点、`group.userData = { partId, category }` 不变——拖拽、碰撞、评分都不用改。

## 性能与体验

- **硬件加速**：默认走 GPU；无 GPU 的 CI / 容器用 `PC_BUILDER_SOFTWARE=1` 退回软件渲染
  （Chromium 新版本还要显式加 `enable-unsafe-swiftshader`，`main.js` 里已经加了）。
- **按需渲染**：静止不提交帧，只有拖拽、物理还在跑、相机阻尼未收敛时才画下一帧。
- **像素比封顶 1.5**，页面隐藏时取消排队帧，`ResizeObserver` + DPR 监听做尺寸自适应。
- **不穿模**：只有「正在拖的那一类」插槽参与射线判定，避免机箱大盒子永远挡在最前面。

## 已知边界

- 一个类别只有一个 demo 部件，用来演示交互与评估，不做真实比价；
- 物理只模拟机箱六面墙 + 单个 AABB，不做零件之间的互相碰撞（够表现「掉件」）；
- 温度与帧数都是估算值，不是实测；
- 没有保存 / 导入配置，刷新即清空。
