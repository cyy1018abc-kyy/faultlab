# G8 发布证据 — v1.2.0（八面冻结下第二个 additive 波：A-5 P1 FC 电化学批准+实现轮 / TESPy C1/C2 角点补全 / v1.1.x 残留清算）

> **发布**：**v1.2.0**（CHG-20261113-02——MINOR：新 golden fc001_v2 + 新 scenario 轨键
> `electrochem_model` + 新 oracle fc001_l1_oracle + FC 信号面 +3 + on 轨 UI 变体，
> V1_FACES §3.1 additive 语义）｜ **日期**：2026-11-13 ｜ **批准链**：
> CHG-20261113-01（用户 2026-11-13 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个
> 子智能体来加速任务；不要和已有进程冲突。」——DEC-1…8 全采推荐项；FC P1 批准经本指令链登记，
> GTL1-G2b-02 先例：用户指令链即书面批准记录）→ 波次 `NEXT/V120_WAVE_DESIGN.md`
> （三阶段 9 路 W1a/W1b/W1c/W2…W6 已完成，本证据 = W7）→ CHG-20261113-02（本发布收口，
> 本证据为输入件）。
> **推送状态：用户裁定暂缓延续（v0.7.1 起 v0.7.1+v0.7.2+v0.8.0+v0.9.0+v1.0.0+v1.1.0 六批同批
> ——v1.1.0 已于波前本地提交 20db6f4；本波产出并入同批，同批口径 v0.7.1–v1.2.0）。**

## 0. 发布门状态总览（诚实口径）

- **G7：已闭合（波前闭合）**——perf.mjs V3-03 时长阈值 15000→**31500 ms** 再登记（D-4 程序，
  CHG-20261110-03，2026-11-13）+ 复跑 `--tier all` 35/35 两次独立 PASS（61716/59915 ms）。
  本波 **0 新步**（run-g2 维持 35 步），门禁判据面零变更；本轮复测 perf 步实测 **12255 ms（r1）/
  12263 ms（r2）**，对 31500 ms 新阈裕度约 61%——无新阻塞。
- **G8：本证据**（发布门 1–8 全部真实运行全绿，明细 §4）。
- 其余门禁全绿；additive 三不承诺兑现见 §5（含跨代码版本哈希字面锚定探针）。

## 1. FC P1 批准轮 + 实现轮交付（V120 主线，A-5 串行链首环兑现）

**批准轮（W1a/W1b/W1c，FCECH-G2b-02 收口，2026-11-13）**：双路独立评审 **A:PASS_WITH_
CONDITIONS(7) / B:PASS_WITH_CONDITIONS(7)**（A 物理/B 治理互不可见）；14 条件全按推荐落正文；
**参数面十常量批准轮定案**（E0_ref 425.130134484272 V 闭式派生 / k_E 0.1 V/K 恒等式 /
I_0 10 A / c_act 0.05 V / R_ohm0 0.5 Ω / α_ohm 0.004 1/K / c_conc 0.1 V / I_lim 150 A
（>137.5 A 域硬条件）/ C_st 1500 J/K / h_st 120 W/K（A-3 W 口径）+ T_amb 298.15 K、DT_INT
0.01 s 登记常量）+ **六项域扫描证据**（§3.3：① 锚点残差 0.0 / ② 单调性 max dV/dI = −0.5018
V/A < 0 / ③ 稳定性 120 > 37.8125 W/K 裕度 3.17 倍 / ④ I_lim 150 > 137.5 裕度 12.5 A /
⑤ healthy 温度不变性 V 残差 0.0、dSOC +0.0 pp、dE_bat +2.8e-17 kWh / ⑥ 三故障分歧裕度）；
**B-2 子对象方案定案**（A-fcec-* 6 条与 on 域 limitations/EQ 挂模型级 additive 子对象
`model.electrochem`——既有五数组逐字节不动，且 **model_hash 九字段具名哈希域外**，engine.js
hashObject 输入清单零改动）；**Q1…Q9 全部定案**（Q1 采 B：cfg 键分域、scope.js 结构零改动 /
Q2 fc001_l1_oracle 命名 / Q3 P_loss,stack=(E0−V_stack)·I / Q4 浓差对数式 / Q5 铭牌恒压换算 +
r_meas 扩展恒等 / Q6 5 Run 镜像 fc001_v1 全集全 on / Q7 T-B / Q8 自检新段 FEC-1…8 / Q9
B-1(a) 显式键条件式哈希形态）；`FC001_ELECTROCHEM_G2B_SPEC_DRAFT.md` 更名
**`FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md` v1.0**；批准记录 CHG-20261113-01（用户指令链）。

**实现轮（W2 oracle/golden 面 → W3 引擎/系统/场景面 → W4 测试面 → W5 UI/验证镜像/文档面）**：

| # | 交付 | 落点 |
|---|---|---|
| 1 | `tools/oracle/fc001_l1_oracle.py`——oracle_base 出生接入 + RK4 T_st 子步积分 + L0 级联闭式/foStep 子步递推**独立逐字复刻（非 import）**，复刻位级无损 worst 9.237e-14（W2 汇报口径）；自检新段 **FEC-1…8**（Q8 定案 (a)）；不 import src/** | W2 |
| 2 | **fc001_v2 第 10 个 golden**：5 Run 镜像 fc001_v1 全集**全部 electrochem_model=on**、schema v2、tier **T-B**（容差按双实现实测散差 ×≥10 于 emit 冻结）、1,363,737 字节 + sidecar、approval 首签（user CHG-20261113-01 批准链）、supersedes="fc001_v1（L0 轨 off，字节冻结留档）"；`MODELS["fc001_l1"]` 注册行（scalars 17 项 = fc001_v1 镜像 14 键 + T_st_end_K/V_stack_end_V/P_loss_stack_end_kW 三新键） | W2 |
| 3 | **T-B 分派 `_V` 分支**（verify_golden.py——B-4 定案显式硬项 additive）：elif 链尾、仅 gate 声明 V_stack_atol/V_stack_rtol 时激活——gt001_v3 V_bus_V 等既有 `_V` 后缀键照旧落 f_Hz_atol 兜底（既有键路由逐字节不变），fc001_v2 V_stack_V 不再落量纲错配兜底；**226 对路由零错配**（W2 汇报口径；本发布轮独立复审计：10 golden × 全序列键 975 对 0 错配，§4 注） | W2 |
| 4 | **DEFAULT_MODELS 双→三 golden**（B-5 定案）：步① 无参调用 fl001 → fl001_l1 → fc001_l1 三 golden 顺序验证（0 新步并入体例）；步① label「verify_golden fl001」滞后维持登记（V120 DEC-5） | W2 |
| 5 | **engine `simulateFC001` 电化学 on 轨 early-return 分支**：off 路径逐字不动；on 轨 = 极化链（EQ-FCEC-1）+ RK4 T_st（EQ-FCEC-3/4）+ 级联复用——引擎↔oracle 比对 **397/397**、**T_st bitwise 0.0**（W3 汇报口径）；**off 轨 timeseries ALL-BYTE-IDENTICAL**（逐位硬条件）；**onTrackOnly 列门控**（engine.js :575 起——带标记信号列 off 轨结构性不建列、timeseries.signals 逐字节不变，on 轨由 simulateFC001Electrochem 补建三列；改前探针 null 列 6ac0ae17…→0dd7e9a1… 变哈希实证） | W3 |
| 6 | **systems.js FC SystemDef 扩展**：defaults `electrochem_model:'off'`（:430）+ 3 新信号 T_st_K/V_stack_V/P_loss_stack_kW（:566-568，onTrackOnly:true）+ **model.electrochem additive 子对象**（:640 起，A-fcec-* 6 条 + on 域 limitations 4 项分域）+ **level_on/summary_on 派生变体**（:665 起，FL001.levelFor/summaryFor 先例同构——既有 level/summary 静态消费入口零变化）+ acceptance.keyValues 分域（off 域锚定、on 轨由 fc001_v2 承载）+ normalizeConfig 盖章 | W3 |
| 7 | **scenario B-1(a) 显式键**（Q9 定案——偏离 thermal/inertia 无条件先例，理由=面③冻结边界）：EVENT_KEYS additive 新键 `electrochem_model` + ELECTROCHEM_MODELS=['off','on'] + declaresElectrochem 守卫派生；**缺省全链 absent（不解析为系统默认轨——缺省轨只在引擎盖章层），显式键才入归一化事件与 hashProjection** ⇒ 既有 FC 场景 scenarioHash 零变化（哈希字面锚定见 §5） | W3 |
| 8 | **schema B-3(a) 零投影**：scenarioView（config_hash 投影）不投影 electrochem_model ⇒ FC on/off 两轨 config_hash 同值（已知局限登记不静默——轨区分由 run_hash/序列内容承载） | W3 |
| 9 | **B-7 盖章双落点**：engine.js normalizeConfig 盖章行（thermal_model 块后同构新行）+ systems.js defaultConfig 公共 API 盖章行——两处新增 electrochem_model 行 | W3 |
| 10 | **R-6 FC 电化学分派守卫**（engine-fc.test.js §14——R-5/R-7 先例命名；GT/FL 轨数值与 FC 电化学锚点不同，断言即守卫） | W4 |
| 11 | **tests 断言面 +246**（W4 汇报口径）：engine-fc.test.js 294→**484**（on 轨变体节 §9–§15 并入既有步⑥——引擎↔fc001_v2 T-B 比对 + off 逐位 + null 列 + 跨深度 + monitor 恒等 + cfg→golden 分派 §13）、scenario.test.js 389→**437**（§10 electrochem_model 键节：显式键保留/缺省 absent/负例）、schema.test.js 309→**317**、core.test.js 11357→**11363**；其余 19 文件零改动 | W4 |
| 12 | **UI 三态编辑器 + track 面板 + 徽章/摘要派生**：scenario 页 FC electrochem_model 事件卡编辑器（off/on/缺省三态，显式键才写入归一化事件并入内容哈希）+ system 页 on 轨模型声明面板（refs.trackPanel——model.electrochem 批准子对象渲染）+ electrochem chip 徽章/Run 行展示 + level/summary 派生消费（e2e/file-smoke/walkthrough FC on 轨断言扩展） | W5 |
| 13 | **FAULT_CATALOG v1.5→v1.6**（§2 FC-001 增 electrochem_model 配置开关注记行——三族 L0 物理面 off / 电化学轨 on、golden 分派 fc001_v1/fc001_v2、批准链 CHG-20261113-01） | W5 |
| 14 | **步数账 35 → 35（0 新步）**（V120 DEC-5——verify_golden fc001_l1 并入步① DEFAULT_MODELS、engine on 轨并入 engine-fc 既有步⑥；**FIRST-35-STEPS-NORMALIZED-IDENTICAL 机检既有 35 步零改动**；预算维持 ≤35、申报 0 增步） | W2–W5 |

## 2. TESPy C1/C2 角点补全（V120 三线之二，产品面外证据面）

W6（`evidence/gt/tespy-independent-case.md` 增补）：**C1（u=19.65 sensor +0.3 指令域稳态）+
C2（u=40 钳位稳态）** 以 **stdlib 定比热口径 (a)** 复算、**GL-1 六判据同构 6/6 × 2 角点 =
12/12 PASS**（角点闭合 3.553e-15/4.263e-14 kW 级；独立实现 vs oracle 同参六量 diff
0.000e+00 bit-identical）；设计点+两角点三点覆盖面成立（Q-T1…Q-T4 全采 (a)）；临时脚本
SHA-256 登记用后即删；gt001_v3 golden 与动态轨零触碰。
**LICENSE 核实发现（§8.7）**：api.github.com `repos/oemof/tespy/license` 直读（2026-11-13，
blob sha 0a8fd1f33886c87fa6313cf9fcd1f4a69a33a480）——**TESPy 实际为 MIT License
（Copyright (c) Francesco Witte）**，并非 REFERENCES R-TESPy 行登记假设的「GPL-3.0 待核对」；
隔离纪律效力不变（MIT 宽于原假设，登记纪律为保守超集）；R-TESPy 行回填随本发布轮落
docs/REFERENCES.md（v1.1.x 残留「硬前置」就此清偿，C3 真 TESPy 口径 (b) 候选前置就绪）。

## 3. v1.1.x 残留清算（V120 三线之三）

| # | 项 | 处置 |
|---|---|---|
| ① | CHG-20261110-02 ④ perf 阈值再登记（G7 闭合前置） | **✓**（CHG-20261110-03 波前闭合：15000→31500 ms + 35/35 × 2 复跑） |
| ② | v1.1.x 待办「FC P1 批准轮=下一波首项候选」 | **✓**（本波批准+实现两轮全做，§1） |
| ③ | TESPy C1/C2 v1.1.x 候选 | **✓**（§2，12/12） |
| ④ | 步① label「verify_golden fl001」/ 步 31 label「61 断言」滞后 | **维持登记不修**（V120 DEC-5——避免 FIRST-35 机检扰动，随下次步账触轮统一固化；现行步① 实际覆盖三 golden、步 31 file-smoke 实际 80 断言） |
| ⑤ | v1.2.x 候选登记（随本 CHG ④） | Arena exposure 三值映射验证轮（Arena 盲测池扩张前置）/ MG 教学路径 / METRICS_P1 QP-4 假候选率测量 / **C3 真 TESPy 口径 (b)**（LICENSE 已核实 MIT——硬前置仅剩 REFERENCES 回填，**本波完成清偿**，登记已就绪）/ 步①·步 31 标签滞后固化（随下次 tools 触碰） |

## 4. 验证（发布门 1–8 全表，全部真实运行）

| # | 命令 | 退出码 | 关键数值 |
|---|---|---|---|
| 1 | `python tools/build.py` | **0** | FaultLab.html **1679.7 KiB**（css=10 js=33；1633.2→1679.7） |
| 2 | `node tools/run-g2.mjs` × 2（中间零改动） | **0 / 0** | **35/35 PASS × 2**；r1 总耗时 **78450 ms**（started 2026-11-13T20:33:54.110Z）、r2 **78179 ms**（20:35:35.335Z）；tier 分解 r1 = core 28 步 28 pass 74375 ms + extended 7 步 7 pass 3910 ms / r2 = core 28/28 74087 ms + extended 7/7 3913 ms；**perf 步实测 12255（r1）/12263（r2）ms ≪ 31500 ms**；e2e 步 24054/23731 ms、file-smoke 步 25763/25739 ms；**0 新步**（35 维持——步① 现为三 golden 顺序验证 fl001→fl001_l1→fc001_l1） |
| 3 | `python -I scripts/verify_golden.py`（默认 + 逐模型） | **9 × 0** | default **三 golden 80 checks**（fl001 25 + fl001_l1 25 + fc001_l1 30）/ fl001 25 / fl001_l1 25 / fc001 30 / **fc001_l1 30（新注册行首验）** / gt001 35 / pv001 25 / wt001 30 / mg001 30——合计 **310 checks，0 fail**（全 8 注册行；V-01…V-09 + T-B 锚点全过）。附：`python -I tools/oracle/fc001_l1_oracle.py` 自检 FEC-1…8 **exit 0**（本轮追加实跑）；路由审计探针 = 10 golden × 全序列键 **975 对 0 错配**（`_V` 分支同构复刻复审计，本轮追加） |
| 4 | `python -I tools/oracle/oracle_base.py` | **0** | 机制自测 T-1…T-8 全 pass + conformance ok |
| 5 | `node tools/copy-guard.mjs` | **0** | **PASS 39 patterns，0 命中**（词表 39/14 基线维持——BANNED 只增不删纪律，本波零增词） |
| 6 | `node tools/file-smoke.mjs --rounds 3` | **0** | **3 轮 × 80 = 240 PASS / 0 FAIL**（76616 ms）——重打包产物复验 |
| 6a | `node tools/ui-walkthrough.mjs` | **0** | **63/63**（31430 ms；六系统深度走查 + REDLINE_TERMS 渲染面扫描——59→63 为 FC on 轨四断言 additive） |
| 6b | `node tools/e2e.mjs` | **0** | **76/76**（23719 ms——65→76 为 FC on 轨断言 additive；另 run-g2 两轮内 e2e 步各 1 次全过） |
| 7 | golden 零变化终检 | — | `git status --short data/golden/` = **仅 2 个新增**（fc001_v2.json + .sha256）；`git diff --stat -- data/golden/` = **空**；既有 9 golden 字节复核见下表 |
| 8 | 测试面汇总（W4 汇报数 + 抽查复跑） | — | **23 文件全绿**（今日 run-g2 两轮覆盖全部 23 个 .test.js；下表）；抽查复跑 core.test.js **11363/0** ✓、engine-fc.test.js **484/0** ✓（与汇报一致）、本轮追加实跑 scenario **437/0** ✓、schema **317/0** ✓、registry **60/0** ✓ |

**既有 9 golden 字节复核（2026-11-13 ls -l 实测，与 v1.1.0 时点零变化——git diff 空）**：

| golden | 字节 | golden | 字节 |
|---|---|---|---|
| fc001_v1 | 1,093,755 | gt001_v3 | 2,372,494 |
| （新增）fc001_v2 | 1,363,737 | mg001_v1 | 1,051,804 |
| fl001_v1 | 659,299 | pv001_v1 | 788,738 |
| fl001_v2 | 930,796 | wt001_v1 | 1,461,288 |
| gt001_v1 | 1,449,900 | gt001_v2 | 1,452,353 |
| （sidecar：fc001_v2 80 字节；gt001_v1/v2 81 字节，余均 80 字节） | — | — | — |

**23 测试文件断言汇总（W4 汇报数 + 沿 v1.1.0 数；★ = 本轮抽查复跑实证一致；23 文件今日 run-g2 两轮内全绿）**：

| 文件 | 断言 | 文件 | 断言 |
|---|---|---|---|
| ★core.test.js | **11363** | engine-mg.test.js | 382 |
| ★engine-fc.test.js | **484** | engine.test.js | 428 |
| ★scenario.test.js | **437** | engine-gt.test.js | 451 |
| ★schema.test.js | **317** | engine-pv.test.js | 166 |
| ★registry.test.js | **60** | engine-wt.test.js | 228 |
| teaching.test.js | 235 | arena.test.js | 155 |
| leaderboard.test.js | 78 | arena-protocol-negative.test.js | 42 |
| causal-rules.test.js | 149 | plants.test.js | 83 |
| event-phase.test.js | 46 | bundle.test.js | 35 |
| report.test.js | 32 | scope-guard.test.js | 30 |
| compare.test.js | 27 | backend 两件（admission+bridge） | 全绿 |

## 5. additive 三不承诺兑现声明（V120_WAVE_DESIGN DEC-8，V1_FACES §3.4 边界）

1. **不改既有合法输入的任何哈希输出**：机检 = scenario.test.js 437 全绿（roundtrip/执行等价
   既有断言零失败 + §10 新键节显式声明缺省 absent）+ registry.test.js 60（规范哈希/不可变）
   + schema.test.js 317（投影面）全绿；**跨代码版本字面锚定探针（本发布轮实跑，HEAD=20db6f4
   v1.1.0 代码 vs 本波工作树，同一输入逐字节比对）**：
   - 既有 FC 场景（无 electrochem 键）scenarioHash = `1f06226667f54868412c0fd2d7531ea31e58a673b21b963c0422ad9dfadec96f`
     **两版同值**（scenarioHash 字面锚定——B-1(a)：缺省键全链 absent、显式 off =
     `a23dc6c5…1988`、显式 on = `d3ee31bb…96f2`，新键只影响使用它的输入）；
   - FC healthy config_hash = `8822c1d472c4ef9f22e5d18c0de534c2d6e37d5295a597b20247c39f008b68d0`
     **两版同值**；FC 同配置 on/off config_hash 同值 = `5ec186011467a6a87e8daeee6c810227977f145259887ec34e8634405902496a`
     （B-3(a) schema 零投影——已知局限登记不静默）；
   - FC model_hash = `c6a938f2e4f798af7c637f9eed9d53007b76e004be9fcd4901904638eb23eb83`
     **两版同值**（B-2 定案：model.electrochem additive 子对象在九字段具名哈希域外）；
   - FC off 轨 healthy Run run_hash = `6ac0ae17d4b4b1b912b290a6b463a435db99f8888296160e17e9534f734204c6`
     **两版同值**（off 轨 run_hash 逐位零变化——onTrackOnly 列门控机检 + 本探针双佐证）；
   - 引擎↔golden 全量比对绿（engine 428/engine-fc 484/engine-gt 451/engine-pv 166/
     engine-wt 228/engine-mg 382）——electrochem 键控 additive（off 轨全程零触发）；
2. **既有 9 golden 字节零触碰**：`git diff --stat -- data/golden/` 空 + verify_golden 全 8 注册行
   exit 0（V-02 sidecar 绑定实际字节复验）+ §4 字节表；fc001_v2 = 新 id 新文件（§3.4 字节冻结
   条款不涉；fc001_v1 supersedes 留档关系登记于 golden 元数据，fc001_v1 自身零触碰）；
3. **既有 35 run-g2 步判据零翻转**：FIRST-35-STEPS-NORMALIZED-IDENTICAL 机检（W2–W5 并入面
   步清单零改动——步① 命令行零变化、verify_golden 无参调用 DEFAULT_MODELS 内部扩展）+ 本轮
   35 步全部 pass × 2（**0 新步**；perf 步判据文本零改动，31500 ms 阈值系波前 CHG-20261110-03
   已闭合项非本波动作）。

## 6. 发布门行

**G7**：run-g2 `--tier all` 35/35 两次独立 —— **已闭合**（CHG-20261110-03 波前闭合：31500 ms
再登记 + 61716/59915 ms 复跑；本波 0 新步零判据变更，本轮复测 35/35 × 2、perf 步 12255/12263 ms）。
**G8**：本证据（发布门 1–8 全部真实运行全绿，§4）。

**批准人：用户（CHG-20261113-01 指令链——本证据为 v1.2.0 收口登记输入件）；记录人：W7 门禁与证据路。**
**推送按用户裁定暂缓（同批 v0.7.1–v1.2.0 延续，本波产出并入同批；本地提交随收口轮决定，V120 DEC-7 同口径）。**

**文件结束**。v120-release（2026-11-13，W7 门禁与证据路；体例沿 v110-release.md）。
