# G9_G10_ARCH_GATE_SPEC_DRAFT — 外部输入落档·重立（V0.5 架构与门禁 spec：G9 FC-001 L1-FMU + I-11 S3 / G10 Arena L2 + MCP harness）

> **状态**：`DRAFT`（**重立落档**——原文自带 APPROVED 状态在本仓治理链不自动生效；首落 2026-11-14
> 被并行会话隔离后经**用户明示确认**重立，处置链见恢复落档记录行）。
> **来源**：外部编制 spec（用户 2026-11-14 于 Lead 会话下发并声明「这个是新一轮的升级方案」，原文档
> ID `SPEC-V0.5-G9-G10-APPROVED`，正文自分隔线以下**逐字保留未修订**——首落/隔离/重立三轮内容
> 均自同一会话内权威文本重建，未转抄隔离件）。
> **恢复落档记录（2026-11-14）**：① 首落 = Lead 会话（用户下发 spec + 两项 AskUserQuestion 裁定：
> 排程选「V140 先行，G9/G10 随后」+ FC-001 物理处置选「降级 DRAFT 走 G2b 双评审」，台账记录
> CHG-20261114-03——G9/G10 落档行）；② 隔离 = 并行 v1.4.0 发布会话判定「本会话无对应用户输入
> ⇒ 代理虚构用户权威」移出仓库（QUARANTINED_* 于 TEMP，v1.4.0 发布收口记录 ③(四)/W8 代管注记
> + commit 229a15d 提交信息登记，并明示「如用户确有外部 spec 请明示后按外部输入流程重立」）；
> ③ **重立 = 用户明示确认（2026-11-14，AskUserQuestion 裁定「确认是我下发，重立落档」）**——
> 隔离判定所依据的「无对应用户输入」系会话可见性差异（该会话看不到 Lead 会话指令链），非权威
> 缺失；本文件按外部输入流程重立，隔离件留存 TEMP 不另处置。
> **台账编号注记**：首落记录 CHG-20261114-03 与并行发布收口记录撞号（两记录同号）——编号修复
> （顺延改号 + 撞号/隔离/确认链补记）待 V150 波收口后执行（V150 W4 独占 DECISIONS.md 工作面，
> 本重立不触碰台账——双会话分工裁定：本会话仅持 G9/G10 外部输入线 + 只读审计）。
> **核对结论（2026-11-14）**：引用钩子逐项核实成立——I-11 S3 未排期（RFC 头部明载；`src/core/plants/`
> 仅 fl001/fc001 两适配器）、V312 清单 B-4「FMU 各自另批」、`tools/backend/py/fmu_runner.py` +
> `fmu_admission.py` 在位（原文对 fmu_runner 标 Update，准确）、arena `V-00…V-10` +
> `arena-protocol-negative` N-B 负例套件在位、G0-DEC-08/11 与基线 `7aed9f6` 在位、V140 不做清单
> D-3「FMU 样本未到」由本 spec 解锁；唯版本框架为陈旧锚定，见勘误一。
> **勘误一（版本 re-baseline）**：原文「Target v0.5.0 / evolving from v0.4.0」为本仓 2026-10-31 已
> 消费的历史版本——**v1.4.0 已发布（commit 229a15d，2026-11-14）、v1.5.0 由 V150_WAVE_DESIGN 在飞
> （P3 GT 草案轮 + O-1 枚举扩展）**；本 spec 全部工作 re-baseline 为 **V150 之后候选波（v1.6.0+，
> 与 P3 GT 实现轮的排期由启动波裁定）**，`G9`/`G10` 两个 gate id 以启动波 CHG 注册入台账。
> **勘误二（排程，用户裁定 2026-11-14）**：「V140 先行」条件**已兑现**（v1.4.0 发布）——G9 触
> `engine.js`/`plants/`（S3 退役内联分支），与在飞 V150 文件面不相交但其启动轮次排 V150 之后；
> S3 验收边界需扩裁定（GT 现为三轨双存档 + PV/WT/MG 内联分支，超出原文 FL/FC/GT 统一口径）。
> **勘误三（FC-001 物理处置，用户裁定 2026-11-14）**：原文 FC-001 5 态空间 PEMFC（52 V/100 A/
> 80 cell、微重力膜分离器、N₂ 累积）为**第三轨新物理**（≠ L0 级联 fc001_v1 / ≠ 电化学 on-track
> fc001_v2 400 V 锚 / ≠ capacity 轨）——按 Q-4 守卫 1 / L1_FEASIBILITY_RFC 口径**走 G2b 草案 +
> 双路评审，批准轮收口后方可实现**；golden 走新 id `fc001_fmu_v1`，不撞既有 11 golden 字节冻结。
> **契约面预裁定待办（启动波逐项落）**：① 602 行（20.0⁻/20.0⁺ 双边界行）vs `docs/CONTRACT.md:391`
> 冻结「时间数组严格 601 点」——须裁定（MG 双事件快照同构 additive，或 breaking = major + 五件
> 迁移义务）；② EvidenceBundle v1.1 `fmu_sha256` additive 五哈希零变化证明；③ V312 FROZEN 清单
> 钉 hash 须 CHG；④ run-g2 步预算 ≤35 扩账（I-7）；⑤ `feedback_mode` 等新 scenario 键走 B-1a
> 显式键 + 零投影纪律；⑥ copy-guard 新词（水位/液位/water level/liquid level）作用域限 FC-001
> L1 域——本仓 MG = microgrid ≠ microgravity；⑦ arena L2 预算常量（B_max=180 / B_min=45）协议附记。

---

# 原文（逐字保留，未修订）

# FaultLab — Virtual Energy Lab - V0.5 Architecture and Gate Specification (V0.5_PLAN_APPROVED)

> **Document ID**: `SPEC-V0.5-G9-G10-APPROVED`
> **Status**: `APPROVED` (Authoritative Implementation Baseline for Gate G9 and Gate G10)
> **Target Version**: `v0.5.0` (Evolving from `v0.4.0` baseline)
> **Governed Gates**: `G9` (FC-001 5-State L1-FMU Closed-Loop and I-11 S3 Completion) and `G10` (Arena Level 2 Query-Budget Protocol and MCP Agent Harness)
> **Upstream References**: `DECISIONS/DECISIONS.md` (`G0-DEC-08`, `G0-DEC-11`), `DECISIONS/SPEC_v0.2_APPROVED.md`, `RFC_MODEL_INTERFACE_I11_APPROVED.md`, `FL19_BACKEND_RFC_APPROVED.md`, `ARENA_EVAL_PROTOCOL_APPROVED.md`, `V312_BACKEND_ADMISSION_CHECKLIST.md`

> **Epistemic Honesty and Data Provenance Declaration**:
> The 5-state lumped-parameter Functional Mock-up Unit (FMU) introduced in V0.5 is a **behavioral and numerical lumped-parameter demonstration model** (`model_provenance="fmu_l1_lumped_unvalidated"`). All simulation outputs remain synthetic (`synthetic`):
> - Not derived from hardware testbench telemetry (`hardware_verification="not_performed"`).
> - Not validated against empirical stack polarization or thermal data (`model_validation="not_performed"`).
> - Passing internal consistency checks (`verification.consistency_checks="pass"`), bit-identical `run_hash` reproduction, and independent Oracle golden comparison (`rtol` less than or equal to $10^{-9}$) establishes **numerical and implementation self-consistency only**, and MUST NOT be represented as physical conservation validation or hardware certification.

---

## 1. Executive Architecture Decisions (G0-V05 Rulings)

| Decision ID | Topic | Approved Ruling | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **G0-V05-DEC-01** | FMU Delivery Mode | **Backend CLI and Python HTTP Bridge** (`tools/backend/`) with static pre-baked JSON bundle fallback for pure browser mode. | Preserves the zero-dependency, no-build-step browser frontend while enabling native C99 FMI 2.0 Co-Simulation execution via Python `ctypes`. |
| **G0-V05-DEC-02** | FC-001 Physical Model Order | **5-State Lumped-Parameter ODE Model** ($\text{O}_2/\text{N}_2$ cathode gas supply, anode ejector recirculation, microgravity separator water volume, stack temperature). | Balances nonlinear multi-physics coupling (concentration polarization, $\text{N}_2$ dilution, water storage capacity saturation) with 100% transparent causal traceability across the 6-node causal graph. |
| **G0-V05-DEC-03** | Microgravity Modeling Guardrails | **Water Volume and Storage Capacity Ratio Only** (`V_water_store_mL`, `cap_water_ratio`); single-phase water vapor in recirculating gas. | Microgravity lacks buoyancy-driven free liquid surfaces. Terms such as "水位", "液位", "water level", or "liquid level" are strictly prohibited and enforced via `tools/copy-guard.mjs`. |
| **G0-V05-DEC-04** | Arena Evaluation Track Upgrade | **Level 2 Query-Budget Active Probing** (coarse $2.0\text{ s}$ free beacon + gated $0.1\text{ s}$ slice budget + tamper-evident `query_ledger`). | Eliminates trivial full-series threshold scripting and evaluates an external Agent's diagnostic information-gain efficiency and mechanistic evidence grounding. |
| **G0-V05-DEC-05** | I-11 Interface S3 Closure | **Full Unification of Plant/Sensor/Controller/Fault** across `FL-001`, `FC-001`, and `GT-001` (including `actuator_fault`). | Retires legacy inline system branches prior to binding the `FmuPlantAdapter`. |

---

## 2. Gate G9 Specification: FC-001 5-State Lumped-Parameter FMU and HTTP Bridge Closed-Loop

### 2.1 Three-Layer Sandwich Architecture and Epistemic Separation

To preserve FaultLab's strict separation of `true`, `measured`, and `derived` signals without duplicating event-phase splitting logic inside compiled C binaries, Gate G9 enforces a three-layer architecture:

1. **Inner Layer — Pure Physical Plant FMU (`tools/backend/fmu/fc001_l1.c`)**:
   - Written in standard C99 with zero external dependencies, compiled into a platform shared library (`.dll` / `.so` / `.dylib`) and packaged as an FMI 2.0 Co-Simulation archive (`data/fmu/fc001_l1_v1.fmu`).
   - Integrates the 5 physical differential states using an inline fixed-step 4th-order Runge-Kutta (RK4) solver with internal substep $\delta t = 0.01\text{ s}$ and communication step $\Delta t = 0.1\text{ s}$.
   - Exposes only `input` variables (load current, valve commands, actuator health factors) and `true` physical state/algebraic outputs (`exposure="sealed"`).
2. **Middle Layer — Python `ctypes` Host and I-11 Shell (`tools/backend/fmu_runner.py`)**:
   - Loads the FMU binary after verifying its SHA-256 against `V312_BACKEND_ADMISSION_CHECKLIST.md`.
   - Manages **Sensor Contamination** (injecting step bias $b$ at $t = 20.0\text{ s}$), **Controller Feedback Mode** (`closed_loop` vs `monitor_only` vs `baseline`), and **Algebraic Consistency Residuals** (`r_meas_p_kPa`, `r_meas_water_mL`).
   - Executes exact **Event Pre/Post Left-Limit Splitting** at $t = 20.0\text{ s}$:
     - Advances the unperturbed trajectory from $t = 0.0\text{ s}$ to $t = 20.0\text{ s}$ and records the pre-fault state as row `20.0-` (`phase="pre"`, `derivation="left_limit"`).
     - Applies the fault parameter mutation at $t = 20.0\text{ s}$, evaluates zero-step algebraic outputs (`dt = 0.0`) so differential states remain $C^0$ continuous while sensor measurements, proportional control commands, and measurement residuals exhibit exact step transitions, and records row `20.0+` (`phase="post"`).
     - Continues fixed-step integration at $\Delta t = 0.1\text{ s}$ through $t = 60.0\text{ s}$ (yielding exactly $602$ rows per run).
3. **Outer Layer — HTTP Bridge and Pre-Baked Bundle Loader (`src/core/plants/fc001-fmu-adapter.js`)**:
   - Connects to the local Python HTTP bridge when running in developer/evaluation mode, or loads the verified static golden run archive when running offline via `file://`.

---

### 2.2 FC-001 5-State Differential and Algebraic Equations

The system represents a $5.0\text{ kW}$ net-output space proton exchange membrane fuel cell (PEMFC) stack comprising $N_{\text{cell}} = 80$ cells operating at a nominal load current $I_{\text{load}} = 100.0\text{ A}$.

#### 2.2.1 Differential State Equations (Plant Kernel)

1. **State 1 — Cathode Oxygen Partial Pressure $p_{\text{O}_2,\text{ca}}$ (Unit: $\text{kPa}$)**:
   $$\frac{\mathrm{d}p_{\text{O}_2,\text{ca}}}{\mathrm{d}t} = G_{\text{O}_2,\text{in}} \cdot \alpha_{\text{o2}} \cdot u_{\text{o2}} - k_{\text{O}_2,\text{react}} \cdot I_{\text{load}} - \frac{p_{\text{O}_2,\text{ca}} - p_{\text{O}_2,\text{nom}}}{\tau_{\text{ca}}}$$

2. **State 2 — Cathode Nitrogen Partial Pressure $p_{\text{N}_2,\text{ca}}$ (Unit: $\text{kPa}$)**:
   $$\frac{\mathrm{d}p_{\text{N}_2,\text{ca}}}{\mathrm{d}t} = k_{\text{N}_2,\text{accum}} \cdot \left(u_{\text{o2,nom}} - \alpha_{\text{o2}} \cdot u_{\text{o2}}\right) - \frac{p_{\text{N}_2,\text{ca}} - p_{\text{N}_2,\text{nom}}}{\tau_{\text{N}_2}}$$

3. **State 3 — Anode Hydrogen Partial Pressure $p_{\text{H}_2,\text{an}}$ with Ejector Micro-Circulation (Unit: $\text{kPa}$)**:
   $$\frac{\mathrm{d}p_{\text{H}_2,\text{an}}}{\mathrm{d}t} = G_{\text{H}_2,\text{in}} \cdot u_{\text{an}} - k_{\text{H}_2,\text{react}} \cdot I_{\text{load}} - \frac{p_{\text{H}_2,\text{an}} - p_{\text{H}_2,\text{nom}}}{\tau_{\text{an}}}$$

4. **State 4 — Microgravity Passive Membrane Separator Water Volume $V_{\text{water,store}}$ (Unit: $\text{mL}$)**:
   $$\frac{\mathrm{d}V_{\text{water,store}}}{\mathrm{d}t} = q_{\text{cond}} \cdot I_{\text{load}} - q_{\text{drain,max}} \cdot \alpha_{\text{drain}} \cdot u_{\text{drain}}$$

5. **State 5 — Stack Lumped Temperature $T_{\text{stack}}$ (Unit: $\text{K}$)**:
   $$\frac{\mathrm{d}T_{\text{stack}}}{\mathrm{d}t} = \frac{1}{C_{\text{th}}} \left( \frac{\left(N_{\text{cell}} \cdot E_{\text{LHV}} - V_{\text{stack,true}}\right) \cdot I_{\text{load}}}{1000.0} - h_{\text{cool}} \cdot \left(T_{\text{stack}} - T_{\text{cool,in}}\right) \right)$$

#### 2.2.2 Algebraic Output Equations (True Physical Quantities)

1. **Cathode Single-Phase Water Vapor Partial Pressure and Total Pressure ($\text{kPa}$)**:
   $$p_{\text{vap,ca}} = 30.0 + 1.2 \cdot \left(T_{\text{stack}} - 343.15\right)$$
   $$p_{\text{ca,true}} = p_{\text{O}_2,\text{ca}} + p_{\text{N}_2,\text{ca}} + p_{\text{vap,ca}}$$

2. **Cathode Oxygen Mole Fraction and Separator Storage Capacity Ratio (Dimensionless)**:
   $$y_{\text{O}_2,\text{true}} = \frac{p_{\text{O}_2,\text{ca}}}{p_{\text{ca,true}}}, \quad \theta_{\text{cap,true}} = \frac{V_{\text{water,store}}}{V_{\text{cap,max}}}$$

3. **Stack Terminal Voltage ($\text{V}$) and Net System Efficiency ($\%$)**:
   $$V_{\text{stack,true}} = 52.0 + 40.0 \cdot \left(y_{\text{O}_2,\text{true}} - 0.60\right) - 10.0 \cdot \max\left(0.0, \theta_{\text{cap,true}} - 0.40\right) - 35.0 \cdot \left(\max\left(0.0, \theta_{\text{cap,true}} - 0.60\right)\right)^2 + 0.08 \cdot \left(T_{\text{stack}} - 343.15\right)$$
   $$P_{\text{gross,kW}} = \frac{V_{\text{stack,true}} \cdot I_{\text{load}}}{1000.0}, \quad P_{\text{net,kW}} = P_{\text{gross,kW}} - P_{\text{aux,kW}}$$
   $$\eta_{\text{sys,true}} = 100.0 \cdot \frac{P_{\text{net,kW}}}{P_{\text{H}_2,\text{LHV,kW}}}$$

#### 2.2.3 Sensor, Controller, and Derived Residual Equations (I-11 Host Shell)

1. **Sensor Measurement Channels (`source_kind="measured"`, `exposure="blind_observable"`)**:
   $$p_{\text{ca,meas}}(t) = p_{\text{ca,true}}(t) + b_{p,\text{ca}} \cdot \mathbb{I}\left(t \ge t_{\text{fault}} \text{ and phase} \neq \text{pre}\right)$$
   $$V_{\text{water,meas}}(t) = V_{\text{water,store}}(t) + b_{V,\text{water}} \cdot \mathbb{I}\left(t \ge t_{\text{fault}} \text{ and phase} \neq \text{pre}\right)$$
   $$V_{\text{stack,meas}}(t) = V_{\text{stack,true}}(t), \quad T_{\text{stack,meas}}(t) = T_{\text{stack}}(t)$$

2. **Control Laws (`source_kind="derived"`, `exposure="blind_observable"`)**:
   - In `baseline` or `monitor_only` mode:
     $$u_{\text{o2}}(t) = 0.50, \quad u_{\text{drain}}(t) = 0.50, \quad u_{\text{an}}(t) = 0.50$$
   - In `closed_loop` mode:
     $$u_{\text{o2}}(t) = \min\left(0.95, \max\left(0.05, 0.50 - 0.01 \cdot \left(p_{\text{ca,meas}}(t) - 200.0\right)\right)\right)$$
     $$u_{\text{drain}}(t) = \min\left(0.95, \max\left(0.05, 0.50 + 0.002 \cdot \left(V_{\text{water,meas}}(t) - 200.0\right)\right)\right)$$

3. **Observer Estimates and Node-6 Algebraic Measurement Residuals (`source_kind="derived"`, `exposure="blind_observable"`)**:
   - Open-loop nominal reference expectations under constant $I_{\text{load}} = 100.0\text{ A}$:
     $$p_{\text{ca,ref}} = 200.0\text{ kPa}, \quad V_{\text{water,ref}} = 200.0\text{ mL}$$
   - Estimated cathode nitrogen accumulation index ($\text{kPa}$) from valve command integral deficit:
     $$\hat{p}_{\text{N}_2,\text{est}}(t) = 50.0 + \left(200.0 - p_{\text{ca,meas}}(t)\right) \cdot \left(-0.35\right)$$
   - Estimated storage capacity ratio:
     $$\hat{\theta}_{\text{cap,est}}(t) = \frac{V_{\text{water,meas}}(t)}{V_{\text{cap,max}}}$$
   - **Measurement Consistency Residuals (Algebraic Identity Branch)**:
     $$r_{\text{meas,p}}(t) = p_{\text{ca,meas}}(t) - p_{\text{ca,true}}(t)\text{ (via open-loop flux balance)} = b_{p,\text{ca}} \cdot \mathbb{I}\left(t \ge t_{\text{fault}}\right)$$
     $$r_{\text{meas,water}}(t) = V_{\text{water,meas}}(t) - V_{\text{water,true}}(t)\text{ (via open-loop condensation balance)} = b_{V,\text{water}} \cdot \mathbb{I}\left(t \ge t_{\text{fault}}\right)$$

#### 2.2.4 Frozen Model Parameter Dictionary

| Parameter | Symbol | Value | Unit | Physical Description |
| :--- | :--- | ---: | :--- | :--- |
| `N_cell` | $N_{\text{cell}}$ | $80$ | cells | Number of series cells in the PEMFC stack |
| `I_load_nom` | $I_{\text{load}}$ | $100.0$ | $\text{A}$ | Nominal stack load current |
| `G_O2_in` | $G_{\text{O}_2,\text{in}}$ | $20.0$ | $\text{kPa/s}$ | Cathode $\text{O}_2/\text{N}_2$ supply valve oxygen pressure gain |
| `k_O2_react` | $k_{\text{O}_2,\text{react}}$ | $0.10$ | $\text{kPa/(A}\cdot\text{s)}$ | Electrochemical oxygen consumption coefficient |
| `tau_ca` | $\tau_{\text{ca}}$ | $5.0$ | $\text{s}$ | Cathode manifold pressure relaxation time constant |
| `k_N2_accum` | $k_{\text{N}_2,\text{accum}}$ | $12.0$ | $\text{kPa/s}$ | Cathode nitrogen accumulation gain under reduced supply/purge |
| `tau_N2` | $\tau_{\text{N}_2}$ | $10.0$ | $\text{s}$ | Nitrogen buffer relaxation time constant |
| `G_H2_in` | $G_{\text{H}_2,\text{in}}$ | $40.0$ | $\text{kPa/s}$ | Anode ejector hydrogen supply gain (stoichiometry ratio $1 : 0.65$) |
| `k_H2_react` | $k_{\text{H}_2,\text{react}}$ | $0.20$ | $\text{kPa/(A}\cdot\text{s)}$ | Anode electrochemical hydrogen consumption coefficient |
| `tau_an` | $\tau_{\text{an}}$ | $2.5$ | $\text{s}$ | Anode recirculation loop relaxation time constant |
| `q_cond` | $q_{\text{cond}}$ | $0.08$ | $\text{mL/(A}\cdot\text{s)}$ | Product water condensation rate coefficient |
| `q_drain_max` | $q_{\text{drain,max}}$ | $16.0$ | $\text{mL/s}$ | Passive membrane separator maximum water removal rate |
| `V_cap_max` | $V_{\text{cap,max}}$ | $500.0$ | $\text{mL}$ | Separator maximum water storage capacity |
| `E_LHV` | $E_{\text{LHV}}$ | $1.254$ | $\text{V}$ | Lower heating value thermal-neutral cell reference voltage |
| `P_H2_LHV` | $P_{\text{H}_2,\text{LHV,kW}}$ | $10.032$ | $\text{kW}$ | Total hydrogen LHV power input at $100.0\text{ A}$ |
| `P_aux` | $P_{\text{aux,kW}}$ | $0.20$ | $\text{kW}$ | Parasitic balance-of-plant power consumption |
| `T_cool_in` | $T_{\text{cool,in}}$ | $323.15$ | $\text{K}$ | Coolant inlet temperature ($50.0\ ^\circ\text{C}$) |
| `h_cool` | $h_{\text{cool}}$ | $0.2416$ | $\text{kW/K}$ | Stack-to-coolant lumped heat transfer conductance |
| `C_th` | $C_{\text{th}}$ | $2.416$ | $\text{kJ/K}$ | Stack lumped thermal capacity |

---

### 2.3 Nominal Steady-State Equilibrium Point ($t \in [0.0, 20.0^-]\text{ s}$)

At nominal operating inputs ($I_{\text{load}} = 100.0\text{ A}$, $u_{\text{o2}} = 0.50$, $u_{\text{drain}} = 0.50$, $u_{\text{an}} = 0.50$, $\alpha_{\text{o2}} = 1.0$, $\alpha_{\text{drain}} = 1.0$), all five time derivatives vanish identically ($\dot{x}_i \equiv 0$):

| Variable ID (`schema_id`) | Symbol | `source_kind` | `exposure` | Nominal Steady-State Value | Unit |
| :--- | :--- | :--- | :--- | ---: | :--- |
| `p_O2_ca_true_kPa` | $p_{\text{O}_2,\text{ca}}$ | `true` | `sealed` | $120.000000$ | $\text{kPa}$ |
| `p_N2_ca_true_kPa` | $p_{\text{N}_2,\text{ca}}$ | `true` | `sealed` | $50.000000$ | $\text{kPa}$ |
| `p_H2_an_true_kPa` | $p_{\text{H}_2,\text{an}}$ | `true` | `sealed` | $180.000000$ | $\text{kPa}$ |
| `V_water_store_true_mL` | $V_{\text{water,store}}$ | `true` | `sealed` | $200.000000$ | $\text{mL}$ |
| `T_stack_true_K` | $T_{\text{stack}}$ | `true` | `sealed` | $343.150000$ | $\text{K}$ |
| `p_ca_true_kPa` | $p_{\text{ca,true}}$ | `true` | `sealed` | $200.000000$ | $\text{kPa}$ |
| `y_O2_ca_true` | $y_{\text{O}_2,\text{true}}$ | `true` | `sealed` | $0.600000$ | $-$ |
| `cap_water_ratio_true` | $\theta_{\text{cap,true}}$ | `true` | `sealed` | $0.400000$ | $-$ |
| `V_stack_true_V` | $V_{\text{stack,true}}$ | `true` | `sealed` | $52.000000$ | $\text{V}$ |
| `eta_sys_true_pct` | $\eta_{\text{sys,true}}$ | `true` | `sealed` | $49.840510$ | $\%$ |
| `p_ca_meas_kPa` | $p_{\text{ca,meas}}$ | `measured` | `blind_observable` | $200.000000$ | $\text{kPa}$ |
| `V_water_store_meas_mL` | $V_{\text{water,meas}}$ | `measured` | `blind_observable` | $200.000000$ | $\text{mL}$ |
| `V_stack_meas_V` | $V_{\text{stack,meas}}$ | `measured` | `blind_observable` | $52.000000$ | $\text{V}$ |
| `T_stack_meas_K` | $T_{\text{stack,meas}}$ | `measured` | `blind_observable` | $343.150000$ | $\text{K}$ |
| `u_o2_valve_cmd` | $u_{\text{o2}}$ | `derived` | `blind_observable` | $0.500000$ | $-$ |
| `u_drain_valve_cmd` | $u_{\text{drain}}$ | `derived` | `blind_observable` | $0.500000$ | $-$ |
| `cap_water_ratio_est` | $\hat{\theta}_{\text{cap,est}}$ | `derived` | `blind_observable` | $0.400000$ | $-$ |
| `r_meas_p_kPa` | $r_{\text{meas,p}}$ | `derived` | `blind_observable` | $0.000000$ | $\text{kPa}$ |
| `r_meas_water_mL` | $r_{\text{meas,water}}$ | `derived` | `blind_observable` | $0.000000$ | $\text{mL}$ |

---

### 2.4 G9 Whitelisted Run Matrix and Event Boundary Ledger

Gate G9 defines 5 canonical scenarios for `FC-001` (`t_fault_s = 20.0`, `duration_s = 60.0`, `dt_s = 0.1`):

| Run ID | `fault_family` | `feedback_mode` | Fault Parameter at $20.0\text{ s}$ | $20.0\text{ s}$ `pre` $\to$ `post` Step Discontinuity | $20.0\text{ s} \to 60.0\text{ s}$ Dynamic Trajectory |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FC-Run-1** | `none` | `baseline` | None | None (all signals flat) | Remains at exact nominal equilibrium through $60.0\text{ s}$. |
| **FC-Run-2** | `sensor_drift` | `closed_loop` | $b_{p,\text{ca}} = +15.0\text{ kPa}$ | `p_ca_meas_kPa`: $200.0 \to 215.0$; `u_o2_valve_cmd`: $0.50 \to 0.35$; `r_meas_p_kPa`: $0.0 \to +15.0$ | Reduced $\text{O}_2/\text{N}_2$ supply causes $\text{N}_2$ accumulation, $y_{\text{O}_2}$ dilution, and stack voltage decay. |
| **FC-Run-3** | `sensor_drift` | `monitor_only` | $b_{p,\text{ca}} = +15.0\text{ kPa}$ | `p_ca_meas_kPa`: $200.0 \to 215.0$; `r_meas_p_kPa`: $0.0 \to +15.0$; `u_o2_valve_cmd` stays $0.50$ | True pressures, $\text{N}_2$ fraction, and stack voltage remain completely unperturbed at $52.0\text{ V}$. |
| **FC-Run-4** | `sensor_drift` | `closed_loop` | $b_{V,\text{water}} = -80.0\text{ mL}$ | `V_water_store_meas_mL`: $200.0 \to 120.0$; `u_drain_valve_cmd`: $0.50 \to 0.34$; `r_meas_water_mL`: $0.0 \to -80.0$ | Under-draining causes true water volume to exceed $300.0\text{ mL}$ ($\theta_{\text{cap,true}}$ greater than $0.60$), triggering nonlinear polarization drop. |
| **FC-Run-5** | `actuator_fault` | `closed_loop` | $\alpha_{\text{drain}}: 1.00 \to 0.45$ | **Zero discontinuity** (`pre` equals `post` on all channels; $C^0$ continuous) | Separator water volume rises steadily despite controller increasing `u_drain_valve_cmd` toward saturation ($0.95$). |

---

### 2.5 Declarative 6-Node Causal Rules and Cross-Fidelity Comparison Whitelist

#### 2.5.1 FC-001 6-Node Causal Rules (`src/core/causal-rules.js`)

| Rule ID | Node Slot | Epistemic Layer | Bound Variables | Mechanistic Rule Statement |
| :--- | :--- | :--- | :--- | :--- |
| `FC_RULE_01_MEAS_STEP` | Node 1: Sensor Chain | `measured` | `p_ca_meas_kPa`, `V_water_store_meas_mL` | Additive sensor bias $b$ produces an instantaneous step between $20.0\text{ s}$ `pre` (`left_limit`) and $20.0\text{ s}$ `post` while physical states remain continuous. |
| `FC_RULE_02_CTRL_REACTION` | Node 2: Control Law | `derived` | `u_o2_valve_cmd`, `u_drain_valve_cmd` | Under `closed_loop` feedback, proportional control reacts to biased measurements by throttling $\text{O}_2/\text{N}_2$ supply or water removal commands; under `monitor_only`, commands remain fixed at $0.50$. |
| `FC_RULE_03_N2_ACCUM` | Node 3: Cathode Gas | `true` / `derived` | `p_N2_ca_true_kPa`, `y_O2_ca_true` | Reduced $\text{O}_2/\text{N}_2$ supply under continuous $100.0\text{ A}$ current draw elevates cathode $\text{N}_2$ partial pressure and dilutes oxygen mole fraction $y_{\text{O}_2}$. |
| `FC_RULE_04_WTMS_VOL` | Node 4: Separator Volume | `true` / `measured` | `V_water_store_true_mL`, `cap_water_ratio_est` | Insufficient drainage causes separator water volume to accumulate toward the $500.0\text{ mL}$ storage capacity limit ($\theta_{\text{cap}}$ exceeding $0.60$). |
| `FC_RULE_05_STACK_POLAR` | Node 5: Stack Polarization | `true` / `measured` | `V_stack_meas_V`, `eta_sys_true_pct` | Oxygen dilution ($y_{\text{O}_2}$ below $0.60$) and separator water storage saturation ($\theta_{\text{cap}}$ above $0.40$ and $0.60$) increase concentration overpotential and reduce stack terminal voltage. |
| `FC_RULE_06_ALGEBRAIC_RES` | Node 6: Algebraic Branch | `derived` | `r_meas_p_kPa`, `r_meas_water_mL` | **Algebraic Identity Branch**: Measurement consistency residuals jump by exactly $+b$ at $20.0\text{ s}$ `post` by definition ($r_{\text{meas}} \equiv x_{\text{meas}} - x_{\text{ref}}$), representing sensor channel offset rather than physical gas leakage or water loss. |

#### 2.5.2 Cross-Fidelity Comparison Whitelist (`src/core/compare.js`)

In addition to the existing P0 comparison whitelist rules (`fault_vs_baseline` and `closed_loop_vs_monitor_only`), Gate G9 authorizes a third comparable relation:
- **`cross_fidelity_l0_vs_l1_fmu`**: Two runs are marked `comparable` with `comparison_kind="cross_fidelity"` if and only if they share identical `system_id="FC-001"`, `fault_family`, `feedback_mode`, `t_fault_s`, `fault_magnitude`, and `duration_s`, where Run A has `model_provenance="analytical_demo"` (`L0`) and Run B has `model_provenance="fmu_l1_lumped_unvalidated"` (`L1-FMU`).

---

## 3. Gate G10 Specification: Arena Level 2 Query-Budget Protocol and Ledger Verification

### 3.1 Two-Tier Telemetry Exposure Architecture

To benchmark active diagnostic probing under realistic space telemetry bandwidth constraints, `tools/arena2-gen.mjs` packages each blind episode into two tiers:

1. **Tier 1 — Free Coarse Beacon (`coarse_beacon`)**:
   - Returned immediately by `arena_get_telemetry_summary` at zero budget cost.
   - Subsampled on a coarse grid $\Delta t_{\text{coarse}} = 2.0\text{ s}$ ($t \in \{0.0, 2.0, 4.0, \dots, 60.0\}\text{ s}$, $31$ rows total).
   - **Strips `pre`/`post` event-phase rows**: At $t = 20.0\text{ s}$, only a single post-sample value is included, deliberately creating an epistemic ambiguity zone between a $20.0\text{ s}$ sensor step bias and an $18.0\text{ s}\to 20.0\text{ s}$ actuator ramp degradation.
2. **Tier 2 — Gated High-Resolution Store (`high_res_store`)**:
   - Accessible exclusively through `arena_slice_telemetry(episode_id, variables, t_start, t_end, stride)`.
   - Contains the full $0.1\text{ s}$ time grid ($602$ rows) including exact `20.0-` (`phase="pre"`, `derivation="left_limit"`) and `20.0+` (`phase="post"`) rows.
   - Event boundary rows (`pre` and `post`) within $[t_{\text{start}}, t_{\text{end}}]$ are **never skipped** regardless of `stride`.

---

### 3.2 Query Budget Accounting and Tamper-Evident `query_ledger` Contract

1. **Per-Query Cost Formula**:
   For each call $i$ to `arena_slice_telemetry` requesting $K_i$ observable variables and returning $M_i$ rows, the consumed budget points are:
   $$c_i = K_i \times M_i$$
2. **Per-Episode Budget Limits**:
   - Hard maximum budget per episode: $B_{\text{max}} = 180\text{ points}$.
   - Optimal target budget threshold: $B_{\text{min}} = 45\text{ points}$.
   - Any tool call that would cause cumulative expenditure $B_{\text{used}} = \sum_{j=1}^{i} c_j$ to exceed $B_{\text{max}}$ is rejected by `tools/arena-mcp-server.mjs` before returning slice data.
3. **Automatic `query_ledger` Sealing**:
   - Every executed high-resolution query is logged in server memory with a canonical SHA-256 digest (`slice_sha256`) computed over the returned rows array.
   - When `arena_export_submission` is invoked, the server embeds `query_ledger` into each episode prediction and seals the entire payload with `submission_sha256`.

---

### 3.3 Protocol v2 Negative Suite Expansion (`N-B18` to `N-B20`) and `V-11` Verification

`tools/arena2-verify.mjs` extends the existing `N-B01..N-B17` negative checks and `V-00..V-10` verification pipeline with the following mandatory rules:

| Check ID | Category | Rule Name | Trigger / Pass Condition | Enforcement Action |
| :--- | :--- | :--- | :--- | :--- |
| **N-B13+** | Negative | Microgravity Copy Guard | Any `observation` string contains forbidden terms (`水位`, `液位`, `water level`, `liquid level`, `验证通过`, `硬件已验证`). | Reject submission (`exit 1`) |
| **N-B18** | Negative | Unbacked Evidence Anchor | An evidence anchor references a variable or high-res window $[t_a, t_b]$ whose temporal overlap with the referenced `query_ledger` entry (`backed_by_query_seq`) is less than $80\%$ of $(t_b - t_a)$. | Reject submission (`exit 1`) |
| **N-B19** | Negative | Query Budget Overflow | Cumulative `budget_used_points` exceeds $B_{\text{max}} = 180$, or any entry's `cost_points` does not equal `variables.length * returned_rows`. | Reject submission (`exit 1`) |
| **N-B20** | Negative | Ledger Replay Hash Mismatch | Replaying `query_ledger.entries[k]` against `blind_pack.json` produces a `slice_sha256` or `returned_rows` different from the submitted ledger. | Reject submission (`exit 1`) |
| **V-11a** | Scoring | Onset Anchor Grounding | Onset anchor covers $t_{\text{fault}}^*$ with window width $\le 2.0\text{ s}$, cites a `query_seq` with `includes_pre_post=true`, and matches the primary onset `rule_id`. | Awards $+15.0\text{ pts}$ |
| **V-11b** | Scoring | Propagation Anchor Grounding | Propagation anchor covers at least $5.0\text{ s}$ post-fault evolution ($t_{\text{end}} \ge t_{\text{fault}}^* + 5.0\text{ s}$) and matches the correct feedback/state `rule_id`. | Awards $+15.0\text{ pts}$ |

---

### 3.4 Level 2 Deterministic Scoring Formula (`score_hash` Seal)

For each episode, `tools/arena2-verify.mjs` computes a deterministic score $S_{\text{total}} \in [0.0, 100.0]$ rounded to 4 decimal places:

$$S_{\text{total}} = S_{\text{diag}} + S_{\text{anchor}} + S_{\text{eff}}$$

1. **Diagnostic Accuracy Component ($S_{\text{diag}} \in [0.0, 50.0]$)**:
   - For faulty episodes ($f^* \neq \text{none}$):
     $$S_{\text{diag}} = 20.0 \cdot \mathbb{I}\left(\hat{f} = f^*\right) + 15.0 \cdot \mathbb{I}\left(\hat{m} = m^*\right) + 15.0 \cdot \mathbb{I}\left(\left|\hat{t}_0 - t_0^*\right| \le 0.1\right)$$
   - For healthy episodes ($f^* = \text{none}$, comprising $20\%$ of the evaluation pack):
     $$S_{\text{diag}} = 50.0 \cdot \mathbb{I}\left(\hat{f} = \text{none} \text{ and } \hat{t}_0 = \text{null}\right)$$

2. **Mechanistic Evidence Anchor Component ($S_{\text{anchor}} \in [0.0, 30.0]$)**:
   $$S_{\text{anchor}} = \mathbb{I}\left(\hat{f} = f^*\right) \cdot \left(15.0 \cdot \mathbb{I}_{\text{V-11a}} + 15.0 \cdot \mathbb{I}_{\text{V-11b}}\right)$$
   *(Note: For healthy episodes where $\hat{f} = f^* = \text{none}$, $S_{\text{anchor}} = 30.0$ is awarded if at least one valid steady-state residual anchor verified by the ledger is provided.)*

3. **Telemetry Probing Efficiency Component ($S_{\text{eff}} \in [0.0, 20.0]$)**:
   $$S_{\text{eff}} = 20.0 \cdot \mathbb{I}\left(S_{\text{diag}} = 50.0\right) \cdot \min\left(1.0, \max\left(0.0, \frac{B_{\text{max}} - B_{\text{used}}}{B_{\text{max}} - B_{\text{min}}}\right)\right)$$
   where $B_{\text{max}} = 180$ and $B_{\text{min}} = 45$.

---

## 4. Repository Change Manifest and Gate Closure Checklist

### 4.1 File Modification and Addition Matrix

| Gate | File Path | Action | Responsibility |
| :--- | :--- | :--- | :--- |
| **G9** | `tools/backend/fmu/fc001_l1.c` | Create | C99 5-state PEMFC Plant kernel implementing FMI 2.0 Co-Simulation API. |
| **G9** | `tools/backend/fmu/modelDescription.xml` | Create | FMI 2.0 variable dictionary and ValueReference (`VR`) contract for `FC-001`. |
| **G9** | `tools/backend/fmu_runner.py` | Update | Python `ctypes` FMI runner with `20.0-`/`20.0+` left-limit splitting and I-11 shell. |
| **G9** | `tools/oracle/fc001_fmu_oracle.py` | Create | Standalone Python reference oracle (zero imports from `src/**`) emitting `data/golden/fc001_fmu_v1.json`. |
| **G9** | `src/core/plants/` | Update | Complete I-11 S3 migration (`GT-001` and `actuator_fault`) and add `fc001-fmu-adapter.js`. |
| **G9** | `src/core/causal-rules.js` | Update | Register declarative 6-node causal graph rules `FC_RULE_01..06` for `FC-001`. |
| **G9** | `src/core/compare.js` | Update | Add `cross_fidelity_l0_vs_l1_fmu` comparison whitelist predicate. |
| **G10** | `tools/arena2-gen.mjs` | Update | Emit two-tier `coarse_beacon` ($2.0\text{ s}$) and `high_res_store` ($0.1\text{ s}$) in `blind_pack.json`. |
| **G10** | `tools/arena-mcp-server.mjs` | Create | Zero-dependency stdio MCP server enforcing Air-Gap guard, budget cap $B_{\text{max}}=180$, and `query_ledger` sealing. |
| **G10** | `tools/arena2-verify.mjs` | Update | Implement `N-B18..N-B20` ledger replay checks and `V-11` efficiency/anchor scoring. |
| **G9/G10** | `tools/copy-guard.mjs` | Update | Add forbidden microgravity liquid-level patterns (`水位`, `液位`, `water level`, `liquid level`). |

### 4.2 Gate Closure Verification Commands

```powershell
# Gate G9 Verification Suite
python tools/oracle/fc001_fmu_oracle.py --self-check
python scripts/verify_golden.py fc001_fmu
node tests/plants.test.js
node tools/verify-i11-bitidentity.mjs --baseline data/golden/i11_v05_baseline.json

# Gate G10 Verification Suite
node tools/arena-mcp-server.mjs --self-check
node tests/arena-protocol-negative.test.js
node tools/arena2-verify.mjs --session FaultLab-evaluation/NEXT/evidence/g10/eval-session-002

# Full Repository Gate Aggregator & Copy Guard
node tools/copy-guard.mjs
node tools/run-g2.mjs
```

### 4.3 Gate Closure Acceptance Criteria (`R-G9` and `R-G10`)

- [ ] **R-G9-01 (I-11 S3 Bit-Identity)**: Existing 12 baseline configurations across `FL-001` and `FC-001` (`L0`) preserve 100% bit-identical `run_hash`, `signals_sha256`, and `metrics_sha256` against commit baseline `7aed9f6`, while `GT-001` passes all 90 plant adapter assertions via `src/core/plants/`.
- [ ] **R-G9-02 (FMU Golden Parity)**: `python scripts/verify_golden.py fc001_fmu` exits `0` across all 5 whitelisted runs (`FC-Run-1` through `FC-Run-5`, $602\text{ rows}\times 5$), with maximum relative error less than or equal to $10^{-9}$ between the C99 FMU binary and the standalone Python oracle.
- [ ] **R-G9-03 (Deterministic Reproducibility)**: Three consecutive executions of `fmu_runner.py` produce identical `run_hash` and `EvidenceBundle v1.1` checksums (`fmu_sha256` pinned in `V312_BACKEND_ADMISSION_CHECKLIST.md`).
- [ ] **R-G9-04 (Microgravity Terminology Guard)**: `node tools/copy-guard.mjs` exits `0` with zero occurrences of prohibited liquid-level or overclaiming terms across `src/`, `tools/`, `docs/`, and `FaultLab-evaluation/`.
- [ ] **R-G10-01 (Air-Gap and Negative Suite)**: `tests/arena-protocol-negative.test.js` passes 20/20 negative test cases (`N-B01` through `N-B20`), including ledger tampering (`N-B20`), budget overflow (`N-B19`), and unbacked anchor rejection (`N-B18`).
- [ ] **R-G10-02 (Level 2 Benchmark Session Archive)**: At least one complete Level 2 evaluation session (`eval-session-002`) including an external MCP Agent submission is archived under `FaultLab-evaluation/NEXT/evidence/g10/` with reproducible `score_hash` verification.
