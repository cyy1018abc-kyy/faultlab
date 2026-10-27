# FaultLab V0.2 G0 独立评审报告（CODEX_REVIEW）

> reviewer_id: codex-reviewer（独立上下文 Agent，按 V0.2 §13 任务书执行，非 OpenAI Codex 产品）
> reviewed_at: 2026-10-27T19:19:02+08:00（Asia/Shanghai；工作区文件快照时刻）
> inputs_sha256（`Get-FileHash -Algorithm SHA256` 实测；INPUT 副本与 F: 原文哈希一致）:
>
> - `FaultLab-evaluation/INPUT/V0.1_SPEC.md` = `5378D5EAEE82F52FB3E00023004309948362FADA90DD78F5F8DD6757078B4568`
> - `FaultLab-evaluation/INPUT/V0.2_PLAN.md` = `2123E4360B578EB9D76DDC987DF63128759F44B010701631F96120EBF9D21A18`
>
> independence: 未读取 CLAUDE_REVIEW.md；评审开始时 `FaultLab-evaluation/REVIEWS/` 为空。本报告不引用、不推测另一评审者的任何内容。
> workspace snapshot（只读观察，不构成对实现质量的背书）: `docs/CONTRACT.md` = `4777DC44…10DF66`（1048 行）、`src/core/protocol.js` = `AA5A0AF5…650D59`；另有 36 个非 .git 文件（19:19 快照），见本报告 §8。
> evidence legend: **【已验证事实】**= 直接读到的原文、文件系统事实，或本报告亲自完成的数学复算；**【工程判断】**= 基于工程经验的可辩护推断；**【未证实假设】**= 尚无证据、需 G1/G2 实测。

**评审方法（可复核）**

1. 完整阅读 V0.1 规格 350 行、V0.2 方案 590 行、`docs/CONTRACT.md` 1048 行、`src/core/protocol.js` 209 行、目录枚举与关键实现文件（`index.html`、`src/main.js`、`tools/oracle.py`、`docs/SCOPE.md` 等，只读）。
2. 用 PowerShell 双精度浮点独立复算 FL-001 的解析值、能量积分、SOC、残差，并**分别**用「解析积分」与「0.1 s 梯形积分」两种规则对照 V0.2 §5.3 金标准（附录 A）。这是本报告唯一"计算"证据来源，**未运行任何项目测试、未启动应用、未执行 git**。
3. 引用全部标注 V0.1/V0.2/CONTRACT 的 §号或表名；引文为原文精确摘录（引号内）。涉及"建议修改"的内容均写成可检验的验收条件。

**V0.2 §13 九项与本报告章节对照**：1→§1；2→§2；3→§4；4→§5；5→§6；6→§7；7→§9；8→§10；9→§11。另按任务要求单列：内部矛盾 §3、既有工程契约冲突 §8、独立复算 §12。

---

## 1. 总体结论

**结论：`CONDITIONAL GO`（有条件通过，不直接进入 G1/G2 的正式实现，先关闭 §2 的 8 条 P0 阻断项与 §3 的一致性缺陷）。**

### 1.1 能否以无需 MATLAB 的静态网站推出 L0 演示？

**能，而且这是正确的主路线；但"静态网站"目前还不是一个可验收的交付定义（见 E-08）。**

- 【已验证事实】V0.2 §2.3 明确成功标准第 1 条："能在无 MATLAB 环境下完成上面全流程，且无需注册、秘钥或外部 API。" V0.2 §4.1 约束："首版**本地可运行、无外部依赖服务**；不强依赖 MATLAB/Simulink、云端数据库或模型 API。" V0.2 §4.2 将"纯浏览器"列为 V0.1 首选。
- 【已验证事实】FL-001 是闭式解析模型：V0.2 §5.2 的 `I_true(t)`、`P=0.4I`、`SOC=60-100∫P/40/3600` 均可在任意现代浏览器内用 `Math.exp` 完成；单次运行仅 601 采样点 × 约 10–16 个信号（V0.2 §5.1/§6.1），算力与内存可忽略。
- 【已验证事实】本报告独立复算的 21.5 s、26 s、60 s 电流值、`E_bat=0.123889 kWh`、`SOC_true=59.690278%`、`SOC_err=-0.111111 pp` 与 V0.1 §1 表、V0.2 §5.3 表一致（附录 A）。物理内核本身不需要 MATLAB。
- 【工程判断】真正难点不是"能不能算"，而是"能不能证明算对了、算的是同一件事、导出后还能复核"。V0.2 的 L0 定位是正确的；风险在数据契约（§5）与验收判据（E-03/E-04/E-06/E-07），不在浏览器能力。

**前置条件（缺一不可）**：

1. **C1 独立 oracle 与 golden 固化**（E-04）：golden 由独立实现生成，浏览器引擎只做比对，CI 可一键复核。
2. **C2 事件 pre/post 与积分规则写进契约**（E-02/E-06）：20−/20+ 与 `E/SOC` 的积分规则、容差必须冻结。
3. **C3 导出/导入与哈希语义可执行**（E-03/E-07）：证据包能被第三方离线重算并核验。
4. **C4 真值暴露策略定死**（E-01）：本轮 demo 可公开真值，但 blind 投影与页面守卫必须在 P0 契约中出现。
5. **C5 交付形态明确**（E-08）：是"静态托管 http 打开"还是"双击 `file://` 单文件"；两者的构建与测试不同。
6. **C6 范围裁定**（E-05/§8）：以 FL-001 五页面 + 三固定 Run 为 P0；三系统/Arena 的既有实现须书面降级为扩展或另行立项。

### 1.2 为什么不是 GO、也不是 NO-GO

| 判定 | 是否成立 | 依据 |
|---|---|---|
| `GO` | **不成立** | V0.2 §3 的 G0 退出条件是"无未裁定的 P0 阻断问题"；而 §15.3 自己列出的"V0.1 最小可发布闭环到底包含哪些功能？""哪些页面允许看到物理真值、哪些未来必须隔离？"至今没有文档级答案，数据契约缺 4 个关键对象（§5.1）。 |
| `NO-GO` | **不成立** | 未发现物理公式/单位/金标准数值错误（附录 A 逐项复算一致）；未发现私有资产进入公开范围的证据（V0.2 §10 有明确禁止条款）；静态 L0 演示在技术上可行。按 V0.2 §15.1"评分不能平均掉 P0 物理错误"，本项无触发。 |
| `CONDITIONAL GO` | **采纳** | 产品定位、物理模型、页面规格、测试意识均达到可推进水平；阻断集中在数据契约与验收可执行性，属于"补文档 + 定口径"即可关闭的问题，不需要推翻方案。 |

### 1.3 G0 通过的最小条件（建议 Lead 逐条勾选后再放行 G1/G2）

- [ ] 在 `DECISIONS.md` 中书面裁定 D-01…D-08，并同步修正 §3 的 I-01…I-07。
- [ ] 冻结"最小 P0 闭环"（§7.2），G3 的 DoD 改为**一条垂直切片**而不是 16 个 P0 任务全量。
- [ ] `DATA_CONTRACT_SPEC.md` 补齐：DerivedMetric、EventSnapshot pre/post 编码、canonicalization/hash、EvidenceBundle/Import、signal exposure、P_load_demand/served 双信号（§5、§8）。
- [ ] `MODEL_VALIDATION_SPEC.md` 写明独立 oracle 的语言、路径、命令、golden 文件、比对容差（E-04）。
- [ ] 明确交付形态与技术栈（零构建 vs Vite；`http` vs `file://`），并处理 §8 的既有实现冲突（含"是否继续并行编码"的书面结论）。
- [ ] 事件时刻判定写入验收：导出件中 20.0 s 行 = post、pre 左极限在 events 文件、图表不得平滑（E-02）。

---

## 2. P0 阻断项（E-01…E-08）

> 判定口径：**阻断** = 在它关闭前，G1/G2/G3 的"通过/不通过"无法被客观判定，或关闭成本会随实现推进指数上升。每条标注问题类型：`[文档错误]`= 文档自身写错/写漏；`[待决策]`= 需要人裁定而非改字；`[契约缺失]`= 方案未定义必要对象/字段。

### E-01 数据契约没有"真值暴露分级 / 盲测投影"，而产品承诺未来要做真值隔离 —— `[契约缺失]+[待决策]`

- **原文位置**：V0.1 §6.3；V0.1 §9 数据保护规则；V0.2 §6.1 `TimeSeries` 行；V0.2 §15.3。
- **原文引文**：V0.1 §6.3："演示模式可公开真值；未来盲诊断模式必须阻断与真值相关的节点、工具响应与深链 URL。" V0.1 §9："真实状态与公开演示观测分开存储或分开授权；演示界面能主动展示真值，不意味着未来盲评 API 也能访问。" V0.2 §6.1 对 `TimeSeries` 只写"time_s + 逐变量列，排序且时间单调，含 meta 引用"。
- **问题本质**：P0 的 Run 对象把 `MODEL_STATE`（真值）、`OBSERVATION`（测量）、`FAULT_EVENT`（故障配置）放在同一张表、同一个 JSON 里；`SignalCatalog` 有 `source_kind` 但没有"该信号对谁可见"的字段，也没有 `project(run, level)` 的纯函数定义。架构 A（纯浏览器）下，运行期 `truthSealed` 之类的开关不是安全边界：用户可打开开发者工具、读源码、用同一 config 重算真值。
- **为什么阻断**：这不是"P2 才需要"的问题。若 P0 数据模型就按"全量 Run 直接进页面"实现，未来盲诊断要么改 Run/信号契约和全部页面（破坏性迁移），要么只能退化为"演示模式 + 口头承诺"。V0.2 §8 FL-20 已把 Agent Arena 列为 P2，但 §15.3 要求 G0 就回答"哪些页面允许看到真值"，说明该边界必须现在确定。
- **修改建议（可检验）**：
  1. `SignalCatalog` 增加 `exposure: 'public_demo'|'blind_observable'|'truth_only'`（或等价的 `blindVisible`+`truth:true` 双字段），并规定 `source_kind=MODEL_STATE|FAULT_EVENT` 默认 `truth_only`。
  2. 定义 `run.project('demo')` / `run.project('blind')` 纯函数：blind 输出只允许含 `blind_observable` 信号、时间轴、单位、事件"已脱敏"标记；禁止含 `config.fault`、`bias_A`、`*_true_*`、`*_cap*`。
  3. 验收：对三个 Run 各生成 blind 投影，递归扫描 JSON key/value，断言零命中真值字段清单；页面 blind 模式下三类真值页（因果/对比/曲线真值层）路由被守卫拦截并有说明。
  4. 在 README/UI 固定文案："演示模式展示真值；盲测模式仅接收观测投影；hash ≠ 签名"。

### E-02 20−/20+ 的存储与交换表达未闭合，且与 601 点常规网格共存时无唯一编码 —— `[文档错误]`

- **原文位置**：V0.2 §1.2 R-01；§5.4 事件前/后表达约定；§6.1 `EventSnapshot` 行；§6.3 证据包 `timeseries.csv`。
- **原文引文**：V0.2 §1.2 R-01："**R-01：不连续事件时刻。** `t=20−` 与 `t=20+` 是同一物理时刻的两个事件相位。……**建议单独存 `event_snapshots` 的 pre/post**，常规采样网格默认取 post，图表以阶跃图绘制，数据导出同时携带事件文件。" V0.2 §5.4："常规时钟：`0.0,0.1,…,60.0 s` 共 601 个**常规采样点**，20.0s 行作为 `post`。"
- **问题本质**：R-01 用"建议"书写，未被 §6.1 的 `EventSnapshot` 字段定义吸收：该对象只列 `event_id, time_s, phase(pre/post), signal_values, fault_id`，没有说明 pre 的 `time_s` 是 20.0（左极限）还是 19.9（上一采样点）、主键是否 `(event_id, phase)`、`signal_values` 的单位/变量命名、以及 `timeseries.csv` 第 20.0 s 行与 pre 记录的关系。实现者完全可以合法地选择 19.9（工作区 CONTRACT §5.1 就写"pre@19.9"），这会让两个"符合规格"的实现在同一证据包的字节与数值上不一致。
- **为什么阻断**：G2 门禁要求"事件语义"通过；V0.1 UX-02（19.9→20.0 测量从 25 A 跳到 35 A、真实连续）、PHY-02/PHY-03 都依赖它；V0.2 §9.3 又要求"导出后再导入，哈希核对、指标一致"——pre 相位没有确定编码，这条测试无法编写。
- **修改建议（可检验）**：
  1. 冻结 `EventSnapshot { event_id, phase:'pre'|'post', t_s:20.0, derivation:'left_limit'|'post_sample', variables:{signal_id:value}, units:{...} }`，主键 `(event_id, phase)`；明确 pre 的 `t_s` 恒为事件时刻，`19.9` 只作为"上一常规采样点"单独查询，不叫 pre。
  2. 导出契约写死：`timeseries.csv` 的 20.0 s 行 = post 值；`events.json` 必须含 pre 左极限与 post；两处值冲突时以 events 的 phase 为准并在 `manifest.json` 记录 `event_encoding_version`。
  3. 验收：解析导出包后断言 `pre.I_bat_meas_A=25`、`post.I_bat_meas_A=35`、CSV 20.0 行=35；图表渲染测试断言测量序列在 x=20.0 处有两个不同 y 点（阶跃）且无平滑插值。

### E-03 哈希语义不可执行：无运行内容哈希、无规范化规则、config_hash 不绑定结果 —— `[契约缺失]`

- **原文位置**：V0.2 §4.4 哈希；§6.2 不可变运行原则第 2 条；§6.3 `SHA256SUMS.txt`；§9.3；V0.1 UX-10。
- **原文引文**：V0.2 §4.4："哈希：规范化序列化后计算 SHA-256；记录 Hash 口径、字段排序、浮点序列化规则。**不暗示第三方认证**。" V0.2 §6.2："`Config` 正规化后生成 `config_hash`；运行结果与 `engine_version`、`model_hash` 同时绑定。" V0.1 UX-10："通过记录的模型和配置哈希可核验来源，数值与原运行一致"。
- **问题本质**：(a) 只有 `config_hash`/`model_hash`，**没有 timeseries/metrics/checks 的内容哈希**，无法证明"导出的数字就是当时算出的数字"；(b) "规范化序列化"只说要记录，没有给出规则（键排序、数字格式、`-0`、NaN/Infinity、指数写法、Unicode），跨实现/跨语言不可复现；(c) `model_hash` 的哈希对象未定义（模型清单？方程文本？引擎代码？）；(d) `SHA256SUMS.txt` 是文件级校验，但 CSV 是文本重生成物，未定精度/换行/编码，重复导出可能不同字节；(e) V0.1 UX-10 说哈希可"核验来源"，这在语义上高于哈希能力（哈希只证明内容一致，不证明来源/作者），需要改文案。
- **为什么阻断**：V0.2 的差异化卖点就是"可核查证据"（§6.3、§17）。若哈希语义不冻结，G4 的"完整导出、重载"、§9.3 的"改一行 CSV 应失败"、V0.1 UX-10 均无法判定；并且一旦先实现导出格式，哈希口径会被实现反向固化。
- **修改建议（可检验）**：
  1. 写 `Canonicalization v1`：对象键按 Unicode 码点升序；数字只用 ECMAScript `Number::toString` 最短往返表示；禁止 NaN/±Infinity；`-0` 规范为 `0`；字符串不做 NFC；时间统一用十进制秒（最多 3 位小数）；数组保序。
  2. 定义 `run_hash = SHA256(canonical_json({bundle_schema_version, config_hash, model_hash, engine_version, t, signals, events, metrics, checks}))`；`created_at` 明确排除在哈希之外。`EvidenceBundle` 的 `manifest.json` 记录 `run_hash` 与每文件 SHA-256。
  3. 验收：同一 Run 导出两次 → 文件字节与哈希一致；导入后重算 `run_hash` 一致；改 CSV 一行 → 失败；UI 文案改为"内容校验和（不代表签名或第三方认证）"。
  4. 明确 `model_hash` 的哈希对象：`ModelManifest` 规范化 JSON + 方程 `equation_id` 列表 + `engine_version`，不含 UI 文案。

### E-04 独立数值预言机无落点、无独立性判据，G2 门禁不可客观判定 —— `[待决策]+[契约缺失]`

- **原文位置**：V0.2 §4.2 架构建议；§3 G2 门禁条件；§5.5；§8 FL-03；§12 退出条件。
- **原文引文**：V0.2 §4.2："必须设立“独立数值预言机”：可用数学闭式解与一套独立的 Python 检查脚本或外部参考表对浏览器计算结果交叉核对。不能仅以同一段 TypeScript 代码计算并自我断言作为物理验证。" V0.2 §3 G2 条件："独立计算结果在约定容差内一致"。V0.2 §12："如果独立黄金样例不能复核模型曲线、SOC 与积分，**不进入 G3**。"
- **问题本质**："独立"没有定义——独立语言？独立仓库？独立作者？不 import 前端 engine 模块？§8 的 FL-03 只写"Golden Data 与独立参考检查"，没有交付物路径、命令、格式、生成权属、容差数值；§8 也没有任何"oracle"条目（架构建议与任务拆分脱节）。最坏情况下，golden 由 browser engine 自身生成，然后"比对通过"，构成自我断言。
- **为什么阻断**：G0 的核心产出之一就是确认"物理可复核"；G2 的完成定义若不写明 oracle 与 golden 的落点，评审无法判断它是否通过，§12 的退出条件永远不触发也不可审计。
- **修改建议（可检验）**：
  1. 新增 P0 任务 `FL-03a 独立 oracle`：Python 3 标准库（或独立 JS 实现，不得 import 应用 engine）→ 输入固定参数表 → 输出 `data/golden/fl001_v1.json`（含每个黄金时刻值、积分、SOC、单位、方法 id、容差、生成命令、oracle 源码哈希）。
  2. golden 只由 oracle 生成/修订；浏览器 engine 只读比对；`engine_version` 变化触发重新比对。
  3. CI/本地命令冻结：`python tools/oracle.py --json` 生成 → `node tests/core.test.js` 比对（容差表在 golden 内）。
  4. 验收：删除或篡改前端 engine 不影响 golden；两套实现的公式常量不得共享同一文件；附录 A 这类"手算点"至少 3 个作为第二重交叉。

### E-05 "最小 P0 闭环"未定义，16 个 P0 任务没有切割与可延期性 —— `[待决策]`

- **原文位置**：V0.2 §15.3 第一问；§8 P0/P1 任务表（FL-00…FL-15 全部 P0）；§3 阶段路线；§0.2 D-04。
- **原文引文**：V0.2 §15.3："“V0.1 最小可发布闭环”到底包含哪些功能？" V0.2 §3："如果资源有限，先做 `G0 → G2 的可验证数值内核 → G1 的关键交互原型 → G3`。" V0.2 §8 表：FL-00…FL-15 共 16 项标为 P0，含五页面高保真原型、设计系统、完整自动化与 README。
- **问题本质**：文档把"最小闭环"作为评审必须回答的问题，却没有给出候选答案；同时 §8 把所有工作都标成 P0（含 G1 的原型与设计系统），使"P0/P1 划分"在任务层失去区分度。§3 给出"资源有限时"的替代路线，但没有把它写成门禁条令，也没说明哪些 P0 任务可延后。结果是 G0 要在没有候选范围的情况下裁定范围，G3 也没有"最小"验收口径。
- **为什么阻断**：G0 退出条件是"无未裁定的 P0 阻断问题"且需明确 P0/P1；按现状，任何团队都能声称"我在做 P0"，无法判断是否范围膨胀（V0.2 §0 自己警告"好看的演示"风险）。
- **修改建议（可检验）**：给出三级划分并写进 `BACKLOG_APPROVED.md`：
  - **P0a（G3 必需，≤8 项）**：FL-01 模型说明、FL-02 Schema、FL-03/03a golden+oracle、FL-06 RunRegistry、FL-07 engine、FL-08 单时钟/事件、FL-10 曲线、FL-13 导出重载；外加 FL-04 的最小五视图只读骨架。
  - **P0b（G4 质量，可与 P0a 并行）**：FL-05 最小键盘/焦点/表格模式、FL-09 拓扑检查器、FL-11 因果证据、FL-12 三组对照、FL-14 测试矩阵子集、FL-15 README。
  - **P1**：FL-16 参数编辑、FL-17 HTML 报告、FL-18 移动端；**P2**：FL-19/FL-20。
  - G3 的 DoD 改写成："1 个系统 × 3 个固定 Run × 5 个视图 × 可导出/重载的证据包"；其余由 G4 承接。

### E-06 核心契约缺 `DerivedMetric` 对象，`metrics.json` 无 schema，积分规则未定 —— `[契约缺失]+[待决策]`

- **原文位置**：V0.2 §6.1 核心对象表（ScenarioConfig/ModelManifest/RunManifest/SignalCatalog/TimeSeries/EventSnapshot/QualityChecks/EvidenceLink/ComparisonResult）；§6.3 `metrics.json`；§5.5 PHY-06/PHY-07；§5.3 金标准；V0.1 §7.3/§7.2。
- **原文引文**：V0.2 §6.3 证据包："`metrics.json              # 可复查的积分指标`"；但 §6.1 的 9 个对象中没有 Metric/DerivedMetric。V0.2 §5.5 PHY-06："`E_gen + E_bat = E_served=0.5kWh`，在一致积分规则/容差下通过"——未给规则与容差数值。V0.1 §7.2："缺失数据时显示「不可用」，不填 0"。
- **问题本质**：指标是这套演示的说服力核心（0.123889 kWh、`-0.111111 pp`），但契约没有字段承载：`method`（解析/梯形/子步）、`time_window`、`source_run_ids`、`source_signal_ids`、`unavailable_reason`。更严重的是**积分规则未定义**：本报告独立复算（附录 A）显示，0.1 s 梯形积分与解析积分相比，`SOC_est` 末值差 **1.40×10⁻⁴ pp**、`SOC_err` 差 **1.39×10⁻⁴ pp**、`E_bat` 差 **6.17×10⁻⁷ kWh**；若 `core.test.js` 按典型 `1e-6` 容差断言 V0.2 §5.3 的 `-0.111111 pp`，梯形实现会直接失败。V0.2 现行文本无法裁决谁对。
- **为什么阻断**：G2/G4 的指标验收、对比页指标卡、`metrics.json` 的第三方复核全部依赖积分规则；V0.2 §5.3 的"金标准"目前是"解析值"，而实现很可能对采样序列做梯形积分，两者不统一就会产出互相矛盾的"正确结果"。
- **修改建议（可检验）**：
  1. 增加 `DerivedMetric { metric_id, label, value|null, unit, precision, time_window_s:[0,60], method:'analytic_flux'|'trapezoid'|'substep', method_version, source_signal_ids, source_run_ids, unavailable_reason }`；`metrics.json` 带 `metric_schema_version`。
  2. 规定 FL-001 的 E/SOC 指标用**解析积分或事件分段的 dt=0.01 子步**，容差写死（建议 `E` ±1e-6 kWh、`SOC` ±1e-5 pp），并在 §5.3 表上增加 `method_id` 列。
  3. 补充 `value:null + unavailable:true` 的语义（V0.1 §7.2 要求），UI 禁止把缺失填 0。
  4. 验收：每个指标有 method_id；改积分规则必须重建 golden 并升 `method_version`；解析与梯形两套结果都被记录（后者仅作敏感性证明，不作金标准）。
- **补充证据**：工作区 `tools/oracle.py` 明确采用 0.1 s 梯形（源码注释 "Trapezoidal integral on the 0.1 s grid"），其规则与 V0.2 §5.3 的解析金标准已出现上述偏差（详见 §8 的 C-05）。

### E-07 导出/导入缺导入侧契约、版本迁移与不可信输入处理 —— `[契约缺失]`

- **原文位置**：V0.2 §9.3；§8 FL-13；§4.4 Schema；§6.2 原则 3/6；§6.3 目录。
- **原文引文**：V0.2 §9.3："同一个 Run 的原始数据导出后再导入，哈希核对、指标一致。" V0.2 §8 FL-13："CSV/JSON 证据导出与重载 | FL-02/FL-12 | 导出后重载一致，SHA256可核对"。V0.2 §4.4："Schema：JSON Schema 或类型定义 + 运行时校验；配合版本化迁移策略，避免只有 TypeScript 类型而没有导入检查。"
- **问题本质**：全文没有任何 `ImportBundle`/`loadRun` 契约：不知道导入哪些文件、如何对应 schema 版本、遇到未知字段/缺失文件/版本过新如何处理、导入后是否重算指标并与 `metrics.json` 比对、导入 Run 的 `role`/`provenance_tier` 如何标记、失败时如何不覆盖当前 Run。另外导入数据会进入自包含 HTML 报告（P1）与页面文本，未定义转义/长度/大小限制，存在注入与 DoS 面。`§9.3` 的"改一行应失败"依赖 E-03 的哈希规则，未冻结前不可实现。
- **为什么阻断**："可离线复核"是 V0.2 对外的核心承诺（§6.3、§17 "一键数值复核"、G4 "完整导出、重载"）。没有导入契约，第三方只能"看"导出包而不能"核"；且导出格式一旦实现就会变成事实标准，后补导入会被迫兼容早期 bug。
- **修改建议（可检验）**：
  1. 定义 `EvidenceBundle v1`：`manifest.json`（`bundle_schema_version`、`run_hash`、`supported_versions`、`files:[{path, sha256, bytes}]`）+ `config.json`/`model_manifest.json`/`timeseries.csv`/`events.json`/`metrics.json`/`checks.json`。
  2. 导入流程：schema 校验 → 文件哈希 → 反序列化 → **重算 metrics/checks** → 与 `run_hash` 比对 → 标注 `role:'imported'`、不覆盖现有 Run；版本不支持时给可读错误。
  3. 输入防护：字段长度上限、行/点数上限、JSON 深度上限、所有渲染走 `textContent`、HTML 报告生成统一转义。
  4. 负例测试：缺文件、坏哈希、旧/新 schema、未知字段、超大文件、注入字符串、纳秒/NaN、时间非单调，共 ≥8 条，全部给出中文可读错误。

### E-08 "本地可运行、无外部依赖"与工具链、交付形态未定界 —— `[文档错误]+[待决策]`

- **原文位置**：V0.2 §4.1；§4.2 方案 A 的"一键打开、静态托管"；§4.4 工具；§10。
- **原文引文**：V0.2 §4.1："首版**本地可运行、无外部依赖服务**；不强依赖 MATLAB/Simulink、云端数据库或模型 API。" V0.2 §4.4："UI：**React + TypeScript + Vite**……测试：数值单元测试 + **Playwright** 真实浏览器端到端测试。" V0.2 §4.2 对 A 的描述："一键打开、静态托管、无后端运行成本"。
- **问题本质**：约束没有区分 **runtime** 与 **dev-time**：React/Vite/TypeScript/Playwright 需要 Node/npm，Playwright 还要下载浏览器二进制，均需网络安装；这与"本地可运行、无外部依赖服务"的字面承诺冲突（应改写成"运行期无外部服务；开发期允许受控依赖"）。同时"一键打开"与 Vite 的构建步骤矛盾：源码不能直接双击；若承诺 `file://` 双击，则 `<script type="module">` 受 CORS 限制、`fetch()` 读本地 JSON 失败，必须单文件内联或全量内嵌数据。Windows 开发环境（本工作区即 Windows，路径含空格与破折号）也未出现在支持矩阵中。
- **为什么阻断**：G3 的交付验收"能在空白环境中走通 FL-001"（§3）与 G5 的"公开 Demo"都需要一个唯一的交付形态定义；如果到 G3 才发现需要单文件内联或改数据加载方式，成本与测试返工很大。
- **修改建议（可检验）**：
  1. §4.1 拆成"运行期约束"（无网络请求、无后端、确定性）与"开发期约束"（Node ≥ LTS、pnpm/npm、Playwright 版本、依赖白名单与 lockfile）。
  2. 定义两个交付物：**P0 = `dist/` 静态目录 + 任意静态服务器（含 `python -m http.server`）打开**；**P1 = `FaultLab.html` 单文件双击可用**（内联全部 CSS/JS/数据，经典脚本，不用 ES module）。
  3. 支持矩阵写 Windows 10/11 + Chrome/Edge 最近两个大版本；列出已知限制（路径含空格可用、BOM、CRLF、Chrome 安装路径）。
  4. 验收：在无网络、全新用户目录、Windows 下按 README 步骤打开并完成主旅程；P1 单文件在 `file://` 下完成同样旅程。

---

## 3. V0.2 内部矛盾与跨文档矛盾（I-01…I-07）

> 任务要求：V0.2 若存在内部矛盾（如 R-08 与 §2.3/§8 的 P0 范围、§4.4 与 §4.1 的约束、§6/§9 验收与 P1 关系）必须编号列出。以下每条给出位置、性质与修订建议；不要把它们当作 P0 重复计数，它们多属"文档一致性"问题，但会使 G0 的裁定对象含糊。

| ID | 位置 A | 位置 B | 矛盾/问题描述 | 性质 | 修订建议 |
|---|---|---|---|---|---|
| I-01 | §1.2 R-08："需要评审决定是否提升 P0" | §0.2 D-04："建议**提升为 P0**"；§2.3 成功标准第 5 条；§8 FL-12（P0）与 §8.1 依赖图 | 同一文件里"是否升 P0"仍写作待决，但其他章节已把"仅监测 Run"当作 P0 的既定依赖；V0.1 §12 又把"仅监测模式对照"列为 P1。 | 文档状态不一致（非技术矛盾） | 在 D-04 标注"建议通过，待 G0 确认"；R-08 改为"已建议提升，见 D-04/DECISIONS"，并在 DECISIONS 中记录对 V0.1 §12 的覆盖。 |
| I-02 | §4.1："首版本地可运行、无外部依赖服务" | §4.4：React/Vite/Playwright/npm 工具链；§4.2 A："一键打开" | runtime 与 dev-time 未区分；"一键打开"与构建步骤未对齐。 | 文档表述不精确（承接 E-08） | 按 E-08 拆成运行期/开发期两段，并给出交付物定义。 |
| I-03 | §1.2 R-05："本例二者同为 30 kW；数据契约必须将其分开" | §5.2 方程只定义 `P_gen,true/P_bat,true/P_load,served`，未定义 `P_load_demand`；§6.1 `TimeSeries` 未列字段；§5.3 直接用 30 kW 常量 | R-05 的建议没有落入 §5.2/§6.1 的契约文本，扩展"供电不足"时会不兼容。 | 文档内部不一致（建议未落实） | 显式增加 `P_load_demand_kW`（`CONFIG`）与 `P_load_served_kW`（`MODEL_STATE`）双信号；FL-001 两者相等，`load_step` 故障后才不等；PHY 检查覆盖。 |
| I-04 | §1.2 R-06："需要区分 `consistency_check_passed`、`model_validated_against_experiment`、`real_hardware_verified` 等不同证据等级，后两者……只能是 `not_performed`" | §6.1 `RunManifest` 只有 `status` 与单个 `provenance_tier`；§6.1 注："另增 `provenance_tier` 表示 `analytical_demo`……" | 三级证据等级没有对应字段；`provenance_tier` 描述的是"模型来源"，不能同时表达"内部检查通过/模型未验证/硬件未验证"。 | 契约与建议不一致 | `RunManifest` 增加 `verification: { consistency_checks:'pass' 或 'fail', model_validation:'not_performed', hardware_validation:'not_performed' }`；UI 三个标签分开显示，避免一个"可信度"标签混合语义。 |
| I-05 | §9.1："dt 从 0.1s 改变时输出采样与积分机制的正确性（若 P1 开放 dt，要求重建金标准）" | §8 P1 只有 FL-16（幅值/触发时间）、FL-17（报告）、FL-18（移动端），**没有 dt 相关任务** | 条件触发的验收项没有对应任务与 owner，属于悬空要求。 | 验收与 P1 关系不一致 | 要么删除"若 P1 开放 dt"，要么新增 FL-16b（P1，打开 dt 并重建 golden），并在 FL-02 写清 dt 可配置边界。 |
| I-06 | §3："G1 和 G2 可以并行探索，但 **G3 正式集成依赖已冻结的 G2 数据契约**" | §17："首先锁定模型/事件/Run 数据契约与黄金样例；**其后再绑定页面实时交互**"；§7.3 原型状态切片却要求显示具体数值（"t=26s：闭环真实约15.183A……"）；G1 门禁要求"未伪造模型结果" | 并行/串行两种说法并存；G1 高保真原型若显示具体数字，在 G2 冻结前就是"预设/占位"，与"未伪造模型结果"判据有张力。 | 流程与门禁判据含糊 | 明确：G1 原型所有数值必须打 `PRESET/未验证` 标签或来自已冻结 golden；G1 可与 G2 并行，但 G1 不得作为 G3 数据源；G3 前必须过 G2。 |
| I-07 | §4.1："G0 先选择架构，不应由于熟悉某个框架而直接定案" | §4.2 对比表已写"V0.1 首选"（方案 A）；§4.3 已按 A 列组件边界；§4.4 已写 React/Vite/ECharts/Playwright | 架构与工具在"待评审文件"中被事实性预选，评审空间被压缩；这与 §4.1 的程序承诺不一致。 | 流程性矛盾 | 把 §4.2 的"建议"降为"候选结论，待 G0 决议"；§4.3/§4.4 标注"若采纳 A"；DECISIONS 记录选择理由与备选。 |

**跨文档术语/文案漂移（低严重度，但会被验收误用）**：V0.1 §3.2 主按钮为"「开始实验」"，V0.2 §2.2 写"点击「进入实验」"；V0.1 §12 把"仅监测模式对照"列为 P1，V0.2 实际按 P0 依赖它（见 I-01）。建议在 `DECISIONS.md` 统一术语表并标注"V0.2 覆盖 V0.1 的条款"。


## 4. 架构 A/B/C 对比

### 4.1 对比表

| 维度 | A 纯浏览器（推荐主选） | B Python API + Web | C 纯 Python UI（Streamlit/Gradio 类） |
|---|---|---|---|
| 部署/分发 | 静态托管或本地静态服务器；可做单文件 `file://`（需经典脚本/内联）；零后端运维。【工程判断】 | 需进程/端口/CORS/日志/版本；离线可 `localhost` 但需 Python 环境；部署与运维面更大。 | 单 Python 进程，内部演示最快；但用户需 Python 环境；不适合公开静态 Demo。 |
| 测试 | Node/浏览器单测 + Playwright E2E；确定性好；oracle 在仓库外的 Python/独立脚本中运行。【工程判断】 | pytest 数值测试天然独立（与前端不同语言/进程）；跨进程确定性需固定环境；E2E 仍要浏览器。 | 数值测试容易；UI 交互（拓扑拖拽、时间线游标、阶跃）精细测试困难，Streamlit 的 rerun 模型与"播放"语义冲突。 |
| 模型扩展 | 新模型 = 新纯函数模块 + 重新打包；扩展受客户端体积/性能约束；P2 多系统会增大包体。 | Python/NumPy/SciPy 生态、Simulink/FMU 适配最自然；接口契约清晰；但需服务协议版本化。 | Python 生态最顺；扩展后交互仍受 UI 框架限制。 |
| **真值防泄露** | **结构性弱项**：所有数据与代码在客户端；`truthSealed` 只是 UI 开关，可通过 DevTools/重算绕过。只适合"演示公开真值"；未来盲测须把场景配置与真值都移出客户端（预生成盲包）。 | **强项**：服务端持有真值/配置，只下发观测投影；可审计、可限流；适合未来盲诊断与 Agent Arena。 | 与 B 类似（进程内可隔离），但若直接 stream 计算结果到前端，仍可能暴露未投影真值；实现需自律。 |
| 数据可复现 | 同一浏览器/引擎版本下确定性可复现；需把 `engine_version`/`model_hash`/`run_hash` 写进证据包；跨浏览器浮点一致性需测试（ECMAScript 数字语义一致，但显示/序列化需规范）。【工程判断】 | 可在服务端固定依赖版本与镜像；证据包由服务端生成，一致性更强；但环境漂移风险转移到部署。 | 服务端生成较可控；但 UI 状态与数据状态耦合，导出"当时看到的结果"需额外设计。 |
| 成本与代价 | 开发/测试成本集中在数值正确性与图表/无障碍；无服务器成本；适合 G3/G5 快速公开。【工程判断】 | 开发+运维成本显著更高（服务、日志、部署、CORS、版本）；对 L0 演示是过度设计（V0.2 §4.2 亦如此判断）。 | 开发最快，但前端交互上限低；公开演示体验不达标；适合内部验证。 |
| 离线承诺 | 最匹配 V0.2 §4.1；单文件构建可满足"双击可用"（P1）。 | 需打包 Python 环境；"无 MATLAB 离线"可满足，但"无安装"难。 | 需 Python；与"静态网站"目标不符。 |

### 4.2 推荐：A 主选 + B 后备（与 V0.2 §4.2 一致，但附条件）

- **V0.1 主选 A（纯浏览器）**：【工程判断】理由：L0 解析模型规模小、无 MATLAB/无服务端需求、静态部署最匹配"演示优先"、公开门槛最低；V0.2 §2.3/§4.1/§4.2 的定位正确。
- **后备 B（Python API + Web）**：【工程判断】触发条件（满足任一即重评架构，而不是等到 P2）：
  1. 盲诊断/Agent Arena 从 P2 升为 P0（真值隔离在 A 中不可强保证）；
  2. 需要接入真实数值求解器/Python/Simulink/FMU（V0.2 FL-19）；
  3. 需要可信审计、服务端签名或多人共享（V0.2 D-08 若改变）。
- **不推荐 C 作为公开 Demo**：交互精度（画布拓扑、时间线、事件 pre/post、键盘）与可访问性上限不足；但可作为内部数值探索与对照工具，成本极低。【工程判断】

### 4.3 "独立数值预言机"在 A 中的落点

【工程判断】oracle 不应进入浏览器包，也不应与 engine 共享公式常量文件：

```text
tools/oracle/            # 不参与前端构建
  fl001_oracle.py        # Python3 stdlib；独立实现解析式/数值积分
  README.md              # 输入固定表、输出格式、容差、方法版本
data/golden/
  fl001_v1.json          # 由 oracle 生成/批准；浏览器 engine 只读比对
  fl001_v1_meta.json     # 生成命令、oracle 源哈希、方法 id、容差
scripts/verify_golden.*  # CI/本地一键：oracle 生成 → engine 比对 → 输出 PASS/FAIL
```

- **G2 判据**：golden 中的每个黄金时刻值/积分/SOC 都由 oracle 独立计算出；engine 用 `method_id` 声明的同一积分规则比对，容差写进 golden（如 `E ±1e-6 kWh`、`SOC ±1e-5 pp`、瞬时量 `±1e-9 A`）。
- **第二重交叉**：至少 3 个手算闭式点（例如 21.5 s、26 s、60 s 的 `I_true`、`SOC_err`）作为 oracle 的独立校验，防止 oracle 与 engine 共同误读同一公式。
- **禁止**：golden 由 browser engine 生成；oracle 与 engine 共享 `formulas.ts`；用"同一段 TypeScript 代码计算并自我断言"（V0.2 §4.2 原话）。


## 5. 数据契约审查

> 本节对应 §13 第 4 项。总体判断：V0.2 第 6 章的**原则**质量高（不可变、来源分级、失败不填 0、hash ≠ 签名），但**对象/字段级契约**不足以支撑 G2/G4 验收。下表按"现有→缺口→建议字段→验收"组织。

### 5.1 契约缺口总表

| 对象/主题 | V0.2 现状 | 缺口 | 建议补充（可验收） |
|---|---|---|---|
| Run 不可变性 | §6.2 原则 1–6：内容不可变，可变的只有回放位置/显示设置；配置修改标 `draft_dirty` | 没有 `run_hash`；没有"同 config 不同 run_id"的规则；`created_at` 是否入哈希未定；没有存储/删除/保留策略（localStorage 配额、刷新丢失） | `RunManifest` 增加 `run_hash`、`role:'baseline' / 'fault' / 'monitor' / 'imported'`、`created_at` 不入哈希；`createRun` 幂等语义；导出优先于本地持久化；删除策略与引用保护（被对比引用的 Run 不可删） |
| Schema 版本与迁移 | `ScenarioConfig.schema_version`、`RunManifest.schema_version`；§4.4 "配合版本化迁移策略" | 没有版本三元组（schema/model/engine）兼容矩阵；无迁移函数；无未知字段策略；证据包版本未定义 | `{bundle_version, run_schema_version, model_version, engine_version}`；`supported_versions` 表；未知 major 拒绝、未知 minor 警告；迁移测试（v1→v2 的前向/后向） |
| 事件 pre/post | R-01 建议；§5.4；§6.1 `EventSnapshot` | pre 的时刻/主键/导出位置/与 CSV 关系未定（E-02）；与 CONTRACT 的"pre@19.9"冲突（§8） | `(event_id, phase)` 主键；`t_s=20.0` + `derivation:'left_limit'`；CSV 20.0=post；events.json 含 pre/post；图表阶跃 |
| 导出/导入往返 | §6.3 目录；§9.3 测试要求；FL-13 | 无 `EvidenceBundle` schema、无导入流程、无失败语义、无不可信输入防护（E-07） | bundle manifest + 文件哈希 + 重算指标 + 版本检查 + 失败不覆盖；≥8 负例 |
| 哈希语义 | §4.4、§6.2 #2、§6.3 `SHA256SUMS.txt`（"非第三方签名"）、R-07 | 无内容哈希、无规范化规则、`model_hash` 对象未定义、UI 文案可能过度承诺（E-03） | `Canonicalization v1` + `run_hash` + 每文件 SHA-256；文案"内容校验和 ≠ 签名/来源证明" |
| 指标来源与单位 | V0.1 §7.3 六类指标；V0.2 §6.3 `metrics.json`；§5.5 PHY-06/07 | §6.1 无 `DerivedMetric`；积分规则/时间窗/精度/不可用态/`pp` vs `%` 未定（E-06） | `DerivedMetric` 对象 + `metric_schema_version` + 每指标 `method_id`；golden 按 method 比对 |
| `P_load_demand` vs `P_load_served` | V0.1 §4.3 已分列（`CONFIG`/`MODEL_STATE`）；V0.2 R-05 要求分开 | §5.2 只定义 served；§6.1 未列字段；§5.3 用 30 kW 常量 | 双信号 + 单位 + source_kind；FL-001 相等、load_step 时不等；PHY 检查覆盖 |
| `provenance_tier` | §6.1 单字段（`analytical_demo`，未来 `numerical_simulation`/`hardware_experiment`） | 不能表达"内部检查通过/模型未与实验比对/硬件未验证"（R-06）；无字段承载 `not_performed` | 拆为 `model_provenance` + `verification` 三态 + `integrity`（run_hash/checks）；UI 三个标签 |

### 5.2 Run 不可变性与"数据事实源"

- 【已验证事实】V0.1 §8.1："实验计算状态：`empty -> draft_valid -> computing -> completed / failed`。配置修改产生新的 `draft_dirty`，但不可改变既有 completed Run。" V0.2 §6.2 原则 1–5 与之一致。
- 【工程判断】建议补充三条硬规则：(1) `createRun` 深拷贝 config 并在生成时冻结；engine 只接收 config、返回新 Run，不读 store；(2) `run_hash` 是内容身份，`run_id` 是实例身份；同 config 重跑产生新 id、同 run_hash（若 created_at 排除），UI 要显示"同内容不同实例"；(3) 所有页面只读 `activeRun`，导出只读 Run 对象，**绝不读屏幕当前显示值**（V0.2 §4.3 对 `EvidenceExporter` 已正确要求）。
- 【工程判断】存储：V0.2 §6.2 #6 只说"浏览器存储不是可靠的科学归档"，但 P0 需要"恢复上次实验"（V0.1 §3.2）。建议 localStorage 只存 session 索引（run_id、页面、时间），Run 体积较大时用 IndexedDB 或"每次会话重新计算 + 导出文件为准"；配额失败必须有可读错误与导出引导。

### 5.3 Schema 版本与迁移

- 【已验证事实】V0.2 §4.4 只写"配合版本化迁移策略"，§6.1 有 `schema_version` 字段但没有版本语义。
- 【工程判断】冻结三元组：`schema_version`（对象结构）、`model_version`（物理定义）、`engine_version`（实现）。三者任一变化都可能改变结果；对比页的"模型版本一致"检查（V0.2 §6.1 `ComparisonResult.compatibility`）应同时比对三者而不是只比 model。
- 【工程判断】迁移：只保证 `n-1 → n` 自动迁移；更老的版本给可读错误 + 导出原始包；迁移函数必须无副作用、可单测；迁移后重算 metrics 与 checks，避免"旧指标 + 新数据"。

### 5.4 事件 pre/post 与单一时钟

- 见 E-02 与 §8 C-04。
- 【已验证事实】V0.2 §5.4 已明确"20− 是左极限，不意味着时间 19.9s；即使曲线上含 19.9s 采样值，也要区分事件左极限和上一个采样点。"
- 【工程判断】UI 层必须提供"20− / 20+"两个可切换读数；时间线游标在 20.0 默认显示 post，但事件标记点击后展示 pre/post 对照卡；导出 CSV 只有一行 20.0（post），pre 只在 events.json。
- 【已验证事实】工作区 `src/core/protocol.js` 的 `nearestIndex` 用 `Math.round((t - t0)/dt)` 取整（第 90–98 行），因此 `sampleAt(run, id, 20.0)` 必然返回 post 值，无法表达 20−；pre 只能从 `run.snapshots` 取。这从实现侧印证了 E-02 必须由契约提供独立快照对象。

### 5.5 导出/导入往返与哈希语义（hash ≠ 签名）

- 【已验证事实】V0.2 R-07 与 §6.3 已正确写明："前端在浏览器计算出的 `SHA-256` 仅可证明导出后的内容一致性，**不等于防篡改签名或第三方认证**"；`SHA256SUMS.txt # 文件级校验和，非第三方签名`。
- 【工程判断】需要把这句话变成三层可执行语义：
  1. **config_hash**：标识"输入相同"，用于对比兼容性与去重；
  2. **run_hash**：标识"输出内容相同"，用于导出/导入核验与证据包；
  3. **file checksum**：标识"文件字节相同"，用于下载完整性；三者不可互相替代。
- 【工程判断】CSV 文本必须定死：UTF-8（含 BOM 供 Excel 中文）、`\n` 或 `\r\n` 二选一并写入规范、十进制点号、无千分位、全精度（15 位有效数字或最短往返）、20.0 行=post、单位字典文件、元数据以 `#` 注释行置顶。否则"导出-导入-再导出"在浏览器与 Excel 之间往返后哈希必然漂移。
- 【工程判断】V0.1 UX-10 的"通过记录的模型和配置哈希可核验来源"建议改为"可核验内容一致性与可复现标识（不代表来源或第三方认证）"，避免把哈希当公证。

### 5.6 指标来源、单位与积分规则

- 见 E-06 与附录 A。核心结论：【已验证事实】0.1 s 梯形积分与解析积分在 FL-001 的末端 SOC 差 1.40×10⁻⁴ pp、`E_bat` 差 6.17×10⁻⁷ kWh；V0.2 §5.5 PHY-06 的"一致积分规则/容差"必须给出数值，否则同一套公式会产出两个都自称正确的 golden。
- 【工程判断】单位纪律：`kW`/`kWh`/`A`/`V`/`%`/`pp` 在 SignalCatalog 与 DerivedMetric 中都要有 `unit`；`SOC_err` 单位是 `pp` 不是 `%`；显示精度与存储精度分离（存储全精度，显示按 `precision`）；任何"0"都不能替代"不可用"。

### 5.7 `P_load_demand` vs `P_load_served`

- 【已验证事实】V0.1 §4.3 表已把二者分列并给了不同 `source_kind`（`CONFIG`/`MODEL_STATE`）；V0.2 R-05 明确要求分开；但 V0.2 §5.2 方程只写 `P_gen,true = P_load,served - P_bat,true`，没有 `P_load,demand` 信号定义。
- 【工程判断】FL-001 中二者恒等（30 kW），但扩展到 `load_step` 或未来"供电不足"场景时必须分开；否则一旦开始扩展，`CONFIG` 与 `MODEL_STATE` 的语义会被合并，整个 source_kind 分层的可信度受损。
- 【建议】`P_load_demand_kW`（CONFIG）、`P_load_served_kW`（MODEL_STATE）双信号；默认场景断言相等；未来故障场景断言 `served ≤ demand`；PHY 检查含 `E_load_demand` 与 `E_load_served` 两项（V0.1 §7.3 已要求两项）。

### 5.8 `provenance_tier` 是否足够？

**不够**【工程判断】。它只能表达"模型来源类别"（解析/数值/硬件），不能表达：
1. **内部一致性检查是否通过**（`consistency_check_passed`）；
2. **是否与实验/实测比对过**（`model_validated_against_experiment`，V0.1 只能是 `not_performed`）；
3. **是否在真实硬件上验证**（`real_hardware_verified`，只能 `not_performed`）；
4. **该 Run 的内容完整性**（`run_hash`/checks）。

建议拆成 `model_provenance`、`verification`（三态字段）、`integrity` 三组，UI 分开展示，禁止合并成一个"可信度"徽章（V0.2 §0.2 D-07 的方向正确，但没有落到字段）。


## 6. 页面/状态审查

### 6.1 五个逻辑页面是否需要真实路由？

**需要"真实路由"，但只需**hash 路由**，不需要服务端路由或完整路由框架。**【工程判断】理由：

1. **深链是产品规格的一部分**：V0.1 §6.2 要求"查看原始数据"跳转曲线页并锁定同一时段/变量；V0.1 §7.1 有"复制分享摘要"；证据链接需要 `run_id + variable + time_window` 可寻址（V0.2 §6.1 `EvidenceLink`）。没有 URL 参数，这些只能靠内存状态，刷新即丢。
2. **盲测模式需要按路由阻断**：V0.1 §6.3 明确未来盲诊断要阻断"节点、工具响应与深链 URL"。路由守卫是唯一可执行的阻断点；纯内存页面无法阻止 `#/causal` 深链。
3. **G1 原型与 QA 截图**需要按页直达（`#/system`、`#/signals?...`），否则每次自动化都要从首页点进去。
4. **不需要**服务端路由/多 HTML：hash 路由 + 单页应用即可满足，且静态托管零配置（避免 SPA rewrite 问题）。
5. 建议路由形态：`#/home`、`#/system`、`#/signals?run=Run-001&var=I_bat_true_A&t0=19.9&t1=20.1`、`#/causal?run=Run-001&node=n1`、`#/compare?baseline=R1&trial=R2`；页面切换只改 hash，不重置共享时钟/选中对象/Run（V0.1 §2 导航规则）。

### 6.2 共享时钟与播放

- 【已验证事实】V0.1 §2："各页面共享 `current_time`，不会因切换而重置实验。" V0.1 §8.1：回放状态 `stopped -> playing -> paused -> ended`；"播放速度只改变用户观看速度，不改变物理时间步长。" V0.2 §4.3："`PlaybackClock` 不改变 `Run` 的哈希、数据点或求解步长。"
- 【建议规则（可验收）】：
  1. 单一时钟源：`currentTime` 只由播放器/游标写入；页面只读；切换页面不改时间（UX-T11）。
  2. 时间量化到 0.1 s 采样格：游标拖动/读数取 `nearestIndex`，但**20− 只能来自事件快照**（E-02），不允许插值出 20−。
  3. 播放只触发重绘：曲线 Canvas 每帧重绘；DOM 读数面板节流（≤10 Hz）；隐藏页不重绘。V0.2 §4.3 已要求"播放只读取数据"。
  4. 速度语义：1×/2×/4× 只缩放墙钟→仿真时间映射；从 `performance.now()` 计算目标时间而非累加步进，避免后台标签页节流导致漂移。
  5. 到 60 s 后 `ended`，再播放从头开始需显式重播（不重新计算）；`replay` 不得改 Run。
  6. 事件跳转："前一事件/后一事件"跳到 pre/post 对照视图；跳转本身不触发计算。
  7. 键盘：空格播放/暂停、←/→ ±0.1 s、Shift ±1 s、Home/End 0/60 s（V0.1 §10）；焦点在输入框时不生效。

### 6.3 Run 与草稿冲突

- 【已验证事实】V0.1 §8.1 表：参数改动 → "原 Run 不变；草稿 dirty"；"提示「改动须创建新运行」"；运行中控件锁定（V0.1 §4.2）。
- 【建议状态规则（可验收）】：
  1. `draft` 与 `activeRun` 完全分离；编辑只改 `draft`，`draftDirty=true`；`activeRun.hash` 与数据显示不变（UX-T05）。
  2. `createRun` 成功后：新 Run 进入 registry，`activeRun` 切换，`draftDirty=false`；旧 Run 仍可选回。
  3. baseline/monitor 派生：**必须从目标 Run 的 config 派生**（除故障/模式外全同），不能从当前 dirty 草稿派生，否则对比失去意义（V0.2 §7.2 对比页验收重点）。
  4. 无重复创建：相同 config + 相同 engine/model 的已有 Run 可复用（提示"已存在同配置运行"）；参数不同则新 id。
  5. `computing` 期间禁止重复提交；失败保留草稿与错误信息，不生成半成品 Run。
  6. 刷新/关闭：恢复 session 时校验 `run_hash`；Run 丢失时明确提示"未保存的实验已丢失，请重新创建或导入证据包"，不伪造历史。
  7. 删除：被对比引用/作为当前基线/被证据包引用的 Run 不可删；删除需二次确认。

### 6.4 错误/空态/失败态矩阵

| 状态 | 触发 | 期望可观察结果 | 禁止行为 |
|---|---|---|---|
| `loading` | 首次加载模块/session | 骨架占位，无结论数字 | 展示假曲线/假指标 |
| `no_run` | 无任何 Run | 空态 +「创建实验」入口 + 说明 | 默认显示 0 或示例数字充数 |
| `computing` | 创建 Run 后（若异步） | "计算中" + 可取消（若 >2 s），控件禁用 | 提前显示最终结论 |
| `ready/paused/playing/ended` | 正常 | 数据可用、时间线可回放、导出可用 | 播放改变数据 |
| `invalid_config` | 参数越界/类型错误 | 字段级错误 + 创建按钮禁用 + 原因 | 静默钳位用户输入假装成功 |
| `compute_failed` | 引擎异常/NaN/长度不符 | 失败原因 + 保留草稿 + 重试 | 显示部分轨迹冒充成功 |
| `check_failed`（质量） | 守恒/单位/采样检查失败 | 红色"验证未通过"，导出带 FAIL 标签 | 显示"验证通过"/可信标签 |
| `incomparable` | 模型/初始条件/单位/时间基准不一致 | 黄色警告 + 禁用差值 + 限制"因故障导致"表述 | 仍渲染"仅由故障造成"结论 |
| `export_failed` | 下载被阻止/配额/序列化失败 | 重试提示 + 现有 Run 保留 | 宣称"已生成文件" |
| `import_invalid` | 导入包缺文件/坏哈希/版本不支持 | 中文可读错误 + 不覆盖现有 Run | 部分导入/静默修正 |
| `blind_sealed` | 盲测模式 | 真值页/真值节点/深链被拦截并说明 | 仍可经 URL/DevTools 进入真值页 |
| `storage_full` | localStorage/IndexedDB 配额满 | 提示导出并清理历史，保留当前 | 静默丢 Run |

- 【已验证事实】V0.1 §8.2 已要求：模型加载失败不装成功、参数无效说明范围、计算失败保留草稿、守恒失败红色、对照不一致标出、导出失败保留 Run；V0.2 §7.1 要求"加载、空数据、计算中、计算失败、校验失败、不可比较、导出失败"七态。上表是在其上的补全（补 `import_invalid`/`blind_sealed`/`storage_full`/`computing` 取消）。
- 【工程判断】所有错误文案应包含"下一步动作"（重试/导出/修改哪一项），而不只是"出错了"；这是 V0.1 原则 4（可回溯）的延伸。

### 6.5 状态转移/验收测试（UX-T01…UX-T13，≥10 条）

> 每条格式：**前置状态 → 动作 → 期望可观察结果**；建议用 Playwright/Chrome headless + `data-testid` 断言；不依赖像素级截图作为唯一判据。

| ID | 前置状态 | 动作 | 期望可观察结果（可自动化断言） |
|---|---|---|---|
| UX-T01 | 全新会话（清空存储），无 Run | 打开 `#/home` | 首页 ready；无 fake 数字；「开始实验/进入实验」可用；时间线禁用并为 0/60 s；无控制台错误 |
| UX-T02 | 首页 ready | 点击主按钮 | 跳 `#/system`；默认草稿（闭环、20 s、+10 A）；时间 0 s；Run 状态可见且数据就绪（V0.1 UX-01） |
| UX-T03 | 已有 closed-loop Run | 跳到 19.9 s，再跳到 20.0 s | 读数 `I_meas: 25→35 A`；`I_true` 连续（20−=20+=25 A）；20− 通过事件快照展示；曲线在 20.0 处为阶跃（V0.1 UX-02） |
| UX-T04 | 同上 | 跳到 26 s | 闭环读数 `I_true≈15.18 A`、`I_meas≈25.18 A`（显示精度内）；monitor Run 为 25/35（V0.1 UX-03） |
| UX-T05 | 已有 Run，修改偏置滑块 | 拖动幅值但不创建 | 出现 `draft_dirty` 提示"改动须创建新运行"；原 Run 的 `run_hash`、数值、导出内容不变（V0.1 UX-09；V0.2 PHY-08/09） |
| UX-T06 | 已创建 baseline 与 monitor Run | 打开对比页选择 baseline/monitor | 兼容性检查通过；`I_true` 在 monitor 全程 25 A；`r_meas` 故障期 +4 kW；指标卡 `E_load_demand=E_load_served=0.5 kWh` |
| UX-T07 | 两个 Run 模型版本/时长不一致 | 打开对比页 | 黄色警告；差值视图禁用；因果表述被限制为"不可比较"（V0.1 UX-11） |
| UX-T08 | 已有 completed Run | 导出 CSV/证据包 → 重新导入 | 601 行、20.0 行=post；导入后 `run_hash` 一致、指标一致；改一行后导入失败并给可读错误（V0.2 §9.3） |
| UX-T09 | 草稿，bias 越界或 t_fault≥duration | 点击创建运行 | 字段级错误、按钮禁用、不产生 Run；错误含允许范围与单位（V0.1 §8.2） |
| UX-T10 | 计算引擎被注入异常（测试夹具） | 点击创建运行 | `compute_failed` 态；草稿保留；无部分曲线；重试可用；无假成功文案 |
| UX-T11 | 任意页面，有 Run，时间=26 s，选中传感器 | 依次切到曲线/因果/对比再回系统页 | `current_time=26 s`、Run ID、选中对象、曲线显隐全部保持（V0.1 UX-12/§2 导航规则） |
| UX-T12 | 曲线页 ready | 键盘空格/←/→/Home/End；打开表格模式；开启 reduced-motion | 播放/暂停/步进/跳转生效且焦点不抢输入框；表格可读、单位随读；无位移动画 |
| UX-T13 | 盲测模式（若保留 Arena 扩展） | 深链 `#/causal?run=R1` 或 `#/compare` | 路由被拦截并说明"盲测中不可查看真值"；`truthSealed` 期间 DOM/导出包无真值字段；结束后恢复 |


## 7. 最小 P0 清单与目录结构

### 7.1 建议删除/推迟的功能（逐项理由）

| 功能 | 来源条款 | 裁定 | 理由 |
|---|---|---|---|
| 三系统（FC-001/GT-001）与三类故障家族 | 工作区 CONTRACT §1；V0.1 §12 P2；V0.2 范围仅 FL-001 | **推迟（P2/另立扩展）** | 每增加一个系统 = 新方程 + 新 golden + 新 UI 绑定 + 新风险；对"一个故障讲透"的教育价值边际低；V0.2 §12 已警告范围膨胀。 |
| Agent Arena / 盲诊断 / Leaderboard | V0.1 §12 P2；V0.2 §8 FL-20 P2；工作区 CONTRACT §1/§11 | **推迟（P2）** | 需要 E-01 真值隔离与独立评测协议；在 A 架构下不能强保证；先做会把 P0 拖入评测基础设施。 |
| 故障幅值/触发时间可编辑 | V0.1 §12 P1；V0.2 D-05/FL-16 P1 | **推迟（P1）** | 固定参数保护 golden；编辑引入边界/校验/新 golden；不影响核心教学闭环。 |
| 完整 HTML 报告 | V0.1 §12 P1；V0.2 FL-17 P1 | **推迟（P1）** | 自包含报告涉及模板/转义/打印/文件体积；CSV+JSON 证据包已满足可复核；报告不是唯一证据（V0.2 §6.3）。 |
| 差值曲线/双屏同步（对比页三视图全做） | V0.1 §12 P1；V0.2 §7.2 | **P0 只保留"叠加 + 指标卡 + 兼容检查"，双屏/差值 P1** | 双屏/差值增加时钟/单位/渲染复杂度；"对照"闭环用叠加+指标已成立。 |
| 移动端优化/深度无障碍 | V0.1 §12 P1；V0.2 FL-18 P1 | **推迟（P1）**；P0 保留键盘播放、焦点、表格模式 | 公开 Demo 以桌面为主（V0.1 §10"优先桌面"）；深度 a11y 成本高。 |
| 完整 Playwright UX 矩阵/CI 全量 | V0.2 FL-14 P0 | **P0 收敛为"数值断言 + 5 条主旅程 E2E"；全矩阵 P1** | 16 项 P0 全量不可持续；先保证关键路径与数值，防止"测试工程"喧宾夺主。 |
| 自由轮次/随机场景 Arena、外部 Agent 协议 | 工作区 CONTRACT §11 | **推迟（P2）** | 依赖 E-01 与评测协议；与 L0 演示无关。 |
| 单文件 `FaultLab.html` 双击交付 | 工作区 CONTRACT §1.7；V0.2 §4.2 A"一键打开" | **P1（但 G0 必须现在决定是否承诺）** | 需内联构建/经典脚本/数据内嵌；若承诺则影响技术栈与测试（E-08）。 |

### 7.2 最小 P0 闭环定义（建议写入 `BACKLOG_APPROVED.md`）

**P0 = 一条垂直切片**：
`1 个系统（FL-001） × 3 个固定 Run（baseline / closed-loop fault / monitor fault） × 5 个逻辑视图 × 单一时钟 × 事件 pre/post × 因果证据跳转 × 对比兼容检查 × 导出/重载证据包 × 数值 golden 校验`

**明确不在 P0**：参数编辑、HTML 报告、Arena、额外系统/故障、移动端专项、分享链接服务端化、账号/云、LLM、FMU。

### 7.3 推荐目录结构（文字树形图；模块边界比目录名重要）

```text
faultlab/
├─ apps/web/                     # 唯一可部署前端（静态产物 dist/）
│  ├─ index.html                 # 仅壳：挂载点 + 资源引用（无业务数据）
│  ├─ src/
│  │  ├─ main.*                  # 启动、错误兜底，只组装不计算
│  │  ├─ shell/                  # AppShell、Header、Nav、Toast/Drawer、路由守卫
│  │  ├─ clock/                  # PlaybackClock：墙钟→仿真时刻，只读 Run
│  │  ├─ state/                  # store + selectors：draft/activeRun/pageState
│  │  ├─ pages/                  # home/system/signals/causal/compare（五逻辑页）
│  │  ├─ components/             # 通用 UI：卡片、来源标签、指标卡、空/错态
│  │  ├─ charts/                 # 曲线封装：阶跃、事件线、游标、双轴（不引网络）
│  │  └─ io/                     # 导出下载、导入入口、文件选择（不含物理）
│  ├─ styles/                    # 设计令牌 + 页面样式（作用域隔离）
│  └─ assets/                    # 图标（内联 SVG）、字体（系统字体栈，离线）
├─ packages/contract/            # 数据契约 + 运行时校验（浏览器/Node 共用）
│  ├─ schemas/                   # 场景、Run、事件、指标、证据包 JSON Schema
│  ├─ types/                     # 类型定义（如用 TS）
│  ├─ validate.*                 # 手工/库校验入口，错误信息中文化
│  ├─ canonicalize.*             # 规范化序列化（Canonicalization v1）
│  ├─ hash.*                     # config_hash / model_hash / run_hash
│  └─ project.*                  # demo/blind 投影（E-01）
├─ packages/engine/              # 纯函数数值内核（无 DOM、无网络、无 store）
│  ├─ fl001/                     # 方程、事件、积分（method_id 固定）
│  ├─ metrics/                   # DerivedMetric 计算（解析优先）
│  ├─ checks/                    # PHY-01..PHY-10 校验
│  └─ simulate.*                 # simulate(config) -> immutable Run
├─ packages/export/              # 证据包组装：CSV/JSON/manifest/checksums
├─ data/golden/                  # oracle 生成、只读；含 method_id 与容差
├─ tools/oracle/                 # 独立实现（Python stdlib），不进前端构建
├─ tests/
│  ├─ unit/                      # engine/contract/metrics 数值断言
│  ├─ e2e/                       # Playwright：UX-T01..T13 主旅程子集
│  └─ fixtures/                  # 损坏包、旧版本包、注入样本
├─ docs/                         # MODEL_FL001.md、DATA_CONTRACT.md、
│                                # EVIDENCE_FORMAT.md、LIMITS.md、DECISIONS.md
└─ scripts/                      # verify_golden、build、serve（本地）
```

**模块边界（硬规则）**【工程判断】：
1. `packages/engine` 不 import 任何 DOM/UI/store；`simulate(config)` 纯函数、确定性、不读全局时间。
2. `packages/contract` 不 import engine/UI；schema 是唯一字段事实源；UI 只能通过 contract 的校验器读写。
3. `apps/web` 只读 `Run` 对象；不得从屏幕/图表取数拼导出（V0.2 §4.3 已要求）。
4. `charts` 只画给定数据，不计算物理；阶跃由 `signal.chart.step` 驱动。
5. `tools/oracle` 与 `data/golden` 只在测试/校验时被读取，不进入 `apps/web` 的构建产物。
6. 所有"真值→页面"的访问经过 `project('demo'|'blind')`；页面不得直接遍历 `run.truth`。


## 8. 既有工程契约与 V0.2 的冲突（单列）

### 8.1 评审快照事实（只读观察，未运行、未验证可运行性）

- 【已验证事实】快照 2026-10-27T19:19:02+08:00：工作区除 `.git/` 外有 36 个文件（19:24 复查为 39 个，评审期间仍在增加），含 `index.html`、`css/*`（7 个）、`docs/CONTRACT.md`（1048 行）、`docs/SCOPE.md`、`README.md`、`src/core/{hash,rng,protocol,systems}.js`、`src/ui/{components,store,shell,chart,export}.js`、`src/ui/pages/*.js`（6 个页面模块；已读 home.js 为"页面建设中"占位，其余文件仅 712–734 字节，抽查 system/signals/compare/arena 文件头均标注 placeholder）、`tools/{serve.py,build.py,qa.mjs,oracle.py}`、`tests/harness-chart.html`。另有部分 `index.html` 已引用的文件在快照时尚未出现（如 `src/core/engine.js`、`src/core/metrics.js`、`src/core/checks.js`、`src/agents/*`、`tests/core.test.js`）。
- 【已验证事实】`index.html` 使用 22 个经典 `<script src>`（非 ES module），无打包器；无 `package.json`、无 `node_modules`（快照时）。
- 【已验证事实】`docs/CONTRACT.md` §1 把范围定义为"规格 §12 P0 全量 + 用户明确要求的扩展"，含**三个系统、三类故障家族、Agent Arena、六页（含竞技场）**；§2 技术约束为"纯静态、零运行时依赖、零外网请求、零构建步骤"、ES2020 经典脚本、Canvas 自绘图表；§5.1 给出三系统数值验收（含 FC/GT）；§11 为 Arena 盲测协议（`blindVisible`、`truthSealed`、5 个确定性 Agent、评分）。
- 【已验证事实】`src/core/protocol.js` 定义 `source_kind` 七枚举、格式化工具、`nearestIndex/sampleAt/slice`、`validateRun`（硬编码"采样点不是 601"即失败，第 180–187 行）。
- 【已验证事实】`docs/SCOPE.md` 已逐条声称 V0.1 §12 P0 "全部实现"并标 ✅（如"FL-001 默认闭环模式…✅ 解析值逐位一致"），§4 列出 `node tests/core.test.js` 等验收命令；但快照时 `tests/` 下只有 `harness-chart.html`，未见到对应测试文件。该文档的完成度声明**未经 G0 评审，也未由本评审验证**。
- 【已验证事实】V0.2 文首明确："**本版性质**：**建议/待评估**，不是已通过的技术决策；**不授权直接创建仓库、编码或修改既有项目**。" V0.2 §0.1 第 5 条："**不得直接推送代码、创建真实 GitHub 仓库、联网部署或读取/复制 SpaceFDIR 私有资产**，除非后续单独授权。" 快照中工作区存在 `.git/` 且文件在评审期间持续变化（如 `docs/CONTRACT.md` 在本评审开始后由 53950 字节变为 54666 字节；工作区文件数亦从 36 增至 39）。

### 8.2 冲突清单与裁定

| ID | 维度 | 既有工程契约现状 | V0.2 的 P0/立场 | 冲突性质 | 裁定建议 |
|---|---|---|---|---|---|
| C-01 | 产品范围 | 3 系统（FL/FC/GT）+ 3 故障家族 + Agent Arena + 6 页面 + 完整导出套件（CONTRACT §1） | 仅 FL-001 五页面；Arena P2；三系统/多故障在 V0.1 §12 为 P2 | **重大范围冲突** | 以 G0 书面范围为准：V0.2 的 FL-001 P0 优先；三系统/Arena 降为 P2 或单独立项（须用户书面确认）。在 `DECISIONS.md` 记录"V0.2 覆盖 CONTRACT §1"或反之。 |
| C-02 | 技术栈 | 零构建、零依赖、ES2020 经典脚本、Canvas 自绘（CONTRACT §2） | React+TypeScript+Vite、ECharts、Playwright、JSON Schema（V0.2 §4.2/§4.4） | **重大技术栈冲突** | 不要双栈并行。G0 决定其一：若要"双击单文件/无 npm"，保留零构建＋自绘；若要类型安全/生态/测试效率，用 Vite＋TS，但须接受构建链与 `file://` 限制。既有实现若保留，必须按 V0.2 契约改造，不能反过来定义契约。 |
| C-03 | 数据契约（真值） | CONTRACT §4.1/§11 已有 `blindVisible`、`truthSealed`、盲测导出断言、5 个 Agent | V0.2 §6.1 无 exposure 字段、无投影函数；Arena P2 | V0.2 契约**落后于**既有实现意图 | 把 `blindVisible`/`truthSealed` 吸收进 V0.2 的 P0 信号/运行契约（E-01）；明确"演示可公开真值、盲测只发投影"；不要保留只在实现里定义、文档里没有的字段。 |
| C-04 | 事件语义 | CONTRACT §5.1 验收表："事件快照 pre@19.9 `I_meas=25`；post@20.0 `I_meas=35`"；SCOPE.md D-5 解释"pre 取 t_start−0.1 采样" | V0.2 R-01：20−/20+ 是同一物理时刻；§5.4："20− 是左极限，不意味着时间 19.9s" | **语义冲突** | 采用 V0.2：`pre` 必须是 20.0 的左极限（phase + t_s=20.0 + derivation），19.9 只能作为"上一常规采样点"字段/UI 说明；更新 CONTRACT §5.1 验收与 SCOPE D-5。否则导出的 pre 值与 V0.2 证据契约不一致。 |
| C-05 | 金标准数值/积分规则 | CONTRACT §5.1 验收值 0.1238889、59.6902778、59.5791667、-0.1111111（解析口径）；但 `tools/oracle.py` 注释明确 "Trapezoidal integral on the 0.1 s grid"，其规则独立复算得 `SOC_est=59.579026`、`SOC_err=-0.11125`（附录 A） | V0.2 §5.3 用解析值作金标准；§5.5 未定积分规则/容差 | **数值口径冲突（已被实现证实）** | 先按 E-06 冻结 `method_id` 与容差，再统一 engine/oracle/golden；在 golden 中记录 `method_id`；CONTRACT §5.1 的验收值需注明方法（解析或 dt=0.01 子步），否则 browser engine 与 Python oracle 会产出不同"金标准"。 |
| C-06 | 工具链/测试 | Python `tools/serve.py`/`build.py`、Node `tests/*.test.js`、`tools/qa.mjs`、Chrome headless 截图（CONTRACT §14） | Playwright + JSON Schema + Vite（V0.2 §4.4） | 工具链重复/冲突 | 选一套主测试链：要么 Playwright（前端 E2E）+ Python oracle（数值），要么既有 Chrome headless + Node；不要两套并存导致 CI 双份维护。构建脚本 `build.py`（单文件）可以保留为 P1 交付能力。 |
| C-07 | 流程纪律 | 工作区已有 `.git/`、36→39 个文件（含实现与测试脚手架），且在评审期间继续变化；SCOPE.md 已出现"全部实现 ✅"声明 | V0.2 §0.1/文首："不授权直接创建仓库、编码或修改既有项目"；G0 尚未通过 | **流程冲突（治理问题）** | 由 Lead/用户书面确认当前实现的定性：**可丢弃原型/演练** vs **正式实现**。无论哪种，G0 决策必须记录"实现先于评审"的风险与处理：现有实现只能作为参考/技术债，不得作为 V0.2 契约或范围的事实源；G0 通过后按 `SPEC_v0.2_APPROVED.md` 重新对齐。 |

### 8.3 裁定建议（五条）

1. **范围**：坚持 V0.2 的 FL-001 五页面为 P0；三系统/Arena 作为用户扩展**另行立项**（P2），而不是塞进同一 G0——否则 V0.2 的 G0/G1/G2/G3 门禁全部失效。若用户坚持扩展，则 V0.2 必须先修订 P0/P1/P2 表并重新评估工作量与风险，再放行。
2. **技术栈**：以"交付形态"为第一决策（E-08）：若承诺"双击单文件离线"，零构建＋经典脚本更省事（且已有基础）；若承诺"静态托管 + 现代工程"，Vite＋TS 更优。**不建议两种并存**；既有实现按选定栈重基线，`docs/CONTRACT.md` 与 `protocol.js` 必须与 V0.2 数据契约对齐后才能作为实现依据。
3. **数据契约**：以 V0.2 第 6 章为基线，吸收既有 CONTRACT 的 `blindVisible`/`truthSealed`/`run role` 等优点（E-01/C-03）；`protocol.js` 的 `validateRun` 硬编码 601 点应改为按 `duration_s/dt_s` 计算（否则 P1 开放 dt 即坏）。
4. **事件语义**：统一到 V0.2 R-01（20−/20+ 同一时刻、左极限显式存储）；CONTRACT §5.1 的 `pre@19.9` 验收改为 `previous_sample@19.9 + pre_left_limit@20.0` 两条记录（C-04）。
5. **治理**：在 G0 决策中增加一条："评审期间继续编码的风险由 Lead/用户书面承担；G0 通过后以批准版规格为准，未评审实现不得反向固化契约。" 若不能暂停实现，至少冻结一个只读基线快照（含文件哈希）供评审与回归对照；本报告 §8.1 已给出本快照的部分哈希。


## 9. 风险与依赖

> 每条含"如果防护不成立"的处置。许可证/版本信息为【工程判断】+【需在 G5 前核查】，本报告未联网核验许可证原文。

| ID | 风险 | 证据/触发 | 影响 | 防护 | 若防护不成立 |
|---|---|---|---|---|---|
| R-01 | ECharts 版本/许可证/无障碍/阶跃支持 | V0.2 §4.4 选 ECharts；需验证 `step`、游标、键盘、CSV 源数据 | 图表表现力强但 canvas 无障碍弱；许可证与 NOTICE 义务 | 固定主版本 + lockfile；G5 前核对 LICENSE/NOTICE；E2E 覆盖阶跃/游标；提供表格模式 | 退回自绘 Canvas 或轻量图表库，并把"a11y 深度"降为 P1 |
| R-02 | Playwright 安装与 Windows/CI 兼容 | 需下载浏览器二进制、依赖 Node；Windows 路径/权限 | CI 失败、环境不可复现、离线开发受阻 | 固定 Playwright 版本；缓存浏览器；提供 `npm exec playwright install --with-deps` 文档；备选 Chrome headless 脚本 | 只保留数值测试 + 手工走查清单，E2E 降为 P1；用既有 Chrome headless 脚本替代 |
| R-03 | JSON Schema 校验器/依赖选择 | V0.2 §4.4 "JSON Schema 或类型定义 + 运行时校验" | 增加运行时依赖与体积；错误消息英文；版本漂移 | 或使用手写校验器（零依赖）只覆盖 P0 字段；若用库则固定版本并本地化错误 | 手写 validator + 契约测试；schema 仍作为文档/导出格式规范 |
| R-04 | Windows 开发兼容 | 本工作区即 Windows；路径含空格与破折号 "FaultLab — Virtual Energy Lab"；`python`/`py`、PowerShell 编码、CRLF/BOM | 脚本失败、CSV 乱码、路径解析错误 | 支持矩阵写明；脚本用参数化路径；CSV UTF-8 BOM；测试在 Windows 跑 | 提供 WSL2/Linux CI 作为对照；README 给出排错步骤 |
| R-05 | 静态部署形态（http vs `file://`） | V0.2 §4.2 A "一键打开"；ES module 在 `file://` 的 CORS 限制；`fetch` 本地 JSON 失败 | 交付形态返工、验收标准不一致 | G0 定死交付物（P0 静态托管 / P1 单文件）；P0 用经典脚本或内联数据；E2E 在 `http` 下跑 | 若必须 `file://`：改为单文件内联构建；否则删除"双击可用"承诺 |
| R-06 | 真值泄露（架构 A 的结构性风险） | V0.1 §6.3；V0.2 §8 FL-20 P2 | 未来盲测/评测不可信；对外"公平评测"承诺失效 | E-01 的投影函数 + 构建期分离；盲包由离线工具生成（不含 config/truth） | 放弃 A 下的盲测功能，或升级架构 B；在发布说明中明确"仅演示，不提供盲测" |
| R-07 | 数值/版本漂移 | engine 改动未升 `engine_version`；积分规则变化未升 `method_version`；`model_hash` 口径未定 | 证据包与历史 Run 不可比；复核失败 | 版本三元组 + `run_hash`；CI 拦截未升版本的数值变化；golden 绑定 `engine_version` | 冻结 golden 与 engine 版本；历史证据包标注不可比；暂停发布直到口径统一 |
| R-08 | 依赖供应链/联网安装 | V0.2 §4.4 的 npm 生态；§10 要求"依赖清单包含版本及许可" | 恶意包/许可证污染/离线不可装 | lockfile + 依赖白名单 + 许可证扫描 + 无 postinstall；构建机离线缓存 | 改为零依赖/手写实现；发布前人工审计依赖树 |
| R-09 | 本地存储不可靠 | V0.2 §6.2 #6 "浏览器存储不是可靠的科学归档"；localStorage 约 5 MB | 刷新/清缓存丢实验；用户误以为已保存 | 默认"导出优先"；配额满时提示导出；session 恢复校验 `run_hash` | 只保留当前会话内存态，禁止承诺"恢复上次实验" |
| R-10 | Python/Simulink/FMU 预留落空 | V0.2 §4.4 FMI 3.0 只作接口预留；FL-19 P2 | 后续接入时发现数据契约不适配（真值/事件/单位） | 现在冻结"配置→Run"纯函数接口与证据包格式；oracle 用 Python 先跑通；FMU 只做适配层 RFC | 接口不适配的部分在 P2 重构；确保 P0 不依赖任何 FMU/MATLAB 能力 |

**第三方库/许可证核查要点（G5 前必须逐项核验 LICENSE/NOTICE/版本）**【需核查】：

- ECharts：常见为 Apache-2.0；需保留版权/NOTICE（如上游包含）与 LICENSE；离线打包禁用 CDN；版本固定。
- Playwright：常见为 Apache-2.0；浏览器二进制下载与缓存路径要写进文档；CI 使用固定版本。
- React / Vite / TypeScript：MIT / MIT / Apache-2.0（需核验）；lockfile 固定版本。
- JSON Schema 校验器（若用 ajv 等）：MIT（需核验）；或改用自制校验器以保持零依赖。
- FMI 3.0 规范本身可公开引用；具体 FMU 工具/运行时的许可证单独评估（V0.2 §4.4 已正确声明不实现任何 FMU 执行能力）。
- 字体：使用系统字体栈可规避 web font 许可证与联网问题（V0.2 §4.4 未提字体；建议在 UI 规范中明确）。

---

## 10. D-01…D-08 逐条裁定

| ID | 问题（V0.2 §0.2） | 裁定 | 一句话理由 | 建议/替代 |
|---|---|---|---|---|
| D-01 | 教学演示还是工程验证工具？ | **同意** | L0 定位正确，V0.1/V0.2 都坚持不宣称工业真实性；这是项目最有价值的自律条款。 | 把"L0 教学演示"写进 `ModelManifest.claims`，并把"内部一致性检查通过 ≠ 模型已验证 ≠ 硬件验证"作为字段而非文案（I-04）。 |
| D-02 | 首版纯浏览器还是前后端？ | **同意（有前置条件）** | 静态 L0 演示技术上可行、部署最轻；但 A 架构不能为未来盲测提供强真值隔离。 | 采纳 A + E-01 投影函数 + E-04 外置 oracle；若盲诊断/Arena 升 P0，自动触发 B 重评；交付形态按 E-08 定死。 |
| D-03 | 五页面全做还是一屏到底？ | **同意** | 五逻辑页面 + 主工作台的方案兼顾教学叙事与实现成本；V0.1 的页面语义已验证完整。 | 用 hash 路由实现真实可寻址 URL（§6.1），页面切换保持共享状态；"主工作台+4 视图"的表述需在文档中改为具体映射（首页=入口，其余四页+壳层时间线）。 |
| D-04 | 仅监测是否首发？ | **同意** | 因果解释需要反事实对照；仅监测 Run 的成本仅是一次同配置重算 + 一个 run_id；没有它，"为什么是传感器故障"讲不透。 | 在 DECISIONS 中记录"V0.2 覆盖 V0.1 §12 的 P1 配置"；同步修正 I-01/R-08；`createMonitorContrast` 必须从目标 Run 的 config 派生（§6.3）。 |
| D-05 | 偏置参数是否开放？ | **同意** | 固定 +10 A/20 s 让 golden、容差与教学叙事都可控；开放参数会把边界/校验/golden 重建成本引入 P0。 | 契约中保留 `bounds`（供 P1 与 UI 提示），但 P0 编辑器只读；P1 开放时升 `model_version` 并重建 golden（对应 I-05）。 |
| D-06 | 因果解释是否接 LLM？ | **同意** | 确定性规则 + 数据证据可复现、可测试、可审计；LLM 会破坏可复现性并引入真值泄漏与不可解释风险。 | 规则模板版本化（`causal_rule_version`），每条解释绑定 `rule_id + evidence(link)`；禁止 free-text 生成。 |
| D-07 | 可信度如何表达？ | **同意，需补充证据字段** | 方向正确，但"标签"必须由机器可判定的证据产生，不能只是 UI 文案。 | 按 I-04 拆字段：`model_provenance` / `verification{consistency, model_validation:not_performed, hardware_validation:not_performed}` / `integrity{run_hash,checks}`；UI 分三处展示。 |
| D-08 | 云端/账户/排行榜？ | **同意** | 无服务器、无账号能显著降低隐私/安全/运维成本，也符合"离线可运行"的定位。 | 不做任何遥测/登录；分享只导出文件；若未来要公开 Demo，先做静态托管与版本化 Release；Arena 排行榜仅本地会话内，不落云。 |

---

## 11. §15 评分表

> 评分口径：1（明显不足）—5（可直接推进），附至少一句证据；加权总分保留一位小数。评分对象是"V0.1 规格 + V0.2 方案的成熟度"，不是"代码实现"。

| 维度 | 权重 | 分数 | 证据（含扣分项） |
|---|---:|:---:|---|
| 物理正确与模型边界 | 25% | **4** | 【已验证事实】独立复算 21.5 s/26 s/60 s 电流、能量 0.123889/0.376111 kWh、SOC 59.690278/59.579167、`SOC_err=-0.111111 pp` 与 V0.1 §1、V0.2 §5.3 一致；V0.2 §5.2 适用边界与 R-02"不得呈现未建模物理"明确。扣分：`P_bat,meas` 的"显示量"属性与积分规则/容差未写死（E-06），事件左极限物理语义未落到契约（E-02），因此不能给 5。 |
| 数据语义与追溯 | 20% | **3** | 【已验证事实】source_kind 七枚举、R-01/R-05/R-06/R-07、"不可用不填 0"、失败不写"验证通过"等原则质量高；【工程判断】但 §6.1 缺 DerivedMetric/exposure/import/run_hash，`provenance_tier` 单字段不足以承载证据分级，`P_load_demand` 未落契约（E-01/E-03/E-06/E-07、I-03/I-04）。 |
| 用户体验与清晰度 | 15% | **4** | 【已验证事实】V0.1 五页布局、控件表、状态机、UX-01..12、键盘/线型/a11y 规则非常完整；V0.2 保留并补充原型切片。扣分：V0.2 自身页面级状态表不如 V0.1 细；按钮文案漂移（"开始实验/进入实验"）；缺少错误文案"下一步动作"规范。 |
| 实施可行性 | 15% | **3** | 【工程判断】纯静态 L0 无 MATLAB 可行、成本低；但 16 个 P0 任务无切割（E-05）、oracle/import/schema 无落点（E-04/E-07）、工具链与交付形态未定界（E-08）、Windows/许可清单缺失（§9），且工作区实现已出现范围漂移（§8）。 |
| 自动化验收 | 10% | **4** | 【已验证事实】PHY-01..PHY-10、§9.1–9.3 测试矩阵、黄金样例、UX 用例都很扎实，是方案的明显优势。扣分：oracle 独立性无判据（E-04）、哈希/往返口径未定（E-03/E-07）、§9.1 有悬空 dt 项（I-05）、无 CI/环境/Windows 定义。 |
| 开源合规与安全 | 10% | **3** | 【已验证事实】§10 明确禁止私有资产/密钥、依赖清单与许可证要求、教学定位声明、不上传/不控制真实设备。扣分：无依赖版本/许可证清单交付物与 SBOM/NOTICE 任务（G5 门禁无对应 P0 任务）；导入 JSON/HTML 报告的注入与资源限制未提；A 架构下真值隔离不可强保证（E-01/R-06）。 |
| 演进扩展性 | 5% | **3** | 【已验证事实】V0.2 §4.4 对 FMI 3.0 的 ME/CoSim/SE 区分与"只预留"的表述专业；协议适配思想正确。扣分：A 架构对盲测/Agent 结构性不利；数据模型未做暴露投影；多模型/多系统 registry 未定义（§8 C-01）。 |
| **加权总分** | 100% | **3.5** | 计算：`4×0.25 + 3×0.20 + 4×0.15 + 3×0.15 + 4×0.10 + 3×0.10 + 3×0.05 = 1.00+0.60+0.60+0.45+0.40+0.30+0.15 = 3.50`。 |

**扣分项汇总**：E-01（真值暴露/投影）、E-02（事件 pre/post）、E-03（哈希）、E-06（指标/积分规则）、E-07（导入）、E-08（交付形态）是主要扣分来源；这些均可在 G0/G2 阶段以文档 + 测试补齐，不需要推翻方案。

**阻断与结论的关系**：按 V0.2 §15.1"评分不能平均掉 P0 物理错误"的规则，本评审**没有**发现物理造假/严重物理错误/私有资产泄漏/Run 不可追溯中的任何一项，因此不判 `NO-GO`；但 E-01～E-08 中有 4 项（E-01/E-03/E-06/E-07）直接使"可追溯、可复核"无法客观判定，因此按第 15.1 条判 `CONDITIONAL GO`，且建议 **G1/G2 只做设计验证与数值内核，不进入 G3 集成与公开发布**，直到上述条件关闭。

---

## 12. 附录

### 附录 A：独立复算（本报告亲自计算；未运行项目代码）

**A.1 黄金时刻（解析式）**

| 时刻 | 模型 | `I_true` A | `I_meas` A | `P_bat` kW | `P_gen` kW | 与本报告结果对比 |
|---|---|---:|---:|---:|---:|---|
| 21.5 s | 闭环 | 18.6787944 | 28.6787944 | 7.4715178 | 22.5284822 | V0.2 §5.3：18.6788 / 7.4715 / 22.5285 ✅ |
| 26.0 s | 闭环 | 15.1831564 | 25.1831564 | 6.0732626 | 23.9267374 | V0.2 §5.3：15.1832 / 6.0733 / 23.9267 ✅ |
| 60.0 s | 闭环 | 15.0000000 | 25.0000000 | 6.0000000 | 24.0000000 | V0.2 §5.3：≈15 / ≈25 / ≈6 / ≈24 ✅ |
| 20.0 s | 闭环 post | 25.0 | 35.0 | 10.0 | 20.0 | V0.2 §5.3：25 / 35 / 10 / 20 / +4 ✅ |
| 19.9 s | 健康 | 25.0 | 25.0 | 10.0 | 20.0 | V0.2 §5.3：25 / 25 / 10 / 20 / 0 ✅ |

**A.2 积分与 SOC（两种规则对比）**

| 指标 | 解析/闭式（V0.2 §5.3 口径） | 0.1 s 梯形 | 差值 | 含义 |
|---|---:|---:|---:|---|
| `E_bat` kWh（闭环故障） | 0.123888889 | 0.123889506 | +6.17×10⁻⁷ | 0.1 s 梯形对指数尾的离散误差 |
| `E_gen` kWh（闭环故障） | 0.376111111 | 0.376110494 | −6.17×10⁻⁷ | `E_bat+E_gen=0.5` 仍成立 |
| `SOC_true` 末端 % | 59.6902778 | 59.6902762 | −1.54×10⁻⁶ pp | 同上 |
| `SOC_est` 末端 % | 59.5791667 | 59.5790262 | −1.40×10⁻⁴ pp | **事件阶跃跨步误差主导**（陷阱：19.9 s=10 kW、20.0 s=14 kW 被平均为 12 kW） |
| `SOC_err` pp | −0.1111111 | −0.11125 | −1.39×10⁻⁴ pp | 若按 1e-6 容差断言，梯形实现会失败 |
| 无故障 `E_bat` kWh | 0.1666667 | 0.1666667 | 0 | 恒定功率，无差异 |
| 仅监测 `E_bat_meas` kWh | 0.2111111 | 0.2111667 | +5.6×10⁻⁵ | 阶跃跨步误差；影响 `SOC_est` |
| `max abs r_true` kW | 0（代数恒等式） | 0（本场景数值恰好抵消） | — | 不应把容差压到 0；PHY-01 用 `≤1e-9` 合理【工程判断】 |
| `r_meas`（故障期） kW | +4 | +4 | 0 | 与 V0.1 §1/§5.3 一致 |

**A.3 结论**：V0.2 §5.3 的数值本身正确；问题在**积分规则与容差未写进契约**（E-06），以及工作区 oracle 已采用 0.1 s 梯形（§8 C-05），两者会产出不同的"金标准"文本。

### 附录 B：本评审未做/无法验证的事项

- 【已验证事实】未运行任何项目测试（`node tests/*`）、未启动服务器/浏览器、未执行 `git`、未读取 `CLAUDE_REVIEW.md`。
- 【未证实假设】工作区实现声称的完成度（`docs/SCOPE.md` 的 ✅）未经本评审验证；`index.html` 引用的部分脚本在快照时不存在，因此"应用可运行"在本报告证据范围内不成立（既未验证可运行，也未验证不可运行）。
- 【未证实假设】第三方库的实际许可证文本、Playwright 浏览器下载体积、ECharts 阶跃渲染行为、Windows 具体版本兼容性，均需 G5 前实测/核验。
- 【工程判断】浏览器内 601×N 浮点计算与 Canvas 重绘的性能预算、localStorage 配额的具体阈值，需在 G3 实测；本报告只给数量级判断。

### 附录 C：关键引用索引（便于读者按 §号定位）

- 物理/数值：V0.1 §1（表）、V0.2 §5.1/§5.2/§5.3/§5.4/§5.5。
- 数据/证据：V0.1 §7.2/§7.3/§9；V0.2 §6.1/§6.2/§6.3、§9.3、§4.4、§1.2 R-01/R-05/R-06/R-07/R-08。
- 页面/状态：V0.1 §2/§3/§4/§5/§6/§7/§8/§10/§11/§12；V0.2 §2.3/§7.1/§7.2/§7.3。
- 架构/工具：V0.2 §4.1/§4.2/§4.3/§4.4、§10、§15.1/§15.3。
- 既有工程契约：`docs/CONTRACT.md` §1/§2/§5.1/§11/§14；`src/core/protocol.js` 第 90–98、180–188 行；`tools/oracle.py` 第 45–55、114 行；`docs/SCOPE.md` §4、D-5。

### 附录 D：建议的 G0 决策记录条目（供 `DECISIONS.md` 使用；不是本报告结论本身）

- `G0-DEC-01`：P0 范围 = FL-001 × 3 Run × 5 视图 × 导出/重载（E-05）。
- `G0-DEC-02`：架构 = A（主选）+ B 后备；oracle 外置；盲测投影函数进 P0 契约（E-01/E-04）。
- `G0-DEC-03`：交付形态 = P0 静态托管 / P1 单文件（E-08）。
- `G0-DEC-04`：技术栈（零构建 vs Vite）二选一，并决定既有实现的处置（§8）。
- `G0-DEC-05`：事件 pre/post 编码与 CSV/JSON 交换格式（E-02/E-07）。
- `G0-DEC-06`：积分规则、容差、`method_id`（E-06）。
- `G0-DEC-07`：`run_hash`/canonicalization v1（E-03）。
- `G0-DEC-08`：证据分级字段（R-06/I-04）。
- `G0-DEC-09`：是否暂停并行编码；如不暂停，记录风险承担与快照（C-07）。

---

**报告结束**。本报告所有"已通过/已实现/已部署"类表述均未使用，除非以原文引文形式引用他人文档（并已标注为原文，不视为本评审的验证结论）。
