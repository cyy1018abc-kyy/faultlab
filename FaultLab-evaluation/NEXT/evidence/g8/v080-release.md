# G8 发布证据 — v0.8.0（A-4b/B-2 批准与实现轮 + 残留①②）

> **发布**：v0.8.0（CHG-20261107-02）｜ **授权链**：用户 2026-11-07「按照计划方案，统一采用
> 推荐决策，采用并发多个子智能体来加速任务」= CHG-20261107-01（A-4b/B-2 书面批准 +
> V080_WAVE_DESIGN v1 生效，DEC-1…8 全采推荐）→ 本 CHG。
> **执行方式**：批准轮 2 路（前台子代理）+ 动态工作流 **dwfrun-e1799f2f**（八阶段 12 子代理、
> 27 步 settle；执行中配额中断一次，恢复后零损失续跑）。基线 1331ed3（v0.7.2）。
> **推送状态**：用户裁定暂缓延续——v0.7.1 + v0.7.2 + v0.8.0 三批将来同批推送。

## 1. 交付物

### 1.1 批准轮（规格升格）

| 项 | 交付 |
|---|---|
| A-4b | `FL001_THERMAL_G2B_SPEC_APPROVED.md` v1.0（547→626 行）：v0.7.2 双评审 4+3 条件全落正文（A-1 两角点 P_gen 修正 21.769954/20.139754 复算确认、A-2 FL-7 改双实现散差×≥10 或 ≥1e-9 K 冻结制、A-3 涟漪表 metrics 定义串 on 变体 + keyValues off 专用声明、A-4 四项勘正含稳定性边界 **48.2843 kW**（I_ref=(P_load−20)/0.4 实读核实）、B-1 model_version 1.1.0 归一（classify 不消费 modelVersion 实证→「不校验仅登记」）、B-2 两门禁面、B-3 三分派显式规则）；Q1…Q4 定案（守恒面 (a)/I 冻结/r_meas 同轮/梯形）；§10 评审回填 + §11-a 处置表 |
| B-2 | `WT001_G2B_SPEC_APPROVED.md` v1.0（576→666 行）：双评审 3+4 条件全落正文（A-1 β(20.0)=0.0 状态 pre + beta_stuck_deg(20.0)=16.5 事件域、A-2 λ_opt/Cp_max 改「数值最大化可达精度登记」+七项闭式可复算标注、A-3 §3.5 全域包络复算（临时脚本 `python -I` 已删：8 角点，P_wt [0.370,15.0] kW、n [67.17,242.58] rpm、λ_eq 裕度 **11.5%** 维持）、B-1 「非本机组实测」→「非实测、非设备辨识」（裸「实测」禁词实锤）、B-2 d_wt_atol 死键删除、B-3 exposure 三值映射工作面 + 行号订正、B-4 §7① 闭合）；Q1…Q3 定案 |
| 批准轮实证 | **verify_golden T-B 分支 `"r_true" in sid` 被 `_kW` 前置判别遮蔽成死支**（gt001_v3 r_true 实际走 P_kW_atol）+ **fl001_v2 gate 无 f_Hz_atol 键 → T-B 缺省 KeyError**——两项均登记进 APPROVED 规格 §4 并由 L8 清偿 |

### 1.2 A-4b FL 热模型实现（FLTH-G2b-03/04）

- **fl001_l1_oracle.py**（新建，stdlib，出生即 oracle_base 接入）：分区 RK4 h=0.01/6000 子步/601 点，
  §2.3 冻结更新序逐条（电气面 L0 序逐字、T_bat RK4 RHS 内 I 冻结子步起点 Q2、E_loss 子步梯形 Q4、
  record P_loss 当前状态重算）；自检 FL-1…8 全过（FL-7 按 A-2 修订口径）；emit **fl001_v2**（930,796 B
  + sidecar）：4 Run 镜像 fl001_v1 全集、schema v2、T-B gate、approval 首签引 CHG-20261107-01；
  §3 预填锚点 39/39 + 2 角点复现（worst 偏差 4.476e-07，舍入噪声级）。
- **engine.js**（+381/−5）：`simulateFL001` 顶部 early-return → `simulateFL001Thermal`（:602/:705），
  off 路径逐字不动；validate/stamp `thermal_model` 盖章；`integrals.E_loss` 新键（EQ-FLTH-8）。
- **systems.js**：T_bat_K/P_loss_kW 双信号（全非盲显）+ thermal 类目 + A-flth-* 6 条 + limitations
  热面 8 项 + EQ-FLTH-1…9 + defaults.thermal_model='off' + normalizeConfig 盖章 +
  **model_version 'fl001.1'→'1.1.0'** + levelFor/summaryFor cfg 派生 + acceptance.keyValues off 专用
  声明 + 因果模板 fl-thermal-compensation。
- **scenario.js** EVENT_KEYS 增 `thermal_model`（枚举/缺省默认轨/入 scenarioHash/execute 传 cfg）；
  **checks.js** energy-balance thermal on 分支（EQ-FLTH-9）；**metrics.js** 定义串 cfg 感知
  （:191/:230 两处）+ E_loss_kWh/T_bat_end_K 新指标。
- 验证：engine.test.js 343→**428**（+85 全绿；含 off 轨 null 列/分派守卫/fl001_v1 零回归）；
  L9a 实测引擎↔oracle T_bat 散差 max=0.00e+0（T_K_atol 1e-2 裕度远超 ×10）。

### 1.3 B-2 WT-001 实现（WT-G2b-03/04）

- **wt001_oracle.py**（新建，出生即 oracle_base）：§1.3-b 冻结序逐算子；15 位常量硬编码
  （**重求导必要性实证**：运行内重算 ω_opt 与登记值差 4 ulp——A-2 精度注记的实锤）；WS-1…8 全过
  （WS-6 锚点 64/64、WS-7 gust 两模式 23 列位级 0 差、WS-8 域扫描 + UI 全域 8 角点）；emit
  **wt001_v1**（1,461,288 B + sidecar）：5 Run、schema v2、T-A 八键 gate（无 d_wt_atol）、
  units 增 wind:m/s 与 angle:°、approval 首签引 CHG-20261107-01。
- **engine.js** `simulateWT001`（:1417，§1.3-b 冻结序）+ 分派链显式 WT 分支于 else GT001 兜底前
  （:2139，R-4/R-7 守卫）+ gust_step 家族白名单 + v0_ms 域校验 + **ω 有效性域守卫**
  （WT-IMP-Q1 裁定：engine 侧钳位 0.5·ω_opt(v0)，注册域内 no-op，登记于代码注释）。
- **systems.js** WT-001 SystemDef 全量（:1129-1465）：22 信号（blind 10 显式/public 12 默认映射）、
  7 组件/9 边（rotor→converter_power/speed 去重、无 load→converter 边）、3 族
  （v_sensor_bias/pitch_stuck/gust_step）、A-wt-* 11 条、limitations 10 项、EQ-WT-1…9、
  model wt.aero.l0b/1.0.0、causalTemplates 三件；**arena.js ARENA_EXCLUDED 增 'WT-001'**。
- **schema.js**：UNIT_DICT 增 m/s、°、**'-'（无量纲）**；v0_ms 导出面（R-8 键面逐键硬编码发现→
  照 G0_W_m2 先例补 scenarioView.initial_v0_ms 投影 + bounds 驱动域分支，FL/FC/GT/PV 零涟漪
  探针实证）；**残留① bias_A 分域修复**（hasCurrentDomainBiasSignal 按信号目录分派
  schema.js:163-176，PV/GT/WT 豁免，faulted PV 不再 CN-E02）。
- **checks.js** wt-energy-identity PHY 检查（E_wt+E_grid=E_load，1e-9 kWh）；soc-bounds/energy-balance
  对 WT 不派发（PV 同款口径）。**UI**：home 五系统卡 + compare/scenario/teaching（WT 路径×2 +
  FL 跨深度路径×1）+ causal WT 键 + e2e +9 断言。
- 验证：engine-wt.test.js **新建 228 断言**（5 Run 引擎↔golden、gust 两模式逐位等价、R-7 分派守卫、
  β 事件域行口径）；schema 309、scenario 359（负例 62 类）、registry 60 全绿。

### 1.4 golden 注册面与治理文档（L8）

- verify_golden.py：`MODELS["fl001_l1"]`（scalars 按 fl001_v2 实际键面 **22 项全量**）+
  `MODELS["wt001"]`（五能量键）；**T-B 三分支修正**——`_A` 分支（置于 `_Hz` 前）+ r_true/r_meas
  判别前置于 `_kW` 解除死支（**gt001_v3 六 Run r_true 散差实测 0.0 后统一前移**，六个显式 verify
  全绿佐证零回归）；默认无参运行扩为 fl001_v1+fl001_l1 双 golden（DEC-6 步①并入口径）。
- FAULT_CATALOG v1.4（FL thermal 注记行 + §7 WT-001 节含新族 gust_step）；CONTRACT §4.8
  quality「必含」订正为 bounds 派生口径（残留②）；MODEL_VALIDATION_SPEC/DATA_CONTRACT_SPEC
  fl001.1 失效面清偿（**当前 1.1.0 + v1 冻结记录值 fl001.1 双版并存留档**——L8 处置①②）。

### 1.5 构建与冒烟（L10）

- **FaultLab.html 重打包 1527.5 KiB**（css=10/js=33、43 引用全内联、零外链探针复核）；
  file:// 冒烟 **61 断言 ×3 轮独立 Chrome profile 全过**（按 e2e E-01..E-13 共 57 条 + WT 扩展
  镜像重建；v0.7.2 冒烟脚本系临时件已删不可恢复，本轮重建覆盖面等价并留 18 次主框架导航
  fileResourceRequests 佐证）。

## 2. 验证

- `node tools/run-g2.mjs` **30/30 PASS 两次独立**（工作流内 1 轮修复后 + Lead 复验 38096 ms；
  core 24 + extended 6；第 29 步 verify_golden wt001、第 30 步 engine-wt.test.js）；
- e2e **57/57**（v0.7.2 的 48 + 本波 9）、copy-guard 0 命中、perf 门禁过；
- **golden：既有 6 份字节冻结零变更**（git status 复核）+ 新增 fl001_v2/wt001_v1 两份（新 id 出生
  即冻结）；既有 4 oracle 零触碰；FL off 轨 fl001_v1 比对零回归（engine.test.js 既有断言全数保持）；
- 测试面全绿：engine 428/engine-wt 228/engine-gt 451/engine-pv 166/engine-fc 294/plants 83/
  core 11345+/schema 309/scenario 359/registry 60/teaching 161+/teaching-page 适配/causal-rules 等。
- **门禁修复环 1 轮**：checks.js sampling 检查把 off 轨 thermal null 列计为非法数值（9 红）→
  nullOptional 口径扩展（FL thermal off 轨全程 null 声明入检查文案，checks.js:161）→ 全清。

## 3. 预期失效面（已兑现）

scenario 哈希含 thermal_model 解析轨（FL 场景哈希变化）；registry per-Run 哈希面更新
（scenario 键 + WT initial 键）；FL 信号目录 +2/manifest model_hash 面；home 徽章/文案变化；
FaultLab.html 字节变化（1383.4→1527.5 KiB）；schema 负例面 bias_A PV 豁免；新建 PV Run
哈希零变化（v0_ms 为 WT 专属键面，探针实证投影不含该键）；FL/FC/GT/PV 既有行为零变化
（四套既有 golden verify 全绿 + 既有测试断言零改动通过）。

## 4. 新增残留登记（v0.9 清算）

1. **file:// 冒烟脚本未固化**：v0.7.2 与本轮两度以临时脚本执行后按纪律删除，每轮重建（本轮按
   e2e 镜像重建 61 断言）——建议固化入 tools/（显式 CHG）；
2. **CDP 双浏览器深度走查未做**（v0.7.2 体例 50/50）：本轮以 e2e 57 + file:// 冒烟 61×3 覆盖
   主旅程，深度走查留 v0.9 清算；
3. **thermo_track 运行期自动分派**（v0.7.2 残留③，维持顺延）；MODEL_VALIDATION/DATA_CONTRACT
   fl001 双版并存留档（v1 重出时归一）。

## 5. 工作流执行记录

dwfrun-e1799f2f：八阶段、12 子代理、27 步 settle、93.0M tokens、2h26m；配额中断（code 1005）
一次，恢复后从日志续跑零损失；门禁修复环 1 轮（checks.js sampling nullOptional）。
批准轮 F1/W1 两路前台子代理（升格两份 APPROVED v1.0）。

**发布门**：G2b ×2（A-4b/B-2 批准，CHG-20261107-01）✅ → G7（run-g2 30/30 两次独立）✅ →
G8（本证据）✅。批准人：用户（CHG-20261107-01 授权链）；记录人：Lead Agent。
**推送按用户裁定暂缓（与 v0.7.1/v0.7.2 同批）。**
