# FCEXT_G2B_SPEC_DRAFT — FC-001 load_step / actuator_fault G2b 物理规格（草案）

> **任务**：FC 扩展故障族 G2b（V0.3 规划 V3-04 后续 / V05_RELEASE_PLAN §2.5 范围外候选）。
> **授权**：用户 2026-10-31 指令「V0.3 规划的 V3-04 后续（FC-001 已升正式，后续 FC 扩展需各自 G2b）」。
> **前置**：FC-001 已升正式验收（CHG-20261030-12，model_version=1.1.0，scope=approved_fc）；
> FC 的 load_step/actuator_fault 已在目录/引擎/因果模板中存在（未评审冻结→本 G2b 解除冻结）。
> **状态**：`DRAFT`——待双路独立评审 + 用户批准（G2b 门）后实现。
> **Q-4 三守卫适用**：方程集扩展须走 G2b；许可证自研零依赖（无新第三方）；验收路径禁入直至 G2b 通过。
> **记录**：实现 Agent，2026-10-31。

---

## 1. FC-001 load_step（负载功率阶跃）— G2b 规格重写

### 1.1 现有文本的问题（与 FL-001 同源矛盾——SCOPE §5.1 已详证）

FC-001 的 load_step 假设句说「功率分配器一阶爬坡抬升电堆参考电流」（τ_fc = 1.2 s 一阶跟随），
验收句说「电池承担瞬态」。矛盾在于：功率分配器有 τ_fc 一阶惯性，但电池是理想平衡源
（A-ideal-balance：P_bat = P_load − P_fc，无功率爬坡限制）——电池完美补足瞬态缺口，
发电机侧不存在失衡功率。

**FC-001 的 load_step 物理上自洽**（与 FL-001 不同——FC 的电池是理想平衡源，不是有惯量的
发电机 + 电池组合），矛盾不在物理而在假设/验收描述的措辞。需重新审视的仅是：
一阶 τ_fc 的具体值（1.2 s）是否已声明、电池限幅在瞬态期间是否合理。

### 1.2 规格重写

**现状保留（方程不变）**：
- `τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t)`（一阶跟随，τ_fc = 1.2 s）
- `I_fc_ref = P_load / 0.4`（load_step 时 P_load 阶跃 → I_fc_ref 阶跃 → I_fc 一阶跟随）
- `P_bat = P_load − P_fc`（理想平衡源）

**需修正**：
- `closedLoopEffect` 文案改为「电堆电流按 τ_fc = 1.2 s 一阶跟随新目标，电池缓冲瞬态后回到 10 kW」
  （原文「爬坡」是隐喻，实际是精确一阶跟随）；
- `I_fc_cap` 在 load_step 场景为 null（现有实现已是 null ✓）；
- load_step 因果模板 `fc-load-step`（systems.js:1055）需检查 `signalIds` 是否引用被 O-13
  删除的 FL-001 信号（不应——FC 模板引用 FC 信号 ✓，但须复核）。

### 1.3 验收锚点

| 场景 | 锚点（60 s 网格） | 容差 |
|---|---|---|
| `load_step` +10 kW | `I_fc(60)` = **75.00 A**（I_fc_ref 自适应：(P_load−10)/0.4 = 75 A） | ±0.5 A |
| 同上 | `P_bat(60)` = **10.00 kW**（稳态电堆覆盖增量后电堆回基线） | ±0.5 kW |
| 同上 | 瞬态 max \|P_bat\| = **20.00 kW**（电池瞬态全额承担缺口；在包络 ±25 kW 内） | 记录值 |
| 同上 | `SOC_est(60)` − `SOC_true(60)` = 0（功率测量健康） | ±1e-5 pp |
| 同上 | `r_true` ≡ 0（定义恒等） | ≤1e-12 kW |

**注**：load_step +10 kW 的稳态 I_fc = (30+10)/0.4 = 100 A，但 I_fc_ref = 50 A 默认——
须确认 I_fc_ref 是否随 load_step 阶跃（engine.js:599 提到「I_fc_ref → (P_load-10)/0.4」）。
**定案（实机复算 2026-10-31）**：I_fc_ref **随负载自适应**——`I_fc_ref = (P_load − 10) / 0.4`
（电池基线 10 kW 偏移后按剩余功率分配）；load_step +10 kW 时 I_fc_ref 从 50 A 升至 75 A（稳态）。

## 2. FC-001 actuator_fault（氢气阀卡涩）— G2b 规格重写

### 2.1 现有实现（已确认存在）

- `I_fc_cap = 50 × magnitude/100`（默认 55% → 27.5 A）
- 电堆电流被钳位至 I_fc_cap，电池补足
- `valve_meas_pct = magnitude%`、`valve_cmd_pct` 持续上升

### 2.2 需修正的项（对标 GT-001 G2b 条件映射）

| # | 项 | 内容 |
|---|---|---|
| 1 | 抗饱和声明 | 现实现为 I_fc 一阶跟随 target（target = min(I_ref, I_cap)）——即钳位式；声明为 assumption |
| 2 | 电池限幅 | FC-001 的电池是理想平衡源（A-ideal-balance），限幅不适用；但须确认 P_bat 在极端参数下是否超出 ±25 kW 包络 |
| 3 | 恢复定义 | actuator 清除场景（t_clear_s）可选；清除后 I_fc_cap 释放、I_fc 回 I_ref |
| 4 | UI 标签 | 「电堆阀门卡涩示意（L0b），非电堆物理验证」+ 四禁词 |
| 5 | 独立 golden | actuator 场景 golden（复用 fc001_v1 同一 oracle，增 Run） |

## 3. 验收锚点（草案；oracle 复算后冻结）

| 场景 | 锚点 | 容差 |
|---|---|---|
| `actuator_fault` 55% | `I_fc(60)` = **27.50 A**（钳位） | ±0.1 A |
| 同上 | `P_bat(60)` = **19.00 kW** | ±0.3 kW |
| 同上 | max \|P_bat\| = **19.00 kW**（在包络 ±25 kW 内） | 记录值 |
| `load_step` +10 kW | `I_fc(60)` = **75.00 A** | ±0.5 A |
| 全场景 | `r_true` ≡ 0（定义恒等） | ≤1e-12 kW |
| 全场景 | 无 NaN/Inf；SOC ∈ [0,100] | 硬判据 |

## 4. golden 扩展轮

`fc001_v1.json` 需增 Run：`load_step`（当前 golden 仅 sensor_drift 闭环 + monitor）→ 增至
**≥4 Run**：healthy、sensor_drift 闭环、sensor_drift monitor、load_step、actuator_fault。
`verify_golden.py fc001` 参数化同步。

## 5. UI 正式化

- FC 系统卡：scope=approved_fc 已生效（W-2）；
- load_step/actuator 因果模板信号 id 引用复核（O-13 FL-001 删除不影响 FC 自有信号）；
- 四禁词（机组动态验证等）为 GT 专属——FC 不涉及。

## 6. 实现排期

| 步骤 | 内容 | 规模 |
|---|---|---|
| FC-G2b-01 | load_step I_fc_ref 歧义定案 + 锚点复算（oracle） | S |
| FC-G2b-02 | actuator t_clear_s 支持（可选）+ golden 增 Run | M |
| FC-G2b-03 | 双路独立评审 + 用户批准 | S |
| FC-G2b-04 | 实现（文案/模板/校验器微调——方程不变） | S |

## 7. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | I_fc_ref 歧义（固定 50 A vs 随负载自适应）——影响 load_step 全部锚点 | FC-G2b-01 首项定案 |
| R-2 | 电池限幅：load_step +20 kW 时 P_bat 瞬态可能超包络 | FC 电池是理想平衡源，限幅不适用；仅声明 |
| R-3 | 因果模板信号引用（fc-load-step 引用 P_load_demand_kW——FL/FC 共用 id）| FC 自有信号目录含 P_load_demand_kW ✓ |

---

**文件结束**。FCEXT_G2B_SPEC_DRAFT v1（2026-10-31）。评审入口：FC-G2b-03（双路独立 + 用户批准）。
