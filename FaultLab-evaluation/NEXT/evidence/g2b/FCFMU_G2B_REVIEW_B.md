# FCFMU_G2B_REVIEW_B — FC-001 FMU 规格草案独立评审 B（治理/契约面）

- **评审人身份**：独立评审 B——治理/契约面（V170 波 W2b；与 W2a 物理/数值评审互不可见，独立形成结论）
- **评审日期**：2026-11-15
- **评审对象版本**：`FC001_FMU_G2B_SPEC_DRAFT.md` **DRAFT v0.1**（2026-11-15，478 行 wc -l 实测；起草授权 CHG-20261115-04）
- **评审性质**：只读审计 + 仅写本报告文件；未修改仓库任何其他文件

## 实读文件清单（全部为评审期内直接打开核验，非转述）

| 文件 | 核验面 |
|---|---|
| `FaultLab-evaluation/NEXT/FC001_FMU_G2B_SPEC_DRAFT.md` | 评审主对象（全文） |
| `FaultLab-evaluation/NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md` | 落档外部原文（转写保真对照基准，全文） |
| `docs/V1_FACES.md` §2 八面 + §9 | 八面 additive 核对的契约基准（:42-388/:554-580） |
| `src/core/scope.js`（全文 119 行） | FC 族四条件 :44-52、后端 Run 强制 extension_preview :95-102 |
| `src/core/registry.js`（:30-160/:225-280） | runHashInput :46-58、:111/:254 provenance 两枚举 |
| `src/core/engine.js`（:532-564/:1390-1416/:3090-3134） | :551 model_provenance、:1407 语义考据、model-hash 比对检查现行位 |
| `src/core/scenario.js`（:30-60/:400-470/:486/:777） | :40 FEEDBACK_MODES、:52 EVENT_KEYS、:430-447 电化学显式键先例 |
| `src/core/systems.js`（:505-510/:590-595） | FC actuator_fault = 氢气供给阀 valve（:506/:592） |
| `scripts/verify_golden.py`（:99-266/:268-394/:397-594） | DEFAULT_MODELS :278、T-B 分派链 :300-363、V-09 :556-577、MODELS 十行 |
| `tools/oracle/oracle_base.py`（:40-105/:139-205/:249） | APPROVAL_FIELDS 三字段 :49、六成员 :57-58、write_golden_with_sidecar LF :179-205 |
| `data/golden/` 目录 ls + fc001_v2.json/mg001_v1.json 逐文件读取 | 12 golden + 12 sidecar 实存；gate 键面；双事件快照结构；t 长 601 |
| `FaultLab-evaluation/NEXT/V312_BACKEND_ADMISSION_CHECKLIST.md`（全文 116 行） | FROZEN :6、B-4 :7、§6 断言 1-3、§7 Q-5、C-2 :96、§9⑥ :110 |
| `tools/backend/py/fmu_admission.py`（全文 153 行） | 八字段 :24-27、A-3 :66-68、A-4 docstring :12-13、PLATFORM_DIRS :28-29 |
| `tools/backend/py/fmu_runner.py`（grep 定位 :5/:101/:155-157） | D-27 FR-3「不虚设」 |
| `tools/run-g2.mjs`（STEPS 计数 + :120-175 纪律块） | 35 步实数、预算线 ≤35、I-7 纪律原文 |
| `tools/copy-guard.mjs`（全文 99 行） | SCOPES :15、BANNED 39 模式 :30-45、ALLOW 14 :48-61、D-11 :68-70 |
| `FaultLab-evaluation/NEXT/ORACLE_INTERFACE_D2.md` §3（:117-185） | §3.1 新 id 判据、§3.3 approval 纪律、§3.4 backend 留位、§3.5 正交性 |
| `FaultLab-evaluation/DECISIONS/DECISIONS.md`（:1594-1612/:1767-1778） | CHG-20261114-06、CHG-20261115-04/-05 |
| `FaultLab-evaluation/NEXT/V06_ROADMAP.md` :21 | I-7 纪律原文 |
| `FaultLab-evaluation/NEXT/V170_WAVE_DESIGN.md` :94-108 | W2a/W2b 互不可见 + W4 代录结构 |
| `docs/CONTRACT.md`（:84/:360/:391） | :391「时间数组严格 601 点」冻结面 |
| `tests/teaching.test.js` :264 | BANNED.length===39 镜像断言 |

**实跑命令**（摘录）：`grep -rn "水位\|液位\|water level\|liquid level" src/`（exit=1，零命中）；`node tools/copy-guard.mjs`（`PASS: no banned copy in src/** (39 patterns)`，exit=0）；`python -I` 复刻 verify_golden.py:300-350 分派链对 19 个新信号 id 逐键路由追踪；`python -I` 读 fc001_v2/mg001_v1 golden 结构；`git show 7aed9f6:src/core/engine.js | grep -n sameModel`（:1395-1397）；STEPS 条目计数（35）。

---

## verdict

**`PASS_WITH_CONDITIONS(3)`** —— 治理/契约面主线断言经实读全面相符（八面 additive、B-1a 键面、V312 准入、步数账、copy-guard 预查五项全过，白名单/哈希/三档 scope 语义零变化成立），但存在 1 项断言与实现不符（T-B 分派链 r_meas_water_mL 路由叙述失实）、2 项冻结面引用锚点失准与 1 项验收口径缺口未登记，须在批准轮（FCFMU-G2b-02）收口前按条件 B-1…B-3 修正后方可冻结。

---

## 发现清单

### P1（阻断级——断言与实现不符）

**P1-1 草案 §4 项 8 对 `r_meas_water_mL` 的 T-B 分派链路由断言失实：该键不落 f_Hz_atol 兜底，而命中 `r_meas` 子串支走 kW 容差（静默量纲错型），KeyError/fail-loud 结论对该键不成立。**

- 草案原文（§4 项 8）：「fc001_fmu_v1 序列含 *_mL（V_water_store_true_mL / V_water_store_meas_mL / **r_meas_water_mL**）……verify_golden T-B 分派链实读（:320-357）**无 `_mL` 支、无无量纲支 ⇒ 落 f_Hz_atol 兜底而 gate 块无 f_Hz_atol 键 ⇒ KeyError（fail-loud……）**」——把三个 `_mL` 键统一归入兜底 KeyError 形态。
- 实读证据（scripts/verify_golden.py 分派链，逐行实读）：
  - `_mL` 后缀确无专支（:312-349 全链枚举：`_A`/`_Hz`/`_rpm`/`_K`/`_kPa`/`r_true` 子串/`r_meas` 子串/`_kW`/`SOC`/`_pct`/`_V` 条件支/`_kWh` 条件支/f_Hz_atol 兜底 :350）——草案「无 `_mL` 支」这部分正确；
  - 但链序中 **:322-325 的 `if "r_true" in sid` / `if "r_meas" in sid` 子串判别先于兜底**：`r_meas_water_mL` 含子串 `r_meas` → 命中 :324-325 → `return tol["r_meas_kW_atol"]`。实测复刻（python -I 逐行镜像 + 19 键逐一追踪）输出：
    ```
    V_water_store_true_mL   -> f_Hz_atol fallback   （KeyError 若 gate 缺 f_Hz_atol——草案所述形态成立）
    V_water_store_meas_mL   -> f_Hz_atol fallback   （同上成立）
    r_meas_water_mL         -> r_meas_kW_atol       （KeyError('r_meas_kW_atol') 若 gate 缺该键；
                                                      gate 有该键时 = kW 容差静默用于 mL 量——量纲错型路由）
    ```
  - 对照先例：fc001_v2 gate 实测键面含 `r_meas_kW_atol`（无 `f_Hz_atol`/`p_kPa_atol`）——若 fc001_fmu_v1 gate 沿 fc001_v2 风格，`r_meas_water_mL` 将**无任何 KeyError** 地走 kW 容差；
  - 该形态正是 FLCAP A-4/B-1 勘正所区分的「量纲错型静默路由」类问题（verify_golden.py:340-347 注释原文：「非量纲错配，是兜底键缺失」——本例恰好相反：**是量纲错型而非兜底键缺失**）。
- 影响面：不影响 Q15 修复方案的成立性（`_mL` 分支**置于 `_kPa` 后、r_true/r_meas 子串判别之前**即同时正确路由三个 `_mL` 键——草案「置于 `_kPa` 后」的插入位恰好满足），但草案把该项登记为「fail-loud 形态实读确认」（§9 R-5 同句），若按此冻结，批准文本将固化一段与实现不符的分派链描述；且该键的真实形态（静默量纲错型）比草案所述更需在实现轮验收中显式排除。
- 落点：条件 B-1。

### P2（应修）

**P2-1 草案 §1.7 B-1a 行引用「face③ 冻结边界原文 V1_FACES:184-186」锚点失准：:184-186 实读为 inertia/thermal 缺省解析键的哈希形态描述（与显式键形态相反方向），冻结边界原文实际在 :197-198 + §9 v1.2.0 修订记录。**

- 草案原文（§1.7 B-1a 行）：「既有全部场景 scenarioHash 零变化（face③ 冻结边界原文 V1_FACES:184-186——FC Q9 定案先例逐字适用）」。
- 实读证据：
  - `docs/V1_FACES.md` :183-187（面③承诺内容）实读：「MAX_EVENTS=12；固定运行网格 60 s / 0.1 s 守卫……事件级模型深度轨键：`inertia_model`（三值枚举……缺省解析为系统默认轨）与 `thermal_model`（两值枚举……缺省 off）——**解析轨入归一化面与哈希**」——:184-186 描述的是**缺省解析入哈希**形态，恰与草案所主张的「显式键缺省 absent 零哈希变化」形态方向相反；
  - 面③**不在承诺内**首条（:197-198）实读：「新可选事件键（……）additive；**新键只影响使用它的输入，既有场景解析与哈希不变**」——这才是草案主张所引的冻结边界原文；
  - `docs/V1_FACES.md` §9（v1.2.0 记录，:579 行附近）实读：「face③/面⑤/面⑥/面④/§3/§1 零触碰（scenario 新键 `electrochem_model` additive 语义由面③ 冻结边界原文「新可选事件键……新键只影响使用它的输入」直接承载，**B-1(a) 显式键条件式形态即对该边界的兑现**」；
  - `src/core/scenario.js` :430-436 实读（电化学键先例注释）：「**仅在场景输入显式提供时**校验并写入归一化事件与 hashProjection，**缺省（不提供）全链 absent——不解析为系统默认轨**……显式键条件式哈希形态 ⇒ 既有 FC 场景 scenarioHash 零变化」。
- 判定：**语义主张本身成立**（实现、面③ 边界、v1.2.0 记录三重支撑），但所引行号 :184-186 指向语义相反的文本段——批准轮若按该行号复读将以「缺省解析入哈希」文本锚定本项裁定，构成锚定错误。落点：条件 B-2。

**P2-2 G9 原文 R-G9-04 验收口径（四域零出现）与 copy-guard 实际扫描域（仅 src/**）的缺口未登记——草案自身纪律「命名/结构/行数差异一律登记 Q 点或勘误，不静默改写」在此处未兑现。**

- 草案原文：§4 项 11 仅写「R-G9-04 copy-guard exit 0（Q11 增词联动）」——将 R-G9-04 收窄为「copy-guard exit 0」，未登记原文口径差异。
- 实读证据：
  - G9 落档原文 :355（R-G9-04）：「`node tools/copy-guard.mjs` exits `0` **with zero occurrences of prohibited liquid-level or overclaiming terms across `src/`, `tools/`, `docs/`, and `FaultLab-evaluation/`**」；
  - `tools/copy-guard.mjs` :15 `SCOPES = ['src']` + 头注 :7「docs/** 与 FaultLab-evaluation/** 是证据引用，不扫描」——机检域仅 src/**（V1_FACES 面⑧ :385-386：「当前实现只扫 src/**——边界即承诺，未来扩扫描域 = additive 收紧」）；
  - grep 实跑：`grep -rln "水位\|液位\|water level\|liquid level" FaultLab-evaluation/` → **3 个文件命中**（`NEXT/FC001_FMU_G2B_SPEC_DRAFT.md`、`NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md`、`NEXT/V170_WAVE_DESIGN.md`——治理链自己的文件因转写禁词定义而含该四词字样）；
  - `grep -rn ... src/` exit=1（零命中）；tools/ 与 docs/ 亦零命中（本评审实跑）。
- 判定：无论按哪种读法（copy-guard 须扫四域 = 扫描域缺口；或四域零出现须另行机检 = 验收手段缺口），R-G9-04 原文字面在仓内**当前不可满足**（FaultLab-evaluation/** 内三文件含四词字样——含本草案与落档文件自身），且 copy-guard exit 0 不证明四域零出现。草案将该判据静默窄化为「exit 0」，违反其自身的转写差异登记纪律。该缺口须在批准轮显式登记仓内化口径（建议：copy-guard exit 0 = src/** 域机检 + tools/docs/FaultLab-evaluation 域按证据引用豁免并以 grep 抽检登记，或走扫描域 additive 扩张裁定）。落点：条件 B-3。

### P3（建议）

**P3-1 §1.2「model_hash 自述一致性检查（engine.js:1407 面）」为陈旧行号锚——机制实存但现行位置已漂移至 :3386-3388。**
- 实读：现行 engine.js:1407 = onTrackOnly 信号补建注释（v1.2.0 引入，git blame 实测 2b53b39）；model-hash 比对检查（「model_hash 不一致，禁止因果表述」）现行在 :3386-3388；`git show 7aed9f6:src/core/engine.js` 实测该检查当时在 :1395-1397。该 :1407 引用系沿承 V312 §7（:84「防 model_hash 与 JS 相同致 engine.js:1407 检查语义失真」）与 fmu_admission.py A-3 注释（:11）两处陈旧锚——两处上游均写于行号未漂移时点。
- 建议：按草案行号基准说明的自定纪律（「批准轮实读复核后加注」）补加时点注记，语义锚改为「model-hash 比对检查（engine.js:3386-3388 现行位；V312 §7/fmu_admission A-3 原引 :1407 为陈旧快照）」。推荐结论（model_id 自述新值）不受影响——其成立的独立依据是 fmu_admission.py A-3 自述禁令（:66-68 实读）。

**P3-2 草案头部引 CHG-20261114-06 裁定②写「不撞既有 12 golden 字节冻结」——台账原文无计数、落档勘误三写「11 golden」，草案未注记计数偏差。**
- 实读：DECISIONS.md:1602（裁定二原文「golden 走新 id fc001_fmu_v1，不撞既有 golden 字节冻结」——无计数）；落档文件 :34「不撞既有 11 golden 字节冻结」（2026-11-14 时点准确）；data/golden/ ls 实测现值 12（v1.6.0 gt001_v4 于 CHG-20261115-03 入库后 +1）。
- 判定：12 为 2026-11-15 事实正确值（§0 不做清单已带「2026-11-15 实读」注记），但头部引文位置未注记「落档勘误原文 11 → 现值 12」的偏差说明。建议补一行注记，保持 2' 逐字保留声明的自洽。

**P3-3 §4 项 8/项 12 未列 `_kPa` 六键对新 gate 块的键声明要求（p_kPa_atol）。**
- 实读：分派链 :320-321 `_kPa` 支 `return tol["p_kPa_atol"]` 为**无条件读取**；fc001_v2 gate 实测键面**不含 p_kPa_atol**（含 E_kWh/I_A_*/P_kW_*/SOC_pp/T_K_atol/V_stack_*/r_meas_kW_atol/r_true_kW/t_s/tier）。新 golden 的 6 个 `_kPa` 键（p_O2_ca_true_kPa/p_N2_ca_true_kPa/p_H2_an_true_kPa/p_ca_true_kPa/p_ca_meas_kPa/r_meas_p_kPa）须在 fc001_fmu_v1 gate 块声明 p_kPa_atol，否则同形态 KeyError。
- 建议：FCFMU-G2b-03 工作面（§4 项 12）补列该 gate 键声明为 emit 交付要件（emit 轮自控、非阻塞，但应在预期失效面清单显式登记）。

**P3-4 禁词入表（Q11）的连带触碰面 tests/teaching.test.js:264 镜像断言未列入 §4 项 12/§8 FCFMU-G2b-04。**
- 实读：tests/teaching.test.js:264 `eq(BANNED.length, 39, 'BANNED 模式数=39')`——BANNED.length 硬编码镜像（copy-guard.mjs:23-25 注释自述该镜像机制）；四词入表后 39→43 须同步该断言（v1.1.0 MG 六词入表时同款同步先例）。
- 建议：补入 FCFMU-G2b-04 交付清单与 §4 项 12 预期失效面。

**P3-5 §1.7 引用「scenario.js:419-436 电化学键先例」范围偏移——电化学块实际 :430-447（:419-426 为 thermal 块尾部）。**
- 实读：grep 定位「electrochem_model（FC001_ELECTROCHEM_G2B_SPEC_APPROVED」注释块 :430 起，显式键语义句 :432-436。语义锚点在引用范围内（:430-436），零实义风险；按行号基准纪律加注即可。

**P3-6 fmu_admission.py A-4 纪律（provenance 标 numerical_simulation + self_declared=true）为 docstring 声明、admit() 未机检——Q2 例外 CHG 打包时应一并处置该「纪律文本 vs 机检现状」差异。**
- 实读：fmu_admission.py :12-13（A-4 docstring）vs admit() 函数体 :32-77（仅机检 A-1/A-2/A-3/A-5——无 provenance/self_declared 校验）；V312 §7 :85-86（「self_declared: true + UI 标签，**不新增 provenance 档位**」）。
- 建议：Q2 采 (A) 的 CHG 打包中显式登记：A-4 纪律文本同步修订（或落 A-4 机检）——否则将出现「准入纪律文本说 numerical_simulation、实现允许新档位」的静默漂移面。

---

## 条件清单（B-1…B-3——批准轮 FCFMU-G2b-02 收口前落正文）

**B-1 修正 §4 项 8 分派链追踪叙述（对应 P1-1）**
- 条件：§4 项 8（及 §9 R-5、Q15 联动句）改写为三分支精确表述——① V_water_store_true_mL / V_water_store_meas_mL + 五个无量纲键（y_O2_ca_true / cap_water_ratio_true / cap_water_ratio_est / u_o2_valve_cmd / u_drain_valve_cmd）落 f_Hz_atol 兜底 → gate 缺键 KeyError（fail-loud，草案原述对此部分维持）；② **r_meas_water_mL 命中 :324-325 `r_meas` 子串支走 r_meas_kW_atol（kW 容差用于 mL 的静默量纲错型）**——非 KeyError；③ 新增 `_mL` 分支的插入点显式钉为「置于 `_kPa` 支后、`r_true`/`r_meas` 子串判别之前」，并在实现轮提交既有键路由零变化证明（该插入点同时修复②的错型路由）。
- 为什么：P1-1 所述断言与实现不符；若按现文冻结，批准文本将固化失实的分派链描述，且静默量纲错型形态比 fail-loud 更需显式排除。
- 落点建议：§4 项 8 表行改写 + §9 R-5 风险行措辞同步 + Q15 推荐句补「插入点判别序」要件。

**B-2 冻结面引用锚点校正与时点注记（对应 P2-1、P3-1、P3-5、P3-2）**
- 条件：① §1.7 B-1a 行引用改为「face③ 冻结边界原文 V1_FACES:197-198（『新键只影响使用它的输入，既有场景解析与哈希不变』）+ §9 v1.2.0 修订记录（B-1(a) 显式键形态即对该边界的兑现）」；② §1.2 engine.js:1407 加陈旧锚点注记（语义锚 = model-hash 比对检查，7aed9f6 时点 :1395-1397、现行 :3386-3388；原引沿 V312 §7/fmu_admission A-3）；③ scenario.js 电化学键先例行号加注（实际 :430-447）；④ 头部「12 golden」处加计数偏差注记（台账无计数/落档勘误 11/2026-11-15 实读 12）。
- 为什么：本草案为待冻结文本，冻结面引用须可复读锚定——:184-186 指向语义相反文本段会误导批准轮复读；其余为草案自定行号基准纪律的兑现。
- 落点建议：§1.7/§1.2/头部行注记（加注不改引文体例——FC 体例 A-7 同款，草案行号基准说明已预留该机制）。

**B-3 登记 R-G9-04 四域口径缺口并给出仓内化裁定候选（对应 P2-2）**
- 条件：在 §11 增设 Q 点（或映射表 §4.3 行勘误注记）显式登记：R-G9-04 原文「zero occurrences across src/, tools/, docs/, and FaultLab-evaluation/」与 copy-guard 实际扫描域（SCOPES=['src']——copy-guard.mjs:15、V1_FACES 面⑧ 边界即承诺）的缺口；并登记事实——FaultLab-evaluation/** 现有 3 文件含四词字样（本草案/G9 落档/V170_WAVE_DESIGN——禁词定义性引用），字面口径当前不可满足；批准轮给出仓内化口径（候选：exit 0 = src/** 域机检 + 其余三域 grep 抽检登记豁免 / 扫描域 additive 扩张裁定 / 四域表述勘误化）。
- 为什么：P2-2 所述——草案对验收判据的静默窄化违反其自身「不静默改写」纪律，且该判据是 Q11 增词的门禁依据，冻结前必须口径明确。
- 落点建议：§11 新增 Q18（或并入 Q11 候选面）+ §4 项 11 行注记。

---

## Q 点独立意见表（治理相关 Q 逐条——独立形成，未参照评审 A 结论）

| Q | 草案推荐 | 评审 B 意见 | 依据（实读） |
|---|---|---|---|
| Q1（601/602 行） | (A) 601 点 + 事件快照相位承载 | **同意草案推荐 (A)** | CONTRACT.md:391「时间数组严格 601 点」冻结面实读；fc001_v2.json 实测 t 长 601 + 双快照结构（t_s=20.0，phase pre/left_limit + post/post_sample）；mg001_v1.json 同构双快照（MG 先例实存）；verify_golden.py:556-577 V-09 事件快照比对全链既有且无故障 Run 有专用放行路径；breaking= major 五件套（V1_FACES §3.2/§3.3 结构实读）。候选 B 的涟漪评估准确 |
| Q2（provenance 新值） | (A) additive 档位 + V312 显式 CHG 例外 | **有条件同意 (A)**。条件：① V312 FROZEN 修订 CHG 随批准轮打包（草案 Q17 已登记——确认）；② P3-6 一并处置（A-4 docstring 纪律 vs admit() 未机检的差异，随 CHG 落机检或修订文本） | 功能必需性成立：registry.js:111/:254 实测仅两枚举（analytical_demo/numerical_simulation）；V312 §7 :85-86「不新增 provenance 档位」实读；候选 (B) 下 §2.5.2 谓词无法成立（G9 原文 :240 谓词依赖新值实读）；V312 :6 FROZEN + :5「任何修改走 CHG」修订纪律实读 |
| Q3（actuator 语义） | (a) 族参数扩展（target 缺省逐位不变） | **同意草案推荐 (a)** | systems.js:506（氢气供给阀组件描述「actuator_fault 场景卡涩于 magnitude% 开度」）/:592（faultAnchors actuator_fault:'valve'）实读——既有族物理确为氢气阀，α_drain 执行器不同；scope.js:44-52 以 family 串为条件实读——族 id 不变 ⇒ scope 零触碰成立；B-1a 显式键保缺省逐位不变（scenario.js:430-436 先例）。候选 (b) 的波及评估（scope.js 白名单族条件扩张 + FAULT_CATALOG 新族登记）准确 |
| Q7（DEFAULT_MODELS 追加） | (a) 尾追加 "fc001_fmu" | **同意草案推荐 (a)** | verify_golden.py:268-277 注释史实读：B-5 尾追加 fc001_l1（FC 先例）→ v1.4.0 四 golden → v1.6.0 五 golden，全部尾追加 + 步① label 滞后维持登记；:278 现值五成员实测；face② 「verify_golden MODELS 注册行语义（重指向须 CHG）」——本项为新增行非重指向，additive 面成立；与 face⑦「优先并入现有步」口径（V120 DEC-5 先例）一致 |
| Q9（容差 tier + R-G9-02 ≤1e-9 张力） | (a) T-B + parity 独立机检 + 实测 ×≥10 冻结 | **有条件同意 (a)**。条件：emit 轮实测散差 ×≥10 冻结实际 gate 值之前，1e-9 不得写死为 gate 数值；实测超限停下显式 CHG 重议原文口径（草案已双向登记——确认即可） | T-B 同制佐证：face② 表 fl001_v2/fc001_v2/gt001_v3/fl001_v3/gt001_v4 全 T-B + fc001_v2.json 实测 tier=T-B；1e-9 为数值容差非位级承诺——与跨语言位级禁令不冲突的定性成立（R-G9-02 原文 :353 为「maximum relative error ≤ 1e-9」实读）；T-B 分派链参数化机制（:300-363）可承载新 gate 键面；parity 独立机检归属见 Q17 |
| Q11（禁词增补） | (a) 全局入表 + deviations 记录 | **有条件同意 (a)**。条件：① 同步 tests/teaching.test.js:264 镜像断言（39→43——P3-4）；② B-3 的 R-G9-04 口径缺口登记先行或同轮 | 实跑证据：四词不在 BANNED（:30-45 逐条计数 39 实测）+ src/** 0 命中（grep exit=1）+ `node tools/copy-guard.mjs` PASS exit 0；face⑧ 词表单调不减、增词=additive（:378-379 原文）；copy-guard.mjs:8 deviations.md 记录义务实读；「copy-guard 无分域机制 → 全局入表」的判定与实现一致（SCOPES :15、BANNED 无分域参数——草案偏离落档预裁定⑥「作用域限 FC-001 L1 域」已诚实登记）；MG=microgrid≠microgravity 的语义不冲突判定合理 |
| Q13（轨选择键面 + model_id） | (a) plant adapter 层绑定 + model_id 自述 fc.pem.fmu_l1 | **同意草案推荐 (a)**（附 P3-1 行号注记） | 场景零新键 ⇒ face③ 涟漪最小成立；model_id 自述依据独立于 engine.js:1407 陈旧锚——fmu_admission.py A-3（:66-68 禁占用既有系统 id + FS-3 自检实测）与 V312 §7 自述纪律实读；备选（场景显式键）的停下显式 CHG 退出路径登记完备；候选 fc.pem.fmu_l1/fc.pem.l1_fmu 均不撞 scope.js:44 的 fc.pem.l0（approved_fc 条件含 modelId 精确匹配——新 id 使 FMU 轨天然落 extension_preview，与 §4 项 10 两门禁面自洽） |
| Q15（gate 键面缺口） | (a) additive `_mL` 分支 + 无量纲专用 gate 键 | **有条件同意 (a)**。条件：按 B-1 修正项 8 叙述（P1-1）并钉死 `_mL` 分支插入判别序（`_kPa` 后、r_true/r_meas 子串判别前）；新 gate 显式声明 p_kPa_atol（P3-3） | 独立分派追踪（python -I 复刻）确认：五无量纲键 + 两 V_water `_mL` 键落兜底（草案此部分正确）；r_meas_water_mL 实走 r_meas 子串支（草案失实——P1-1）；`_V`/`_kWh` 条件支先例（:338-349）与「既有键路由零变化证明随实现提交」要求一致；「schema_id 与原文 §2.3 逐字一致优先」的取向合理（跨保真/文档对齐依赖 id 稳定） |
| Q17（步账/钉 hash/parity 归属） | (a) parity 独立步（SKIP 语义显式）+ 钉 hash CHG + 步账扩账申报 | **同意草案推荐 (a)** | run-g2.mjs STEPS 35 条实测 + 纪律块 :137-175（I-7：增删步须 CHG 登记步数账/归属层/理由；预算线 ≤35 实读）；V06_ROADMAP.md:21 I-7 原文实读；V312 §9⑥ :110「可选步 + SKIP 记 fail + skipped 计数」先例实读——parity 依赖编译产物（环境依赖显式化）的定性成立；fmu_sha256 钉 V312 须 CHG（V312 :5-6 FROZEN 纪律 + G9 R-G9-03 :354 pin 语义实读）；勘误②③④ 一次打包与 §0.1 承接表一致 |

（未列入表者——Q4/Q5/Q6/Q8/Q10/Q12/Q14/Q16——为物理/数值面或纯命名面裁定，超出治理路范围；其中 Q12 的键面机制部分（FEEDBACK_MODES :40 现值两枚举 + :486 封闭校验 + additive 单新值的最小涟漪）经实读与草案描述一致，供批准轮参考。）

---

## 独立性声明

1. 本评审仅以本报告头部「实读文件清单」所列仓库文件与实跑命令输出为输入；评审范围限定治理/契约面七项。
2. 草案 §10.1 中「评审人 A（物理/数值）」回填行与 CHG-20261115-05 台账行**未被读取作为评审依据**（本报告成文过程中未以任何评审 A 结论为锚定）；本报告全部 P/Q 结论由上列实读证据独立得出。若后续与评审 A 结论存在交叉（如 P1-1 的分派链追踪与数值面评审的可能重叠），属独立双路对同一实现事实的各自命中，非引用。
3. 除本报告文件（`FaultLab-evaluation/NEXT/evidence/g2b/FCFMU_G2B_REVIEW_B.md`）外未写入/修改任何仓库文件。

---

**评审 B 签署**：独立评审 B（治理/契约面）· 2026-11-15 · verdict `PASS_WITH_CONDITIONS(3)`（P1=1 / P2=2 / P3=6；条件 B-1…B-3 见上）。

**文件结束**。
