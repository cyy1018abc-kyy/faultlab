# V3-20 Arena 真值隔离与泄露风险评估（2026-10-30）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.4 V3-20（P2-02 展开，G6 前置）。
> **性质**：对现行 A 架构（单页应用、真值在前端内存）在盲测下的泄露面逐项审查；本记录是
> V3-21（独立评测协议）的分支判定输入。**不改变任何产品代码**（WS-D 在 G6 关闭前不写实现）。
> **审查对象**：`src/agents/arena.js`（commit b161216 工作区）、`src/agents/builtin-agents.js`、
> `src/ui/pages/arena.js`、`src/ui/store.js`、`src/ui/shell.js`、`src/ui/export.js`、
> `src/core/schema.js`（project）、`src/core/engine.js`（blindSignals/blindSample）。
> **基线**：开工时 `node tools/run-g2.mjs` 16/16 PASS（含 arena.test.js 回归）。

---

## 1. 威胁模型与判定口径

被保护对象 = **每轮隐藏场景真值**（`family / faultId / magnitude / tStart / feedbackMode / healthy`，
由 `deriveTruth(scenario, run)` 构造，仅存 `round.truth`）。

| 攻击者 | 能力 | 是否在防区内 |
|---|---|---|
| A1 内置演示 Agent | 只收 `meta + observe(sample)` 流 | **是**（公平性：Agent 不得作弊） |
| A2 外部 Agent 作者 | 拿到导出盲测包（JSON），无页面访问 | **是**（V3-21 核心对象） |
| A3 本机操作者 | DevTools / 源码（MIT 公开） | **否**——G0-DEC-11 已声明 `truthSealed` 是 UI 开关非安全边界；A 架构接受本地内存透明 |
| A4 远程方 | 无网络请求、无服务端（无此面） | 不适用 |

> A3 明确出防区的含义：本评估只审 **Agent 可见数据路径**（A1/A2）；「操作者可在 DevTools 读内存」
> 不是发现项，是已声明架构属性。若未来Arena要对A3设防，才触发架构 B 重评。

## 2. 泄露面逐项审查

### 2.1 已验证干净的面（附代码证据）

| # | 面 | 判定 | 证据 |
|---|---|---|---|
| S-1 | 内置 Agent 输入 | ✅ 无真值 | `buildMeta` 只含 `systemId/duration_s/dt_s/observables/components(仅id+label)/faultFamilies(仅id+label)`（`arena.js:214-231`）；观测流 `buildSamples` 只含 t + blind 信号列（`arena.js:199-212`）；`agent.observe(sample, meta)` 全部样本同构 |
| S-2 | 观测通道过滤 | ✅ 三重过滤 | `blindVisible===true` ∧ `sourceKind ∉ {FAULT_EVENT, MODEL_STATE}` ∧ id 禁词 `/^_\|(true\|bias\|cap)/i`（`arena.js:185-197`）；`createMatch` 对每轮断言观测流非空 |
| S-3 | 评分隔离 | ✅ | `scoreDiagnosis(truth, diagnosis)` 仅在编排层调用（`arena.js:509`、`698`）；truth 不进任何 Agent 可达对象 |
| S-4 | Run 快照 | ✅ 不带真值 | `deterministicRun` 显式 `delete copy.truth`（`arena.js:412`），真值只在 `round.truth` 一份 |
| S-5 | 导出包字段面 | ✅ 无 config/无事件/无真值 | `roundBundlePart` 仅 `index/dt_s/duration_s/observables(id,label,unit)/samples`（`arena.js:751-765`）；`assertSealed` 递归禁词扫描（含 `^config$`）+ 观测 id 二次扫描（`arena.js:702-736`） |
| S-6 | 持久化 | ✅ 盲测局不入 localStorage | store 仅持久化 `state.runs`（演示 Run）与 session 页面态（`store.js:242-262`）；Arena match 是页面模块闭包态，无 `registerRun` 调用、无 match 序列化 |
| S-7 | 控制台 | ✅ | 仅 `console.error` 错误消息（`pages/arena.js:633/646`），不 dump 数据 |
| S-8 | 路由封存 | ✅ 与声明一致 | 比赛期间 `truthSealed=true` 封 `signals/causal/compare`（`store.js:510`、`shell.js:261-269`），结束自动解封（`pages/arena.js:616/652`） |
| S-9 | 盲视角渲染 | ✅ | `showTruth=false` 时徽章/对错标全 neutral，真值块显示通用文案（`pages/arena.js:985-1090`）；对操作者的默认 `showTruth=true` 属演示语义（人是裁判不是被盲测方），非泄露 |

### 2.2 发现项（2 项实质 + 3 项观察）

#### **LEAK-1（高，协议设计级）：导出盲测包携带原始 seed，可确定性重建全部真值**

- **位置**：`exportMatchMeta` → `seed: match.setup.seed`（`arena.js:745`）；`noise` 标志同随包导出（`arena.js:747`）。
- **机理**：场景生成完全确定性——`rng = FL.rng.mulberry32(seed)`，每轮固定顺序抽取
  `healthRoll → familyRoll → feedbackRoll → timeRoll → magnitudeRoll`（`arena.js:130-135`），
  幅值/时刻离散化亦确定（`arena.js:116-154`）。源码 MIT 公开后，**任何拿到盲测包的人可用 seed
  离线重放 `buildScenario` 得到每轮的 family/magnitude/tStart/feedbackMode/healthy——即完整真值**。
- **为何现有扫描拦不住**：`assertSealed` 只扫键名禁词，`seed` 是合法键；泄漏不在字段名而在
  **语义可逆性**。
- **影响定级**：对当前「合成故障评测游戏·P2 扩展预览」是公平性缺陷而非安全漏洞（A3 出防区、
  A2 拿包作弊即可满分）；对 V3-21 要建的**可信评测协议是阻断项**——不修复则协议自诞生即失效。
- **修复方向（供 V3-21 采纳，不在本轮实施）**：
  1. 盲包移除 `seed` 与 `noise` 原始标志，改携 opaque `match_id`（组织方本地保留 seed↔真值映射，赛后随结果公布）；
  2. 或显式定义 `open_seed` 模式并标注「种子公开=真值可复算，仅用于可复现演示，不得用于计分」；
  3. 盲包负例 fixtures 增补「含 seed 重建攻击」用例（V3-22 冻结）。

#### **LEAK-2（中，潜伏/契约级）：`schema.project('blind')` 的事件脱敏不充分，`trigger_s` 泄漏注入时刻**

- **位置**：`schema.js:432-434`——blind 投影保留 `events: [{event_id, trigger_s, channel_changed:true}]`。
- **机理**：故障 Run 的事件 `trigger_s = t_start_s`（Arena 局在 2–55 s 随机、P0 固定 20.0 s），而
  `t_fault` 是评分字段（检测延迟项的基准）；事件的存在性/类型亦可区分健康局与故障局。
  投影末尾的 `blindScan` 键名扫描（CN-E07）拦不住——`trigger_s` 不是禁词键。
- **现状限定**：`project()` 目前**无生产调用方**（仅 `tests/schema.test.js:126-135` 与契约文档引用）；
  Arena 导出走自己的 `roundBundlePart`（不含 events，见 S-5）。属**潜伏缺陷**：若 V3-21 直接采纳
  契约层 `project('blind')` 作盲包定义，泄漏立即生效。
- **修复方向（供 V3-21）**：blind 投影移除 `events` 整体（盲包只留观测流+元数据）；若需变化点提示，
  只允许「由 blind_observable 信号派生的候选变化点列表」并由独立函数生成，禁止引用事件表。

#### 观察项（不计入泄漏，移交 V3-21 处置）

| # | 观察 | 移交建议 |
|---|---|---|
| OB-1 | 盲投影双实现：契约层 `schema.project`（CN-E07 扫描）与 Arena 层 `blindObservables + assertSealed`（FORBIDDEN_KEY/FORBIDDEN_ID）口径相近但独立演化 | V3-21 冻结唯一「密封投影」定义并让两处共用/对齐，否则扫描规则漂移 |
| OB-2 | 外部提交评分 `scoreExternalDiagnosis` 在展示真值的同一页面内存中读 `round.truth` | 演示可接受；V3-21 的可信评测器必须与被评 Agent 工具链分离（独立进程/独立产物），这正是协议要规定的 |
| OB-3 | 演示态证据包导出含 `truth_demo_mode: run.truth`（`export.js:97`） | demo 层保留真值是 G0-DEC-11 明示语义，非泄漏；协议中须注明 demo 包与 blind 包互斥、禁止混发 |

## 3. 总体判定（V3-20 DoD 三选一）

> ### **结论：可守（有条件）——无需架构 B 重评，不降级**

理由：
1. 威胁模型内（A1/A2）的全部数据路径经查证仅两处实质缺陷（LEAK-1/2），且都是**协议/契约层设计问题**，
   均可在文档与导出组装层修复，不需要把真值搬到服务端（架构 B）；
2. A 架构的根本限制（本地内存对操作者透明）已由 G0-DEC-11 声明并持续标注「合成故障评测游戏，
   非真实诊断性能」——该定位下不构成阻断；
3. **触发重评条件（写入 V3-21）**：若 Arena 未来用于对外排位、多人竞争性评测、或评分被宣称为
   任何形式的「诊断能力度量」，则 LEAK-1 的攻击者从 A2 扩展到所有参与者，且 OB-2 的评测器独立性
   成为硬约束——届时须重开架构 B 评估（真值只在评测侧进程，页面仅收投影流）。

**移交 V3-21 的守卫清单（协议必备条目）**：
- [ ] 盲包禁止携带 `seed`/`noise` 原始值（opaque match_id 方案或 open_seed 显式模式，二选一成文）；
- [ ] 盲包不携带事件表；变化点提示只能来自 blind_observable 派生函数；
- [ ] 密封投影唯一实现（对齐 schema.project 与 arena 导出两条路径，扫描规则单一来源）；
- [ ] 评测器独立性：可信评测器与被评 Agent 工具链分离，真值不出评测侧；
- [ ] 盲包 schema 负例 ≥8 条含「seed 重建」「事件字段」「config 字段」「truth 键名」四类攻击负例（并入 V3-22 冻结清单）；
- [ ] demo 包与 blind 包互斥声明（OB-3）。

## 4. 复核命令

```powershell
node tools/run-g2.mjs        # 含 arena.test.js / schema.test.js（project 与 assertSealed 断言）
node tools/qa.mjs ux         # Arena 页走查（V3-01 一并复跑）
```

**记录人**：实现 Agent（V0.3 开工队列 #1，用户 2026-10-30 指令「进入实现阶段」）。
本记录为文档级审查证据，不构成对 Arena 的验收（Arena 验收属 V3-22 + G6）。
