# D5_PLUGIN_ARCHITECTURE_ASSESSMENT_V2 — 插件架构评估 v2（D-5v2 评估面：SystemDef / ScenarioTemplate / EvalAgent / FmuProvider 可注册化边界）

> **性质**：评估稿（V07_ROADMAP §2 主线 D **D-5v2** 行 + §7 首波 **S3** 派发，2026-11-18）——
> **只评估、不定实现、零代码触碰**；本评估在「1.0 API 承诺 + 八面冻结」约束下进行，
> **任何可注册化方案不得要求 breaking**（additive-only 边界是本文核心问题之一，§4 专章）。
> **授权链**：V07_ROADMAP v1（CHG-20261118-07 批准，DEC-1…6 全采推荐项）→ V1120_WAVE_DESIGN
> v1（**CHG-20261118-08**，2026-11-18——并发子智能体治理波，本文即 S3 名额产出，同波 S1=
> GT001_FMU_G2B_SPEC_DRAFT / S2=PV_WT_MG_L1_DEPTH_ASSESSMENT / S4=L2_SESSION_OPERATIONS_
> RUNBOOK 并行）→ 收口归 S6（CHG-20261118-09 预留，台账/证据）。
> **只读声明（S3 纪律）**：本评估未修改 src/**、tests/**、tools/**、data/**、docs/**；
> 唯一产出 = 本文件。评估结论为推荐性质，**不构成任何实现批准**；后续动作（若有）须另立
> RFC + CHG（V07_ROADMAP D-5v2 行门禁列原文「评估报告（RFC 级另批）」）。
> **输入（全部实读）**：D5_PLUGIN_ARCHITECTURE_ASSESSMENT v1（392 行全文——本报告对照基线）｜
> V07_ROADMAP §0/§1/§2/§7 ｜ docs/V1_FACES.md §0-§3 + §7 冻结执行记录 + §8-§18 additive 修订记录
> ｜ src/core/{registry,systems,scenario,bundle}.js ｜ src/core/engine.js（simulate 分派区）｜
> src/core/plants/{fc001,fc001-fmu-adapter,gt001}.js ｜ tools/backend/py/{fmu_admission,
> fmu_runner,bridge}.py ｜ tools/backend/fl001-adapter.mjs ｜ tests/backend-admission.test.js ｜
> FL19_BACKEND_RFC_APPROVED v1.1 ｜ V312_BACKEND_ADMISSION_CHECKLIST（FROZEN）｜
> FC001_FMU_G2B_SPEC_APPROVED v1.0 §0-§1.4（三层夹心）｜ GT001_FMU_G2B_SPEC_DRAFT v0.1（同波 S1）。
> **行号基线**：2026-11-18 本波工作区实读。本波为治理波（零代码零 golden 零版本，V07 §6）——
> src/** 本波零改动，core 行号不受同波治理文件影响；同波 S1/S4 治理面文件（GT FMU 草案等）
> 仍在落盘，其行号以最终提交态复核为准。凡引现状均给出 `文件:行号`。

---

## 0. 结论先行

**推荐：维持 v1 主体结论（SystemDef / ScenarioTemplate / EvalAgent 三面注册化均不做），新增第四维 FmuProvider 判定「缓做」——四维中唯一存在真实需求信号、且唯一可在 additive-only 边界内干净落地的维度。**

一句话理由：**八面冻结没有改变「封闭白名单是治理资产」的判断，只是把它的代价表写成了白纸黑字**（V1_FACES §3.2：closed-world 收窄 / 哈希面变化 / 门禁判据放宽 = breaking，major + 五件套义务）；而 FMU backend 时代的真正变化不在「三面是否该插件化」（不该——结论原样成立），在**「外来数值实现的准入语义已经机制化」**：createFromParts（registry.js:167）+ tolerance_profile 声明制（V312 §2）+ fmu_admission A-1…A-5（fmu_admission.py:34）+ V312 §10 钉 hash 表共同构成一个**事实上的声明式后端注册面**——FmuProvider 维度的「可注册化」约八成已存在，缺的只是 fc001-fmu-adapter.js 内四处 FC 专项字面量（§3.4-硬编码点实读）。同时 v1.11 治理波的现实是：第二例三层夹心（GT-001 FMU，A-6）草案已在本波落档（GT001_FMU_G2B_SPEC_DRAFT v0.1），而 V07_ROADMAP I-8 不变式已裁定该实现**复刻 fc001 模式**而非先建平台——故 FmuProvider 通用化的正确时点是 A-6 复刻落地之后（两实例为样本），载体 = RFC。

**逐维推荐**：

| 维度 | 推荐 | 一句话依据 |
|---|---|---|
| ① SystemDef | **不做**（TR-1 维持） | 注册动作已是全流程最便宜环节（ALL 数组一行，systems.js:3182）；G2b/oracle/golden/exposure 验证轮/步账/copy-guard 六项义务注册机制零减免；数据文件化被 I-1 零构建 + file:// 单文件形态技术否决（§4.1） |
| ② ScenarioTemplate | **不做**（TR-2 维持） | 「文件即插件 + 导入即准入」已由 C-5 覆盖（scenario.js:646/:666）；轨键演进已有 sanctioned additive 通道（B-1a 显式键纪律，scenario.js:430-480 两先例） |
| ③ EvalAgent | **不做**（TR-3 维持；进程内代码装载维持永久排除项） | 外部参与通道 = 协议 v2 + L2 双层遥测 + B-5 runbook（进程外），与协议 §1.2 自身指明的演进方向一致；页面内装载 = 面⑤威胁模型反转 + I-1/I-5 双冲突 |
| ④ FmuProvider | **缓做**（A-6 第二实例落地后以 RFC 重估；不做抢跑） | 需求真实（GT FMU 草案在途）+ additive 干净（既有 fc001 适配器零触碰 + 通用件已就位）；但 I-8 已裁定复刻优先，两实例前建抽象违反「不为想象中的生态预付架构成本」，且 fc001 全链位级验收冻结面（R-G9-02 parity 0.0）使过早参数化带真实回归成本 |

**触发条件台账**：v1 TR-1/TR-2/TR-3 全部维持未触发（§2.5 现状核查）；建议增补 **TR-4**（第三条 FMU 轨排程出现 → FmuProvider 通用化 RFC 触发，§5.4）。登记与裁定入口见 §6 裁定留白。

---

## 1. D-5v2 问题定义与 v1 稿结论重审

### 1.1 任务定义（V07_ROADMAP → 本文范围）

V07_ROADMAP §2 主线 D 的 D-5v2 行（V07_ROADMAP.md:70）：

> D-5v2 ｜ v1.11 评估 ｜ **插件架构评估 v2**（1.0 API 承诺 + 八面冻结 + FMU backend 时代重评估——SystemDef/ScenarioTemplate/EvalAgent/FmuProvider 可注册化边界；仅评估不定实现）｜ 评估报告（RFC 级另批）

与 v1（V06_ROADMAP D-5，V06_ROADMAP.md:79——三面评估稿）相比的两处任务变化：

1. **约束前提升级**：评估在「1.0 API 承诺 + 八面冻结」下进行——V1_FACES §2 八面自 CHG-20261108-04 起全部处于**冻结（additive-only）**状态（V1_FACES.md:533-535 转正声明），§3 breaking 政策生效。任何方案须先回答：动不动承诺面？additive 能不能承载？
2. **维度扩一**：新增 **FmuProvider**（FMU 轨 provider 外挂——fc001 三层夹心通用化）。v1 明文排除 D-3 FMU（v1 §1「范围排除：不涉及 D-3 FMU（等样本，另线）」）——FMU backend 时代（v1.9→v1.10.1 全链落地 + V07 主线 A 排程）使该排除失效，v2 必须正面评估。

### 1.2 v1 稿结论重审（逐条：仍成立 / 已过时）

**仍成立（且多数被八面冻结加固）**：

| # | v1 判断 | v2 状态 | 加固/依据 |
|---|---|---|---|
| H-1 | 封闭白名单 = 治理资产本身；拒收未登记项不是缺陷是功能（v1 R1） | **原样成立且更硬** | v1 引用的是 DEC-6 预冻结方向；现状是冻结已转正 + breaking 判定细则成文（V1_FACES §3.2「closed-world 面收窄 = breaking」）——插件化若造成收窄，代价从「治理风险」升级为「major + 五件套义务」 |
| H-2 | 运行期代码装载与 I-1/I-5 双冲突，永久排除项（v1 §5.4） | **原样成立** | 零安装零网络零构建仍是不变式首位（V07 §0 沿袭 I-1）；copy-guard 扫描域 SCOPES=['src']（tools/copy-guard.mjs:15）未变；本波新增证据见 §4.1（file:// 单文件形态使「启动期装载外部文件」技术不可行） |
| H-3 | 插件化不替代既有准入、只在其上叠加（v1 R2）——G2b/V312 式准入照付 | **原样成立并获第二先例** | FC-001 FMU 全链（v1.9-v1.10.1）完整走过 G2b 批准 + parity + admission——准入语义与插件机制正交的判断再证实（§3.4） |
| H-4 | 注册动作 = 最便宜环节、插件化优化的恰是最便宜环节（v1 R4 成本错位） | **原样成立** | 注册面现状仍是「数组加一行」（systems.js:3182）+ 模块装载注册（index.html / tests/core-load.js CORE_FILES——plants/gt001.js 注册先例，V1_FACES §14） |
| H-5 | 三面触发条件 TR-1/TR-2/TR-3 均未触发（v1 §0 表） | **原样成立（现状核查见 §2.5）** | 无外部 SystemDef 贡献出现；场景共享为 C-5 文件流转；评测生态「第三方独立 Agent 会话」仍开放（V07 §1 G10 行「◐」）——B-5 runbook 本波 S4 承载的是**运营就绪面**，非生态成立事实 |
| H-6 | EvalAgent：外部参与的正确形态 = 进程外评测轨（v1 §3.3） | **原样成立并扩容** | 协议 v2 冻结（面⑤）+ v1.9.0 L2 双层遥测工具面落地（tools/arena-l2-core.mjs + arena-mcp-server.mjs——仍进程外）+ B-5 第三方 L2 会话运营 runbook（同波 S4）——演进方向与协议 §1.2 预设一致 |
| H-7 | 「PR 进 systems.js」= sanctioned additive 通道（v1 ①-e） | **原样成立且先例翻倍** | v1 时点样本 = WT-001；v1.0 后经同一通道落地：MG-001（v1.1.0 CHG-20261110-02）、FC 电化学轨（v1.2.0）、FL capacity 轨（v1.4.0）、GT thermo_comb 轨（v1.6.0）、fc001_fmu golden（v1.9.0）——全部 additive minor，零插件机制参与 |

**已过时 / 需修正（v1 事实面快照老化——非结论失效）**：

| # | v1 表述 | 现状（2026-11-18 实读） | 修正 |
|---|---|---|---|
| O-1 | 五系统（FL/FC/GT/PV/WT），ALL 一行 | **六系统**（+MG-001，v1.1.0）：`var ALL = [FL001, FC001, GT001, PV001, WT001, MG001]`（systems.js:3182） | 成员计数更新；判断不变 |
| O-2 | golden 8 份；run-g2 31 步 | golden **13**（v1.9.0 fc001_fmu_v1 首条 FMU 轨 golden；V1_FACES §16 面②）；run-g2 **36 步**（v1.10.0 parity 步 additive，tools/run-g2.mjs:4「36 步全量」） | 事实更新；步账/字节冻结纪律原样 |
| O-3 | scenario.js:150/157 未知系统拒收文案静态滞后（缺 WT-001）——登记待清算 | **已清算**：knownSystemIds 动态派生（scenario.js:119-129——「未来注册自动跟上」注释明文，D5 评估 §3.1-①-d 实证滞后清算兑现，CHG-20261108-03） | v1 局限③ 所指修复已落地；该滞后佐证链不再存在，但 v1 由它引出的判断（维护成本在文案同步不在注册数组）反向被加强——动态派生（非插件机制）即消除 |
| O-4 | V1_FACES 未落盘（v1 局限②——以 DEC-6 文本为准） | **已落盘且转正冻结**（733 行，§7 冻结执行记录五步闭合） | v1 的前瞻引用全部兑现；本文直接以 V1_FACES 冻结文本为约束事实源 |
| O-5 | ARENA_EXCLUDED = ['PV-001','WT-001']（v1 §2.1） | **现值 []**——六系统全入评测池（v1.3.0 入池登记，arena.js:110） | 事实更新 |
| O-6 | D-3 FMU「等样本另线」、V312 是唯一准入先例（黑盒准入轨） | **FMU backend 时代到来**：V312 B-4/Q-5 经 FC-001 已批 FMU 轨兑现（fmu_admission + 钉 hash + parity + adapter + bridge HTTP E2E——v1.9.0/v1.10.0/v1.10.1）；GT-001 FMU 草案在途（第二例） | 本文新增第 4 维（§3.4）；V312 §7 provenance 例外行 + §10 钉 hash 表已随 CHG-20261118-01 修订 |
| O-7 | 评估对象 = 三面（v1 标题） | 四面（任务定义 V07_ROADMAP.md:70） | 结构扩一 |
| O-8 | v1 §3.1-①-a「G2b 先例 5 份 APPROVED 规格」 | G2b APPROVED 规格族大幅增长（PV/WT/MG/FLTH/FLCAP/FCECH/GTCMB/GTL1/FCFMU/FLEXT/Q5 字段表等——NEXT/ 列目录实证） | 佐证面更新：G2b 通道已是成熟主干，进一步降低插件机制的边际价值 |

**v1 需要补充的判断缺口（v2 新增论证）**：

- **G-1（file:// 技术硬约束）**：v1 的 I-1/I-5 论证是治理层的；v2 补一层技术事实——主旅程发布工件 = FaultLab.html 单文件（file:// 直接可用，file-smoke 61 断言冒烟，tools/run-g2.mjs:133），零构建经典脚本 IIFE 架构下数据/代码只能以 .js 形态经 `<script>` / CORE_FILES 装载；**任何「启动期自动装载外部数据/代码文件」在 file:// 形态下没有装载路径**（浏览器 file:// fetch 阻断 + 零构建禁打包器）。可选形态只剩两种：**打包期内联（= 进源码 = 现行 PR 通道）** 与 **用户显式文件输入（= C-5 已有形态）**。该约束把 v1 的「不做」从治理偏好升级为架构事实（§4.1 展开）。
- **G-2（B-1a 显式键纪律 = 轨键演进的 sanctioned 通道）**：electrochem_model（v1.2.0）/capacity_model（v1.4.0）两先例确立了「显式键条件式哈希形态」——新键只影响使用它的输入、既有场景 scenarioHash 零变化（scenario.js:61-77 注释明文引用 face③ 冻结边界原文）。ScenarioTemplate 维度的「演进需求」已被该通道吸收（§3.2）。
- **G-3（后端注册面已事实存在）**：fl001-adapter.mjs `ADAPTERS = {'py-analytic-fl001': {script, admitted: true}, ...}`（fl001-adapter.mjs:17-19）+ G-3 验收路径禁入机检（backend-admission.test.js 对注册适配器逐个断言 G-1a/G-1c/G-2，tests/backend-admission.test.js:37-58）+ createFromParts 通用组装（registry.js:167）——「声明式准入注册」在后端轨已经机制化。FmuProvider 评估必须以「已存在多少」为起点（§3.4）。

---

## 2. 四维现状盘点（逐条行号）

### 2.1 SystemDef 面：六系统模块内声明 + ALL 数组注册

- **声明与注册**：六系统 SystemDef 数据对象全部为 systems.js 模块内声明，经构造辅助 chart/sig/comp/fault 归一（systems.js:29-107——装载期即抛错校验：style/sourceKind/colorToken 非法即 throw）；`var ALL = [FL001, FC001, GT001, PV001, WT001, MG001]`（systems.js:3182）→ BY_ID 反查（:3183-3184）。**注册的全部动作 = 数组加一项 + 文件装载注册（index.html / tests/core-load.js CORE_FILES）**。
- **公共 API（冻结）**：`FL.systems` list/get/defaultConfig/signalMap/faults/fault/component/causalTemplate/validateDraft（systems.js:3296-3306——面①承诺内容原文：V1_FACES 面①「承诺内容」）；engine 内部走零开销 `_raw`（:3309-3314，非公共契约）。
- **物理与分派（数据/物理分离未变）**：`simulate` 的 if/else 链五显式分支（FL-001/FC-001/PV-001/WT-001/MG-001，engine.js:3082-3094，各带 R-4/R-7/R-5 守卫注释「显式分支必须置于 else→GT001 兜底之前，禁止静默落入 GT 物理」）+ `else sim = simulateGT001(...)` 兜底（engine.js:3095）。物理本体 = engine.js 每系统函数（simulateFL001 :695 / simulateFC001 :1211 / simulateGT001 :1517 / simulatePV001 :1987 / simulateWT001 :2093 / simulateMG001 :2244）——**SystemDef 数据只是目录，物理不是数据**（v1 判断原样成立）。
- **轨键盖章与守卫（每轨一处显式代码，非数据驱动）**：defaultConfig 四轨盖章分支（inertia_model/thermal_model/electrochem_model/capacity_model 各一 if——systems.js:3265-3280，每轨一处注释引用各自 G2b 批准链）；scenario.js 事件键封闭白名单 EVENT_KEYS 11 键（scenario.js:52）+ 四轨枚举常量（INERTIA_MODELS 4 值 :56 / THERMAL_MODELS :60 / ELECTROCHEM_MODELS :68 / CAPACITY_MODELS :77）+ 逐轨校验块（scenario.js:391-480——每轨键一段显式代码 + capacity×thermal 组合守卫 :473-480）。
- **下游义务面（新系统真正要改的地方，注册机制零减免）**：scope APPROVED/approved_fc 白名单（面⑥）；arena-protocol V-01 systemId 成员校验 + exposure 三值映射（面⑤——v1.3.0 PV/WT/MG 入池须过 exposure 验证轮先例）；teaching.js 目录文案动态派生；UNITS 字典纯增项（systems.js:115 起）；verify_golden MODELS 注册行（面②——重指向须 CHG）；run-g2 新系统接线步（「新系统 = verify 步 + engine 步各一」先例，tools/run-g2.mjs:34-38 注释；步账预算制）；copy-guard 词表增长（面⑧——MG 六词先例）；ARENA_EXCLUDED 裁定（arena.js:110）。

### 2.2 ScenarioTemplate 面：预设 + schema v1 封闭白名单 + C-5 信封（v1 后扩容面 = B-1a 显式键）

- **schema v1 封闭白名单常量**（scenario.js:38-84）：SCHEMA_VERSION=1 :38、MAX_EVENTS=12 :39、FEEDBACK_MODES :40、固定网格 60 s/0.1 s :44-45（注释明文「防止未来新系统静默漂移出 schema v1 运行面」）、TOP_KEYS :47、EVENT_KEYS 11 键 :52（含四个模型深度轨键 + t_clear_s）、四轨枚举 :56/:60/:68/:77、DELETED_FAMILIES :82-84。
- **校验链封闭式**：normalizeScenario（:158 起）；轨键逐段校验（:391-480）——**其中 electrochem_model/capacity_model 两段即 B-1a 显式键纪律的代码化**：「仅在场景输入显式提供时校验并写入归一化事件与 hashProjection，缺省全链 absent——不解析为系统默认轨」（scenario.js:430-436/:449-460 注释明文）⇒ 既有场景 scenarioHash 零变化（face③ 冻结边界原文「新键只影响使用它的输入」直接承载——注释逐字引用 V1_FACES）。
- **执行侧零新执行语义**（I-6）：executeScenario 逐事件 createConfig→createRun（scenario.js:603 起）。
- **C-5 流转（已建成）**：信封 `{kind:'faultlab.scenario', version:1, content_checksum, scenario}`，ENVELOPE_KEYS :641、exportScenarioEnvelope :646、importScenarioEnvelope :666——确定性、可复核（校验和 = scenarioHash，内容一致性核对非签名）、导入双格式 + 校验和不符 = 结构化错误不静默放行。
- **教学路径预设**：8 条预设路径（本波实读计数——v1 时点 7 条）、PATH_SCHEMA_VERSION=1（teaching.js:32）、导出信封 faultlab-teaching-path（teaching.js:298）、校验器对预设与外来输入同规（validateTeachingPath + scenarioSpec 双重校验先例）。

### 2.3 EvalAgent 面：内置注册 API + 协议评测轨 + L2 双层遥测

- **内置注册 API 已存在（进程内、仓库内代码）**：`BUILTINS` 数组（src/agents/builtin-agents.js:14）+ `defineBuiltin`（:681-704——同 id 覆盖、新 id 追加，**运行期注册函数已是仓库内事实**）+ 模块尾五个确定性演示 Agent（threshold/residual/cusum/bayes/fusion 五次 defineBuiltin，:759-807）+ create/list 消费端。接口契约 `create(meta)→{reset/observe/diagnose}`。
- **页面 Arena 演示轨**：truth 驻留页面内存、盲面三重过滤 + assertSealed；ARENA_EXCLUDED 现值 []（arena.js:110——六系统全入池，v1.3.0）。
- **评测轨（进程外，冻结 + 扩容）**：协议 v2 盲包三查合一 + V-00…V-10 + score_hash（面⑤冻结）；v1.9.0 新增 **L2 双层遥测**共享核心（tools/arena-l2-core.mjs + arena-mcp-server.mjs——G10 §3 逐字承接：双层遥测/B_max=180/query_ledger/N-B20..22/V-11——tools/** 评测基础设施，src/** 产品面零触碰）；eval-session-002 in-repo 归档；第三方独立 Agent 会话开放（V07 §1 G10 行「◐」）——B-5 第三方 L2 会话运营 runbook 本波 S4 并行产出。
- **「内置 5 算法的外部化」现状**：五算法为演示轨确定性 Agent（教学演示定位），无外部贡献者、无运营负载——外部化的需求面在 v1 时点与本波核查中均不存在。

### 2.4 FmuProvider 面：三层夹心已全链落地，通用件与专项件并存

**已通用化（先例沉淀，零 FC 专项）**：

| 件 | 位置 | 通用性证据 |
|---|---|---|
| 组装原子入口 `createFromParts` | src/core/registry.js:167-270 | backend 声明全参数化 `{id, version, method_id, tolerance_profile_id, provenance}`（:173 校验、:251-253 入 manifest）；scope 强制 extension_preview（:249-251——classify 零改动）；engine_version = 产生数值的实现版本（:234）；backend 字段不入 run_hash（FL19 RFC §5.2 裁定）——零 FC 专项逻辑 |
| golden 容差比对 | src/core/golden-compare.js（tolerance_profile_id 声明制） | V312 §2 逐字段档位表驱动——BK-E03 判定载体通用（backend-admission.test.js:127-140 负例自证：声明档错套被拒、篡改序列被检出） |
| FMU 准入 `admit()` | tools/backend/py/fmu_admission.py:34-79 | A-1 zip 结构 / A-2 manifest 八字段（REQUIRED_MANIFEST_FIELDS :26-29）/ A-3 model_id 自述禁令（:69-70）/ A-4 provenance 标注（:13-15 含 CHG-20261118-01 ④ 例外注记）/ A-5 拒绝路径枚举——零 FC 专项 |
| 后端适配器注册表 | tools/backend/fl001-adapter.mjs:17-19 | `ADAPTERS = { 'py-analytic-fl001': {script, admitted:true}, ... }`——G-3 验收路径禁入的机检载体（V312 §1 G-3）；backend-admission.test.js:37-58 对每个注册适配器机检 G-1a/G-1c/G-2 |
| 钉 hash 台账 | V312 §10（表形态） | per-FMU 工件条目：产物/sha256 钉（fc001_l1_v1.fmu = 5f60ca78…，18,117 B）/model_id/provenance/构建命令钉/重钉纪律（重钉须 CHG）/装载前强制校验 |

**FC 专项硬编码（通用化缺口——FmuProvider 维度的实际对象）**：

| 硬编码点 | 位置 | 内容 |
|---|---|---|
| golden 轨锚定 | src/core/plants/fc001-fmu-adapter.js:23 | validateGolden 硬编码 `golden_id !== 'fc001_fmu_v1'` 拒载 |
| provenance 档位 | 同上 :27 | 硬编码 `model_provenance !== 'fmu_l1_lumped_unvalidated'` 拒载 |
| 桥能力面 | 同上 :64 | probeBridge 硬编码 `model_id !== 'fc.pem.fmu_l1'` 拒认 |
| 桥端点 | 同上 :111 | bridgeRun 硬编码 `POST /simulate-fc001-fmu` |
| runner 钉校验 | tools/backend/py/fmu_runner.py:136/:183/:198-200 | `FC_FMU_SHA256_PINNED` 常量 + `run_fc001_shell` 专项壳函数 + 装载前钉校验不符即拒 |
| bridge 端点 | tools/backend/py/bridge.py:161/:168/:178/:190 | `GET /capability`（FC-001 L1-FMU 能力面）+ `POST /simulate-fc001-fmu` + 通用 `POST /simulate`（py-analytic/py-rk4 两适配器已参数化——backendId 路由） |

**形态参照（I-11 plant adapter）**：plants/fc001-fmu-adapter.js 的依赖注入形态已 provider-ready——golden payload 由调用方注入（浏览器 file 输入/构建内嵌/测试 harness——头注明文「core 层零 fetch 零 fs，I-1 纪律」）、fetchImpl 注入（core 零网络 API 直调）、探针失败显式降级（capability 面如实暴露不静默）。plants/{fl001,fc001,gt001}.js 为同构 cfg 工厂形态（面① plants 注册面，V1_FACES §14 additive 登记）。

**第二实例在途**：GT001_FMU_G2B_SPEC_DRAFT v0.1（同波 S1 落档）——「adapter/bridge 复用；fc001_fmu 全套先例同构」；V07_ROADMAP I-8 不变式裁定「每条 FMU 轨独立 G2b 批准（V312 B-4）；实现**复刻** fc001 三层夹心模式（oracle→golden→C99→parity→adapter→bridge）——parity 0.0 纪律为模板约束」。

### 2.5 触发条件现状核查（v1 TR-1/TR-2/TR-3 维持未触发——本波实读）

- **TR-1（外部 SystemDef 贡献）**：未触发。v1.0 后全部新系统/新轨（MG-001、FC/FL/GT 深化轨、fc001_fmu）均为仓内 G2b 批准链产出；无仓库外方向贡献出现。
- **TR-2（场景模板需求放量）**：未触发。共享为 C-5 文件流转（导入校验 = 逐例准入）；教学预设 8 条全部仓内预设；无跨机构流转成常态的登记证据。
- **TR-3（评测 Agent 生态成立）**：未触发。eval-session-002 为 in-repo 会话归档；「第三方独立 Agent 会话」在 V07 §1 现状对账中仍标开放（◐）；B-5 runbook 是运营**就绪面**交付，非生态成立事实——数据诚实性措辞：不把「runbook 就绪」表述为「生态已成立」。

---

## 3. 四个可注册化维度逐一评估

> 每维四段式：现状硬编码点实读 → 可注册化方案草案 → 八面影响面 → additive 可行性判定。
> 评估口径沿 v1 四问（①现状真实门槛 ②插件化能省多少 ③新引入什么成本/攻击面 ④判定），
> 叠加八面冻结约束（每方案先过 §4 additive 判据）。

### 3.1 ① SystemDef（系统目录外挂——新增系统免改 systems.js）

**①-a 现状硬编码点实读**（§2.1 全表）：注册 = systems.js:3182 一行 + 模块装载注册；物理 = engine.js 每系统函数 + 显式分派（R-4/R-7/R-5 守卫）；轨键 = scenario.js 四枚举 + 四校验段 + systems.js defaultConfig 四盖章分支 + engine validateConfig 守卫（每轨三处字面守卫——v1.6.0 inertia 枚举 3→4 值的 additive 先例即「三处字面守卫」显式 CHG，V1_FACES §13）。

**①-b 可注册化方案草案**（三形态，均不定实现）：

- **形态 A｜数据文件 + 声明式注册表**：SystemDef 移出 systems.js 成 per-system 数据文件，注册器装载期校验后并入 BY_ID。
  *技术可行性否决*：零构建经典脚本 IIFE 架构下，数据只能以 .js 形态经 `<script>`/CORE_FILES 装载；JSON 数据文件无装载路径（file:// fetch 阻断 + 零构建禁打包器）——「数据文件化」在本架构下不可实现，唯一等效形态 = 数据仍驻留 .js 模块（= 现状）。I-1 对形态 A 是**技术硬否决**，不只是治理冲突（§4.1 论证）。
- **形态 B｜注册 API `FL.systems.register(def)`**（defineBuiltin 先例同构）：仓库内模块装载时注册。
  *评估*：defineBuiltin 的存在证明该形态对 Agent 面有价值（五 Agent 同文件内注册 + 接口契约稳定）；SystemDef 面没有对应需求——六系统全部同文件声明，注册 API 只把「数组加一行」变成「函数调一行」，注册动作成本不变，而失去 ALL 数组的静态可枚举性（verify_golden/teaching/scope 等下游按目录派生的消费面不受影响，但评审面的「一眼看全六成员」可读性下降）。收益为零、可读性为负。
- **形态 C｜引擎分派注册表**：engine.js:3082-3095 的 if/else 改 map 分派。
  *评估*：位级可保（I-11 verify-i11-bitidentity 先例——「纯组织方式重构零行为变化」形态），但 R-4/R-7/R-5 守卫的评审语义依赖**显式分支的静态可见性**（守卫注释逐字挂在各分支上：engine.js:3084-3094）；map 化把「忘记加分派→静默落 GT 兜底」的评审拦截弱化——v1 ①-c 形态 1 的论证（插件机制把编译期可见变成运行期静默错物理）对形态 C 以更温和的形式同样成立。且无任何准入增量。

**①-c 八面影响面**：

| 面 | 影响 | 判定 |
|---|---|---|
| ① SystemDef schema | 机制变更不改字段面语义与 FL.systems API 签名——additive 兼容；事实源声明（systems.js）须随机制变更修订（V1_FACES additive 修订先例可承载） | 形式可承载，但机制本身无收益（①-b） |
| ③ scenario schema | system 成员校验动态（scenario.js:113-117 getSystem→_raw.get）——新注册系统自动放行；**轨键面不随机制减免**（EVENT_KEYS/四枚举/四校验段仍是字面代码，每新轨显式 CHG——v1.2.0/v1.4.0/v1.6.0 三先例） | additive 通道已存在且机制零减免 |
| ⑤ eval protocol | 新系统信号须过 exposure 三值映射验证轮（v1.3.0 三系统入池先例——逐信号核对表 × 盲包程序化验证） | 机制零减免 |
| ② golden / ⑥ scope / ⑦ 步账 / ⑧ copy-guard | oracle/golden、scope 档位裁定、接线步预算、词表增长义务全部与注册机制正交 | 机制零减免 |
| I-5 copy-guard | 外部数据文件的 title/tagline/narrative 移出扫描域（SCOPES=['src']）——机检失效退化为人工评审 | 冲突（v1 §5.3 原样成立） |

**①-d additive 可行性判定**：「新增一个 SystemDef」本身已是 sanctioned additive minor 通道且先例充分（§1.2-H-7：MG-001 → FC/FL/GT 三深化轨 → fc001_fmu golden，全部经 PR+CHG 落地、零插件机制参与）。三个机制形态中 A 被 I-1 技术否决、B 收益为零、C 触碰守卫评审语义且零收益。**判定：不做（机制）；TR-1 维持**——外部 SystemDef 贡献的正确通道 = 经 G2b 的 PR 进 systems.js（v1 ①-e 原文沿袭）；PR 协作面本身成为瓶颈时才重评登记形态（TR-1 原文范围界定不变）。

### 3.2 ② ScenarioTemplate（场景模板外挂）

**②-a 现状硬编码点实读**（§2.2）：封闭白名单常量（:38-84）+ 逐轨校验段（:391-480）+ C-5 信封（:638-641/:646/:666）+ teaching.js 8 条预设 + PATH_SCHEMA_VERSION=1（teaching.js:32）。

**②-b 可注册化方案草案**：

- **形态 A｜声明式模板登记**（纯数据注册、零执行语义、装载/导入时全量封闭校验）——TR-2 触发后的既定评估对象（v1 §0 表原文）。
- **形态 B｜模板包启动期装载**——v1 ②-b 已论证劣于 C-5（导入失败 = 结构化错误可见 vs 启动期 = 带病运行/启动失败）；且被 file:// 技术约束否决（§4.1——启动期自动装载外部模板文件无装载路径）。
- **形态 C｜维持 C-5（文件即插件）**——现状。

**②-c 八面影响面**：模板 = 数据过全量封闭校验——不触面③承诺面（additive 兼容）；教学路径信封携带 step title/detail 文案——**导入路径的文案不经 copy-guard**（现状即如此，属用户显式逐件动作、内容自担，与 C-5 label 同语义）；形态 A 若做成启动期批量装载则把该面常态化移出扫描域 = I-5 冲突。面⑦零影响；面①⑤⑥不触及。

**②-d additive 可行性判定**：预设增长已是 additive 通道（teaching.js 预设 7→8 无机制变更）；共享已由 C-5 覆盖；**轨键演进已被 B-1a 显式键纪律承载**（G-2 新论证——electrochem/capacity 两先例使「新轨键入场景」成为冻结边界内的 sanctioned additive 形态，无需注册机制）。**判定：不做；TR-2 维持**——触发后评估对象 = 形态 A（声明式、导入/装载时校验、非启动期静默），范围界定沿 v1 原文（不做模板内嵌逻辑/脚本）。

### 3.3 ③ EvalAgent（诊断 Agent 外挂——arena 内置 5 算法的外部化）

**③-a 现状硬编码点实读**（§2.3）：BUILTINS + defineBuiltin（注册 API 已存在）+ 五演示 Agent（:759-807）+ 协议评测轨 + L2 双层遥测 + ARENA_EXCLUDED=[]。

**③-b 可注册化方案草案**：

- **形态 A｜内置 5 算法外部化**（移出 builtin-agents.js 成外挂数据/模块）：零需求（演示轨定位、无外部贡献者）；外挂化破坏零安装单文件演示能力（file:// 单文件主旅程）、无任何准入收益。*否决*。
- **形态 B｜第三方 Agent 代码运行期装载进页面**：v1 §3.3 四条论证原样成立且被冻结加固——(1) 信任边界反转（外来代码与页面内存内 truth 同特权，G0-DEC-11「UI 开关非安全边界」——盲面保证对外来代码全部失效）；(2) 评分完整性（scoreDiagnosis 同内存，score_hash 进程内无法自证未篡改）；(3) I-1 冲突（模块加载基础设施 = 不做清单明文排除）；(4) 协议 §1.2 自身指明的演进方向是「评测器独立进程形态」而非页面内装载。**八面叠加**：面⑤为冻结面——装载形态实质废止协议威胁模型 = 协议批准文本语义变更，按 §3.2 属 breaking（major + 五件套），在「任何可注册化方案不得要求 breaking」的任务约束下**直接出局**。*永久排除项维持*。
- **形态 C｜评测轨运营化**（协议 JSON 通道 + L2 + B-5 runbook——进程外）：已建成/在途（本波 S4）；与 TR-3 触发后的既定评估方向（评测器独立进程形态）一致。*推荐路径*。

**③-c 八面影响面**：形态 B = 面⑤语义 breaking + I-1/I-5 冲突；形态 A = 面①周边（agents 非八面承诺物，但 src/** 文案出扫描域问题同 I-5）；形态 C = 零代码面（运营项）+ additive（新规则代/新负例增补——「不得删减只可增补」纪律）。

**③-d additive 可行性判定**：新内置 Agent（仓内）= defineBuiltin additive 通道（接口契约冻结面稳定）；外部参与 = 协议轨（代码不进进程——协议设计的核心即此）。**判定：不做；TR-3 维持；进程内第三方代码装载维持永久排除项（任何触发条件下不重开，v1 §5.4 原文沿袭）**。

### 3.4 ④ FmuProvider（FMU 轨 provider 外挂——fc001 三层夹心通用化）

**④-a 现状硬编码点实读**（§2.4 全表）：通用件已占大头（createFromParts / golden-compare / fmu_admission / ADAPTERS 注册表 / V312 §10 钉 hash 台账）；FC 专项硬编码共六处（adapter 四处 + runner 两处 + bridge 端点一处）。

**④-b 可注册化方案草案**（FmuProvider 声明式形态——不定实现，仅形态候选）：

1. **provider manifest（数据）**：`{provider_id, model_id, golden_id, golden_payload_source, provenance, bridge_endpoint, pinned_sha256, tolerance_profile_id, admission_asserts}`——把 fc001-fmu-adapter.js 四处字面量与 fmu_runner.py 钉常量改为 manifest 驱动。
2. **通用 adapter 工厂** `createFmuProvider(manifest)`：现 fc001-fmu-adapter 参数化——validateGolden/probeBridge/bridgeRun 按 manifest 校验（golden_id/provenance/model_id/端点全部来自 manifest）；依赖注入形态原样保留（golden payload 注入 + fetchImpl 注入——现实现已 provider-ready）。
3. **runner 侧通用化** `run_shell(pin, shell_spec)`：run_fc001_shell 的钉校验 + 壳职责（传感污染/控制/残差/事件 pre/post 分裂）按轨参数化——**认知分离边界不变**（I-3：FMU 内核只出真值层输出，壳职责归 host——FC001_FMU_SPEC §1.1；第二轨壳职责差异归各自 G2b 批准）。
4. **bridge 端点约定** `/simulate-<provider_id>`：既有三端点零触碰 additive 新增。
5. **V312 §10 表数据化**：钉 hash 台账改表驱动——**钉的权威仍来自 CHG**（重钉须 CHG 纪律原样；表数据化只是载体形态，不改变「每工件一批准」语义）。

**关键边界（不可被注册机制吸收的部分）**：**G2b 各自另批（V312 B-4 / I-8）不可吸收**——每条 FMU 轨仍须独立 G2b 批准（方程冻结表/Run 矩阵/键面/parity 判据/Q 点全候选），provider 机制只作用于「批准后的实现装配」，不作用于「批准」本身；provenance 档位裁定、重钉 CHG、parity 步预算申报同样逐轨照付。

**④-c 八面影响面**：

| 面 | 影响 | 判定 |
|---|---|---|
| ② golden | 每条 FMU 轨新 golden（新 id——fc001_fmu_v1 先例 supersedes=null 并列轨；verify_golden MODELS 注册行 additive） | additive（数据增长不是 schema 变更——面②不在承诺内清单原文） |
| ⑤ provenance | `fmu_l1_lumped_unvalidated` 为显式 CHG 例外档（V312 §7 例外行 + Q2(A)）；第二轨同类物理可复用该档（语义同类：数值与实现自洽 only、未经实验/硬件验证——措辞纪律），新档位须显式 CHG | 机制不减免裁定义务；additive 通道已存在 |
| ⑦ 步账 | parity 步 additive（35→36 先例 + SKIP 语义 V312 §9⑥）；第二轨 parity = 并入或新增（预算制申报） | additive 载体已有先例 |
| ③ 场景键 | Q13(a) adapter 层绑定——FMU 轨不经场景新键（fc001_fmu 先例零新增键）；provider 机制维持该形态 | 零变化（面③零触碰延续） |
| ⑥ scope | createFromParts 强制 extension_preview 已通用 | 零改动 |
| ① plants 面 | 通用 provider 模块落 src/core/plants/** = plants 注册面 additive（V1_FACES §14 先例——适配器交付 additive 零消费面登记） | additive |
| ⑧ copy-guard | FMU 文案增词随落地轮（Q11 四词先例——词表单调不减） | additive |

**④-d additive 可行性判定**：**四维中唯一 additive 干净**——既有 fc001-fmu-adapter 可逐字节零触碰（通用 provider 为新增模块、旧适配器不迁移），bridge/runner 属 tools/**（非八面承诺物）additive，组装/比对/准入复用通用件。**但时点判定为缓做**：(1) I-8 已裁定 A-6 = 模式复刻——两实例之前建抽象违反「不为想象中的生态预付架构成本」（v1 R4 纪律），且第二实例本身是检验 manifest 字段面是否猜对的最佳样本（第一实例猜测的参数面未经第二例校验）；(2) fc001 全链位级验收面已冻结（R-G9-02 parity 0.0 全 5 Run 全 21 列全 601 点 + v1.10.1 桥侧 C Run ≡ golden 21 列逐位——V1_FACES §17/§18）——任何参数化重构都须以位级不变为验收锚，回归成本真实；(3) 复刻一次的成本 = 一套已模板化的流程（I-8「parity 0.0 纪律为模板约束」），低于通用化平台建设 + 每轨接入的总成本，直到轨数 ≥3 摊销点才可能反转（量级判断，非量化估算——局限见 §7）。**判定：缓做——A-6 第二实例（v1.12 实现轮）按 I-8 复刻交付后，以 RFC 重估通用 FmuProvider 层；若第三条 FMU 轨排程出现即触发（建议登记 TR-4，§5.4/§6）**。

---

## 4. additive-only 边界分析（逐维度判定）

### 4.0 判据（V1_FACES §3.2/§3.4 原文口径）

closed-world 面收窄 = breaking；哈希面变化 = breaking（既有合法输入的 scenarioHash/run_hash/config_hash/score_hash/content_checksum 输出值变化即 breaking——v1.0 起不再默认宽容）；门禁判据放宽 = breaking；移除公共 API 成员 = breaking；golden 语义级变更 = breaking（且字节冻结强于 semver）。additive = minor；additive 边界 = 不得改变既有合法输入的任何哈希输出、不得使既有 golden 复验结果变化、不得使既有 run-g2 步判据翻转。

### 4.1 file:// 单文件形态的技术硬约束（新增论证——四维共用）

主旅程发布工件 = FaultLab.html 单文件（file:// 直接可用——file-smoke 第 31 步 61 断言冒烟，tools/run-g2.mjs:133）；开发形态 = index.html 经 `<script>` 平铺装载 src/**；Node 测试经 tests/core-load.js CORE_FILES 同序装载。零构建（O-03/I-1）⇒ **没有 fetch/打包器/模块加载器**。推论：任何「启动期自动装载外部数据/代码」在本产品形态下**技术不可行**（file:// fetch 被浏览器阻断；引入打包器 = 破 I-1 不做清单明文项）。可选形态收窄为二：

1. **打包期内联**（内容进 src/** 经重打包入单文件）——等价于「PR 进源码」= 现行通道，插件机制无增量；
2. **用户显式文件输入**（FileReader 逐件导入 + 封闭校验）——= C-5 已有形态（场景信封导入 + 教学路径导入）。

该推论对四维的效力：①② 的「数据外挂」形态被直接否决（只剩 1/2 两种已存在形态）；③ 的代码装载形态被双重否决（技术 + 治理）；④ 不受影响——FMU 轨的通用化全部发生在 tools/**（bridge/runner，Node 侧）与 src/core/plants/**（.js 模块，走形态 1），不依赖外部文件装载。

### 4.2 逐维度 additive 判定表

| 维度 | 可在不动八面前提下落地的部分（= sanctioned additive 通道） | 本质 breaking / 被否决的部分 | 判定 |
|---|---|---|---|
| ① SystemDef | 新系统实例/新字段/新族/新信号 = PR 进 systems.js + CHG（MG-001 等五先例）；轨键枚举增长 = 显式 CHG 三处字面守卫（v1.6.0 先例） | 数据文件化装载 = I-1 技术否决 + I-5 机检失效；注册 API/分派 map 化 = 零收益且弱化 R-4/R-7 显式分支评审语义 | 机制本身无 additive 收益——不做 |
| ② ScenarioTemplate | 预设增长（teaching.js PR）；共享 = C-5（用户显式导入 = 逐例准入）；新轨键 = B-1a 显式键纪律（既有哈希零变化） | 启动期静默装载 = I-1 技术否决 + 错误形态退化；批量模板登记把 narrative 面常态化移出 copy-guard 域（I-5） | 机制本身无 additive 收益——不做 |
| ③ EvalAgent | 新内置 Agent = defineBuiltin（additive minor）；外部参与 = 协议轨 JSON 通道 + L2（进程外，零代码面运营项） | 页面内第三方代码装载 = 面⑤威胁模型反转（协议批准文本语义变更 = breaking）+ I-1/I-5 双冲突——永久排除项 | 代码装载形态本质 breaking——不做（永久排除维持） |
| ④ FmuProvider | 通用 provider 模块（plants 面 additive）；bridge/runner（tools/**）additive；golden 新 id/MODELS 注册行/provenance 复用或新档（显式 CHG）/parity 步（预算制）——全部有 additive 先例 | G2b 各自另批不可吸收（批准语义非机制面）；钉 hash 重钉/新 provenance 档/新步仍逐 CHG——机制不减免裁定义务 | **可 additive 落地**——但时点缓做（A-6 后 RFC 重估） |

### 4.3 边界结论

四个维度中三个（①②③）的「注册机制」在八面冻结后**既无必要**（additive 增长已有 sanctioned 通道且先例充分——§1.2-H-7/G-2）**也无收益**（准入义务零减免——H-3），其中代码/文件装载形态与 I-1 的冲突在 4.1 论证下升级为技术不可行、与 I-5/面⑤ 的冲突升级为实质 breaking；唯一同时满足「有真实需求信号 + additive 边界干净」的是 ④，其正确时点由 I-8（复刻优先）钉在 A-6 之后。**additive-only 边界不是本评估的障碍，而是本评估的答案**：它把「插件化 vs 现行通道」的权衡收敛为「现行通道已是 additive 通道」。

---

## 5. 成本/风险/推荐

### 5.1 逐维推荐与理由

**① SystemDef——不做。**
- 成本侧：机制建设（规格/装载校验/负例/门禁步/平台 CHG）> 收益（省「数组加一行」）；六项准入义务（G2b/物理实现/oracle-golden/exposure 验证轮/步账/copy-guard）零减免。
- 风险侧：形态 C 弱化 R-4/R-7 守卫评审语义（静默落 GT 兜底事故面）；形态 A 触发 I-5 机检失效。
- 现状风险为零：维持现状无新增风险面。TR-1 维持。

**② ScenarioTemplate——不做。**
- 成本侧：C-5 已把共享做成「文件即插件 + 导入即准入」——注册层无语义增量（v1 ②-b 论证原样成立）；B-1a 已把轨键演进做成冻结内 sanctioned 形态。
- 风险侧：启动期装载形态 = 带病运行/启动失败（错误形态退化）+ I-5 常态化缺口。
- TR-2 维持（触发后评估对象 = 声明式登记、导入/装载时校验、非静默）。

**③ EvalAgent——不做。**
- 成本侧：五算法外部化无需求（演示轨定位）；页面内装载需要模块加载基础设施 = I-1 冲突 + 平台级安全面建设。
- 风险侧：形态 B 直接废止协议 v2 威胁模型（面⑤语义 breaking）——任务约束（不得要求 breaking）下直接出局；外来文案出 copy-guard 域。
- 外部参与正道 = 评测轨运营化（B-5 runbook 本波在途——组织方流程，零代码面）。TR-3 维持；永久排除项维持。

**④ FmuProvider——缓做（A-6 第二实例落地后以 RFC 重估）。**
- 收益侧：真实需求信号（GT-001 FMU 草案本波在途 + V07 主线 A 排程 FMU 轨纵深）；通用件已占八成（§2.4）；缺口 = 六处 FC 专项字面量参数化；additive 干净（既有适配器零触碰路线存在）。
- 成本侧：通用化 = 平台规格 + manifest 字段面规格 + 负例 + 位级回归锚（R-G9-02 parity 0.0 冻结面）——一个 RFC 级工程；复刻一次 = 模板化流程（I-8 已立）。
- 风险侧：过早抽象把第一实例猜测的参数面固化（未经第二例校验）；rc 风险 = adapter 参数化引入 fc001 全链回归——以位级不变为验收锚可管控但不为零。
- 时点判据：A-6（v1.12）复刻交付后 → 两实例样本在位 → 通用化 RFC 重估；第三轨排程出现（TL-001/MG FMU 候选——C-6/C-7 评估面）→ 收益摊销点接近，触发 TR-4。

### 5.2 成本对照（沿 v1 §6 表式——V312 先例 × FmuProvider 维度更新）

| 项 | 现行通道（G2b + 模式复刻，I-8） | 通用化通道（FmuProvider 平台） |
|---|---|---|
| 平台建设成本 | 0（模板约束已立：oracle→golden→C99→parity→adapter→bridge 流程模板 + parity 0.0 纪律） | RFC 级工程：manifest 字段面规格 + 工厂 + runner/bridge 参数化 + 负例 + 位级回归锚 |
| 每轨边际成本 | 一次 G2b 全套（照付）+ 复刻六件套 + 钉 hash CHG + parity 步预算申报 + provenance 裁定 | 上述 G2b 全套**照付** + manifest 登记 + 接入兼容性审查 |
| 摊销判据 | — | 轨数 ≥3 且 manifest 字段面经第二例校验稳定后，量级上才可能反转（非量化估算） |

### 5.3 数据诚实性措辞纪律（本评估自身的措辞边界）

- fc001_fmu 轨一切表述沿用其批准语义：「数值与实现自洽 only」「未经实验/硬件验证」（model_provenance = fmu_l1_lumped_unvalidated 档位语义；adapter meta note 原文，fc001-fmu-adapter.js:134）——本评估不把 parity 0.0 表述为「模型验证」。
- 校验和/哈希一律表述为「内容一致性核对」，非签名/来源证明（scenario.js 信封自声明与 bundle.js provenance 原文口径）。
- B-5 runbook 就绪 ≠ 第三方 Agent 生态成立（§2.5-TR-3 措辞）。
- 「八成已存在」为量级描述（通用件 vs 专项件文件面占比的定性判断），非精确度量。

### 5.4 汇总推荐排序

```
④ FmuProvider   缓做   —— 唯一有真实需求信号（第二实例在途）+ 唯一 additive 干净；
                        A-6 复刻交付后 RFC 重估；TR-4（第三轨排程出现）为再触发条件
① SystemDef     不做   —— TR-1 维持；现行 PR+CHG 通道即 additive 通道（五先例）
② ScenarioTemplate 不做 —— TR-2 维持；C-5 + B-1a 双通道已覆盖共享与演进
③ EvalAgent     不做   —— TR-3 维持；协议轨 + L2 运营化为正道；进程内装载永久排除
```

排序说明：①②③ 均为「维持现状」，三者之间无执行序差异；排序按「未来触发重开评估的先验概率与收益」排列——① 最可能先出现需求信号（TL-001 输电线路 C-7 前研在途 = 潜在新系统 → 走的正是现行 G2b+PR 通道，触发 TR-1 的概率与「通道成为瓶颈」的概率都最高），② 次之（教学面放量），③ 最不可能（协议形态自身闭环、演进方向已内置于 §1.2）。④ 的排序地位来自「有活可干」而非「紧迫」——其执行窗口（v1.12 之后）与 ①②③ 的「不做」不存在资源竞争。

---

## 6. 裁定留白（用户裁定记录结构）

> 本节为裁定记录结构，**全部留白待用户裁定**；裁定结果由 Lead 登记（收口 S6 面）。
> 每项裁定生效须对应 CHG；本评估不预设任何一项已裁定。

| 编号 | 裁定项 | 选项 | 本评估推荐立场 | 用户裁定（留白） | 生效记录（留白：CHG/日期） | 后续动作入口 |
|---|---|---|---|---|---|---|
| R-D5V2-01 | 维度① SystemDef 可注册化 | A=维持不做（TR-1 沿袭）／B=立项登记形态 RFC（数据/注册 API/分派 map 三选）／C=其他 | A | ______ | ______ | 若 B：RFC + CHG（I-4 门禁） |
| R-D5V2-02 | 维度② ScenarioTemplate 可注册化 | A=维持不做（TR-2 + C-5 沿袭）／B=立项声明式登记 RFC／C=其他 | A | ______ | ______ | 若 B：RFC + CHG；评估对象限声明式、非启动期静默装载 |
| R-D5V2-03 | 维度③ EvalAgent 可注册化 + 永久排除项 | A=维持不做 + 进程内装载永久排除维持／B=重开（本评估明确不推荐）／C=其他 | A | ______ | ______ | 若重开：须先回答面⑤协议 breaking 义务（§3.3-形态 B） |
| R-D5V2-04 | 维度④ FmuProvider 时点 | A=缓做（A-6 复刻交付后 RFC 重估）／B=随 A-6 实现轮同轮评估／C=立即立项通用化 RFC（本评估不推荐——违反 I-8 复刻优先）／D=不做 | A | ______ | ______ | 若 A：TR-4 登记；若 C：RFC + 位级回归锚验收义务 |
| R-D5V2-05 | 触发条件台账继承 | A=沿袭 v1 TR-1/2/3 并增补 TR-4（第三条 FMU 轨排程出现 → FmuProvider 通用化 RFC 触发）／B=仅沿袭 TR-1/2/3／C=修订触发条件内容 | A | ______ | ______ | 台账登记（DECISIONS/NEXT 头注） |
| R-D5V2-06 | 本报告入档 | A=随 S6 收口归 evidence 台账 + NEXT 在位引用／B=仅 NEXT 在位 | A | ______ | ______ | S6 收口（CHG-20261118-09 预留） |

裁定纪律提示（沿既有治理惯例，非新增约束）：R-D5V2-04 的选项 C 若被采，须同步裁定位级回归验收锚（fc001_fmu 全链 parity 0.0 冻结面复验义务）与 A-6 排程冲突处置；R-D5V2-03 的选项 B 若被采，按 §3.3-形态 B 判定须走 major + 五件套（任务约束「不得要求 breaking」在该选项下失效——须显式确认）。

---

## 7. 评估方法、已执行核查与局限

**已执行核查（本评估实际执行——静态实读 + 行号定位）**：

- **N-1 全量实读**：v1 稿 392 行全文；V07_ROADMAP 123 行全文；docs/V1_FACES.md 733 行全文（含 §7 冻结执行记录 + §8-§18 全部 additive 修订记录）；src/core/registry.js 283 行全文；src/core/bundle.js 488 行全文；src/core/scenario.js 白名单常量区（:1-160）+ 轨键校验区（:380-500）+ 信封/执行区锚点；src/core/systems.js 头部（:1-115 构造辅助）+ 注册/API 尾区（:3150-3315）；src/core/engine.js simulate 分派区（:3060-3104）+ 各系统函数锚点（grep 定位逐条目检）；src/core/plants/{fc001,fc001-fmu-adapter,gt001}.js 全文；tools/backend/py/fmu_admission.py 155 行全文 + fmu_runner.py 关键面（:136/:183/:198-200）+ bridge.py 端点面；tools/backend/fl001-adapter.mjs 注册表面；tests/backend-admission.test.js 225 行全文；FL19_BACKEND_RFC_APPROVED 195 行全文；V312_BACKEND_ADMISSION_CHECKLIST 130 行全文；FC001_FMU_G2B_SPEC_APPROVED §0-§1.4；GT001_FMU_G2B_SPEC_DRAFT 头部（同波 S1 状态确认）。
- **N-2 行号定位复核**：关键断言逐条经 grep 定位后目检（engine 分派 :3082-3095、ALL :3182、EVENT_KEYS :52、B-1a 两段 :430-480、defineBuiltin :681-704、ARENA_EXCLUDED :110、FC_FMU_SHA256_PINNED :136、adapter 四硬编码 :23/:27/:64/:111、ADAPTERS :17-19、run-g2 36 步头注 :4）。
- **N-3 触发条件核查**：TR-1/2/3 现状以 V07 §1 对账行 + 同波 S1/S4 产出形态交叉确认（§2.5）。

**核查方式声明**：本波未执行 Node 运行期探针（区别于 v1 的 N-1 现场复核）——成员闸门动态性以 MG-001 落地零 scenario.js 成员改动先例 + knownSystemIds 动态派生现状（scenario.js:119-129）静态实证；不依赖运行时行为断言的结论均以代码字面 + 批准链文本双源支撑。

**局限**：

1. 本评估为文档评估——未做任何机制原型/摊销点量化（与「不定实现」性质一致）；FmuProvider「复刻 vs 通用化」成本对照为量级论证，非实现级测算（§5.2 已声明）。
2. 行号为 2026-11-18 工作区快照；同波 S1/S4 治理面文件仍在落盘，其行号以最终提交态复核为准（src/** 本波零改动，core 侧行号不受影响）。
3. 四维中 ①②③ 的判定承接 v1 论证（本文标注「原样成立/沿袭」处不再复写完整论证，指路 v1 对应节）；若 v1 论证前提被未来变更动摇（如 I-1 修订、copy-guard 扫描域扩张），相关判定须随触发条件重开。

---

## 8. 评估记录

- 结论：**维持 v1 主体结论（①②③ 不做，触发条件沿袭）+ 新增第 4 维判定（④ FmuProvider 缓做——A-6 后 RFC 重估）**；运行期代码装载永久排除项维持；additive-only 边界分析结论 = 现行 PR+CHG / C-5 / B-1a / G2b-复刻四通道即 sanctioned additive 通道，注册机制在四维中均无准入减免。
- 本文档性质：评估稿（D-5v2），不定实现；后续动作入口 = RFC（V07_ROADMAP.md:70 D-5v2 行门禁列「评估报告（RFC 级另批）」）+ §6 裁定留白逐项裁定。
- 授权链：V07_ROADMAP（CHG-20261118-07）→ V1120_WAVE_DESIGN（CHG-20261118-08，S3 名额）→ 收口 S6（CHG-20261118-09 预留）。
- 零代码触碰确认：本评估未修改 src/**、tests/**、tools/**、data/**、docs/**；唯一产出 = 本文件。

**文件结束**。D5_PLUGIN_ARCHITECTURE_ASSESSMENT_V2（2026-11-18，V07_ROADMAP D-5v2 / V1120 CHG-20261118-08 S3 评估稿）。
