# FLEXT_G2B_SPEC_APPROVED — FL-001 actuator_fault（变流器电流限幅）G2b 物理规格（已批准）

> **任务**：FL-001 actuator_fault G2b（V05_ROADMAP 主线 A-3 / SCOPE §2 处置表「不追认、冻结」
> 的 G2b 解冻路径）。
> **授权**：用户 2026-11-04 /goal 四步指令第 3 步「A-3 FL-001 actuator G2b」（CHG-20261104-03）。
> **前置**：FL-001 为 P0 垂直切片（approved_p0）；actuator_fault 已在目录/引擎/因果模板中存在
> （未评审冻结，SCOPE §2 B12/B11）；FL-001 load_step 已按 O-13 删除（不在本规格范围）。
> **状态**：`APPROVED`（v1.1，2026-11-04）——双路独立评审 PASS_WITH_CONDITIONS（A 路 4 条件 /
> B 路 5 条件），条件已全部修订进本版（§8 评审记录）；实现仍走 FLEXT-G2b-01/02/04
> （v0.6.0 队列，另行指令派发）。曾用名：`FLEXT_G2B_SPEC_DRAFT.md`（v1，2026-11-04）。
> **Q-4 三守卫适用**：方程集扩展须走 G2b；许可证自研零依赖；验收路径禁入直至 G2b 通过（本批准解除）。
> **记录**：实现 Agent 起草 + Lead 修订 v1.1（2026-11-04）。

---

## 1. FL-001 actuator_fault 机制定案

### 1.1 现有实现（engine.js:549–619 逐行核实，评审人 A 逐行吻合确认）

- `I_ref = (P_load − 20)/0.4`（默认 P_load=30 → 25 A；P_bat 基线 10 kW）；
- **I_cap = I_ref × magnitude/100**（默认 55% → 13.75 A；systems.js:265/235 与 engine.js:564 一致）；
- actuator 轨（t ≥ t_start−1e−9，t=20.0 精确命中子步边界）：target = **min(controlTarget, I_cap)**，
  I_true 以 **τ = 0.4 s** 一阶跟随（engine.js:610–611）——钳位式，无恢复动态、无抗饱和补偿
  （FL 控制器为一阶跟随无积分器，无 windup 概念）；
- 健康轨/传感器轨 τ = 1.5 s——**双轨 τ 显式声明**（同 FCEXT v1.1 §2.1 裁定）；
- I_bat_cap_A 信号自 t_start 起有效（t=20.0 行含）、其余场景 null；**无 t_clear 清除支持**
  （GT 专属，engine.js:1014；FL 配置 t_clear_s 实测被忽略——本规格不新增清除功能）；
- **monitor 等价性（物理面）**：b≡0（engine.js:566 非 sensor 恒 0）⇒ controlTarget 两模式逐位同
  ⇒ series×metrics 数值逐位一致（评审人 A 实机 16 信号×601 点 + metrics + 7 checks + snapshots
  + events 全部相等实证）；不相等面仅元数据：run.label、run.role（'fault'/'contrast'）、
  metric effective_mode（metrics.js:286）——等价断言须排除元数据（§2 项 1）。

### 1.2 方程登记（补全）

| id | 方程 | 说明 |
|---|---|---|
| EQ-A（新增登记） | I_cap = I_ref × magnitude/100，I_ref = (P_load − 20)/0.4；target = min(I_ref − b(t), I_cap)（actuator 轨 b≡0） | 变流器限幅，一般基座（engine.js:561/564/610 现状） |
| EQ-B（修订表述） | τ·dI_true/dt + I_true = target；τ = 1.5 s（healthy/sensor 轨）、**τ = 0.4 s（actuator 轨）** | 双轨 τ（A-l0 同步修订） |

**assumptions 增补/修订（FLEXT-G2b-04，措辞对照 systems.js:281 句式规避禁词）**：
- `A-fl-clamp`：变流器限幅为理想钳位（min 语义），无恢复动态、无保护动作、无 t_clear；
- `A-l0` 文本修订：控制器为行为级一阶闭环（健康/传感器轨 τ = 1.5 s、执行器限幅轨 τ = 0.4 s），
  **不是经过验证的设备控制器**（禁词「已验证」以「经过验证」句式规避——评审人 B F5）。

### 1.3 验收锚点（评审人 A 实机/闭式双证；oracle emit 时冻结）

默认参数（P_load=30 kW、magnitude=55%、t_start=20 s、SOC0=60%）：

| 量 | 锚点（60 s） | 容差 | 依据 |
|---|---|---|---|
| `I_true(60)` | **13.75 A**（= 25 × 0.55；实机 13.750000000000036，rtol 2.6e−15） | ±0.05 A | 一阶稳态解析 |
| `P_bat(60)` | **5.50 kW**（实机 5.500000000000014） | ±0.1 kW | 0.4 × 13.75 |
| `P_gen(60)` | **24.50 kW**（实机 24.499999999999986；仅 load0=30 成立） | ±0.1 kW | 30 − 5.5 |
| `r_true` ≡ 0 | 定义恒等（实机 max 恰为 0） | ≤1e-12 kW | FL 既有口径 |
| `r_meas` ≡ 0 | actuator 无测量偏置（b≡0，实机 max 恰为 0） | ≤1e-12 kW | engine.js:597–598 推论 |
| `SOC_true(60)` | **59.7070833%**（**v1.1 修正**：全窗积分 ∫I dt = 25×20 + 13.75×40 + 11.25×0.4×(1−e^−100) = 1054.5 A·s → E_bat = 0.11716667 kWh；v1 草案 59.8459722% 漏积 [0,20) 段 0.1388889 pp ≈ 139× 容差，评审人 A 实机 59.707083333333294 证实） | ±0.001 pp | oracle emit 冻结 |
| max \|P_bat\| | 10.00 kW（基线；故障后单调下降至 5.5） | 记录值 | 一阶单调性 |
| 闭环 vs monitor | series+metrics 数值逐位一致（**除** run.label/run.role/effective_mode 元数据） | 逐位 | §1.1；断言落点见 §2 项 1 |

### 1.4 包络与参数域声明（v1.1 修订，评审条件 A-C3/B-F4）

- UI 可编辑域 `load_kW ∈ [10, 45]`（systems.js:137）、magnitude ∈ [20, 85]；
- **|P_bat| ≤ 25 kW 在 UI 全域成立**（评审人 A 实机扫描 load0∈[10,45]×mag∈[20,85]：
  max 25.0 @load0=45 边界、min −10 @load0=10），**无越界域**（与 FC/GT 不同）；
- `P_gen ∈ [20, 28] kW` 与 `P_bat ∈ [0.4·I_ref·mag/100, 10] kW` **仅 load0=30 成立**
  （load0=45 → P_gen 最高 40 kW、P_bat∈[5,25]）；
- **退化域声明**：load0 ≤ 20 时 I_ref ≤ 0，min(controlTarget, I_cap) 两负取更小 = controlTarget
  → **钳位 no-op（故障零效果）**，I_bat_cap_A 显示负值（如 load0=10/mag=55 → −13.75 A）；
  load0=20 全零 no-op。锚点仅对 load0=30 成立；
- `normalizeConfig` 不钳位 load_kW（engine.js:165–222），域仅由 UI bounds 保证——
  手拼配置可破 ±25 kW（limitations 登记项，FLEXT-G2b-04）。

---

## 2. golden 扩展轮

| # | 项 | 内容 |
|---|---|---|
| 1 | Run 扩容 | fl001_v1 **3 Run → 4 Run**：+`actuator_fault` 闭环 55%（monitor-actuator 不重复入 golden）。
  **等价断言落点（v1.1 修正，评审条件 A-C2）**：oracle self_check 内闭环/monitor 共享同一解析式（恒真，
  检不出引擎侧非等价）——等价断言必须落在**引擎测试层**：`tests/engine.test.js` 增 actuator
  闭环 vs monitor 逐位断言（series+metrics 数值，排除 run.label/run.role/effective_mode） |
| 2 | oracle 扩展 | `fl001_oracle.py` 增 actuator 解析段：闭式 13.75 + 11.25·e^(−u/0.4) + SOC 全窗积分 +
  **monitor 分支按 family 守卫**（现 fl001_oracle.py:82–83 对 monitor 无条件返回 25 A——
  actuator monitor 实为钳位 13.75，扩展时须分支化，否则 SC 失败） |
| 3 | SERIES_IDS | 增 `I_bat_cap_A` |
| 4 | 元数据核对与重签 | emit 前核对 fl001_v1 元数据与 systems.js（model_version=fl001.1，现同步 ✓）；
  4-Run 重发时 **approval 三字段重签（引本批准 CHG-20261104-03）**（FCEXT §4 表 4 先例） |
| 5 | verify_golden | 无需改动（按 golden.runs 遍历回查 oracle.RUNS；V-07 全序列泛化比对已核实） |

## 3. UI 与措辞

- copy-guard 33 模式全库适用；FL actuator 存量文案（systems.js:262–270、actuator-limit 模板段
  systems.js:919–964 含 τ=0.4 s 如实声明、I_bat_cap_A 定义、converter 组件描述）经评审人 B
  实跑 copy-guard PASS（0 命中）逐词核对无禁词；
- 层级标签维持 L0；本规格文书自检：v1 草案拟议 A-l0 措辞含禁词子串已订正（§1.2）；
- **FLEXT-G2b-04 增补项（评审人 A finding 7）**：checks.js:137–138 sampling 消息对 actuator 轨
  前置窗 null 的「非执行器故障场景」表述失实（实为 t<t_start 前置窗），顺手订正；
  **I_ref_A formula 一般式化**（systems.js:233「I_ref = 25 A」→「(P_load − 20)/0.4」，
  对标 FCEXT §3 I_fc_ref_A 先例，评审条件 A-C4）。

## 4. scope 与白名单（v1.1 修订，评审条件 B-C1/C2/F2/F3）

- **系统 scope 维持 approved_p0**；族级无「增补族」标签（scope.js classify 为二值）：
  actuator 配置按 classify 现状返回 **extension_preview**（src/core/scope.js:20
  `APPROVED.families=['none','sensor_drift']`）；
- **白名单扩展的显式 CHG 面（实现期，FLEXT-G2b-04）**：① scope.js `APPROVED.families`；
  ② 后端可服务域（tools/backend/py/fl001_analytic.py:60–61 / fl001_ode_rk4.py:50–51 硬限
  none/sensor_drift）。实现前：P0 验收路径（assertApprovedP0）、后端路径、golden 比对
  三路径均守住「SA-24 白名单不扩大」红线（评审人 B 正面核实）；
- **Arena 族池裁定（随本批准追认现状）**：族池按系统故障目录派生
  （src/core/arena-protocol.js:180–186），**actuator_fault 自 2026-10-30（O-13）起已在
  FL-001 盲测池**，无需扩容；归档局 eval-session-001 **实含 3/6 actuator 轮**
  （converter_current_limit，evidence/g8/eval-session-001/reveal.json），其真值与评分由本
  批准**追认**（族的物理规格经双路评审背书；盲评测不走验收路径，golden 扩展仍为数值
  验收工具——Q-4 第三守卫解除后两者不冲突）。FLEXT-G2b-04 不加池级过滤；
- 既有盲包/归档局重放影响：见 §5。

## 5. 预期失效面（v1.1 修订，评审条件 B-C1）

- fl001_v1 golden 字节/sha 变更 + sidecar 重签（现 sha 6a0c751f… 退役，评审人 A 核实与
  golden-sha256.txt 一致）；approval 三字段重签（§2 项 4）；
- 硬编码 Run 键的测试面（评审人 B F7 精确计数）：`tests/engine.test.js`
  （closed_loop_fault/monitor_only 键，:36–38/:92–93/:113–116，10 处）+
  `tests/backend-admission.test.js`（:69–71/:97/:104，4 处）随之扩展；
- 既有 3 Run 数值不变（FLEXT-G2b-01…04 不触 engine.js、model_version 维持 fl001.1）；
- **归档评测局**：eval-session-001 含 3 actuator 轮——重放零影响的依据为引擎行为逐位不变
  与盲包 closed-world 不引用 golden 字节（非「无 actuator 轮」——v1 草案前提错误，v1.1 订正）；
- 新盲包生成可抽出 actuator 场景（池现状追认，§4）——盲包内容与 golden 扩展解耦。

## 6. 实现排期（v0.6.0 队列，另行指令派发）

| 步骤 | 内容 | 规模 |
|---|---|---|
| FLEXT-G2b-01 | 锚点 oracle 复算冻结（§1.3；SOC=59.7070833% 为冻结预填值） | S |
| FLEXT-G2b-02 | oracle actuator 解析段（含 monitor family 守卫）+ fl001_v1 增 Run 4 + approval 重签（§2） | M |
| FLEXT-G2b-03 | 双路独立评审 + 用户批准（**本批准，2026-11-04**） | S |
| FLEXT-G2b-04 | 实现：systems.js assumptions（A-fl-clamp/A-l0 修订）/EQ-A/EQ-B 登记 + I_ref_A formula 一般式化 + limitations 退化域/手拼配置声明 + checks.js 采样文案订正 + tests/engine.test.js 等价断言 + FAULT_CATALOG §5 挂载核对 + scope.js/后端白名单扩展显式 CHG（如执行） | M |

## 7. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 双轨 τ（0.4/1.5 s）未声明导致 golden/文案漂移 | §1.2 显式登记 + FLEXT-G2b-04 同步 |
| R-2 | 引擎侧闭环/monitor 非等价（实现隐含） | 等价断言落 tests/engine.test.js 逐位层（§2 项 1，oracle 自检恒真不作为守卫） |
| R-3 | SA-24 白名单被误读为本批准自动扩大 | §4 显式：白名单/后端域扩展须实现期显式 CHG；Arena 池现状追认已登记 |
| R-4 | 元数据失同步（FC 先例） | §2 项 4 预防性核对 + approval 重签口径 |
| R-5 | oracle monitor 分支陷阱（现无条件返回 25 A） | §2 项 2 点名 family 守卫；SC 失败即停 |

## 8. 评审记录（2026-11-04）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | 机制逐行核对、锚点实机+闭式双证、monitor 等价实机实证（16 信号×601 点）、参数域扫描、FCEXT 先例对照 | **PASS_WITH_CONDITIONS**（4 条件 8 findings） | SOC 锚点漏积故障前段（59.8459722→**59.7070833%**，139× 容差，P1）；等价断言落点错误（oracle 恒真，P1）；退化域/I_ref formula/措辞范围/oracle monitor 陷阱 |
| 评审人 B（治理/口径/回归面） | 治理记录一致性、scope 三路径核实、copy-guard 实跑、目录核对、golden/回归面 | **PASS_WITH_CONDITIONS**（5 条件 8 findings） | eval-session-001 实含 3/6 actuator 轮（P1，草案前提错误）；Arena 族池自 O-13 起已含 actuator（P1，无需扩容）；族级标签无代码映射；A-l0 措辞禁词；SA-24 红线三路径核实守住 |

**条件处置**：两路 9 条件全部修订进 v1.1（§1.3 SOC 修正、§2 项 1 断言落点、§1.4 域声明、
§1.2 措辞订正、§3 增补项、§4/§5 评测轨事实重写与池追认、§6 排期增补、目录 §5 版本对齐）。

---

**文件结束**。FLEXT_G2B_SPEC_APPROVED v1.1（2026-11-04，CHG-20261104-03 批准）。
实现排期 FLEXT-G2b-01/02/04 待 v0.6.0 队列指令派发。
