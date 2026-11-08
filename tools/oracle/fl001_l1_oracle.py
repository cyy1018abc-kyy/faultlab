# -*- coding: utf-8 -*-
"""fl001_l1_oracle.py — FL-001 L1 单节点集总热模型独立数值 oracle（FLTH-G2b-03，
FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2/§4；CHG-20261107-01 批准链）。

独立性声明（违反即 golden 无效；对标 fl001_oracle.py:1-10 / gt001_l1_oracle.py:4-20 先例，
MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与常量唯一权威文本是
     FaultLab-evaluation/NEXT/FL001_THERMAL_G2B_SPEC_APPROVED.md v1.0 §2
     （EQ-FLTH-1…9 + §2.1 常量表 + §2.3 冻结更新序），此处独立硬编码
     （R0=0.2、alpha=0.01、C_bat=300、h_cool=10、T_amb=298.15）。
  2. 本文件不 import fl001_oracle（L0 解析轨 oracle，字节冻结零触碰）；不与 FL/FC/GT/PV
     oracle 共享公式常量（oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，无模型
     语义，D-2a 契约）。FL-1/FL-3 所用 L0 闭式参照（MODEL_VALIDATION_SPEC §1.2/§1.3
     八条解析式 EQ-1…EQ-6/EQ-A/EQ-B）为本文件内独立复刻，非 import。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden 只读
     比对（G0-DEC-16）。出生即 oracle_base 接入（规格 §4 项 2：新文件无 V-03 历史字节
     负担；GT 先例 GTL1 §4 项 2）。
  4. 本文件自带自检 FL-1…FL-8（规格 §4 项 3 逐条 + 批准轮 A-2 修订），自检失败由调用方
     以 exit 2 报告；emit 前置自检（失败不写盘）。

模型（thermal_model="on" 轨；L1 · 单节点集总热最小集，规格 §0/§1/§2）：
  EQ-FLTH-1  电气面 L0 原样：I_meas = I_true + b(t)；tau·dI_true/dt + I_true = target
             （healthy/sensor 闭环 target = I_ref − b、monitor target = I_ref、tau=1.5 s；
             actuator 轨 target = min(I_ref − b, I_cap)、tau_act=0.4 s、b≡0）；
             P_bat,true = 0.4·I_true。thermal on 不回写电气面（§3.2 复算实证）。
  EQ-FLTH-2  R_int(T_bat) = R0·(1 + alpha·(T_bat − 298.15))   [Ohm；T_bat 单位 K]
  EQ-FLTH-3  P_loss = I_true^2·R_int(T_bat)  [W]；信号面 P_loss_kW = P_loss/1000
  EQ-FLTH-4  C_bat·dT_bat/dt = P_loss − h_cool·(T_bat − T_amb)，T_bat(0) = T_amb = 298.15 K
  EQ-FLTH-5  P_gen,true = P_load − P_bat,true + P_loss   [守恒面 (a)，Q1 定案]
  EQ-FLTH-6  r_true := P_gen,true + P_bat,true − P_load,served − P_loss ≡ 0；
             r_meas := P_gen,true + P_bat,meas − P_load,served − P_loss ≡ 0.4·b(t)  [Q3]
  EQ-FLTH-7  SOC_true = SOC0 − 100·(1/40)·∫[0,t] P_bat,true dt/3600；SOC_est 同式 meas
             （SOC 定义不动；intI/intB 同源于电气面 L0 序）
  EQ-FLTH-8  E_loss = ∫P_loss dt（子步梯形，Q4 定案）；E_source = E_load − E_bat + E_loss
  EQ-FLTH-9  检查式 E_source + E_bat − E_load − E_loss ≡ 0；
             渐近闭式 theta_ss = I^2·R0/(h_cool − I^2·R0·alpha)
             （稳定性条件 h_cool > I^2·R0·alpha）

RK4 分区更新序（规格 §2.3 冻结伪代码 = oracle/引擎双侧复刻唯一权威文本；本文件为其
Python stdlib 实现，逐条对应）：
  每输出步 k = 1..600（0.1 s），每输出步内子步 h = DT_INT = 0.01（j = 0..9，6000 子步/60 s）；
  输入冻结于子步起点右值：b = bAt(t_sub)（plants/fl001.js:34 同口径 1e-9 守卫；
  t=20.0 阶跃落在子步边界，无子步内间断——§2.3 注记③实现约束）：
  ① 电气面（L0 序保留，plants/fl001.js:45-53 stepOf 逐字语义）：I_start = I_true（同时是
     ② 的冻结输入）；st = stepOf(I_start, t_sub, h)（精确指数 + 区间解析积分）；
     I_end = st.y；intI += st.integral；intB += b·h（SOC/E_bat 面零变化）
  ② RK4（热状态 T_bat；RHS 内 I 冻结于 I_start——Q2 定案口径）：
       RHS(T)：theta = T − 298.15；P_loss(I_start,T) = I_start^2·R0·(1+alpha·theta)
               dT/dt = (P_loss − h_cool·theta)/C_bat
       k1 = RHS(T)；k2 = RHS(T+h/2·k1)；k3 = RHS(T+h/2·k2)；k4 = RHS(T+h·k3)
       T_end = T + h/6·(k1 + 2·k2 + 2·k3 + k4)
  ③ E_loss 累计（子步梯形，Q4）：int_ploss += 0.5·(P_loss(I_start,T_start)
     + P_loss(I_end,T_end))·h；子步末提交 I_true = I_end；T_bat = T_end
  输出网格 record(k)（601 点）：由 (I_true(t_k), T_bat(t_k), b(t_k)) 重算全部代数量——
     P_loss_kW = I_true^2·R0·(1+alpha·(T_bat−298.15))/1000（当前状态值，非累计值——
     §2.3 注记②信号面与账本面分离声明）；P_gen = P_load − 0.4·I_true + P_loss_kW
     （EQ-FLTH-5）；r_true/r_meas 按 EQ-FLTH-6；SOC/SOC_est 面与 L0 record() 同式
     （intI/intB 同源，engine.js:537-538 同构）。

能量账本口径（kW·s 面累积，/3600 → kWh；引擎侧 FLTH-G2b-04 须同构复刻本段）：
  E_load = intDemand（左矩形 load0·h，engine.js:548 同构）；E_bat = V·intI（精确指数
  区间积分）；E_loss = intPloss/1000（W·s → kW·s，子步梯形 Q4）；E_source = E_load −
  E_bat + E_loss（EQ-FLTH-8 注册式——与 E_bat 同积分基，保证 EQ-FLTH-9 离散自洽在
  fp 噪声级闭合；FL-2 另以同基异序独立累积 int_pgen 交叉，非独立梯形重积）。

时间网格：t[i] = i·dt（IEEE-754 double 积，禁止累加，fl001_oracle.py:207-210 同式）；
  i_f = round(20/0.1) = 200；t[200] = 20.0 为 post 采样行；事件 pre（left_limit）/
  post（post_sample）语义同 fl001_v1；事件快照变量零扩展（规格 §3.6：维持 L0 变量集
  I_bat_true_A/I_bat_meas_A/bias_A/I_bat_cap_A，T_bat 不入事件快照）。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="fl001_v2"、model_id="FL-001"、
    model_version="1.1.0"（B-1 定案）、method_id="fl001_thermal_rk4_dt0.01"、
    engine_baseline=null、backend=null（§3.4 留位）、thermal_model="on"、
    supersedes=fl001_v1（L0 轨 thermal_model=off，字节冻结留档；存档场次继续引用 v1）。
    build_golden() 不含 generated_by/approval（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填——generated_at 不得 null 占位出境；approval 三值非 null 方可落盘）；
    approval 三字段首签 approved_by="user（2026-11-07 CHG-20261107-01 批准链）"。
  - gate 块 tier="T-B"（同法 RK4、独立双实现——ALINE §3 T-B 定义行）：终值 = 规格 §4 项 6
    修订后预案冻结（I_A_rtol 1e-12 / I_A_atol 1e-15 / T_K_atol 1e-2 / P_kW_rtol 1e-6 /
    P_kW_atol 1e-3 / E_kWh 1e-6 / SOC_pp 1e-5 / r_true_kW 1e-9 / r_meas_kW_atol 1e-9 /
    t_s 1e-9），冻结依据见 TOLERANCES 注（半步长自收敛 ×>=10 裕度 + FL-7 交叉实测）；
    gate 不含 f_Hz_atol（T-B 缺省分支随 verify_golden `_A` 分支补全后不再触达——
    规格 §4 项 6 ① 缺口清单，FLTH-G2b-03/L8 工作面）。降 T-C 预案未触发（实测散差
    未超预案，TOLERANCES 注记实测记录）。
  - 事件面与 fl001_v1 对齐：EV-001（sensor_bias / actuator_limit，trigger 20.0，
    pre=left_limit / post=post_sample，变量集零扩展）。

emit：python -I tools/oracle/fl001_l1_oracle.py --emit（先跑 FL-1…FL-8，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/fl001_v2.json + .sha256 sidecar，LF 钉死，
  oracle_base.py:179-206 字节规范）。
自检：python -I tools/oracle/fl001_l1_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。
域扫描：python -I tools/oracle/fl001_l1_oracle.py --domain-scan（load0 角点扫描 +
  稳定性裕度列——规格 §3.4 域声明证据输出）。

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
# 冻结参数（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.1 常量表——唯一权威；
# 任何变更须重建 golden。L0 电气面参数 = MODEL_VALIDATION_SPEC §1.2 冻结值原样）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
VDC_V = 400.0
IREF_A = 25.0
TAU_S = 1.5          # healthy/sensor 轨（EQ-FLTH-1 双轨之一）
TAU_ACT_S = 0.4      # actuator 轨（EQ-FLTH-1 双轨之二）
MAGNITUDE_PCT = 55.0  # actuator 默认限幅比例（systems.js converter_current_limit default）
I_CAP_A = IREF_A * MAGNITUDE_PCT / 100.0   # 13.75 A
PLOAD_KW = 30.0
EBAT_KWH = 40.0
SOC0_PCT = 60.0

# L1 热面教学参数（§2.1；教学整定值、非实测——A-flth-params 声明）
R0_OHM = 0.2          # 25 degC 参考内阻（Ohm）
ALPHA_PER_K = 0.01    # 内阻温度系数（1/K）
C_BAT_J_K = 300.0     # 单节点集总热容（J/K）
H_COOL_W_K = 10.0     # 牛顿冷却系数（W/K）
T_AMB_K = 298.15      # 环境温度 = T_bat(0)（冷启动）
DT_INT = 0.01         # RK4/子步步长（s）；6000 子步/60 s
SUB = int(round(DT_S / DT_INT))   # 10 子步/输出步

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生，不硬编码字面 601 语义）
I_F = int(round(T_F / DT_S))                     # 200
V_KW_PER_A = VDC_V / 1000.0                      # 0.4 kW/A

METHOD_ID = "fl001_thermal_rk4_dt0.01"
METHOD_VERSION = "1"
GOLDEN_ID = "fl001_v2"
MODEL_ID = "FL-001"
MODEL_VERSION = "1.1.0"   # B-1 定案（v1.0，CHG-20261107-01）：三段式 v2 归一样式
APPROVED_BY = "user（2026-11-07 CHG-20261107-01 批准链）"

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_ACTUATOR = "actuator_fault"

# SERIES_IDS = fl001_v1 全部 14 序列列 + 规格 §1.2 两个新热信号（T_bat_K / P_loss_kW）
# = 16 项（契约 §2 须含 t；顺序与 fl001_v1 惯例一致、新热列按 GTL1 先例尾插；
# P_gen_cmd/P_gen_cap 类指令域列 FL 无对应，不设）
SERIES_IDS = [
    "t", "I_bat_true_A", "I_bat_meas_A", "bias_A", "I_bat_cap_A",
    "P_bat_true_kW", "P_bat_meas_kW", "P_gen_true_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
    "T_bat_K", "P_loss_kW",
]

# 4 Run（规格 §4 项 4：镜像 fl001_v1 全集，全部 thermal_model=on）
RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False, "thermal_model": "on"},
    {"key": "closed_loop_fault", "role": "fault", "family": FAMILY_SENSOR,
     "feedback_mode": "closed_loop", "faulted": True, "thermal_model": "on"},
    {"key": "monitor_only", "role": "monitor", "family": FAMILY_SENSOR,
     "feedback_mode": "monitor", "faulted": True, "thermal_model": "on"},
    {"key": "actuator_closed_loop", "role": "fault", "family": FAMILY_ACTUATOR,
     "feedback_mode": "closed_loop", "faulted": True, "thermal_model": "on"},
]


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def build_time_grid():
    """t[i] = i·dt（IEEE-754 积原值，禁止累加；如 t[199]=19.900000000000002）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def fo_step(y, target, tau, dt):
    """一阶环节精确离散 + 区间解析积分（plants/fl001.js:45-53 / engine.js:464-471 逐字语义）：
    y' = target + (y − target)·e^(−dt/tau)；区间积分 target·dt + (y − target)·tau·(1 − e^(−dt/tau))。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40 else math.exp(-ratio)
    return {
        "y": target + (y - target) * a,
        "integral": target * dt + (y - target) * tau * (1.0 - a),
    }


def p_loss_w(i_val, t_val):
    """EQ-FLTH-2/3：P_loss = I^2·R0·(1 + alpha·(T − 298.15))，单位 W（I: A, R: Ohm）。"""
    theta = t_val - T_AMB_K
    return i_val * i_val * R0_OHM * (1.0 + ALPHA_PER_K * theta)


def rhs_thermal(i_val, t_val):
    """EQ-FLTH-4 RHS：dT/dt = (P_loss − h_cool·theta)/C_bat；同时返回该点 P_loss（W）
    （k1 的 P_loss 即子步梯形起点腿——同一表达式，§2.3 ②③ 同源）。"""
    theta = t_val - T_AMB_K
    pl = i_val * i_val * R0_OHM * (1.0 + ALPHA_PER_K * theta)
    return (pl - H_COOL_W_K * theta) / C_BAT_J_K, pl


# ---------------------------------------------------------------------------
# L0 闭式参照（MODEL_VALIDATION_SPEC §1.2/§1.3 独立复刻——FL-1 冻结锚点环境校验与
# FL-3 电气面跨轨恒等的参照面；非 import fl001_oracle，方程权威 = MODEL_VALIDATION_SPEC
# §1.2/§1.3 + 本规格 §2.2 EQ-FLTH-1「电气面 L0 原样」）
# ---------------------------------------------------------------------------
def _l0_b_at(t, faulted, family=FAMILY_SENSOR):
    """EQ-1：阶跃偏置（仅 sensor_drift 家族；actuator 轨 b≡0）。t = t_f 处取右极限。"""
    if faulted and family == FAMILY_SENSOR and t >= T_F:
        return BIAS_A
    return 0.0


def _l0_i_true_at(t, mode, faulted, family=FAMILY_SENSOR):
    """EQ-3/EQ-B：真实电流闭式解（采样行值，t=t_f 为 post）；monitor 分支按 family 守卫。"""
    if not faulted:
        return IREF_A
    if family == FAMILY_ACTUATOR:
        if t < T_F:
            return IREF_A
        u = t - T_F
        return I_CAP_A + (IREF_A - I_CAP_A) * math.exp(-u / TAU_ACT_S)
    if mode == "monitor":
        return IREF_A
    if t < T_F:
        return IREF_A
    u = t - T_F
    return (IREF_A - BIAS_A) + BIAS_A * math.exp(-u / TAU_S)


def _l0_int_i_true(x, mode, faulted, family=FAMILY_SENSOR):
    """∫[0,x] I_true dt 的解析（事件感知）积分。"""
    if x <= 0.0:
        return 0.0
    if x <= T_F or not faulted:
        return IREF_A * x
    u = x - T_F
    if family == FAMILY_ACTUATOR:
        return (IREF_A * T_F + I_CAP_A * u
                + (IREF_A - I_CAP_A) * TAU_ACT_S * (1.0 - math.exp(-u / TAU_ACT_S)))
    if mode == "monitor":
        return IREF_A * x
    return (IREF_A * T_F + (IREF_A - BIAS_A) * u
            + BIAS_A * TAU_S * (1.0 - math.exp(-u / TAU_S)))


def _l0_int_b(x, faulted, family=FAMILY_SENSOR):
    """∫[0,x] b dt（阶跃点测度为零，事件感知；仅 sensor_drift 家族非零）。"""
    if not faulted or family != FAMILY_SENSOR or x <= T_F:
        return 0.0
    return BIAS_A * (x - T_F)


def _l0_soc_true_at(x, mode, faulted, family=FAMILY_SENSOR):
    e_kws = V_KW_PER_A * _l0_int_i_true(x, mode, faulted, family)
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def _l0_soc_est_at(x, mode, faulted, family=FAMILY_SENSOR):
    e_kws = V_KW_PER_A * (_l0_int_i_true(x, mode, faulted, family)
                          + _l0_int_b(x, faulted, family))
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def _l0_scalars(mode, faulted, family=FAMILY_SENSOR):
    """fl001_v1 标量面（20 键）的闭式复刻——fl001_oracle.simulate_run scalars 表达式逐式同构
    （独立实现，供 FL-1 对冻结 golden 的环境校验）。"""
    t_grid = build_time_grid()
    x_end = t_grid[-1]
    int_i = _l0_int_i_true(x_end, mode, faulted, family)
    int_b = _l0_int_b(x_end, faulted, family)
    e_bat_true = V_KW_PER_A * int_i / 3600.0
    e_bat_meas = V_KW_PER_A * (int_i + int_b) / 3600.0
    e_gen = (PLOAD_KW * x_end - V_KW_PER_A * int_i) / 3600.0
    e_load = PLOAD_KW * x_end / 3600.0
    soc_true_end = SOC0_PCT - 100.0 * (V_KW_PER_A * int_i) / (EBAT_KWH * 3600.0)
    soc_est_end = SOC0_PCT - 100.0 * (V_KW_PER_A * (int_i + int_b)) / (EBAT_KWH * 3600.0)
    max_r_true = 0.0
    max_r_meas = 0.0
    for ti in t_grid:
        b = _l0_b_at(ti, faulted, family)
        i_true = _l0_i_true_at(ti, mode, faulted, family)
        p_bat = V_KW_PER_A * i_true
        p_bat_meas = V_KW_PER_A * (i_true + b)
        p_gen = PLOAD_KW - p_bat
        r_true = p_gen + p_bat - PLOAD_KW
        r_meas = p_gen + p_bat_meas - PLOAD_KW
        if abs(r_true) > max_r_true:
            max_r_true = abs(r_true)
        if abs(r_meas) > max_r_meas:
            max_r_meas = abs(r_meas)
    return {
        "E_bat_true_kWh": e_bat_true,
        "E_bat_meas_kWh": e_bat_meas,
        "E_gen_true_kWh": e_gen,
        "E_load_served_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_true_19p9_A": _l0_i_true_at(t_grid[I_F - 1], mode, faulted, family),
        "I_meas_19p9_A": _l0_i_true_at(t_grid[I_F - 1], mode, faulted, family)
                         + _l0_b_at(t_grid[I_F - 1], faulted, family),
        "t_19p9_s": t_grid[I_F - 1],
        "I_true_20post_A": _l0_i_true_at(T_F, mode, faulted, family),
        "I_meas_20post_A": _l0_i_true_at(T_F, mode, faulted, family)
                           + _l0_b_at(T_F, faulted, family),
        "I_true_21p5_A": _l0_i_true_at(21.5, mode, faulted, family),
        "I_true_26_A": _l0_i_true_at(26.0, mode, faulted, family),
        "I_true_60_A": _l0_i_true_at(x_end, mode, faulted, family),
        "P_bat_true_21p5_kW": V_KW_PER_A * _l0_i_true_at(21.5, mode, faulted, family),
        "P_gen_true_21p5_kW": PLOAD_KW - V_KW_PER_A * _l0_i_true_at(21.5, mode, faulted, family),
        "max_abs_r_true_kW": max_r_true,
        "max_abs_r_meas_kW": max_r_meas,
        "int_I_true_60s_As": int_i,
    }


# ---------------------------------------------------------------------------
# RK4 分区积分（§2.3 冻结更新序的唯一实现；dt_int 可变仅用于 FL-7 半步长自收敛登记，
# thermal="exact" 仅用于 FL-7 RK4 vs 子步解析指数交叉——冻结 I 下子步内线性常系数
# ODE 的精确解参照，非生产轨）
# ---------------------------------------------------------------------------
def _simulate_core(spec, dt_int=DT_INT, load0=PLOAD_KW, thermal="rk4"):
    """按 §2.3 冻结更新序仿真一轮；返回 series/integrals/scalars/metrics/events。

    spec 经 resolve_run_spec 归一（str 归一式 / dict 兼容式）；thermal_model 须为
    "on"（本 oracle 只承载 L1 热轨；off 轨属 fl001_v1/fl001_oracle 冻结面）。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    if spec.get("thermal_model", "on") != "on":
        raise ValueError("fl001_l1_oracle 仅承载 thermal_model=on 轨，得到 %r"
                         % (spec.get("thermal_model"),))
    if thermal not in ("rk4", "exact"):
        raise ValueError("thermal 口径须为 rk4|exact，得到 %r" % (thermal,))
    family = spec["family"]
    faulted = spec["faulted"]
    mode = spec["feedback_mode"]
    monitor = mode == "monitor"
    is_act = family == FAMILY_ACTUATOR
    is_sensor = family == FAMILY_SENSOR
    tau = TAU_ACT_S if is_act else TAU_S
    i_ref = (load0 - 20.0) / V_KW_PER_A          # plants/fl001.js:31 同式（load0=30 → 25 A）
    i_cap = i_ref * MAGNITUDE_PCT / 100.0 if is_act else None   # EQ-A（engine.js:585 同式）
    t_start = T_F if faulted else None
    sub = int(round(DT_S / dt_int))
    h = dt_int

    def b_at(time):
        # EQ-FLTH-1/EQ-1 阶跃偏置；1e-9 守卫同 plants/fl001.js:34（t=20 阶跃落子步边界）
        return BIAS_A if (faulted and is_sensor and t_start is not None
                          and time >= t_start - 1e-9) else 0.0

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {}
    for sid in SERIES_IDS:
        series[sid] = t if sid == "t" else [None] * (n + 1)

    i_true = i_ref
    t_bat = T_AMB_K
    int_i = 0.0
    int_b = 0.0
    int_demand = 0.0
    int_ploss_ws = 0.0    # E_loss 账本（W·s；子步梯形，Q4）
    int_pgen_kws = 0.0    # FL-2 独立同基异序累积（kW·s）

    def record(k):
        time = t[k]
        b = b_at(time)
        i_meas = i_true + b
        p_bat = V_KW_PER_A * i_true
        p_bat_meas = V_KW_PER_A * i_meas
        p_loss_kw = p_loss_w(i_true, t_bat) / 1000.0     # 当前状态值，非累计值（§2.3 注记②）
        p_gen = load0 - p_bat + p_loss_kw                # EQ-FLTH-5（守恒面 (a)，Q1）
        r_true = p_gen + p_bat - load0 - p_loss_kw       # EQ-FLTH-6（≡ 0）
        r_meas = p_gen + p_bat_meas - load0 - p_loss_kw  # EQ-FLTH-6（≡ 0.4·b）
        series["I_bat_true_A"][k] = i_true
        series["I_bat_meas_A"][k] = i_meas
        series["bias_A"][k] = b
        # I_bat_cap_A 事件域信号（engine.js:590 同口径）：仅 actuator 且 t>=t_start 行
        series["I_bat_cap_A"][k] = i_cap if (is_act and time >= t_start - 1e-9) else None
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat_meas
        series["P_gen_true_kW"][k] = p_gen
        series["P_load_demand_kW"][k] = load0
        series["P_load_served_kW"][k] = load0
        # SOC/SOC_est 面与 L0 record() 同式（intI/intB 同源；engine.js:537-538 同构）
        series["SOC_true_pct"][k] = SOC0_PCT - (V_KW_PER_A * int_i) / (EBAT_KWH * 3600.0) * 100.0
        series["SOC_est_pct"][k] = SOC0_PCT - (V_KW_PER_A * int_i + V_KW_PER_A * int_b) / (EBAT_KWH * 3600.0) * 100.0
        series["r_true_kW"][k] = r_true
        series["r_meas_kW"][k] = r_meas
        series["T_bat_K"][k] = t_bat
        series["P_loss_kW"][k] = p_loss_kw

    record(0)
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h     # engine.js:547 同式（§2.3 子步网格）
            b = b_at(time)                        # 输入冻结于子步起点右值
            int_demand += load0 * h               # engine.js:548 同构（E_load 左矩形）
            int_b += b * h                        # §2.3 ①（intB 同源）
            # ① 电气面（L0 序保留；plants/fl001.js:38-53 逐字语义）
            i_start = i_true                      # 同时是 ② 的冻结输入（Q2）
            target = i_ref - (0.0 if monitor else b)
            if is_act and time >= t_start - 1e-9:
                target = min(target, i_cap)       # EQ-A（engine.js:631 同式）
            st = fo_step(i_start, target, tau, h)
            i_end = st["y"]
            int_i += st["integral"]               # §2.3 ①（intI 精确指数区间积分）
            # ② RK4（热状态 T_bat；RHS 内 I 冻结于 i_start——Q2 定案口径）
            if thermal == "rk4":
                k1, pl_start = rhs_thermal(i_start, t_bat)
                k2, _ = rhs_thermal(i_start, t_bat + 0.5 * h * k1)
                k3, _ = rhs_thermal(i_start, t_bat + 0.5 * h * k2)
                k4, _ = rhs_thermal(i_start, t_bat + h * k3)
                t_end = t_bat + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
            else:
                # FL-7 交叉参照：冻结 I 下 theta' = lambda*theta + I^2*R0/C_bat 为线性
                # 常系数 ODE，子步内精确指数解（规格 §3.5 / §4 项 3 FL-7）
                i2_r0_a = i_start * i_start * R0_OHM * ALPHA_PER_K
                lam = (i2_r0_a - H_COOL_W_K) / C_BAT_J_K
                theta_ss = i_start * i_start * R0_OHM / (H_COOL_W_K - i2_r0_a)
                theta0 = t_bat - T_AMB_K
                t_end = T_AMB_K + theta_ss + (theta0 - theta_ss) * math.exp(lam * h)
                pl_start = p_loss_w(i_start, t_bat)
            # ③ E_loss 累计（子步梯形，Q4）+ 独立同基异序累积（FL-2）
            pl_end = p_loss_w(i_end, t_end)
            int_ploss_ws += 0.5 * (pl_start + pl_end) * h
            int_pgen_kws += (load0 * h - V_KW_PER_A * st["integral"]
                             + 0.5 * (pl_start + pl_end) * h / 1000.0)
            # 子步末提交
            i_true = i_end
            t_bat = t_end
        record(k)

    # 能量账本（kW·s 面；EQ-FLTH-8 注册式——与 E_bat 同积分基）
    e_bat_kws = V_KW_PER_A * int_i
    e_bat_meas_kws = V_KW_PER_A * int_i + V_KW_PER_A * int_b   # engine.js:563 同构
    e_load_kws = int_demand
    e_loss_kws = int_ploss_ws / 1000.0
    e_source_kws = e_load_kws - e_bat_kws + e_loss_kws         # EQ-FLTH-8

    scalars = {
        "E_bat_true_kWh": e_bat_kws / 3600.0,
        "E_bat_meas_kWh": e_bat_meas_kws / 3600.0,
        "E_gen_true_kWh": e_source_kws / 3600.0,
        "E_load_served_kWh": e_load_kws / 3600.0,
        "SOC_true_end_pct": series["SOC_true_pct"][-1],
        "SOC_est_end_pct": series["SOC_est_pct"][-1],
        "SOC_err_end_pp": series["SOC_est_pct"][-1] - series["SOC_true_pct"][-1],
        "I_true_19p9_A": series["I_bat_true_A"][I_F - 1],
        "I_meas_19p9_A": series["I_bat_meas_A"][I_F - 1],
        "t_19p9_s": t[I_F - 1],
        "I_true_20post_A": series["I_bat_true_A"][I_F],
        "I_meas_20post_A": series["I_bat_meas_A"][I_F],
        "I_true_21p5_A": series["I_bat_true_A"][215],
        "I_true_26_A": series["I_bat_true_A"][260],
        "I_true_60_A": series["I_bat_true_A"][-1],
        "P_bat_true_21p5_kW": series["P_bat_true_kW"][215],
        "P_gen_true_21p5_kW": series["P_gen_true_kW"][215],
        "max_abs_r_true_kW": max(abs(v) for v in series["r_true_kW"]),
        "max_abs_r_meas_kW": max(abs(v) for v in series["r_meas_kW"]),
        "int_I_true_60s_As": int_i,
        # 新热标量（规格 §4 项 7：scalars 面增 E_loss_kWh/T_bat_end_K）
        "E_loss_kWh": e_loss_kws / 3600.0,
        "T_bat_end_K": series["T_bat_K"][-1],
    }

    if faulted:
        focal_change = series["I_bat_true_A"][-1] - series["I_bat_true_A"][I_F]
    else:
        focal_change = None  # 无故障运行不适用（value:null + unavailable_reason，v1 同构）

    metrics = {
        "E_bat_true_60s": {"value": scalars["E_bat_true_kWh"], "unit": "kWh", "method": METHOD_ID},
        "E_gen_true_60s": {"value": scalars["E_gen_true_kWh"], "unit": "kWh", "method": METHOD_ID},
        "E_load_served_60s": {"value": scalars["E_load_served_kWh"], "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": scalars["SOC_true_end_pct"], "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": scalars["SOC_est_end_pct"], "unit": "%", "method": METHOD_ID},
        "SOC_err_end_pp": {"value": scalars["SOC_err_end_pp"], "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": scalars["max_abs_r_true_kW"], "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": scalars["max_abs_r_meas_kW"], "unit": "kW", "method": "algebraic"},
        "focal_change_A": {"value": focal_change, "unit": "A", "method": METHOD_ID},
        "I_true_26s_A": {"value": scalars["I_true_26_A"], "unit": "A", "method": METHOD_ID},
        "I_meas_20post_A": {"value": scalars["I_meas_20post_A"], "unit": "A", "method": METHOD_ID},
    }

    integrals = {
        "E_load_kws": e_load_kws,
        "E_bat_kws": e_bat_kws,
        "E_bat_meas_kws": e_bat_meas_kws,
        "E_loss_kws": e_loss_kws,
        "E_source_kws": e_source_kws,
        "E_source_alt_kws": int_pgen_kws,
        "intI_As": int_i,
        "intB_As": int_b,
        "intPloss_Ws": int_ploss_ws,
    }

    events = _fault_events(spec, series)
    return {"key": spec["key"], "role": spec["role"],
            "feedback_mode": mode, "faulted": faulted,
            "thermal_model": "on",
            "series": series, "integrals": integrals,
            "scalars": scalars, "metrics": metrics, "events": events}


def simulate_run(spec):
    """归一契约入口（ORACLE_INTERFACE_D2.md §2）：str run key / spec dict 双形态，
    经 oracle_base.resolve_run_spec 归一；返回 series/scalars/metrics/events。"""
    return _simulate_core(spec, DT_INT)


# ---------------------------------------------------------------------------
# 事件编码 v1（fl001_v1 事件面对齐；变量集零扩展——规格 §3.6，T_bat 不入事件快照）
# ---------------------------------------------------------------------------
def _fault_events(spec, series):
    events = []
    if not spec["faulted"]:
        return events
    family = spec.get("family", FAMILY_SENSOR)
    i_post_true = series["I_bat_true_A"][I_F]   # post 采样行（actuator：钳位未及状态仍 25 A）
    if family == FAMILY_ACTUATOR:
        act_vars_units = {"I_bat_true_A": "A", "I_bat_meas_A": "A",
                          "bias_A": "A", "I_bat_cap_A": "A"}
        events.append({
            "event_id": "EV-001",
            "event_type": "actuator_limit",
            "trigger_s": T_F,
            "target_signal": "I_bat_cap_A",
            "magnitude": MAGNITUDE_PCT,
            "unit": "%",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true,
                               "bias_A": 0.0,
                               "I_bat_cap_A": None},
                 "units": act_vars_units,
                 "fault_id": "converter_current_limit"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true,
                               "bias_A": 0.0,
                               "I_bat_cap_A": I_CAP_A},
                 "units": act_vars_units,
                 "fault_id": "converter_current_limit"},
            ],
        })
    else:
        events.append({
            "event_id": "EV-001",
            "event_type": "sensor_bias",
            "trigger_s": T_F,
            "target_signal": "bias_A",
            "magnitude": BIAS_A,
            "unit": "A",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true + 0.0,
                               "bias_A": 0.0},
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true + BIAS_A,
                               "bias_A": BIAS_A},
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
            ],
        })
    return events


# ---------------------------------------------------------------------------
# 自检 FL-1…FL-8（FL001_THERMAL_G2B_SPEC_APPROVED §4 项 3 逐条 + A-2 修订；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
#: FL-5 锚点判据：预填锚点（§3.1/§3.2，6-7 位有效数字舍入）与本 oracle 实现输出的
#: 容差——任务书口径「偏差超 1e-3 量级须停下核对更新序」；终值以本 oracle emit 冻结。
FL5_TOL_KW = 1e-3     # T(K)/P(kW) 6 位舍入预填行
FL5_TOL_E = 1e-6      # E(kWh)/SOC/E_bat 7 位舍入预填行
FL5_TOL_I = 1e-6      # I 锚点（9 位）行
FL5_TOL_R = 1e-9      # 残差恒等行
FL7_CROSS_K = 1e-9    # FL-7 交叉判据（A-2 定案：>=1e-9 K 下限冻结；实测值记录在案）
FL7_HALFSTEP_K = 5e-3  # 半步长自收敛登记上界（§3.5 证据 6.159e-04 K）


def self_check():
    """独立自检 FL-1…FL-8（规格 §4 项 3；不复用 FL/FC/GT/PV 的 SC/GS/PS 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    gate = TOLERANCES["gate"]

    # ---- FL-1 L0 冻结锚点环境校验（§4 项 3：fl001_v1 标量闭式复现，判据 <=1e-9）----
    # 参照 = data/golden/fl001_v1.json 冻结标量（只读比对；spec 三轨 healthy/clf/actuator
    # + monitor_only 超集 = 全 4 Run），复刻面 = 本文件 _l0_scalars（独立闭式实现）。
    l0_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), "data", "golden", "fl001_v1.json")
    worst1 = None
    n_cmp = 0
    ok1 = False
    detail1 = "fl001_v1.json missing"
    try:
        with open(l0_path, "r", encoding="utf-8") as f:
            g_v1 = json.load(f)
        ok1 = True
        for spec in RUNS:
            ref = g_v1["runs"][spec["key"]]["scalars"]
            mine = _l0_scalars(spec["feedback_mode"], spec["faulted"], spec["family"])
            for key, gv in ref.items():
                if key not in mine:
                    ok1 = False
                    detail1 = "scalar key missing in replication: %s" % key
                    break
                d = abs(mine[key] - gv)
                n_cmp += 1
                if worst1 is None or d > worst1:
                    worst1 = d
            if not ok1:
                break
        if ok1:
            ok1 = worst1 <= 1e-9
    except Exception as exc:  # noqa: BLE001
        ok1 = False
        detail1 = "%s: %s" % (type(exc).__name__, exc)
    rec("FL-1-l0-frozen-anchors", ok1,
        (detail1 if not ok1 else
         "worst|diff|=%.3e over %d scalars x 4 runs" % (worst1, n_cmp)),
        "<=1e-9 (closed-form replication vs fl001_v1 frozen scalars)",
        "L0 frozen-anchor environment check (EQ-1..EQ-6 closed forms, read-only)")

    # ---- FL-2 热能量恒等（EQ-FLTH-9 离散自洽）+ theta_ss 渐近闭式抽查 ----
    worst2 = 0.0
    worst2_alt = 0.0
    for r in runs:
        ig = r["integrals"]
        # (a) EQ-FLTH-9：E_source + E_bat − E_load − E_loss ≡ 0（kW·s → kWh）
        resid = (ig["E_source_kws"] + ig["E_bat_kws"]
                 - ig["E_load_kws"] - ig["E_loss_kws"]) / 3600.0
        worst2 = max(worst2, abs(resid))
        # (b) 同基异序独立累积（int_pgen 逐子步）vs E_source 组装式
        d_alt = abs(ig["E_source_kws"] - ig["E_source_alt_kws"]) / 3600.0
        worst2_alt = max(worst2_alt, d_alt)
    # theta_ss 闭式抽查：RHS(T_amb + theta_ss) ≈ 0 且稳定性分母 > 0（EQ-FLTH-9）
    worst2_ss = 0.0
    for i_val in (I_CAP_A, 15.0, IREF_A, 62.5):
        i2r0a = i_val * i_val * R0_OHM * ALPHA_PER_K
        denom = H_COOL_W_K - i2r0a
        theta_ss = i_val * i_val * R0_OHM / denom
        dtdt, _ = rhs_thermal(i_val, T_AMB_K + theta_ss)
        worst2_ss = max(worst2_ss, abs(dtdt))
        if denom <= 0.0:
            worst2_ss = float("inf")
    ok2 = worst2 <= 1e-9 and worst2_alt <= 1e-9 and worst2_ss <= 1e-12
    rec("FL-2-thermal-energy-identity", ok2,
        "E-identity=%.3e kWh, alt-accum=%.3e kWh, theta_ss RHS=%.3e K/s"
        % (worst2, worst2_alt, worst2_ss),
        "<=1e-9 kWh / <=1e-9 kWh / <=1e-12 K/s",
        "EQ-FLTH-9 discrete identity + same-basis alt accumulation + EQ-FLTH-9 theta_ss")

    # ---- FL-3 电气面跨轨恒等（thermal on 的 I/SOC/E_bat/r_meas 面与 L0 闭式 ±1e-9）----
    worst3 = 0.0
    for spec, r in zip(RUNS, runs):
        mode, faulted, family = spec["feedback_mode"], spec["faulted"], spec["family"]
        t_arr = r["series"]["t"]
        for i in range(N_SAMPLES):
            ti = t_arr[i]
            i_l0 = _l0_i_true_at(ti, mode, faulted, family)
            b_l0 = _l0_b_at(ti, faulted, family)
            p_gen_l0 = PLOAD_KW - V_KW_PER_A * i_l0
            r_meas_l0 = p_gen_l0 + V_KW_PER_A * (i_l0 + b_l0) - PLOAD_KW
            worst3 = max(worst3,
                         abs(r["series"]["I_bat_true_A"][i] - i_l0),
                         abs(r["series"]["SOC_true_pct"][i] - _l0_soc_true_at(ti, mode, faulted, family)),
                         abs(r["series"]["SOC_est_pct"][i] - _l0_soc_est_at(ti, mode, faulted, family)),
                         abs(r["series"]["r_meas_kW"][i] - r_meas_l0),
                         abs(r["series"]["r_true_kW"][i]))
        # E_bat 面（标量）
        int_i_l0 = _l0_int_i_true(DURATION_S, mode, faulted, family)
        int_b_l0 = _l0_int_b(DURATION_S, faulted, family)
        worst3 = max(worst3,
                     abs(r["scalars"]["E_bat_true_kWh"] - V_KW_PER_A * int_i_l0 / 3600.0),
                     abs(r["scalars"]["E_bat_meas_kWh"]
                         - V_KW_PER_A * (int_i_l0 + int_b_l0) / 3600.0))
    ok3 = worst3 <= 1e-9
    rec("FL-3-electrical-face-identity", ok3, "%.3e (max abs dev)" % worst3,
        "<=1e-9 per-point (I/SOC/E_bat/r_meas/r_true faces vs L0 closed forms)",
        "thermal on does not feed back to electrical face (spec 3.3 zero-change, oracle side)")

    # ---- FL-4 网格（601 点、t[i]=i·dt、单调、事件域 null 豁免同 fl001 SC-6 口径）----
    t_ref = build_time_grid()
    ok4 = (len(t_ref) == N_SAMPLES
           and all(t_ref[i] < t_ref[i + 1] for i in range(N_SAMPLES - 1))
           and all(t_ref[i] == i * DT_S for i in range(N_SAMPLES))
           and t_ref[0] == 0.0 and t_ref[-1] == DURATION_S)
    for r in runs:
        for sid in SERIES_IDS:
            col = r["series"][sid]
            if len(col) != N_SAMPLES:
                ok4 = False
            for v in col:
                if v is None:
                    if sid != "I_bat_cap_A":
                        ok4 = False
                elif not math.isfinite(v):
                    ok4 = False
    rec("FL-4-grid-finite", ok4, "4x601 points, t[i]=i*dt",
        "strictly increasing + finite (I_bat_cap_A event-domain null exempt)",
        "grid + finiteness (fl001 SC-6 convention)")

    # ---- FL-5 锚点全表复算（规格 §3.1/§3.2 预填；终值以本 oracle emit 冻结）----
    s_h = by_key["healthy"]["series"]
    s_a = by_key["closed_loop_fault"]["series"]
    s_m = by_key["monitor_only"]["series"]
    s_f = by_key["actuator_closed_loop"]["series"]
    sc_h = by_key["healthy"]["scalars"]
    sc_a = by_key["closed_loop_fault"]["scalars"]
    sc_m = by_key["monitor_only"]["scalars"]
    sc_f = by_key["actuator_closed_loop"]["scalars"]
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def theta_ss_of(i_val):
        return i_val * i_val * R0_OHM / (H_COOL_W_K - i_val * i_val * R0_OHM * ALPHA_PER_K)

    # 健康局（§3.1）
    chk("H.T_bat_0", s_h["T_bat_K"][0], 298.15, 1e-9)
    chk("H.T_bat_60", s_h["T_bat_K"][600], 309.953229, FL5_TOL_KW)
    chk("H.T_ss_asymptote", T_AMB_K + theta_ss_of(IREF_A), 312.435714, 1e-5)
    chk("H.P_loss_0", s_h["P_loss_kW"][0], 0.125, 1e-12)
    chk("H.P_loss_60", s_h["P_loss_kW"][600], 0.139754, FL5_TOL_KW)
    chk("H.P_gen_0", s_h["P_gen_true_kW"][0], 20.125, 1e-9)
    chk("H.P_gen_60", s_h["P_gen_true_kW"][600], 20.139754, FL5_TOL_KW)
    chk("H.E_loss_60", sc_h["E_loss_kWh"], 0.0022404, FL5_TOL_E)
    chk("H.SOC_true_end", sc_h["SOC_true_end_pct"], 59.5833333, FL5_TOL_E)
    chk("H.E_bat_true", sc_h["E_bat_true_kWh"], 0.1666667, FL5_TOL_E)
    chk("H.I_true_60", sc_h["I_true_60_A"], 25.0, 1e-9)
    chk("H.max_abs_r_meas", sc_h["max_abs_r_meas_kW"], 0.0, FL5_TOL_R)
    # sensor_drift +10 闭环（§3.2 行 1-5）
    chk("A.T_bat_20", s_a["T_bat_K"][I_F], 304.463784, FL5_TOL_KW)
    chk("A.T_bat_peak", max(s_a["T_bat_K"]), 304.639878, FL5_TOL_KW)
    rows.append(("A.T_bat_peak_idx", max(range(N_SAMPLES), key=lambda i: s_a["T_bat_K"][i]),
                 221, 0, max(range(N_SAMPLES), key=lambda i: s_a["T_bat_K"][i]) == 221))
    chk("A.T_bat_60", s_a["T_bat_K"][600], 303.419884, FL5_TOL_KW)
    chk("A.T_ss_asymptote", T_AMB_K + theta_ss_of(15.0), 302.862042, 1e-5)
    chk("A.P_loss_20", s_a["P_loss_kW"][I_F], 0.132892, FL5_TOL_KW)
    chk("A.P_loss_60", s_a["P_loss_kW"][600], 0.047371, FL5_TOL_KW)
    chk("A.P_gen_60", s_a["P_gen_true_kW"][600], 24.047371, FL5_TOL_KW)
    chk("A.P_gen_21p5", s_a["P_gen_true_kW"][215], 22.602784, FL5_TOL_KW)
    chk("A.E_loss_60", sc_a["E_loss_kWh"], 0.0012787, FL5_TOL_E)
    chk("A.E_source_60", sc_a["E_gen_true_kWh"], 0.3773898, FL5_TOL_E)
    chk("A.I_true_26", sc_a["I_true_26_A"], 15.183156388, FL5_TOL_I)
    chk("A.SOC_true_end", sc_a["SOC_true_end_pct"], 59.6902778, FL5_TOL_E)
    chk("A.SOC_est_end", sc_a["SOC_est_end_pct"], 59.5791667, FL5_TOL_E)
    chk("A.SOC_err_end", sc_a["SOC_err_end_pp"], -0.1111111, FL5_TOL_E)
    chk("A.E_bat_true", sc_a["E_bat_true_kWh"], 0.1238889, FL5_TOL_E)
    chk("A.max_abs_r_meas", sc_a["max_abs_r_meas_kW"], 4.0, FL5_TOL_R)
    # sensor_drift 仅监测（§3.2 行 6：偏置不进入物理回路，热面与健康局恒等）
    chk("M.T_bat_60", s_m["T_bat_K"][600], 309.953229, FL5_TOL_KW)
    rows.append(("M.dT_vs_healthy_max",
                 max(abs(x - y) for x, y in zip(s_m["T_bat_K"], s_h["T_bat_K"])),
                 0.0, 0.0,
                 max(abs(x - y) for x, y in zip(s_m["T_bat_K"], s_h["T_bat_K"])) == 0.0))
    chk("M.SOC_est_end", sc_m["SOC_est_end_pct"], 59.4722222, FL5_TOL_E)
    chk("M.max_abs_r_meas", sc_m["max_abs_r_meas_kW"], 4.0, FL5_TOL_R)
    # actuator_fault 55%（§3.2 行 7-8）
    chk("F.T_bat_peak", max(s_f["T_bat_K"]), 304.505333, FL5_TOL_KW)
    rows.append(("F.T_bat_peak_idx", max(range(N_SAMPLES), key=lambda i: s_f["T_bat_K"][i]),
                 205, 0, max(range(N_SAMPLES), key=lambda i: s_f["T_bat_K"][i]) == 205))
    chk("F.T_bat_60", s_f["T_bat_K"][600], 302.770820, FL5_TOL_KW)
    chk("F.T_ss_asymptote", T_AMB_K + theta_ss_of(I_CAP_A), 302.079847, 1e-5)
    chk("F.P_gen_60", s_f["P_gen_true_kW"][600], 24.539560, FL5_TOL_KW)
    chk("F.I_true_60", sc_f["I_true_60_A"], 13.75, 1e-9)

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    worst5 = max(abs(ob - ex) for nm, ob, ex, _tl, okr in rows if okr) if not fails else None
    ok5 = not fails
    obs5 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs5 += "; FAIL: " + ",".join(fails)
    rec("FL-5-anchors", ok5, obs5, "spec 3.1/3.2 prefill (final = this emit)",
        "anchor recompute: t=60 sample / transient extremes / asymptotes / ledgers")

    # ---- FL-6 monitor 热面恒等（偏置不进入物理回路的结构判据）----
    d6 = max(abs(x - y) for x, y in zip(s_m["T_bat_K"], s_h["T_bat_K"]))
    ok6 = d6 == 0.0
    rec("FL-6-monitor-thermal-identity", ok6, "max|dT|=%.1f K" % d6, "== 0.0 (exact)",
        "monitor bias stays out of the physical loop; thermal face identical to healthy")

    # ---- FL-7 半步长自收敛登记 + RK4 vs 子步解析指数交叉（A-2 冻结制）----
    fine = _simulate_core(RUNS[1], 0.005)
    d7_t = max(abs(x - y) for x, y in zip(s_a["T_bat_K"], fine["series"]["T_bat_K"]))
    d7_i = max(abs(x - y) for x, y in zip(s_a["I_bat_true_A"], fine["series"]["I_bat_true_A"]))
    d7_e = abs(sc_a["E_loss_kWh"] - fine["scalars"]["E_loss_kWh"])
    worst7_cross = 0.0
    for spec in RUNS:
        ex = _simulate_core(spec, DT_INT, thermal="exact")
        worst7_cross = max(worst7_cross,
                           max(abs(x - y) for x, y in zip(
                               by_key[spec["key"]]["series"]["T_bat_K"],
                               ex["series"]["T_bat_K"])))
    ok7 = (d7_t <= FL7_HALFSTEP_K and d7_i <= 1e-9 and d7_e <= 1e-6
           and gate["T_K_atol"] >= 10.0 * d7_t
           and worst7_cross <= FL7_CROSS_K)
    rec("FL-7-halfstep-and-rk4-exact-cross", ok7,
        "halfstep max|dT|=%.4e K, max|dI|=%.3e A, dE=%.3e kWh; "
        "rk4-vs-exact max|dT|=%.4e K" % (d7_t, d7_i, d7_e, worst7_cross),
        "halfstep <=5e-3 K and gate T_K_atol >=10x; rk4-vs-exact <=1e-9 K "
        "(A-2 lower-bound freeze; measured value recorded, not the 5.68e-14 prefill)",
        "h=0.01 vs h=0.005 self-convergence (closed_loop_fault) + substep-exact "
        "exponential cross-reference over 4 runs")

    # ---- FL-8 无 NaN/Inf + 包络抽查 + 域角点 + 稳定性裕度（§3.4）----
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None:
                    if sid != "I_bat_cap_A":
                        ok8 = False
                elif not math.isfinite(v):
                    ok8 = False
        for v in r["series"]["T_bat_K"]:
            if not (298.15 - 1e-9 <= v <= 309.96):
                ok8 = False
        for v in r["series"]["P_loss_kW"]:
            if v < 0.0:
                ok8 = False
    # 稳定性裕度：注册域 + 角点 I^2·R0·alpha < h_cool（EQ-FLTH-9 稳定性条件）
    margin_min = None
    corner45 = _simulate_core(RUNS[0], DT_INT, load0=45.0)   # load0=45 角点（I=62.5 A）
    corner10 = _simulate_core(RUNS[0], DT_INT, load0=10.0)   # load0=10 角点（充电，I=-25 A）
    for r in runs + [corner45, corner10]:
        i_max = max(abs(v) for v in r["series"]["I_bat_true_A"])
        margin = H_COOL_W_K - i_max * i_max * R0_OHM * ALPHA_PER_K
        if margin_min is None or margin < margin_min:
            margin_min = margin
        if margin <= 0.0:
            ok8 = False
    # §3.4 角点锚点（load0=45：T(60)/P_loss(60)/P_gen(60)（A-1 勘正 21.769954）/E_loss；
    #             load0=10：充放对称 T(60) + P_gen(60)=20.139754）
    ok8 = ok8 and abs(corner45["scalars"]["T_bat_end_K"] - 424.704098) <= FL5_TOL_KW
    ok8 = ok8 and abs(corner45["series"]["P_loss_kW"][600] - 1.769954) <= FL5_TOL_KW
    ok8 = ok8 and abs(corner45["series"]["P_gen_true_kW"][600] - 21.769954) <= FL5_TOL_KW
    ok8 = ok8 and abs(corner45["scalars"]["E_loss_kWh"] - 0.0218589) <= FL5_TOL_E
    ok8 = ok8 and abs(corner10["scalars"]["T_bat_end_K"] - 309.953229) <= FL5_TOL_KW
    ok8 = ok8 and abs(corner10["series"]["P_gen_true_kW"][600] - 20.139754) <= FL5_TOL_KW
    rec("FL-8-finite-envelope-corners-stability", ok8,
        "finite 4x16x601; T in [298.15,309.96] K; corner45 T(60)=%.6f K; "
        "corner10 T(60)=%.6f K; min stability margin=%.4f W/K"
        % (corner45["scalars"]["T_bat_end_K"], corner10["scalars"]["T_bat_end_K"],
           margin_min),
        "all finite; envelope per spec 3.4; corners within prefill tol; I^2*R0*alpha < 10",
        "load0=45 / load0=10 corners + stability margin (h_cool=10 W/K)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
# gate 块 tier="T-B"（规格 §4 项 6 修订后预案终值冻结，FLTH-G2b-03）。冻结依据：
#   - T_K_atol=1e-2：半步长自收敛实测 max|dT| = 6.1587e-04 K（FL-7 实测，closed_loop_fault
#     h=0.01 vs h=0.005；与规格 §3.5 起草证据 6.159e-04 K 同量级互证）×16 裕度
#     （1e-2 / 6.16e-4 ≈ 16x，>=10 纪律）；gt001_v3 gate 冻结先例同纪律。
#   - FL-7 RK4 vs 子步解析指数交叉实测 max|dT| = 2.6887e-11 K（4 Run 全轨，FLTH-G2b-03
#     实测记录；与起草 5.68e-14 K / 评审复算 1.46e-11 K 同量级）——判据按 A-2 定案冻结于
#     >=1e-9 K 下限（不冻结预填值；oracle↔engine 双实现散差实测归 FLTH-G2b-04 门禁面）。
#   - §3.1/§3.2/§3.4 预填锚点复算 worst deviation = 4.5e-07（39/39 行 + 2 角点，
#     纯 6 位舍入噪声 << 1e-3 停下核对阈值）——更新序复刻与起草预填一致。
#   - I_A_rtol/atol 沿 fl001_v1 gate 键面（精确指数闭式跨语言散差在 rtol 1e-12 实证域内）。
#   - P_kW/E_kWh/SOC_pp/r_true_kW/r_meas_kW_atol/t_s 沿 §4 项 6 预案量级
#     （距实测散差 >=6 个数量级；P_kW_rtol 1e-6 对 P_gen ~24 kW 给 ~2.4e-5 kW 余量）。
#   - 不含 f_Hz_atol：T-B 缺省分支随 verify_golden `_A` 分支补全（规格 §4 项 6 ① 缺口
#     清单，FLTH-G2b-03/L8 工作面）后不再触达。
#   - 降 T-C 预案未触发（实测散差未超预案；ORACLE_INTERFACE_D2 §3.2 双向预案登记）。
TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "I_A_rtol": 1e-12,
        "I_A_atol": 1e-15,
        "T_K_atol": 1e-2,
        "P_kW_rtol": 1e-6,
        "P_kW_atol": 1e-3,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "r_meas_kW_atol": 1e-9,
        "t_s": 1e-9,
    },
}


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族字段与 systems.js FL-001 faults 定义同名；
    幅值键沿 fl001_v1 具名先例 bias_A / magnitude_pct+I_cap_A）。"""
    if not spec["faulted"]:
        return None
    if spec.get("family") == FAMILY_ACTUATOR:
        return {"family": FAMILY_ACTUATOR, "fault_id": "converter_current_limit",
                "t_start_s": T_F, "magnitude_pct": MAGNITUDE_PCT, "I_cap_A": I_CAP_A}
    return {"family": FAMILY_SENSOR, "fault_id": "I_bat_sensor_bias",
            "t_start_s": T_F, "bias_A": BIAS_A}


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
            "thermal_model": "on",
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
        "supersedes": "fl001_v1（L0 轨 thermal_model=off，字节冻结留档；存档场次继续引用 v1）",
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "thermal_model": "on",
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "T": "K"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "Vdc_V": VDC_V, "Iref_A": IREF_A, "tau_s": TAU_S, "tau_actuator_s": TAU_ACT_S,
            "magnitude_pct": MAGNITUDE_PCT, "I_cap_A": I_CAP_A,
            "Pload_demand_kW": PLOAD_KW, "Pload_served_kW": PLOAD_KW,
            "Ebat_nominal_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "dt_int_s": DT_INT,
            "R0_ohm": R0_OHM, "alpha_per_K": ALPHA_PER_K, "C_bat_J_K": C_BAT_J_K,
            "h_cool_W_K": H_COOL_W_K, "T_amb_K": T_AMB_K,
            "thermal_model": "on",
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "L1 单节点集总热轨（thermal_model=on）：电气面 L0 序逐字保留（精确指数"
                    "子步，plants/fl001.js stepOf 语义），T_bat 经典 RK4 固定步长 0.01"
                    "（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.3 冻结更新序；RHS 内 I 冻结"
                    "子步起点，Q2 定案）；E_loss 子步梯形（Q4）、E_source = E_load − E_bat "
                    "+ E_loss（EQ-FLTH-8 守恒面 (a)，Q1 定案）；record 的 P_loss_kW 用当前"
                    "状态重算（信号面与账本面分离，§2.3 注记②）；R0/alpha/C_bat/h_cool 为"
                    "教学整定值非实测（A-flth-params）；fl001_v1（off 轨）字节冻结留档，"
                    "本 golden 只读比对（G0-DEC-16）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集，镜像 fl001_v1 指标面 11 项"
                        "（E_gen_true_60s 热域按 EQ-FLTH-5 携带损耗补偿项；无故障 Run "
                        "focal_change_A 为 null）；E_loss/T_bat_end 锚点经 scalars 面 "
                        "E_loss_kWh/T_bat_end_K 承载（引擎侧指标注册归 FLTH-G2b-04）",
    }


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar（LF 钉死）；先跑 FL-1…FL-8，失败 exit 2 不写盘）
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
        tool="tools/oracle/fl001_l1_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/fl001_l1_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def _domain_scan():
    """load0 角点扫描（规格 §3.4 域声明证据输出；healthy 轨 thermal on，h=0.01 RK4）。

    每点输出：I_ref、T(60)、P_loss(60)、P_gen(60)、E_loss(60)、渐近 theta_ss、
    稳定性裕度 h_cool − I^2·R0·alpha。ASCII 输出。"""
    print("FL-001 thermal track domain scan (healthy closed-loop, h=0.01 RK4, 601 pts)")
    print("load0_kW  I_ref_A    T60_K      Ploss60_kW  Pgen60_kW  Eloss60_kWh  theta_ss_K  margin_W_K")
    for kk in range(4, 19):   # load0 = 10 .. 45 step 2.5（§3.4 注册域角点含两端）
        load0 = 2.5 * kk
        r = _simulate_core(RUNS[0], DT_INT, load0=load0)
        i_ref = (load0 - 20.0) / V_KW_PER_A
        theta_ss = i_ref * i_ref * R0_OHM / (H_COOL_W_K - i_ref * i_ref * R0_OHM * ALPHA_PER_K)
        margin = H_COOL_W_K - i_ref * i_ref * R0_OHM * ALPHA_PER_K
        print("%8.1f  %8.3f  %9.6f  %10.6f  %9.6f  %11.7f  %10.4f  %9.4f"
              % (load0, i_ref, r["scalars"]["T_bat_end_K"],
                 r["series"]["P_loss_kW"][600], r["series"]["P_gen_true_kW"][600],
                 r["scalars"]["E_loss_kWh"], T_AMB_K + theta_ss, margin))
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
