# V080_WAVE_DESIGN — v0.8.0 实现波设计（A-4b/B-2 批准与实现轮 + 残留三项）

> **性质**：阶段设计文档（Lead 起草，2026-11-07）——V06_ROADMAP 框架内 v0.8.0 波：
> ① A-4b FL-001 热模型 G2b 批准轮（FLTH-G2b-02 收口）与实现轮（FLTH-G2b-03/04）；
> ② B-2 WT-001 风电 G2b 批准轮（WT-G2b-02 收口）与实现轮（WT-G2b-03/04）；
> ③ v0.7.2 新增残留三项处置。
> **授权记录（CHG-20261107-01）**：用户 2026-11-07 指令「按照计划方案，统一采用推荐决策，
> 采用并发多个子智能体来加速任务」——**DEC-1…8 全采推荐项**；A-4b/B-2 批准经本指令链
> 登记（GTL1-G2b-02 先例：用户指令链即书面批准记录），随 CHG-20261107-01 生效。
> **推送状态**：用户裁定暂缓延续——v0.7.1（4963e6a + tag）与 v0.7.2（1331ed3）留本地，
> 本波基线同样只提交不推送（三者将来同批）。
> **输入**：V072_WAVE_DESIGN DEC-2/DEC-4/DEC-5 ｜ v072-release.md §3 批准轮修订清单
> （A-4b 七项 / B-2 七项）｜ FL001_THERMAL_G2B_SPEC_DRAFT v0.1（双评审 A:4+B:3 条件）｜
> WT001_G2B_SPEC_DRAFT v0.1（双评审 A:3+B:4 条件）｜ GTL1/PV001 APPROVED v1.0（先例）｜
> V06_ROADMAP §2/§3 ｜ I-7/DEC-E 步数账纪律。

---

## 0. 本波边界

- **既有 6 golden 字节冻结**（gt001_v1/v2/v3、fl001_v1、fc001_v1、pv001_v1 + sidecar）；
  新增 **fl001_v2**（4 Run，T-B）与 **wt001_v1**（5 Run，T-A）两份新 golden（新 id 出生
  即冻结，oracle 只读生成、engine 只读比对）；
- **既有 oracle 零触碰**：fl001/fc001/gt001/pv001 四 oracle 物理文件不动（V-03）；
  新增 fl001_l1_oracle.py 与 wt001_oracle.py（出生即 oracle_base 接入）；
- **engine.js 改动面**：FL thermal early-return 分支（off 路径逐字不动）+ simulateWT001
  新轨 + 分派链显式 WT 分支（else GT001 兜底前插入）——既有三系统物理面零变化
  （baseline 逐位探针验收）；
- **不做**：A-5 多物理场探路 / B-3 MG-001 / C-5 场景共享 / D-5 插件评估（V06_ROADMAP §3
  v0.8.0 行由 A-4b/B-2 实现占位，原行顺延 v0.9 显式登记）、D-3 FMU（等样本）、
  thermo_track 运行期自动分派（残留③，登记不顺延）、任何推送（DEC-8）。

## 1. 决策点（已按用户指令全采推荐项）

### DEC-1：A-4b 批准 = 七项修订全按推荐处置 + FLTH-DRAFT-Q1…Q4 全推荐（→ APPROVED v1.0）

v072-release.md §3 A-4b 清单逐项落正文：A-1 §3.4 两角点 P_gen 修正（load0=45→**21.769954**、
load0=10→**20.139754**）/ A-2 FL-7 判据改「双实现散差 ×≥10 或 ≥1e-9 K」冻结制（不冻结
预填 5.68e-14）/ A-3 涟漪表补 metrics.js 指标定义串 on 域变体 + acceptance.keyValues off
域专用声明 / A-4 四项 P3 勘正（损耗偏差 W 值、稳定性边界 48.2843 kW、worst diff 措辞、
verify_golden T-B 单位分支）/ B-1 model_version 1.1.0 归一涟漪面（scope.js APPROVED
.modelVersion 同步 + 旧存档重放拒绝预期 + 引用失效面入 FLTH-G2b-04）/ B-2 FLTH-G2b-04
两门禁面（engine↔fl001_v2 T-B 比对面 + cfg.thermal_model→golden 分派 off→v1/on→v2，v2
emit 通过前 on 轨不进 P0 验收）/ B-3 verify_golden T-B 分支 r_true_kW 路由裁定。
Q1 守恒面 **(a) 进母线平衡**、Q2 **I 冻结子步起点**、Q3 **r_meas 同轮扩展**、Q4 **E_loss
子步梯形**——全推荐，已入正文为准。规格更名 `FL001_THERMAL_G2B_SPEC_APPROVED.md` v1.0，
§10 评审记录回填（A:PASS_WITH_CONDITIONS 4 / B:PASS_WITH_CONDITIONS 3 + 处置表，PV001
§11 体例），批准引 CHG-20261107-01。

### DEC-2：A-4b 实现入本波（FLTH-G2b-03/04）

fl001_l1_oracle.py（RK4 dt0.01、FL-1…8 自检、oracle_base 出生接入）+ fl001_v2 emit（4 Run
镜像 fl001_v1 全集、thermal_model=on、schema v2、T-B 容差按双实现散差 ×≥10 冻结）+
verify_golden `MODELS["fl001_l1"]` 注册 + T-B `_A` 分支 + 默认 fl001 步①旁增 fl001_l1
校验（并入现有步）+ engine simulateFL001Thermal（§2.3 冻结序）+ systems.js thermal 面
（2 信号/A-flth-* 6 条/limitations/EQ/defaults.thermal_model='off'/normalizeConfig 盖章/
level·summary 变体/model_version 1.1.0）+ scenario EVENT_KEYS `thermal_model`（显式 CHG
随本 CHG）+ checks.js energy-balance thermal 分支（EQ-FLTH-9）+ UI 跨深度卡/因果模板变体 +
off 轨 run_hash 逐位不变验收。

### DEC-3：B-2 批准 = 七项修订全按推荐处置 + WT-DRAFT-Q1…Q3 全推荐（→ APPROVED v1.0）

v072-release.md §3 B-2 清单逐项落正文：A-1 β(20.0) 口径采推荐——**§3.2 场景 B 行改
β(20.0)=0.0（状态 pre）+ beta_stuck_deg(20.0)=16.5（事件域信号，I_cap 先例）** / A-2 λ_opt
依赖项 15 位登记重划（改登记可达精度；五项独立常量保留 15 位）/ A-3 §3.5 包络按 UI 全域
重述（v0 ∈ [6,10] × 故障域，v0=6+stuck85% 角点越原所列界处以重述为准，稳定性裕度结论
不变）/ B-1 「非本机组实测」禁词命中改写 ALLOW 句式（§6.3 自查表更正）/ B-2 **d_wt_atol
死键删除**（verify_golden 无对应分派分支；d_wt 走 `_kW` 支路）/ B-3 exposure 三值映射
工作面（WT-G2b-04，PV001 C-6 体例：MODEL_STATE/CONTROLLER/FAULT_EVENT 落点核对表）+
批准 CHG 更正行号引用 / B-4 批准 CHG §7① 字面触发项闭合登记。
Q1 **保护钳位 + 估计通道**（v³ 目标律复算证伪维持）、Q2 **pitch_stuck 位置强制**、
Q3 **L0b · 机械动态行为级演示**——全推荐。规格更名 `WT001_G2B_SPEC_APPROVED.md` v1.0，
§10 评审记录回填（A:PASS_WITH_CONDITIONS 3 / B:PASS_WITH_CONDITIONS 4 + 处置表），批准引
CHG-20261107-01。

### DEC-4：B-2 实现入本波（WT-G2b-03/04）

wt001_oracle.py（WS-1…8 自检、**WS-8 pitch_stuck 域扫描 emit 硬条件**、oracle_base 出生
接入）+ wt001_v1 emit（5 Run、schema v2、T-A、approval 首签引 CHG-20261107-01）+
verify_golden `MODELS["wt001"]` 注册行 + UNIT_DICT/UNITS 增 m/s、°（纯增项）+
FAULT_CATALOG 增 WT-001 节 + systems.js WT001 SystemDef（22 信号/A-wt-* 11 条/
limitations 10 项/EQ-WT-1…9/initial v0_ms）+ engine simulateWT001（§1.3-b 冻结序）+
checks.js WT 分支（能量恒等 PHY 检查；SOC/energy-balance 不派发）+ causal 模板三件 +
UI 接线（home 五系统/compare/scenario/teaching）+ tests/engine-wt.test.js +
**ARENA_EXCLUDED 增 'WT-001'**（arena.js:96）+ scope 零改动核对 + normalizeConfig 钳位
裁定（WT-IMP-Q1：engine 侧 ω ≥ 0.5·ω_opt 有效性域守卫，二选一记录）。

### DEC-5：v0.7.2 新增残留三项处置

| # | 项 | 本波处置 |
|---|---|---|
| 1 | faulted PV Run bias_A 分域缺陷（schema.js:161-163 \|b\|≤20 A 误用于 PV W/m² 幅值域） | **修复**（bias_A 检查按系统分域：FL 电流域 / PV 不适用该键或按 G0_W_m2 域——随本 CHG 显式登记，负例面同步） |
| 2 | docs/CONTRACT.md §4.8 quality「必含」措辞与 bounds 派生实现口径差 | **修复**（文档面订正） |
| 3 | thermo_track 运行期自动分派（engine.buildCausal 按 family 分派） | **登记不顺延**（v0.9 清算；本波零 engine 因果面改动） |

### DEC-6：步数账（I-7）28 → 30，预算 ≤29 → ≤31

- **FL 侧零新增步**：verify_golden 默认步①旁增 fl001_l1 校验（同一 python 调用内双 golden
  顺序验证——FLTH §7.3「优先并入现有步」口径）；engine/plants thermal 变体并入既有步；
- **WT 侧 +2 步**：第 29 步 `verify_golden.py wt001`、第 30 步 `tests/engine-wt.test.js`
  （PV-001 先例：verify 步 + engine 步各一；双轨单波同落，+1 上限不够用——**预算申报
  ≤29→≤31 显式 CHG 登记**，理由：A-4b 并入口径已用足、B-2 新系统 5 Run golden + 引擎轨
  无法并入既有步）；
- --tier 标签：两新步均 core。

### DEC-7：版本节奏

v0.8.0（本波单发：A-4b + B-2 批准与实现 + 残留①②）→ v0.9.0（A-5 探路 + B-3/C-5/D-5
评估 + 残留③清算）→ v1.0.0 收敛（V06_ROADMAP §3 v0.8.0 原行内容由本波占位，顺延登记）。

### DEC-8：push 状态

用户裁定暂缓延续——v0.7.1 + v0.7.2 + v0.8.0 三批将来同批推送（用户指令触发；推送前
ls-remote 全量对账，faultlab-repo 教训）。

## 2. 波次派发（并发子智能体，五阶段）

```text
阶段一（并行 2）：F1 A-4b 批准轮修订（→ APPROVED v1.0）｜W1 B-2 批准轮修订（→ APPROVED v1.0）
阶段二a（并行 7，文件面互斥）：
  L1 FL oracle：tools/oracle/fl001_l1_oracle.py + data/golden/fl001_v2.json(+sha)
  L2 WT oracle：tools/oracle/wt001_oracle.py + data/golden/wt001_v1.json(+sha)
  L3 engine.js：FL thermal 分支 + simulateWT001 + 分派链 WT 分支
  L4 systems.js：FL thermal 面 + WT001 SystemDef 全量
  L5 checks.js + scenario.js + metrics.js + scope.js（FL on 域分支/thermal_model 键/指标变体/版本同步）
  L6 schema.js：UNIT_DICT m/s·° + initial v0_ms 导出面 + bias_A 分域修复（残留①）
  L7 UI：home/compare/scenario 页/teaching/causal/arena ARENA_EXCLUDED + e2e 断言扩展
阶段二b（1）：L8 verify_golden（fl001_l1/wt001 注册 + T-B _A 分支 + r_true 路由 + 步①双 golden）
            + FAULT_CATALOG（thermal 注记 + WT-001 节）+ CONTRACT §4.8（残留②）
阶段三（2）：L9 tests（engine.test thermal 变体/plants/engine-wt 新建/scenario/schema/registry/
            core-load）+ run-g2.mjs（+2 步 + 预算注释）｜L10 build.py 重打包 + file:// 冒烟
阶段四：全量门禁 run-g2（30 步）+ e2e 48+ + copy-guard + ≤3 修复环（Lead 收口）
阶段五：v080-release.md + DECISIONS CHG-20261107-02 + git 提交（不推送）
```

**冲突控制**：verify_golden.py 仅 L8 触碰（L1/L2 的注册需求以交接注记交付）；engine.js
仅 L3、systems.js 仅 L4、schema.js 仅 L6、UI 五文件仅 L7；FAULT_CATALOG/CONTRACT 仅 L8；
run-g2.mjs 仅 L9；tools/build.py 产物仅 L10。L1/L2 不触 scripts/**、不触 src/**。

## 3. 预期失效面

- 新增 golden 2 份 + sidecar；**既有 6 golden 字节零变更**；既有 4 oracle 零触碰；
- **FL off 轨 run_hash 与 14 既有序列列逐位不变**（thermal 信号列 off 轨全程 null——GT 先例）；
  tests/registry.test.js per-Run config 哈希面随 scenario thermal_model 键与 WT initial 键更新
  （预期失效，逐项登记）；
- **新建 PV Run config_hash/run_hash 变化不发生**（本波 schema 导出面 v0_ms 为 WT 专属新增、
  PV 键面零变化；bias_A 分域修复只放开 faulted PV 校验、不改任何哈希输入）；
- systems.js FL model_version 'fl001.1'→'1.1.0' 涟漪面（scope.js 同步 + scope-guard 测试
  适配——B-1 登记项）；信号目录/manifest model_hash 面（FL +2 信号、WT +22 信号）；
- home 徽章/系统卡/教学路径文案变化；FaultLab.html 字节变化（构建产物）；
- FL/FC/GT/PV 既有行为 baseline 逐位等价探针验收；Arena 盲包语义零变化（FL 默认 off、
  WT 显式排除）。

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | FL thermal RK4 双实现（JS/Python）散差超 T-B 预案 | 容差按实测散差 ×≥10 冻结（A-2 修订制）；超限降 T-C + convergence 块 |
| 2 | WT T-A 同序复刻遇 JS/Python 浮点位差（min() 平局面 1–2 ulp 已登记） | 同更新序逐算子复刻 + gate 键面留 P_kW_atol 1e-15 路径；超限降 T-B 预案 |
| 3 | L3/L4 双系统同文件大改互相等待 | engine.js/systems.js 各单路独占；两轨分支结构独立（FL early-return vs WT 新函数），无交叠段 |
| 4 | model_version 归一涟漪（scope/scope-guard/bundle） | B-1 处置表逐面清单；scope-guard 测试适配归 L9 |
| 5 | verify_golden 注册行漏改（R-6 先例） | L8 单路独占 + L1/L2 交接注记 + run-g2 步①/②⑨ 兜底 |
| 6 | 步数账超支 | DEC-6 显式 CHG 申报 ≤31；两新步 core 层 |
| 7 | oracle emit approval 三字段为空拒绝落盘 | 首签引 CHG-20261107-01（批准链已闭合）；emit 前核对 oracle_base 字段名 |
| 8 | 修复环超 3 次 | 文件面互斥 + 每路自带回归；阶段四 Lead 收口兜底 |

**文件结束**。V080_WAVE_DESIGN v1（2026-11-07，CHG-20261107-01 批准，按推荐执行）。
