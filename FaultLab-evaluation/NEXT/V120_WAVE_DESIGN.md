# V120_WAVE_DESIGN — v1.2.0 实现波设计（A-5 P1 FC 电化学批准与实现轮 + TESPy C1/C2 角点补全 + v1.1.x 残留清算）

> **性质**：阶段设计文档（Lead 起草，2026-11-13）——V110 波（v1.1.0，commit 20db6f4）后首波：
> CHG-20261110-02 ④ 待办承接（FC P1 批准轮=首项候选、TESPy C1/C2 候选、perf 阈值已于波前
> CHG-20261110-03 闭合）+ A5_MULTIPHYSICS_EXPLORATION §5 串行链首环兑现（P1 未落地前 P2 不启动
> 批准、P3 不启动实现）。**八面冻结下第二个 additive 波（MINOR）**——新 golden fc001_v2 +
> 新 scenario 轨键 + 新 oracle + FC 信号面 +3（V1_FACES §3.1 additive 语义）。
> **授权记录（CHG-20261113-01）**：用户 2026-11-13 指令「设计下一轮的长期方案，统一采用推荐决策，
> 采用并发多个子智能体来加速任务；不要和已有进程冲突。」——**DEC-1…8 全采推荐项**；FC P1 批准
> 经本指令链登记（**GTL1-G2b-02 先例：用户指令链即书面批准记录**，WT-001/MG-001 同例）——双路
> 独立评审先行、条件落正文、Q1…Q8 定案后更名 APPROVED v1.0。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.1.0 同批，本地 ahead 8）——本波产出并入同批。
> **输入**：FC001_ELECTROCHEM_G2B_SPEC_DRAFT.md v0.1（394 行，Q1…Q8 全带推荐）、
> TESPY_CORNER_EXTENSION_ASSESSMENT.md v1（§3 推荐 C1+C2 stdlib 口径 (a)）、CHG-20261110-02 ④、
> CHG-20261110-03（perf 31500 ms 已闭合）、docs/V1_FACES.md（八面冻结 + §3 additive 边界）、
> FL001_THERMAL_G2B_SPEC_APPROVED.md（L1 深化实现先例：0 新步并入体例）、evidence/g8/v110-release.md。

---

## 0. 本波边界

**做**（三条线）：
1. **A-5 P1 FC 电化学批准轮 + 实现轮**（主线）：FCECH-G2b-02 收口（双路独立评审 A 物理/B 治理
   → 条件落正文 → **参数面十常量批准轮定案**（三整定依据 + 域扫描证据）→ Q1…Q8 定案 → 更名
   `FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md` v1.0）→ FCECH-G2b-03/04（fc001_l1_oracle +
   fc001_v2 emit + 引擎 on 轨 + 场景键 + UI + 测试）；
2. **TESPy C1/C2 角点补全**（产品面外证据面，S 规模）：stdlib 定比热口径 (a)、GL-1 同构判据、
   证据增补现旁证文件（Q-T1…Q-T4 全采推荐 (a)）；
3. **v1.1.x 残留清算**：v1.2.x 候选登记（Arena exposure 三值映射验证轮 / MG 教学路径 /
   METRICS_P1 QP-4 假候选率测量）+ run-g2 标签滞后已知面处置（维持登记不修，见 DEC-5）。

**不做**（沿袭 + 本波显式）：
- L2（CFD/FEA/多体——永久）、插件化、云/账户/排行榜/实测/HIL/npm/打包器（沿袭清单）；
- A-5 P2 FL / P3 GT（P2 排 P1 落地一个发布周期后 + 显式重开「SOC 定义不动」裁定；P3 草案可
  并行、实现严格串行——本波只兑现 P1 串行链首环）；C3 真 TESPy 口径 (b)（LICENSE 核实硬前置，
  v1.2+ 候选）；C4 域外伪影角点（评估稿否决）；
- D-3 FMU（样本未到）、golden backend 信息块（留位）、Arena 盲测池扩张（PV/WT/MG 入池——
  exposure 三值映射验证轮未做，延后登记）、MG 教学路径（v1.2.x 候选）、METRICS_P1 启用/QP-4
  放行（候选登记）、C-2 拖拽、B-4 TL-001（远期）；
- **任何既有 golden 重出**（fc001_v1 字节冻结维持——§3.4 强于 semver；fc001_v1 工件元数据
  model_version 失同步遗留不属本轨兑现面）、**任何 breaking 变更**、scope.js 任何触碰（Q1 采 B
  ——classify 结构零改动，若实现中证明必须触碰则停下显式 CHG）。

**版本与语义**：v1.2.0（MINOR——新 golden 新 id / 新 scenario 轨键 electrochem_model / 新 oracle
fc001_l1_oracle / FC SystemDef 信号 +3 / on 轨 UI 变体，V1_FACES §3.1）；additive 三不承诺见 DEC-8。

## 1. 决策点（已按用户指令全采推荐项）

### DEC-1：A-5 P1 FC 批准与实现时点

候选：本波批准+实现 / 只批准不实现 / 继续挂起。
**采纳（推荐，CHG-20261110-02 ④ 首项候选）**：本波两轮全做。批准轮 FCECH-G2b-02 收口：双路
独立评审（A 物理：EQ-FCEC 自洽与量纲/单调性域/守恒面与热记账/r_meas 扩展口径/稳定性条件/锚点
复算/L1 判据对照；B 治理：五项进入条件/Q1…Q8/classify 二选一/copy-guard/golden 治理与
verify_golden 注册面/不动清单/步数账/契约面 additive 核对）→ 条件全按推荐落正文 → **参数面
十常量定案**（§1.5 三整定依据：① V_stack(50 A, T_st(0))=400 V 铭牌复现；② 60 s 窗内 T_st 轨
可见；③ dV/dI<0 于注册域全域——附域扫描证据入 §1.5/§3.3）→ MG-DRAFT 式 Q1…Q8 定案 → 更名
`FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md` v1.0（§10 回填 + 处置表，PV001 §11 体例）。批准经本
指令链登记（GTL1-G2b-02 先例）。实现轮 FCECH-G2b-03/04 见 §2。

### DEC-2：classify 二选一（草案核心裁定点 Q1）

**采纳（推荐候选 B）**：cfg 键分域——modelId 'fc.pem.l0' + modelVersion '1.1.0' 维持仅登记，
轨语义由 `electrochem_model` cfg 键承载，cfg→golden 分派 off→fc001_v1 / on→fc001_v2（两门禁面
= 草案 §4 项 10）；**scope.js 结构零改动**（FLTH B-1/B-2 双先例）；fc001_v2 元数据
model_version='1.1.0' 同值、golden 语义由 golden_id 承载。显式 CHG 面（EVENT_KEYS 新键 +
declaresElectrochem 守卫 + 白名单扩张声明 + 两门禁面）随本波批准 CHG 登记。

### DEC-3：golden/oracle 形态（Q2/Q3/Q4/Q5/Q6/Q7/Q8）

**采纳（全采草案推荐）**：Q2 命名 `tools/oracle/fc001_l1_oracle.py`（fl001_l1/gt001_l1 镜像先例）；
Q3 P_loss,stack=(E0−V_stack)·I/1000（按构造自洽零新增常数）；Q4 浓差对数式 c_conc·ln(I_lim/(I_lim−I))；
Q5 铭牌恒压换算 + r_meas 扩展恒等含口径偏差项 + V_stack(50,298.15)=400 V 整定；Q6 **5 Run 镜像
fc001_v1 全集全部 on**；Q7 **T-B**（RK4 双实现方法等价；容差按双实现实测散差 ×≥10 于 emit 冻结，
超限降 T-C + convergence 双向预案）；Q8 自检新段 **FEC-1…8**（§4 项 4 预案）。golden schema v2 +
approval 三字段首签 + sidecar LF 钉死 + supersedes="fc001_v1（字节冻结留档）"。

### DEC-4：scenario 新键 additive

**采纳（推荐，草案 §2）**：EVENT_KEYS 白名单 additive 新键 `electrochem_model` +
ELECTROCHEM_MODELS=['off','on'] 枚举常量 + declaresElectrochem 系统守卫派生（thermal_model/inertia_model
同构先例）；缺省解析=系统默认轨（off）；**既有合法输入哈希零变化**（新键只影响使用它的输入）；
盲包语义零变化（FC 默认 off ⇒ 指纹/观测面零变化；新信号 T_st_K/V_stack_V/P_loss_stack_kW 全非
盲显、off 轨全程 null）。

### DEC-5：步数账（I-7）——0 增步

**采纳（推荐，草案 §4 项 9/§8 FCECH-G2b-04 + FL v0.8.0 先例）**：run-g2 **35 → 35（0 新步）**——
verify_golden fc001_l1 并入步①（DEFAULT_MODELS 追加，同一 python 调用内三 golden 顺序验证——
fl001_l1 并入先例同构）；engine on 轨变体并入 engine-fc.test.js 既有步⑥。**预算维持 ≤35、申报
0 增步**（FLTH §7.3「优先并入现有步」口径）；**FIRST-35-STEPS-NORMALIZED-IDENTICAL 机检**既有
35 步零改动。已知标签滞后（步① label 未含 fl001_l1/fc001_l1、步 31 label「61 断言」实际 69）
**维持登记不修**——避免 FIRST 机检扰动，随下次步账触轮统一固化（CHG-20261110-02 ④ 处置延续）。

### DEC-6：TESPy C1/C2（评估稿兑现）

**采纳（全采评估稿推荐）**：C1（u=19.65 sensor +0.3 指令域稳态）+ C2（u=40 钳位稳态）以
**stdlib 定比热口径 (a)** 复算、**GL-1 六判据同构**（±1e-9 / ±1e-3）、S 规模、证据增补
`evidence/gt/tespy-independent-case.md`（Q-T1 采 (a) 附录节）；Q-T2 采 (a) stdlib 先行（C3 真
TESPy 口径 (b) 分轨后置，LICENSE 核实=硬前置、网络可用即回填 Q-T3 采 (a)）；Q-T4 采 (a) 同构
判据。产品面外身份不变：不进产品代码/golden/import/门禁；C4 不做；gt001_v3 golden 与动态轨
零触碰。

### DEC-7：push 状态

**采纳（推荐，用户先前裁定延续）**：同批暂缓延续（v0.7.1 起至 v1.1.0——v1.1.0 已于波前按
推荐口径本地提交 20db6f4，本地 ahead 8）；本波产出将来并入同批，不新增远端动作；CHG-20261113-02
（v1.2.0 发布）随波预留并在发布轮决定本地提交（同口径）。

### DEC-8：additive 边界三不承诺（V1_FACES §3.4）

**采纳（推荐）**：① 不改既有合法输入的任何哈希输出（electrochem_model 仅影响使用该键的新输入）；
② 既有 9 golden 字节零触碰——**off 轨逐位硬条件**（草案 §3.1：off 轨 run_hash 逐位不变 + 三新
信号列 off 轨全程 null + fc001_v1 比对面零变化）+ verify_golden 既有七注册行复验零变化；③ 既有
35 run-g2 步判据零翻转（perf 阈值已按 CHG-20261110-03 程序闭合，本波零门禁判据变更）。BANNED
词表 39 基线只增不删（§6.3 预检 0 命中预期；如需增词 = additive + deviations 登记）。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-13 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；git 工作树
clean（HEAD=20db6f4 v1.1.0）、无 stash——**无已有进程可冲突**。派发全程：不 push、不 rebase、
不触碰 data/golden/ 既有 9 文件字节、各路文件面互斥。

**三阶段 9 路（V110 先例）**：

```text
阶段一（批准轮，评审独立 + 收口）
  W1a 评审 A（物理/数值）→ 只读评审 DRAFT v0.1，verdict+条件清单（报告返回，不写文件）
  W1b 评审 B（治理/口径）→ 只读独立评审（与 W1a 互不可见），verdict+条件清单
  W1c 批准轮收口        → 条件落正文 + 参数面十常量定案（域扫描证据）+ Q1…Q8 定案
                          + §10 回填 + 更名 FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md v1.0
阶段二（实现轮，文件面互斥四路）
  W2 oracle 面          → tools/oracle/fc001_l1_oracle.py 新建 + verify_golden.py（import+
                          MODELS["fc001_l1"]+DEFAULT_MODELS 追加+docstring）+ data/golden/fc001_v2.json/.sha256
  W3 引擎/系统/场景面   → src/core/engine.js（FC on 轨 early-return 分支+RK4 T_st+极化链，off 逐字不动）
                          + systems.js（defaults 键+3 新信号 off-null+A-fcec-*+limitations 分域+level/summary
                          变体+acceptance 分域）+ scenario.js（EVENT_KEYS+ELECTROCHEM_MODELS+declaresElectrochem）
                          + src/core/schema.js（electrochem_model 投影沿 thermal_model 先例，若适用）
                          —— scope.js 零触碰（DEC-2）
  W4 测试面             → tests/engine-fc.test.js on 轨变体节（引擎↔fc001_v2 T-B 比对+off 逐位+null 列
                          +跨深度+monitor 恒等）并入既有步⑥；registry/schema 测试若哈希面更新
  W5 UI/验证镜像/文档面 → src/ui/**（scenario 页 electrochem_model 编辑器+system 页 on 变体徽章+
                          signals 新列通用渲染）+ tools/e2e.mjs+file-smoke.mjs+ui-walkthrough.mjs（FC on 轨断言）
                          + docs/FAULT_CATALOG.md（§2 FC 注记行+勘误）+ copy-guard 终检（39 基线）
阶段三（收尾与发布门，串行两路）
  W6 TESPy C1/C2        → evidence/gt/tespy-independent-case.md 增补（C1+C2 stdlib 口径 (a)，
                          GL-1 同构判据，临时脚本 SHA-256 登记用后即删）+ 评估稿 Q-T 定案注记
  W7 门禁与证据         → run-g2 --tier all 35/35 两次独立 + verify_golden 八注册行全 exit 0 +
                          oracle_base 自检 + copy-guard 0 + build.py repack + file-smoke/walkthrough/e2e +
                          evidence/g8/v120-release.md + DECISIONS.md CHG-20261113-02 + V1_FACES additive 修订
```

**文件面分配互不相交声明**：W1a/W1b 只读；W1c 独占 FC 规格文件；W2 独占 fc001_l1_oracle.py +
verify_golden.py + data/golden 新文件；W3 独占 engine.js/systems.js/scenario.js/schema.js（scope.js
禁触）；W4 独占 tests/**；W5 独占 src/ui/** + FAULT_CATALOG.md + e2e/file-smoke/walkthrough/copy-guard；
W6 独占 tespy 证据文件；W7 独占 V1_FACES/CONTRACT/evidence/DECISIONS/FaultLab.html——**互不相交**。

**并发度说明（不要和已有进程冲突）**：设计为并发派发；主机实测子智能体并发额度=1（2026-11-10
实测），额度受限时按依赖序排队串行（W1a→W1b→W1c→W2→W3→W4→W5→W6→W7），文件面互斥保证零合并
冲突、零进程冲突；评审 A/B 串行执行但互不可见（独立性由「后行者不读先行者报告」纪律保证）。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | **35 步不变**（0 新步）；步① 内三 golden（fl001/fl001_l1/fc001_l1）约 +1–2 s；总耗时不超 31500 ms 新阈 |
| verify_golden | MODELS 7→8 注册行；DEFAULT_MODELS 双→三 golden；既有七注册行路径逐字节不变 |
| golden 库 | 9→10（fc001_v2 新 id schema v2 T-B）；fc001_v1 字节冻结维持 |
| 信号目录/manifest | FC signals 21→24（+T_st_K/V_stack_V/P_loss_stack_kW）→ model_hash 更新（GT/FL 先例同款） |
| scenario 哈希 | 既有输入零变化；使用 electrochem_model 键的新输入含解析轨值 |
| e2e/file-smoke/walkthrough | 65/69/59 → 随 FC on 轨断言扩展至 N |
| FaultLab.html | 1633.2 KiB → 随 FC on 轨/UI 增长 |
| 测试面 | engine-fc on 轨节并入（断言数增）；其余 21 文件零改动全绿 |
| V1_FACES | 面① FC 画像行 +3 信号、面② golden 9→10、面⑧ 词表 39 基线维持——全部 additive 修订随 CHG-20261113-02 |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 极化链常量整定失当（非单调/工作点偏离铭牌/分歧方向与叙事不符） | 三整定依据硬约束（DEC-1）+ 批准轮域扫描证据入规格 + FEC-3/FEC-5/FEC-8 emit 硬条件 + 双评审物理专项 |
| 2 | T-B 双实现散差超预案（对数项密集 libm 差异） | 容差按双实现实测散差 ×≥10 于 emit 冻结（FEC-7）+ 超限降 T-C + convergence 块双向预案 + 禁 ULP 级承诺 |
| 3 | 浓差域越界（I ≥ I_lim NaN） | I_lim > 137.5 A 域硬条件 + 域守卫/钳位实现轮裁定面（FC-IMP，登记不静默）+ FEC-8 抽查 |
| 4 | fc001_v1 / fc001_oracle.py 误触（V-03 失配→冻结锚点报废） | §0 不动清单 + off 轨 run_hash 逐位验收 + verify_golden 既有行复验 + 全量回归兜底 |
| 5 | 教学参数被误读为设备辨识 / r_meas 扩展被误读为测量链升级 | A-fcec-params/A-fcec-meas 显式声明（草案 §1.6 六条）+ I-5 句式纪律 + copy-guard 终检 |
| 6 | scope.js 被实现轮误触（Q1=B 预期零触碰） | DEC-2 禁触条款 + W3 面定义显式排除 + 实现中若证明必须触碰→停下显式 CHG |
| 7 | 主机并发额度限制 | §2 并发度说明：文件面互斥 + 依赖序串行排队，零冲突 |
| 8 | push 批次累积 | 用户裁定同批暂缓延续，本波并入同批，不新增远端动作 |

**文件结束**。V120_WAVE_DESIGN v1（2026-11-13，CHG-20261113-01 批准，按推荐执行）。
