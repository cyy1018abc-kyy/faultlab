# TLV2_G2B_REVIEW_B — TL 联合轨 v2 规格草案 治理 / 契约面评审（评审线 B）

> **评审人**：独立评审 B（治理 / 八面 / golden 治理 / 步账 / FMU 钉值面）——与评审 A 互不可见（未读 `TLV2_G2B_REVIEW_A.md`）。
> **日期**：2026-11-28
> **对象**：`FaultLab-evaluation/NEXT/TL001_V2_G2B_SPEC_DRAFT.md` **v0.1**
> **方法**：只读实读（仓库文件零改动；本文件为唯一新建文件）。行号为 2026-11-28 工作树快照。

**判定：FAIL（1 BLOCKER / 6 MAJOR / 4 MINOR / 2 NOTE）**——R-B-01 处置后（Q10 重构 + 版本/面判定交用户裁定）即可转 PASS-WITH-CONDITIONS；其余条目均可在 v0.2 文本内闭合，无须改方向。

---

## 发现

### R-B-01 · BLOCKER · Q10(a) 按 V1_FACES §3.2 属 breaking，与项目先例和 v1.20.0 MINOR 定位冲突

**证据**
- `docs/V1_FACES.md:407-410`：「**哈希面变化 = breaking**：既有合法输入的 … run_hash / config_hash … 输出值发生变化即 breaking——即使数值仿真零变化 … v1.0 起不再默认，须走 major 评审论证」；`:434`「additive 不得改变既有合法输入的任何哈希输出」；`:436`「政策本身的变更 = breaking」。V1_FACES 全文没有 extension_preview 豁免（grep `extension_preview` 只命中面⑥ scope 语义）。
- 先例 `DECISIONS.md:1712`（CHG-20261114-07 Q12）：GT model_version 升位**被否决**，理由正是「SystemDef 升位即既有 GT 输入 run_hash 变化 = V1_FACES §3.2 breaking」。FC electrochem / FL capacity 的新文本都挂在 model_hash 九字段**之外**的子对象上（`systems.js:154/389/700`），目的就是避开这一点。
- `V1200_WAVE_DESIGN.md` R1-5 已把第二批定为 **v1.20.0（MINOR）**。草案 §5 哈希行只写「需裁定」，没有给出 breaking/additive 判定；§9 Q10(a) 援引 I-11 README §8.1 的「批准模型面变更」路径，但那一段只是发布门的比对方法，并不豁免 §3.2。v1.0 之后没有任何一次发布改变过既有输入的 run_hash（`v1170-release.md` §1 第 8 行：12/12 · 46/46 零扰动）。如果采纳 Q10(a)，这会是**首例**。

**修复**（v0.2 必改）：把 Q10 重构为显式的面判定裁定点，并逐项列出各选项的义务：
- (a1) 接受 breaking：版本 **v2.0.0 MAJOR**，履行 V1_FACES §3.3 五件套（含 `docs/MIGRATION-1.x-to-2.0.md`），同时重开 V1200 R1-5；
- (a2) 用户逐项知情的一次性偏离：登记为「违反 §3.2 的已批准偏离」，**不得**写成 additive，也不得写成改政策（§3.4 规定改政策本身就是 breaking）；
- (b) additive 轨键：沿 inertia_model / thermal_model / electrochem_model 先例；v1 调速器保持引擎可达，新文本放进 model_hash 九字段外的子对象，既有输入的哈希零变化；
- (c) 另立 SystemDef 实例（新系统 id），TL-001 冻结为 v1 形态：additive。

推荐项须正面回应 CHG-20261114-07 Q12 先例。§6 排期「→ v1.20.0」须改为「版本随 Q10 定」。

### R-B-02 · MAJOR · 「mg001_v1→v2 先例」引述不准；v1 将成库内首个「引擎不可达」golden

**证据**：`data/golden/mg001_v2.json` 中 `supersedes = null`；mg001_v1 仍是引擎参照（`tests/engine-mg.test.js:58/61`），两份 golden 并列在验，并非取代关系。真正的 supersedes 先例是 gt001_v2→v3→v4 和 fc001_v1→v2（supersedes 字串形如「gt001_v2（…字节冻结留档；存档场次继续引用 v2）」）。这些先例里，旧 golden **仍能经轨键被引擎复现**（`tests/engine-gt.test.js:169` 仍验 gt001_v2 swing 轨）。草案第二批完成后，v1 八局中有 5 局引擎不再复现，v1 只剩 oracle↔golden 校验，属于未登记过的新档位。

**修复**：§4 项 8 改引 gt001_v3/fc001_v2 先例，supersedes 字串按其体例写。v1 状态登记为「字节冻结留档；oracle 侧在验（DEFAULT_MODELS）；引擎参照已切 v2」，同步写入 V1_FACES §24 行和 FAULT_CATALOG §9。Q9(a) 保留 v1 在 DEFAULT_MODELS 是正确的，须写明理由：DEFAULT_MODELS 是 v1 唯一的门禁。可选的低成本回归：engine-tl 对三个不变局（healthy / monitor_only，§3.1 标「逐位相同」）继续对 v1 golden 断言。

### R-B-03 · MAJOR · 哈希面陈述不完整；I-11 发布门看不到 TL-001；Q10 声明义务不闭合

**证据**
- `src/core/engine.js:572-582`：model_hash 由 assumptions / limitations / equations 等九字段构成。§5① 要删 F-1 句、改写假设和方程文本，因此**所有** TL-001 配置的 run_hash 都会变，包括 healthy / monitor_only（尽管其序列逐位不变）。草案写的是「随引擎调速器切换而变化」，口径偏窄。
- `src/core/schema.js:121`：config_hash 投影含 model_version。草案没说 TL-001 SystemDef model_version（`systems.js` 现为 `'1.0.0'`，与 golden 的 `gt.sync.tl.l0` 分属两个 id 域，见 v1 规格 §1.2）是否升位；若升位，config_hash 也会变。
- `tools/verify-i11-bitidentity.mjs:39-75`：legacy 12 / gt 46 两个套件都不含 TL-001（两份基线 grep `TL-001` = 0）。按 README §8.1「逐配置列出差异」执行时，现有工具对 TL 产不出任何 before/after。

**修复**：§5 哈希行改为「TL-001 全部配置 run_hash 变（model_hash）；config_hash 随新 Q12 定」。Q10 声明义务补全：
1. 以上一发布提交（detached worktree）对 TL 配置集（9 个 golden 映射配置 + 默认配置）出 before/after 表。工具路径须定：证据内一次性脚本，或 additive 增 `--suite tl` 并在 v1.20 归档 TL 基线；
2. legacy 12/12 与 gt 46/46 须仍全等，作为 GT-001 零触碰的机检证明；
3. V1_FACES §24 行显式点名哈希面；
4. 短 CHG；
5. 面向用户的旧证据包说明（见 R-B-04）。

### R-B-04 · MAJOR · R-1「旧包照常复核通过」只部分成立；对比页行为未声明

**证据**
- `src/core/bundle.js:447-461`：run_hash 确实由包内字段重算、不重跑仿真 ✓。但 `:466-468` → `compareRecomputed`（`:251-291`）还会用**当前代码**的 `FL.core.metrics.compute` / `FL.core.checks.evaluate` 对导入序列重算指标和检查，不一致即抛 CN-E08。因此 R-1 只在「第二批不改 TL 既有族的 metrics / checks 计算」的前提下成立。
- `src/core/engine.js:3597-3599`：导入的 v1 TL Run 与新跑的 v2 Run 对比时 `sameModel=false`，界面会显示「model_hash 不一致，禁止因果表述」。这是用户可见的变化，草案没有登记。
- 仓库内没有任何 TL 证据包夹具（`data/`、`tests/` grep 为空），这条结论目前无机检。

**修复**：第二批约束写入 §4 项 9：「TL 既有族的 metrics.js / checks.js 计算零改动」。增加回归：在第二批前的 HEAD 导出 TL 包（至少 sensor_drift + line_fault），作为 `tests/bundle.test.js` 夹具，第二批后导入须通过。对比页行为写入 Q10 声明。

### R-B-05 · MAJOR · §5① SystemDef 影响清单不全；有误改 GT001 共享对象的风险

**证据**（`src/core/systems.js`）：
- `:3261` summary「积分调速器」；`:3262` questions[2]「调速器持续减燃料」；`:3204` P_gen_cmd_kW 的 definition / formula 是积分式；`:3222` TL_FAULT_OVERRIDES.sensor_drift 写「持续减燃料」。
- `:3340` A-gov-integral 由 GT001 过滤继承；`:3347` A-tl-no-damping 写「阻尼由…调速器积分承载」；`:3348` A-tl-manifold 写零特征值流形，v2 §3.3 已在接通态推翻；A-tl-smib 写「X_line = 3.2 Ω」，需加两回并联语义。
- `:3362` EQ-GTL1-9/10 由 GT001.model.equations 过滤继承；`:3373` acceptance 指向 gt_tl_joint_v1；`:3315` faultAnchors；`:3288-3289` line 组件描述只写 line_fault。
- 因果模板 tl-line-fault n4（「调速器积分提供阻尼…流形」）、tl-load-step mechanismSummary 和 n4（「积分调速…流形」），以及 `:3422/3461/3500` 的 assumptions 引用 A-tl-manifold。
- TL 的方程和假设是从 GT001 clone / filter 得到的。如果在 GT001 对象上改，GT-001 的 model_hash 会变，I-11 gt 套件 46 配置随之全变。

**修复**：§5① 逐条列出上述改动点，并写明一条纪律：所有 TL 改写只走 TL 本地覆盖表或新的 `EQ-GTL1-9J/10J` 行，GT001 对象零触碰。门禁：I-11 gt 46/46 全等，加 engine-gt.test 全绿。

### R-B-06 · MAJOR · 「run-g2 零增步」计数准确，但步 38 / 步 40 判据重指向须按步账纪律登记

**证据**：`tools/run-g2.mjs:189` 写明「任何增删步必须在 CHG 登记步数账 …… 既有步顺序/判据/命令零改动」。步 id 字串里嵌着 v1 事实：`:163`「gt_tl_joint_v1 7 Run × 30 列 … F-1 登记面」，`:168`「8 Run × 29 列——linux64 实测 0.0」。第二批要把两步的参照 golden 和断言集都换掉，其中删除 F-1 断言并移除引擎↔v1 门。这超出「判据同构」的说法。

**修复**：§5⑦ 改为「40→40；删 0 增 0；**重指向 2**（步 38 → v2 8 Run × 30 列；步 40 → v2 9 Run × 29 列）」，随批准 CHG 登记步数账，step id 字串同步更新（先例：步③ verify_golden gt001 重指向 gt001_v3 时的 label）。「实测 0.0」须在 v2 上重测后才能写进 label。

### R-B-07 · MAJOR · FMU 不重钉：内核面核实成立，但 V312 文字和包内 manifest 有遗留

**核实（成立）**
- `tools/backend/fmu/gt_tl_joint_l1.c:111-114/:184`：p_elec_scale 是任意 Real，modelDescription 第 33 行无 min/max，0.5 可直接输入；
- 调速器在 host（`tools/backend/py/fmu_runner.py:646-650`）；line_trip 只需改 host 的 `scale_at`（`:589`）和 `TL_RUNS`（`:471-492`），内核零改动成立。

**遗留**
1. 已钉包内的 `model_manifest.json` 声明 `model_version "1.0.0"`、假设「governor integrator … live in the host」、局限「zero-eigenvalue equilibrium manifold (spec 3.3)」。全部 FMU 先例中，manifest 的 (model_id, model_version) 都等于 golden 的（gt001_l1 / fc001_l1 与其 golden 均为 1.0.0）。Q7 选 2.0.0 会首次打破这一点，须显式登记「包版本只覆盖内核；v2 的变化在 host」。
2. V312 §13（`V312_BACKEND_ADMISSION_CHECKLIST.md:177/178/181`）的「parity golden gt_tl_joint_v1」「8 Run × 29 列 139,432 值 0.0」，以及 `gt_tl_joint_parity.py` docstring 中 sin 大参数「|δ|max = 1.021 rad」销项，须按 v2 改写。§14（`:194`）的 golden 清单 5 → 6。
3. `tools/backend/fmu/build_fmu.py:134-175` 的 TL manifest 块、`.c`、`modelDescription.xml` 须声明零触碰，任何字节变化都要重钉。C-1（win64 构建并重钉）时是否顺带更新 manifest 文本和 model_version，须预先定。

**修复**：§4 项 9 补上述三点。Q7 加子项 (c)「golden 2.0.0 与 FMU manifest 1.0.0 分离的登记口径」。ROADMAP §4 条件项注明「V312 文字行（非重钉）」。

### R-B-08 · MINOR · line_trip 的键面和参数面欠定

**证据**
- 引擎的事件 magnitude 取自 `cfg.fault.params.magnitude`（`engine.js:2714-2716`），因此 SystemDef 必须给出 param 域。草案没写是可调还是固定 0.5（固定 0.5 才符合「双回线」语义），也没考虑零参数族这一替代（MG island_event 先例：magnitude / unit 为 null）。
- 单位 `p.u.`：事件单位不经 UNIT_DICT 校验，可用；但**禁止**加入 `systems.js` UNITS，否则七个系统的 model_hash 全变（`tests/engine-tl.test.js:192-193` 守卫同理）。
- defaultFaultFamily 取目录首族（`tests/core.test.js:257`、`engine-tl.test.js:178`），line_trip 须排在 line_fault 之后。
- SystemDef 的 fault id 须与 golden fault_id `tl_single_circuit_trip` 一致。
- 引擎触点：`engine.js:382`（族白名单）、`:2651`（EVENT_TYPE）、`:2658`（TARGET_SIGNAL）、buildEvents（无 EV-002）、`:2881`、因果模板 id。

**修复**：Q5 增加子项：param 域 / 零参数、单位落点、目录位置、fault id。

### R-B-09 · MINOR · oracle 独立性与 V-03 的耦合、GLJ 沿用口径未写清

**证据**：v1 规格 §4 项 2「不 import 任何既有 oracle」，而 mg001_combo_oracle 先例 import 了 mg001_oracle 的常量（`tools/oracle/mg001_combo_oracle.py:32`）。V-03 只对 oracle 自身文件字节取哈希（`oracle_base.py:22`），所以如果 v2 import v1，v1 被改动时只有 v1 自己在 DEFAULT_MODELS 中的 V-03 会报警。「GLJ-1…6 沿用」中，GLJ-4 的锚点全表和 GLJ-6 的门值必然要按 v2 重冻结，GLJ-2 的 r_line 须带上 s = 0.5。

**修复**：Q8 增加「全量复制（独立）/ 只读 import v1 常量」二选一；若选 import，与 Q9(a) 绑定。§4 项 6 改为「GLJ-1…6 形态沿用、数值 emit 轮重冻结」。

### R-B-10 · MINOR · golden 元数据计划缺项

**证据**：v1 规格 §4 项 8 对 schema v2 字段面逐项列出，v2 草案 §4 没有写：supersedes 字串（见 R-B-02）、approval 三字段引用哪条批准 CHG、model_provenance（按 V312 §14 应为 `fmu_l1_lumped_unvalidated`）。MODELS 行键 `gt_tl_joint_v2` 偏离功能后缀命名先例（`mg001_combo` / `gt001_comb`），可以接受；但 `verify_golden.py gt_tl_joint` 的 CLI 语义仍是 v1（`scripts/verify_golden.py:756`），须声明。

**修复**：§4 项 1/7 补上这四项。

### R-B-11 · MINOR · Q 清单与裁定章缺少以下用户决策

- **Q12** TL-001 SystemDef model_version 是否升位（影响 config_hash；GT Q12 先例否决过升位）；
- **Q13** Q10 的面 / 版本判定（breaking 与否；v1.20.0 还是 v2.0.0；是否重开 V1200 R1-5）——R-B-01；
- **Q14** line_trip 参数面——R-B-08；
- **Q15** FMU manifest 与 golden model_version 分离口径——R-B-07；
- **Q16** 旧包兼容回归和 TL I-11 套件的工具形态——R-B-03/04。

§10 裁定章须增 **R-TLV2-04**（八面 / 哈希面 / 版本知情确认）。

### R-B-12 · NOTE · §3 锚点不可复核

§3 锚点来自 scratchpad 原型，不入库，评审方无法复跑（V1200 B1-1 授权此做法，R-4 也已登记）。建议 v0.2 标明哪些锚点会升格为 GLJ-8/9/10 硬断言，并对 §3.1 中「是/否」逐位列，在 emit 轮以正式 oracle 复核后回填。

### R-B-13 · NOTE · 已核实无误的项

- 计数：golden 17→18（`data/golden/` 17 份）、MODELS 15→16、DEFAULT_MODELS 10→11 尾追加（`verify_golden.py:121-399`）✓。
- `oracle_base.py` 本体零改动：CONFORMANCE_REGISTRY 只有 3 条 legacy / documented（`:362-436`），「出生接入」指物理 import，不改注册表 ✓。
- EVENT_KEYS 零变化（`scenario.js:52`；族名按目录校验，`:297-300`）✓；scope / eval 零变化（`arena.js:112`）✓。
- v1 oracle 受 V-03 锚定，必须零改动 ✓。
- 补充一点：引擎没有 line_open 配置面（engine-tl.test 文件头，Q8=(i)），因此引擎侧的「调速器切换」实际就是无条件下垂；积分支只存在于 oracle 和 host 壳。v0.2 应写明这一点，避免第二批误增 config 键（那会是面③变更）。

---

## 第二批破坏清单（batch-2 break list）

| 文件 | 位置 | 会坏 / 须改的内容 |
|---|---|---|
| `tests/engine-tl.test.js` | :27 / :45 / :52 / :57 | golden 路径与 id → v2；8 → 9 Run；RUNS 增 joint_line_trip（引擎映射 7 → 8 局） |
| 同上 | :155 | `load_step δ ≈ −11.4° ±0.1`：v2 为 −11.54°，**FAIL** |
| 同上 | :158-161 | F-1 块：`P_gen_end < 0` **FAIL**（v2 为 21.0）；limitations 含 'F-1' **FAIL**（已删句） |
| 同上 | :165 / :174 / :178 / :199 | line_fault 因果 5 节点（模板改写时）；增 GT-001 拒绝 line_trip；默认族 line_fault；结尾文案 |
| `tools/oracle/gt_tl_joint_parity.py` | :27 + docstring | GOLDEN_PATH → v2；8 Run × 29 列 → 9 Run；\|δ\|max 销项；MEASURED_LINUX64 在 v2 上重测 |
| `tools/backend/py/fmu_runner.py` | :471-492 / :589 / :646-648 / :502 | TL_RUNS 增 joint_line_trip；scale_at 在 [20, ∞) 取 0.5；按 line_open 分支下垂 / 积分；docstring |
| `tools/run-g2.mjs` | :160-168 | 步 38 / 40 的 id 字串与注释（R-B-06） |
| `src/core/engine.js` | :382 / :388 / :442-452 / :2407-2445 / :2651 / :2658 / buildEvents / :2881 / :3072+ | 族白名单；报错文案；validateConfig 增 line_trip 守卫；simulateTL001 下垂 + isTrip；EVENT_TYPE；TARGET_SIGNAL；EV-001 only；因果占位符 |
| `src/core/systems.js` | R-B-05 全清单 + 新 fault 条目 + 新因果模板 | 只改 TL 本地，GT001 零触碰 |
| `scripts/verify_golden.py` | import / MODELS / DEFAULT_MODELS | v2 oracle import、新 MODELS 行、尾追加、注释块 |
| `tests/bundle.test.js` | 新夹具 | v1 TL 包导入回归（R-B-04） |
| `docs/FAULT_CATALOG.md` | §9 :378 等 | 「δ 最大 58.5°」及 gt_tl_joint_v1 引用 → v2 值；增 line_trip 行；:195 / :212 历史表 |
| `docs/V1_FACES.md` | §24 | 新增一行，点名哈希面 |
| `V312_BACKEND_ADMISSION_CHECKLIST.md` | §13 / §14 | 文字更新（R-B-07） |
| `ROADMAP.md` | §1 | golden 18 / 注册行 16 |
| README 当前版本段 | — | 随发布更新 |
| `tools/verify-i11-bitidentity.mjs` | 可选 | `--suite tl`（R-B-03） |
| `src/core/metrics.js` | :460 | 注释（计算零改动，R-B-04） |

**已核实不受影响**：`tools/e2e.mjs`、`tools/file-smoke.mjs`、`tools/ui-walkthrough.mjs`（只有 7 系统卡计数）、`tests/arena.test.js`、`tests/scenario.test.js`、`tests/core.test.js`（line_trip 追加在 line_fault 之后的前提下）、`tools/oracle/oracle_base.py`、`src/core/checks.js`（TL 检查与调速器形态无关）。
**不在本规格范围**：`tests/teaching.test.js` 的路径计数只在 S-3 增 TL 路径时变化（属 C-3 / S-3 验收）。

**文件结束**。TLV2_G2B_REVIEW_B（评审线 B，2026-11-28，对象 v0.1）。
