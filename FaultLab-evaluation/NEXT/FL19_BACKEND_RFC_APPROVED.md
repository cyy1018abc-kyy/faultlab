# FL19_BACKEND_RFC_APPROVED — Python / Simulink / FMU 后端适配 RFC（v1.1，已批准）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.3 V3-10（P2-01 / FL-19 展开）。
> **状态**：`APPROVED`（**G6-WS-C 关闭**，2026-10-30 用户批准，`CHG-20261030-03`；批准前名
> FL19_BACKEND_RFC_DRAFT.md）。
> **评审链**：v1 → V3-11 双路独立上下文评审（评审 A 物理/数值视角、评审 B 工程/契约视角，
> 均 **CONDITIONAL GO**）→ v1.1 按「G6 关闭前必须改」清单修订 → 用户批准。
> **边界**：实现排期另批（准入清单 V3-12，待开工指令）；硬边界（P2-01 DoD 原文）：不改变 P0
> `simulate(config)` 纯函数接口与证据包格式；**只做适配层**。
> **记录**：实现 Agent，2026-10-30；v1.1 修订（评审 A：F-1…F-10；评审 B：F-01…F-12）；批准同日。

---

## 1. 背景与目标

FaultLab 当前唯一计算后端是浏览器内 JS 解析引擎（`src/core/engine.js`，`ENGINE_VERSION='0.1.0'`，
L0 解析/行为级，601 点，对 golden 只读比对）。BACKLOG P2-01（FL-19）预留了
Python / Simulink / FMU 后端适配评估：动机是（a）为教学对照提供「同一契约、不同数值实现」的第二实现；
（b）为未来 L1 数值模型预留工程通道；（c）验证数据契约对后端无关性的成色。

**目标**：定义一个后端适配层（BackendAdapter），使外部数值实现能以与 JS 引擎**相同的数据契约**
产出 Run 与 EvidenceBundle，且不影响 P0 主旅程与既有验收基线（run-g2 16/16 不回退）。

**非目标**：
- 不替换、不分支 JS 引擎；P0 主旅程（静态目录、无 MATLAB、无网络）保持零依赖可用；
- 不引入任何真实设备 / 云端 / 账户；
- 不在本 RFC 内实现任何代码（实现排期 = G6 关闭后另批，准入清单见 V3-12）；
- **scope 语义**：SA-24 白名单不扩大；但按评审 A F-1 / B F-11 的裁定，本 RFC 引入一条**受控扩展**
  （走 CHG 并在 scope-guard.test.js 增补断言）：**凡 `manifest.backend` 存在的 Run，scope 强制
  `extension_preview`（优先级高于 `classify(config)` 派生）**——后端 Run 永不进入 P0 验收面；
  其 golden 对照走 §5.3 专用验收步，不占用应用内 approved 比对路径。

## 2. 候选后端清单与许可证初判

> 许可证为**初判**，采纳前必须逐项核实原文（F-6 教训）；核实是对**实现**的前置条件而非事后检查
> （评审 A Q-4 守卫 2）。**许可证「待核实」期间禁止任何 import/代码依赖。**

| # | 候选 | 定位 | 许可证初判 | 关键风险 |
|---|---|---|---|---|
| B-1 | **Python stdlib 数值参考实现**（解析口径独立编写） | 跨实现一致性教学探针。**独立性天花板（评审 A Q-2）：与 oracle 同方程同源推导，B-1 vs golden 通过只证明编码/浮点路径正确，不构成方程级独立校核** | 项目内新写代码（MIT） | 禁止 import/派生自 `tools/oracle/**`；自检独立（不复用 SC-1…6）；措辞固定「跨实现一致性检查」；容差按解析交叉层 rtol 1e-12（§5.1） |
| B-2 | **PyBaMM**（电化学，对标矩阵 §8.2） | L1 候选，**只登记不展开** | BSD-3-Clause（待核实） | 触发 G2b 级物理评审；见 §7 Q-4 三条守卫 |
| B-3 | **python-microgrid**（对标矩阵 §8.1） | 组件化参考，**只登记不展开** | 待核实 | 同上 |
| B-4 | **Simulink 模型经 FMI 导出（FMU）** | 工程侧通道 | FMU 分发受**导出工具许可**约束（MATLAB 商业授权）；FMI 规范许可待核实 | **准入即触发改写触发器**（评审 A F-6）：MODEL_VALIDATION_SPEC §2.3/§9.2 与 UI_COPY_GUARDRAILS 中「无实测/FMU/Simulink 对比」类措辞须随 B-4 准入走 CHG（改为「存在 FMU/Simulink 合成模型间一致性比对，仍非模型验证」）；B-4 Run 的 UI 标签强制含该句；须附 model_manifest 方准入（Q-5） |
| B-5 | **自写 Python ODE 后端**（RK4，dt=0.1） | L0.5 同方程数值积分对照，演示「积分口径差异」教学点 | 自有代码（MIT） | 容差须按 §5.1 声明**量化误差预算**（RK4(dt=0.1) 含事件步内 b 冻结方式的误差构成，与左矩形 5.6e-5 不同源，须独立实测，评审 A F-5④） |

**初判排序**：B-1、B-5（纯本机、无第三方依赖、教学价值直接）> B-4（工程通道、许可与安装门槛最高）>
B-2/B-3（科学建模纵深，触发 G2b，**登记不展开**——且按 Q-4 守卫 3，在各自 RFC + G2b 通过前
不得出现在任何验收路径，含 SKIP 可选步）。

## 3. 架构：BackendAdapter 适配层

### 3.1 两级接口（v1.1 按评审 B F-03 重写；后端只产数值，契约组装权在页面侧）

```js
/* 第一级：后端进程（浏览器外）——纯数值，无契约知识 */
BackendAdapter.produce(config) -> { t: number[], signals: {id: number[]}, integrals?: {...} }
BackendAdapter.capabilities(): { systems:[...], faults:[...], grid_lock:'60s/0.1s/601点'(sr1), supports_noise:false }
BackendAdapter.lastError(): ContractError|null

/* 第二级：页面侧组装（复用既有模块，禁止适配器复刻） */
assembleRun(backendId, produceResult, config):
  信号目录 ← systems.js（source_kind/exposure/blindVisible）
  metrics  ← metrics.js（source_signal_ids 常量面）
  checks   ← checks.js + §5.1 容差判定层
  causal/events/snapshots ← systems.js 模板与既有中文文案
  manifest ← manifest.backend = { id, version, method_id, tolerance_profile_id }
```

- **Run 字段面（v1.1 收敛）**：**唯一新增字段 = `manifest.backend`**；`role` 沿用冻结枚举
  （`baseline/fault/monitor/imported`，评审 A F-2 / B F-07：后端 Run 的故障场景仍是 fault 证据角色，
  三 Run 对照矩阵依赖该语义；后端身份只进 manifest.backend）；`scope` 按受控扩展强制
  `extension_preview`（§1）。
- **registry**：新增入口 `createFromParts`（评审 B F-03）承接 manifest 组装 + run_hash + 深冻结的
  原子流程（BK-E02「不部分采纳」的实现载体：冻结前抛错、零半成品）；现有 `createRun`
  （硬绑 JS simulate）不动。
- **适配器不得**修改 config 语义、不得为白名单外参数放行（`FL.scope.classify` 照常把关）。

### 3.2 部署与运行隔离（v1.1 按评审 B F-05 改写安全条款）

| 规则 | 内容 |
|---|---|
| I-1 进程外 | 后端在**浏览器进程之外**的本机进程执行。浏览器页面不能 spawn 子进程——**stdio 形态仅存在于 Node 侧工具链**（run-g2 后端步、独立验证脚本）；页面路径唯一进程外通道为回环 HTTP（Q-1 裁定） |
| I-2 回环安全（收窄而非放开） | 适配器只绑 `127.0.0.1` + 随机端口（本地发现文件或可配固定端口）；**CORS 头仅 echo 批准的静态 origin**（收窄 CORS，非「无 CORS 放开」——跨源 fetch 必须有响应头）；校验 `Origin`/`Sec-Fetch-Site` + 每会话 token（防外部网页跨站触发仿真/资源耗尽）；无请求日志外发（离线红线） |
| I-3 无后端可用性 | 后端不可达时：P0 全功能不受影响；仅「后端对照」入口禁用并提示「本机未运行适配器」。**绝不静默回退用 JS 结果冒充后端结果** |
| I-4 零安装承诺不变 | README 主旅程步骤不出现任何后端安装要求；后端说明单列「可选扩展」章节 |
| I-5 MATLAB 边界 | FMU 路线只消费**已导出的 .fmu 文件**；仓库不携带 MATLAB 源码/模型，不提供导出教程承诺 |

### 3.3 UI 集成面（最小）

仅两处：① 系统页/对比页新增「后端对照」入口（默认折叠、标「扩展预览·未评审」）；② Run 详情显示
`backend` 字段与 `method_id`/容差档标签。不新增页面、不改五页信息架构。

## 4. 与 EvidenceBundle v1 的适配（v1.1 按评审 A F-3/B F-08、B F-04 改写）

- **复核分工（如实表述）**：`tools/verify_bundle.py` = **文件层/结构层**校验（B-01…B-08，
  其头注明示 run_hash 重算归应用内导入路径）；metrics/checks 重算与 run_hash 比对 = **应用内导入
  流程**（importBundle）。第三方离线复核对后端包的保护边界以此为准；如需离线重算，列入 V3-12
  准入清单（后端 golden 比对脚本），**不塞给 verify_bundle.py**。
- **条件化 provenance（评审 B F-04）**：现有组装链硬编码 `analytical_demo`/「非 Simulink」文案
  （bundle.js/export.js/evidenceFooter 为 copy-guard 锁定串）。后端 Run 走条件化方案：
  `model_provenance` 由 §7 Q-3 裁定档位写入 manifest（B-1=`analytical_demo`；B-5/B-4=
  `numerical_simulation`），data_kind 与页脚文案随档位取条件化版本；**禁止后端包复用
  analytical_demo 锁定串**；CHG 登记 + copy-guard 允许串扩充（deviations 留痕）。
- **对比闸门（评审 B F-02 裁定后自洽）**：`engine_version` = **产生数值的实现版本**——后端 Run
  必须携带区别于 `'0.1.0'` 的自有版本，现有 `compareRuns` 闸门（engine.js:1410）即天然拦截
  JS↔后端对比；**compareRuns 零改动**（评审 B 建议采纳），`backend.id` 一致性仅为调用侧 UI 预检
  提示，不进引擎。跨后端/跨版本一律 incomparable。
- **差异表述（评审 A F-9）**：后端 Run 与 JS Run 的差异分两层——结构层（manifest.backend、
  checks 重算结果）与数值层（timeseries、metrics 数值、method 口径），不再表述为「只体现在
  timeseries.csv 与 method_id」。

## 5. 跨后端 golden 一致性口径

### 5.1 容差声明制（tolerance_profile，v1.1 按评审 A F-5 加治理约束）

- 解析金标准 `data/golden/fl001_v1.json` 仍是**唯一基准**；后端 Run 不生成新 golden、不改既有
  golden（golden 纪律见 MODEL_VALIDATION_SPEC §6.3——v1 自引失效已更正）。
- **tolerance_profile 为逐字段表**（评审 A F-5①）：每档 = `{ 字段: E_bat_kWh/SOC_end_pp/…,
  判定层: gate|crosscheck, 阈值, 量化依据 }`；**每个声明值必须附量化误差预算**（按 SC-2 同法对
  该后端方法独立交叉实测），**V3-12 冻结后适配器不得运行时改值**；UI 将声明容差与 golden 门禁值
  **并排显示**。示例冻结档：
  - B-1（解析口径宣称）：按 **analytic_crosscheck 层 rtol 1e-12**（评审 A F-5③——宣称解析即按
    MODEL_VALIDATION_SPEC §3.6 交叉层，不得躲在门禁档 E ±1e-6 后面）；
  - B-5（RK4 dt=0.1）：声明放宽档，阈值随实现期量化预算定（v1 引「左矩形 5.6e-5」仅作量级参考，
    非依据）。
- **容差判定层（评审 A F-4 裁定）**：导入重算的 checks 判定**必须感知 tolerance_profile**（按
  声明档位选判定层）；页面侧新增 vs-golden 比对校验器作为 BK-E03 的载体（现 checks.js 为守恒/
  采样一致性，不含 vs-golden 容差——评审 B F-12①，列入 V3-12）。

### 5.2 字段语义与哈希（v1.1 按评审 B F-01/F-02 重写）

| 字段 | 语义 | 入 run_hash？ | 对比影响 |
|---|---|---|---|
| `engine_version` | **产生数值的实现版本**（后端 Run 携带自有版本 ≠ '0.1.0'） | 是（既有输入面，**零改动**） | 差异 ⇒ 现有闸门天然 incomparable |
| `manifest.backend`（id/version/method_id/tolerance_profile_id） | 适配器与口径声明 | **否——manifest 展示面**（run_hash 输入面是 G0-DEC-07 冻结项，评审 B F-01：入哈希 ⇒ 全部 v1 历史包 run_hash 无法重算 ⇒ 与兼容主张互斥；采纳不入哈希） | 调用侧 UI 预检提示 |
| 兼容性主张（更正后） | **EvidenceBundle v1 七文件结构不变、manifest.json 增 backend 对象、run_hash 输入面零改动**；v1 不再表述「逐字节兼容」 | | |

### 5.3 验收口径（G7 时落地）

- 后端验收场景**锁定 golden 形状**（60 s / 0.1 s / 601 点；评审 B F-06——`verify_bundle.py`
  硬编码 602 行与 t=20.0 行检查，非该形状的结构上不可验收；`capabilities()` 的 dt_bounds 扩展与
  verify_bundle B-05 参数化列为实现期候补，本 RFC 不承诺）。
- `run-g2` 新增可选步：后端不可用时 SKIP 不扰动 P0 16 步；**提供显式开关（如 `--require-backend`）：
  后端验收运行时 SKIP 记 fail**，report 增 skipped 计数（评审 B F-09——消除「后端坏了门禁全绿」盲区）。
- 验收内容：后端 Run vs golden（声明 tolerance_profile 判定层内）+ 后端包过 verify_bundle（结构层）
  + 应用内导入重算通过 + JS↔后端对比断言 incomparable。P0 16 步零改动。

## 6. 错误码与降级行为

复用契约中文错误码风格，新增适配器命名空间（落 DATA_CONTRACT_SPEC §错误码表，走 CHG）：

| 码 | 场景 | 用户可见行为 |
|---|---|---|
| `BK-E01a` | 连接不可达（健康探测，快超时 + 指数退避 ≤3 次） | 入口禁用 + 「本机未运行适配器（可选扩展）」提示 |
| `BK-E01b` | simulate 作业超时（**声明式**，按 tolerance_profile/系统规模配置，可异步轮询——评审 B F-10：不与连接超时混用，避免误杀慢而正确的后端） | 作业取消 + 明示超时配置 |
| `BK-E02` | 后端返回未通过 schema/validateRun | 该 Run 拒绝入库；显示首个中文校验错误；**不部分采纳**（载体=`createFromParts` 冻结前抛错，§3.1） |
| `BK-E03` | 超出声明 tolerance_profile（判定方=页面侧 vs-golden 校验器，§5.1） | Run 入库但标 `quality_checks: fail`；对比入口禁用该 Run |
| `BK-E04` | 后端崩溃/部分输出 | 整轮丢弃 + 适配器标「异常，需重启」；simulate 失败**不自动重试**（非幂等），无半成品 Run |
| `BK-E05` | 白名单外 config（scope 拦截） | 复用 `SCOPE-E01` 文案路径；后端同样不得绕过 |

降级总则：**任何后端故障都只缩小功能面，不改变数据诚实性**——失败显式可见，成功才入库，
无静默替换、无降级冒充。

## 7. 开放问题 → 裁定记录（依 V3-11 双路评审一致建议；**已随 CHG-20261030-03 生效**）

| # | 问题 | 裁定（评审建议 + Lead 采纳） |
|---|---|---|
| Q-1 | 桥接形态 | **回环 HTTP**（页面零依赖唯一进程外通道；stdio 仅限 Node 工具链）；安全条款按 §3.2 I-2 v1.1：CORS 收窄（仅 echo 批准 origin）+ Origin/Sec-Fetch-Site 校验 + 会话 token |
| Q-2 | B-1 与 oracle 独立性边界 | **有条件批准**，四条边界：(1) 代码对 MODEL_VALIDATION_SPEC §1.2/§1.3 权威文本独立编写，禁止 import/派生自 `tools/oracle/**`；(2) 自检独立（不复用 SC-1…6）；(3) 措辞固定「跨实现一致性检查」，禁「第二实现验证了模型」；(4) 容差按解析交叉层 rtol 1e-12。独立性天花板写进 §2 |
| Q-3 | provenance 档位 | **否决新增 `numerical_demo`**（评审 A：`numerical_simulation` 已在 G0-DEC-08 枚举内；新档位会软化 demo 语义）。B-1=`analytical_demo`；B-5/B-4=`numerical_simulation`；一切后端 Run 的 model_validation/hardware_verification **恒 `not_performed`**，三级展示不合并。FMU 黑盒的「已声明/未复核」区分放 `manifest.backend` 自述 + UI 标签（评审 B Q-5），**不新增 provenance 档位** |
| Q-4 | B-2/B-3 登记 | **批准「登记不展开」+ 三条守卫**：(1) 准入门绑定——适配器只准承载 `model_id='FL-001'` 且方程集 = MODEL_VALIDATION_SPEC §1.3 + 已批准 golden，引入此外物理的后端自始无效、必须走 G2b（入 V3-12 可机检清单）；(2) 许可证核实为**实现前置条件**（对原文核实）；(3) B-2/B-3 出现在任何验收路径（含 SKIP）之前须各自 RFC + G2b 通过 |
| Q-5 | FMU 黑盒 vs model_manifest | **强制附 machine-readable model_manifest 方准入**（方程/参数/假设/limitations/数值口径，可人工编写）；拒绝提供者只能走「黑盒预览」，禁参与任何跨后端一致性/对比结论，导出页脚显式携带该限制；后端 model_manifest **必须自述**（不得借 systems.js 清单——否则 model_hash 与 JS 相同致 engine.js:1407 检查语义失真，评审 B F-12②） |

## 8. 验收（本 RFC 的 V3-11 评审门槛）

- [x] 覆盖 P2-01 DoD 全部五要素（许可证/部署隔离/契约适配/golden 口径/错误降级）；
- [x] 双路独立评审完成（A 物理 / B 工程，均 CONDITIONAL GO，记录见
  `evidence/g6/v3-11-rfc-review.md`）；
- [x] Q-1…Q-5 各有裁定（§7）；
- [x] 与 DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC 口径冲突清单为零（用户批准并落
  CHG-20261030-03；v1 的 F-2/F-8 类冲突已在 v1.1 逐项关闭）；
- [x] 用户批准 + CHG 登记 → **G6-WS-C 关闭**（2026-10-30，CHG-20261030-03）；
- [ ] V3-12 准入清单冻结（下一任务，**待用户开工指令**；含 Q-4 三守卫、tolerance_profile
  逐字段档位、BK-E03 页面侧 vs-golden 校验器、noise 页面侧施加、method 双口径显示规则、
  scope-guard 断言增补——评审 B F-12 归属表）。

---

**修订记录**：v1（2026-10-30 初稿）→ V3-11 双路评审（A：F-1…F-10；B：F-01…F-12）→
**v1.1（2026-10-30）**：scope 受控扩展明文化（A F-1/B F-11）、role 复原+两级接口（A F-2/B F-03/F-07）、
复核分工如实化（A F-3/B F-08）、容差判定层与治理（A F-4/F-5）、B-4 措辞触发器（A F-6）、
backend 不入 run_hash + 兼容主张更正（B F-01）、engine_version 裁定（B F-02）、条件化 provenance
（B F-04）、I-2 安全条款（B F-05）、网格锁定（B F-06）、双超时拆分（B F-10）、引用与差异表述更正
（A F-7/F-9）、Q-4 守卫（A F-10）、F-12 归属表并入 §5.1/§7/§8。推迟到实现期：F-12 各归属项落地、
verify_bundle B-05 参数化、QP 细则。
**文件结束**。FL19_BACKEND_RFC_APPROVED v1.1（2026-10-30 批准，CHG-20261030-03）；G6-WS-C 已关闭。