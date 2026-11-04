# G8 发布证据 — v0.7.1（A-4a GT-L1 落地：gt001_v3 + 三轨 + T-B 容差制度）

> **发布**：v0.7.1（CHG-20261104-13）｜ **授权链**：CHG-20261104-12（GTL1-G2b-02 闭合，
> Q1…Q5 定案 + 七条件修订授权 + GTL1-G2b-01/03/04 波授权）→ 用户 2026-11-05「按照2执行」。
> **执行方式**：动态工作流 dwfrun-20a5779d（五阶段 7 路），基线 5ebf768。

## 1. 交付物

| 工作项 | 交付 |
|---|---|
| T1 GTL1-G2b-01 | `GTL1_G2B_SPEC_APPROVED.md` v1.0（更名自 DRAFT v0.2）：A-1 方案 a（§2.1 常量 15 位精确登记 k_f=4.070531454334211/ṁ_a=0.144299140389011/C_3=0.335983796442745，修订人独立复算残差 5.7e-14 kW 与评审 4.3e-14 同量级并存登记）、A-3 §3.2 逐行口径列、A-2/B-4 有效性域声明+emit 硬条件、B-1 八热力信号 sourceKind/exposure 列+盲包不扩裁定、B-2 scenario 键定案+§2.4 勘正、B-3 Q3 冻结归档债+D2 §5.2 处置声明、Q1…Q5 定案落正文；§10/§11/§11-a 保留 v0.2 历史 |
| T2 GTL1-G2b-03 | `tools/oracle/gt001_l1_oracle.py`（纯 stdlib、出生即 oracle_base、RK4 y=[f,T3] h=0.01 冻结更新序、EQ-GTL1-1…12 全量、GL-1…GL-8 全过：设计点 P_gen=25±1e-9 内/残差 4.263e-14 kW/18 锚点/半步长 1.082e-06 Hz）；**gt001_v3 golden 6 Run 首签**（全 inertia_model=thermo：healthy/sensor 闭环/monitor/load_step/actuator/actuator_clear t_clear=35；schema v2 全量：model_version 1.2.0、method gt001_l1_rk4_dt0.01、supersedes=gt001_v2、units+T:K/p:kPa、gate T-B 终值按双实现散差×≥10 冻结：f 逐位 0/T ≤2.27e-13 K/P ≤4.26e-14 kW/p ≤1.14e-13 kPa——真实引擎交叉 27 列+指标逐位 series-exact）；**域扫描冻结（A-2/B-4 硬条件闭合）**：sensor mag∈[0.05..1.0] 全域，mag=1.0 角点 max\|Δf\|=0.997996 < 1.0 未越界（§3.3.1 + GL-8 内嵌断言）；`verify_golden.py` MODELS["gt001"] 重指向 gt001_v3 + **T-B tier 参数化分派**（T-A 默认路径零改动，fl001/fc001/pv001 回归 exit 0）；`ORACLE_INTERFACE_D2.md` §5.2 触发处置（B-3）+ `V06_ROADMAP.md` D-GT 行重定性；`FAULT_CATALOG.md` GT-001 节更新（三轨/supersedes 链） |
| T3 GTL1-G2b-04 | `engine.js` simulateGT001Thermo（RK4 冻结分区更新序：指令先算/子步内生效/子步末提交）+ GT 分支内**显式三分派（R-8 守卫）**+ 三枚举 + **thermo 默认翻转（Q4）**；`systems.js` model_version **1.2.0** + EQ-GTL1-1…12 + A-gtl1-* 八条 + L1 limitations + level 'L1 · 热力学耦合频率响应演示（G2b 已批准）' + 八信号（B-1 非盲显）+ P_gen_cap 指令域口径（Q5）+ UNITS temperature/pressure；`schema.js` UNIT_DICT K/kPa + scenario_config 三枚举；`scenario.js` 事件级可选 inertia_model 键（B-2：缺省解析系统默认、scenarioHash 含解析轨、未知值结构化拒绝）+ §139 文案补 PV-001；`metrics.js` thermo 门控标量（E_fuel_kWh/eta_cycle_end_pct——能量口径，与 golden 逐名一致）；`checks.js` sampling 可选轨规则 + gt-energy-consistency thermo 分支（EQ-GTL1-12，容差 1e-3 kWh=实测上界 8.256e-5×12）；tests/core.test.js GT 默认段 2 断言随 Q4 更新 |
| T4 三轨守卫 | `tests/engine-gt.test.js` **203→451 断言**：linear→v1/swing→v2 既有比对逐位保留 + thermo→v3 全序列 T-B 逐点（含 t 列映射 run.timeseries.t）+ 25 scalars + 事件 ±n_rpm_atol + **mag=1.0 角点暂态断言**（f_min=49.002004/max\|Δf\|=0.997996）+ **L0b↔L1 分歧断言**（§3.2 八行 v1.0 口径：稳态跨深度同/暂态路径分歧/增益 1.3321±0.005 vs 1.0/monitor f≡50∧T3≡1173 逐位）+ 钉轨回归（未钉轨→thermo Q4 守卫；钉 swing/linear 断言原值 P_gen 恰 20.000）+ **B-1 盲面源级+运行时守卫**；`scenario.test.js` 285→321（inertia_model 三值/缺省/拒绝/哈希含轨）；`schema.test.js` 152→213（K/kPa/thermal 类 8 项） |
| T5/门禁 | run-g2 **28 步不变**（verify_golden gt001 重指向 v3；engine-gt 并入三轨），I-7 预算 ≤29 兑现；步 ① 标签更新（GTL1-G2b-03 / gt001_v3 T-B） |

## 2. 验证

- `node tools/run-g2.mjs` **28/28 PASS** 两次独立（工作流内 + 主流程复验 34059 ms）；
- `verify_golden.py`：gt001→**gt001_v3**（V-01…V-09 全过，tier=T-B，V-03 oracle_source d5563691…、V-03b digest 2c0ba901…）；fl001/fc001/pv001 各 exit 0（**既有 5 golden 字节零变更**：gt001_v1/v2/fl001_v1/fc001_v1/pv001_v1，sidecar 复核 match）；
- 引擎↔gt001_v3 冻结 golden：全 6 Run 27 列+指标**逐位 series-exact**（T2 交叉）与散差 5.684e-13（T3 交叉）双证；钉轨 swing/linear 对 v2/v1 **max\|Δ\|=0（遗留轨零漂移）**；
- 21 个测试文件全过（core 11147/engine-gt 451/engine 339/engine-fc 294/engine-pv 149/scenario 321/schema 213/teaching 161/leaderboard 78 等）；copy-guard 0 命中；oracle --self-check exit 0（纯 ASCII）。

## 3. 覆盖口径与登记事项（诚实口径）

1. **MODELS 形态偏离（登记）**：ask 指定 MODELS["gt001"] 重指向（已照办）；规格 §4 项 7 原文「新增 MODELS["gt001_l1"]、v2 条目不动」——实际形态与意图等价（参数化与注册同轮、旧 golden 治理面不重出），等价性登记于 ORACLE_INTERFACE_D2 §5.2；gt001_v2 直验面让位于 engine-gt 双 golden 比对面 + oracle_base 契约探针；
2. **gate 形制补键**（PV001 C-3 先例）：n_rpm_atol=1e-2（=60×f_Hz_atol）、p_kPa_atol=1e-9（实测 1.14e-13×1e3 余量）——verify_golden 参数化硬编码消费所需；
3. **GL-2/GL-6 判据按实测上界冻结**：GL-2 ≤0.2 kJ（实测 1.4884e-01 含阶跃子步贡献）、GL-6 ≤5e-3 Hz（实测 4.950e-04）；
4. **eta_cycle 双口径分列**：序列 eta_cycle_pct=瞬时 P_gen/Q_f、标量 eta_cycle_end_pct=能量 E_gen/E_fuel（§1.2 备注/§3.1 口径，oracle 与引擎已对账一致）；
5. **v2 冻结事实不复制**：gt001_v2 EV-002 快照 event_id 父引用笔误（=EV-001，gt001_oracle.py:315）——v3 使用正确引用，无消费方比对；
6. **A-1 复算双值并存**：修订人复算残差 5.7e-14 kW vs 评审 4.3e-14 kW（1e-14 求和路径噪声），§2.1 精度登记注并存登记；
7. load+20 角点 t=60 采样与渐近稳态差 ~5e-4 Hz/0.01 kW（未收敛口径差，A-3 口径标注覆盖，终值以 oracle 冻结为准）；
8. **未实施留待**：TESPy 对照独立算例（旁证非门禁）、causalTemplates thermo 扩展、UI 跨深度对比卡（v0.7.x 清算清单）。

## 4. 预期失效面

gt001_v3 新增（supersedes 链 v3→v2→v1）；gt001_v1/v2 字节冻结留档、归档场次继续引用；
**thermo 默认翻转（Q4）**：未钉轨的 GT 新 Run 走 thermo（defaultConfig 翻转；tests/core.test.js
GT 默认段同步）；**既有场景哈希变化**（scenarioHash 含解析轨，B-2 登记预期）；历史 GT 盲包
fail V-05 属预期（GT §10 先例）；盲包观测面不扩（B-1）；三系统与 PV 物理面零触碰
（149/339/294 全绿佐证）。

**发布门**：G7（run-g2 28/28）✅ → G8（本证据）✅。批准人：用户（CHG-20261104-12 授权链）；记录人：实现 Agent。
