# -*- coding: utf-8 -*-
"""gt001_l1_oracle.py — GT-001 L1 热力学最小集独立数值 oracle（GTL1-G2b-03，GTL1_G2B_SPEC_APPROVED
v1.0 §2/§4；CHG-20261104-12 批准链）。

独立性声明（违反即 golden 无效；对标 fl001_oracle.py:1-10 / pv001_oracle.py:4-13 先例，
MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与常量唯一权威文本是
     FaultLab-evaluation/NEXT/GTL1_G2B_SPEC_APPROVED.md v1.0 §2（EQ-GTL1-1…12 + §2.1
     常量表 15 位有效数字登记值），此处独立硬编码。
  2. 本文件不 import gt001_oracle（L0b swing/linear 轨 oracle，冻结归档债 Q3：物理文件
     零触碰）；不与 FL/FC/PV oracle 共享公式常量（oracle_base 仅承载哈希/批准/写盘/RUNS
     解析等机制助手，无模型语义，D-2a 契约）。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden 只读
     比对（G0-DEC-16）。出生即 oracle_base 接入（规格 §4 项 2：新文件无 V-03 历史字节负担）。
  4. 本文件自带自检 GL-1…GL-8（规格 §4 项 3 逐条），自检失败由调用方以 exit 2 报告；
     emit 前置自检（失败不写盘）。

模型（L1 数值仿真级·教学尺度降阶循环，规格 §0/§1；状态 y=[f, T3]，2 维 ODE + 代数链）：
  EQ-GTL1-1  pi_c = pi_c0*(f/f0)^2；p2 = pi_c*p1            （压比-转速耦合，二次线性化）
  EQ-GTL1-2  T2 = T1*(1 + (pi_c^a_c - 1)/eps_c)             （压气机效率链）
  EQ-GTL1-3  Q_f = k_f*u_eff；mdot_f = Q_f/LHV；mdot_g = mdot_a + mdot_f
  EQ-GTL1-4  C_3*dT3/dt = eta_b*Q_f - mdot_g*cp_g*(T3 - T2)  （燃烧室能量平衡，新动态状态 T3）
  EQ-GTL1-5  p3 = (1-beta_b)*p2；pi_t = p3/p1；T4 = T3*(1 - eps_t*(1 - pi_t^(-a_t)))
  EQ-GTL1-6  P_comp = mdot_a*cp_a*(T2-T1)；P_turb = mdot_g*cp_g*(T3-T4)；
             P_gen = eta_m*(P_turb - P_comp)
  EQ-GTL1-7  df/dt = (P_rotor/K_J)*(f0/f)；P_rotor = P_gen + P_bat - P_load
             （Q1 定案：L0b 定义恒等保留；摇摆方程原样为机械接口）
  EQ-GTL1-8  P_bat = P_bat_ref - K_bat*(f - 50)               （真值 f，engine.js:881 同源）
  EQ-GTL1-9  f_gov = (monitor 且 sensor_drift) ? f : f + b；
             u_next = clamp(u + Ki*(50 - f_gov)*h, 0, 40)     （调速器积分原样，燃料指令域）
  EQ-GTL1-10 执行器激活窗内 u_eff = min(u, u_cap)，u_cap = 40*magnitude%；
             清除（t_clear）后 u_eff = u（Q5 定案：P_gen_cap_kW 保留指令域口径 = u_cap）
  EQ-GTL1-11 设计点闭合：u=25 且 f=50 且稳态 => P_gen=25.000000 kW 且 T3=1173.000 K
             （k_f/mdot_a 由双条件导出，GL-1 复核）
  EQ-GTL1-12 C_3*(T3(t)-T3(0)) = INT(eta_b*Q_f - mdot_g*cp_g*(T3-T2))dt（GL-2 检查式）；
             E_fuel = INT Q_f dt；eta_cycle = E_gen/E_fuel（设计点 24.5668%）

RK4 分区更新序（规格 §2.3 冻结伪代码 = oracle/引擎双侧复刻唯一权威文本；本文件为其
Python stdlib 实现，逐条对应）：
  每子步 h = DT_INT = 0.01（k = 1..6000）；输入冻结于子步起点右值（bAt/demandAt，
  L0b 同口径；t=20.0/t_clear=35.0 恰在子步边界，无子步内间断——§2.3 注记③实现约束）：
  ① 指令更新（L0b 序保留，engine.js:885-888 同构）：
       f_gov  = (monitor 且 sensor_drift) ? f : f + b
       u_next = clamp(u + Ki*(50 - f_gov)*h, 0, 40)          # 本子步立即生效
       u_eff  = cap_active(t_sub) ? min(u_next, u_cap) : u_next
  ② RK4（物理状态 y=[f, T3]；RHS 内 demand/b/u_eff 冻结；p_bat 用阶段值 fv——§2.3 注记②）：
       k1 = RHS(f, T3); k2 = RHS(f+h/2*k1f, T3+h/2*k1T);
       k3 = RHS(f+h/2*k2f, T3+h/2*k2T); k4 = RHS(f+h*k3f, T3+h*k3T)
       f  += h/6*(k1f + 2*k2f + 2*k3f + k4f); T3 += h/6*(k1T + 2*k2T + 2*k3T + k4T)
       RHS(fv, T3v)：EQ-GTL1-1/2（pi_c(fv)->p2->T2）-> EQ-GTL1-3（Q_f=k_f*u_eff 冻结 ->
       mdot_g）-> EQ-GTL1-5（pi_t->T4(T3v)）-> EQ-GTL1-6（P_comp/P_turb/P_gen）->
       EQ-GTL1-8（p_bat = 5 - 24*(fv-50)，真值 fv）-> EQ-GTL1-7（P_rotor = P_gen + p_bat
       - demand）=> df/dt = (P_rotor/K_J)*(f0/fv)；dT3/dt = (eta_b*Q_f - mdot_g*cp_g*(T3v
       - T2))/C_3
  ③ 子步末提交：u = u_next；能量累计（本 oracle 冻结口径，引擎侧须同构复刻）：
       - E_gen：梯形，P_gen 在子步起点/终点各评一次代数链（终点同用本子步冻结 u_eff——
         分区结构下指令/热力输入不回溯，§2.3 注记②的分区边界声明）；
       - E_bat：梯形（p_bat 子步起点 f 与子步终点 f 各评一次）；
       - E_fuel：左矩形 k_f*u_eff*h（本子步冻结 u_eff，物理燃料面）；
       - E_load：左矩形 demand*h；E_rotor_int：左矩形 P_rotor(子步起点代数值)*h。
  输出网格 record(k)（601 点）：由 (f, T3, u_eff(t_k), demand, b) 重算全部代数量——
  执行器激活窗内物理输出用 u_eff（不是 wound-up 的 u；u 仅作指令域信号 P_gen_cmd_kW 展示，
  §2.3 注记①）。u_eff(t_k) 由提交态 u 与 t_k 处 cap_active 重算：
  cap_active(t) = actuator 且 t >= t_start-1e-9 且非（t_clear 非空且 t >= t_clear-1e-9）
  （L0b gt001_oracle.py:177/195 同式 1e-9 守卫）。

信号面（golden series 27 列 = t + GT v2 既有 18 列 + 规格 §1.2 八个新热力信号；§3.4）：
  既有 18 列与 gt001_v2 同名同义（f_true_Hz…valve_meas_pct）；P_gen_cmd_kW 语义 = 调速器
  燃料指令（等效功率指令域 kW_eq，钳位 [0,40] 与阀位映射不变，§1.2）；P_gen_cap_kW 为事件域
  信号（Q5 定案：= u_cap = 40*magnitude%，燃料指令域上限；非空仅 actuator 故障段），与
  gt001_v2 同惯例经事件快照承载、不入序列比对面（series_note）。
  新热力 8 列（B-1 定案：全非盲显，MODEL_STATE/DERIVED，盲包观测面不扩）：
  T3_out_K/T2_out_K/p2_out_kPa/T4_out_K/Q_fuel_kW/P_comp_kW/P_turb_kW/eta_cycle_pct。
  eta_cycle_pct 列 = 瞬时比 100*P_gen/Q_f（逐样本代数量，t=0 即设计值 24.5668%）；
  EQ-GTL1-12 的积分比口径由标量 eta_cycle_end_pct = 100*E_gen(60s)/E_fuel(60s) 承载——
  两口径分列（引擎侧 GTL1-G2b-04 须同构复刻本句）。

时间网格：t[i] = i*dt（IEEE-754 double 积，禁止累加，fl001_oracle.py:207-210 同式）；
  i_f = round(t0/dt) = 200；事件 pre/post 采样行 i_pre=199 / i_post=200（v2 同构）；
  actuator_clear EV-002 pre/post = 349/350。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="gt001_v3"、model_id="GT-001"、
    model_version="1.2.0"、method_id="gt001_l1_rk4_dt0.01"、engine_baseline=null、
    backend=null（§3.4 留位）、inertia_model="thermo"、supersedes=gt001_v2（字节冻结留档）。
    build_golden() 不含 generated_by/approval（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填）；approval 三字段首签 approved_by="user（2026-11-05 CHG-20261104-12 批准链）"。
  - gate 块 tier="T-B"（同法 RK4、独立双实现——ALINE §3 T-B 定义行；库内首个 T-B golden）：
    终值 = JS（Node）双实现实测散差 x 安全系数 >=10 冻结（§4 项 6；实测记录见 TOLERANCES
    注与规格 §3.3 追记）；若散差超预案 -> 降 T-C 并必附 convergence 块（双向预案，未触发）。
  - 事件面与 GT v2 六场景对齐（sensor/load/actuator/t_clear）：EV-001（sensor_bias/load_step/
    actuator_limit，trigger 20.0，pre=左极限 i=199 / post=采样行 i=200，变量 f_true_Hz/
    f_meas_Hz/n_meas_rpm/f_channel_diff_Hz）+ actuator_clear 局 EV-002（trigger 35.0，变量增
    P_gen_true_kW）。v2 的 EV-002 快照 event_id 笔误（"EV-001"，gt001_oracle.py:315）为冻结
    事实不再复制；v3 快照 event_id 正确引用父事件 "EV-002"（无消费方比对该字段）。

emit：python -I tools/oracle/gt001_l1_oracle.py --emit（先跑 GL-1…GL-8，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/gt001_v3.json + .sha256 sidecar，LF 钉死，
  规避 gt001_v2 CRLF 事实 ORACLE_INTERFACE_D2 §6）。
自检：python -I tools/oracle/gt001_l1_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。
域扫描：python -I tools/oracle/gt001_l1_oracle.py --domain-scan（sensor_drift
  mag in [0.05..1.0] 步 0.05 全域暂态最小 f + mag=1.0 角点 max|df|——规格 §3.3 追记 /
  A-2/B-4 emit 硬条件的证据输出，GL-8 内嵌 mag=1.0 角点断言）。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import math
import os
import sys

# oracle_base 与本文件同目录；显式注入目录使命令行 -I 隔离模式等入口也能解析
# （pv001_oracle.py:97-100 同式；oracle_base 为机制层，无模型语义，独立性声明不变）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结参数（GTL1_G2B_SPEC_APPROVED v1.0 §2.1 常量表——唯一权威；任何变更须重建 golden）
# ---------------------------------------------------------------------------
T1_K = 288.15            # ISO 参考大气进口温度（K）
P1_KPA = 101.325         # ISO 参考大气进口压力（kPa）
CP_A = 1.005             # 空气定压比热 kJ/(kg*K)
GAMMA_A = 1.4            # 空气比热比
A_C = (GAMMA_A - 1.0) / GAMMA_A          # = 2/7（§2.1）
CP_G = 1.148             # 燃气定压比热 kJ/(kg*K)
GAMMA_G = 4.0 / 3.0      # 燃气比热比
A_T = (GAMMA_G - 1.0) / GAMMA_G          # = 1/4（§2.1 登记字面）
PIC0 = 8.0               # 设计压比（f=f0）
EPS_C = 0.82             # 压气机 isen 效率
EPS_T = 0.86             # 透平 isen 效率
BETA_B = 0.04            # 燃烧室压损系数
LHV = 50000.0            # 燃料低位热值 kJ/kg
ETA_B = 0.99             # 燃烧效率
ETA_M = 0.95             # 机械+发电机集总效率
T3D_K = 1173.0           # 设计燃烧室出口温度（K）
TAU_3 = 2.0              # 燃烧室集总热惯性时间常数（s；与 L0b tau_g 同值——有意同尺度对照设计）
KJ = 5.0                 # kW*s/Hz（L0b 冻结值沿袭）
F0 = 50.0                # Hz
KI = 2.0                 # 调速器积分增益（kW_eq/(Hz*s)）
K_BAT = 24.0             # 电池下垂 kW/Hz
P_BAT_REF = 5.0          # kW
CAP_KWH = 40.0           # 电池容量（SOC 面沿袭）
K_F = 4.070531454334211                  # 燃料增益 kW_eq/单位指令（A-1 方案 a：评审 A 独立精确解）
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

METHOD_ID = "gt001_l1_rk4_dt0.01"
METHOD_VERSION = "1"
GOLDEN_ID = "gt001_v3"
MODEL_ID = "GT-001"
MODEL_VERSION = "1.2.0"
APPROVED_BY = "user（2026-11-05 CHG-20261104-12 批准链）"

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"

FAULT_ID_SENSOR = "speed_sensor_bias"    # FAULT_CATALOG §3 fault id（目录面同名）
FAULT_ID_LOAD = "load_step_10kW"
FAULT_ID_ACT = "fuel_valve_stuck"

# SERIES_IDS = ['t'] + GT v2 既有 18 序列列 + 规格 §1.2 八个新热力信号 = 27 项
# （契约 §2 须含 t；P_gen_cap_kW 事件域不入列——series_note，v2 同惯例）
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

# 6 Run（规格 §4 项 4：镜像 gt001_v2 全集，全部 inertia_model=thermo）
RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": FAMILY_NONE, "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_LOAD, "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo"},
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
# EQ-GTL1-1…12 代数链（每调用一次全链重算；RK4 各阶段与 record() 共用）
# ---------------------------------------------------------------------------
def chain_algebra(fv, t3v, u_eff, demand):
    """由 (f 阶段值, T3 阶段值, 冻结 u_eff, 冻结 demand) 重算全代数链 + 两 RHS 分量。

    返回 dict：t2/p2/t4/p_comp/p_turb/p_gen/p_bat/p_rotor/q_f/mdot_g/dfdt/dt3。
    EQ-GTL1-1/2/3/5/6/7/8 逐式对应（见模块 docstring）；u_eff/demand 为子步冻结输入
    （§2.3 注记②）；p_bat 用阶段值 fv（EQ-GTL1-8 真值口径）。
    """
    pi_c = PIC0 * (fv / F0) ** 2                       # EQ-GTL1-1
    p2 = pi_c * P1_KPA
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)    # EQ-GTL1-2
    q_f = K_F * u_eff                                  # EQ-GTL1-3
    mdot_f = q_f / LHV
    mdot_g = MDOT_A + mdot_f
    p3 = (1.0 - BETA_B) * p2                           # EQ-GTL1-5
    pi_t = p3 / P1_KPA
    t4 = t3v * (1.0 - EPS_T * (1.0 - pi_t ** (-A_T)))
    p_comp = MDOT_A * CP_A * (t2 - T1_K)               # EQ-GTL1-6
    p_turb = mdot_g * CP_G * (t3v - t4)
    p_gen = ETA_M * (p_turb - p_comp)
    p_bat = P_BAT_REF - K_BAT * (fv - 50.0)            # EQ-GTL1-8
    p_rotor = p_gen + p_bat - demand                   # EQ-GTL1-7（Q1 定案恒等式）
    dfdt = (p_rotor / KJ) * (F0 / fv)                  # EQ-GTL1-7（摇摆方程原样）
    dt3 = (ETA_B * q_f - mdot_g * CP_G * (t3v - t2)) / C_3   # EQ-GTL1-4
    return {"t2": t2, "p2": p2, "t4": t4, "p_comp": p_comp, "p_turb": p_turb,
            "p_gen": p_gen, "p_bat": p_bat, "p_rotor": p_rotor, "q_f": q_f,
            "mdot_g": mdot_g, "dfdt": dfdt, "dt3": dt3}


# ---------------------------------------------------------------------------
# RK4 分区积分（§2.3 冻结更新序的唯一实现；dt_int 可变仅用于 GL-7 半步长自收敛登记）
# ---------------------------------------------------------------------------
def _simulate_core(spec, dt_int=DT_INT):
    """按 §2.3 冻结更新序仿真一轮；返回 series/integrals/metrics/scalars/events。

    spec 经 resolve_run_spec 归一（str 归一式 / dict 兼容式）；inertia_model 须为
    "thermo"（本 oracle 只承载 L1 轨；swing/linear 属 gt001_oracle 冻结归档面）。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    if spec.get("inertia_model", "thermo") != "thermo":
        raise ValueError("gt001_l1_oracle 仅承载 thermo 轨，得到 %r"
                         % (spec.get("inertia_model"),))
    family = spec["family"]
    faulted = spec["faulted"]
    monitor = spec["feedback_mode"] == "monitor"
    magnitude = spec["magnitude"] if faulted else 0.0
    unit = spec["unit"]
    t_start = T_START if faulted else None
    is_sensor = family == FAMILY_SENSOR
    is_load = family == FAMILY_LOAD
    is_act = family == FAMILY_ACT
    u_cap = 40.0 * magnitude / 100.0 if is_act else None      # EQ-GTL1-10 指令域口径（Q5）
    t_clear = spec.get("t_clear_s") if is_act else None
    sub = int(round(DT_S / dt_int))
    h = dt_int

    def b_at(time):
        return magnitude if (is_sensor and t_start is not None
                             and time >= t_start - 1e-9) else 0.0

    def demand_at(time):
        return (LOAD0_KW + magnitude) if (is_load and t_start is not None
                                          and time >= t_start - 1e-9) else LOAD0_KW

    def cap_active(time):
        return bool(is_act and t_start is not None and time >= t_start - 1e-9
                    and not (t_clear is not None and time >= t_clear - 1e-9))

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {k: [None] * (n + 1) for k in SERIES_IDS if k != "t"}

    f = 50.0
    t3 = T3D_K
    u = 25.0
    int_pbat = 0.0
    int_pgen = 0.0
    int_demand = 0.0
    int_rotor = 0.0
    int_fuel = 0.0
    gl2_left_rect = 0.0     # GL-2(a)：左矩形 INT(eta_b*Q_f - mdot_g*cp_g*(T3-T2))dt
    gl2_rk4_inc = 0.0       # GL-2(b)：RK4 增量累计（C_3*dT3 逐子步）

    def record(k):
        time = t[k]
        b = b_at(time)
        demand = demand_at(time)
        u_eff = min(u, u_cap) if cap_active(time) else u    # record 域 u_eff（§2.3）
        al = chain_algebra(f, t3, u_eff, demand)
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
        # 新热力 8 列（§1.2；物理输出用 u_eff，不是 wound-up u——§2.3 注记①）
        series["T3_out_K"][k] = t3
        series["T2_out_K"][k] = al["t2"]
        series["p2_out_kPa"][k] = al["p2"]
        series["T4_out_K"][k] = al["t4"]
        series["Q_fuel_kW"][k] = al["q_f"]
        series["P_comp_kW"][k] = al["p_comp"]
        series["P_turb_kW"][k] = al["p_turb"]
        series["eta_cycle_pct"][k] = 100.0 * al["p_gen"] / al["q_f"]      # 瞬时比（docstring 口径）

    record(0)
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h
            b = b_at(time)
            demand = demand_at(time)
            # ① 指令更新（L0b 序保留；EQ-GTL1-9）
            f_gov = f if (monitor and is_sensor) else f + b
            u_next = js_clamp(u + KI * (50.0 - f_gov) * h, 0.0, 40.0)
            u_eff = min(u_next, u_cap) if cap_active(time) else u_next   # EQ-GTL1-10
            # ② RK4（物理状态 y=[f, T3]；demand/b/u_eff 冻结于子步起点右值）
            k1 = chain_algebra(f, t3, u_eff, demand)
            k2 = chain_algebra(f + 0.5 * h * k1["dfdt"], t3 + 0.5 * h * k1["dt3"], u_eff, demand)
            k3 = chain_algebra(f + 0.5 * h * k2["dfdt"], t3 + 0.5 * h * k2["dt3"], u_eff, demand)
            k4 = chain_algebra(f + h * k3["dfdt"], t3 + h * k3["dt3"], u_eff, demand)
            f_new = f + h / 6.0 * (k1["dfdt"] + 2.0 * k2["dfdt"] + 2.0 * k3["dfdt"] + k4["dfdt"])
            t3_new = t3 + h / 6.0 * (k1["dt3"] + 2.0 * k2["dt3"] + 2.0 * k3["dt3"] + k4["dt3"])
            # ③ 子步末提交 + 能量累计（docstring 冻结口径；L0b 面惯例）
            al_b = chain_algebra(f_new, t3_new, u_eff, demand)
            p_bat_start = k1["p_bat"]
            p_bat_end = al_b["p_bat"]
            int_pgen += 0.5 * (k1["p_gen"] + al_b["p_gen"]) * h
            int_pbat += 0.5 * (p_bat_start + p_bat_end) * h
            int_demand += demand * h
            int_rotor += k1["p_rotor"] * h
            int_fuel += k1["q_f"] * h
            gl2_left_rect += ETA_B * k1["q_f"] * h - k1["mdot_g"] * CP_G * (t3 - k1["t2"]) * h
            gl2_rk4_inc += C_3 * (t3_new - t3)
            f = f_new
            t3 = t3_new
            u = u_next
        record(k)

    integrals = {
        "E_load": int_demand,
        "E_source": int_pgen,
        "E_bat": int_pbat,
        "E_rotor_int": int_rotor,
        "E_fuel": int_fuel,
        "gl2_left_rect": gl2_left_rect,
        "gl2_rk4_inc": gl2_rk4_inc,
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
    return {"key": spec["key"], "role": spec["role"],
            "feedback_mode": spec["feedback_mode"], "faulted": faulted,
            "inertia_model": "thermo",
            "series": dict({"t": t}, **series), "integrals": integrals,
            "metrics": metrics, "scalars": scalars, "events": events}


def simulate_run(spec):
    """归一契约入口（ORACLE_INTERFACE_D2.md §2）：str run key / spec dict 双形态，
    经 oracle_base.resolve_run_spec 归一；返回 series/scalars/metrics/events。"""
    return _simulate_core(spec, DT_INT)


# ---------------------------------------------------------------------------
# 事件编码 v1（GT v2 六场景对齐：sensor/load/actuator/t_clear；gt001_oracle.py:259-321 同构）
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
# 自检 GL-1…GL-8（GTL1_G2B_SPEC_APPROVED §4 项 3 逐条；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
def self_check():
    """独立自检 GL-1…GL-8（规格 §4 项 3；不复用 FL/FC/GT 的 SC/GS/PS 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}

    # GL-1 设计点闭合（EQ-GTL1-11；±1e-9 判据由 §2.1 15 位常量登记保证，A-1 方案 a）：
    # P_gen=25 ±1e-9、燃烧室平衡残差 <=1e-9 kW、P_rotor=0、T2/p2/T4 对 §3.1 预填值。
    al0 = chain_algebra(50.0, T3D_K, 25.0, 30.0)
    resid = ETA_B * al0["q_f"] - al0["mdot_g"] * CP_G * (T3D_K - al0["t2"])
    ok1 = (abs(al0["p_gen"] - 25.0) <= 1e-9 and resid <= 1e-9
           and abs(al0["p_rotor"]) <= 1e-9
           and abs(al0["t2"] - 573.2946) <= 1e-3
           and abs(al0["p2"] - 810.6) <= 1e-9
           and abs(al0["t4"] - 770.1970) <= 1e-3)
    rec("GL-1-design-point", ok1,
        "P_gen=%.12f kW, resid=%.3e kW, P_rotor=%.3e kW, T2=%.6f K, p2=%.4f kPa, T4=%.6f K"
        % (al0["p_gen"], resid, al0["p_rotor"], al0["t2"], al0["p2"], al0["t4"]),
        "P_gen +/-1e-9, resid <=1e-9 kW, T2/T4 +/-1e-3 K (spec 3.1)",
        "EQ-GTL1-11 dual-condition closure with 15-digit constants (spec 2.1)")

    # GL-2 燃烧室离散能量恒等（EQ-GTL1-12 检查式，RK4 累计，判据按实测上界冻结）：
    # (a) 左矩形 INT(eta_b*Q_f - mdot_g*cp_g*(T3-T2))dt vs C_3*(T3_end - T3_0)；
    # (b) RK4 增量累计（精确 telescoping，浮点噪声级）vs C_3*(T3_end - T3_0)。
    worst2 = 0.0
    for r in runs:
        d_t3 = r["series"]["T3_out_K"][-1] - r["series"]["T3_out_K"][0]
        worst2 = max(worst2,
                     abs(r["integrals"]["gl2_left_rect"] - C_3 * d_t3),
                     abs(r["integrals"]["gl2_rk4_inc"] - C_3 * d_t3))
    rec("GL-2-combustor-energy-identity", worst2 <= 0.2, "%.4e kJ" % worst2,
        "<=0.2 kJ (measured upper bound 1.49e-01 kJ over 6 runs, frozen with margin)",
        "left-rect continuous form vs C_3*dT3 + RK4 increment telescoping, 6 runs")

    # GL-3 健康局跨深度恒等（A-1 方案 a 口径：共享信号面与 L0b 健康局 ±1e-9 内逐点恒等；
    # L0b 健康局 = 设计点精确固定点——f=50/P_gen=25/P_bat=5/SOC=60-t/288/r_true=0 解析值，
    # 自含判据、不读 gt001_v2 文件；热力面为常数轨（T3=1173 等，601 点漂移 <=1e-9）。
    # 热力代数参考值取设计点链评值（其与规格 §3.1 预填的一致性已由 GL-1 承载）。
    h = by_key["healthy"]
    s_h = h["series"]
    al_d = chain_algebra(50.0, T3D_K, 25.0, 30.0)
    ok3 = True
    worst3 = 0.0
    for i in range(N_SAMPLES):
        ti = i * DT_S
        refs = {
            "f_true_Hz": 50.0, "f_meas_Hz": 50.0, "n_meas_rpm": 3000.0,
            "P_gen_true_kW": 25.0, "P_gen_meas_kW": 25.0, "P_gen_cmd_kW": 25.0,
            "P_bat_true_kW": 5.0, "P_bat_meas_kW": 5.0,
            "P_load_demand_kW": 30.0, "P_load_served_kW": 30.0,
            "P_rotor_kW": 0.0, "V_bus_V": 400.0,
            "SOC_true_pct": SOC0_PCT - ti / 288.0, "SOC_est_pct": SOC0_PCT - ti / 288.0,
            "r_true_kW": 0.0, "f_channel_diff_Hz": 0.0,
            "valve_cmd_pct": 62.5, "valve_meas_pct": 62.5,
            "T3_out_K": 1173.0, "T2_out_K": al_d["t2"], "p2_out_kPa": al_d["p2"],
            "T4_out_K": al_d["t4"], "Q_fuel_kW": al_d["q_f"],
            "P_comp_kW": al_d["p_comp"], "P_turb_kW": al_d["p_turb"],
            "eta_cycle_pct": 100.0 * al_d["p_gen"] / al_d["q_f"],
        }
        for sid, ref in refs.items():
            worst3 = max(worst3, abs(s_h[sid][i] - ref))
        if worst3 > 1e-9:
            ok3 = False
            break
    rec("GL-3-healthy-fixed-point", ok3, "%.3e (max abs dev)" % worst3,
        "<=1e-9 per-point (shared face vs L0b healthy analytic values; A-1 plan a)",
        "healthy run = EQ-GTL1-11 exact fixed point; thermo face constant track")

    # GL-4 网格：601 点、严格递增、t[i]=i*dt（IEEE-754 积）、端点 0/60、各 Run 全列等长
    t = build_time_grid()
    ok4 = (len(t) == N_SAMPLES
           and all(t[i] < t[i + 1] for i in range(N_SAMPLES - 1))
           and all(t[i] == i * DT_S for i in range(N_SAMPLES))
           and t[0] == 0.0 and t[-1] == DURATION_S
           and all(len(r["series"][sid]) == N_SAMPLES for r in runs for sid in SERIES_IDS))
    rec("GL-4-grid", ok4, "%d points, t[0]=%g, t[-1]=%g" % (len(t), t[0], t[-1]),
        "601 points, strictly increasing, t[i]=i*dt",
        "grid: IEEE-754 product per index; all 6 runs x 27 series columns")

    # GL-5 锚点全表复算（规格 §3.2 终值，按口径列重推；t=60 采样 / 渐近稳态 / 暂态极值）。
    a = by_key["closed_loop_fault"]
    m = by_key["monitor_only"]
    ld = by_key["load_step"]
    ac_f = by_key["actuator_fault"]
    ac_c = by_key["actuator_clear"]
    s_a, s_m, s_l, s_f, s_c = (x["series"] for x in (a, m, ld, ac_f, ac_c))
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def idx(tt):
        return int(round(tt / DT_S))

    # 场景 sensor_drift +0.3 闭环（§3.2 行 1-4；f 渐近 50-b 由 GL-6 承载）
    chk("A.f60_sample", s_a["f_true_Hz"][-1], 49.70050, 2e-3)
    chk("A.u60_cmd", s_a["P_gen_cmd_kW"][-1], 19.65, 0.05)
    chk("A.T3_60_sample", s_a["T3_out_K"][-1], 1044.16, 0.5)
    chk("A.T4_60_sample", s_a["T4_out_K"][-1], 687.22, 0.5)
    # 场景 sensor_drift 仅监测（§3.2 行 5：偏置不进入物理回路，全序列恒等）
    chk("B.f60", s_m["f_true_Hz"][-1], 50.0, 1e-9)
    chk("B.T3_60", s_m["T3_out_K"][-1], 1173.0, 1e-6)
    # 场景 load_step +10（§3.2 行 6-7：nadir=暂态极值；f(60)=t 采样）
    nadir = min(s_l["f_true_Hz"][idx(T_START):])
    chk("C.nadir", nadir, 49.590174, 2e-3)
    chk("C.f60", s_l["f_true_Hz"][-1], 49.999347, 2e-3)
    chk("C.u60_cmd", s_l["P_gen_cmd_kW"][-1], 32.5, 0.1)
    chk("C.T3_60", s_l["T3_out_K"][-1], 1349.6, 1.0)
    # 场景 actuator_fault 50%（§3.2 行 8-9：渐近稳态）
    chk("D.f60", s_f["f_true_Hz"][-1], 49.719396, 2e-3)
    chk("D.Pgen60", s_f["P_gen_true_kW"][-1], 18.266, 0.02)
    chk("D.u60_wound", s_f["P_gen_cmd_kW"][-1], 40.0, 1e-9)
    chk("D.Qf60_ueff", s_f["Q_fuel_kW"][-1], K_F * 20.0, 1e-9)
    # 场景 actuator_clear t_clear=35（§3.2 行 10：过冲=暂态极值采样；回差=过阈值时刻）
    f_arr_c = s_c["f_true_Hz"][idx(35.0):]
    overshoot = max(f_arr_c) - 50.0
    t_back05 = None
    for i, fv in enumerate(f_arr_c):
        if abs(fv - 50.0) <= 0.05:
            t_back05 = 35.0 + i * DT_S
            break
    chk("E.overshoot", overshoot, 0.3221, 5e-3)
    rows.append(("E.t_back05", t_back05, 36.0, 0.0, t_back05 == 36.0))
    chk("E.T3_peak", max(s_c["T3_out_K"]), 1309.6, 1.0)
    # 回路增益（§1.2：稳态增益实测 dP_gen/du = 1.3321，设计点中心差分）
    gain = (chain_algebra(50.0, _steady_t3(25.5, 50.0), 25.5, 30.0)["p_gen"]
            - chain_algebra(50.0, _steady_t3(24.5, 50.0), 24.5, 30.0)["p_gen"])
    chk("F.loop_gain", gain, 1.3321, 5e-4)

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    ok5 = not fails
    obs5 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs5 += "; FAIL: " + ",".join(fails)
    rec("GL-5-anchors", ok5, obs5, "spec 3.2 table (per-column reading, A-3)",
        "anchor recompute: t=60 sample / asymptotic steady / transient extremes")

    # GL-6 sensor 稳态结构（f(60) 与 50-b 差 <= 登记上界；积分结构决定稳态、深度不改稳态）
    gap6 = abs(s_a["f_true_Hz"][-1] - (50.0 - 0.3))
    rec("GL-6-sensor-steady-structure", gap6 <= 5e-3, "%.3e Hz" % gap6, "<=5e-3 Hz",
        "governor integral structure pins f_ss = 50 - b across model depths")

    # GL-7 半步长自收敛登记（h=0.01 vs h=0.005，load_step；§3.5 证据 1.08e-06 Hz / 4.99e-04 K；
    # 冻结容差须 >= 10x 本散差——安全系数纪律的机器可查形式）
    fine = _simulate_core(RUNS[3], 0.005)
    d_f = max(abs(x - y) for x, y in zip(s_l["f_true_Hz"], fine["series"]["f_true_Hz"]))
    d_t3 = max(abs(x - y) for x, y in zip(s_l["T3_out_K"], fine["series"]["T3_out_K"]))
    gate = TOLERANCES["gate"]
    ok7 = (d_f <= 5e-6 and d_t3 <= 5e-3
           and gate["f_Hz_atol"] >= 10.0 * d_f and gate["T_K_atol"] >= 10.0 * d_t3)
    rec("GL-7-halfstep-convergence", ok7,
        "max|df|=%.3e Hz, max|dT3|=%.3e K, gate f>=10x: %s, T>=10x: %s"
        % (d_f, d_t3, gate["f_Hz_atol"] >= 10.0 * d_f, gate["T_K_atol"] >= 10.0 * d_t3),
        "max|df| <=5e-6 Hz, max|dT3| <=5e-3 K; frozen gate >= 10x scatter",
        "h=0.01 vs h=0.005 self-convergence (load_step); safety-factor >= 10 discipline")

    # GL-8 无 NaN/Inf + monitor 恒等 + 域包络抽查（§3.3 三行 + A-2 emit 硬条件角点）
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    ok8 = False
    if any(v != 50.0 for v in s_m["f_true_Hz"]) or any(v != 50.0 for v in s_m["f_meas_Hz"]):
        ok8 = False
    # 域包络抽查：6 Run 的 T3/T4/P_gen/f 全部落注册域包络（§3.3 前三行）
    for r in runs:
        for v in r["series"]["T3_out_K"]:
            if not (735.0 <= v <= 1525.0):
                ok8 = False
        for v in r["series"]["T4_out_K"]:
            if not (486.0 <= v <= 1002.0):
                ok8 = False
        for v in r["series"]["P_gen_true_kW"]:
            if not (-8.5 <= v <= 45.0):
                ok8 = False
        for v in r["series"]["f_true_Hz"]:
            if not (49.0 <= v <= 50.5):
                ok8 = False
    # A-2 emit 硬条件：sensor_drift mag=1.0 暂态最小 f（|df| <= 1 Hz 有效性域，越界即停）
    corner = _simulate_core({"key": "scan_corner", "role": "scan", "family": FAMILY_SENSOR,
                             "faulted": True, "magnitude": 1.0, "unit": "Hz",
                             "feedback_mode": "closed_loop", "inertia_model": "thermo"})
    min_f_10 = min(corner["series"]["f_true_Hz"])
    ok8 = ok8 and min_f_10 > 49.0
    rec("GL-8-finite-monitor-envelope-domain", ok8,
        "finite 6x27x601; monitor f==50; T3 in [735,1525] K; P_gen in [-8.5,45] kW; "
        "mag=1.0 corner min f=%.6f Hz" % min_f_10,
        "all finite; envelopes per spec 3.3; |df| <= 1 Hz validity domain (A-2/B-4)",
        "no NaN/Inf/null; monitor identity; domain envelope + sensor_drift mag=1.0 corner")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


def _steady_t3(u, f):
    """稳态燃烧室平衡的 T3（EQ-GTL1-4 令 dT3/dt=0 的代数解；GL-5 增益锚点辅助）。"""
    pi_c = PIC0 * (f / F0) ** 2
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)
    q_f = K_F * u
    mdot_g = MDOT_A + q_f / LHV
    return t2 + ETA_B * q_f / (mdot_g * CP_G)


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
# gate 块 tier="T-B"（规格 §4 项 6；库内首个 T-B golden）。终值冻结记录（GTL1-G2b-03，
# 2026-11-05）：双实现逐点散差实测 = 本 oracle（CPython 3.x/win64）vs 独立 JS 参考实现
# （Node/V8，按 §2.1/§2.3 独立编写；经 tests/core-load.js 同款 Node 装载环境验证）——
# 6 Run x 26 序列列 + 标量面 max|js-py|：f_Hz 0.0（逐位）、n_rpm 0.0、T_K 2.27e-13、
# p_kPa 1.14e-13、P_kW 4.26e-14、pct 4.97e-14、E_kWh 0.0、SOC_pp 0.0；半步长自收敛
# （GL-7）1.082e-06 Hz / 4.991e-04 K（与规格 §3.5 证据一致）。终值 = 各键在「实测散差
# x 安全系数 >=10」与 §4 项 6 量级预案（f 1e-4/T 1e-2/P rtol 1e-6 atol 1e-3/E 1e-6/
# SOC 1e-5/r_true 1e-9/t 1e-9）中取严者仍满足 >=10 者冻结：预案值全部满足（最紧键
# T_K_atol=1e-2 仍为半步长证据 4.99e-4 的 20x、实测 2.27e-13 的 4.4e10x）；引擎侧跨
# 浏览器 libm pow 差异余量由 R-1 声明覆盖（预案量级距实测 >=9 个数量级）。
# n_rpm_atol / p_kPa_atol 为形制补键（verify_golden series_limit 事件/序列分派面需要，
# PV001 C-3 形制补键先例）：n_rpm = 60*f 通道（>=60*f_Hz_atol=6e-3），p_kPa 实测
# 1.14e-13 x1e3 余量冻结 1e-9。降 T-C 预案未触发（散差未超预案）。
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


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族/fault id 与 FAULT_CATALOG §3 同名；
    幅值键按族具名——pv001_v1 schema v2 bias_W_m2/delta_g_W_m2 先例，单位如实）。"""
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
            "inertia_model": "thermo",
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
        "supersedes": "gt001_v2（swing L0b 轨，字节冻结留档；存档场次继续引用 v2）",
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "inertia_model": "thermo",
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
            "T3D_K": T3D_K, "tau_3_s": TAU_3,
            "k_f_kW_eq": K_F, "mdot_a_kg_s": MDOT_A, "C_3_kJ_K": C_3,
            "mdot_g0_kg_s": MDOT_G0,
            "inertia_model": "thermo",
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "L1 热力学最小集（thermo 轨）：状态 y=[f,T3] RK4 固定步长 0.01 "
                    "（GTL1_G2B_SPEC_APPROVED v1.0 §2.3 冻结更新序；swing/linear 见 "
                    "gt001_v2/v1）；容量纲常量 §2.1 登记值（15 位有效数字）；E_gen/E_bat "
                    "梯形、E_fuel/E_load/E_rotor_int 左矩形、eta_cycle_pct 列=瞬时比、"
                    "eta_cycle_end_pct=60s 积分比（oracle 头注冻结口径）",
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
                        "E_fuel_kWh/eta_cycle_end_pct 为 L1 热力面新增（EQ-GTL1-12）",
    }


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar（LF 钉死）；先跑 GL-1…GL-8，失败 exit 2 不写盘）
# ---------------------------------------------------------------------------
def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "data", "golden", GOLDEN_ID + ".json")
    summary = oracle_base.emit_golden(
        build_golden, path,
        tool="tools/oracle/gt001_l1_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/gt001_l1_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def _domain_scan():
    """sensor_drift mag in [0.05..1.0] 步 0.05 全域扫描（规格 §3.3 追记 / A-2+B-4）。

    每点输出：暂态最小 f（601 点网格采样极值）、f(60)（未收敛位）、窗口 max|df|；
    mag=1.0 角点单列（emit 硬条件）。ASCII 输出。"""
    mags = [round(0.05 * i, 2) for i in range(1, 21)]
    worst = 50.0
    worst_mag = None
    print("sensor_drift closed-loop domain scan (thermo track, h=0.01 RK4, 601 pts)")
    print("mag_Hz  f_min      f(60)      max|df|")
    for mag in mags:
        spec = {"key": "scan_%s" % mag, "role": "scan", "family": FAMILY_SENSOR,
                "faulted": True, "magnitude": mag, "unit": "Hz",
                "feedback_mode": "closed_loop", "inertia_model": "thermo"}
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
    # GBK 控制台兼容（oracle_base.py:729-733 先例）：统一 UTF-8 输出兜底；
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
