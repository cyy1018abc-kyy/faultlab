# FaultLab V0.1 — 工程契约（Team Contract）

> **G0 裁决基线（2026-10-27T20:35 起生效）**
>
> - **权威顺序**：`FaultLab-evaluation/DECISIONS/DECISIONS.md`（决策）→
>   `FaultLab-evaluation/NEXT/*.md`（DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC /
>   UI_COPY_GUARDRAILS / BACKLOG_APPROVED / SCOPE_SPLIT_MEMO，规格）→ 本文件（实现契约）→ 既有实现。
>   **本文件与 DECISIONS 冲突时以 DECISIONS 为准。**
> - **P0 基线**：仅 **FL-001 × 3 组固定 Run（baseline / closed_loop_fault / monitor_only）×
>   5 逻辑视图 × 单一时钟 × 事件 pre/post × 证据导出/重载**。三系统/三类故障族/Agent Arena 为
>   **扩展预览（P1/P2）**，不属于 V0.1 基准验收路径（见 §1、§5.3、§11）。
> - **本次对齐的强制偏离**（逐条见文末「附录 G0 对齐记录」）：
>   事件 `pre` 改为 `t_s=20.0` 左极限（§4.6/§5.1/§6）；SOC 公式补 ×100（§5.1）；
>   积分/舍入口径冻结（§5.0/§5.1）；FL-001 `load_step` **暂停实现**（§5.1）；
>   FC-001 SOC 末值修正（§5.2）；**GT-001 当前形态 NO-GO**（§5.3）；Arena 降为 P2 扩展预览（§11）。
> - 本文件仍是并行开发的接口事实源；本文件未覆盖处，先向 Lead 提问，不要自行改公共接口。
>
> 原始说明：所有 teammate 在写代码前必须完整阅读本文件与
> `F:\FaultLab_V0.1_页面原型与交互规格.md`。接口冲突时以本文件为准。

---

## 0. 角色、通信与纪律

**Lead**：架构、脚手架、集成、导出、构建、QA、最终交付。**任何 teammate 不得修改**：
`index.html`、`docs/**`、`css/theme.css`、`src/core/protocol.js`、`src/ui/store.js`、
`src/ui/shell.js`、`src/ui/components.js`、`src/ui/export.js`、`src/main.js`、`tools/**`、`README.md`。

**Teammate 工作纪律**
1. 只写自己 ownership 内的文件（见 §2 表格）。新增文件必须在自己目录内。
2. 不执行 `git` 命令（Lead 负责提交）。不启动占用 4318 端口的服务器（Lead 已运行）。
3. 每次保存后 `node --check <file.js>` 校验语法。
4. 视觉自测：用 Chrome headless 截图（见 §15.3），用 `read_image` 自查，不要只写代码不看在眼里。
5. 完成后 `send_message` 给 Lead：写了哪些文件、API 是否按契约、自测结果、已知风险。
6. 有接口疑问尽早问 Lead，不要静默改契约。

**任务板**：每个工作流对应一条 shared task，开工前用 `team_task_get` 读、用 `team_task_update(claim)`
认领，完成后 `complete`。任务描述里有验收条目。

---

## 1. 产品范围

**P0 基线（G0 批准；验收只认这一条）**：

1. 规格五个页面：**首页 / 系统交互图 / 实时曲线 / 因果解释 / 结果对比**。
2. **FL-001 基准实验**逐字符合规格 §1 数值、§11 UX-01..UX-12、§5.3 线型语义、§6.3 文案约束。
3. **三组固定 Run**：`baseline`（无故障）、`closed_loop_fault`（20 s +10 A 闭环）、
   `monitor_only`（仅监测）；同配置、唯一变量、独立 `run_id`，均可回放/对照/导出。
4. 导出：CSV、配置清单 JSON、证据包（JSON）；HTML 报告为 P1。P0 证据包格式以
   `FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md` 为准。
5. 离线可运行；实现层维持零构建经典脚本，并保留单文件构建能力（`FaultLab.html`，P1 交付形态）。
6. 真值/观测/推断分离（每个数字带 `source_kind` 标签）；结论可回溯
   （`run_id + variable + time_window`）；可信度标签由 Run 元数据生成，不由 UI 自由切换。

**扩展预览（P1/P2，不是 V0.1 P0 验收路径）**：

- 三个系统可切换（`FL-001` / `FC-001` / `GT-001`）：FC-001 修完 §5.2 的 SOC 末值后可作为 P1 的
  L0b 候选；**GT-001 当前形态 NO-GO（§5.3）**，恢复须先走独立 G2b 物理规格评审。
- 三类故障家族（`sensor_drift` / `load_step` / `actuator_fault`）：其中 **FL-001 的 `load_step`
  暂停实现**（§5.1）；其余作为扩展预览，不作为 P0 验收。
- **Agent Arena**：P2 扩展预览（隐藏真值盲测、确定性诊断 Agent、评分/排行榜、盲测包导出与
  外部诊断导入）。其"真值隔离"在本实现中是 UI 开关、**不是安全边界**；契约级隔离以
  `DATA_CONTRACT_SPEC.md` 的 `exposure` / `project('blind')` 为准。
- **不做**：3D、真实设备、账号、任意 `.slx` 上传、云端排行榜、LLM 实时诊断（只留接入协议）。

**产品原则（所有 UI 必须体现）**：先系统后曲线；真值/观测/推断分离（每个数字带 source_kind 标签）；
单一全局仿真时间线；结论可回溯（run_id + variable + time_window）；演示优先、渐进披露；
**已知故障传播解释 ≠ 诊断算法**（无检出率/误报率/诊断延迟指标）。

> 范围裁决依据：`FaultLab-evaluation/DECISIONS/DECISIONS.md` 的 G0-DEC-01/14/15 与
> `FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md`。

---

## 2. 技术约束与文件所有权

- 纯静态、零运行时依赖、零外网请求、零构建步骤（开发）。现代 Chrome/Edge。
- 语言：ES2020 经典脚本（**不是 ES module**，不用 import/export），所有模块挂在全局 `window.FL`。
  这样 `file://` 双击也能跑。IIFE 包裹：`(function(){ 'use strict'; const FL = window.FL = window.FL || {}; ... })();`
- 样式：纯 CSS（无预处理器），按文件拆分。所有页面 CSS 只能使用 `.pg-<page>` 前缀作用域 +
  theme.css 的公共类，禁止全局选择器（`body`、`*`、元素选择器）出现在页面 CSS 里。
- 图表：Canvas 自绘（无第三方库），必须 HiDPI、支持多序列/双轴/事件竖线/游标/阶跃绘制。
- 存储：localStorage；时间单位：秒；功率 kW；电流 A；电压 V；SOC 百分数；时间基准 `duration_s=60`、`dt_s=0.1`（601 点，含 t=60）。
- 中文 UI 文案，专业、克制；数字/变量/公式用等宽字体；禁止 lorem ipsum、禁止英文占位。
- 每个文件顶部一行注释：`/* owner: <teammate> | module: <name> | contract: docs/CONTRACT.md */`

### 2.1 文件所有权

| 路径 | Owner | 内容 |
|---|---|---|
| `index.html` | Lead | 开发入口，脚本/样式加载顺序 |
| `css/theme.css` | Lead | 设计令牌、基础排版、公共组件类、壳层、时间线 |
| `css/signals.css` | chart-signals | 曲线页样式 |
| `css/home.css`, `css/system.css` | lab-pages | 首页、系统页样式 |
| `css/causal.css`, `css/compare.css` | causal-compare | 因果页、对比页样式 |
| `css/arena.css` | arena-agents | 竞技场样式 |
| `src/core/hash.js`, `rng.js`, `systems.js`, `engine.js`, `metrics.js`, `checks.js` | core-engine | 物理/数据层 |
| `src/core/protocol.js` | **Lead** | 数据词汇、source_kind、格式化、采样工具 |
| `tests/core.test.js`, `tests/core-load.js` | core-engine | 核心单元测试（Node 直接跑） |
| `src/agents/builtin-agents.js`, `src/agents/arena.js` | arena-agents | 诊断 Agent 与比赛/评分 |
| `docs/AGENT_PROTOCOL.md` | arena-agents | 外部 Agent 接入协议 |
| `src/ui/components.js`, `store.js`, `shell.js`, `timeline.js`（可并入 shell）, `export.js` | **Lead** | 壳层与公共 UI |
| `src/ui/chart.js`, `src/ui/pages/signals.js` | chart-signals | 图表演染 + 曲线页 |
| `src/ui/pages/home.js`, `src/ui/pages/system.js` | lab-pages | 首页 + 系统交互图 |
| `src/ui/pages/causal.js`, `src/ui/pages/compare.js` | causal-compare | 因果页 + 对比页 |
| `src/ui/pages/arena.js` | arena-agents | 竞技场页 |
| `tools/build.py`, `tools/serve.py`, `tools/qa.mjs`, `tools/screenshot.ps1` | Lead | 构建/服务/自动化 QA |
| `README.md`, `docs/SCOPE.md` | Lead | 交付说明 |

**页面占位文件**由 Lead 先创建（导出 `FL.pages.<id> = {id,label,mount,update}` 空实现），
对应 owner 直接整体覆写即可，不要改接口签名。

### 2.2 加载顺序（index.html 必须严格按此顺序，Lead 维护）

```
css/theme.css
css/home.css css/system.css css/signals.css css/causal.css css/compare.css css/arena.css

src/core/hash.js
src/core/rng.js
src/core/protocol.js
src/core/systems.js
src/core/engine.js
src/core/metrics.js
src/core/checks.js
src/agents/builtin-agents.js
src/agents/arena.js
src/ui/components.js
src/ui/store.js
src/ui/chart.js
src/ui/export.js
src/ui/pages/home.js
src/ui/pages/system.js
src/ui/pages/signals.js
src/ui/pages/causal.js
src/ui/pages/compare.js
src/ui/pages/arena.js
src/ui/shell.js
src/main.js
```

页面模块必须在 `update()` 里对未知/缺失数据做空态防御（`state.run == null` 等），
因为 shell 在任意状态变化时都会调用当前页 `update()`。

---

## 3. 设计语言（Lead 定义，所有人遵守）

### 3.1 方向

**"深空能源实验室"**：深石墨背景 + 蓝图网格 + 荧光莱姆能量流 + 青色观测通道 + 琥珀热/燃料 +
故障红；仪表盘式精密排版，DIN 风格标题 + 等宽数字；切角面板、细发丝线、微噪点纹理。
不要紫色渐变、不要通用大圆角卡片堆。动效克制（能量流动画、页面入场、数字刷新），
`@media (prefers-reduced-motion: reduce)` 全部禁用位移/循环动画。

### 3.2 字体（离线系统字体，禁止外链）

```css
--font-display: "Bahnschrift", "DIN Alternate", "Microsoft YaHei UI", "PingFang SC", sans-serif;
--font-body: "Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif;
--font-mono: "Cascadia Mono", "Cascadia Code", "Consolas", "Microsoft YaHei UI", monospace;
```

标题/大数字用 display（字重 600，数字 `font-variant-numeric: tabular-nums`）；
UI 正文用 body；计量/变量/公式/时刻用 mono。微标签：mono 11px、大写、`letter-spacing:.12em`。

### 3.3 令牌（css/theme.css 已定义，直接用，不要另造近似色）

| Token | 值 | 用途 |
|---|---|---|
| `--bg-0` | `#06080b` | 页面底 |
| `--bg-1` | `#0b0f14` | 面板底 |
| `--bg-2` | `#11161d` | 卡片/输入底 |
| `--bg-3` | `#171e27` | hover/选中底 |
| `--line-1` | `#232b35` | 发丝线 |
| `--line-2` | `#2f3945` | 强调边 |
| `--ink-0` | `#eef3f2` | 主文字 |
| `--ink-1` | `#c2ccd0` | 次文字 |
| `--ink-2` | `#8b98a5` | 弱文字 |
| `--ink-3` | `#5a6673` | 禁用/极弱 |
| `--acc` | `#c8f45a` | 能量/主行动/真实值 |
| `--obs` | `#5ad8ff` | 观测/测量值 |
| `--warm` | `#ffb257` | 热/燃料/目标值 |
| `--fault` | `#ff5f6d` | 故障/危险 |
| `--ok` | `#5fe3a1` | 通过 |
| `--warn` | `#ffd166` | 警告 |

**语义映射（全站一致）**：
- 真实物理量 = `solid` 实线 + `--acc`；测量/观测 = `dashed` 虚线 + `--obs`；
  目标/指令 = `dashdot` 点划线 + `--warm`；故障事件 = `--fault` + 专属三角/斜纹标记；
  基准对照 = 同语义色但 `dotted` + 45% 不透明度。**线型 + 图例文字 + 颜色三重区分**。
- source_kind 标签：`CONFIG` 灰、`MODEL_STATE` 莱姆、`OBSERVATION` 青、`CONTROLLER` 琥珀、
  `FAULT_EVENT` 红、`DERIVED` 蓝紫、`MODEL_ASSUMPTION` 中灰。全部带文字，不只靠颜色。

### 3.4 公共组件类（theme.css + components.js 提供，页面直接用）

`.fl-panel` `.fl-card` `.eyebrow` `.panel-head` `.panel-title` `.panel-sub` `.stat` `.stat-value`
`.stat-unit` `.stat-label` `.source-tag[data-kind]` `.chip` `.badge` `.badge[data-tone]`
`.btn` `.btn-primary` `.btn-ghost` `.btn-danger` `.btn-sm` `.btn-icon` `.seg` `.seg-item`
`.field` `.field-label` `.field-hint` `.field-error` `.range` `.switch` `.kbd` `.hr`
`.empty` `.loading` `.drawer` `.modal` `.toast` `.hazard` `.chamfer` `.mono` `.num` `.muted`
`.focus-ring`（focus-visible 统一环）。组件 JS 见 §11。

### 3.5 布局与响应式

- 断点：`>=1200px` 三栏；`768–1199px` 两栏/右侧抽屉；`<768px` 单列堆叠（控制→系统→数据），
  时间线折叠为可展开条。
- 壳层：header 64px（logo + 实验名/system 切换 + 模式徽章 + Run 状态 + 帮助）；
  nav 条 44px（首页/系统/曲线/因果/对比/竞技场）；内容区自适应滚动；底部固定时间线 92px。
- 页面内容左右留白 `clamp(16px, 2.4vw, 40px)`；不用居中窄容器限制系统图/曲线（数据密集页可全宽）。

### 3.6 可访问性

- 所有交互控件可 Tab 聚焦，`:focus-visible` 用 `--focus-ring`；禁用态给出原因文案。
- 图表提供"表格模式"开关（曲线页）；playhead 可键盘操作；
- 弹层/抽屉打开时焦点进入、Esc 关闭、关闭后焦点还原（components.js 已实现，页面调用即可）。
- 键盘（shell 全局，输入框聚焦时禁用）：空格播放/暂停，←/→ ±0.1s，Shift+←/→ ±1s，Home/End 0/60s。
- 不把红绿作为唯一状态区分；图表线型+图例文字必须可辨。

---

## 4. 数据协议（产品层字段）

### 4.1 source_kind 枚举

`CONFIG | MODEL_STATE | OBSERVATION | CONTROLLER | FAULT_EVENT | DERIVED | MODEL_ASSUMPTION`

规则：**说明文本不能当计算数据源**；真实状态与观测分离；盲测模式只暴露标了
`blindVisible:true` 的信号；`FAULT_EVENT` 与 `MODEL_STATE` 默认对盲测 Agent 不可见。

### 4.2 System 定义（`FL.systems.get(systemId)` 返回）

```js
{
  id: 'FL-001',                       // 也是默认实验 id
  title: '电池储能系统',
  shortTitle: '电池储能',
  experimentCode: 'FL-001',
  experimentName: '电池电流传感器偏置',
  tagline: '在 20 秒注入 +10 A 电流测量偏置，看反馈回路如何改变真实功率。',
  level: 'L0 · 行为级演示模型',
  summary: '一段',
  questions: ['…', '…', '…'],        // 首页三个问题
  defaults: { …scenario_config 的默认值（不含 run/时间） },
  duration_s: 60, dt_s: 0.1,
  components: [
    { id:'battery', label:'电池组', kind:'battery', role:'40 kWh / 400 V',
      description:'…', x:120, y:320, w:132, h:84, faultable:false,
      inspector: [{ id:'I_bat_true_A', source:'MODEL_STATE' }, …] }
  ],
  edges: [
    { id:'battery->bus', from:'battery', to:'bus', kind:'power', label:'电力' },
    { id:'sensor->controller', from:'sensor', to:'controller', kind:'signal', label:'测量' }
  ],                                  // kind: power | signal | measurement
  faultAnchors: { sensor_drift:'sensor', load_step:'load', actuator_fault:'converter' },
  signals: [ /* §4.3 */ ],
  signalCategories: [{ id:'current', label:'电流' }, …],
  faults: [ /* §4.4 */ ],
  model: {
    model_id:'fl.bess.l0', model_version:'1.0.0',
    assumptions: [{ id:'A-ideal-bus', text:'直流母线 400 V 理想，无母线动态。' }, …],
    limitations: ['…'],
    equations: [{ id:'EQ-1', latex_text:'I_meas(t)=I_true(t)+b(t)', note:'…' }]
  },
  topologyViewBox: [0, 0, 1000, 620],  // 系统图坐标系；node 的 x/y/w/h 用此坐标
  acceptance: { … }                    // 见 §5
}
```

### 4.3 Signal 元数据（`system.signals`，运行时会复制进 `run.signals`）

```js
{
  id: 'I_bat_meas_A',
  label: '电池测量电流',
  shortLabel: 'I_meas',
  unit: 'A',
  category: 'current',            // 对应 signalCategories
  sourceKind: 'OBSERVATION',
  definition: '传感器输出 = 真实电流 + 故障偏置',
  formula: 'I_meas = I_true + b(t)',   // 可空
  precision: 2,
  chart: { style:'dashed', colorToken:'obs', axis:'left', step:true, defaultVisible:true },
  blindVisible: true,             // 盲测 Agent 可见
  tableOnly: false                // 不出图、只在数据快照/表格出现（如 V_bus）
}
```

`colorToken` 只能取 `acc|obs|warm|fault|ink|ok`；`style` 只能取 `solid|dashed|dashdot|dotted`。
`step:true` 表示采样保持绘制（离散/跳变信号），跨 20.0s 不连续处不得平滑。

### 4.4 故障目录（`system.faults`）

```js
{
  id: 'I_bat_sensor_bias',        // 场景变体 id
  family: 'sensor_drift',         // sensor_drift | load_step | actuator_fault
  label: '电流传感器漂移',
  shortLabel: '传感器漂移',
  target: 'I_bat_sensor',         // 作用对象（component id 或通道 id）
  description: '电池电流测量通道注入阶跃偏置，控制器按错误测量反馈。',
  params: [
    { key:'magnitude', label:'偏置幅值', unit:'A', min:2, max:30, step:1, default:10,
      precision:0, help:'正偏置使控制器认为放电电流偏大' }
  ],
  defaultTime_s: 20,
  timeRange: [2, 55],
  closedLoopEffect: '真实电流下降并重新平衡',
  monitorEffect: '真实电流不变，仅测量值跳变',
  causalTemplateId: 'sensor-drift-feedback'
}
```

`load_step` 参数 `magnitude` 单位 kW（default 10，min 5 max 20）；`actuator_fault` 参数
`magnitude` 为受限百分比（default 55，min 20 max 85，单位 `%`）。

### 4.5 Scenario config（可复现输入，可哈希）

```js
{
  schemaVersion: 1,
  systemId: 'FL-001',
  modelId: 'fl.bess.l0', modelVersion: '1.0.0',
  duration_s: 60, dt_s: 0.1,
  feedback_mode: 'closed_loop',      // 'closed_loop' | 'monitor'
  fault: {
    family: 'sensor_drift',
    faultId: 'I_bat_sensor_bias',
    t_start_s: 20,
    params: { magnitude: 10 }        // 按 catalog params
  },
  initial: {                        // 各系统见 §5；系统默认值在此
    load_kW: 30,
    SOC_pct: 60
  },
  noise: { enabled: false, seed: 12345, level: 0.0 }   // 仅加在观测通道
}
```

`fault.family='none'` 表示健康基准运行（用于对比基线）。

### 4.6 Run 对象（不可变；页面唯一数值源）

```js
{
  runId: 'Run-001',
  runShortHash: '3fa9c1d2',          // configHash 前 8 位，展示用
  systemId: 'FL-001',
  label: '闭环 · +10A@20s',          // 人类可读
  role: 'fault' | 'baseline' | 'contrast' | 'arena',
  createdAt: '2026-10-27T19:20:00+08:00',
  status: 'completed' | 'failed',
  config,                            // 深拷贝，不可变
  configHash: '<sha256 hex>',
  modelHash: '<sha256 hex>',
  engineVersion: '0.1.0',
  signals: [ /* signal 元数据快照 */ ],
  timeseries: {
    t: [0, 0.1, … 60],               // 601 个 number
    signals: { I_bat_true_A: [ … ], … }
  },
  events: [
    { event_id:'EV-001', event_type:'sensor_bias',
      trigger_s:20, target_signal:'bias_A', target_component:'sensor',
      magnitude:10, unit:'A', phase:'onset',
      label:'电池电流传感器偏置 +10 A',
      preSnapshotId:'EV-001-pre', postSnapshotId:'EV-001-post' }
  ],
  snapshots: [
    // G0 对齐（B01）：pre 是 t_start=20.0 的左极限，不是 19.9 s 采样行。
    // 19.9 s 只是上一常规采样点（可用 timeseries 查询），不叫 pre。
    { snapshotId:'EV-001-pre', event_id:'EV-001', t_s:20.0, phase:'pre',
      derivation:'left_limit',
      variables:{ I_bat_true_A:25, I_bat_meas_A:25, … } },
    { snapshotId:'EV-001-post', event_id:'EV-001', t_s:20.0, phase:'post',
      derivation:'post_sample', variables:{…} }
  ],
  metrics: [ /* §4.7 */ ],
  quality: [ /* §4.8 */ ],
  causal: { /* §4.9 */ },
  truth: {                            // 演示模式可公开；盲测不得下发给 Agent
    faultFamily:'sensor_drift', faultId:'I_bat_sensor_bias',
    faultActiveFrom_s:20, faultDuration_s:40, peakMagnitude:10, unit:'A',
    effectiveFeedbackMode:'closed_loop',
    affectedComponent:'sensor'
  }
}
```

**时间数组严格 601 点**，`t[k] = k*0.1`（浮点误差容忍 1e-9）。所有序列同长度。
缺失指标用 `value: null, unavailable: true`，**不得填 0 冒充**。

### 4.7 Metric（`run.metrics`）

```js
{ metric_id:'E_bat_kWh', label:'电池真实电能积分', value:0.123889, unit:'kWh',
  precision:5, time_window:[0,60], method:'∫ P_bat,true dt / 3600',
  source_run_ids:['Run-001'], source_kind:'DERIVED', focal:false, unavailable:false }
```

必含指标（所有系统）：`E_load_kWh`（需求）、`E_load_served_kWh`（实际服务）、
`E_source_kWh`（发电机/燃料电池真实电能）、`E_bat_kWh`（电池真实电能，带符号）、
`SOC_true_end_pct`、`SOC_est_end_pct`、`SOC_err_pp`、`max_abs_r_true_kW`、`max_abs_r_meas_kW`、
`fault_active_s`、`fault_duration_s`、`fault_peak_magnitude`（含 unit）、`effective_mode`
（`closed_loop`/`monitor`/`healthy`）、`focal_change`（从故障时刻起的实际焦点信号变化量，
FL-001 为电池真实电流变化 A；FC 为电堆真实电流；GT 为发电机真实功率）。

### 4.8 Quality check（`run.quality`）

```js
{ check_id:'conservation-true', label:'真实功率守恒', status:'pass'|'warn'|'fail',
  tolerance:'≤ 1e-6 kW', computed_value:2.3e-13, message:'…' }
```

必含：`sampling`（601 点/长度一致）、`conservation-true`、`conservation-meas`（warn 允许，
故障期间残差本就非零）、`units`、`soc-bounds`、`event-window`、`energy-balance`。
GT 系统的 power conservation 含 `P_rotor_kW` 项（见 §5.3）。

### 4.9 Causal（`run.causal`）

```js
{
  focusEventId:'EV-001',
  headline:'t=20.0 s，电池电流传感器偏置 +10 A',
  mechanismSummary:'…一句机制总结…',
  nodes: [
    { id:'n1', order:1, title:'偏置注入', short:'传感器偏置 +10 A',
      detail:'…（分层：配置事实/模型机制/数值观测）…',
      layer:'config'|'mechanism'|'observation',    // 三层必须可区分展示
      componentId:'sensor', signalIds:['bias_A'],
      evidence:[{ runId:'Run-001', varId:'bias_A', t0:19.9, t1:20.1,
                  note:'事件前为 0，20.0 s 起为 +10 A' }] },
    …
  ],
  edges: [{ from:'n1', to:'n2', label:'注入测量通道' }, …],
  assumptions: ['A-ideal-bus', …],     // 引用 model.assumptions id 或文本
  limitations: ['…'],
  alternatives: [{ title:'若为仅监测模式', text:'真实电流将保持 25 A…' }],
  monitorContrast: {                // 可空；有 monitor 对照 Run 时由 UI 填充展示
    description:'仅监测模式下真实电流保持不变，测量电流仍 +10 A。'
  }
}
```

**FL-001 传感器偏置的因果链必须恰好是规格 §6.1 的六节点**：
①偏置注入 → ②测量电流偏高 → ③控制器误认为放电偏大 → ④真实电池放电下降 → ⑤发电机补偿 → ⑥测量功率残差。
扩展系统/故障的链可 5–6 节点，但必须遵守 §6.3 模板句：
`因为[有记录的事件]发生在[作用通道]，且[模型连接规则]，所以[根据模型计算的状态]发生改变`。
三层（配置事实 / 模型机制 / 数值观测）用 layer 字段标出并在 UI 上分区/加标签，不得混写。

### 4.10 compareRuns 返回

`FL.core.compareRuns(baselineRun, trialRun)` →

```js
{
  valid: true,                       // 是否允许"因故障导致"因果表述
  diffAllowed: true,                 // 是否允许差值图（单位/时间基准一致）
  checks: [
    { id:'model-hash', label:'模型版本一致', status:'pass'|'warn'|'fail',
      message:'model_hash 一致' }
  ],
  pairs: [ { metric_id:'E_bat_kWh', baseline:{…metric}, trial:{…metric},
             delta:0.042778, deltaUnit:'kWh' } ],
  findings: [
    { id:'F1', title:'真实放电电能下降', text:'…', metric_ids:['E_bat_kWh'], severity:'info' }
  ],
  warnings: ['…']
}
```

必须检查：modelHash、engineVersion、duration/dt、初始条件、负载需求曲线、观测定义；
不通过时 `valid=false` 且 UI 用黄色警告 + 限制因果表述；单位/时间基准不兼容 → `diffAllowed=false`。

---

## 5. 物理模型规格（core-engine 实现基准）

所有模型都是**行为级降阶模型 L0**，必须在 UI/导出中标注"解析/行为级演示，非 Simulink/实测"。
内部积分用 `dt_int = 0.01 s` 子步（一阶环节用**精确指数**更新，保证 FL-001 与解析式一致）；
输出在 0.1 s 网格上取值（含 t=60）。故障时刻取 0.1 s 网格。

一阶环节精确离散：`y_{n+1} = target + (y_n - target) * exp(-dt/tau)`（target 在步内视为常数）。

### 5.0 G0 数值口径（新增；B01/B02/B04，详见 `NEXT/MODEL_VALIDATION_SPEC.md`）

- **金标准积分规则**：FL-001 的能量与 SOC 以**解析积分（事件感知）**为准（见 §5.1 验收表）；
  若实现采用数值求积，仅作敏感性证明，容差放宽至 `E ≥1e-5 kWh`、`SOC ≥5e-4 pp`；
  `metrics.method_id` 必须声明（`analytic_flux` / `trapz_dt0.01` / …）。
- **显示舍入**：存储全精度；显示按字段 precision，`round-half-up`；电流/功率 4 dp、能量 6 dp、
  SOC 与 SOC_err 5–6 dp；"≈" 必须写明容差。
- **事件编码**：`(event_id, phase)` 为主键；`pre` = `t_s=t_start` 左极限
  （`derivation:'left_limit'`），`post` = 同刻采样值（`derivation:'post_sample'`）；
  19.9 s 只是上一常规采样点，**不是 pre**；`timeseries.csv` 的 20.0 s 行 = post。
- **SOC 公式**：`SOC% = 60 − 100·(1/40)·∫P dt/3600`（`∫P dt` 单位 kW·s）。旧文本缺 ×100，已修正（B04）。

### 5.1 FL-001 电池储能（BESS）— 与规格解析式在 1e-6 容差内一致（G0：不要求"逐位一致"）

**拓扑**：`battery` 电池组(40 kWh/400 V) → `converter` 双向 DC/DC → `bus` 400 V 直流母线 →
`load` 30 kW；`generator` 理想平衡源（初始 20 kW）接母线；`sensor` 电池电流传感器；
`controller` 功率控制器。传感器测量电池电流，控制器按测量电流调节变换器。

**默认配置**：`closed_loop`，`fault = {family:'sensor_drift', faultId:'I_bat_sensor_bias',
t_start_s:20, params:{magnitude:10}}`，`duration_s:60, dt_s:0.1`，`initial:{load_kW:30, SOC_pct:60}`，
无噪声。初始 `I_ref = 25 A`（=10 kW / 0.4 kV），`P_gen=20 kW`，`SOC=60%`。

**方程**（`b(t)=0 (t<20)`, `=10 A (t>=20)`；`V=0.4 kV` 等效系数 `P_kW = 0.4*I_A`）：
- 闭环：`tau*dI_true/dt + I_true = I_ref - b(t)`，`tau=1.5 s`；初值 `I_true(0)=25`。
  → `t>=20`：`I_true = 15 + 10*exp(-(t-20)/1.5)`。
- 仅监测：`I_true(t) ≡ 25 A`（b 不进入物理回路）。
- `I_meas = I_true + b(t)`；`P_bat_true = 0.4*I_true`；`P_bat_meas = 0.4*I_meas`；
  `P_gen_true = P_load_demand - P_bat_true`（理想瞬时补偿）；`P_load_served = P_load_demand`。
- `SOC_true = 60 - 100 * ∫P_bat_true dt / (40 kWh * 3600)`（百分数，`∫` 用 kW·s → /3600 → kWh；
  **G0 B04：旧文本缺 ×100，已修正**）；
  `SOC_est` 用 `P_bat_meas` 积分。`r_true = P_gen_true + P_bat_true - P_load_served`；
  `r_meas = P_gen_true + P_bat_meas - P_load_served`。
- **扩展 `load_step`：G0 暂停实现（B12）**。原因：现文本"发电机一阶惯性源（`tau_gen=2.0 s`）追踪
  `P_load_demand - P_bat_true`"与"电池电流保持 `I_ref` 反馈控制"自相矛盾（按文字起始失衡 −10 kW，
  与"守恒 ≤1e-6"相差 7 个数量级），且发电机滞后曲线违反 V0.2 §1.2 R-02。
  恢复条件：删除发电机滞后，或引入母线储能 `E_bus/P_bus` 并把守恒式改为
  `P_gen+P_bat+P_bus=P_load`，走独立 G2b 物理规格评审。**当前不得作为验收路径。**
- 扩展 `actuator_fault`（扩展预览，不作 P0 验收）：变换器电流上限降为 `I_cap = I_ref*magnitude/100`
  （例如 55% → 13.75 A），真实电流被限幅，控制器指令仍为 25 A；发电机补偿剩余需求。
  `I_true = min(控制输出, I_cap)`（带 0.4 s 一阶过渡）。观测 `I_bat_cap_A`（FAULT_EVENT）。

**必含信号**（id / label / unit / sourceKind / category / chart）：
| id | label | unit | source | category | 备注 |
|---|---|---|---|---|---|
| `I_bat_true_A` | 电池真实电流 | A | MODEL_STATE | current | solid acc |
| `I_bat_meas_A` | 电池测量电流 | A | OBSERVATION | current | dashed obs, step, blind |
| `I_ref_A` | 控制器电流目标 | A | CONTROLLER | current | dashdot warm, blind |
| `bias_A` | 传感器偏置 | A | FAULT_EVENT | current | dashed fault, 右轴, step |
| `I_bat_cap_A` | 变换器电流上限 | A | FAULT_EVENT | actuator | 仅执行器故障场景非空 |
| `P_bat_true_kW` | 电池真实功率 | kW | MODEL_STATE | power | solid |
| `P_bat_meas_kW` | 电池测量功率 | kW | OBSERVATION | power | dashed, blind |
| `P_gen_true_kW` | 发电机真实功率 | kW | MODEL_STATE | power | solid |
| `P_gen_meas_kW` | 发电机测量功率 | kW | OBSERVATION | power | dashed, blind |
| `P_load_demand_kW` | 负载需求功率 | kW | CONFIG | power | solid, blind |
| `P_load_served_kW` | 负载实际获得功率 | kW | MODEL_STATE | power | solid |
| `V_bus_V` | 直流母线电压 | V | MODEL_ASSUMPTION | power | tableOnly, blind |
| `SOC_true_pct` | 真实 SOC | % | MODEL_STATE | soc | solid |
| `SOC_est_pct` | 估计 SOC | % | OBSERVATION | soc | dashed, blind |
| `r_true_kW` | 真实功率平衡残差 | kW | DERIVED | residual | 恒 ≈0 |
| `r_meas_kW` | 测量一致性残差 | kW | DERIVED | residual | 故障期 +4, blind |

**验收数值（core.test.js 必须断言，容差 1e-6，除非注明）**：

> **G0 B02/B04 注记**：能量/SOC 金标准为**解析积分**（事件感知）；若实现用 0.1 s 梯形，仅作敏感性
> 对照且容差放宽；显示按 §5.0 规则。`SOC_true` 末值以 `59.6902777778%`、`SOC_est` 以
> `59.5791666667%`、`SOC_err_pp` 以 `-0.1111111 pp` 为全精度基准。

| 检查 | 期望 |
|---|---|
| 采样 | 601 点，t[600]=60，dt=0.1 |
| 19.9s `I_meas` | 25 A；20.0s `I_meas` | 35 A；`I_true(20.0)` | 25 A |
| 26s `I_true` | `15+10e^-4 = 15.183156388…` A；`I_meas`=25.183156388… |
| 60s `I_true` | 15 + 10e^(-40/1.5) ≈ 15.000000… A |
| `E_bat` 60s 故障 | 0.1238889 kWh（显示 0.12389） |
| `E_gen` 60s 故障 | 0.3761111 kWh（显示 0.37611） |
| `E_load` / `E_load_served` | 0.5 kWh |
| `SOC_true` 末值 故障 | 59.6902778 %（显示 59.69028） |
| `SOC_est` 末值 故障 | 59.5791667 % |
| `SOC_err_pp` | -0.1111111 pp（显示 -0.11111） |
| `max_abs_r_true_kW` | ≤ 1e-6 |
| `max_abs_r_meas_kW` | 4.0 kW |
| 无故障基准 | E_bat=0.1666667, E_gen=0.3333333, SOC_true=59.5833333, SOC_err=0, max r_meas=0 |
| 仅监测 60s | I_true 恒 25；I_meas(30s)=35；SOC_true=59.58333；SOC_est=59.47222；SOC_err=-0.11111 |
| `focal_change` | 故障组 `I_true(60)-I_true(20)` = -10 A |
| 事件快照 | `pre` = `t_s=20.0` 左极限（`I_meas=25`，`derivation:'left_limit'`）；`post` = `t_s=20.0`（`I_meas=35`）；19.9 s 采样行 `I_meas=25`（普通采样，**不是 pre**） |
| 质量检查 | 全部 pass（`conservation-meas` 允许 warn） |
| 哈希 | 同 config 两次运行 configHash 相同；改 magnitude 后不同；原 Run 对象不被改写 |

**扩展场景验收范围（扩展预览；FL-001 `load_step` 已由 G0 暂停，见 §5.1）**：
- **load_step：暂停，不设验收。** 重写条件见 §5.1（母线储能状态 + G2b）。
- actuator_fault（cap 55%）@20s（扩展预览，不作 P0 验收）：`I_true` 降到 ≈13.75 A（过渡 0.4s）；
  `I_ref` 保持 25；发电机补偿到 ≈24.5 kW；`r_meas ≈0`（测量本身一致），但指令-实际偏差明显。

### 5.2 FC-001 燃料电池系统

**拓扑**：`fc_stack` 燃料电池电堆（20 kW 基准）→ `fc_converter` DC/DC → `bus` 400 V；
`battery` 电池缓冲（平衡源，初始 10 kW）→ `bus`；`bus` → `load` 30 kW 恒定；
`valve` 氢气供给阀 → `fc_stack`；`sensor` 电堆电流传感器 → `controller`；
`controller` 功率分配（按测量电流反馈）。

**默认**：`feedback_mode:'closed_loop'`，fault sensor_drift +10 A @20s，FC 参考电流 `I_fc_ref=50 A`
（20 kW），`tau_fc=1.2 s`，电池理想平衡 `P_bat = P_load - P_fc`（`I_bat=P_bat/0.4`），SOC0=60%（40 kWh）。

**方程**：
- 闭环：`tau_fc*dI_fc/dt + I_fc = I_fc_ref - b(t)`；`I_fc_meas = I_fc + b`。
- 仅监测：`I_fc ≡ 50`；`I_meas = 50 + b`。
- `P_fc_true = 0.4*I_fc`；`P_fc_meas = 0.4*I_fc_meas`；`P_bat_true = P_load - P_fc_true`；
  `P_bat_meas = 0.4*I_bat_true`（电池电流传感器健康）；
  `r_true = P_fc_true + P_bat_true - P_load`；`r_meas = P_fc_meas + P_bat_meas - P_load`。
- SOC 估计采用 **EMS 级平衡估算**（model.assumptions 增加 `A-fc-soc-est`，causal 引用）：
  `P_bat_est = P_load - P_fc_meas`（信号 `P_bat_est_kW`，DERIVED，blindVisible），
  `SOC_est` 积分 `P_bat_est`，**不是**电池电流库仑积分。故障期间估算放电偏少 → SOC_est 偏高，
  误差 `+0.11111 pp`（4 kW × 40 s / 40 kWh）。
- `load_step`：t_start 起 `P_load = 30+magnitude`；功率分配器一阶爬坡 `I_fc_ref → (P_load-10)/0.4`
  （`tau_ref=2.5 s`），FC 电流跟随；电池承担瞬态；守恒。
- `actuator_fault`：氢气阀卡涩于 `magnitude%`，`I_fc_cap = 50*magnitude/100`（默认 55% → 27.5 A）；
  `I_fc` 以 `tau=1.5 s` 向 cap 衰减并钳位；`I_fc_ref` 仍 50 A；阀指令 `valve_cmd_pct=100`，
  `valve_meas_pct=magnitude`；电池补足需求。

**信号**（除 §5.1 同构的 `P_bat_*`、`SOC_*`、`r_*`、`P_load_*`、`V_bus_V` 外）：
`I_fc_true_A`(MODEL_STATE), `I_fc_meas_A`(OBSERVATION, blind), `I_fc_ref_A`(CONTROLLER, blind),
`bias_A`(FAULT_EVENT), `P_fc_true_kW`(MODEL_STATE), `P_fc_meas_kW`(OBSERVATION, blind),
`I_bat_true_A`(MODEL_STATE), `I_bat_meas_A`(OBSERVATION, blind),
`P_bat_est_kW`(DERIVED, blind, definition="EMS 平衡估算 P_load − P_fc,meas"),
`valve_cmd_pct`(CONTROLLER, blind), `valve_meas_pct`(OBSERVATION, blind),
`I_fc_cap_A`(FAULT_EVENT)。类别：`current/power/soc/residual/actuator`。

**验收范围**：默认 sensor_drift 60s：`I_fc_true` 50→40 A（tau 1.2）；`P_fc_true` 20→16 kW；
`P_bat_true` 10→14 kW；`E_load=0.5 kWh`；`E_fc+E_bat=0.5`（容差 1e-3）；`r_true≈0`；
`r_meas` 故障期 ≈ +4 kW；SOC_err = **+0.1111111 pp**（正号：估计放电偏少 → 估计 SOC 偏高），
**G0 B12 修正**：`SOC_true_end=59.4755556%`、`SOC_est_end=59.5866667%`
（旧文本 59.47222/59.58333 忽略 τ_fc=1.2 s 过渡尾项，偏 0.00334 pp）；若坚持稳态近似，
必须显式写"稳态近似 ±0.01 pp"并写入 `model.assumptions`。monitor 模式真值不变。

### 5.3 GT-001 燃气涡轮发电系统 — **G0 裁定：当前形态 NO-GO（仅保留为扩展规格草案）**

> **G0-DEC-15 / B12**：本模型当前**不得实现、不得作为验收路径、不得对外展示为"机组动态"**。
> 已知缺陷：①`load_step`"8–20 s 恢复 50 Hz"与独立复算不符（复算 `|Δf|≤0.2 Hz@30.03 s`、
> `≤0.1 Hz@36.56 s`、`nadir −0.4105 Hz@21.07 s`）；②`r_meas` 无公式（功率测量全部健康，无对应残差）；
> ③`r_true=0` 与 `P_rotor` 定义冲突（须 `r_true := P_gen+P_bat−P_load−P_rotor`）；
> ④惯量模型是 f≈f₀ 线性化，未声明；⑤电池"5 kW 基准"却稳态放电 12.2 kW，无限幅。
> 恢复条件：见 `FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md` 的 G2b 清单。在此之前 UI 可保留为
> **扩展预览**（截图/演示），但 README/SCOPE 必须标注"未评审、非验收"。

**拓扑**：`turbine` 燃气涡轮（燃料阀 `valve` 控制）→ `generator` 同步发电机（25 kW 基准）→
`bus` 400 V（AC 整流后等效）；`battery` 电池缓冲（5 kW 基准，40 kWh）→ `bus`；
`bus` → `load` 30 kW；`speed_sensor` 转速传感器 → `governor` 调速器；`controller` 功率管理。

**状态与方程**（降阶模型，明确假设见下）：
- 频率状态 `f`（Hz，初值 50），转子等效惯量 `K_J = 5.0 kW·s/Hz`：
  `df/dt = (P_gen + P_bat - P_load) / K_J`（Euler，`dt=0.01`）。`P_rotor_kW = P_gen + P_bat - P_load`
  （= K_J*df/dt），真实守恒：`P_gen + P_bat - P_load - P_rotor = 0`。
- 电池一次调频（使用本地**健康**电气频率量测）：`P_bat = P_bat_ref - K_bat*(f_meas - 50)`，
  `P_bat_ref=5 kW`，`K_bat=24 kW/Hz`；`P_bat_meas` ≈ 真值（电池通道健康）+ 噪声。
- 调速器：使用**故障转速传感器通道** `n_meas_rpm = 60*(f + b(t))`（b 单位 Hz，+0.3 默认），
  等价 `f_gov = f + b`；指令积分 `dP_gen_cmd/dt = Ki*(50 - f_gov)`，`Ki=2.0 kW/(Hz·s)`，
  钳位 `[0, 40]`（抗积分饱和）；发电机功率一阶跟随 `tau_g=2.0 s` 向 `P_gen_cmd`（精确指数）。
- 电气频率量测 `f_meas_Hz = f`（**健康通道**，OBSERVATION，blindVisible，供 Agent 交叉校验）。
  传感器故障的可检出信号是冗余不一致：`n_meas_rpm/60 - f_meas_Hz = b`。
- `load_step`：`P_load = 30+magnitude` 阶跃；频率跌落后电池一次调频支撑、调速器积分恢复 50 Hz，
  最终 `P_bat→5`、`P_gen→25+magnitude`；记录频率最低点 `f_nadir_Hz` 与恢复时间。
- `actuator_fault`：燃料阀卡涩于 `magnitude%`（默认 50%），`P_gen_cap = 40*magnitude/100 = 20 kW`；
  `P_gen` 被钳位，频率持续偏低，电池长期支撑；`valve_cmd_pct` 继续上升（调速器指令），
  `valve_meas_pct = magnitude`。

**信号**：`f_true_Hz`(MODEL_STATE), `f_meas_Hz`(OBSERVATION, blind, 健康电气频率),
`n_meas_rpm`(OBSERVATION, blind, 偏置转速传感器), `P_gen_true_kW`(MODEL_STATE),
`P_gen_meas_kW`(OBSERVATION, blind), `P_gen_cmd_kW`(CONTROLLER, blind),
`P_bat_true_kW`(MODEL_STATE), `P_bat_meas_kW`(OBSERVATION, blind),
`P_load_demand_kW`(CONFIG, blind), `P_load_served_kW`(MODEL_STATE),
`P_rotor_kW`(MODEL_STATE), `SOC_true_pct`(MODEL_STATE), `SOC_est_pct`(OBSERVATION, blind),
`r_true_kW`(DERIVED, =0), `r_meas_kW`(DERIVED, blind), `valve_cmd_pct`(CONTROLLER, blind),
`valve_meas_pct`(OBSERVATION, blind), `P_gen_cap_kW`(FAULT_EVENT), `V_bus_V`(MODEL_ASSUMPTION, blind)。
类别：`frequency/power/soc/residual/actuator`。

**验收范围（现状记录；G0 未接受，等待 G2b 重写）**：默认 sensor_drift +0.3 Hz @20s：
`f_true ≈ 49.7 Hz`（60 s 时 49.6999，100 s 才近似稳态）、`f_meas_Hz = f`（健康通道）、
`P_gen_true ≈ 17.9 kW`、`P_bat ≈ 12.1 kW`（60 s 值，未完全稳态）；
load_step +10 kW 复算：`nadir −0.4105 Hz @21.07 s`；`|Δf|≤0.2 Hz @30.03 s`、`≤0.1 Hz @36.56 s`、
`≤0.05 Hz @42.95 s`（**旧文本"8–20 s 恢复"不成立**）；最终 `P_gen≈34.8`、`P_bat≈5.2`；
actuator 50%：`P_gen≈20`、频率稳态 ≈49.79、电池约 10 kW（`P_gen_cmd` 可达 40 kW，无执行器抗饱和）。
**G2b 恢复前：全部数值仅作记录，不得写入 golden、不得用于对外结论。**
所有场景无 NaN/Inf，SOC ∈ [0,100]。

---

## 6. Engine / Core API（core-engine 提供）

```js
FL.core = {
  ENGINE_VERSION: '0.1.0',
  simulate(config) -> run,                       // 纯函数、确定性；非法配置抛 Error（带 field）
  createConfig(systemId, overrides = {}) -> config,
  validateConfig(config) -> { ok, errors:[{field,message}], warnings:[] },
  modelManifest(systemId) -> { model_id, model_version, model_hash, assumptions, units,
                               equations, limitations },
  sampleAt(run, signalId, t) -> { value, index, t },
  sampleAll(run, t, {categories, visible}) -> { signalId: value },
  slice(run, signalId, t0, t1, {step}) -> [[t, v], …],
  getMetric(run, metricId) -> metric | null,
  compareRuns(baselineRun, trialRun) -> §4.10,
  canonicalize(obj) -> string,
  hashObject(obj) -> sha256 hex,
  makeRunId(seq) -> 'Run-001',
  findEventAt(run, t) -> event | null,
  clamp,
  fmt: (交给 FL.protocol.fmt，不重复实现)
}
```

`FL.systems`：

```js
FL.systems = {
  list() -> [{ id, experimentCode, title, shortTitle, tagline, level, available, defaultFaultFamily }],
  get(systemId) -> SystemDef,
  defaultConfig(systemId) -> config,
  signalMap(systemId) -> { [id]: signal },
  faults(systemId) -> [faultDef],
  fault(systemId, family) -> faultDef,
  component(systemId, componentId) -> component,
  causalTemplate(systemId, faultFamily) -> template,   // run.causal 已在 engine 生成，页面只渲染
  validateDraft(draft) -> { ok, errors }               // 便捷包装 FL.core.validateConfig
}
```

`FL.core.simulate` 内部生成 `run.causal`（按 faultFamily + feedback_mode + 数值），页面不得拼因果文案。
事件快照（G0 B01）：`pre` 取 `t_s=t_start` 的**左极限**（`derivation:'left_limit'`，b=0），
`post` 取 `t_s=t_start` 的采样值（`derivation:'post_sample'`，b=10）；上一常规采样点
`t_start-0.1` 只作为普通采样行查询，**不叫 pre**。

`rng.js` 提供：`FL.rng.mulberry32(seed) -> ()=>[0,1)`、`FL.rng.gauss(rand)`、`FL.rng.hashSeed(str)`。
噪声只加在 `sourceKind==='OBSERVATION'` 的信号上，且确定性（按 seed + 信号 id + index）。

---

## 7. Store / 全局状态（Lead 提供，页面只读 state，只通过 actions 改）

```js
FL.store = {
  getState() -> state,
  subscribe(fn) -> unsubscribe,
  init(),
  actions: {
    // 导航与实验
    startExperiment(systemId),          // 从首页：建草稿 + 默认 Run（Run-001）+ 跳系统页 + toast
    navigate(pageId),                   // 'home'|'system'|'signals'|'causal'|'compare'|'arena'
    selectComponent(componentId),
    updateDraft(patchOrFn),             // 只改草稿，不碰现有 Run；draftDirty 自动置位
    resetDraft(),
    createRun(opts = {}),               // 用当前草稿创建不可变 Run；返回 {ok, run, error}
    createMonitorContrast(),            // 同配置 feedback_mode='monitor' 的新 Run（role:'contrast'）
    ensureBaseline(),                   // 同配置无故障 Run（role:'baseline'；已存在则返回）
    loadRun(runId),                     // 从 registry 载入为当前 Run
    deleteRun(runId),                   // 不允许删除当前 Run 的基线？允许删除非当前
    // 播放
    setTime(t, { pause = true } = {}),
    play(), pause(), togglePlay(), replay(), setSpeed(s),
    jumpToFault(), stepEvent(dir),      // dir: -1|1
    // 页面局部状态
    setPageState(pageId, patch),        // 浅合并到 state.pageState[pageId]
    // 壳层
    openDrawer(id), closeDrawer(), openModal(id), closeModal(), setIntroStep(n),
    toast(message, tone), dismissToast(id),
    setTruthSealed(bool),               // 盲测封存真值（Arena 用）
    setArenaState(patch),
    restoreLastSession(),
    resetAll()
  }
}
```

State 形状（页面依赖，不得增删字段名）：

```js
{
  booted: true,
  page: 'home',
  systemId: 'FL-001',
  draft: config,
  draftDirty: false,
  draftErrors: [],
  activeRun: run | null,               // 当前实验 Run
  baselineRun: run | null,
  monitorRun: run | null,
  runs: { [runId]: run },              // registry（含 activeRun/baselineRun/contrast/arena）
  currentTime: 0,
  computeState: 'empty'|'draft_valid'|'computing'|'completed'|'failed',
  playback: { status:'stopped'|'playing'|'paused'|'ended', speed:1 },
  selectedComponent: 'current_sensor', // 系统页选中部件
  truthSealed: false,
  mode: 'demo'|'blind',
  pageState: {
    system: { showIntro:false, assumptionsOpen:false, pendingFlash:false },
    signals: { category:'current', visible:{ … }, baselineOverlay:false, viewWindow:null,
               tableMode:false, selectedSignal:null, selectedT:null, zoom:'full' },
    causal: { focusNodeId:null, evidenceOpen:false, monitorOpen:false, residualOpen:false },
    compare: { trialRunId:null, baselineRunId:null, view:'overlay', signalId:null },
    arena: { setup:{ systemId:'FL-001', rounds:6, seed:20261027, noise:false, agentIds:[] },
             match:null, running:false }
  },
  toasts: [{ id, message, tone }],
  drawer: null, modal: null, introStep: 0,
  lastError: null
}
```

`activeRun` 由 `FL.store` 维护；页面渲染 `state.activeRun`。**页面不得直接修改 state 对象**。
通知：每次 action 后 `subscribe` 回调；页面 `update(state, reason)` 的 `reason` 取值
`'boot'|'nav'|'time'|'playback'|'run'|'draft'|'selection'|'view'|'arena'|'toast'|'all'`。
播放推进时 shell 每帧调用 `actions.setTime(t, {pause:false})`，页面需在 `'time'` 更新中保持廉价
（曲线页每帧仅重绘 canvas，不重建 DOM）。

持久化：localStorage key `faultlab.runs.v1`（registry，最多 12 个 Run）、`faultlab.session.v1`
（systemId、draft、activeRunId、baselineRunId、时间、页面）。启动时恢复最近 session（首页显示
「恢复上次实验」入口，规格 §3.2）。

---

## 8. 页面模块接口（Lead 的 shell 调用）

```js
FL.pages.home = {
  id: 'home',
  label: '实验首页',
  navLabel: '首页',
  mount(rootEl, api),      // rootEl 已清空；只调一次（首次导航时）
  update(state, reason),   // 每次状态变化；必须幂等；隐藏页也会被调用（用 state.page 判断）
  unmount()                // 可选
};
```

`api` 对象（Lead 注入，页面不得依赖其它全局）：

```js
api = {
  FL,                       // 全局命名空间便捷引用
  actions: FL.store.actions,
  getState: FL.store.getState,
  el: FL.ui.h,              // hyperscript
  ui: FL.ui,                // components
  chart: FL.chart,          // 图表工厂
  core: FL.core,
  systems: FL.systems,
  protocol: FL.protocol,
  exporter: FL.exporter,
  fmt: FL.protocol.fmt,
  toast: (msg, tone)=>…,
  navigate: pageId=>…,       // = actions.navigate
  subscribe: fn=>…           // 页面内局部刷新用（一般不需要）
}
```

Shell 负责：header（logo/system 切换/模式徽章/run 状态/帮助按钮）、nav、底部时间线、
hash 路由（`#/home`…`#/arena`，支持 `?page=` 覆盖便于截图 QA）、键盘快捷键、全局 toast/drawer/modal 容器、
页面切换时保留 state（不重置 currentTime/run/选中）。**页面不要自建顶部导航或时间线**。

路由：`location.hash` ∈ `#/home #/system #/signals #/causal #/compare #/arena`，默认 `#/home`；
切页写 history.replaceState，刷新可回到同一页。`?system=FC-001` 可指定系统（QA 用）。

---

## 9. 公共组件 API（components.js，Lead 提供）

```js
FL.ui = {
  h(tag, attrs, ...children) -> HTMLElement,   // attrs: class/text/html/dataset/on:{event:fn}/aria-*/style
  frag(...children) -> DocumentFragment,
  clear(el),
  icon(name, {size=16, class}='') -> SVGElement,
  badge(text, {tone='neutral'|'ok'|'warn'|'danger'|'info'}={}) -> Node,
  sourceTag(kind) -> Node,            // 带 source_kind 文字标签
  chip(text, {tone, icon}={}) -> Node,
  stat({label, value, unit, hint, source, tone, big}) -> Node,   // 指标卡
  field({label, hint, error, control, id}) -> Node,
  segmented({options:[{value,label,disabled?,title?}], value, onChange, ariaLabel}) -> Node,
  slider({min,max,step,value,unit,onInput,disabled}) -> Node,     // 返回 {el, setValue}
  switchControl({checked, label, onChange, disabled}) -> Node,
  emptyState({title, desc, action}) -> Node,
  loadingState({text='计算中…'}) -> Node,
  drawer({title, subtitle, content, onClose}) -> {close},
  modal({title, content, actions, onClose, wide}) -> {close},
  toast(message, tone),               // 壳层容器渲染
  focusTrap? (内部实现)
  fmt: FL.protocol.fmt
}
```

图标名集合（至少）：`bolt battery turbine fuelcell sensor controller bus load play pause replay
skipback skipforward chevron-down chevron-right arrow-right download copy info warning check x
flask target eye eye-off lock chart table grid home wave pulse link external help spark monitor
gauge clock shield swap diff refresh trash plus minus`.
图标用内联 SVG（`viewBox="0 0 24 24"`, stroke=`currentColor`, fill=none, stroke-width 1.6）。

---

## 10. 图表 API（chart.js，chart-signals 提供）

```js
const chart = FL.chart.create(canvasEl, {
  height: 320,                       // 逻辑高度（CSS px），canvas 自适应容器宽度
  xDomain: [0, 60],
  yDomain: null,                     // null = 自动 nice
  yDomainRight: null,
  paddings: { l: 56, r: 18, t: 18, b: 30 },
  onHover: ({ t, values, x, y }) => {},   // 鼠标移动时最近采样
  onClick: ({ t }) => {},
  onCursorDrag: (t) => {},           // 拖动游标（页面暂停播放后 setTime）
  ariaLabel: '…'
});
chart.setSeries([ { id, label, unit, axis:'left'|'right', color:'#c8f45a'|CSS var,
                    style:'solid'|'dashed'|'dashdot'|'dotted', width, opacity,
                    step:false, points:[[t,v],…] } ]);
chart.setEvents([{ t:20, label:'故障 20.0 s', color, style:'fault' }]);
chart.setCursor(t);
chart.setSelectedPoint(t);
chart.setDomain({ x:[t0,t1], y:[lo,hi], yRight:[lo,hi] });   // 传 null 恢复自动
chart.setTheme({ … })；chart.resize(); chart.render(); chart.destroy();
```

要求：devicePixelRatio 适配；多层绘制（网格→事件→序列→游标→点）；空数据友好；
`prefers-reduced-motion` 不做滚动动画；y 轴自动 nice ticks；双轴颜色用中性文字；
tooltip 由页面用 DOM 实现（chart 只回调）；不引入任何第三方库。
**不得在 chart.js 里发网络请求、不得依赖 store。**

---

## 11. Agent Arena（arena-agents 提供）— **P2 扩展预览（G0 裁决，非 V0.1 验收路径）**

> **G0-DEC-14/15**：Arena 不属于 V0.1 P0 验收路径；本实现的 `truthSealed` 为 UI 开关，
> **不是安全边界**（用户可经 DevTools/重算绕过）。契约级真值隔离以
> `FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md` 的 `exposure` 与 `project('blind')` 为准。
> UI/文档必须标注"扩展预览 · 合成场景 · 非真实诊断性能"；评分/排行榜不得表述为诊断能力认证。
> 本节保留为实现参考；若与 `DATA_CONTRACT_SPEC.md` 冲突，以规格文档为准。

### 11.1 盲测流程

1. 用户选系统 + 轮数（默认 6）+ seed + 是否加观测噪声 + 参与 Agent。
2. 每轮由 arena 用 seeded RNG 生成**隐藏场景**：随机故障家族（含 20% 概率无故障健康局）、
   幅值/时刻在 catalog 范围内、feedback_mode 随机（closed_loop / monitor，注意 monitor 下
   传感器故障的可检测性来自 `r_meas` 而非真值变化）、噪声可选。
3. 调用 `FL.core.simulate(config)` 得 Run；从 Run 中抽取**盲观测流**（只取
   `blindVisible===true` 的信号，按 0.1 s 顺序回放给 Agent），**绝不传 `run.truth`、`bias_A`、
   `*_true_*`、`I_*_cap`、`fault config`**。
4. Agent 在线 `observe(sample)`，可随时 `diagnose()`；比赛在 t=60 后统一收卷。
5. 收卷后先评分，再"揭晓真值"；UI 展示每个 Agent 的诊断 vs 真值、逐项得分、排行榜。
6. 比赛进行中 `state.truthSealed=true`、`state.mode='blind'`，shell 会禁用因果/对比/曲线页入口
   （避免看真值），比赛结束自动解封。

### 11.2 Agent 接口（内置与外部统一）

```js
FL.agents.defineBuiltin({
  id:'residual', name:'残差检验', family:'model-based',
  description:'…', strengths:'…', weaknesses:'…',
  create(meta) -> agent
});
// meta = { systemId, duration_s, dt_s, observables:[{id,label,unit}],
//          components:[{id,label}], faultFamilies:[{id,label}] }   // 无真值
agent = {
  reset(),
  observe(sample, meta),    // sample = { t, s:{ signalId:value, … } }  仅 blindVisible 信号
  diagnose() -> {
    faultDetected: true|false,
    faultType: 'sensor_drift'|'load_step'|'actuator_fault'|'none',
    component: componentId|'none',
    magnitude: { value:number, unit:string } | null,
    detectTime_s: number|null,     // 首次报警时刻
    confidence: 0..1,              // 对"是否故障"的置信度
    explanation: '一句中文解释（可引用观测依据，不得引用真值）'
  }
};
```

内置 Agent 至少 5 个（确定性，禁止随机）：
`sensor-limit` 阈值越限、`residual` 模型残差、`cusum` 累积和变点、`bayes` 特征贝叶斯、
`fusion` 多信号融合。实现建议在 `builtin-agents.js` 内共享特征提取（步长、残差、指令跟随差、
频率偏差、负荷阶跃等）。验收：默认 seed 下 fusion 综合分明显高于 sensor-limit；
健康局不得全员误报（≤1 个 Agent 误报）。

### 11.3 评分（100 分制，逐轮；详细分解必须展示）

```
detection     0.20  故障局: 正确报警=1；健康局: 未报警=1
family        0.25  家族正确=1（健康局按未报警计）
component     0.10  受影响部件正确=1（健康局按未报警计）
magnitude     0.15  max(0, 1 - |估计-真值|/真值)（健康局按未报警计；缺 magnitude=0）
latency       0.15  max(0, 1 - (detectTime_s - fault_t)/12)（健康局: 未报警=1）
calibration   0.15  1 - Brier(confidence, 是否故障)   // Brier = (conf - truth)^2
总计 = 100 * Σ(权重*得分) - 10 * falseAlarm（健康局误报每次扣 10，单轮最低 0）
```

`diagnose()` 在 t=60 调用一次收卷；`detectTime_s` 必须是 Agent 首次报警的采样时刻（可 null）。
一轮最多 100 分，排行榜聚合：平均分、检出率、平均延迟、误报率、家族准确率。

### 11.4 外部 Agent 协议（文档 + 导入/导出）

`docs/AGENT_PROTOCOL.md` 定义 JSON bundle：
- 导出 `盲测数据包`：`{ arena_version, match:{systemId, seed, rounds}, round:{index, dt_s,
  duration_s, observables:[{id,label,unit}], samples:[[t, v1, …], …]}, scoring_spec, truth_sealed:true }`
- 导入 `诊断结果`：`{ round:1, agent:{name}, diagnosis:{…} }`（可单轮或多轮数组）。
- UI「导入外部诊断」→ 校验 → 作为虚拟 Agent 加入本轮评分（标记 `外部导入`）。
- 不得在导出包中出现任何 `truth`/`*_true_*`/`bias`/fault 配置字段（QA 会检查）。

### 11.5 Arena API（页面调用）

```js
FL.arena = {
  listAgents() -> [{id,name,family,description,strengths,weaknesses}],
  createMatch(setup) -> match,               // 同步算完所有轮，纯函数
  // setup = { systemId, rounds, seed, noise, agentIds }
  // match = { id, systemId, setup, rounds:[{
  //   index, configHash, run, observables:[…], samples:[[t,…]],
  //   truth:{faultFamily,component,magnitude,t_fault,detectedAt,none},
  //   results:[{agentId, diagnosis, score:{total,detection,family,component,magnitude,latency,
  //             calibration,falseAlarm,raw}}] }],
  //   leaderboard:[{agentId,name,avgScore,detectionRate,avgLatency,falseAlarmRate,familyAcc}],
  //   startedAt, durationMs }
  scoreExternalDiagnosis(match, roundIndex, diagnosis) -> result,  // 返回 score 对象
  exportRoundBundle(match, roundIndex) -> object,
  exportMatchBundle(match) -> object,
  parseExternalBundle(json) -> {ok, errors, data}
}
```

`createMatch` 必须可被 UI 分阶段展示（页面可先 `requestAnimationFrame` 分批执行或直接同步后
用动画播放进度；为简单，`createMatch` 同步 + 页面显示"计算中"遮罩即可，不要卡死 >2s）。

---

## 12. 导出（export.js，Lead 提供）

```js
FL.exporter = {
  csv(run) -> string,                       // 首部 # 元数据，然后表头+601 行，全精度
  configManifest(run) -> object,            // run_manifest + config + model + quality + hashes
  htmlReport({baseline, trial, comparison, system, generatedAt}) -> string,  // 自包含 HTML
  summaryText({baseline, trial, comparison}) -> string,
  evidenceBundle({baseline, trial, comparison}) -> object,   // 含数据哈希、质量检查、不可信标注
  blindRoundBundle(match, roundIndex) -> object,             // 委托 FL.arena
  download(filename, text, mime),           // 触发浏览器下载（CSV/JSON/HTML）
  copyText(text) -> Promise<boolean>
}
```

CSS 下载按钮必须有 hover/focus/disabled 状态；`validation_failed` 时证据包/报告带"未通过验证"标签，
不生成"验证通过"字样（规格 §7.2）。

---

## 13. 验收口径（页面 owner 自检 + Lead 终检）

> **G0 注记（2026-10-27）**：本节是**原型级**验收口径（历史实现自检），不是 G2 科学验收。
> G2 的正式验收以 `FaultLab-evaluation/NEXT/MODEL_VALIDATION_SPEC.md` 的 PHY/SA 矩阵与
> `DATA_CONTRACT_SPEC.md` 的字段校验为准；`docs/SCOPE.md` 的"全部实现 ✅"为原型自评，
> 不作为通过依据。**任何"验证通过"字样只能表示内部一致性检查，不能表示模型/硬件验证。**

规格 §11 UX-01..UX-12 全部通过（Lead 用 headless Chrome 自动化 + 截图）。页面级最低要求：

**首页 lab-pages**：三系统卡片可进入；FL-001 参数摘要（20s/+10A/60s/400V/演示）；三个问题；
模型假设抽屉；3 步快速讲解浮层（可跳过）；开始实验→系统页 0s；恢复上次实验（有记录时）；
指标标"预设值"；信任标签"离线 / L0 行为级 / 演示数据"。

**系统页 lab-pages**：SVG 拓扑（不同连线类型实线/虚线/故障专属图形）；点击部件选中并刷新检查器；
检查器字段带 source_kind；故障编排（3 家族切换、幅值/时刻控件、边界校验、运行中锁定、
dirty 提示"改动须创建新运行"）；应用并创建运行；重播/暂停/跳到 20s；"查看对应曲线"自动勾选
当前部件信号并保留时刻；"解释异常来源"进入因果页聚焦；选中不同对象字段符合规格 §4.3；
伪造物理效果（母线尖峰/转速跌落等未建模量）一律不展示。

**曲线页 chart-signals**：分类标签（每系统）；信号显隐（至少留一个）；全部播放控件 + 跳转 20s；
真实/测量/目标/偏置线型符合 §3.3；事件竖线 + 游标 + 当前值快照面板（值/单位/来源/计算说明）；
缩放窗口（全时段/故障前后±5s/自定义）；基准叠加；点击数据点显示元数据；导出 CSV；
恢复默认；`no_run`/`computing`/`ready` 状态；SOC 纵轴放大需明确量程与"0.111 pp"级差异（不夸大）；
表格模式（a11y）；跨 20s 阶跃绘制不平滑。

**因果页 causal-compare**：六节点链（FL-001 默认场景）；节点点击高亮上下游 + 右侧解释；
三层（配置事实/模型机制/数值观测）分开呈现；「显示证据」给出 run_id+variable+time_window 并可跳转曲线页
锁定窗口；「查看模型假设」；「仅监测 vs 闭环」对照（无 monitor Run 时给创建入口）；
「为什么显示 +4kW」展开真实/测量平衡公式与逐项数值（当前时刻）；替代解释/局限；
无模型支撑时显示「本模型无法推导该现象」。

**对比页 causal-compare**：基准/试验 Run 选择；一致性检查三项（模型/参数/时钟）+ 黄色警告与限制表述；
指标卡（规格 §7.3 六类 + focal_change）；视图：叠加/双屏/差值（单位不兼容禁用差值）；
事件分叉线 20s；重要发现①②③ + 局限；下载 CSV / 配置清单 / HTML 报告 / 复制摘要 / 证据包；
缺失数据「不可用」不填 0；对比需要 baseline 时给「创建基准运行」入口。

**竞技场 arena-agents**：设置（系统/轮数/seed/噪声/Agent 多选）；"开始盲测"→进度→逐轮揭晓；
排行榜；逐轮诊断 vs 真值；评分分解；封存真值提示；导出盲测数据包（无真值泄漏）；导入外部诊断；
说明"内置确定性诊断算法，非 LLM"；封存期间禁入真值页；移动端可用。

---

## 14. 构建 / 运行 / 测试

```powershell
# 开发预览（Lead 常驻，端口 4318）
python tools/serve.py
# → http://127.0.0.1:4318/

# 单文件交付（把 index.html 引用的 CSS/JS 全部内联）
python tools/build.py     # → FaultLab.html（双击可用）

# 核心数值测试（Node，无需浏览器）
node tests/core.test.js

# 语法检查
node --check <file>.js
```

### 15.3 截图自测（teammates 必做）

```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
& $chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1440,960 --virtual-time-budget=4000 `
  --screenshot="$env:TEMP\fl-system.png" "http://127.0.0.1:4318/#/system"
```
截图后用 `read_image` 自查：无破版、无重叠、无默认字体回退、颜色/线型语义正确、中文不断行。
移动端再截 `--window-size=390,844`。发现的问题自己修，不要留给 Lead。

---

## 15. 协作与交付格式

**Teammate 完成时给 Lead 的消息必须包含**：
1. 改动文件清单（路径）；
2. 与契约的偏差（若有，必须说明为什么、影响谁）；
3. 自测：`node --check` 结果、截图路径与观察、数值断言结果（core）、控制台错误；
4. 已知风险 / 未完成项；
5. shared task → complete。

**禁止**：改别人文件、改 index.html、改 theme.css 令牌、引入依赖、联网、占端口、
在页面里自造真值/观测不分的文案、把 +4 kW 观测残差说成实际能量损失、展示未建模物理量。

---

## 附录 G0 对齐记录（2026-10-27）

> 依据：`FaultLab-evaluation/DECISIONS/DECISIONS.md`（用户 2026-10-27T20:35 指令批准）与
> `FaultLab-evaluation/REVIEWS/REVIEW_DIFF.md` 的 B01–B15。
> 本附录只记录**文档对齐**；产品代码是否已同步不在本文件声明范围内（以实际测试结果为准）。

| # | 位置 | 修改内容 | 依据 | 状态 |
|---|---|---|---|---|
| 1 | 文件头 | 新增「G0 裁决基线」：权威顺序、P0=FL-001 三 Run、扩展=P1/P2、强制偏离清单 | D-01..D-08 / G0-DEC-01/14 | 已完成 |
| 2 | §1 产品范围 | 拆为「P0 基线（FL-001 五页 + 三 Run + 导出/重载）」与「扩展预览（FC/GT/三类故障族/Arena）」；Arena 标 P2；GT 标 NO-GO | B11 / G0-DEC-01/14/15 | 已完成 |
| 3 | §4.6 snapshots | `pre` 由 `t_s=19.9` 改为 `t_s=20.0 + derivation:'left_limit'`；`post` 为 `post_sample` | B01 | 已完成 |
| 4 | §5 新增 §5.0 | 冻结积分规则（解析优先）、显示舍入、事件编码、SOC 公式 ×100 | B02/B04 | 已完成 |
| 5 | §5.1 标题 | "逐位一致" → "1e-6 容差内一致"（浮点不可能逐位一致） | W-09 / B02 | 已完成 |
| 6 | §5.1 SOC 公式 | 补 ×100：`SOC% = 60 − 100·(1/40)·∫P dt/3600` | B04 | 已完成 |
| 7 | §5.1 `load_step` | 标记**暂停实现**，写明矛盾证据与恢复条件（母线储能或删除滞后，走 G2b） | B12 | 已完成 |
| 8 | §5.1 验收表 | 新增积分/舍入注记；事件快照行改为 pre=20.0 左极限、19.9 为普通采样 | B01/B02 | 已完成 |
| 9 | §5.2 FC-001 | SOC 末值修正为 `59.4755556% / 59.5866667%`（或声明稳态近似 ±0.01 pp） | B12 | 已完成 |
| 10 | §5.3 GT-001 | 新增 **NO-GO** 横幅与 5 项已知缺陷；验收段改为记录性文字并注明"不得写入 golden/对外结论" | B12 / G0-DEC-15 | 已完成 |
| 11 | §6 | `pre` 快照规则改为左极限（同 #3） | B01 | 已完成 |
| 12 | §11 Agent Arena | 标 P2 扩展预览；声明 `truthSealed` 非安全边界；契约级隔离指向 DATA_CONTRACT_SPEC | B08 / G0-DEC-11/14 | 已完成 |
| 13 | §13 验收口径 | 标明本节为原型级验收，G2 以 MODEL_VALIDATION_SPEC / DATA_CONTRACT_SPEC 为准 | B14 / G0-DEC-16 | 已完成 |
| 14 | §14 构建/运行/测试 | 保持不变（零构建路线与 G0-DEC-03 一致）；单文件构建为 P1 交付能力 | G0-DEC-03 | 无需修改 |

**未在本文件展开、由规格文档承接的内容**：
- 数据对象/字段/哈希/导入/投影 → `FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md`
- 金标准/PHY/SA/oracle → `FaultLab-evaluation/NEXT/MODEL_VALIDATION_SPEC.md`
- 文案/因果护栏/禁止词 → `FaultLab-evaluation/NEXT/UI_COPY_GUARDRAILS.md`
- P0a/P0b/P1/P2 任务与 DoD → `FaultLab-evaluation/NEXT/BACKLOG_APPROVED.md`
- FC/GT/Arena/load_step 处置 → `FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md`

> 对齐时快照：`docs/CONTRACT.md` 由 54,666 字节 / 1,048 行 增至本版本；基线哈希见
> `FaultLab-evaluation/DECISIONS/DECISIONS.md` 与 `SPEC_v0.2_APPROVED.md`。
