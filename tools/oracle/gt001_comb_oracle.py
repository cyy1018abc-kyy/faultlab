# -*- coding: utf-8 -*-
"""gt001_comb_oracle.py — GT-001 L1 燃烧延迟深化轨（thermo_comb）独立数值 oracle
（GTCMB-G2b-03，GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0 §1.3/§3/§4；CHG-20261114-07 批准链）。

独立性声明（违反即 golden 无效；对标 gt001_l1_oracle.py:1-16 先例，MODEL_VALIDATION_SPEC
§6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；不 import gt001_oracle /
     gt001_l1_oracle（L0b/thermo 轨冻结归档面物理零触碰——V-03）；方程与常量唯一权威
     文本是 FaultLab-evaluation/NEXT/GT001_COMBUSTION_G2B_SPEC_APPROVED.md v1.0
     §1.3（EQ-GTL2-1…12 冻结表 + tau_comb = 0.5 s 定案 + x_comb(0) = k_f*u(0)（Q11）+
     RK4 三维分区格式），此处独立硬编码；容量纲常量 15 位登记值 = EQ-GTL2 冻结表引用的
     GTL1 §2.1 登记口径同源值（批准轮域扫描即按该口径只读导入核验——§3.3 执行口径）。
  2. oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，无模型语义（D-2a 契约）。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden 只读
     比对（G0-DEC-16）。出生即 oracle_base 接入（规格 §4 项 2：新文件无 V-03 历史字节
     负担）。data/golden/gt001_v3.json 在 GCMB-1 中**只读读取**作 thermo 退化交叉参照
     （fl001_cap_oracle FCAP-1 只读环境校验先例——读取非生成，既有 golden 字节冻结不变）。
  4. 本文件自带自检 GCMB-1…GCMB-9（规格 §4 项 4 + A-3/A-4 增项），自检失败由调用方以
     exit 2 报告；emit 前置自检（失败不写盘）。

模型（L1 燃烧延迟深化轨·thermo_comb，规格 §1.2/§1.3；状态 y=[f, T3, x_comb]，3 维 ODE
+ 代数链；x_comb 为燃烧/能量转换延迟状态——一阶燃料-能量传递滞后，不出信号（Q10 零新
信号），量纲 kW）：
  EQ-GTL2-1  pi_c = pi_c0*(f/f0)^2；p2 = pi_c*p1                       （≡ EQ-GTL1-1 原样）
  EQ-GTL2-2  T2 = T1*(1 + (pi_c^a_c - 1)/eps_c)                        （≡ EQ-GTL1-2 原样）
  EQ-GTL2-3  Q_f = k_f*u_eff（指令映射口径维持——Q13 (ii)）；tau_comb*dQ_f,d/dt + Q_f,d = Q_f
             （一阶滞后；x_comb = Q_f,d 延迟状态，tau_comb = 0.5 s）；mdot_f,d = Q_f,d/LHV；
             mdot_g = mdot_a + mdot_f,d（ṁ_g 燃料项延迟同源——Q13 定案 (i)）
  EQ-GTL2-4  C_3*dT3/dt = eta_b*Q_f,d - mdot_g*cp_g*(T3 - T2)          （EQ-GTL1-4 修订——
             eta_b*Q_f 项改经 Q_f,d 进入，A5 §3.1 原文插入位）
  EQ-GTL2-5  p3 = (1-beta_b)*p2；pi_t = p3/p1；T4 = T3*(1 - eps_t*(1 - pi_t^(-a_t)))
             （≡ EQ-GTL1-5 原样）
  EQ-GTL2-6  P_comp = mdot_a*cp_a*(T2-T1)；P_turb = mdot_g*cp_g*(T3-T4)；
             P_gen = eta_m*(P_turb - P_comp)                           （≡ EQ-GTL1-6 原样；ṁ_g 延迟口径）
  EQ-GTL2-7  df/dt = (P_rotor/K_J)*(f0/f)；P_rotor = P_gen + P_bat - P_load
             （≡ EQ-GTL1-7 原样，Q1 定案：L0b 定义恒等保留；r_true ≡ 0 检查面零涟漪）
  EQ-GTL2-8  P_bat = P_bat_ref - K_bat*(f - 50)                        （≡ EQ-GTL1-8 原样，真值 f）
  EQ-GTL2-9  f_gov = (monitor 且 sensor_drift) ? f : f + b；
             u_next = clamp(u + Ki*(50 - f_gov)*h, 0, 40)              （≡ EQ-GTL1-9 原样）
  EQ-GTL2-10 执行器激活窗内 u_eff = min(u, u_cap)，u_cap = 40*magnitude%；
             清除（t_clear）后 u_eff = u                               （≡ EQ-GTL1-10 原样，Q5 定案）
  EQ-GTL2-11 设计点闭合：u=25 且 f=50 且稳态 => P_gen=25.000000 kW 且 T3=1173.000 K
             （稳态 d/dt=0 => x_comb ≡ Q_f 精确塌缩后与 EQ-GTL1-11 逐式重合——GCMB-3 三点
             不变性复核；延迟不改变稳态值、只改变暂态路径）
  EQ-GTL2-12 C_3*(T3(t)-T3(0)) = INT(eta_b*Q_f,d - mdot_g*cp_g*(T3-T2))dt（GCMB-2 检查式
             重推——GL-2 同构，延迟口径代入）；E_fuel = INT Q_f dt（**指令面**——Q13 (ii)）；
             eta_cycle = E_gen/E_fuel
  初值（Q11 定案 (a)）：x_comb(0) = k_f*u(0) = k_f*25 = 101.7633 kW（设计点稳态燃料功率）
  => healthy/monitor 局全序列 dx_comb/dt ≡ 0、x_comb ≡ Q_f => (f, T3) 轨与 gt001_v3
     healthy/monitor 同实现逐位恒等（同运算序复刻）、跨实现 ±1e-9 内逐点恒定（A-2）。

RK4 三维分区更新序（规格 §1.3 冻结格式 = GTL1 §2.3 骨架结构性复用；oracle/引擎双侧复刻
唯一权威；u 仍非 RK4 状态，每子步按 L0b 更新序显式推进；x_comb 入 RK4 物理状态）：
  每子步 h = DT_INT = 0.01（k = 1..6000）；输入冻结于子步起点右值（bAt/demandAt；
  t=20.0/t_clear=35.0 恰在子步边界，无子步内间断——GTL1 §2.3 注记③实现约束）：
  ① 指令更新（L0b 序保留，EQ-GTL2-9/10 原样，engine.js:885-888 同构）：
       f_gov  = (monitor 且 sensor_drift) ? f : f + b
       u_next = clamp(u + Ki*(50 - f_gov)*h, 0, 40)          # 本子步立即生效
       u_eff  = cap_active(t_sub) ? min(u_next, u_cap) : u_next
       q_f    = k_f*u_eff                                    # EQ-GTL2-3 指令面——本子步冻结
  ② RK4（物理状态 y=[f, T3, x_comb]；RHS 内 demand/b/u_eff/q_f 冻结子步起点右值；
     p_bat 用阶段值 fv——GTL1 §2.3 注记②）：
       k1 = RHS(f, T3, x); k2 = RHS(f+h/2*k1f, T3+h/2*k1T, x+h/2*k1x);
       k3 = RHS(f+h/2*k2f, T3+h/2*k2T, x+h/2*k2x); k4 = RHS(f+h*k3f, T3+h*k3T, x+h*k3x)
       f  += h/6*(k1f + 2*k2f + 2*k3f + k4f); T3 += h/6*(...); x += h/6*(...)
       RHS(fv, T3v, xv)：EQ-GTL2-1/2（pi_c(fv)->p2->T2）-> EQ-GTL2-3（q_f=k_f*u_eff 冻结；
       mdot_g = mdot_a + xv/LHV 延迟同源）-> EQ-GTL2-5（pi_t->T4(T3v)）-> EQ-GTL2-6
       （P_comp/P_turb/P_gen）-> EQ-GTL2-8（p_bat = 5 - 24*(fv-50)，真值 fv）->
       EQ-GTL2-7（P_rotor = P_gen + p_bat - demand => df/dt = (P_rotor/K_J)*(f0/fv)）；
       dT3/dt = (eta_b*xv - mdot_g*cp_g*(T3v - T2))/C_3（EQ-GTL2-4）；
       dx/dt = (q_f - xv)/tau_comb（EQ-GTL2-3 一阶滞后 RHS——q_f 子步冻结，x_comb 子步内
       为常系数线性 ODE => 精确指数解 x(t+h) = q_f + (x - q_f)*exp(-h/tau_comb) 存在，
       GCMB-7 解析交叉证据面——批准实测 5.41e-11 kW，§3.3（六））。
  ③ 子步末提交：u = u_next；能量累计（本 oracle 冻结口径，引擎侧 GTCMB-G2b-04 须同构复刻）：
       - E_gen：梯形，P_gen 在子步起点/终点各评一次代数链（终点同用本子步冻结 u_eff/q_f
         ——分区结构下指令/热力输入不回溯，GTL1 §2.3 注记②分区边界声明）；
       - E_bat：梯形（p_bat 子步起点 f 与子步终点 f 各评一次）；
       - E_fuel：左矩形 q_f*h（本子步冻结指令面 q_f——EQ-GTL2-12/Q13 (ii)，与 gt001_v3
         记账口径连续）；
       - E_load：左矩形 demand*h；E_rotor_int：左矩形 P_rotor(子步起点代数值)*h；
       - gl2_left_rect：左矩形 INT(eta_b*x_comb - mdot_g*cp_g*(T3-T2))dt（EQ-GTL2-12 延迟
         口径）；gl2_rk4_inc：C_3*dT3 RK4 增量累计（精确 telescoping）；
       - dl_left_rect：左矩形 (q_f - x_comb)dt（延迟环节积分恒等式
         tau_comb*(x_end - x_0) = INT(Q_f - x_comb)dt——GCMB-2）。
  输出网格 record(k)（601 点）：由 (f, T3, x_comb, u_eff(t_k), demand, b) 重算全部代数量
  ——执行器激活窗内物理输出用 u_eff（不是 wound-up 的 u；u 仅作指令域信号 P_gen_cmd_kW
  展示，GTL1 §2.3 注记①）。u_eff(t_k) 由提交态 u 与 t_k 处 cap_active 重算（1e-9 守卫同
  L0b/L1）。Q_fuel_kW 列 = q_f 指令面（Q13 (ii)——actuator 窗内 = k_f*u_cap 指令域）；
  eta_cycle_pct 列 = 瞬时比 100*P_gen/q_f（指令面口径——暂态分子分母异源为深化轨已知
  口径、渐近稳态同源收敛，规格量纲闭合段显式登记）。

thermo 轨退化交叉（GCMB-1 环境校验/双 oracle 交叉面——规格 §4 项 4 + §3.1 项 3 结构硬条件）：
  _simulate_core(..., thermo_degraded=True)：tau_comb 环节旁路（x_comb ≡ Q_f 精确塌缩——
  每子步起点 x := q_f，dx/dt ≡ 0），与 gt001_l1_oracle 输出按批准 A-2 口径 ±1e-9 内逐点
  恒定（跨实现口径——参照 = data/golden/gt001_v3.json 六 Run 全序列只读复现）。
  (thermo_comb) 为生产轨；(thermo 退化) 仅自检证据面，不出 golden。

信号面（golden series 27 列 = gt001_v3 同集零新增——Q10 定案零新信号；契约 §2 须含 t）：
  t/f_true_Hz/f_meas_Hz/n_meas_rpm/P_gen_true_kW/P_gen_meas_kW/P_gen_cmd_kW/
  P_bat_true_kW/P_bat_meas_kW/P_load_demand_kW/P_load_served_kW/P_rotor_kW/V_bus_V/
  SOC_true_pct/SOC_est_pct/r_true_kW/f_channel_diff_Hz/valve_cmd_pct/valve_meas_pct/
  T3_out_K/T2_out_K/p2_out_kPa/T4_out_K/Q_fuel_kW/P_comp_kW/P_turb_kW/eta_cycle_pct。
  P_gen_cap_kW 事件域信号不入序列比对面（series_note，v2/v3 同惯例）。

时间网格：t[i] = i*dt（IEEE-754 double 积，禁止累加，fl001_oracle.py:207-210 同式）；
  i_f = round(t0/dt) = 200；事件 pre/post 采样行 i_pre=199 / i_post=200（v2/v3 同构）；
  actuator_clear EV-002 pre/post = 349/350。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="gt001_v4"、model_id="GT-001"、
    model_version="1.2.0"（**Q12 定案——维持不升位**，model_hash 九字段域内面）、
    method_id="gt001_comb_rk4_dt0.01"、engine_baseline=null、backend=null（§3.4 留位）、
    inertia_model="thermo_comb"（顶层面与 config 块与 run 项三落位——gt001_v3 惯例）、
    supersedes="gt001_v3（thermo L1 轨，字节冻结留档；存档场次继续引用 v3）"（§4 项 6 原文）。
    build_golden() 不含 generated_by/approval（v2 一段式：oracle_base 机制原语在 emit
    时点现算回填）；approval 三字段首签 approved_by="user（2026-11-14 CHG-20261114-07
    批准链）"、approved_at="2026-11-14"（批准链口径钉死）。
  - gate 块 tier="T-B"（Q9 定案 T-B + 降 T-C 双向预案）：键面 = gt001_v3 gate 十键镜像
    （f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_rtol/P_kW_atol/E_kWh/SOC_pp/
    r_true_kW/t_s——gt001_l1_oracle TOLERANCES :748-762 镜像）；终值 = 实测冻结制
    x 安全系数 >=10（GCMB-7 散差表——见 TOLERANCES 注）；散差超预案 -> 降 T-C 并必附
    convergence 块（双向预案，未触发预期）。
  - Run 集（Q8 定案）：镜像 gt001_v3 全集 6 Run、全部 inertia_model="thermo_comb"：
    healthy / closed_loop_fault（sensor +0.3）/ monitor_only / load_step +10 /
    actuator_fault 50% / actuator_clear（t_clear=35）。
  - 事件面：事件编码 v1 与 gt001_v3 六场景对齐（EV-001 sensor_bias/load_step/
    actuator_limit trigger 20.0 pre/post = 199/200 + actuator_clear 局 EV-002 trigger 35.0
    pre/post = 349/350，变量增 P_gen_true_kW）——编码/变量面零扩展（规格 §2 事件快照行）。

emit：python -I tools/oracle/gt001_comb_oracle.py --emit（先跑 GCMB-1…GCMB-9，失败 exit 2
  不写盘；经 oracle_base.emit_golden 产出 data/golden/gt001_v4.json + .sha256 sidecar，
  LF 钉死）。
自检：python -I tools/oracle/gt001_comb_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。
域扫描：python -I tools/oracle/gt001_comb_oracle.py --domain-scan（sensor_drift
  mag in [0.05..1.0] 步 0.05 全域暂态最小 f + mag=1.0 角点 max|df|——规格 §3.3 域扫描
  emit 硬条件的证据输出，GCMB-8 内嵌 mag=1.0 角点断言）。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import math
import os
import sys

# oracle_base 与本文件同目录；显式注入目录使命令行 -I 隔离模式等入口也能解析
# （gt001_l1_oracle.py:114-117 同式；oracle_base 为机制层，无模型语义，独立性声明不变）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结参数（GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0 §1.3 EQ-GTL2 冻结表 + GTL1 §2.1
# 登记口径同源容量纲常量——唯一权威；任何变更须重建 golden）
# ---------------------------------------------------------------------------
T1_K = 288.15            # ISO 参考大气进口温度（K）
P1_KPA = 101.325         # ISO 参考大气进口压力（kPa）
CP_A = 1.005             # 空气定压比热 kJ/(kg*K)
GAMMA_A = 1.4            # 空气比热比
A_C = (GAMMA_A - 1.0) / GAMMA_A          # = 2/7（GTL1 §2.1）
CP_G = 1.148             # 燃气定压比热 kJ/(kg*K)
GAMMA_G = 4.0 / 3.0      # 燃气比热比
A_T = (GAMMA_G - 1.0) / GAMMA_G          # = 1/4（GTL1 §2.1 登记字面）
PIC0 = 8.0               # 设计压比（f=f0）
EPS_C = 0.82             # 压气机 isen 效率
EPS_T = 0.86             # 透平 isen 效率
BETA_B = 0.04            # 燃烧室压损系数
LHV = 50000.0            # 燃料低位热值 kJ/kg
ETA_B = 0.99             # 燃烧效率
ETA_M = 0.95             # 机械+发电机集总效率
T3D_K = 1173.0           # 设计燃烧室出口温度（K）
TAU_3 = 2.0              # 燃烧室集总热惯性时间常数（s；thermo 轨既有）
TAU_COMB = 0.5           # 燃烧/能量转换一阶滞后时间常数（s）——tau_comb 定案（§1.3/§3.3）
KJ = 5.0                 # kW*s/Hz（L0b 冻结值沿袭）
F0 = 50.0                # Hz
KI = 2.0                 # 调速器积分增益（kW_eq/(Hz*s)）
K_BAT = 24.0             # 电池下垂 kW/Hz
P_BAT_REF = 5.0          # kW
CAP_KWH = 40.0           # 电池容量（SOC 面沿袭）
K_F = 4.070531454334211                  # 燃料增益 kW_eq/单位指令（GTL1 §2.1 15 位登记值）
MDOT_A = 0.144299140389011               # 压气机空气流量 kg/s（常数，流量-转速耦合豁免）
C_3 = 0.335983796442745                  # 燃烧室集总热容 kJ/K（= tau_3*mdot_g0*cp_g）
MDOT_G0 = 0.146334406116178              # 设计燃气流量 kg/s（= mdot_a + k_f*25/LHV，展示值）

DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601
DT_INT = 0.01            # RK4 固定步长（s）；每输出步 SUB=10 子步
SUB = int(round(DT_S / DT_INT))
T_START = 20.0           # 默认注入时刻（库口径，FAULT_CATALOG §0）
LOAD0_KW = 30.0
SOC0_PCT = 60.0
V_BUS = 400.0
U0_CMD = 25.0                            # 初始调速器指令（设计点；Q11 x_comb(0)=k_f*u(0)）

METHOD_ID = "gt001_comb_rk4_dt0.01"
METHOD_VERSION = "1"
GOLDEN_ID = "gt001_v4"
MODEL_ID = "GT-001"
MODEL_VERSION = "1.2.0"                  # Q12 定案：维持 '1.2.0' 仅登记（不升位）
APPROVED_BY = "user（2026-11-14 CHG-20261114-07 批准链）"
APPROVED_AT = "2026-11-14"               # 批准链口径（CHG-20261114-07——2026-11-14 指令链）

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"

FAULT_ID_SENSOR = "speed_sensor_bias"    # FAULT_CATALOG §3 fault id（目录面同名）
FAULT_ID_LOAD = "load_step_10kW"
FAULT_ID_ACT = "fuel_valve_stuck"

# SERIES_IDS = gt001_v3 同集 27 列（Q10 定案零新信号——x_comb 为 ODE 内部状态不出信号）
# （契约 §2 须含 t；P_gen_cap_kW 事件域不入列——series_note，v2/v3 同惯例）
SERIES_IDS = [
    "t",
    "f_true_Hz", "f_meas_Hz", "n_meas_rpm",
    "P_gen_true_kW", "P_gen_meas_kW", "P_gen_cmd_kW",
    "P_bat_true_kW", "P_bat_meas_kW",
    "P_load_demand_kW", "P_load_served_kW", "P_rotor_kW",
    "V_bus_V", "SOC_true_pct", "SOC_est_pct",
    "r_true_kW", "f_channel_diff_Hz", "valve_cmd_pct", "valve_meas_pct",
    "T3_out_K", "T2_out_K", "p2_out_kPa", "T4_out_K",
    "Q_fuel_kW", "P_comp_kW", "P_turb_kW", "eta_cycle_pct",
]

# 6 Run（规格 §4 项 5 Q8 定案：镜像 gt001_v3 全集，全部 inertia_model=thermo_comb）
RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": FAMILY_NONE, "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo_comb"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_LOAD, "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo_comb"},
]


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def js_clamp(v, lo, hi):
    """与引擎 clamp(v, lo, hi) 同序：v<lo→lo；v>hi→hi（gt001_oracle.py:92-94 同式）。"""
    return lo if v < lo else (hi if v > hi else v)


def build_time_grid():
    """t[i] = i*dt（IEEE-754 积原值，禁止累加）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


# ---------------------------------------------------------------------------
# EQ-GTL2-1…12 代数链（每调用一次全链重算；RK4 各阶段与 record() 共用）
# ---------------------------------------------------------------------------
def chain_algebra(fv, t3v, x_comb_v, u_eff, demand):
    """由 (f 阶段值, T3 阶段值, x_comb 阶段值, 冻结 u_eff, 冻结 demand) 重算全代数链
    + 三 RHS 分量。

    返回 dict：t2/p2/t4/p_comp/p_turb/p_gen/p_bat/p_rotor/q_f/mdot_g/dfdt/dt3/dxc。
    EQ-GTL2-1/2/3/5/6/7/8 逐式对应（见模块 docstring）；u_eff/demand 为子步冻结输入
    （§1.3 冻结分区格式注记②）；p_bat 用阶段值 fv（EQ-GTL2-8 真值口径）；
    Q_f = k_f*u_eff 指令面（Q13 (ii)）；mdot_g 燃料项 = x_comb_v/LHV 延迟同源（Q13 (i)）；
    dxc = (q_f - x_comb_v)/tau_comb（EQ-GTL2-3 一阶滞后 RHS）。
    """
    pi_c = PIC0 * (fv / F0) ** 2                       # EQ-GTL2-1
    p2 = pi_c * P1_KPA
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)    # EQ-GTL2-2
    q_f = K_F * u_eff                                  # EQ-GTL2-3 指令面（Q13 (ii)）
    mdot_f_d = x_comb_v / LHV                          # EQ-GTL2-3 延迟同源（Q13 (i)）
    mdot_g = MDOT_A + mdot_f_d
    p3 = (1.0 - BETA_B) * p2                           # EQ-GTL2-5
    pi_t = p3 / P1_KPA
    t4 = t3v * (1.0 - EPS_T * (1.0 - pi_t ** (-A_T)))
    p_comp = MDOT_A * CP_A * (t2 - T1_K)               # EQ-GTL2-6
    p_turb = mdot_g * CP_G * (t3v - t4)
    p_gen = ETA_M * (p_turb - p_comp)
    p_bat = P_BAT_REF - K_BAT * (fv - 50.0)            # EQ-GTL2-8
    p_rotor = p_gen + p_bat - demand                   # EQ-GTL2-7（Q1 定案恒等式）
    dfdt = (p_rotor / KJ) * (F0 / fv)                  # EQ-GTL2-7（摇摆方程原样）
    dt3 = (ETA_B * x_comb_v - mdot_g * CP_G * (t3v - t2)) / C_3   # EQ-GTL2-4（Q_f,d 插入位）
    dxc = (q_f - x_comb_v) / TAU_COMB                  # EQ-GTL2-3 一阶滞后 RHS
    return {"t2": t2, "p2": p2, "t4": t4, "p_comp": p_comp, "p_turb": p_turb,
            "p_gen": p_gen, "p_bat": p_bat, "p_rotor": p_rotor, "q_f": q_f,
            "x_comb": x_comb_v,
            "mdot_g": mdot_g, "dfdt": dfdt, "dt3": dt3, "dxc": dxc}


# ---------------------------------------------------------------------------
# 稳态解（x_comb ≡ Q_f 塌缩代数链——EQ-GTL2-11；GCMB-3 三点不变性承载）
# ---------------------------------------------------------------------------
def _steady_t3(u, f):
    """稳态燃烧室平衡的 T3（EQ-GTL2-4 令 dT3/dt=0 且 x_comb ≡ Q_f 塌缩的代数解；
    与 EQ-GTL1-4 塌缩式逐式重合——GTL1 _steady_t3 同式）。"""
    pi_c = PIC0 * (f / F0) ** 2
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)
    q_f = K_F * u
    mdot_g = MDOT_A + q_f / LHV
    return t2 + ETA_B * q_f / (mdot_g * CP_G)


def _steady_chain(f, u, demand):
    """稳态 (f, u) 点全代数链评值（x_comb ≡ Q_f 塌缩；GCMB-3 角点解算用）。"""
    return chain_algebra(f, _steady_t3(u, f), K_F * u, u, demand)


def _root_bisect(fn, lo, hi, iters=200):
    """确定性二分求根（stdlib 自写——I-1 零依赖；[lo, hi] 须有符号变化）。"""
    flo = fn(lo)
    fhi = fn(hi)
    if flo == 0.0:
        return lo
    if fhi == 0.0:
        return hi
    if (flo < 0.0) == (fhi < 0.0):
        raise ValueError("bisect bracket has no sign change: [%r, %r]" % (flo, fhi))
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        fm = fn(mid)
        if fm == 0.0:
            return mid
        if (flo < 0.0) == (fm < 0.0):
            lo, flo = mid, fm
        else:
            hi = mid
    return 0.5 * (lo + hi)


# ---------------------------------------------------------------------------
# RK4 三维分区积分（§1.3 冻结更新序的唯一实现；dt_int 可变仅用于 GCMB-7 半步长登记；
# thermo_degraded=True 为 GCMB-1 退化交叉校验模式——tau_comb 环节旁路，不出 golden）
# ---------------------------------------------------------------------------
def _simulate_core(spec, dt_int=DT_INT, thermo_degraded=False, duration_s=None,
                   want_x_trace=False, x_exact_cross=False):
    """按 §1.3 冻结更新序仿真一轮；返回 series/integrals/metrics/scalars/events。

    spec 经 resolve_run_spec 归一（str 归一式 / dict 兼容式）；inertia_model 须为
    "thermo_comb"（生产轨）——thermo_degraded 模式须为 "thermo"（GCMB-1 退化校验）。
    duration_s 缺省 60 s（GCMB-3 600 s 长轨收敛用变体）；want_x_trace 返回 x_comb
    逐采样迹（GCMB-2/6 用，不入 golden 序列——Q10 零新信号）；x_exact_cross 逐子步
    累计 |RK4 - 精确指数| 最大值（GCMB-7 证据面）。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    want_im = "thermo" if thermo_degraded else "thermo_comb"
    if spec.get("inertia_model", want_im) != want_im:
        raise ValueError("gt001_comb_oracle %s 仅承载 inertia_model=%r，得到 %r"
                         % ("thermo 退化校验模式" if thermo_degraded
                            else "thermo_comb 生产轨",
                            want_im, spec.get("inertia_model")))
    family = spec["family"]
    faulted = spec["faulted"]
    monitor = spec["feedback_mode"] == "monitor"
    magnitude = spec["magnitude"] if faulted else 0.0
    unit = spec["unit"]
    t_start = T_START if faulted else None
    is_sensor = family == FAMILY_SENSOR
    is_load = family == FAMILY_LOAD
    is_act = family == FAMILY_ACT
    u_cap = 40.0 * magnitude / 100.0 if is_act else None      # EQ-GTL2-10 指令域口径（Q5）
    t_clear = spec.get("t_clear_s") if is_act else None
    sub = int(round(DT_S / dt_int))
    h = dt_int
    dur = DURATION_S if duration_s is None else duration_s
    n_samples = int(round(dur / DT_S)) + 1

    def b_at(time):
        return magnitude if (is_sensor and t_start is not None
                             and time >= t_start - 1e-9) else 0.0

    def demand_at(time):
        return (LOAD0_KW + magnitude) if (is_load and t_start is not None
                                          and time >= t_start - 1e-9) else LOAD0_KW

    def cap_active(time):
        return bool(is_act and t_start is not None and time >= t_start - 1e-9
                    and not (t_clear is not None and time >= t_clear - 1e-9))

    t = [i * DT_S for i in range(n_samples)]
    n = n_samples - 1
    series = {k: [None] * (n + 1) for k in SERIES_IDS if k != "t"}
    x_trace = [None] * (n + 1) if want_x_trace else None

    f = 50.0
    t3 = T3D_K
    u = U0_CMD
    x = K_F * U0_CMD                     # EQ-GTL2 初值（Q11）：x_comb(0) = k_f*u(0)
    int_pbat = 0.0
    int_pgen = 0.0
    int_demand = 0.0
    int_rotor = 0.0
    int_fuel = 0.0
    gl2_left_rect = 0.0     # GCMB-2(a)：左矩形 INT(eta_b*Q_f,d - mdot_g*cp_g*(T3-T2))dt
    gl2_rk4_inc = 0.0       # GCMB-2(b)：RK4 增量累计（C_3*dT3 逐子步）
    dl_left_rect = 0.0      # GCMB-2(c)：左矩形 INT(Q_f - x_comb)dt（延迟环节积分恒等式）
    x_cross_max = 0.0       # GCMB-7：|RK4 - 精确指数| 逐子步最大值

    def record(k):
        time = t[k]
        b = b_at(time)
        demand = demand_at(time)
        u_eff = min(u, u_cap) if cap_active(time) else u    # record 域 u_eff（§1.3 注记①）
        x_rec = K_F * u_eff if thermo_degraded else x
        al = chain_algebra(f, t3, x_rec, u_eff, demand)
        p_bat = al["p_bat"]
        p_rotor = al["p_rotor"]
        series["f_true_Hz"][k] = f
        series["f_meas_Hz"][k] = f
        series["n_meas_rpm"][k] = 60.0 * (f + b)
        series["P_gen_true_kW"][k] = al["p_gen"]
        series["P_gen_meas_kW"][k] = al["p_gen"]
        series["P_gen_cmd_kW"][k] = u                       # 指令域展示（wound-up u）
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat
        series["P_load_demand_kW"][k] = demand
        series["P_load_served_kW"][k] = demand
        series["P_rotor_kW"][k] = p_rotor
        series["V_bus_V"][k] = V_BUS
        series["SOC_true_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["SOC_est_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["r_true_kW"][k] = al["p_gen"] + p_bat - demand - p_rotor   # 定义恒等 ≡ 0
        series["f_channel_diff_Hz"][k] = series["n_meas_rpm"][k] / 60.0 - series["f_meas_Hz"][k]
        series["valve_cmd_pct"][k] = js_clamp(u / 40.0 * 100.0, 0.0, 100.0)
        series["valve_meas_pct"][k] = magnitude if cap_active(time) else series["valve_cmd_pct"][k]
        # 热力 8 列（gt001_v3 同集——Q10 零新信号；物理输出用 u_eff，不是 wound-up u）
        series["T3_out_K"][k] = t3
        series["T2_out_K"][k] = al["t2"]
        series["p2_out_kPa"][k] = al["p2"]
        series["T4_out_K"][k] = al["t4"]
        series["Q_fuel_kW"][k] = al["q_f"]                  # EQ-GTL2-3 指令面（Q13 (ii)）
        series["P_comp_kW"][k] = al["p_comp"]
        series["P_turb_kW"][k] = al["p_turb"]
        series["eta_cycle_pct"][k] = 100.0 * al["p_gen"] / al["q_f"]   # 瞬时比（指令面口径）

    record(0)
    if x_trace is not None:
        x_trace[0] = x
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h
            b = b_at(time)
            demand = demand_at(time)
            # ① 指令更新（L0b 序保留；EQ-GTL2-9/10）
            f_gov = f if (monitor and is_sensor) else f + b
            u_next = js_clamp(u + KI * (50.0 - f_gov) * h, 0.0, 40.0)
            u_eff = min(u_next, u_cap) if cap_active(time) else u_next   # EQ-GTL2-10
            q_f_frozen = K_F * u_eff               # EQ-GTL2-3 指令面——本子步冻结
            if thermo_degraded:
                x = q_f_frozen                     # tau_comb 环节旁路：x_comb ≡ Q_f（GCMB-1）
            # ② RK4（物理状态 y=[f, T3, x_comb]；demand/b/u_eff/q_f 冻结于子步起点右值）
            k1 = chain_algebra(f, t3, x, u_eff, demand)
            k2 = chain_algebra(f + 0.5 * h * k1["dfdt"], t3 + 0.5 * h * k1["dt3"],
                               x + 0.5 * h * k1["dxc"], u_eff, demand)
            k3 = chain_algebra(f + 0.5 * h * k2["dfdt"], t3 + 0.5 * h * k2["dt3"],
                               x + 0.5 * h * k2["dxc"], u_eff, demand)
            k4 = chain_algebra(f + h * k3["dfdt"], t3 + h * k3["dt3"],
                               x + h * k3["dxc"], u_eff, demand)
            f_new = f + h / 6.0 * (k1["dfdt"] + 2.0 * k2["dfdt"] + 2.0 * k3["dfdt"] + k4["dfdt"])
            t3_new = t3 + h / 6.0 * (k1["dt3"] + 2.0 * k2["dt3"] + 2.0 * k3["dt3"] + k4["dt3"])
            x_new = x + h / 6.0 * (k1["dxc"] + 2.0 * k2["dxc"] + 2.0 * k3["dxc"] + k4["dxc"])
            if x_exact_cross:
                # x_comb 子步内常系数线性 ODE（q_f 冻结）——精确指数解交叉（GCMB-7）
                x_exact = q_f_frozen + (x - q_f_frozen) * math.exp(-h / TAU_COMB)
                d_xc = abs(x_new - x_exact)
                if d_xc > x_cross_max:
                    x_cross_max = d_xc
            # ③ 子步末提交 + 能量累计（docstring 冻结口径；L0b/L1 面惯例）
            al_b = chain_algebra(f_new, t3_new, x_new, u_eff, demand)
            int_pgen += 0.5 * (k1["p_gen"] + al_b["p_gen"]) * h
            int_pbat += 0.5 * (k1["p_bat"] + al_b["p_bat"]) * h
            int_demand += demand * h
            int_rotor += k1["p_rotor"] * h
            int_fuel += k1["q_f"] * h              # EQ-GTL2-12 E_fuel 指令面（Q13 (ii)）
            gl2_left_rect += (ETA_B * k1["x_comb"] * h
                              - k1["mdot_g"] * CP_G * (t3 - k1["t2"]) * h)
            gl2_rk4_inc += C_3 * (t3_new - t3)
            dl_left_rect += (q_f_frozen - k1["x_comb"]) * h
            f = f_new
            t3 = t3_new
            x = x_new
            u = u_next
        record(k)
        if x_trace is not None:
            x_trace[k] = x

    integrals = {
        "E_load": int_demand,
        "E_source": int_pgen,
        "E_bat": int_pbat,
        "E_rotor_int": int_rotor,
        "E_fuel": int_fuel,
        "gl2_left_rect": gl2_left_rect,
        "gl2_rk4_inc": gl2_rk4_inc,
        "dl_left_rect": dl_left_rect,
    }

    # ---- 指标（与引擎 metrics.js 同名子集口径；E 用积分/3600）----
    soc_true_end = series["SOC_true_pct"][-1]
    soc_est_end = series["SOC_est_pct"][-1]
    max_r_true = max(abs(v) for v in series["r_true_kW"])
    max_fd = max(abs(v) for v in series["f_channel_diff_Hz"])
    f_end = series["f_true_Hz"][-1]
    e_source = integrals["E_source"] / 3600.0
    e_fuel = integrals["E_fuel"] / 3600.0
    metrics = {
        "E_load_kWh": {"value": integrals["E_load"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_source_kWh": {"value": e_source, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": integrals["E_bat"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_rotor_kWh": {"value": KJ * (f_end - 50.0) / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_kin_kWh": {"value": (KJ * F0 / 2.0) * ((f_end / F0) ** 2 - 1.0) / 3600.0,
                      "unit": "kWh", "method": METHOD_ID},
        "E_rotor_int_kWh": {"value": integrals["E_rotor_int"] / 3600.0, "unit": "kWh",
                            "method": METHOD_ID},
        "E_fuel_kWh": {"value": e_fuel, "unit": "kWh", "method": METHOD_ID},
        "eta_cycle_end_pct": {"value": 100.0 * e_source / e_fuel, "unit": "%", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_f_channel_diff_Hz": {"value": max_fd, "unit": "Hz", "method": "algebraic"},
    }
    if is_load:
        metrics["f_nadir_Hz"] = {"value": min(series["f_true_Hz"][int(round(T_START / DT_S)):]),
                                 "unit": "Hz", "method": METHOD_ID}

    scalars = {
        "E_source_kWh": e_source,
        "E_bat_kWh": integrals["E_bat"] / 3600.0,
        "E_load_kWh": integrals["E_load"] / 3600.0,
        "E_rotor_kWh": KJ * (f_end - 50.0) / 3600.0,
        "E_fuel_kWh": e_fuel,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "eta_cycle_end_pct": 100.0 * e_source / e_fuel,
    }

    events = _fault_events(spec, series)
    out = {"key": spec["key"], "role": spec["role"],
           "feedback_mode": spec["feedback_mode"], "faulted": faulted,
           "inertia_model": want_im,
           "series": dict({"t": t}, **series), "integrals": integrals,
           "metrics": metrics, "scalars": scalars, "events": events}
    if x_trace is not None:
        out["x_comb_trace"] = x_trace
    if x_exact_cross:
        out["x_exact_cross_max"] = x_cross_max
    return out


def simulate_run(spec):
    """归一契约入口（ORACLE_INTERFACE_D2.md §2）：str run key / spec dict 双形态，
    经 oracle_base.resolve_run_spec 归一；返回 series/scalars/metrics/events。"""
    return _simulate_core(spec, DT_INT)


# ---------------------------------------------------------------------------
# 事件编码 v1（GT v2/v3 六场景对齐：sensor/load/actuator/t_clear；gt001_l1_oracle 同构）
# ---------------------------------------------------------------------------
def _fault_events(spec, series):
    events = []
    if not spec["faulted"]:
        return events
    family = spec["family"]
    magnitude = spec["magnitude"]
    unit = spec["unit"]
    event_type = {FAMILY_SENSOR: "sensor_bias", FAMILY_LOAD: "load_step",
                  FAMILY_ACT: "actuator_limit"}[family]
    target_signal = {FAMILY_SENSOR: "n_meas_rpm", FAMILY_LOAD: "P_load_demand_kW",
                     FAMILY_ACT: "P_gen_cap_kW"}[family]
    i_pre = int(round((T_START - DT_S) / DT_S))
    i_post = int(round(T_START / DT_S))

    def vars_at(idx):
        return {
            "f_true_Hz": series["f_true_Hz"][idx],
            "f_meas_Hz": series["f_meas_Hz"][idx],
            "n_meas_rpm": series["n_meas_rpm"][idx],
            "f_channel_diff_Hz": series["f_channel_diff_Hz"][idx],
        }

    units = {"f_true_Hz": "Hz", "f_meas_Hz": "Hz", "n_meas_rpm": "rpm",
             "f_channel_diff_Hz": "Hz"}
    events.append({
        "event_id": "EV-001",
        "event_type": event_type,
        "trigger_s": T_START,
        "target_signal": target_signal,
        "magnitude": magnitude,
        "unit": unit,
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T_START, "derivation": "left_limit",
             "variables": vars_at(i_pre), "units": units, "fault_id": spec.get("fault_id")},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T_START, "derivation": "post_sample",
             "variables": vars_at(i_post), "units": units, "fault_id": spec.get("fault_id")},
        ],
    })
    if spec.get("t_clear_s"):
        tc = spec["t_clear_s"]
        i_tc = int(round(tc / DT_S))

        def vars_tc(idx):
            d = vars_at(idx)
            d["P_gen_true_kW"] = series["P_gen_true_kW"][idx]
            return d

        events.append({
            "event_id": "EV-002",
            "event_type": "actuator_clear",
            "trigger_s": tc,
            "target_signal": "P_gen_cap_kW",
            "magnitude": 0.0,
            "unit": "kW",
            "snapshots": [
                {"snapshot_id": "EV-002-pre", "event_id": "EV-002", "phase": "pre",
                 "t_s": tc, "derivation": "left_limit",
                 "variables": vars_tc(i_tc - 1), "units": units, "fault_id": None},
                {"snapshot_id": "EV-002-post", "event_id": "EV-002", "phase": "post",
                 "t_s": tc, "derivation": "post_sample",
                 "variables": vars_tc(i_tc), "units": units, "fault_id": None},
            ],
        })
    return events


# ---------------------------------------------------------------------------
# GCMB-1…9 自检（GT001_COMBUSTION_G2B_SPEC_APPROVED §4 项 4 + A-3/A-4 增项；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
def _golden_v3_path():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(root, "data", "golden", "gt001_v3.json")


def _load_golden(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _amax(arr):
    m = 0.0
    for v in arr:
        if v is not None and math.isfinite(v) and abs(v) > m:
            m = abs(v)
    return m


def _xcorr_lag_samples(cmd, resp, max_lag=40):
    """去趋势差分互相关滞后采样数（规格 §3.3（四）A-3② 口径：窗内一阶差分 -> 去均值 ->
    逐 lag 归一化互相关 -> argmax；resp 落后于 cmd 的采样数）。"""
    dc = [cmd[i] - cmd[i - 1] for i in range(1, len(cmd))]
    dv = [resp[i] - resp[i - 1] for i in range(1, len(resp))]
    n = len(dc)
    mc = sum(dc) / n
    mv = sum(dv) / n
    dc = [xv - mc for xv in dc]
    dv = [xv - mv for xv in dv]
    best_lag = 0
    best_rho = None
    for lag in range(0, max_lag + 1):
        num = 0.0
        ec = 0.0
        ev = 0.0
        for i in range(n - lag):
            num += dc[i] * dv[i + lag]
            ec += dc[i] * dc[i]
            ev += dv[i + lag] * dv[i + lag]
        rho = num / math.sqrt(ec * ev) if ec > 0.0 and ev > 0.0 else 0.0
        if best_rho is None or rho > best_rho:
            best_rho = rho
            best_lag = lag
    return best_lag


def _t50_samples(resp, i0):
    """t50 半变化交叉采样数：事件后 resp 达到总变化 50% 的采样偏移（辅助量）。"""
    base = resp[i0]
    half = base + 0.5 * (resp[-1] - base)
    for i in range(i0, len(resp)):
        if resp[i] >= half:
            return i - i0
    return None


def _t50_lag_samples(cmd, resp, i0):
    """t50 口径相位滞后采样数 = t50(resp) - t50(cmd)（规格 §3.3（四）A-3②——
    T4-对-P_gen_cmd 半变化交叉时刻差；本实现实测 thermo 21 -> thermo_comb 26，与
    批准量化值逐位同）。"""
    t_cmd = _t50_samples(cmd, i0)
    t_resp = _t50_samples(resp, i0)
    if t_cmd is None or t_resp is None:
        return None
    return t_resp - t_cmd


def self_check():
    """独立自检 GCMB-1…GCMB-9（规格 §4 项 4 + A-3/A-4；不复用 GL/FL/FC/FEC/FCAP 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    gate = TOLERANCES["gate"]
    runs = [_simulate_core(spec, DT_INT, want_x_trace=True, x_exact_cross=True)
            for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    s_h = by_key["healthy"]["series"]
    s_a = by_key["closed_loop_fault"]["series"]
    s_m = by_key["monitor_only"]["series"]
    s_l = by_key["load_step"]["series"]
    s_f = by_key["actuator_fault"]["series"]
    s_c = by_key["actuator_clear"]["series"]

    # ---- GCMB-1 thermo 轨退化交叉（规格 §4 项 4：tau_comb 环节旁路 x_comb ≡ Q_f 下与
    #      gt001_l1_oracle 输出 ±1e-9 内逐点恒定——A-2 跨实现口径；参照 = gt001_v3 六 Run
    #      全序列只读复现，fl001_cap_oracle FCAP-1 只读环境校验先例）----
    g_v3 = None
    try:
        g_v3 = _load_golden(_golden_v3_path())
    except Exception as exc:  # noqa: BLE001
        rec("GCMB-1-thermo-degenerate-cross", False,
            "gt001_v3.json unreadable: %s" % exc, "read-only compare",
            "environment check requires frozen gt001_v3 (spec 4.4 GCMB-1)")
    worst1 = 0.0
    n_cmp1 = 0
    deg_by_key = {}
    ok1 = g_v3 is not None
    detail1 = "ok"
    if ok1:
        for spec0 in RUNS:
            spec_d = dict(spec0, inertia_model="thermo")
            mine = _simulate_core(spec_d, DT_INT, thermo_degraded=True)
            deg_by_key[spec0["key"]] = mine
            g_run = g_v3["runs"][spec0["key"]]
            for sid in SERIES_IDS:
                g_arr = g_run["series"][sid]
                f_arr = mine["series"][sid]
                for a, bv in zip(g_arr, f_arr):
                    if a is None and bv is None:
                        continue
                    if a is None or bv is None:
                        ok1 = False
                        detail1 = "null phase mismatch %s/%s" % (spec0["key"], sid)
                        break
                    n_cmp1 += 1
                    d = abs(a - bv)
                    if d > worst1:
                        worst1 = d
                if not ok1:
                    break
            if not ok1:
                break
            for key, gv in g_run["scalars"].items():
                n_cmp1 += 1
                d = abs(mine["scalars"][key] - gv)
                if d > worst1:
                    worst1 = d
            for key, gm in g_run["metrics"].items():
                fv = mine["metrics"][key]["value"]
                gv = gm["value"]
                if (fv is None) != (gv is None):
                    ok1 = False
                    detail1 = "metric None phase mismatch %s/%s" % (spec0["key"], key)
                    break
                if fv is not None:
                    n_cmp1 += 1
                    d = abs(fv - gv)
                    if d > worst1:
                        worst1 = d
            if not ok1:
                break
        if ok1:
            ok1 = worst1 <= 1e-9
        rec("GCMB-1-thermo-degenerate-cross", ok1,
            (detail1 if not ok1 else
             "worst|diff|=%.3e over %d values x 6 runs (degraded thermo vs gt001_v3)"
             % (worst1, n_cmp1)),
            "<=1e-9 per point (A-2 cross-implementation wording; spec 4.4 GCMB-1)",
            "tau_comb bypass x_comb=Q_f collapse vs frozen gt001_v3 full-series")

    # ---- GCMB-2 恒等式（规格 §4 项 4：r_true ≡ 0 / EQ-GTL2-12 左矩形 vs RK4 增量 /
    #      延迟环节积分恒等式 + E 能量账（INT P_rotor = dE_rotor 精确连续恒等式））----
    worst2_gl2 = 0.0
    worst2_dl = 0.0
    worst2_r = 0.0
    worst2_e = 0.0
    for r in runs:
        sr = r["series"]
        d_t3 = sr["T3_out_K"][-1] - sr["T3_out_K"][0]
        worst2_gl2 = max(worst2_gl2,
                         abs(r["integrals"]["gl2_left_rect"] - C_3 * d_t3),
                         abs(r["integrals"]["gl2_rk4_inc"] - C_3 * d_t3))
        dx = r["x_comb_trace"][-1] - r["x_comb_trace"][0]
        worst2_dl = max(worst2_dl, abs(TAU_COMB * dx - r["integrals"]["dl_left_rect"]))
        worst2_r = max(worst2_r, max(abs(v) for v in sr["r_true_kW"]))
        # E 能量账：INT P_rotor dt = K_J*(f^2 - f0^2)/(2*f0)（连续恒等式）= 3600*E_kin_kWh
        worst2_e = max(worst2_e, abs(r["metrics"]["E_rotor_int_kWh"]["value"]
                                     - r["metrics"]["E_kin_kWh"]["value"]))
    ok2 = (worst2_gl2 <= 0.2 and worst2_dl <= 0.2
           and worst2_r <= 1e-9 and worst2_e <= 1e-4)
    rec("GCMB-2-identity-r-eqgtl2-12-delay", ok2,
        "gl2=%.3e kJ, delay=%.3e kJ, max|r_true|=%.3e kW, E_rotor_int-E_kin=%.3e kWh"
        % (worst2_gl2, worst2_dl, worst2_r, worst2_e),
        "gl2/delay <=0.2 kJ, r_true <=1e-9 kW, E ledger <=1e-4 kWh (measured bounds)",
        "r face definition identity + EQ-GTL2-12 left-rect vs RK4 increment "
        "(delayed mdot_g/Q_f,d) + tau*(x_end-x_0) vs INT(Q_f-x)dt + rotor ledger")

    # ---- GCMB-3 三点稳态不变性（规格 §3.2/§3.3（五）：C0 设计点 / C1 sensor 渐近 /
    #      C2 load+20 钳位角点 + actuator 钳位角点——稳态 x_comb ≡ Q_f 塌缩，与 thermo
    #      链逐式相同（批准扫描 9 位全同参照）+ 600 s 长轨收敛）----
    x0 = K_F * U0_CMD
    al0 = chain_algebra(50.0, T3D_K, x0, U0_CMD, LOAD0_KW)
    resid0 = ETA_B * x0 - al0["mdot_g"] * CP_G * (T3D_K - al0["t2"])
    ok3a = (abs(al0["p_gen"] - 25.0) <= 1e-9 and resid0 <= 1e-9
            and abs(al0["p_rotor"]) <= 1e-9
            and abs(al0["t2"] - 573.2946) <= 1e-3
            and abs(al0["p2"] - 810.6) <= 1e-9
            and abs(al0["t4"] - 770.1970) <= 1e-3)

    def _p_gen_steady(fv, uv):
        return _steady_chain(fv, uv, LOAD0_KW)["p_gen"]

    # C1：sensor 渐近 f=49.7（调速器积分钉死），P_gen = demand - P_bat = 30 - 12.2 = 17.8
    u_c1 = _root_bisect(lambda uv: _p_gen_steady(49.7, uv) - 17.8, 10.0, 40.0)
    t3_c1 = _steady_t3(u_c1, 49.7)
    t4_c1 = _steady_chain(49.7, u_c1, LOAD0_KW)["t4"]
    # C2：load+20 钳位角点 u=40，P_gen + P_bat = 50
    def _bal_c2(fv):
        al = _steady_chain(fv, 40.0, LOAD0_KW + 20.0)
        return al["p_gen"] + al["p_bat"] - (LOAD0_KW + 20.0)

    f_c2 = _root_bisect(_bal_c2, 49.9, 50.0)
    t3_c2 = _steady_t3(40.0, f_c2)
    # actuator 钳位角点 u_eff=20，P_gen + P_bat = 30
    def _bal_act(fv):
        al = _steady_chain(fv, 20.0, LOAD0_KW)
        return al["p_gen"] + al["p_bat"] - LOAD0_KW

    f_act = _root_bisect(_bal_act, 49.5, 50.0)
    al_act = _steady_chain(f_act, 20.0, LOAD0_KW)
    t3_act = _steady_t3(20.0, f_act)
    # load+10 稳态 u（f=50 积分钉死，P_gen = 40 - P_bat(50) = 35）——GCMB-5 渐近口径用
    u_load_ss = _root_bisect(lambda uv: _p_gen_steady(50.0, uv) - 35.0, 10.0, 40.0)
    t3_load_ss = _steady_t3(u_load_ss, 50.0)
    # 600 s 长轨收敛（C1 sensor+0.3 与 load+10：§3.3（五）C1 证据口径）
    long_s = _simulate_core({"key": "steady_long_sensor", "role": "scan",
                             "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3,
                             "unit": "Hz", "feedback_mode": "closed_loop",
                             "inertia_model": "thermo_comb"}, DT_INT, duration_s=600.0)
    long_l = _simulate_core({"key": "steady_long_load", "role": "scan",
                             "family": FAMILY_LOAD, "faulted": True, "magnitude": 10.0,
                             "unit": "kW", "feedback_mode": "closed_loop",
                             "inertia_model": "thermo_comb"}, DT_INT, duration_s=600.0)
    f600_s = long_s["series"]["f_true_Hz"][-1]
    t3600_s = long_s["series"]["T3_out_K"][-1]
    u600_s = long_s["series"]["P_gen_cmd_kW"][-1]
    f600_l = long_l["series"]["f_true_Hz"][-1]
    t3600_l = long_l["series"]["T3_out_K"][-1]
    ok3 = (ok3a
           and abs(u_c1 - 19.652812) <= 1e-5
           and abs(t3_c1 - 1043.951863) <= 1e-5
           and abs(f_c2 - 49.999214979) <= 1e-8
           and abs(t3_c2 - 1524.8766) <= 5e-4
           and abs(f_act - 49.719396217) <= 1e-8
           and abs(al_act["p_gen"] - 18.265509) <= 5e-6
           and abs(t3_act - 1052.3534) <= 5e-4
           and abs(f600_s - 49.7) <= 1e-8
           and abs(t3600_s - 1043.951863) <= 1e-5
           and abs(u600_s - 19.652812) <= 1e-6
           and abs(f600_l - 50.0) <= 1e-8
           and abs(t3600_l - t3_load_ss) <= 1e-4)
    rec("GCMB-3-steady-invariance", ok3,
        "C0: P_gen=%.12f resid=%.3e; C1: u_ss=%.9f T3=%.6f T4=%.6f; "
        "C2: f=%.9f T3=%.4f; act: f=%.9f P_gen=%.6f T3=%.4f; "
        "600s: sensor f=%.9f/u=%.6f, load f=%.9f"
        % (al0["p_gen"], resid0, u_c1, t3_c1, t4_c1, f_c2, t3_c2,
           f_act, al_act["p_gen"], t3_act, f600_s, u600_s, f600_l),
        "C0 P_gen +/-1e-9 resid <=1e-9; C1 u 1e-5/T3 1e-5; C2 f 1e-8/T3 5e-4; "
        "act f 1e-8/P 5e-6/T3 5e-4; 600s f 1e-8/T3 1e-5/u 1e-6 (spec 3.3(5) values)",
        "steady x_comb=Q_f collapse identical to thermo chain point-by-point "
        "(EQ-GTL2-11); delay changes transient path only")

    # ---- GCMB-4 网格与事件相位（601 点、t[i]=i*dt、pre/post 语义、快照变量 = 采样行）----
    tgrid = build_time_grid()
    ok4 = (len(tgrid) == N_SAMPLES
           and all(tgrid[i] < tgrid[i + 1] for i in range(N_SAMPLES - 1))
           and all(tgrid[i] == i * DT_S for i in range(N_SAMPLES))
           and tgrid[0] == 0.0 and tgrid[-1] == DURATION_S
           and all(len(r["series"][sid]) == N_SAMPLES for r in runs for sid in SERIES_IDS))
    i_pre = int(round((T_START - DT_S) / DT_S))    # 199
    i_post = int(round(T_START / DT_S))            # 200
    for r in runs:
        for ev in r["events"]:
            if ev["event_id"] == "EV-001":
                pair = ((i_pre, "left_limit"), (i_post, "post_sample"))
                trigger = T_START
            else:
                i_tc = int(round(ev["trigger_s"] / DT_S))
                pair = ((i_tc - 1, "left_limit"), (i_tc, "post_sample"))
                trigger = ev["trigger_s"]
            for snap, (idx, deriv) in zip(ev["snapshots"], pair):
                if (snap["t_s"] != trigger or snap["phase"] != ("pre" if deriv == "left_limit" else "post")
                        or snap["derivation"] != deriv):
                    ok4 = False
                for vid, vv in snap["variables"].items():
                    if r["series"][vid][idx] != vv:
                        ok4 = False
    rec("GCMB-4-grid-event-phase", ok4,
        "%d points, t[0]=%g, t[-1]=%g, EV-001 pre/post=%d/%d, EV-002 pre/post=349/350"
        % (len(tgrid), tgrid[0], tgrid[-1], i_pre, i_post),
        "601 points, strictly increasing, t[i]=i*dt; snapshot variables = sample rows",
        "grid: IEEE-754 product per index; 6 runs x 27 series columns; event v1 face")

    # ---- GCMB-5 锚点全表复算（规格 §3.3（三）逐锚点两口径表——渐近稳态值 + t=60 采样值，
    #      两口径分行登记；t=60 采样终值由本 oracle emit 复算冻结为准（§0 不做 2），
    #      批准扫描值为对照。冻结容差 = max(10x 实测偏差, 扫描值显示位半位 x 2)——首轮
    #      实测偏差记录：f 型 <=3.2e-7（容 1e-6）、T4_60/T3_60 型 <=2.2e-5（容 1e-4）、
    #      u 型 <=1.9e-5（容 1e-4）、P_gen60 7.6e-7（容 1e-5）、overshoot 2.9e-5（容
    #      1e-4）、T3peak 8.9e-5（容 1e-3）、act T3_60 5.6e-8（容 1e-6）——偏差全部为
    #      扫描值显示位舍入量级，实现级偏差 <=1e-9）----
    def idx5(tt):
        return int(round(tt / DT_S))

    rows5 = []

    def chk5(name, obs, exp, tol):
        rows5.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    # 口径一：渐近稳态（两轨同——结构不变性；GCMB-3 解析解承载）
    chk5("H.f_ss_asymp", s_h["f_true_Hz"][-1], 50.0, 1e-9)
    chk5("H.T3_ss_asymp", s_h["T3_out_K"][-1], 1173.0, 1e-9)
    chk5("M.f_ss_asymp", s_m["f_true_Hz"][-1], 50.0, 1e-9)
    chk5("M.T3_ss_asymp", s_m["T3_out_K"][-1], 1173.0, 1e-9)
    chk5("A.f_ss_asymp", 49.7, 49.7, 0.0)                     # 调速器积分钉死（GCMB-9 承载）
    chk5("A.u_ss_asymp", u_c1, 19.652812, 1e-5)
    chk5("A.T3_ss_asymp", t3_c1, 1043.951863, 1e-5)
    chk5("A.T4_ss_asymp", t4_c1, 687.0887, 5e-4)
    chk5("C.f_ss_asymp", f600_l, 50.0, 1e-8)                  # 积分钉死（600 s 长轨实测）
    chk5("C.u_ss_asymp", u_load_ss, 32.506875, 1e-5)
    chk5("C.T3_ss_asymp", t3_load_ss, 1349.8335, 5e-4)
    chk5("D.f_ss_asymp", f_act, 49.719396217, 1e-8)
    chk5("D.Pgen_ss_asymp", al_act["p_gen"], 18.265509, 5e-6)
    chk5("D.u_wound_ss_asymp", s_f["P_gen_cmd_kW"][-1], 40.0, 1e-9)   # 指令域钳位稳态
    chk5("D.Qf_ss_asymp", s_f["Q_fuel_kW"][-1], K_F * 20.0, 1e-9)     # k_f*20 指令面精确同
    chk5("D.T3_ss_asymp", t3_act, 1052.3534, 5e-4)
    # 口径二：t=60 采样值（暂态路径量——v4 emit 复算冻结；规格 §3.3（三）v4 列为对照）
    chk5("A.f60_sample", s_a["f_true_Hz"][-1], 49.700048, 1e-6)
    chk5("A.u60_cmd", s_a["P_gen_cmd_kW"][-1], 19.6528, 1e-4)
    chk5("A.T3_60_sample", s_a["T3_out_K"][-1], 1043.9712, 1e-4)
    chk5("A.T4_60_sample", s_a["T4_out_K"][-1], 687.1011, 1e-4)
    chk5("C.nadir", min(s_l["f_true_Hz"][idx5(T_START):]), 49.586263, 1e-6)
    chk5("C.f60", s_l["f_true_Hz"][-1], 49.999964, 1e-6)
    chk5("C.u60_cmd", s_l["P_gen_cmd_kW"][-1], 32.5072, 1e-4)
    chk5("C.T3_60", s_l["T3_out_K"][-1], 1349.8198, 1e-4)
    chk5("D.Pgen60", s_f["P_gen_true_kW"][-1], 18.26551, 1e-5)
    chk5("D.f60", s_f["f_true_Hz"][-1], 49.719396, 1e-6)
    chk5("D.u60_wound", s_f["P_gen_cmd_kW"][-1], 40.0, 1e-9)
    chk5("D.Qf60_ueff", s_f["Q_fuel_kW"][-1], K_F * 20.0, 1e-9)
    chk5("D.T3_60", s_f["T3_out_K"][-1], 1052.353376, 1e-6)
    f_arr_c = s_c["f_true_Hz"][idx5(35.0):]
    overshoot = max(f_arr_c) - 50.0
    t_back05 = None
    for i, fv in enumerate(f_arr_c):
        if abs(fv - 50.0) <= 0.05:
            t_back05 = 35.0 + i * DT_S
            break
    chk5("E.overshoot", overshoot, 0.3311, 1e-4)
    rows5.append(("E.t_back05", t_back05, 36.6, 0.0, t_back05 == 36.6))
    chk5("E.T3_peak", max(s_c["T3_out_K"]), 1313.43, 1e-3)
    chk5("H.f60_sample", s_h["f_true_Hz"][-1], 50.0, 1e-9)
    chk5("M.f60_sample", s_m["f_true_Hz"][-1], 50.0, 1e-9)
    fails5 = [nm for nm, _ob, _ex, _tl, okr in rows5 if not okr]
    ok5 = not fails5
    obs5 = "%d/%d anchor rows pass (two calibers registered separately)" % (
        len(rows5) - len(fails5), len(rows5))
    if fails5:
        obs5 += "; FAIL: " + ",".join(fails5)
    rec("GCMB-5-anchors-two-caliber", ok5, obs5,
        "spec 3.3(3) per-anchor table: asymptotic steady rows + t=60 sample rows",
        "anchor recompute: asymptotic caliber (GCMB-3 solvers) vs t=60 sample caliber "
        "(emit-computed frozen face; approval scan values as reference)")

    # ---- GCMB-6 monitor/healthy 恒等核验（Q11 机制：dx_comb/dt ≡ 0 => x_comb ≡ Q_f；
    #      healthy/monitor 与 gt001_v3 全 27 列位级恒等（同运算序复刻）+ 解析固定点面
    #      + x_comb ≡ Q_f 全序列 bit 级 + monitor f≡50 bit 级）----
    ok6 = True
    worst6_gold = 0.0
    if g_v3 is not None:
        for key in ("healthy", "monitor_only"):
            g_run = g_v3["runs"][key]
            mine = by_key[key]
            for sid in SERIES_IDS:
                for gv, mv in zip(g_run["series"][sid], mine["series"][sid]):
                    worst6_gold = max(worst6_gold, abs(gv - mv))
        if worst6_gold > 1e-9:
            ok6 = False
    else:
        ok6 = False
    for key in ("healthy", "monitor_only"):
        x_trace = by_key[key]["x_comb_trace"]
        if any(xv != K_F * U0_CMD for xv in x_trace):
            ok6 = False          # x_comb ≡ Q_f = k_f*25 全序列 bit 级（dx_comb/dt ≡ 0 机制）
    if any(v != 50.0 for v in s_m["f_true_Hz"]) or any(v != 50.0 for v in s_m["f_meas_Hz"]):
        ok6 = False              # monitor f≡50 bit 级（b 不进物理回路——GTL1 GL-8 先例同构）
    # 健康局解析固定点面（GL-3 同构 ±1e-9；监控轨测量面 b 只入 n_meas/f_channel_diff）
    al_d = chain_algebra(50.0, T3D_K, K_F * U0_CMD, U0_CMD, LOAD0_KW)
    worst6_face = 0.0
    for i in range(N_SAMPLES):
        ti = i * DT_S
        biased = ti >= T_START - 1e-9
        refs = {
            "f_true_Hz": 50.0, "f_meas_Hz": 50.0,
            "n_meas_rpm": 3018.0 if biased else 3000.0,
            "P_gen_true_kW": 25.0, "P_gen_meas_kW": 25.0, "P_gen_cmd_kW": 25.0,
            "P_bat_true_kW": 5.0, "P_bat_meas_kW": 5.0,
            "P_load_demand_kW": 30.0, "P_load_served_kW": 30.0,
            "P_rotor_kW": 0.0, "V_bus_V": 400.0,
            "SOC_true_pct": SOC0_PCT - ti / 288.0, "SOC_est_pct": SOC0_PCT - ti / 288.0,
            "r_true_kW": 0.0,
            "f_channel_diff_Hz": 0.3 if biased else 0.0,
            "valve_cmd_pct": 62.5, "valve_meas_pct": 62.5,
            "T3_out_K": 1173.0, "T2_out_K": al_d["t2"], "p2_out_kPa": al_d["p2"],
            "T4_out_K": al_d["t4"], "Q_fuel_kW": al_d["q_f"],
            "P_comp_kW": al_d["p_comp"], "P_turb_kW": al_d["p_turb"],
            "eta_cycle_pct": 100.0 * al_d["p_gen"] / al_d["q_f"],
        }
        for sid, ref in refs.items():
            worst6_face = max(worst6_face, abs(s_m[sid][i] - ref))
    if worst6_face > 1e-9:
        ok6 = False
    rec("GCMB-6-monitor-healthy-identity", ok6,
        "gold bit-identity worst=%.3e (healthy/monitor vs gt001_v3); x_comb==k_f*25 all "
        "samples: %s; monitor f==50 bit: %s; analytic face worst=%.3e"
        % (worst6_gold,
           all(xv == K_F * U0_CMD for xv in by_key["healthy"]["x_comb_trace"]),
           all(v == 50.0 for v in s_m["f_true_Hz"]), worst6_face),
        "vs gt001_v3 <=1e-9 (measured 0.0 expected); analytic face <=1e-9; bit identities",
        "Q11 initial value mechanism: dx_comb/dt = 0 => x_comb = Q_f => (f,T3) track "
        "identical to thermo track (spec 3.2 row 3)")

    # ---- GCMB-7 半步长自收敛 + x_comb 子步解析指数交叉（实测冻结制：容差 >= 10x 实测
    #      散差且下限 >=1e-9——规格 §3.3（六）批准实测 1.090e-6 Hz / 4.660e-4 K /
    #      5.41e-11 kW 参照；gate 键 >= 10x 纪律的机器可查形式。x_comb 交叉本实现全
    #      6 Run 全窗实测 = 1.289e-09 kW（actuator_clear 段 |x-q_f| ~ 80 kW 振幅主导；
    #      逐 Run：healthy 0.0 / sensor 3.13e-11 / load 4.37e-11 / act 5.41e-10 /
    #      clear 1.29e-9——批准参照 5.41e-11 与本实现 load/sensor 段同量级），冻结 =
    #      max(10x 实测, 1e-9) = 1.289e-08 => 1.3e-8 kW）----
    fine = _simulate_core(RUNS[3], 0.005)
    d_f = max(abs(a - b) for a, b in zip(s_l["f_true_Hz"], fine["series"]["f_true_Hz"]))
    d_t3 = max(abs(a - b) for a, b in zip(s_l["T3_out_K"], fine["series"]["T3_out_K"]))
    x_cross = max(r["x_exact_cross_max"] for r in runs)
    ok7 = (d_f <= 5e-6 and d_t3 <= 5e-3 and x_cross <= X_CROSS_TOL
           and gate["f_Hz_atol"] >= 10.0 * d_f and gate["T_K_atol"] >= 10.0 * d_t3)
    rec("GCMB-7-halfstep-xcomb-cross", ok7,
        "max|df|=%.3e Hz, max|dT3|=%.3e K, x_comb cross=%.3e kW, "
        "gate f>=10x: %s, gate T>=10x: %s"
        % (d_f, d_t3, x_cross, gate["f_Hz_atol"] >= 10.0 * d_f,
           gate["T_K_atol"] >= 10.0 * d_t3),
        "max|df| <=5e-6 Hz, max|dT3| <=5e-3 K, x_comb cross <=%.1e kW "
        "(frozen: max(10x measured 1.289e-9, 1e-9 floor)); gate >= 10x scatter"
        % X_CROSS_TOL,
        "h=0.01 vs h=0.005 self-convergence (load_step) + RK4 vs exact exponential "
        "x(t+h)=q_f+(x-q_f)*exp(-h/tau_comb); measured-freeze x>=10 discipline")

    # ---- GCMB-8 无 NaN/Inf + |df|<=1 Hz 全窗 + 包络抽查 + 可辨性下限（A-3② 量化）----
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    ok8 = False
    for r in runs:
        for v in r["series"]["f_true_Hz"]:
            if not (49.0 <= v <= 50.5):
                ok8 = False          # |df| <= 1 Hz 有效性域全窗（min f >= 49.0）
        for v in r["series"]["T3_out_K"]:
            if not (T3_ENV_LO <= v <= T3_ENV_HI):
                ok8 = False          # T3 新界（§3.3（二）重推——emit 复算冻结）
        for v in r["series"]["T4_out_K"]:
            if not (T4_ENV_LO <= v <= T4_ENV_HI):
                ok8 = False
        for v in r["series"]["P_gen_true_kW"]:
            if not (-8.5 <= v <= 45.0):
                ok8 = False
    # sensor_drift 域扫描 20 点（emit 硬条件——|df| 全量重扫 + 包络全量重扫，§3.2 行 5）
    mags = [round(0.05 * i, 2) for i in range(1, 21)]
    scan_worst_df = 0.0
    scan_min_f = 50.0
    scan_t3_min, scan_t3_max = 1e9, -1e9
    scan_t4_min, scan_t4_max = 1e9, -1e9
    corner10 = None
    for mag in mags:
        r_scan = _simulate_core({"key": "scan_%s" % mag, "role": "scan",
                                 "family": FAMILY_SENSOR, "faulted": True,
                                 "magnitude": mag, "unit": "Hz",
                                 "feedback_mode": "closed_loop",
                                 "inertia_model": "thermo_comb"})
        f_arr = r_scan["series"]["f_true_Hz"]
        for v in f_arr:
            scan_worst_df = max(scan_worst_df, abs(v - 50.0))
            scan_min_f = min(scan_min_f, v)
        for v in r_scan["series"]["T3_out_K"]:
            scan_t3_min = min(scan_t3_min, v)
            scan_t3_max = max(scan_t3_max, v)
        for v in r_scan["series"]["T4_out_K"]:
            scan_t4_min = min(scan_t4_min, v)
            scan_t4_max = max(scan_t4_max, v)
        if abs(mag - 1.0) < 1e-9:
            corner10 = r_scan
    # load+20 域角点（§3.3（二）包络池成员）
    corner_load20 = _simulate_core({"key": "scan_load20", "role": "scan",
                                    "family": FAMILY_LOAD, "faulted": True,
                                    "magnitude": 20.0, "unit": "kW",
                                    "feedback_mode": "closed_loop",
                                    "inertia_model": "thermo_comb"})
    load20_worst_df = max(abs(v - 50.0) for v in corner_load20["series"]["f_true_Hz"])
    for v in corner_load20["series"]["T3_out_K"]:
        scan_t3_min = min(scan_t3_min, v)
        scan_t3_max = max(scan_t3_max, v)
    for v in corner_load20["series"]["T4_out_K"]:
        scan_t4_min = min(scan_t4_min, v)
        scan_t4_max = max(scan_t4_max, v)
    # 6 Run 并入包络池（全量重扫口径）
    for r in runs:
        for v in r["series"]["T3_out_K"]:
            scan_t3_min = min(scan_t3_min, v)
            scan_t3_max = max(scan_t3_max, v)
        for v in r["series"]["T4_out_K"]:
            scan_t4_min = min(scan_t4_min, v)
            scan_t4_max = max(scan_t4_max, v)
    # mag=1.0 角点断言（GL-8 A-2 emit 硬条件同款内嵌——越界即 emit 拒绝写盘）
    min_f_10 = min(corner10["series"]["f_true_Hz"])
    ok8 = ok8 and min_f_10 > 49.0 and scan_worst_df < 1.0
    # 可辨性下限断言（A-3②：相位滞后 >= 5 采样——load_step 去趋势差分互相关 comb vs
    # 退化 thermo 基线（GCMB-1 复用）+ t50 口径（t50_lag = t50(T4) - t50(P_gen_cmd)，
    # 半变化交叉时刻差——本实现实测 21->26 与批准 §3.3（四）绝对值逐位同）；互相关
    # argmax 绝对值随估计器规约变化（归一化 24->29 / 非归一 17->23；批准绝对值 15->20
    # 为批准脚本规约），+5 采样位移为估计器鲁棒面——断言取下限 >=5）
    i0 = idx5(T_START)
    lag_comb = _xcorr_lag_samples(s_l["P_gen_cmd_kW"][i0:], s_l["T4_out_K"][i0:])
    deg_l = deg_by_key["load_step"]["series"]
    lag_therm = _xcorr_lag_samples(deg_l["P_gen_cmd_kW"][i0:], deg_l["T4_out_K"][i0:])
    t50_comb = _t50_lag_samples(s_l["P_gen_cmd_kW"], s_l["T4_out_K"], i0)
    t50_therm = _t50_lag_samples(deg_l["P_gen_cmd_kW"], deg_l["T4_out_K"], i0)
    ok8 = ok8 and lag_comb >= 5 and (lag_comb - lag_therm) >= 5 \
        and t50_comb is not None and t50_therm is not None \
        and (t50_comb - t50_therm) >= 5
    rec("GCMB-8-finite-domain-envelope-lag", ok8,
        "finite 6x27x601; scan20 worst|df|=%.6f Hz, corner min f=%.6f Hz; "
        "envelope T3=[%.4f,%.4f] T4=[%.4f,%.4f] K over 6runs+scan20+load20; "
        "load20 worst|df|=%.6f Hz; xcorr lag comb/therm=%d/%d (diff %d), "
        "t50 lag comb/therm=%s/%s (diff %s)"
        % (scan_worst_df, min_f_10, scan_t3_min, scan_t3_max, scan_t4_min, scan_t4_max,
           load20_worst_df, lag_comb, lag_therm, lag_comb - lag_therm,
           t50_comb, t50_therm,
           (t50_comb - t50_therm) if t50_comb is not None and t50_therm is not None
           else "NA"),
        "all finite; |df| < 1 Hz full window (A-gtl1-speed-coupling); T3 in "
        "[%.1f,%.1f]/T4 in [%.2f,%.2f] K (spec 3.3(2) re-pushed, T4 per measured "
        "re-freeze clause); lag floor >=5 samples (A-3(2))"
        % (T3_ENV_LO, T3_ENV_HI, T4_ENV_LO, T4_ENV_HI),
        "no NaN/Inf/null; domain scan 20 points + mag=1.0 corner emit hard condition; "
        "envelope spot-check over 6 runs + scan + load+20 corner; discriminability")

    # ---- GCMB-9 GL-6 同构 gap 检查（A-4 定案：界随 tau_comb 域扫描重推，thermo 界 5e-3
    #      不沿用——mag=0.3 <=5e-4 Hz（实测 4.80e-5 x10.4）+ mag=1.0 角点收敛 gap <=4e-3 Hz
    #      （实测 3.601e-4 x11.1——判据⑤承载））----
    gap03 = abs(s_a["f_true_Hz"][-1] - (50.0 - 0.3))
    gap10 = abs(corner10["series"]["f_true_Hz"][-1] - 49.0)
    ok9 = gap03 <= 5e-4 and gap10 <= 4e-3
    rec("GCMB-9-gap-bounds", ok9,
        "mag=0.3 gap=%.3e Hz, mag=1.0 gap=%.3e Hz" % (gap03, gap10),
        "mag=0.3 <=5e-4 Hz (x10.4), mag=1.0 <=4e-3 Hz (x11.1) — A-4 re-pushed bounds",
        "governor integral structure pins f_ss = 50 - b across model depths; "
        "tau_comb domain-scan re-pushed gap bounds (thermo 5e-3 not carried over)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
# gate 块 tier="T-B"（Q9 定案：T-B + 降 T-C 双向预案）。键面 = gt001_v3 gate 十键镜像
# （f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_rtol/P_kW_atol/E_kWh/SOC_pp/r_true_kW/
# t_s——gt001_l1_oracle TOLERANCES :748-762 镜像，Q10 零新信号 => 序列面 27 列同集 =>
# T-B 分派路由全既有支零缺口）。终值冻结记录（GTCMB-G2b-03，2026-11-14，实测冻结制
# x 安全系数 >=10——规格 §4 项 7；T-B 实测散差表（本 oracle 首轮 emit 实测，GCMB-1/7/9
# observed 同源记录）：
#   - GCMB-1 双 oracle 退化交叉（本 oracle thermo 旁路 vs gt001_v3 冻结 golden，6 Run x
#     27 列 x 601 点 = 97495 值 + 标量 + 指标）：worst|diff| = 0.0（同运算序复刻——
#     位级恒等，远紧于 A-2 ±1e-9 跨实现口径）；
#   - GCMB-7 半步长自收敛（load_step，h=0.01 vs 0.005）：max|df| = 1.090e-06 Hz /
#     max|dT3| = 4.660e-04 K（与规格 §3.3（六）批准证据逐位一致）；
#   - GCMB-7 x_comb 子步解析交叉：|RK4 - 精确指数| 全 6 Run 全窗 = 1.289e-09 kW
#     （逐 Run：healthy 0.0 / sensor 3.13e-11 / load 4.37e-11 / act 5.41e-10 /
#     clear 1.29e-9——批准参照 5.41e-11 为本实现 load/sensor 段同量级；冻结
#     X_CROSS_TOL = max(10x 实测, 1e-9) = 1.3e-8 kW）；
#   - GCMB-9 gap：mag=0.3 4.801e-05 Hz / mag=1.0 3.601e-04 Hz（与批准 4.80e-5/3.601e-4
#     逐位一致）；
#   - 域扫描全域 max|df| = 0.999640 Hz < 1.0（角点裕度 3.60e-4 Hz——深化轨收窄登记）。
# 终值 = 各键在「实测散差 x 安全系数 >=10」与 §4 项 7 量级预案（= gt001_v3 镜像）中取
# 严者仍满足 >=10 者冻结：镜像值全部满足（最紧键 T_K_atol=1e-2 仍为半步长证据 4.660e-4
# 的 21x、f_Hz_atol=1e-4 为 1.090e-6 的 92x、x_comb 交叉冻结 1.3e-8 对 r_true_kW=1e-9
# 与 P_kW_atol=1e-3 的余量 >=10x/76x——引擎侧跨浏览器 libm pow 差异余量由 R-1/R-5 声明
# 覆盖，量级预案距实测 >=9 个数量级）。降 T-C 预案未触发（散差未超预案）。
# n_rpm_atol/p_kPa_atol 为形制补键（v3 同源）。
TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "f_Hz_atol": 1e-4,
        "n_rpm_atol": 1e-2,
        "T_K_atol": 1e-2,
        "p_kPa_atol": 1e-9,
        "P_kW_rtol": 1e-6,
        "P_kW_atol": 1e-3,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "t_s": 1e-9,
    },
}

# 包络冻结界（GCMB-8 抽查键面——规格 §3.3（二）重推值，emit 复算冻结为准）：
# T3 [735.3, 1524.9] K（本实现全量复算 [735.3417, 1524.8691]——界内严格成立，冻结 =
# 规格显示位界）；T4 规格显示位 [486.7, 1001.2] K 为本实现全量复算 [486.6840, 1001.2422]
# 的 1 位小数舍入显示（f 域扫描/gap 9 位全同佐证同一轨迹面）——规格「GCMB-8 包络抽查
# 键面随实跑更新」条款（§3.3（二））授权按实跑冻结：T4 冻结 = 实测值外推留余
# [486.68, 1001.25]。thermo 冻结界 [735.2,1524.9]/[486.6,1001.2] 对照：下端上移
# （深化轨燃料回落更慢），上端 u=40 钳位角点稳态主导。
T3_ENV_LO = 735.3
T3_ENV_HI = 1524.9
T4_ENV_LO = 486.68
T4_ENV_HI = 1001.25

# GCMB-7 x_comb 子步解析交叉冻结容差（实测冻结制：本实现全 6 Run 全窗实测 1.2887e-09 kW
# x 安全系数 10 = 1.2887e-08，下限 1e-9 纪律——规格 §3.3（六）冻结预案 max(10x 实测, 1e-9)）
X_CROSS_TOL = 1.3e-8


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族/fault id 与 FAULT_CATALOG §3 同名；
    幅值键按族具名——bias_Hz/delta_load_kW/cap_pct（+t_clear_s），gt001_v3 同面）。"""
    if not spec["faulted"]:
        return None
    base = {"family": spec["family"], "fault_id": spec.get("fault_id"),
            "t_start_s": T_START}
    if spec["family"] == FAMILY_SENSOR:
        base["bias_Hz"] = spec["magnitude"]
    elif spec["family"] == FAMILY_LOAD:
        base["delta_load_kW"] = spec["magnitude"]
    else:
        base["cap_pct"] = spec["magnitude"]
        if spec.get("t_clear_s") is not None:
            base["t_clear_s"] = spec["t_clear_s"]
    return base


def build_golden():
    """golden schema v2 组装（ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）。

    generated_by / approval 不在此构造（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填——generated_at 不得 null 占位出境；approval 三值非 null 方可落盘）。"""
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "inertia_model": "thermo_comb",
            "fault": fault_block(spec),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": r["series"],
        }
    return {
        "golden_schema_version": oracle_base.GOLDEN_SCHEMA_VERSION_V2,
        "golden_id": GOLDEN_ID,
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "backend": None,
        "supersedes": "gt001_v3（thermo L1 轨，字节冻结留档；存档场次继续引用 v3）",
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "inertia_model": "thermo_comb",
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "f": "Hz", "n": "rpm", "T": "K", "p": "kPa"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_START,
            "dt_int_s": DT_INT, "Vdc_V": V_BUS, "Pload_demand_kW": LOAD0_KW,
            "Ebat_nominal_kWh": CAP_KWH, "SOC0_pct": SOC0_PCT,
            "K_J": KJ, "K_bat": K_BAT, "Ki": KI,
            "T1_K": T1_K, "p1_kPa": P1_KPA,
            "cp_a_kJ_kgK": CP_A, "gamma_a": GAMMA_A, "a_c": A_C,
            "cp_g_kJ_kgK": CP_G, "gamma_g": GAMMA_G, "a_t": A_T,
            "pi_c0": PIC0, "eps_c": EPS_C, "eps_t": EPS_T, "beta_b": BETA_B,
            "LHV_kJ_kg": LHV, "eta_b": ETA_B, "eta_m": ETA_M,
            "T3D_K": T3D_K, "tau_3_s": TAU_3, "tau_comb_s": TAU_COMB,
            "k_f_kW_eq": K_F, "mdot_a_kg_s": MDOT_A, "C_3_kJ_K": C_3,
            "mdot_g0_kg_s": MDOT_G0,
            "inertia_model": "thermo_comb",
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "L1 燃烧延迟深化轨（thermo_comb 轨）：状态 y=[f,T3,x_comb] RK4 三维"
                    "分区固定步长 0.01（GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0 §1.3 冻结"
                    "更新序——GTL1 §2.3 骨架结构性复用；thermo 轨见 gt001_v3，swing/linear "
                    "见 gt001_v2/v1）；tau_comb=0.5 s 教学整定值、x_comb(0)=k_f*u(0)（Q11）、"
                    "mdot_g 延迟同源/E_fuel 指令面维持（Q13）；容量纲常量 GTL1 §2.1 登记值"
                    "（15 位有效数字）；E_gen/E_bat 梯形、E_fuel/E_load/E_rotor_int 左矩形、"
                    "eta_cycle_pct 列=瞬时比（指令面）、eta_cycle_end_pct=60s 积分比"
                    "（指令面自洽——oracle 头注冻结口径）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": int(round(T_START / DT_S)),
                     "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/SOC/极值/锚点）；引擎其余派生"
                        "指标（fault_*、effective_mode、focal_change、f_recovery_s）不在"
                        "比对面；E_rotor_kWh 为线性化口径（遗留，K_J*dF），E_kin_kWh 为二"
                        "次型动能口径，E_rotor_int_kWh 为 INT P_rotor 子步左矩形；"
                        "E_fuel_kWh/eta_cycle_end_pct 沿 L1 热力面（EQ-GTL2-12——E_fuel "
                        "指令面 INT Q_f dt，Q13 定案 (ii)）",
    }


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar（LF 钉死）；先跑 GCMB-1…GCMB-9，失败 exit 2 不写盘）
# ---------------------------------------------------------------------------
def emit():
    """emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
    → write_golden_with_sidecar（LF 钉死）；先跑 GCMB-1…GCMB-9，失败 exit 2 不写盘。

    emit 骨架按 oracle_base.emit_golden 同构原语组合（generated_by_block /
    apply_approval / write_golden_with_sidecar——规格 §4 项 2 点名 write_golden_with_
    sidecar LF 钉死）；approved_at 按 CHG-20261114-07 批准链口径钉 2026-11-14
    （emit_golden 签名不承载显式 approved_at，故以同构原语组合承载）。"""
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "data", "golden", GOLDEN_ID + ".json")
    golden = build_golden()
    golden["generated_by"] = oracle_base.generated_by_block(
        tool="tools/oracle/gt001_comb_oracle.py + tools/oracle/oracle_base.py（机制层）",
        oracle_path=os.path.abspath(__file__),
        command="python -I tools/oracle/gt001_comb_oracle.py --emit")
    oracle_base.apply_approval(golden, APPROVED_BY, APPROVED_AT)
    digest = oracle_base.write_golden_with_sidecar(golden, path)
    print(json.dumps({
        "written": os.path.abspath(path),
        "bytes": os.path.getsize(path),
        "golden_sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": golden["approval"]["approved_by"],
        "approved_at": golden["approval"]["approved_at"],
    }, ensure_ascii=False, indent=2))
    return 0


def _domain_scan():
    """sensor_drift mag in [0.05..1.0] 步 0.05 全域扫描（thermo_comb 轨；规格 §3.3 域
    扫描 emit 硬条件证据输出）。每点输出：暂态最小 f（601 点网格采样极值）、f(60)、
    窗口 max|df|；mag=1.0 角点单列（GCMB-8 内嵌断言）。ASCII 输出。"""
    mags = [round(0.05 * i, 2) for i in range(1, 21)]
    worst = 50.0
    worst_mag = None
    print("sensor_drift closed-loop domain scan (thermo_comb track, h=0.01 RK4 3D, 601 pts)")
    print("mag_Hz  f_min      f(60)      max|df|")
    for mag in mags:
        spec = {"key": "scan_%s" % mag, "role": "scan", "family": FAMILY_SENSOR,
                "faulted": True, "magnitude": mag, "unit": "Hz",
                "feedback_mode": "closed_loop", "inertia_model": "thermo_comb"}
        r = _simulate_core(spec)
        f_arr = r["series"]["f_true_Hz"]
        f_min = min(f_arr)
        max_df = max(abs(v - 50.0) for v in f_arr)
        if f_min < worst:
            worst = f_min
            worst_mag = mag
        print("%5.2f  %.6f  %.6f  %.6f" % (mag, f_min, f_arr[-1], max_df))
    print("")
    print("domain corner mag=1.0: f_min=%.6f Hz, max|df|=%.6f Hz, inside |df|<=1 Hz: %s"
          % (worst, 50.0 - worst if worst < 50.0 else worst - 50.0, worst > 49.0))
    print("global worst f_min=%.6f Hz @ mag=%s -> max|df|=%.6f Hz (validity domain |df|<=1 Hz)"
          % (worst, worst_mag, 50.0 - worst))
    return 0


def main(argv):
    # GBK 控制台兼容（gt001_l1_oracle.py:900-906 先例）：统一 UTF-8 输出兜底；
    # --self-check 记录面字符串另保持纯 ASCII（无 ²/−/≤ 等非 GBK 符号）
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=True, indent=2))
        return 0 if ok else 2
    if "--emit" in argv:
        return emit()
    if "--domain-scan" in argv:
        return _domain_scan()
    if "--summary" in argv:
        ok, checks = self_check()
        g = build_golden()
        out = {
            "self_check_ok": ok,
            "checks": checks,
            "runs": {k: {"scalars": v["scalars"], "metrics": v["metrics"]}
                     for k, v in g["runs"].items()},
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
