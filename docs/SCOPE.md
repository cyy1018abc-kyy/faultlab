# 范围映射与裁定记录（SCOPE）

> 本文件记录 FaultLab V0.1 实现相对产品规格（`FaultLab_V0.1_页面原型与交互规格.md`）的范围映射、
> 主动偏差与扩展边界，便于验收时区分「规格 P0」「规格 P1」「用户扩展」「不做」。

## 1. 规格要求 → 实现状态

### 1.1 V0.1 规格 §12 P0（全部实现）

| 规格条目 | 实现位置 | 状态 |
|---|---|---|
| 完整五页面（首页/系统/曲线/因果/对比） | `src/ui/pages/*`，shell hash 路由 | ✅ |
| FL-001 默认闭环模式、20 s +10 A 偏置 | `src/core/systems.js` + `src/core/engine.js` | ✅ 解析值逐位一致 |
| 基础控制与真值分离 | 信号元数据 `sourceKind` + 全站来源标签 | ✅ |
| 实时曲线（真/测/派生、事件、游标、缩放） | `src/ui/chart.js` + `pages/signals.js` | ✅ |
| 基准对照（无故障 vs 故障） | `ensureBaseline` + `pages/compare.js` + `FL.core.compareRuns` | ✅ |
| 确定性因果解释 | `run.causal` 由引擎生成，页面只渲染 | ✅ 六节点 + 三层标签 |
| CSV / 配置导出 | `src/ui/export.js` | ✅ |
| 校验提示与异常态 | `run.quality` + UI notice/empty/loading/failed | ✅ |
| 响应式桌面体验 | theme.css 断点 1200/768 | ✅ |

### 1.2 规格 P1（本实现已覆盖）

- 仅监测模式对照：`createMonitorContrast`、因果页与对比页均可用。
- 可选择幅值与故障时刻：三系统故障编排面板，带 bounds 校验。
- 差值曲线、完整 HTML 报告、多维数据源检查器、无障碍（键盘、表格模式、焦点管理、reduced-motion）。

### 1.3 规格 P2 / 明确不做

- 其它故障/系统模型 → **用户明确要求扩展**，以 FC-001 / GT-001 及三类故障家族实现（标注为扩展）。
- Simulink/FMU 可插拔后端、盲诊断（作为独立 Arena 扩展实现，非规格内）、Agent Arena、开放 Benchmarks、
  云端账户与分享 → Arena 以独立扩展页交付；其余不做。
- 3D 数字孪生、实时真实设备连接、多用户排行榜、任意 `.slx` 上传运行、LLM 自动诊断 → 不做。

## 2. 主动偏差记录（已在 UI/README 标注）

| # | 偏差 | 原因 | 影响 |
|---|---|---|---|
| D-1 | 首页「开始实验」会**立即按默认配置创建 Run**（规格 §8.1 表为“新建草稿，无结果”） | 演示优先：一进入系统页就能看到 20 s 事件与能量流；系统页仍保留「应用并创建运行」 | UX-01 仍满足（进入系统页、配置正确、0 s）；状态机语义不变，只是默认动作串在一起 |
| D-2 | 失败/计算中没有独立的阻塞式 `computing` 页面动画（模型计算毫秒级） | 同步计算即可完成，避免假加载 | 页面保留 `no_run/failed` 态；真实失败会显示错误并禁用导出 |
| D-3 | Agent Arena 作为第六页（扩展） | 用户明确要求“不同 AI Agent 参加故障诊断比赛” | 不属于 FL-001 基准验收路径；竞技场运行期间禁用真值页 |
| D-4 | 三系统扩展模型（FC/GT）为 L0 降阶模型，其中 GT 频率动态使用显式标注的等效惯量代理 | 支撑用户“燃料电池/涡轮发电”探索需求，同时不伪造未建模物理 | 所有扩展假设写入 `model.manifest.assumptions` 并在 UI 展示 |
| D-5 | 事件快照 `pre` 取 `t_start − 0.1 s` 采样、`post` 取 `t_start`（规格 V0.2 评审 R-01 指出 20− 是左极限，不应等同于 19.9 s 采样） | 规格 §4.2/§5.2 要求「20− / 20+ 快照」；同时保留左极限 vs 采样点的区分说明 | UI 快照标注为“事件前最后采样（19.9 s）/ 事件后立即（20.0 s）”，图形用阶跃 |

## 3. 用户扩展的实现边界

- **三系统共用**：五页面、同一 store/时间线/数据协议/导出；内容由 `SystemDef` 驱动，非写死。
- **三类故障家族**：每系统各 3 个场景，均支持闭环 / 仅监测；故障目录含幅值与时刻 bounds。
- **Agent Arena**：
  - 真值隔离：Agent 只拿 `blindVisible` 观测通道；导出包递归断言无真值字段；
  - 内置 5 个确定性 Agent；评分 100 分制、逐项分解；健康局防“总是报警”退化；
  - 外部 AI Agent 通过 JSON「盲测数据包 → 诊断结果」协议接入，不依赖网络。
- **可追溯性**：所有扩展运行仍走同一 Run 协议（不可变、configHash/modelHash、事件快照、质量检查），
  可与 FL-001 基准并列导出。

## 4. 验收命令

```powershell
node tests/core.test.js      # FL-001 精确数值表、monitor、扩展场景、FC/GT 范围、守恒、哈希
node tests/arena.test.js     # 盲测隔离、确定性、评分区分度、外部 bundle
node tools/qa.mjs ux         # UX-01..UX-12 浏览器端验收
python tools/oracle.py       # 独立 Python 解析黄金样例（交叉校核）
```

## 5. 未验证/待确认

- 视觉走查与移动端适配以 Chrome/Edge 为准（Windows 字体栈：Bahnschrift / Cascadia Mono / 微软雅黑）。
- 浏览器端 localStorage 存档上限约 5 MB；超出时自动裁剪历史 Run（保留当前与基准）。
- 外部 Agent 协议为 V0.1 草案，版本号 `arena_version: "0.1"`。
