# RFC_MODEL_INTERFACE_I11_APPROVED — 可插拔 Plant / Sensor / Controller / Fault 模型接口（P1，已批准）

> **状态**：`APPROVED（CHG-20261030-07，2026-10-30，V0.3 主线还原生效）`。
> **实现**：S1 `src/core/plants/fl001.js`、S2 `src/core/plants/fc001.js` 已落 V0.3 主线；
> 派发边界与逐位一致性验收见 **§9 移植附录**。S3（GT-001）未排期（G2b 已闭，V3-31/V3-33 待开工）。
> **原始编制**：2026-10-28（并行备份分支 `backup/local-parallel-p1-20261028`；原批准 CHG-20261028-01/02）。
> 2026-10-30 工作区被重置到 `origin/main` 后，实现经用户指令还原移植回 V0.3 主线；本文件为还原归档版。
> **作者**：实施 Agent（依据升级预案 I-11 / M03）· **对应 Backlog**：P1 新 RFC（需 CHG）·
> **门禁**：G3/G4 完成后 + 用户批准（均已满足）。
> **对标来源**：PyBaMM（Model/ParameterValues/Experiment/Solver 分离）、python-microgrid
> （BaseMicrogridModule 的 step/reset 与动作/观测边界）；仅借鉴接口思想，不引入代码/依赖（ADR-008）。

---

## 0. 本 RFC 不做什么（边界声明，先于设计；批准后仍作为持续边界执行）

1. **不改生产内核语义**：`src/core/engine.js` 的 `simulateFL001/FC001/GT001` 仅新增"委托适配器"分派，
   数值表达式与内联路径逐字一致；指标、检查、契约层不动。
2. **不改变 FL-001 P0 数值**：任何接口化重构完成后，FL-001 三固定 Run 对
   `data/golden/fl001_v1.json` 的逐点一致性（rtol 1e-12 层）必须保持；
   `run_hash` 对相同 config **要求逐位不变**（§6.1 裁决）。
3. **不引入运行时依赖**：零 Python 后端、零 npm 依赖（ADR-001）；接口仅为 JS 纯函数约定（经典脚本）。
4. **不扩大 P0**：FC-001/GT-001 不因本 RFC 进入验收；GT-001 维持扩展预览（V3-31/V3-33 待开工）。
5. **不做事件语义/契约变更**：EventSnapshot、EvidenceBundle、project()、错误码表均不在本 RFC 范围。

## 1. 动机与问题陈述

现状 `engine.js` 将三件事耦合在一个 IIFE 内：
(a) 模型方程（EQ-1…EQ-6 闭式解）、(b) 数值实现（子步积分 foStep）、(c) 实验编排
（事件注入、series 组装、指标/检查调用）。后果：

- 新增一个系统需要复制 150 行左右的仿真骨架（FC/GT 与 FL 大量重复）；
- 方程、求解口径（analytic_flux / substep）、故障注入语义彼此不可独立替换与测试；
- P1 需要的"同一 Plant + 不同 Sensor/Controller 组合"（如 FC-001 换估算器）只能靠复制分支。

## 2. 接口定义

### 2.1 设计提案（原始接口，保留作设计意图；TS 记法表达 JS 纯函数约定）

```ts
/* ---- 值对象（与 DATA_CONTRACT_SPEC 现有对象对齐，不新造公共字段） ---- */
type TimeGrid   = { t: number[]; dt_s: number; n: number; i_f: number | null };
type SignalDef  = { id: string; unit: string; sourceKind: SourceKind; exposure: Exposure;
                    precision: number; category: string; /* 其余沿用 systems.js */ };

/* ---- Plant：只负责真实物理状态方程（EQ 层），不知道 Sensor/Fault ---- */
interface Plant {
  readonly modelId: string; readonly modelVersion: string;
  signals(): SignalDef[];                       // 真值 + 观测通道声明（供 SignalCatalog）
  steadyState(config: ScenarioConfig): Record<SignalId, number>;          // t=0 状态
  step(state: State, u: Input, dtSub: number): { state: State; flux: FluxIntegral };
  // ^ 数值路径用；解析路径改为 closedForm(time, config)（二选一必须声明 method_id）
  closedForm?(time: number, config: ScenarioConfig): Record<SignalId, number> | null;
  integrationMethod(): 'analytic_flux' | 'substep' | 'trapezoid';
}

/* ---- Sensor：测量通道定义（EQ-2 层），可注入偏置/噪声/漂移 ---- */
interface Sensor {
  readonly sensorId: string;
  measure(trueValue: Record<SignalId, number>, faultState: FaultState): Record<SignalId, number>;
}

/* ---- Controller：把测量调节到目标（EQ-3 反馈层）；monitor 模式 = IdentityController ---- */
interface Controller {
  readonly mode: 'closed_loop' | 'monitor';
  target(reference: number, measured: Record<SignalId, number>): number;
}

/* ---- Fault：故障注入语义（EQ-1 层），独立于 Plant 方程 ---- */
interface FaultModel {
  readonly family: 'none' | 'sensor_drift' | 'load_step' | 'actuator_fault';
  activeAt(t: number, config: ScenarioConfig): boolean;      // 左/右极限语义由事件层统一裁决
  bias(state: State): number;                                // sensor_drift: b(t)
  /* load_step / actuator 属 P1 扩展家族，接口保留、实现暂缓（M03 暂缓边界） */
}

/* ---- 编排器（engine 的未来形态；P0 期间不替换） ---- */
interface ModelEngine {
  simulate(config: ScenarioConfig): Run;   // 签名与现状一致；Run 结构不变
}
```

**设计要点**：

- **事件左右极限归事件层**（ADR-002），FaultModel 只提供 `bias(t)`，pre/post 编码不做各家族自定义；
- **积分口径显式化**：Plant 声明 `integrationMethod`，metrics 的 `method_id` 从 Plant 读取，
  杜绝"扩展预览冒充解析 golden"（T-17）；
- **monitor = IdentityController**：`仅监测`从 if 分支变成控制器替换，与 D-04 对比白名单直接对应；
- **配置规范化/校验（validateConfig）留在 engine 层**，Plant 只接收合法 config（单一职责）。

### 2.2 V0.3 主线实现形态（还原落地，CHG-20261030-07）

实现以**工厂 + 纯函数对象**的轻量形态落地（不引入 class/TS 运行时），仍满足 §2.1 的职责分离：

| 工厂 | 文件 | 返回对象（关键字段） | 适用家族 |
|---|---|---|---|
| `FL.core.plants.createFl001Plant(cfg)` | `src/core/plants/fl001.js` | `method` / `modelRoles` / `faulted` / `monitor` / `tStart` / `V` / `TAU` / `load0` / `soc0` / `I_ref` / `bAt` / `targetAt` / `stepOf` / `iMeasAt` | FL-001 `none` / `sensor_drift` |
| `FL.core.plants.createFc001Plant(cfg)` | `src/core/plants/fc001.js` | 同上 + `P_BAT_REF` / `I_fc_ref` / `loopBiasAt` | FC-001 `none` / `sensor_drift` |

- **Plant**：只承载真实状态方程（EQ-3 一阶行为级，数值子步精确离散）与子步积分通量（`stepOf` 返回
  `{ y, integral }`，与 `engine.foStep` 逐字同序）；
- **Controller**：`monitor` 语义由 Controller 裁决——FL 由 `targetAt` 返回"进入回路的偏置"视图
  （monitor 恒 `I_ref`），FC 由 `loopBiasAt` 显式给出回路偏置（monitor 恒 0）；
- **Sensor**：测量链路 `bAt` / `iMeasAt` 独立于回路视图（EQ-1/EQ-2：monitor 下测量通道仍计 b）；
- **Fault**：只提供 `bAt(t)` 与家族标记；事件左/右极限（ADR-002）仍归事件层，适配器不含事件编码。
- **派发边界（§3 S2 验收边界）**：见 §9.3；未评审/暂缓家族保留 engine 内联数值路径，不同实现并存时
  以 `method` 与家族门显式区分，不存在双实现漂移（plant 家族全量走适配器）。

## 3. 迁移路径（三步）与执行状态

| 步 | 内容 | 验收 | 风险 | 状态（2026-10-30） |
|---|---|---|---|---|
| S1 | FL-001 解析路径抽取为 `PlantFl001` 适配器（树外原型 → src/core/plants/），engine 内部改为组合调用，**输出逐位不变** | `tests/engine.test.js` 全点 golden 比对不变 + `run_hash` 不变（§6.1） | 低 | **已实施**（并行线 2026-10-28；V0.3 还原 2026-10-30） |
| S2 | FC-001 接入同一接口（依赖 I-12 FC golden 批准）；load_step/actuator 作为暂缓家族保留旧数值路径 | FC 交叉检验 + 现有 FC 测试不变 | 中 | **已实施**（同上） |
| S3 | GT-001（须先解除 NO-GO，G2b）；删除 engine 内联分支 | GT 独立 G2b 证据 | 高 | **未排期**（G2b 规格 v1.1 已批准；V3-31 oracle/golden、V3-33 实现待开工） |

## 4. 兼容性契约（DoD 硬条件）

| # | 条件 | 还原后实测（2026-10-30，§9.5） |
|---|---|---|
| 1 | FL-001 逐点回归：S1 前后三固定 Run × 601 点 × 12 序列与 golden 比对结果逐项相同 | `engine.test.js` 全点 golden 比对通过；12 配置 `run_hash` 逐位一致 |
| 2 | Run/契约结构零变更：`Run` 字段、EvidenceBundle、project()、错误码、UI 五视图不受影响 | 未触碰 schema/registry/bundle/错误码；`run_hash` 不变（内容寻址面零变更） |
| 3 | 零运行时依赖：`node tests/core.test.js` 的静态扫描（无 fetch/document/TypedArray/ESM）继续通过 | 通过（plants 为经典脚本） |
| 4 | 性能不回归：simulate 单次耗时不劣于现状 2 倍 | 未做正式微基准；委托为常数级工厂开销（同数量级），测试/E2E 时长无异常（遗留项，见 §9.8） |
| 5 | scope 守卫不变：`scopeTagOf` 白名单语义保持，接口化不得放松 T-17 | 零改动；`scope-guard.test.js` 通过 |

## 5. 被拒绝的备选方案

| 备选 | 拒绝理由 |
|---|---|
| 引入 Python 后端统一模型层 | 违反 ADR-001（纯浏览器离线）；PyBaMM 仅作独立研究期对照 |
| 把 FC/GT 也改解析闭式并纳入 P0 | FC 需 G2b-lite + golden 批准（I-12）；GT NO-GO（G0-DEC-15 → 现为规格批准、实现待开工） |
| 直接重构 engine.js 而不出 RFC | 违反 G0-DEC-17 CHG 流程；P0 已冻结数值，回归风险不可控 |

## 6. 开放问题与裁决

1. **run_hash 稳定性**：S1 重构后 `runHashPayload` 内容若因内部表示微差（-0/0、键序）变化，
   是否允许升 `engine_version` 并保持 golden 兼容？——**裁决：要求逐位不变**；还原后 12 配置快照
   `run_hash` / `signals_sha256` / `metrics_sha256` 全部一致（`engine_version` 维持 0.1.0）。
2. `Plant.closedForm` 与 `step` 并存时 `method_id` 仲裁——**裁决（实现形态）**：V0.3 主线仅落地
   `stepOf`（数值子步）路径，Plant 对象声明 `method='substep'`；解析 golden 口径保留在校验层
   （`verify_golden`），不做双实现并存。
3. `FaultModel` 是否需要支持 P1 负偏置的因果模板重写钩子（MODEL_VALIDATION §8.2）——**未实现**，
   维持后续 P1 议题（当前因果解释仍按版本化规则在 checks 层裁决）。

## 7. 原型证据（并行线，未随还原迁入）

- 原树外原型 `tools/rfc/i11_adapter_prototype.js`（并行备份分支，tip 373859f）以提议接口包装现有
  FL-001 实现；与生产输出做 601 点逐位比对：**5 信号 × 3 Run 全部逐位一致**（2026-10-28 实测）。
- 本次还原**未迁入**该树外原型（非门禁证据、与 V0.3 引擎实现形态不再同构）；其发现已回写 §2.1：
  `monitor` 语义不能进 Plant——首版原型把 monitor 写进 Plant 分支导致 monitor_only 逐点错误，
  恰证明该职责必须上移；该教训在 §2.2 中以 `targetAt`/`loopBiasAt` 落地。
- 还原后的验收证据改为**生产代码快照对照**（`tools/verify-i11-bitidentity.mjs`，§9.5/§9.6）。

## 8. 批准与实施边界

- **并行线批准记录**（2026-10-28）：CHG-20261028-01 批准 RFC 并授权 S1（含 S1 执行记录）；
  CHG-20261028-02 批准 FC-001 独立 golden 转正（S2 前置）。两文件存于备份分支，见 §9.4。
- **还原生效记录**（2026-10-30）：CHG-20261030-07（`DECISIONS/DECISIONS.md` §8）——用户指令
  「还原远端同步 github 仓库的进度」（16:21）与「补齐缺失部分」（17:37）；实现提交 `311d0f0`
  已合并 `main` 并推送远端。
- 任何一步失败回滚仅涉及新增文件 + engine 委托分支：`git revert 311d0f0` 即恢复纯内联路径，
  golden/契约/UI 不受影响。
- 未批准前，本 RFC 的存在不改变任何验收结论（P0/P0b 验收与它无关）——本条对已批准/已还原状态
  继续成立：I-11 只改变实现组织方式，不新增模型能力、不改变既有验收结论。

## 9. 移植附录（CHG-20261030-07，2026-10-30）

### 9.1 背景与来源

- 2026-10-30 16:17，工作区被重置到 `origin/main`（`7aed9f6`）；并行线上的 P1 实现（S1/S2）与
  RFC 文档不在主线，仅保留在本地备份分支 `backup/local-parallel-p1-20261028`（tip `373859f`）。
- 16:21 用户指令「还原远端同步 github 仓库的进度」→ 从备份分支移植实现回 V0.3 主线（逐位一致性
  验收通过）→ 用户确认合并 `main` 并推送远端（提交 `311d0f0`）。
- 17:37 用户指令「补齐缺失部分」→ 归档本 RFC 文档 + 补 `DECISIONS.md` CHG-20261030-07 记录 +
  README/注释引用对齐（本文件即该次补齐产物）。

### 9.2 还原内容（提交 `311d0f0`，12 文件 +558/−7）

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/core/plants/fl001.js` | 新增 79 行 | S1 FL-001 Plant/Sensor/Controller/Fault 适配器 |
| `src/core/plants/fc001.js` | 新增 86 行 | S2 FC-001 适配器（`loopBiasAt` 回路视图） |
| `src/core/engine.js` | +158 | `fl001PlantCapable` / `fc001PlantCapable` 家族门 + `simulateFL001Plant` / `simulateFC001Plant` 委托；内联路径保留 |
| `index.html` | +2 | 在 `engine.js` 之前加载 `plants/fl001.js`、`plants/fc001.js` |
| `tests/core-load.js` | 装载清单 | `CORE_FILES` 纳入 plants（Node 侧同序加载） |
| `tests/arena.test.js` | +2 | 同上（Arena 测试装载清单） |
| `tests/plants.test.js` | 新增 145 行 / 83 断言 | 接口护栏：职责边界、monitor 语义归属、步进与 `foStep` 一致性、派发边界、经典脚本扫描 |
| `tools/verify-i11-bitidentity.mjs` | 新增 71 行 | 12 配置逐位一致性快照工具（`run_hash` + `signals_sha256` + `metrics_sha256`） |
| `tools/run-g2.mjs` | +1 | 挂步 plants.test.js（聚合 18 → **19 步**） |
| `artifacts/run-g2-report.json` / `e2e-report.json` / `e2e-fl001-min.png` | 证据刷新 | 19/19、E2E 40/0（见 §9.5） |

### 9.3 边界适配（V0.3 主线与并行线的差异）

- **FL-001 `load_step` 已删除**（O-13 / CHG-20261030-06）：适配器只覆盖 `none` / `sensor_drift`；
  `actuator_fault` 为未评审扩展预览家族，保留 engine 内联数值路径（O-13 归档路径）。
- **FC-001 `load_step` / `actuator_fault` 暂缓**：保留内联路径（RFC §3 S2 验收边界）。
- **GT-001 未接入**：S3 未排期；接口不触碰 GT 代码。
- **V0.3 新增层零改动**：registry / bundle / backend 准入 / scope 断言 / Arena 协议均未修改；
  `run_hash` 逐位不变即内容寻址面零变更的证据。
- **单文件 `FaultLab.html` 不重建**：单文件交付属 P1-05（未批准重做构建链），当前为冻结原型产物
  （README §2/§7），非 P0 交付物，不在本次还原范围。
- **UI 零改动**：除 `index.html` 两行脚本加载序外，页面/样式/交互无改动。

### 9.4 批准与编号说明（并行线与主线 CHG 同号不同内容）

| 线 | 编号 | 内容 | 位置 |
|---|---|---|---|
| 并行备份线 | CHG-20261028-01 | I-11 RFC 批准 + S1 执行记录 | 备份分支 `FaultLab-evaluation/NEXT/CHG-20261028-01-model-interface-rfc.md` |
| 并行备份线 | CHG-20261028-02 | FC-001 独立 golden 转正 + S2 前置记录 | 备份分支 `.../CHG-20261028-02-fc001-golden-draft.md` |
| V0.3 主线 | CHG-20261028-01 | G2 数值门禁关闭 + golden v1 批准（与本 RFC 无关） | 主线 `DECISIONS.md` §8 |
| V0.3 主线 | **CHG-20261030-07** | **本次还原 + 文档补齐（本 RFC 的主线生效记录）** | 主线 `DECISIONS.md` §8 |

> 并行线与主线存在**同号不同内容**的 CHG（2026-10-28 两线并行所致）。为避免编号冲突与史实混淆，
> 并行线 CHG 文件**不迁入**主线，其批准事实与关键结论以本附录为准；原始文件可随时从备份分支
> `373859f` 调阅。备份分支提交链：`9e9a91c`(P0a) → `9a763bb`(P0b) → `df89311`(RFC) →
> `9454314`(S1) → `b90a15f`(S2) → `373859f`(G2 evidence package)。

### 9.5 验证证据（2026-10-30 实测，全部离线、零第三方依赖）

| 验证项 | 命令 | 结果 |
|---|---|---|
| G2 四件套聚合 | `node tools/run-g2.mjs` | **19/19 PASS**（ok=true，failed=0；报告 `artifacts/run-g2-report.json`，`2026-10-30T09:21:57Z`） |
| I-11 接口护栏 | `node tests/plants.test.js` | **83/83 PASS** |
| 逐位一致性 | `node tools/verify-i11-bitidentity.mjs` | **12/12 配置 0 mismatch**（`run_hash` / `signals_sha256` / `metrics_sha256` 三项全等；基线 `7aed9f6` 与还原后 `engine_version` 均 0.1.0） |
| 既有数值回归 | `node tests/engine.test.js` / `engine-fc.test.js` / `core.test.js` | 全 PASS（FL/FC 601 点对 golden；core 回归） |
| 其它件 | registry / schema / bundle / event-phase / backend-admission（66/66）/ Arena 负例 / compare / causal-rules / report | 全 PASS（`run-g2` 聚合内） |
| Arena 回归 | `node tests/arena.test.js` | **155/155 PASS** |
| 浏览器 E2E | `node tools/e2e.mjs` | **40 pass / 0 fail**（Chrome，`base=http://127.0.0.1:4319`；`artifacts/e2e-report.json`，`2026-10-30T09:21:45Z`） |
| 文案护栏 | `node tools/copy-guard.mjs` | **exit 0** |
| golden 校验 | `python scripts/verify_golden.py`（FL-001 / fc001） | 均 pass |

### 9.6 12 配置逐位一致性快照（`run_hash`；与基线 `7aed9f6` 逐位相同）

| 配置 | `run_hash` |
|---|---|
| FL-001/none/closed_loop | `dcc74e2141769aa70531e22e657ad432b5ab9effceb33d49df19b7620c871f21` |
| FL-001/none/monitor | `ad40bc00225dc5f4dbc20ac4eb69963b5c720a8fbe9fca8405c076ab103df0b8` |
| FL-001/sensor_drift/closed_loop | `2463535a0817ce201bf78decca4c5f24792916650007b3368b3a138ad9103004` |
| FL-001/sensor_drift/monitor | `987e4b0aaed92b4aca90f09e18ab6e5edeb30871376a135d4763fb85968fdc6f` |
| FL-001/actuator_fault/closed_loop | `cd35e73a42b4929fb58d4c413d9a426a2b4315f5ee0ed18ad540ae4ae98cdbb2` |
| FC-001/none/closed_loop | `cc03d75edad7ac94868a9a80828573fe328819ceffbcf32d6e1fae910c140a96` |
| FC-001/none/monitor | `346bf31cbaa63debd27f15eacd8a584de766e8fc3e596df3c58f4f398010d600` |
| FC-001/sensor_drift/closed_loop | `f725be559525afb644304a9339e843d4926016615dfc7d462a882639e7c18409` |
| FC-001/sensor_drift/monitor | `8ba97205b4dc34680a6c1c35a74436ad004aa045ed1b5a1313734f07a5b744ec` |
| FC-001/load_step/closed_loop | `6adabf69a50e4859128a7116b5fd45eb0e8cbc4434226e8992559f35e7773d28` |
| FC-001/actuator_fault/closed_loop | `95bafc8b137e12d208bd3b1789c42a814a2db3cfe58df83bbe6a2f6d7ae82a5e` |
| GT-001/sensor_drift/closed_loop | `b431782a6414f6971e26a104559791073d03cf4f95fc37077c8a2aca8cbbe822` |

> 说明：表中 plant 家族（FL/FC `none` / `sensor_drift`）是本次接口化的主体；暂缓家族与 GT 对照
> 走未改动内联路径，其恒等属平凡要求，但同样纳入快照以防跨系统/跨家族意外漂移。

### 9.7 复现步骤（基线 vs 还原后）

```powershell
# 1) 基线（还原前，V0.3 主线 7aed9f6）——从当前工作树取快照工具，在基线工作树中运行
git worktree add --detach <基线目录> 7aed9f6
Copy-Item tools/verify-i11-bitidentity.mjs <基线目录>/tools/
Push-Location <基线目录>; node tools/verify-i11-bitidentity.mjs ..\baseline.json; Pop-Location

# 2) 还原后（main）
node tools/verify-i11-bitidentity.mjs ported.json

# 3) 比对 runs.* 的 run_hash / signals_sha256 / metrics_sha256 三字段（逐位）
#    期望：0 mismatch；任一字段变化即视为接口化改变了内容寻址面，按 CHG 回滚
```

### 9.8 未包含项 / 遗留

- **S3（GT-001）未排期**：GT-001 规格 v1.1 已批准（G2b 已闭），V3-31（独立 oracle + `gt001_v1`
  golden）与 V3-33（实现）待逐次开工；届时 S3 才会删除 GT 内联分支。
- **树外原型未迁入**：`tools/rfc/i11_adapter_prototype.js` 只存于备份分支（§7），不进入主线门禁。
- **单文件构建未重建**：P1-05 未批准；`FaultLab.html` 维持冻结原型（README §2）。
- **性能微基准未做**：委托为常数级工厂开销；如需正式基准（§4 条件 4）另立任务补测。
- **`engine_version` 未升版**：还原未改变任何输出（`run_hash` 逐位不变），按 §6.1 裁决维持 0.1.0。

## 10. 变更记录

| 日期 | 变更 | 依据 |
|---|---|---|
| 2026-10-28 | RFC 初稿编制；批准并实施 S1/S2（并行线） | 用户「批准」；CHG-20261028-01/02（备份分支） |
| 2026-10-30 | 还原移植回 V0.3 主线；合并 `main` 并推送远端（`311d0f0`） | 用户「还原远端同步 github 仓库的进度」；CHG-20261030-07 |
| 2026-10-30 | 本文档归档 + CHG-20261030-07 记录补齐 + README/注释引用对齐 | 用户「补齐缺失部分」；CHG-20261030-07 |
