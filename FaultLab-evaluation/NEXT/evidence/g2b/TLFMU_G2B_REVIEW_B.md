# TLFMU_G2B_REVIEW_B — TL-001 跨系统联合 G2b 规格草案独立评审 B（治理/合同面）

- **评审人身份**：独立评审 B——治理/合同面（TL-001 跨系统联合 G2b 草案双评审；与评审线 A（物理/数值面）互不可见，独立形成结论；本评审全程未读取/搜索/引用 TLFMU_G2B_REVIEW_A.md）
- **评审日期**：2026-11-22
- **评审对象版本**：`FaultLab-evaluation/NEXT/TL001_FMU_G2B_SPEC_DRAFT.md` **DRAFT v0.1**（2026-11-20，85 行 wc -l 实测；起草授权 CHG-20261120-01——DECISIONS.md:1936-1938 实读）
- **评审性质**：只读审计 + 仅写本报告文件；未修改仓库任何其他文件
- **体例说明**：体例模板 = `evidence/g2b/FCFMU_G2B_REVIEW_B.md`（协调方指定先例）；按本轮授权要求发现编号 R-B-01…、严重度分档 BLOCKER/MAJOR/MINOR/INFO、末尾结论行 PASS / PASS-WITH-CONDITIONS / FAIL + 评审综述

## 实读文件清单（全部为评审期内直接打开核验，非转述）

| 文件 | 核验面 |
|---|---|
| `FaultLab-evaluation/NEXT/TL001_FMU_G2B_SPEC_DRAFT.md`（全文 85 行） | 评审主对象——§0 边界 :15-21 / §1 冻结表 :23-49 / §2 Run 矩阵 :51-58 / §3 golden 计划 :60-64 / §4 Q 点 :66-75 / §5 留白章 :77-83 |
| `FaultLab-evaluation/NEXT/TL001_CROSS_SYSTEM_RFC.md`（全文 173 行） | 已批准架构 RFC——八面影响面 §5 :124-135、TL-EQ-1..5 §3 :92-98、参数候选 :100-107、Q1..Q7 §7 :145-155、R-CS-01..04 §9 :161-168、不变式张力声明 :12-13 |
| `FaultLab-evaluation/DECISIONS/DECISIONS.md` :1880-1938 | 授权链 CHG-20261119-11（v1.16.0 波）/ CHG-20261119-12（RFC 落档）/ **CHG-20261120-01 :1936-1938（RFC 批准 + A-10 草案授权 + A-11 实现预授权——本轮主锚）** |
| `scripts/verify_golden.py`（全文 788 行） | MODELS :118-357（14 行注册面）/ DEFAULT_MODELS :375-376（**九成员实测**）/ T-B 分派链 series_limit :398-483 / metric_within :486-514 / V-03 :556-559 / V-03b :561-572 / V-06 :625-636 / V-07 双 null :647-668 / RUNS_GROUPS 分派 :585-603 |
| `docs/V1_FACES.md` 面② :123-170、面⑦ :318 起、OracleInterface 六成员 :217-222 | golden schema v2 冻结面（approval 非 null 方可写盘 :152-156、V-03/V-03b 语义 :150-151、MODELS 注册行语义 :157-158）、八面冻结结构 |
| `FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_APPROVED.md`（章节结构 :58-529） | 体例同构对照基准——§1.1 三层夹心 :132 / §1.2 工件与模型身份面 :149 / §1.4 参数面 :210 / §1.7 键面 :269 / §1.8 provenance :278 / §2.2 白名单哈希面 :308 / §2.3 事件快照面 :325 / §2.4 跨载体比对面 :336 / §3 锚点包络 :355 / §6 红线自查 :444-458 / §7 进入条件 :473 / §8 工作面分解 :483 / §9 风险 :492 / §10 评审记录 :506 / §11 Q 点 :529 |
| `FaultLab-evaluation/NEXT/GTL1_G2B_SPEC_APPROVED.md` | 物理权威锚核验——§2 方程集 EQ-GTL1-1…12 :129（草案头部 :9 引用成立）/ 常量表 ≥13 位有效数字登记先例 :146 / :164 |
| `FaultLab-evaluation/NEXT/V08_ROADMAP.md` §0 :15-21 | **I-10** 跨系统联合 golden 须独立 RFC :21 原文 |
| `FaultLab-evaluation/NEXT/V07_ROADMAP.md` §0 :19-22 | **I-8** 三层夹心模式复刻 :21 / **I-9** 已锚定 golden 的 oracle 文件 V-03 自冻结 :22 原文 |
| `FaultLab-evaluation/NEXT/V05_ROADMAP.md` :25 | **I-4** 门禁纪律（先文档后代码 G2b/G6→G7→G8；CHG 全程留痕）原文 |
| `src/core/scenario.js` :48-58、:23、:79-83 | EVENT_KEYS 封闭集 :52（11 键实测：key/label/family/params/t_start_s/t_clear_s/inertia_model/thermal_model/capacity_model/electrochem_model/feedback_mode）；FAULT_CATALOG 授权守卫 :79-83 |
| `src/core/systems.js` | SystemDef model_id 五行实测——FL 'fl001' :325 / FC 'fc.pem.l0' :668 / **GT 'gt.sync.l0' :977** / PV 'pv.pv.l0' :1218 / WT 'wt.aero.l0b' :1466 / MG 'MG-001' :1726 |
| `src/core/scope.js` :19/:44/:54/:73 | scope 三档 modelId 门禁形态（config.systemId 单数 + APPROVED.modelId 精确匹配） |
| `tools/oracle/gt001_fmu_oracle.py` :157/:161 | RUNS = RUNS_THERMO + RUNS_COMB / RUNS_GROUPS = {"thermo":…, "thermo_comb":…}——多组 oracle 分派按 golden.inertia_model 选组（verify_golden.py:592-596 同源实读） |
| `data/golden/gt001_v3.json`（python -I 逐字段实测） | golden_id=gt001_v3 / **model_id="GT-001"**（engine 轨惯例）/ tier=T-B / gate 11 键（含 f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_*/E_kWh/SOC_pp/r_true_kW/t_s）/ **series 27 列实测（含 "t"，全 ASCII）** / 6 Run（healthy/closed_loop_fault/monitor_only/load_step/actuator_fault/actuator_clear——**无 sensor_drift**）/ scalars 9 键 / inertia_model=thermo |
| `data/golden/fc001_fmu_v1.json`、`gt001_fmu_v1.json`、`mg001_v2.json`、`fl001_v3.json` | golden.model_id 两惯例实测——FMU 轨 = 点分自述 id（fc.pem.fmu_l1 / **gt.sync.fmu_l1**）、engine 轨 = systemId（MG-001/FL-001）；supersedes 字段形态 |
| `docs/FAULT_CATALOG.md` 章节 :14-289 | 逐系统章节结构（§1 FL / §2 FC / §3 GT / §6 PV / §7 WT / §8 MG——无 TL 章节） |
| `FaultLab-evaluation/NEXT/evidence/g2b/FCFMU_G2B_REVIEW_B.md`（全文 162 行） | 协调方指定体例模板 + 治理面先例（其 P1-1 = 分派链静默量纲错型同类形态） |

**实跑命令**（摘录）：`ls FaultLab-evaluation/NEXT/` + `ls …/evidence/g2b/`（定位 V1_FACES 等价物 = docs/V1_FACES.md 与既有 REVIEW 文件）；`python -I` 逐文件读 5 枚 golden JSON 结构（model_id/gate 键/series 全表/Run 键/scalars）；`python -I` 复刻 verify_golden.py:398-483 T-B 分派链对 TL 四候选 id（delta_rad/omega_rad_s/P_elec_kW/P_mech_kW 及希腊字母书写形）逐一路由追踪；DEFAULT_MODELS 成员计数（9）；`grep` 全仓定位 I-4/I-8/I-9/I-10/SERIES_IDS/EVENT_KEYS/FAULT_CATALOG/「每个 golden」（RFC :12 引用的「每个 golden 属于单一系统 model_id」逐字原文**全仓仅 RFC 自身自引两处**——V1_FACES/CONTRACT/ORACLE_D2 无此句）。

---

## verdict

**`FAIL`** —— 草案骨架方向与已批准 RFC/R-CS-01..04 定案一致（方案 A 松耦合、golden naming 落实 R-CS-04、Run 集形态、sin 散差 R-1 沿袭均正确），但存在 2 项 BLOCKER（授权清单明列的「键面 + 三层夹心」两个必交付章缺失；八面影响仅一句口号、六面零落实）与 6 项 MAJOR（verify_golden 注册计划零声明且 δ_rad/ω_rad_s 将发生 Hz 容差静默量纲错型；RFC TL-EQ 编号冲突 + V_gen 映射方程缺失；TL 参数值缺失不可实现；Q 清单/留白章双缺口 + 调速器积分器处置未列 Q 点；joint_gt_standalone 对照 Run 列语义/守卫载体缺失；V-03/I-9 出生接入声明缺失）——现状**不可进入双评审→用户批准→A-11 实现门禁**，须 A-10 轮内扩容重稿（v0.2）后重新双评审。

---

## 发现清单

### BLOCKER

**R-B-01 草案缺失 CHG-20261120-01 ② 明列的两个必交付章（键面、三层夹心），「体例同构」声明与实文不符——85 行骨架对 589 行同构体，批准门禁的评审对象不完整。**

- 位置引用：草案 :11「体例：GT001_FMU_G2B_SPEC_APPROVED v1.0 体例同构」；CHG-20261120-01 ②（DECISIONS.md:1937）原文「GTFMU 体例同构——TL-b 功角摇摆物理规格 G2b 草案（**EQ-TL 冻结表草案 + Run 矩阵 + 键面 + 三层夹心 + Q 点全候选**）→ 双评审 → 用户批准 → 实现轮（A-11）」。
- 发现描述：授权链明列五件交付（冻结表 ✓/Run 矩阵 ✓/**键面 ✗**/**三层夹心 ✗**/Q 点 ✓），草案 §0–§5 实测不含任何键面章（scenario/config 键、B-1a 显式键纪律承接——GT001_FMU 体例 §1.7 :269 对应物）与三层夹心章（oracle→golden→C99→parity→adapter→bridge——体例 §1.1 :132 对应物；A-11 预授权面恰含 C99/parity/adapter 全链）。逐章对照：体例同构体 589 行 20+ 章，草案缺 §1.2（工件与模型身份面/V312 准入承接）、§1.4（参数面）、§1.8（Epistemic/provenance 档位）、§2.2（白名单与哈希面）、§2.3（事件编码与快照面）、§2.4（跨载体比对面）、§3（锚点与包络——δ 稳态设计点表）、§6（红线自查 I-1…I-10 + copy-guard 预查）、§7（G2b 进入条件五项自查）、§8（工作面分解）、§9（风险）、§10（评审记录结构留空）。
- 严重度：**BLOCKER**——双评审与用户批准的门禁对象按授权定义不完整；若按现文批准，A-11 实现轮对键面/夹心/哈希/快照面将无冻结契约可依，违反 I-4 先文档后代码纪律（V05_ROADMAP.md:25）。
- 建议：A-10 轮内扩容为 v0.2——至少补齐授权明列的键面 + 三层夹心两章，并复刻体例 §1.2/§1.4/§2.2/§2.3/§6/§8 结构位；锚点包络章（δ 稳态标称值）可数值留白（批准轮 emit 冻结纪律，体例 §3.3 :389 先例），但章结构须在。

**R-B-02 §4 Q6「八面影响：全 additive」为一句口号——对照 RFC §5 逐面核对，八面中六面（③④⑤⑥⑦⑧）在草案零落实，面①②仅骨架级；本 golden 正是 I-10 独立 RFC 所为的架构突破对象，批准依据却无逐面承载。**

- 位置引用：草案 :75「| Q6 | 八面影响 | 全 additive |」；RFC §5 :124-135（八面逐面判定表——RFC 侧已逐面列举，草案侧全部塌缩）。
- 发现描述（逐面核对，RFC 承诺 vs 草案现状）：
  - **面① model registry**：草案 §0 :17 有 TL-001 SystemDef（tl.transmission.l0）+ §1 联合 RK4——但引擎联合 dispatch 面（simulateJoint/registry 扩展，RFC :52）的规格承载、联合 config 的 scope 归属（scope.js :44 modelId 门禁为单 systemId 形态——联合形态落哪一档未分析）零字；
  - **面② golden**：草案 §3 有 golden_id/model_id/Run 数/tier/列数骨架——但 schema v2 字段面（approval 三字段非 null 方可写盘、V-03/V-03b、supersedes 语义已有「=null」✓）、golden.model_id 惯例归属（见 R-B-11）未落；
  - **面③ scenario/config**：**零字**——RFC 面③ :130「systems 数组键新增（B-1a 显式键纪律——零投影）」+ RFC Q3 runHash 面 :151，草案无一处提及 config.systems 数组、scenarioHash 投影、联合参数/事件挂载形态（EVENT_KEYS 封闭集 scenario.js:52 为单系统事件键面——联合 config 下 GT 侧 load_step/sensor_drift 如何挂载未定义）；
  - **面④ fault catalog**：**零字**——RFC 面④ :131「TL 新族（线路过载/三相短路——候选面）」草案不登记不缓做（§0 不做清单 :20-21 仅 TL-c/独立 golden/linux64/C3 四项，TL 故障族未列）；
  - **面⑤ provenance**：**零字**——RFC 面⑤ :132「analytical_demo 沿袭」草案未落（联合 RK4 数值 oracle 的 provenance 取值 + Epistemic Declaration 无登记——体例 §1.8 对应物缺失）；
  - **面⑥ compare**：**零字**——RFC 面⑥ :133「cross_system 谓词新增（第三比对关系）」草案无跨载体/比对面任何承接；
  - **面⑦ run-g2**：**零字**——RFC 面⑦ :134「联合 golden verify 注册行 + DEFAULT_MODELS 追加 + 联合 parity 步」草案无注册计划（详见 R-B-03）、无 parity 步申报、无步账面（现行 37 步，I-7 增删步须 CHG 登记步数账——face⑦ 冻结面 V1_FACES.md:318 起）；
  - **面⑧ copy-guard**：**零字**——RFC 面⑧ :135「TL 语境词面预检（线路/潮流——预期零增词）」草案无预查登记（现行 43 patterns）。
- 严重度：**BLOCKER**——「全 additive」在草案中无任何逐面证据支撑；跨系统联合 golden 为 I-10（V08_ROADMAP.md:21）点名的架构突破面，其批准文本若仅一句口号，则 I-10 要求的「独立 RFC + 用户裁定」实质落空（RFC 分析未被草案继承为可裁定的规格内容）。
- 建议：v0.2 将 Q6 展开为逐面影响表（RFC §5 五行结构最少复刻 + 每面增「草案落点章/节」列——面③④⑤⑥⑦⑧各自至少一条落点或显式「本规格不承载、缓做登记」；面⑦ 注册计划与 R-B-03 合并落章）。

### MAJOR

**R-B-03 verify_golden 注册计划零声明，且 TL 新列 δ_rad/ω_rad_s 在现行 T-B 分派链下将发生 Hz 容差静默量纲错型（FCFMU P1-1 同类形态，非 fail-loud）——rad 单位支不存在，P_elec_kW/P_mech_kW 路由正常。**

- 位置引用：草案 §3 :60-64（golden 计划五行——无注册计划）；`scripts/verify_golden.py` T-B 分派链 :398-483 实读逐支枚举（_A :410 / _Hz :412 / _rpm :414 / _K :416 / _kPa :418 / _mL 条件支 :429 / r_true 子串 :431 / r_meas 子串 :433 / _kW :435 / SOC :437 / _pct :439 / _V 条件支 :447 / _kWh 条件支 :457 / dim 条件支 :467 / **f_Hz_atol 兜底 :470——全链无 `_rad`/`_s` 支**）。
- 发现描述：
  1. **量纲错型路由（实跑复刻证据）**：`python -I` 复刻 :398-483 分派链逐一追踪——`delta_rad`/`omega_rad_s`/`δ_rad`/`ω_rad_s` 全部命中 **:470 f_Hz_atol 兜底**；联合 gate 必然声明 f_Hz_atol（GT 27 列含 f_true_Hz/f_meas_Hz/f_channel_diff_Hz——gt001_v3 gate 实测 11 键含 f_Hz_atol）⇒ **非 KeyError 而是 Hz 容差静默用于 rad / rad·s⁻¹ 量**——正是 FCFMU 评审 B P1-1 判定的「静默量纲错型」类（该例经 `_mL` 支修复，verify_golden.py:420-430 注释在案）。`P_elec_kW`/`P_mech_kW` 命中 :435-436 `_kW` 支（P_kW_atol/rtol）——路由正确；
  2. **MODELS 新行四件套未声明**：model_id gt.sync.tl.l0 注册行的 i_true/i_meas（V-05 关键点对 :609-622）、event_tol（V-09 事件相位变量 :701）、scalars 键面（V-06 :627-636）全部无草案承载——V-06 非 kWh 标量一律走 SOC_pp 支（:630 `lim = tol["E_kWh"] if kind == "kWh" else tol["SOC_pp"]`），rad 类标量将静默走 SOC_pp（T_bat_end_K 先例形态——可用但须显式登记）；metrics 面 unit=rad 将落 metric_within T-B 兜底 SOC_pp（:503）——同为未登记的错型路由；
  3. **DEFAULT_MODELS 九→十扩容未声明**：:375-376 实测九成员（fl001/fl001_l1/fc001_l1/fl001_cap/gt001_comb/fc001_fmu/gt001_fmu/gt001_fmu_comb/mg001_combo）——联合 golden 入默认序列与否（尾追加先例形态）无草案承载；
  4. **RUNS_GROUPS 复用未声明**：:585-603 分派按 `golden.get("inertia_model")` 选组（gt001_fmu_oracle.py:161 先例）——联合 golden 的分组维度（inertia_model=thermo 沿袭？新联合组键？flat RUNS？）未定义；
  5. **新容差键面未声明**：若采 additive 分派支（`_rad` 条件支 + gate 新键，fc001_fmu `_mL`/dim 条件支 :429/:467 先例——「仅当 gate 声明该键时激活，既有键路由逐字节不变」三重先例同构），草案须钉死插入点判别序（`_kPa`/`_mL` 支后、r_true/r_meas 子串判别前）并随实现轮提交既有键路由零变化证明。
- 严重度：**MAJOR**——golden 计划是本草案的核心交付之一，注册面缺口 + 已实证的错型路由若不预先钉死，emit 轮将复刻 FCFMU P1-1 形态。
- 建议：v0.2 增「verify_golden 注册计划」章：① TL 四列逐一声明路由（建议 additive `_rad`/`_s` 条件支 + gate 键 delta_rad_atol/omega_rad_s_atol + 插入点判别序钉死 + 既有键路由零变化证明义务）；② MODELS 行四件套（建议 i_true/i_meas 沿 GT 对 f_true_Hz/n_meas_rpm、event_tol=n_rpm_atol 或显式新择）；③ DEFAULT_MODELS 九→十尾追加声明；④ RUNS_GROUPS 复用与否（建议 flat RUNS 四 Run 或声明分组键）。

**R-B-04 联合冻结表与已批准 RFC 的 TL-EQ 编号冲突：草案 EQ-TL-3/4/5 = RFC TL-EQ-1/2/3（同号异义），且 RFC TL-EQ-5（V_gen 频率→电压映射——P_elec 的输入定义源）在草案中整体缺失，EQ-TL-5 的 V_gen/V_inf 无定义。**

- 位置引用：草案 §1 :31-33（EQ-TL-3/4/5）；RFC §3 :94-98（TL-EQ-1…5）；CHG-20261120-01 ① R-CS-02（DECISIONS.md:1937）「TL-b 物理域方程候选 **TL-EQ-1..5**（G2b 草案轮定案细则）」。
- 发现描述：① R-CS-02 批准的方程候选集编号为 RFC TL-EQ-1..5（TL-EQ-1 δ_dot / TL-EQ-2 转子动力学 / TL-EQ-3 P_elec / TL-EQ-4 P_mech=P_gen_GT / **TL-EQ-5 V_gen ≈ f_GT/f₀·V_rated**）；草案重编号后 EQ-TL-3/4/5 分别对应 RFC TL-EQ-1/2/3——同号异义破坏 R-CS-02 批准对象的追溯锚（批准轮按号复读将错位）。② RFC TL-EQ-4（P_mech=P_gen_GT）由草案耦合表 :39-41 承载可追 ✓；但 **RFC TL-EQ-5（V_gen 映射）草案零字**——EQ-TL-5 :33 的 P_elec(δ) = (V_gen·V_inf/X_line)·sin(δ) 中 V_gen 在草案内无定义源（V_inf 亦未定义——RFC §3 参数候选表 :100-107 仅有 V_rated=400 V，无 V_inf/V_gen 条目，该缺口为 RFC 自身遗留、草案继承未清）。无 V_gen 定义则联合 RK4 不可实现，golden 位流无权威文本。
- 严重度：**MAJOR**——冻结表为 oracle/引擎唯一权威文本（GTL1 §2 :129 先例纪律），编号冲突 + 输入变量未定义使 R-CS-02 细则定案职能失效。
- 建议：v0.2 ① 方程编号与 RFC TL-EQ 对齐（或显式登记重编号映射表 + R-CS-02 勘误注记——FCFMU P3-2「计数偏差注记」同类登记纪律）；② 补 V_gen 定义方程（RFC TL-EQ-5 复刻或修订候选入 Q 点）与 V_inf 参数条目；③ 变量定义面（ω_s/ω₀/f₀/V_inf/V_gen/M/D/X_line 逐符号）随参数章落表。

**R-B-05 TL 参数值缺失：Q2 推荐仅「教学整定值（非实测——I-5 句式）」一句 sourcing 声明，RFC §3 参数候选（X_line 0.5–1.0 p.u. / M 3–8 s / D 0.02–0.05 / V_rated 400 V）未落为具体值，冻结表不可实现、批准轮无值可裁。**

- 位置引用：草案 :71「| Q2 | TL 参数（X_line/M/D） | 教学整定值（非实测——I-5 句式） |」；RFC §3 参数候选 :100-107；GTL1 体例参数面先例（§2.1 常量表 :146——k_f 以 ≥13 位有效数字登记 + v1.0 定案标注）。
- 发现描述：G2b 规格的职能是把物理域候选定案为可 emit 的冻结值（体例 §1.4 参数面整章）。草案 Q2 只回答参数**来源纪律**（教学整定、非实测），未回答参数**值**——X_line/M/D（以及 V_rated/ω_s/ω₀/初值 δ₀/ω₀）无具体数，也未给推荐值区间供用户裁定。EQ-TL-4/5 在现文下无法产生任何数值轨迹，§3 golden 计划与 §2 Run 矩阵（δ 稳态/ω 稳态判据）均悬空于未定义参数之上。
- 严重度：**MAJOR**。
- 建议：v0.2 增参数章（体例 §1.4 同构）：每参数列 候选值/来源（RFC 区间内取值）/I-5 句式登记（教学整定声明）/有效性域贴边声明（GTL1 EQ-GTL1-1 :164 有效性域声明先例）；并给 δ 稳态设计点校核（sin δ 平衡点存在性与 |δ₀|<π/2 稳定域——锚点包络章载荷）。

**R-B-06 Q 点清单与裁定留白章双缺口：§5 R-TLFMU-02 引用不存在的「Q7」；RFC Q3（runHash）/RFC Q4（parity 制度）未承接；host 调速器积分器在联合内核中的处置不是 Q 点；未列决断点将以事实句形态被 R-TLFMU-01 静默携带。**

- 位置引用：草案 §4 :68-75（Q1..Q6 六行）、§5 :80（「| R-TLFMU-02 | Q1..Q7 定案 | （待填） |」）；RFC §7 :145-155（Q1..Q7 七行）。
- 发现描述：
  1. **编号失配**：草案 §4 只定义 Q1..Q6，§5 R-TLFMU-02 写「Q1..Q7 定案」——留白章引用不存在的 Q7（或 Q7 在成稿中脱落）；
  2. **RFC Q 映射缺口**：RFC Q3（runHash 面：systems 数组进 hash additive vs 联合 cfg 独立 hash 域——:151）草案零承接（与 R-B-02 面③ 缺口同源）；RFC Q4（parity 制度：联合 RK4 单内核 vs 双内核接口——:152）被草案 §1 :47-48 以**事实句写死**（「数值方法：联合 RK4——…fc001/gt001 模式复刻」）未候选化——RFC 明列两候选 + 推荐不定案，草案却以陈述句先行定案，违反本草案自身状态行 :3-4「Q 点全候选 + 推荐 不定案」纪律；C99/parity 链（A-11 预授权面）因此无规格承载；
  3. **调速器积分器处置未列 Q 点**：联合微分态 y=[f,T3,δ,ω]（草案 :25 四维）不含调速器积分器状态——host 调速器积分器在联合内核中的层归属与子步更新序（GT 体例 Q1(B) 层归属先例——GT001_FMU §1.5 :237「控制积分器 u 的层归属——本草案最关键 Q 点」；EQ-GTL1-9 cmdNext 先算、子步内立即生效——GTL1 :111）未登记：联合 Run 中调速器看到的 f、输出的燃料指令与 P_elec 反馈（P_rotor = P_elec + P_bat − P_load，草案 :40）在 RK4 子步内的求值次序直接决定 golden 位流与 C99/Python parity 可达性——该决断点无 Q 槽；
  4. **未列决断点的静默携带风险**：TL 参数值（R-B-05）、model_id 身份（R-B-11）、joint_gt_standalone 列语义（R-B-07）、注册计划（R-B-03）均以 §1/§3 事实句成文——R-TLFMU-01「本规格是否批准」一旦回填批准，上述未决点即被整体静默批准，绕过「Q 点全候选」纪律。
- 严重度：**MAJOR**。
- 建议：v0.2 ① R-TLFMU-02 编号对齐 §4 实际 Q 数；② 增 Q：runHash/系统数组键（RFC Q3 复刻）、parity 制度（RFC Q4 复刻为显式候选）、调速器积分器层归属与子步更新序（GT Q1(B) 同构）、joint_gt_standalone 对照语义、TL 参数值定案；③ 所有 §1/§3 事实句中属架构决断的内容降级为候选句入 Q。

**R-B-07 joint_gt_standalone 对照 Run 三缺口：TL 列语义未定义；解耦对照混载入联合 golden 无先例且未列 Q 点；「逐位恒等守卫」无机制载体且 run 映射不成立（gt001_v3 无 sensor_drift Run）。**

- 位置引用：草案 :58「| joint_gt_standalone | GT 独立（TL 解耦——P_elec=P_gen 等价退化） | 对照面（TL 解耦时 GT 轨迹 ≡ gt001_v3 独立轨——**逐位恒等守卫**） |」；`data/golden/gt001_v3.json` 实测 Run 集（healthy/closed_loop_fault/monitor_only/load_step/actuator_fault/actuator_clear）；verify_golden.py V-07 双 null 机制 :647-668。
- 发现描述：
  1. **TL 列语义未定义**：31 列 schema 下 joint_gt_standalone 的 δ_rad/ω_rad_s/P_elec_kW/P_mech_kW 填什么（null 整列 / 0 / P_elec:=P_gen 镜像 / 冻结初值）无声明——若 null 整列，须声明走 V-07 双 null 一致路径（:651-656 W2-1 先例：fl001 I_bat_cap_A 非执行器场景整列 null）；若镜像/置 0，则该列数值语义（解耦轨的 δ 是「未积分」还是「冻结初值」）须入冻结表；
  2. **golden 单轨语义混载无先例**：face② 实测全部既有 golden 的 Run 集均同轨语义（gt001_v3 6 Run 全 thermo、fc001_fmu_v1 5 Run 同轨、mg001_v2 8 Run 全 island_combo、fl001_v2 4 Run 全 thermal on）——**解耦对照 Run 混载入联合 golden 属首例**，与联合三 Run 的 golden 语义不同构，应显式列 Q 点裁定（教学对照价值 vs golden 单一语义惯例的张力——RFC :12 不变式张力声明同源问题），而非以 Run 矩阵行静默混入；
  3. **守卫无机制载体 + 映射不成立**：「≡ gt001_v3 独立轨」——① verify_golden V-01…V-09 无任何跨 golden 逐位恒等校验（该守卫在哪个 gate 兑现未定义——新校验步 = additive 须登记，face② :169）；② run 映射未定义：joint_gt_standalone 对照 gt001_v3 哪个 Run（healthy？）未指明；**joint_sensor_drift 无守卫对象**（gt001_v3 六 Run 实测无 sensor_drift——草案 §2 将 sensor_drift 联合 Run 与守卫声明并列，但 gt001_v3 侧无对应轨）；③ 「≡」（逐位恒等）与实现机制的关系未声明：联合 dispatch 路径（P_elec:=P_gen 直通替代）须与独立轨同求值序同舍入才可达逐位——该等价性前提（分支化 vs 数值恒等）应显式声明为 emit 轮验收硬条件，措辞或降为「逐位恒等（条件：…）」。
- 严重度：**MAJOR**。
- 建议：v0.2 ① joint_gt_standalone 独立 Q 点：TL 四列语义定案（推荐 null 整列 + V-07 双 null 路径声明）+ 混载先例豁免登记；② 守卫载体落章：对照 Run 映射表（joint_healthy↔healthy / joint_load_step↔load_step / joint_gt_standalone↔? 逐对）+ 校验归属（verify_golden 新校验步 additive 登记 or run-g2 parity 步承载 or 实现轮一次性验收证据）三选一并登记；③ sensor_drift 守卫缺口显式登记（gt001_v3 无对应轨——守卫声明范围修正）。

**R-B-08 V-03/I-9 出生接入（born-integrated）声明缺失：新联合 oracle 的 oracle_base 接入、V-03 字节锚定口径、V-03b approval 面在草案中零承载。**

- 位置引用：草案 §3 :60-64（golden 计划——无 oracle 接入面）；I-9 原文 V07_ROADMAP.md:22「已锚定 golden 的 oracle 文件 V-03 自冻结——golden 入库后其 oracle 源文件字节不可变更；验证/parity 等伴生工具一律独立成文」；V-03 语义 verify_golden.py:556-559 + V1_FACES.md:150-151（oracle_source_sha256 = oracle 源文件自身字节 SHA-256）；体例先例（GT001_FMU §4 :408 起 golden 计划章含 oracle 接入声明；FL001_THERMAL :382「出生即 oracle_base 接入」先例原文）。
- 发现描述：草案对联合 golden 的生成链零声明——① 新 oracle 文件（建议名 tl_joint_oracle/gt_tl_joint_oracle）是否出生接入 oracle_base 六成员签名（RUNS/SERIES_IDS/simulate_run/self_check/_oracle_source_sha256/build_golden——V1_FACES.md:217-222 OracleInterface 冻结签名）未声明；② V-03 字节锚定口径（golden.generated_by.oracle_source_sha256 = oracle 源自身字节 SHA——出生接入即无历史字节负担）未声明；③ V-03b approval 三字段非 null 方可写盘 + write_golden_with_sidecar LF 钉死（V1_FACES.md:152-156/:219-222）未承接；④ 伴生工具独立成文义务（I-9 后半句——联合 parity/验证工具不得改写已锚定 oracle）未登记。SERIES_IDS 为 OracleInterface 冻结六成员之一（含 "t"），草案 §3 使用「SERIES_IDS = …31 列」术语但未声明其含 "t" 口径（gt001_v3 27 列实测含 "t"——31 列算术自洽性依赖该口径显式化）。
- 严重度：**MAJOR**——V-03/I-9 是本仓 oracle 链的硬纪律，G2b 批准文本不含此面则 A-11 实现轮无锚定依据。
- 建议：v0.2 golden 计划章扩容：oracle 文件名 + 出生接入声明（六成员 + resolve_run_spec + approval 三字段 + write_golden_with_sidecar LF）+ V-03/V-03b 口径句 + SERIES_IDS 含 "t" 口径注记 + I-9 伴生工具独立成文义务行。

### MINOR

**R-B-09 事件面（FAULT_CATALOG）登记计划缺失：TL 新故障族既不立项也不显式缓做，联合 Run 的事件挂载面未定义。**

- 位置引用：草案 §0 :20-21 / §2 :53-57；RFC 面④ :131「TL 新族（线路过载/三相短路——候选面）」；scenario.js:52 EVENT_KEYS 封闭集（11 键实测——无 TL 键位）；docs/FAULT_CATALOG.md 结构（§1..§8 逐系统章节，无 TL 章节）。
- 发现描述：联合 Run 矩阵复用 GT 族事件（load_step/sensor_drift——GT 侧调速器链），本规格可合理不立 TL 新族；但 §0 不做清单未登记该缓做（TL-c/独立 golden/linux64/C3 四项之外 TL 故障族缺席），RFC 面④ 的候选承诺在草案中无落点；FAULT_CATALOG.md 的 TL-001 章节（§9 形态 additive 登记）与 docs/FAULT_CATALOG.md 授权状态守卫（scenario.js:79-83 逐系统 map）的 TL 行登记计划零承载。
- 严重度：**MINOR**。
- 建议：§0 不做清单补一行「TL 新故障族（线路过载/短路——RFC 面④ 候选）——本规格不立项，缓做登记」；v0.2 事件面章声明「零新事件键 + 联合 Run 事件挂 GT 侧 systemId 作用域」口径。

**R-B-10 A-11 预授权边界措辞冲突：草案 §0「linux64 实施（另行 CHG）」与 CHG-20261120-01 ③「A-11（oracle/golden/C99/parity/adapter 全链）+ D-12 linux64 实施随批准 CHG 派发」存在同波打包/另行 CHG 的口径差；A-11 预授权的 C99/parity/adapter 链在 §0 做清单无对应规格面。**

- 位置引用：草案 :20-21（不做清单）；CHG-20261120-01 ③（DECISIONS.md:1937）原文「**③ v1.17.0 实现轮预授权**：A-11 TL-001 实现轮（oracle/golden/C99/parity/adapter 全链——TL-b 联合 RK4）+ D-12 linux64 实施（评估推荐 Docker 路线）——随批准 CHG 派发」。
- 发现描述：① 草案将 linux64 排除为「另行 CHG」，台账则将 D-12 与 A-11 同波派发——两种读法（同 CHG 打包 / 同波异 CHG）均自洽但现文未对齐，冻结后将成为排程歧义；linux64 并行面隔离声明本身已存在（不做清单 ✓——评审重点 7 的「是否需要声明隔离」答案为「已声明，但措辞须对齐台账」）。② 更实质的缺口：A-11 预授权明确含 C99/parity/adapter 全链，而草案 §0 做清单仅五项（SystemDef/冻结表/Run 矩阵/golden 计划/Q 点）——C99 联合内核与 parity 制度无规格承载（与 R-B-06 RFC Q4 缺口联动）：parity 目标（fc001/gt001 模式 0.0 纪律？T-B 容差制？）、pow/sin 跨 libm 散差的双源（草案只登记 sin :48-49，GT 侧 (f/f₀)² 幂运算的 pow 散差 RFC :121「跨实现 pow 预期 ~2.5e-4」未承接）无登记。
- 严重度：**MINOR**（linux64 措辞）+ 并入 MAJOR 链（parity 面缺失随 R-B-06 处置）。
- 建议：§0 不做清单措辞对齐台账（「linux64 实施（D-12——随 v1.17.0 批准 CHG 派发，与本规格并行隔离）」或维持「另行 CHG」并在 v0.2 显式登记两读法差异）；做清单补「C99 联合内核 + parity 制度（RFC Q4 候选化）」项；sin 之外补 pow 散差源预登记（R-1 同源）。

**R-B-11 model_id「gt.sync.tl.l0」身份面未登记：命名与 gt.sync 家族同构、非撞名，但其身份惯例归属（engine 轨 vs FMU 轨两惯例均非精确覆盖联合轨）、V312 准入承接、scope 归属、Q 点化均缺失；level「l0」语义未注记。**

- 位置引用：草案 §3 :62-63「model_id = **gt.sync.tl.l0**（联合——sync=GT 机械接口 + tl=输电线路面）」；systems.js:977（GT-001 SystemDef model_id='gt.sync.l0'）/ gt001_fmu_v1.json model_id='gt.sync.fmu_l1'（FMU 轨 golden 实测）/ gt001_v3.json model_id='GT-001'（engine 轨 golden 惯例实测）。
- 发现描述：① **命名同构性成立**（对评审重点 4 的直接回答）：gt.sync.l0（GT 基座）→ gt.sync.fmu_l1（FMU 镜像轨）→ gt.sync.tl.l0（联合轨）为同族点分命名，golden_id gt_tl_joint_v1 亦落实 R-CS-04（用户已确认 golden naming ✓）——命名本身无 BLOCKER；② 但 **golden.model_id 惯例归属未声明**：现行两惯例为 engine 轨 golden.model_id = systemId（"GT-001"/"MG-001"/"FL-001" 实测）与 FMU 轨 = V312 A-3 自述点分 id（fc.pem.fmu_l1/gt.sync.fmu_l1 实测，准入依据 = fmu_admission 八字段面）——联合轨既非 SystemDef 亦非 FMU，gt.sync.tl.l0 的登记/校验载体（何种 manifest？何机检？）无 V312 B-4/Q-5 准入承接章（体例 §1.2 :149 对应物缺失——见 R-B-01）；③ **未入 Q 点清单**：R-CS-04 只确认 golden naming（DECISIONS.md:1937），model_id 命名为草案新增决断，体例先例均以 Q 点承载命名面（GTFMU Q2 模型变体面 / FCFMU Q13 model_id 自述）——本草案以事实句成文；④ scope 归属未分析（scope.js :44 modelId 精确匹配门禁先例——gt.sync.tl.l0 落 approved_* 之外 extension_preview 的推定未登记）；⑤ level「l0」语义未注记（GT 侧物理权威 = GTL1 **L1** 热力链——联合轨标 l0 的层级语义缺一句说明）。
- 严重度：**MINOR**（命名同构成立，缺口在身份面登记）。
- 建议：v0.2 增身份面章（体例 §1.2 同构）：gt.sync.tl.l0 惯例归属声明（建议沿 FMU 轨点分形态 + 声明其为非 FMU 的联合轨自述 id——登记与 V312 的关系：本轨无 FMU 工件，准入面如何承接须一句定案）+ scope 归属行 + Q 点化（或 R-TLFMU-02 显式扩容）+ l0 层级注记。

### INFO

**R-B-12 命名一致性细项：TL 列名希腊字母书写与现行全 ASCII series 命名域不一致；TL 列 _true/_meas 配对语义未声明；RFC 预填 30 列 vs 草案 31 列偏差未注记；RFC 引用的 golden 单一 model_id 不变式在全仓无逐字原文。**

- 位置引用：草案 §3 :64（「δ_rad / ω_rad_s / P_elec_kW / P_mech_kW = **31 列**」）；gt001_v3 27 列实测全 ASCII；RFC §4 :121「27+3 列（GT 27 列 + δ + ω + P_elec——零新热力列）」；RFC :12/:24（不变式张力声明自引）。
- 发现描述：① TL 列名以希腊字母书写（δ/ω），现行 27 列全 ASCII（f_true_Hz/P_rotor_kW/…实测）——golden series id 为 JSON 键 + 分派链字符串判别对象，建议 ASCII 化（delta_rad/omega_rad_s）随 Q4 定案（本评审 R-B-03 追踪已证明两种书写形路由相同——希腊形非功能阻塞，纯命名域一致性）；② GT 27 列含 true/meas 传感对（f_true_Hz/f_meas_Hz/P_gen_true/meas…），TL 四列无 _true/_meas 配对语义声明（TL 无传感/测量面是有意省略还是待定——未登记）；③ RFC §4 预填 27+3=30 列 vs 草案 31 列（+P_mech_kW）——增量已入 Q4 ✓（登记纪律成立），但 RFC 预填值偏差未一行注记（FCFMU P3-2 偏差注记同类）；④ RFC :12 引用「八面冻结 §2『每个 golden 属于单一系统 model_id』」——全仓 grep 实测该句仅存在于 RFC 自身（:12/:24 自引），V1_FACES.md 面②/CONTRACT.md/ORACLE_INTERFACE_D2.md 无逐字原文：联合 golden 所「突破」的既有纪律实为 face② 惯例与 golden.model_id 两惯例（R-B-11 所引实测），RFC 引用为 paraphrase——v0.2 承接时应将张力锚实锚到 face② 惯例面，避免批准轮复读悬空引文。
- 严重度：**INFO**。
- 建议：随 v0.2 各章落定逐项带过（ASCII 化入 Q4 定案句、配对语义一句声明、30→31 偏差注记、不变式引文实锚）。

**R-B-13 门禁序列（双评审 → 用户批准 → A-11 实现）未在草案中写明：序列仅存于台账，§5 留白章三行不载序列与 I-4 纪律。**

- 位置引用：草案 §5 :77-83；CHG-20261120-01 ②（DECISIONS.md:1937）「→ 双评审 → 用户批准 → 实现轮（A-11）」；I-4（V05_ROADMAP.md:25「先文档后代码（G2b/G6→G7→G8）…CHG 全程留痕」）。
- 发现描述：对评审重点 8 的直接回答：① §5 R-TLFMU-01..03 三行覆盖「批准/定案/排程」三类裁定——但 R-TLFMU-02 的 Q 集不完整（R-B-06）使留白章**未覆盖全部决断点**（参数值/model_id/joint_gt_standalone 语义/parity 制度/runHash 面均无裁定槽）；② 双评审 → 用户批准 → A-11 实现的序列在草案零字（I-4 批准后才实现纪律无草案承载）——体例 §5 排期章/§10 评审记录章对应物缺失（R-B-01 章节缺口的序列面残项）。
- 严重度：**INFO**（序列已由台账承载，草案补一行即可；决断点覆盖缺口按 MAJOR 链随 R-B-06 处置）。
- 建议：v0.2 §5 前补一行门禁序列声明（「本草案经双评审（A 物理/数值 + B 治理/合同互不可见）→ 用户批准（R-TLFMU-01..0N）→ A-11 实现轮（CHG-20261120-01 ③ 预授权）——I-4 批准后才实现」）。

---

## Q 点独立意见表（草案 Q1..Q6 逐条 + RFC Q 映射——独立形成，未参照评审 A 结论）

| Q | 草案推荐 | 评审 B 意见 | 依据（实读） |
|---|---|---|---|
| Q1（P_rotor 改用 P_elec） | (a) P_elec 替代 P_gen（真耦合） | **方向同意 (a)**——但 Q1 须扩为完整耦合 Q 面：调速器积分器层归属/子步更新序未列（R-B-06-3）；P_bat/P_load 在联合态的挂载侧（GT config vs 联合 config）未定义（面③ 缺口） | 草案 :40 耦合表 + :25 四维态不含积分器；GT 体例 Q1(B) 层归属先例（GT001_FMU §1.5 :237）；RFC §3 耦合面候选 :109-114 |
| Q2（TL 参数） | 教学整定值（非实测——I-5 句式） | **不同意现状**——sourcing 纪律成立但参数值缺失（R-B-05），无值则本 Q 不可裁定 | RFC 参数候选 :100-107 四区间；GTL1 §2.1 常量表登记先例 :146 |
| Q3（sin 跨 libm 散差 ×≥10 冻结制） | ×≥10 冻结制（R-1 沿袭） | **同意**——R-1 制度沿袭正确（fc001/gt001 先例）；但 pow 散差源（GT 侧幂运算——RFC :121 ~2.5e-4 预期）未并行登记；Q3 的验证载体（parity 步）整体缺位（R-B-06-2/R-B-10） | 草案 :48-49；RFC :121 parity 行；verify_golden T-B 容差机制 :398-483 |
| Q4（TL 新列 4 列） | 4 列（δ/ω/P_elec/P_mech） | **同意 4 列**（31 列算术自洽——gt001_v3 27 列含 "t" 实测）；但列名 ASCII 化、_true/_meas 语义、rad 路由键面须随定案落章（R-B-03/R-B-12） | 草案 :64；RFC :121 预填 30 列偏差注记义务；分派链实跑追踪 |
| Q5（golden id = gt_tl_joint_v1） | gt_tl_joint_v1 | **同意**——R-CS-04 已定案（用户确认），草案复述一致 ✓；supersedes=null ✓ | DECISIONS.md:1937 R-CS-04；草案 :62 |
| Q6（八面影响全 additive） | 全 additive | **不同意现状**——一句口号不可承载 I-10 点名的架构突破面（R-B-02：六面零落实）；additive 判定本身须逐面证据后成立 | RFC §5 :124-135 逐面表；I-10 原文 V08_ROADMAP.md:21 |
| （缺）runHash/系统数组键 | ——（RFC Q3，草案未承接） | **须补 Q**——面③ 唯一架构新增键，B-1a 显式键纪律承接 + 既有 scenarioHash 零变化承诺应显式落章 | RFC :130/:151；face③ 冻结边界（V1_FACES 面③ :172 起） |
| （缺）parity 制度 | ——（RFC Q4 被事实句写死） | **须补 Q 并降级 §1 事实句**——单内核 vs 双内核为 RFC 明列候选；C99/parity/adapter 为 A-11 预授权面，无 Q 槽即无规格承载 | RFC :152；CHG-20261120-01 ③；I-8 三层夹心模式（V07_ROADMAP.md:21） |
| （缺）joint_gt_standalone 对照语义 | ——（Run 矩阵行静默混入） | **须补 Q**——首例解耦混载 + TL 列语义 + 守卫映射三决断（R-B-07） | gt001_v3 Run 集实测；V-07 双 null 机制 :647-668 |

（未列 Q4 前置对照——RFC §4 golden 行 :121 与草案 §3 的 30→31 偏差见 R-B-12-③。）

---

## 处置建议（v0.2 重稿工作清单——A-10 轮内完成后再入双评审）

1. **补授权明列两章**（R-B-01）：键面章 + 三层夹心章；并复刻体例 §1.2/§1.4/§1.8/§2.2/§2.3/§2.4/§6/§8/§10 结构位。
2. **八面逐面表替换 Q6 口号**（R-B-02）：RFC §5 八面 ×「草案落点/显式缓做」两列。
3. **verify_golden 注册计划章**（R-B-03）：TL 四列路由钉死（rad additive 支 + 插入点判别序 + 零变化证明义务）、MODELS 四件套、DEFAULT_MODELS 九→十、RUNS_GROUPS 复用声明。
4. **方程/参数章修复**（R-B-04/R-B-05）：TL-EQ 编号对齐或映射登记、V_gen/V_inf 定义补全、参数值表 + I-5 句式 + 稳态设计点。
5. **Q 清单/留白章对齐**（R-B-06）：R-TLFMU-02 编号修正、增补 runHash/parity/调速器积分器/joint_gt_standalone/参数值五 Q、§1 事实句降级候选化。
6. **对照 Run 治理面**（R-B-07）：TL 列语义定案（建议 null 整列 + V-07 双 null 声明）、守卫映射表与校验载体、混载先例豁免登记、sensor_drift 守卫缺口登记。
7. **oracle 接入面**（R-B-08）：出生接入 + V-03/V-03b 口径 + SERIES_IDS 含 "t" 注记 + I-9 义务行。
8. **事件/linux64/身份面收尾**（R-B-09/R-B-10/R-B-11）：不做清单补 TL 故障族缓做行、linux64 措辞对齐台账、gt.sync.tl.l0 身份面章 + Q 点化。

---

## 独立性声明

1. 本评审仅以上列「实读文件清单」所列仓库文件与实跑命令输出为输入；评审范围限定治理/合同面八项（八面影响完整性 / V-03·I-9 纪律 / verify_golden 注册计划 / 命名一致性 / Q 点完整性 / Run 矩阵治理面 / A-11 预授权边界 / 批准链完整性）。
2. **TLFMU_G2B_REVIEW_A.md 未被读取、搜索或引用**（本报告成文全程未打开该文件——互盲纪律；evidence/g2b/ 目录 ls 见其存在仅作为文件清单事实）。GTFMU_G2B_REVIEW_A.md / GTFMU_G2B_REVIEW_B.md 未读取；FCFMU_G2B_REVIEW_B.md 经协调方指定作为**体例模板**读取（其治理先例 P1-1 分派链错型形态作为同类问题判型引用，非结论引用）。
3. 除本报告文件（`FaultLab-evaluation/NEXT/evidence/g2b/TLFMU_G2B_REVIEW_B.md`）外未写入/修改任何仓库文件。

---

## 结论

**FAIL** —— 发现 13 项：BLOCKER 2（R-B-01 授权必交付章缺失 / R-B-02 八面口号化六面零落实）+ MAJOR 6（R-B-03 注册计划缺失含 rad 静默量纲错型实证 / R-B-04 TL-EQ 编号冲突 + V_gen 缺失 / R-B-05 参数值缺失 / R-B-06 Q 清单与留白章双缺口含调速器积分器未列 / R-B-07 对照 Run 三缺口 / R-B-08 V-03·I-9 声明缺失）+ MINOR 3（R-B-09 事件面 / R-B-10 A-11 边界措辞 / R-B-11 model_id 身份面）+ INFO 2（R-B-12 命名细项 / R-B-13 门禁序列）。草案 v0.1 骨架方向与已批准 RFC/R-CS-01..04 定案一致（方案 A、golden naming、Run 集形态、sin 散差制度均正确），但按 CHG-20261120-01 ② 的授权定义，本草案缺失两个明列必交付章、八面影响无逐面承载、golden 计划缺注册/参数/方程定义三类可实现性要件——现状不可进入双评审→用户批准→A-11 门禁；处置路径明确（上列 v0.2 重稿工作清单八项，全部为 A-10 轮内文档面工作，零代码零 golden），建议 A-10 轮扩容重稿后重新双评审，不必回退 RFC 层。

**评审 B 签署**：独立评审 B（治理/合同面）· 2026-11-22 · verdict `FAIL`（BLOCKER=2 / MAJOR=6 / MINOR=3 / INFO=2）。

---

# 重审轮（v0.2）——TL001_FMU_G2B_SPEC_DRAFT DRAFT v0.2 处置核销（2026-11-22）

- **重审对象**：`FaultLab-evaluation/NEXT/TL001_FMU_G2B_SPEC_DRAFT.md` **DRAFT v0.2**（2026-11-20 标注，685 行 wc -l 实测——A-10 轮内重稿，处置对照表自称 23 条 = 已落实 21 / 部分 2）
- **重审性质**：只读审计 + 仅更新本报告文件（追加本章）；互盲纪律维持——**TLFMU_G2B_REVIEW_A.md / GTFMU_G2B_REVIEW_A.md 全程未读取、未搜索、未引用**（重审期间 grep 命中的 GTFMU_G2B_REVIEW_A.md 单行仅作为「97495 计数」字符串的附带出现被立即弃用，该计数另以 `GT001_FMU_G2B_SPEC_APPROVED.md:416` 原文独立锚定）
- **重审方法**：R-B-01..13 逐条在 v0.2 找处置落点并独立核验（非复核自评）+ 四个专项（章节同构 / 分派链吻合 / 编号对齐 / 新增内容全面复审）+ v0.2 新增实读锚点逐点抽查

## 重审补充实读清单（v0.2 新增断言的锚点核验）

| 文件 | 核验面 |
|---|---|
| `TL001_FMU_G2B_SPEC_DRAFT.md` v0.2 全文 685 行 | 处置落点定位 + 处置对照表自评 + Q 引用一致性 |
| `tools/oracle/gt001_fmu_oracle.py` :95-180/:205-215/:245-265/:365-410 | SERIES_IDS 27 列 :101-112 ✓ / TOLERANCES :163-177 逐值 ✓ / :210-211 p_rotor 恒等式 ✓ / _kernel_step_thermo :250-261 四 stage 共用冻结 u_eff ✓ / host 四段子步循环 :371-406 ✓ |
| `tools/backend/fmu/gt001_l1.c` :1-15/:82-92 | I-3 头注硬边界原文 ✓ / alg_chain pow 三处 :83/:85/:91 ✓（v0.2 §4 项7 引用精确） |
| `tools/backend/py/fmu_runner.py` :266/:281-288/:300-311/:425-446 | run_hash 实际锚 = **:425-434**（:302-309 实读为 VR 分派——R-B2-01）；fmu_sha256 钉 hash :281-288；:266 零墙钟纪律注记 |
| `tools/oracle/gt001_l1_oracle.py` :158 | V_BUS = 400.0 实际锚（v0.2 引「:89」——R-B2-01）；gt001_oracle.py 全文无 V_BUS |
| `tools/copy-guard.mjs` :24-56 | BANNED :30-52 条目 + :53-54 收行 `.map`（ALLOW :55 起；'非机组/电网动态验证' = :56 **ALLOW 首条** ✓）；计数裁决：tests/teaching.test.js:264 镜像断言 = **43** ✓（v0.2 计数正确；跨度「:30-59」行号漂移——R-B2-01） |
| `tests/teaching.test.js` :264 | `eq(BANNED.length, 43, …)` 镜像断言实测 |
| `tools/oracle/gt001_fmu_parity.py` :17 | `PARITY_RTLIM = 1e-3  # ×≥10 冻结制：实测 2.55e-4 × 10 = 2.55e-3 → 阈值 1e-3`——v0.2 §4 项7「字面不符」主张**实锤**（2.55e-3 ≠ 1e-3）✓ |
| `src/core/registry.js` :111/:253-254 | analytical_demo（引擎 manifest）/ numerical_simulation（backend 默认）两枚举 ✓ |
| `src/core/schema.js` :19-23 | UNIT_DICT 实锚 ✓（K/kPa 增项先例在表） |
| `src/core/scope.js` :14-19 | SA-24 APPROVED 白名单区（无 TL 分支 ✓） |
| `data/golden/` 16 golden 全扫（python -I） | **全部 series id 无 `_rad`/`_rad_s` 后缀 = NONE** ✓（§4 项5② 前提成立）；model_provenance 实测：mg001_v2 = **fmu_l1_lumped_unvalidated**、gt001_fmu_v1 = fmu_l1_lumped_unvalidated、gt001_v3/v4/fc001_v2 = 字段缺位（——R-B2-02） |
| `data/golden/gt001_v3.json` load_step | min f_true_Hz = 49.59017353249317 → v0.2「49.590174」冻结值引用精确 ✓ |

**重审实跑**（摘录）：`python -I` 分派链复刻（_rad_s/_rad 插入点路由推演——提案 id 集无前缀遮蔽）；16 golden series id 全扫 `_rad` 子串；golden model_provenance 全量实测；copy-guard.mjs 结构解析（BANNED/ALLOW 行界 + 模式计数 + 镜像断言裁决）；§1.4/§3.1 数值自洽复算（Z_base=6.4 ✓ / δ_eq=arcsin(0.2)=0.2013579 rad=11.5370° ✓ / arcsin(0.4)=0.4115168 rad=23.5782° ✓ / P_max=50 kW ✓ / nadir 49.59017353→49.590174 ✓ / 滑差斜率 2π(−0.3)≈−1.885 rad/s × 60 s ≈ −113 rad ✓ / line_fault df/dt 初值 (10/5)·(50/50)=+2 Hz/s ✓ / actuator P_elec_ss=−6.734 kW → δ_eq=−7.74° ✓）；§3.3 零特征值守恒量验证（Ki·δ − 2π·u 对 t 恒导为零——线性化联合系统零特征值主张数学成立 ✓）。

## R-B-01..13 逐条核销表

| 发现 | v0.2 落点 | 核销判定 | 核验依据 |
|---|---|---|---|
| R-B-01（BLOCKER：必交付章缺失+15 章缺口） | §1.1 三层夹心 / §1.7 键面 / §1.2 / §1.4 / §1.8 / §2.2-2.6 / §3 / §6 / §7 / §8 / §9 / §10 / §11 / §13 | **已解决** | 专项一（下表）——两必交付章实质落实非口号；16 章结构与体例同构核实 |
| R-B-02（BLOCKER：八面口号化） | §5 八面逐面承载表 | **已解决** | 八面 × RFC 判定 × 落点章 × additive 声明全表；面③（§1.7/§2.4 systems 数组+零投影）/④（§2.1/§2.5 line_fault 立项+过载缓做双向）/⑤（§1.8/§4 项8）/⑥（§2.6）/⑦（§4 项5/11+§6 步账 37→38 申报）/⑧（§7.2 预查表）逐面有实质承载 |
| R-B-03（MAJOR：注册计划+rad 错型） | §4 项5（五子项）+ Q10 | **已解决** | 专项二（下表）——插入点/条件激活/键名/MODELS 四件套/DEFAULT_MODELS 九→十/RUNS_GROUPS flat 声明/V-06·metric 规避决定/零变化证明义务全部落章且与实读链吻合 |
| R-B-04（MAJOR：EQ 编号冲突+V_gen 缺失） | §1.3 同号同义冻结表 + 7 行废弃编号映射处置表 | **已解决** | 专项三（下表）——RFC TL-EQ-1..5 原号同义承载；TL-EQ-4 溶解登记/TL-EQ-5 恢复承接补全；R-CS-02 追溯锚修复 |
| R-B-05（MAJOR：参数值缺失） | §1.4 参数字典（基值表+逐参数值+IC 表+角点登记）+ §3.1 + Q2 | **已解决** | 全 SI 单位制锚 + 逐参数 值/单位/依据/有效性域；数值自洽复算全过（含 δ_eq 双基线与 X=1.0 角点）；I-5 句式逐行登记；D 不启用显式 CHG 路径登记 |
| R-B-06（MAJOR：Q 清单/留白章双缺口） | §12（RFC Q1..Q7 承接表 + TLJ-Q1..Q12）+ §13 | **已解决** | 幻引 Q7 消除（R-TLFMU-02 = §12 Q1..Q12 实际全集）；RFC Q3→TLJ-Q5 / RFC Q4→TLJ-Q6 候选化承接；调速器积分器 = TLJ-Q4（§1.5 对照实写）；§1 事实句降级候选（§1.6 三候选对照表） |
| R-B-07（MAJOR：对照 Run 三缺口） | §2.2 守卫章 + Q8 | **已解决** | 三钉条件表（stage 现算/P_gen 复用/host 逐字镜像）+ ZOH 显式排除；对照映射表 joint_gt_standalone↔gt001_v3 healthy + monitor_only 扩面候选；守卫范围修正声明（sensor_drift 缺口如实勘正——gt001_fmu_oracle RUNS 实读证实 sensor 族 key=closed_loop_fault）；恒等口径条件化措辞；载体三选→Q8 |
| R-B-08（MAJOR：V-03/I-9 声明缺失） | §4 项2 | **已解决** | oracle_base 六成员+resolve_run_spec+LF 钉死+approval 三字段+V-03/V-03b 口径+SERIES_IDS 含 "t" 注记+I-9 独立成文义务+「golden 由 oracle 只读生成」全落章 |
| R-B-09（MINOR：事件面缺失） | §0 双向登记 + §2.1/§2.5 | **已解决** | 三相短路立项（joint_line_fault + line_fault 键 + FAULT_CATALOG §9 计划 + 授权守卫行——三件套 additive）；线路过载显式缓做（§0）；p_elec_scale 事件域标量语义两案统一登记 |
| R-B-10（MINOR：A-11 边界+parity 面缺失） | §0/§6/§9/§13 + §1.1/§1.5/§4 项7 | **已解决** | linux64 措辞按台账原文勘正 + D-12 并行隔离声明四处一致；C99/parity/adapter 链规格承载落章（§1.1 生成链/§4 项7 parity 计划）；pow 双源预登记（gt001_l1.c :83/:85/:91 三处实读锚精确） |
| R-B-11（MINOR：model_id 身份面） | §1.2 身份面章 + Q12 | **已解决** | 命名同构声明+第三形态声明（非 FMU 无 V312 八字段机检——准入承载如实改登记）+scope extension_preview 推定+l0 层级注记+model_id Q 点化 |
| R-B-12（INFO：命名细项） | §4 项4 + §2.3 + §4 项8 | **已解决** | ASCII 化（delta_rad/omega_rad_s）+ TL 三列无 _true/_meas 有意设计声明 + 30 列对齐 RFC 勘正注记 + 「每个 golden 单一 model_id」张力实锚 face② 惯例面（RFC :12 paraphrase 定性承接本评审 grep 实证） |
| R-B-13（INFO：门禁序列） | §6 + §13 R-TLFMU-03 | **已解决** | 双评审→用户批准→A-11 序列 + I-4 纪律成文；A-11 边界重申 + D-12 隔离入留白章 |

**核销统计**：13 条 = **已解决 13 / 部分解决 0 / 未解决 0**；处置引入新问题 3（R-B2-01/R-B2-02/R-B2-03——见下）。

## 专项核验

**专项一（R-B-01 章节同构）**：v0.2 顶层章对照 GT001_FMU_G2B_SPEC_APPROVED（589 行批准体例）逐章核对——三层夹心章（§1.1）：三工件职责表 + I-3 认知分离边界 + 五段生成链，与 gt001_l1.c:5-10 头注硬边界原文逐字承接（实读核实「调速器积分/传感污染/测量列/记账/事件分裂全部归 host」）——**实质落实**；键面章（§1.7）：五键面行（systems 数组 + TL-001 defaults 四键 + GT 零新增 + line_fault +1 + inertia_model 零新增）+ B-1a 显式键零投影承诺——**实质落实**；其余结构位（§1.2 身份面/§1.4 参数面/§1.8 Epistemic/§2.2-2.6 场景事件哈希比对/§3 锚点包络（动态数值 emit 冻结纪律沿袭体例 §3.3）/§7 红线 I-1…I-10 逐条/§8 进入条件/§9 工作面/§10 风险/§11 评审记录留空/§6 门禁序列）全部落位且非占位。体例同构达成（章号映射为联合语境改写——结构位对应完整）。

**专项二（R-B-03 分派链吻合）**：① 插入点主张「`_mL` 条件支（:429）后、r_true/r_meas 子串判别（:431-433）前」与 verify_golden.py:429-433 实读**精确吻合**；② 条件激活语义（仅当 gate 声明对应键激活 ⇒ 既有路由逐字节不变）与 `_mL`/`_V`/`_kWh`/dim 四条件支先例同构 ✓；③ 前提「既有 golden 无 `_rad`/`_rad_s` 后缀 id」经 16 golden 全扫 = **NONE** ✓；④ gate 十键镜像值与 gt001_fmu_oracle.py:163-177 TOLERANCES **逐值一致**（f_Hz_atol 1e-4/n_rpm_atol 1e-2/T_K_atol 1e-2/p_kPa_atol 1e-9/P_kW_rtol 1e-6/P_kW_atol 1e-3/E_kWh 1e-6/SOC_pp 1e-5/r_true_kW 1e-9/t_s 1e-9）；⑤ v0.2 引用的现状路由证据（delta_rad/omega_rad_s → :470 兜底、P_elec_kW → :435 `_kW` 支）与本评审 v0.1 轮独立实跑追踪一致；⑥ 附注：`_rad_s`/`_rad` 两支对提案 id 集无前缀遮蔽（"omega_rad_s" 不 endswith "_rad"——支序自由无需额外钉死），emit 轮照 Q10 (a)+(i) 落地即可。

**专项三（R-B-04 编号对齐）**：§1.3 冻结表以 RFC 原号承载——TL-EQ-1 修订形（dδ/dt = 2π(f−f₀)，ω_s 三义消除）/ TL-EQ-2 溶解登记（M→K_J 承载、P_mech→P_rotor 组成、D 首版不启用+显式 CHG 路径）/ TL-EQ-3 保留（/1000 kW 口径钉死）/ TL-EQ-4 溶解登记 / TL-EQ-5 恢复承接（V_gen 映射——v0.1 静默弃用勘正）；7 行 v0.1→RFC 映射处置表逐行核对无遗漏（v0.1 EQ-TL-1→EQ-GTL1-7、EQ-TL-2→EQ-GTL1-4、EQ-TL-3/4/5→TL-EQ-1/2/3）。**同号同义达成，R-CS-02 批准对象追溯锚修复**。

**专项四（新增内容全面复审）**：① 处置对照表 23 条自评诚实——R-A-05/R-A-08 自评「部分」（残余定案转 Q9/Q8）如实、R-B 全部「已落实」与本评审独立核销一致，**无虚报**；② Q 引用一致性——全文 Q1..Q12/RFC Q 引用逐一解析全部落 §12，无悬空；③ 留白章覆盖——R-TLFMU-01/02/03 对全部决断点（参数值 Q2/出口基线 Q3/分区 Q4/runHash Q5/parity Q6/列集 Q7/对照语义+载体 Q8/r_true Q9/容差键 Q10/Run 集 Q11/身份面 Q12）有裁定槽 ✓；④ 数值抽查全过（见重审实跑）；⑤ A-11 边界 + D-12 隔离四处一致对齐台账原文。

## 重审新发现

**R-B2-01（MINOR）v0.2 新增实读锚点三处漂移——语义主张全部成立，纯行号/跨度失准（FCFMU P3-1/P3-5 同类）。**
- ① §2.4「run_hash……（fmu_runner.py:302-309 先例机制沿袭）」——:302-309 实读为 VR 分派代码；run_hash 实际在 **:425-434**（`"run_hash": hashlib.sha256(body.encode(...)).hexdigest()` :434；零墙钟纪律注记 :266）——机制主张（Run 内容规范 JSON SHA-256、零墙钟）成立；
- ② §1.4 基值表「V_bus 沿袭（gt001 oracle V_BUS=400.0 :89 实读）」——gt001_oracle.py 全文无 V_BUS；gt001_l1_oracle.py 实际 **:158**（`V_BUS = 400.0`）——值主张成立；
- ③ §7.2「BANNED 43 模式 :30-59 现值」+「『非机组/电网动态验证』为 ALLOW 串首条（copy-guard.mjs:30 现值）」——计数 43 正确（tests/teaching.test.js:264 镜像断言实测），但 BANNED 实际条目 :30-52（块收行 :53-54）、ALLOW :55 起、『非机组/电网动态验证』实为 **:56**（:30 为 BANNED 起始行）——语义主张（ALLOW 首条放行、TL 词面零命中预期）成立。
- 建议：批准轮 GTLJ-G2b-02 落正文时按行号基准纪律三处校正（run_hash :425-434 / V_BUS :158 / copy-guard :30-52+:56），不改正任何语义主张。

**R-B2-02（MINOR）model_provenance 承接值与 golden 层 sibling 先例不一致——「analytical_demo 承接」在 golden 字段层无先例支撑，须批准轮补 golden 层实读并显式裁定。**
- 位置引用：§1.8「provenance 档位 = **analytical_demo**（RFC 面⑤「零变化——analytical_demo 沿袭」判定的承接值）……registry.js 两枚举现值 = analytical_demo（:111）/ numerical_simulation（:253-254）」+ §4 项8「model_provenance="analytical_demo"」。
- 实读证据：golden 层 model_provenance 字段实测——**mg001_v2 = fmu_l1_lumped_unvalidated**（最近邻结构 sibling：T-B、多 Run、数值 RK4 combo oracle golden——B-10/CHG-20261119-11 批准链）、gt001_fmu_v1 = fmu_l1_lumped_unvalidated、gt001_v3/gt001_v4/fc001_v2 = 字段缺位；**16 golden 无一携带 analytical_demo**（该值实测仅存在于引擎 manifest 层 registry.js:111——v0.2 所锚为引擎值非 golden 字段惯例）；RFC 面⑤ 原文（§1.1 :27「两枚举 + fmu_l1_lumped_unvalidated」）本身已列三档现状。
- 判定：v0.2 忠实继承了 RFC 面⑤ 判定字面，且已登记「实现轮以枚举实读复核，换值/扩枚举须显式 CHG（不静默）」逃生阀——但承接值的「实读」口径只锚了引擎 manifest 层，未做 golden 字段层 sibling 实读；若照现文 emit，gt_tl_joint_v1 将是库内首枚 analytical_demo golden，与最近邻 sibling（mg001_v2）不同构。
- 建议：批准轮补 golden 层先例实读并三选一显式裁定（(a) analytical_demo 沿 RFC 面⑤ 字面 / (b) fmu_l1_lumped_unvalidated 沿 mg001_v2 golden 先例 / (c) numerical_simulation——registry backend 默认档），裁定结果回填 §1.8/§4 项8 并随批准 CHG 登记（若与 RFC 面⑤ 字面不一致则同步 RFC 勘误注记）。

**R-B2-03（INFO）v0.2 修订日期戳时间线倒挂——自评口径内的日期卫生问题。**
- 位置引用：头部/§6 GTLJ-G2b-01 行/修订记录均登记 v0.2 =「2026-11-20」，而同文档「行号基准 2026-11-22 实读」且所处置的双评审报告评审日期 = 2026-11-22（本报告）——v0.2 成文日期早于其处置对象与自身证据基准日期。
- 建议：批准轮更名 APPROVED 时统一修订日期戳（A-10 轮重稿实际完成日），并在 CHG 台账行沿用一致日期。

---

## 重审结论

**`PASS-WITH-CONDITIONS(2)`** —— R-B-01..13 全部核销为已解决（BLOCKER 2 + MAJOR 6 + MINOR 3 + INFO 2 逐条落点核实，含四个专项：16 章体例同构实质达成、`_rad` 分派支计划与实读分派链精确吻合、RFC TL-EQ 同号同义 + 7 行映射处置表完整、处置对照表自评诚实且数值抽查全过）；v0.2 新增内容引入 3 项新问题（MINOR 2 / INFO 1）均非结构性缺口——条件 B2-1（锚点三处校正，R-B2-01）与 B2-2（model_provenance golden 层先例实读 + 显式裁定，R-B2-02）须在批准轮 GTLJ-G2b-02 落正文后方可冻结更名 APPROVED；两条件均为文本面处置，无需再轮重稿。

**条件清单**：
- **B2-1**（对应 R-B2-01）：run_hash 锚校正为 fmu_runner.py:425-434、V_BUS 锚校正为 gt001_l1_oracle.py:158、copy-guard §7.2 行号校正（BANNED 条目 :30-52 / 块收行 :53-54 / ALLOW :55 起 / 『非机组』:56）——语义主张零改动。
- **B2-2**（对应 R-B2-02）：批准轮对 model_provenance 三选一显式裁定（analytical_demo / fmu_l1_lumped_unvalidated / numerical_simulation）并回填 §1.8/§4 项8 + 随批准 CHG 登记；如偏离 RFC 面⑤ 字面同步 RFC 勘误注记。

**重审 B 签署**：独立评审 B（治理/合同面）· 2026-11-22 · 重审 verdict `PASS-WITH-CONDITIONS(2)`（核销：已解决 13 / 部分 0 / 未解决 0 / 新问题 3 = R-B2-01 MINOR + R-B2-02 MINOR + R-B2-03 INFO；v0.1 轮 FAIL → v0.2 轮 PASS-WITH-CONDITIONS）。

**文件结束**。
