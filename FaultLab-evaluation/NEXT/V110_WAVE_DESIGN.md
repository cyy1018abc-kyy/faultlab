# V110_WAVE_DESIGN — v1.1.0 实现波设计（B-3 MG-001 批准与实现轮 + A-5 P1 FC 草案轮 + v1.0.x 残留清算 + 八面冻结首轮 additive）

> **性质**：阶段设计文档（Lead 起草，2026-11-10）——V06_ROADMAP v1.0.0 行后首波：CHG-20261108-04 §5 裁定①（MG-001=v1.0.x 首项）②（A-5 三提案=v1.0 后逐步 G2b）承接 + v1.0.x 待办清单清算。**八契约面冻结后的第一个 additive 波（MINOR）**——V1_FACES §3.1 MINOR 明文例即「B-3 MG-001 系统 + golden」。
> **授权记录（CHG-20261110-01）**：用户 2026-11-10 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务；不要和已有进程冲突。」——**DEC-1…8 全采推荐项**；B-3 MG-001 批准经本指令链登记（**GTL1-G2b-02 先例：用户指令链即书面批准记录**，WT-001 同例；V1_FACES §5 裁定① 终裁承接）；A-5 P1 FC 只到草案+双路评审（**批准留待用户**，沿 PV-001/GT-L1 两波节奏）。
> **推送状态**：用户裁定五批同批挂起延续（v0.7.1 4963e6a 起至 v1.0.0 61820f1，本地 ahead 7）——本波产出将来并入同批。
> **输入**：V06_ROADMAP §2/§3、CHG-20261108-04 §5 六项裁定、MG001_G2B_SPEC_DRAFT.md（DRAFT v0.1；双评审 A:PASS_WITH_CONDITIONS(4)/B:PASS_WITH_CONDITIONS(6)；修订清单 evidence/g8/v090-release.md §3）、A5_MULTIPHYSICS_EXPLORATION.md（P1/P2/P3 推荐时点）、docs/V1_FACES.md（§2 八面冻结、§3 breaking 政策、§7 清算清单）、DECISIONS.md v1.0.x 待办、evidence/g8/v100-release.md。

---

## 0. 本波边界

**做**（三条线）：
1. **B-3 MG-001 批准轮 + 实现轮**（主线）：MG-G2b-02 收口（双评审条件落地 + MG-DRAFT-Q1…Q7 定案 + 更名 APPROVED）→ MG-G2b-03/04（mg001_oracle + golden mg001_v1 + 引擎分派 + UI 六系统化 + FAULT_CATALOG §8）；
2. **A-5 P1 FC G2b 草案轮**（不定实现）：FC 电化学 V-I 极化 + 电堆温度 T_st；只草案+双路评审，批准留待用户；
3. **v1.0.x 残留清算**：枚举派生化 / thermo_track 卡定位复核 / FaultLab.html 重打包收敛 / TESPy 角点扩展 / V06_ROADMAP §3 账实修正。

**不做**（沿袭 + 本波显式）：
- L2（CFD/FEA/多体——永久不做）、插件化（D-5 触发条件未现）、云/账户/排行榜/实测/HIL/npm/打包器（沿袭清单）；
- A-5 P2/P3 实现（P2 须 P1 落地一个发布周期后 + 显式重开「SOC 定义不动」裁定；P3 实现严格串行——A5 §5）；D-3 FMU（样本未到）；golden backend 信息块填充（留位）；
- PV/WT/MG Arena 入池（exposure 三值映射验证轮未做——本波 ARENA_EXCLUDED 增 'MG-001'）、C-2 拖拽、METRICS_P1 启用（P1 才启用）、QP-4 放行（假候选率未测量）；
- **任何既有 golden 重出**（§3.4 字节冻结强于 semver）、**任何 breaking 变更**、V1_FACES 冻结面语义修订。

**版本与语义**：v1.1.0（MINOR——新系统实例 + 新 golden + 新 run-g2 步 + 词表增补，V1_FACES §3.1）；additive 边界三不承诺见 DEC-8。

## 1. 决策点（已按用户指令全采推荐项）

### DEC-1：B-3 MG-001 批准与实现时点

候选：本波批准+实现 / 只批准不实现 / 继续挂起。
**采纳（推荐）**：本波两轮全做。批准轮 MG-G2b-02 收口：双评审条件 A-1…A-4 + B-1…B-3/B-5 落规格正文（B-4 已随 CHG-20261108-03 修复；B-6 实现时点终裁已由 CHG-20261108-04 §5① 完成），MG-DRAFT-Q1…Q7 定案落正文，更名 `MG001_G2B_SPEC_APPROVED.md` v1.0（§10 评审记录回填 + 处置表，PV001 §11 体例）。实现轮 MG-G2b-03/04 见 §2。

### DEC-2：MG-001 oracle 物理形态

**采纳（推荐，V090 DEC-1 + 双评审 A-4 条件形制）**：源轨复用聚合层——EQ-MG-1…9 全代数、零新 ODE；PV/WT 源物理**复用委托**（跨 oracle import 显式授权 + MS-3 逐位审计 + 不 import src/**）；锚点 96/96 已独立预复算，复用交叉 E_pv=0.1341667/E_wt=0.218959 与源 golden 逐位一致。独立 oracle 文件 `tools/oracle/mg001_oracle.py`，出生即 oracle_base 接入（RUNS/SERIES_IDS/simulate_run/self_check/_oracle_source_sha256/build_golden 六成员）。

### DEC-3：A-5 多物理场首项与节奏

**采纳（推荐，CHG-20261108-04 §5②）**：P1 FC G2b 草案轮入本波（电化学 V-I 极化曲线 + T_st 新 ODE 状态；`electrochem_model: off|on` 默认 off；新 golden fc001_v2 预登记；A-4c 自写 ODE 主路径沿袭、PyBaMM 不引入）。**scope.js:44-45 classify 硬校验二选一列为草案核心裁定点**（A5 §4.2 涟漪面）。P2 FL（T_bat→容量/内阻，须显式重开「SOC 定义不动」裁定）排 P1 落地一个发布周期后；P3 GT（τ_comb 三维 ODE）草案可并行、实现严格串行。本波只到 P1 草案+双路评审。

### DEC-4：MG-001 与评测轨

**采纳（推荐，草案 §5）**：`ARENA_EXCLUDED` 增 `'MG-001'`（exposure 三值映射验证轮未做前不入池，与 PV/WT 同口径）；评测轨对新系统覆盖扩张不在面⑤承诺内（V1_FACES:248 口径）；island_event 等四族全部登记 extension_preview（FAULT_CATALOG §8 随 MG-G2b-03 落地）。

### DEC-5：步数账（I-7）

**采纳（推荐）**：run-g2 33 → **35**——第 34 步 `verify_golden.py mg001`（core）、第 35 步 `tests/engine-mg.test.js`（core）；WT-001 先例（新系统 = verify 步 + engine 步各一，V080 DEC-6 口径「新系统 5 Run golden + 引擎轨无法并入既有步」）。**预算 ≤33→≤35 显式申报**；**FIRST-33-STEPS-NORMALIZED-IDENTICAL 机检**既有 33 步顺序与判据零改动。mg001_v1 5 Run / SERIES_IDS 19 项 / tier T-A（草案 §8 预填，批准轮确认）/ MS-1…8 自检含 MS-3 复用一致性 emit 硬条件。

### DEC-6：v1.0.x 残留清算范围

**采纳（推荐，全清）**：① engine.js:261/scenario.js:7 枚举文案派生化（knownSystemIds 动态推导，scenario enum copy 先例复用）；② systems.js thermo_track 卡定位复核（随 MG-001 SystemDef 同轮触碰）+ FC thermal_track 卡自述复核（V1_FACES §7 #1）；③ FaultLab.html 重打包收敛（MG UI 落地后 build.py repack + file-smoke 复验，V1_FACES §7 #5）；④ TESPy 角点扩展（评估面，见 §2 W8）；⑤ **V06_ROADMAP §3 账实修正**：v0.8.0 行内容修正为实际交付（A-4b/B-2）、补登 v0.9.0 行（CHG-20261108-01 ② 声称增补未落盘的账实差异）、增补 v1.1.0 行（本波）。

### DEC-7：push 状态

**采纳（推荐，用户先前裁定延续）**：五批同批挂起延续（v0.7.1 4963e6a 起至 v1.0.0 61820f1，本地 ahead 7）；本波产出将来并入同批，不新增远端动作；本地提交节奏随用户指令。

### DEC-8：additive 边界三不承诺（V1_FACES §3.4）

**采纳（推荐）**：本波全部变更走 additive/minor——① 不改既有合法输入的任何哈希输出（scenarioHash/run_hash/config_hash/score_hash/content_checksum）；② 既有 8 golden 字节零触碰、verify_golden 既有六模型复验结果零变化；③ 既有 33 run-g2 步判据零翻转。新 golden `mg001_v1` = 新 id、schema v2、approval 三字段 + sidecar（LF 钉死）；BANNED 词表只增不删（MG 教学面新禁词随实现轮评估，增词 = additive）。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-10 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空（无既有自动化/闲时任务/工作流进程）；git 工作树 clean（HEAD=61820f1）、无 stash——**无已有进程可冲突**。派发全程：不 push、不 rebase/reset 既有未推送提交、不触碰 data/golden/ 既有 8 文件字节、各路文件面互斥。

**三阶段 9 路（V080 三阶段先例）**：

```text
阶段一（批准/草案轮，纯文档，三路可并发）
  W1 MG-001 批准轮 → MG001_G2B_SPEC_DRAFT.md 更名 MG001_G2B_SPEC_APPROVED.md v1.0（条件 A-1…A-4/B-1…B-3/B-5 落地 + Q1…Q7 定案 + §10 处置表）
  W2 FC P1 草案    → 新建 NEXT/FC001_ELECTROCHEM_G2B_SPEC_DRAFT.md（A5 §4 范围 + classify 二选一核心裁定点）
  W3 路线图修正    → V06_ROADMAP.md §3（DEC-6 ⑤；随 CHG-20261110-01 先行落盘）
阶段二（实现轮，代码，文件面互斥四路）
  W4 oracle 面     → tools/oracle/mg001_oracle.py 新建 + verify_golden.py MODELS 追加 + data/golden/mg001_v1.json/.sha256 新增
  W5 引擎/系统面   → src/core/engine.js（MG 分派 + :261 枚举派生化）、systems.js（MG-001 SystemDef + thermo_track 卡复核）、scenario.js（t_clear_s 守卫扩展 + :7 头同步）
  W6 测试/步账面   → tests/engine-mg.test.js 新建 + tools/run-g2.mjs（+2 步 + FIRST-33 机检注记）
  W7 UI/验证面     → src/ui/**（home/compare/scenario/teaching 六系统化）、arena.js（ARENA_EXCLUDED）、docs/FAULT_CATALOG.md §8、tools/e2e.mjs + file-smoke.mjs（MG 断言扩展）
阶段三（收尾与发布门，串行两路）
  W8 TESPy/词表    → NEXT/TESPy 角点扩展评估（新文档，不触碰 src/**）+ copy-guard 增词评估（若需）
  W9 门禁与证据    → run-g2 --tier all 35/35 两次独立 + verify_golden 六模型 + oracle_base 自检 + copy-guard 0 + build.py repack + file-smoke N/N + evidence/g8/v110-release.md + DECISIONS.md CHG-20261110-02（预留）+ V1_FACES additive 修订（画像/8→9 golden/33→35 步/§7 清账）
```

**文件面分配互不相交声明**：W1/W2/W3 各自独占文档；W4 独占 tools/oracle/mg001_oracle.py + verify_golden.py + data/golden 新文件；W5 独占 src/core 三文件；W6 独占 tests/engine-mg.test.js + run-g2.mjs；W7 独占 src/ui/** + arena.js + FAULT_CATALOG.md + e2e/file-smoke；W8 只写 NEXT/ 新文档；W9 只写 evidence/DECISIONS/V1_FACES/FaultLab.html（构建产物）——**互不相交**。

**并发度说明（不要和已有进程冲突）**：设计为并发派发；2026-11-10 主机实测子智能体并发额度=1（四路并发触发 user concurrency limit exceeded，改串行后全数完成）——额度受限时按依赖序排队串行（阶段一 → W4/W5 → W6/W7 → W8/W9），文件面互斥保证零合并冲突、零进程冲突；每路完成即落盘，不做内存合并。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 33→35 步（两新步 core）；总耗时 +约 2–3 s（数值步量级） |
| verify_golden | MODELS 6→7 注册；DEFAULT_MODELS 不变；既有六模型校验路径逐字节不变 |
| e2e/file-smoke | 57/61 → 随 MG 页面扩展至 N（机检面同步扩展） |
| FaultLab.html | 1540.4 KiB → 随 MG SystemDef/UI/六系统文案增长（build.py repack） |
| scenario.test.js | 389 → +MG t_clear 守卫/island_event roundtrip 断言 |
| copy-guard | 词表 33→N 只增；PASS 行计数同步 |
| V1_FACES | 面① 画像五→六系统、面② golden 8→9、面⑦ 33→35、§7 清账——全部 additive 修订随 CHG-20261110-02 |
| FAULT_CATALOG | v1.4→v1.5（§8 MG-001 节，四族 extension_preview） |
| 哈希面 | 既有合法输入五个哈希输出零变化（DEC-8①，机检 = scenario.test roundtrip 既有断言零失败） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | MG oracle 跨 oracle import 审计复杂度（A-4 条件） | MS-3 逐位审计 + 复用交叉 E_pv/E_wt 与源 golden 逐位一致（96/96 已预复算）；不 import src/** |
| 2 | t_clear_s 守卫扩展回归（scenario.js:319 现仅 GT-001×actuator_fault） | 显式白名单扩展 + scenario.test 负例 + 双事件快照三面核查（MG-IMP-Q2） |
| 3 | island_event 双事件快照与 V-07 W2-1 双 null 相位规则冲突 | W2-1 规则已机检（verify_golden :373-381）；MG emit 前先过 MS 自检，失败 exit 2 不写盘 |
| 4 | 步数账超支 | DEC-5 显式申报 ≤35（新系统先例 +2 用足，V080 DEC-6 口径） |
| 5 | 六系统 UI 文案触碰 BANNED 词 | copy-guard 随改随跑；新教学面词表增补 = additive 先例（ALINE §2 九步之⑧） |
| 6 | FC 草案 classify 二选一未决阻塞批准轮 | 二选一列为草案核心裁定点（A5 §4.2），批准轮必答；本波草案轮不受阻 |
| 7 | 主机并发额度限制 | §2 并发度说明：文件面互斥 + 依赖序串行排队，零冲突 |
| 8 | push 批次累积 | 用户裁定五批同批挂起延续，本波并入同批，不新增远端动作 |

**文件结束**。V110_WAVE_DESIGN v1（2026-11-10，CHG-20261110-01 批准，按推荐执行）。
