# -*- coding: utf-8 -*-
"""wt001_oracle.py — WT-001 风电机组独立数值 oracle（WT-G2b-03，V080_WAVE_DESIGN §2 L2 /
CHG-20261107-01 批准链）。

独立性声明（违反即 golden 无效；对标 fl001_oracle.py:1-10 / pv001_oracle.py:4-13 /
gt001_l1_oracle.py 先例，MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与常量唯一权威文本是
     FaultLab-evaluation/NEXT/WT001_G2B_SPEC_APPROVED.md v1.0 §1.3（EQ-WT-1…9）+
     §1.3-a 常量表 + §1.3-b 冻结更新序，此处独立硬编码。
  2. §1.3-a 常量全部按**登记值**硬编码，运行内**不得重新求导**（λ_opt/Cp_max 为
     golden-section 数值最大化的「登记可达精度」，算法路径相关、不可由登记常量独立
     复算——v1.0 修订 A-2；本文件实证：lambda_opt*9/R 运行内重算 = 18.916969639327977，
     与登记值 18.916969639327981 差 4 ulp，重导即破坏 T-A）。闭式组合量
     （HALF_RHO_A = 0.5*rho*A、k_v*v0^3 初值等）为登记常量的算术组合，非重求导。
  3. 本文件不与产品 engine 共享任何公式常量模块；不与 FL/FC/GT/PV oracle 共享公式
     常量（oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，无模型语义，D-2a 契约）。
  4. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden
     只读比对（G0-DEC-16）。出生即 oracle_base 接入（无 V-03 历史字节负担，
     gt001_l1_oracle 先例；规格 §4 项 1）。
  5. 本文件自带自检 WS-1…WS-8（规格 §4 项 3 逐条），自检失败由调用方以 exit 2 报告；
     emit 前置自检（失败不写盘）。

模型（L0b 机械动态行为级演示，WT-001 单机并网等效；规格 §0/§1；三状态 omega/beta/P_wt）：
  EQ-WT-1  v_true = v0 + dv*1(t>=t0)（仅 gust_step）；b(t) = -B*1(t>=t0)（仅
           v_sensor_bias，B>=0 低估幅值，符号化通道值为负）；v_ctrl = (monitor 且
           bias 故障) ? v_true : v_true + b；v_est = v_true + b（恒测量，不随模式切换）。
           t0 处右极限、post 采样行语义（fl001_oracle.py:103-108 口径同构）。
  EQ-WT-2  Cp(lam,beta) = c1*(c2/li - c3*beta - c4)*exp(-c5/li) + c6*lam；
           li = 1/(1/(lam+0.08*beta) - 0.035/(beta^3+1))；beta 单位为度（复算实证：
           Cp(5.694091,16.5deg)=0.1667413 与规格锚点 0.166741 符合）。
  EQ-WT-3  P_aero = Cp(lam,beta)*0.5*rho*A*v_true^3；lam = omega*R/v_true。
  EQ-WT-4  P_ref = min(k_opt*omega^3, P_rated, k_v*v_ctrl^3)（三支路：MPPT 最优增益律 +
           额定封顶 + 可用风功率保护钳位）。
  EQ-WT-5  beta_ref = clamp(K_beta*(omega - omega_N), 0, beta_max)（桨距比例转速调节）。
  EQ-WT-6  tau_e*dP_wt/dt + P_wt = P_ref（P_wt(0) = k_v*v0^3）；tau_beta*dbeta/dt + beta
           = beta_ref（beta(0) = 0）；执行器激活窗（t>=t0 且 pitch_stuck）内
           beta == beta_stuck（位置强制钉扎，foStep 跳过——Q2 定案）。
  EQ-WT-7  J*domega/dt = (P_aero - P_wt)/omega（omega(0) = lambda_opt*v0/R，登记值
           OMEGA_OPT_V9；非线性 RHS，不可手解——L0b 判据核心）；有效性域
           omega >= 0.5*omega_opt(v0)（WS-8 域扫描 emit 硬条件守卫）。
  EQ-WT-8  P_grid = P_load - P_wt,true；P_load = 30 kW；r_true == 0；r_meas == 0（定义
           恒等）；d_wt = P_wt,meas - P_wt,est = P_wt,true - k_v*v_est^3（测量链代数
           恒等，不是能量损失）。
  EQ-WT-9  E_x = INT P_x dt（W*s，/3.6e6 -> kWh）；E_wt,est = INT k_v*v_est^3 dt
           （事件感知解析积分——v_est 分段常值）；dE_wt = E_wt,est - E_wt,true。

冻结更新序（规格 §1.3-b 分区伪代码 = oracle/引擎双侧复刻的唯一权威文本，本文件为其
Python stdlib 实现，逐条对应；GTL1 §2.3 先例）：
  每子步 h = H_SUB_S = 0.01（k = 1..6000）；事件输入（b/dv）冻结于子步起点右值
  （t=20.0 恰在子步边界，无子步内间断；t>=t0 判定带 1e-9 守卫，gt001_l1 cap_active 同式）：
  ① 控制面（全部用子步起点右值）：
       v_true = v0 + dv*1(t>=t0)；b = -B*1(t>=t0)
       v_ctrl = (monitor 且 bias 故障) ? v_true : v_true + b；v_est = v_true + b
       beta_ref = clamp(K_beta*(omega - omega_N), 0, beta_max)          # EQ-WT-5
       P_ref    = min(k_opt*omega^3, P_rated, k_v*v_ctrl^3)             # EQ-WT-4 三支路
  ② P_wt 精确指数（EQ-WT-6 前段）+ 子步解析积分：
       P_wt <- P_ref + (P_wt - P_ref)*exp(-h/tau_e)
       E_wt += P_ref*h + (P_wt_old - P_ref)*tau_e*(1 - exp(-h/tau_e))
  ③ beta 精确指数（EQ-WT-6 后段）：执行器激活窗内 beta <- beta_stuck（钉扎，跳过）；
       否则 beta <- beta_ref + (beta - beta_ref)*exp(-h/tau_beta)
  ④ omega 前向 Euler（EQ-WT-7；RHS 用②③后的 P_wt/beta 与子步起点的 omega、冻结 v_true）：
       lam = omega*R/v_true；P_aero = Cp(lam, beta)*0.5*rho*A*v_true^3
       omega <- omega + h*(P_aero - P_wt)/(J*omega)
  输出网格 record（601 点，t[i] = i*dt，IEEE-754 积禁止累加）：状态行取子步起点值
  （t=20.0 行 = 状态 pre + 输入 post 右值——A-1 修订口径：beta_pitch(20.0)=0.0 状态 pre、
  beta_stuck_deg(20.0)=16.5 事件域信号行）；代数量（lam/cp/P_aero/P_ref/beta_ref/
  beta_stuck/P_est/d_wt/r_true/r_meas）由 (omega, beta, P_wt, v_true, v_ctrl, v_est) 重算；
  E_wt,est 事件感知解析积分（EQ-WT-9）。

信号面（golden series 23 列 = t + 规格 §1.2 表 22 信号，顺序按表；§4 项 4）：
  v_meas_ms 列 = 控制面读数 v_ctrl（§1.2 公式列口径）；beta_stuck_deg 为唯一事件域
  null 信号（stuck 场景 t>=t0 行 = beta_stuck、其余行 null；非 stuck 场景整列 null——
  I_bat_cap_A 先例 fl001_oracle.py:241-243）；bias_ms 全程有值 0/-B。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="wt001_v1"、model_id="WT-001"、
    model_version="1.0.0"（三段式）、method_id="wt001_l0b_euler_dt0.01"、
    engine_baseline=null、backend=null（§3.4 留位）。build_golden() 不含
    generated_by/approval（v2 一段式：oracle_base.emit_golden 在 emit 时点现算回填）。
  - approval 三字段首签（emit 时）：approved_by="user（2026-11-07 CHG-20261107-01 批准链）"、
    approved_at=utc_now_iso()、approved_golden_sha256=V-03b 内容摘要。
  - gate 块 tier="T-A"（同更新序逐算子复刻，非 RK4 双实现）：八键
    E_kWh/P_kW_rtol/P_kW_atol/n_rpm_atol/r_true_kW/I_A_rtol/I_A_atol/t_s。
    **无 d_wt_atol 键**（v1.0 修订 B-2：verify_golden T-A 路径 d_wt_kW 经
    endswith("_kW") 路由至 P_kW_atol，d_wt_atol 为无消费死键，删除）。
    I_A_rtol/I_A_atol 必带：bias_ms 命中 verify_golden series_limit
    startswith("bias") 分支（scripts/verify_golden.py:149-150）；n_rpm_atol 走
    endswith("_rpm") 分支 :143-144；v/beta/lambda/cp 类无后缀分支走默认 fall-through
    1e-9（:153，现状零改动即够用）。
  - units 增 "wind":"m/s" 与 "angle":"°"（lambda/cp 无量纲不入单位表，规格 §4 项 5）。

Run 面（规格 §4 项 2，5 Run）：healthy / closed_loop_fault（v_sensor_bias B=1.0 闭环）/
  monitor_only（同偏置仅监测）/ pitch_stuck_closed_loop（55% 位置强制）/
  gust_closed_loop（+2.0 阵风）。gust monitor 不重复入 golden：两模式逐位同解
  （WS-7 实证；物理输入与控制模式无关，FLEXT §2 项 1 / PV001 §4 项 2 先例）。

emit：python -I tools/oracle/wt001_oracle.py --emit（先跑 WS-1…WS-8，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/wt001_v1.json + .sha256 sidecar，LF 钉死）。
自检：python -I tools/oracle/wt001_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。
扫描：python -I tools/oracle/wt001_oracle.py --scan（WS-8 证据输出：pitch_stuck
  mag 20..85 步 5 域扫描极值 + UI 全域 8 角点端点抽查摘要——规格 §2.2/§3.5 v1.0）。

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
# 冻结常量（WT001_G2B_SPEC_APPROVED v1.0 §1.3-a 常量表——登记值硬编码，运行内不得
# 重新求导；任何变更须重建 golden）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生）
T0_S = 20.0                                     # 默认注入时刻（库口径，FAULT_CATALOG §0）
I_F = int(round(T0_S / DT_S))                   # 200
H_SUB_S = 0.01                                  # §1.3-b 积分子步
N_SUBSTEPS = int(round(DURATION_S / H_SUB_S))   # 6000
SUB_PER_REC = int(round(DT_S / H_SUB_S))        # 10 子步/输出行
T_GUARD = 1e-9                                  # 事件窗判定守卫（gt001_l1 同式）

# 登记常量（§1.3-a；15 位登记可达精度/闭式可复算值，逐项硬编码）
RHO_KG_M3 = 1.225
C1, C2, C3, C4, C5, C6 = 0.5176, 116.0, 0.4, 5.0, 21.0, 0.0068
LAMBDA_OPT = 8.100117280602777          # 登记可达精度（golden-section，非闭式可复现——A-2）
CP_MAX = 0.480011902827875              # 登记可达精度（同上）
KV_W = 13.717421124828531               # W/(m/s)^3 = 10000/729（有理数精确）
AREA_M2 = 46.656738009239717            # 由 k_v = Cp_max*0.5*rho*A 闭合导出
R_M = 3.853738569938033                 # R = sqrt(A/pi)
KOPT_W = 1.477220410253986              # W/(rad/s)^3 = k_v*R^3/lambda_opt^3
P_RATED_W = 15000.0                     # 15 kW 额定封顶
V_RATED_MS = 10.302428182979986         # (P_rated/k_v)^(1/3)
OMEGA_N = 21.654524572087702            # lambda_opt*v_rated/R（桨距调节转速参考）
OMEGA_OPT_V9 = 18.916969639327981       # lambda_opt*v0/R @ v0=9（登记值硬编码——运行内
                                        # 重算 lambda_opt*9/R = 18.916969639327977，差 4 ulp）
TAU_E_S = 1.0                           # 变流器一阶时间常数
TAU_BETA_S = 0.5                        # 变桨执行器一阶时间常数
J_KG_M2 = 300.0                         # 传动链单质量等效惯量
K_BETA = 3.0                            # 桨距比例增益（度/(rad/s)）
BETA_MAX_DEG = 30.0                     # 桨距上限 = 卡涩满度

# 闭式组合量（登记常量算术组合，非重求导）
HALF_RHO_A = 0.5 * RHO_KG_M3 * AREA_M2          # 28.577252030659327（Cp_max*0.5*rho*A 闭合 gamma=1）

# 默认工况（§2 三族 default + §3 默认参数）
V0_MS = 9.0
BIAS_B_MS = 1.0                 # v_sensor_bias 低估幅值（B>=0；通道值 b = -B）
PITCH_STUCK_PCT = 55.0          # pitch_stuck 卡涩偏转比例（%）
GUST_DV_MS = 2.0                # gust_step 阵风增幅（m/s）
BETA_STUCK_GOLDEN = BETA_MAX_DEG * PITCH_STUCK_PCT / 100.0   # 16.5（有理精确）
PLOAD_KW = 30.0
PLOAD_W = PLOAD_KW * 1000.0
VBUS_V = 400.0

METHOD_ID = "wt001_l0b_euler_dt0.01"
METHOD_VERSION = "1"
GOLDEN_ID = "wt001_v1"
MODEL_ID = "WT-001"
MODEL_VERSION = "1.0.0"
APPROVED_BY = "user（2026-11-07 CHG-20261107-01 批准链）"

# 故障族（scope 三档语境下的物理分支维度；与规格 §2 三族同名）
FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"      # fault id = v_sensor_bias
FAMILY_ACTUATOR = "actuator_fault"  # fault id = pitch_stuck
FAMILY_GUST = "gust_step"           # fault id = gust_step

FAULT_ID_SENSOR = "v_sensor_bias"
FAULT_ID_PITCH = "pitch_stuck"
FAULT_ID_GUST = "gust_step"

# SERIES_IDS = ['t'] + 规格 §1.2 表 22 信号 = 23 项（顺序按表；§4 项 4）
SERIES_IDS = [
    "t",
    "v_true_ms", "v_meas_ms", "bias_ms",
    "n_rotor_rpm", "lambda_tip", "cp_coeff",
    "beta_pitch_deg", "beta_cmd_deg", "beta_stuck_deg",
    "P_aero_kW", "P_wt_ref_kW", "P_wt_true_kW", "P_wt_meas_kW", "P_wt_est_kW", "d_wt_kW",
    "P_grid_true_kW", "P_grid_meas_kW",
    "P_load_demand_kW", "P_load_served_kW", "V_bus_V",
    "r_true_kW", "r_meas_kW",
]

# 五组固定 Run（规格 §4 项 2；gust monitor 不重复入 golden——WS-7 逐位等价实证）
RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False, "magnitude": 0.0, "unit": "m/s"},
    {"key": "closed_loop_fault", "role": "fault", "family": FAMILY_SENSOR,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": BIAS_B_MS, "unit": "m/s"},
    {"key": "monitor_only", "role": "monitor", "family": FAMILY_SENSOR,
     "feedback_mode": "monitor", "faulted": True, "magnitude": BIAS_B_MS, "unit": "m/s"},
    {"key": "pitch_stuck_closed_loop", "role": "fault", "family": FAMILY_ACTUATOR,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": PITCH_STUCK_PCT, "unit": "%"},
    {"key": "gust_closed_loop", "role": "fault", "family": FAMILY_GUST,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": GUST_DV_MS, "unit": "m/s"},
]


# ---------------------------------------------------------------------------
# EQ-WT-2 Cp 经验解析式（beta 单位：度；复算实证见模块 docstring）
# ---------------------------------------------------------------------------
def cp_coeff(lam, beta_deg):
    """EQ-WT-2：Cp(lam, beta) = c1*(c2/li - c3*beta - c4)*exp(-c5/li) + c6*lam；
    li = 1/(1/(lam + 0.08*beta) - 0.035/(beta^3 + 1))。"""
    li = 1.0 / (1.0 / (lam + 0.08 * beta_deg) - 0.035 / (beta_deg ** 3 + 1.0))
    return C1 * (C2 / li - C3 * beta_deg - C4) * math.exp(-C5 / li) + C6 * lam


def _fo_factor(h, tau):
    """foStep 指数因子（engine.js foStep 同式守卫：ratio>40 时 a=0）。"""
    ratio = h / tau
    return 0.0 if ratio > 40.0 else math.exp(-ratio)


def _run_flags(family, faulted, magnitude, mode):
    """Run spec -> 物理分支维度（EQ-WT-1 输入通道面）。"""
    is_sensor = bool(faulted) and family == FAMILY_SENSOR
    is_stuck = bool(faulted) and family == FAMILY_ACTUATOR
    is_gust = bool(faulted) and family == FAMILY_GUST
    b_mag = magnitude if is_sensor else 0.0        # B >= 0，通道值 b = -B
    dv = magnitude if is_gust else 0.0
    beta_stuck = (BETA_MAX_DEG * magnitude / 100.0) if is_stuck else None
    monitor_bypass = mode == "monitor" and is_sensor   # monitor 且 bias 故障：偏置不进物理回路
    return is_sensor, is_stuck, is_gust, b_mag, dv, beta_stuck, monitor_bypass


def _v_true_at(t, v0, dv, is_gust):
    """EQ-WT-1：v_true = v0 + dv*1(t>=t0)（仅 gust；t0 处右极限，post 采样行语义）。"""
    if is_gust and t >= T0_S - T_GUARD:
        return v0 + dv
    return v0


def _b_at(t, b_mag, is_sensor):
    """EQ-WT-1：b(t) = -B*1(t>=t0)（仅 v_sensor_bias；t0 处右极限）。"""
    if is_sensor and t >= T0_S - T_GUARD:
        return -b_mag
    return 0.0


def build_time_grid():
    """t[i] = i*dt（IEEE-754 积原值，禁止累加；fl001_oracle.py:207-210 同式）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


# ---------------------------------------------------------------------------
# §1.3-b 冻结更新序：h=0.01 子步循环（oracle/引擎双侧复刻的唯一权威文本的实现）
# ---------------------------------------------------------------------------
def _simulate(v0, mode, family, magnitude, faulted):
    """单工况 601 点全精度序列 + 事件快照 + 标量 + 指标 + 扫描诊断量。

    更新序冻结（§1.3-b）：①控制面（子步起点右值）→ ②P_wt 精确指数 + 子步解析积分
    → ③beta 精确指数（stuck 激活窗内钉扎）→ ④omega 前向 Euler（RHS 用②③后的
    P_wt/beta 与子步起点 omega、冻结 v_true）。状态行取子步起点值；代数量按行重算。
    """
    is_sensor, is_stuck, is_gust, b_mag, dv, beta_stuck, monitor_bypass = \
        _run_flags(family, faulted, magnitude, mode)

    # 初值（EQ-WT-6/7）：omega(0) = lambda_opt*v0/R（v0=9 用登记值 OMEGA_OPT_V9，
    # 运行内重算与其差 4 ulp——见模块 docstring 独立性声明 2）；beta(0)=0；
    # P_wt(0) = k_v*v0^3。
    if v0 == V0_MS:
        omega = OMEGA_OPT_V9
    else:
        omega = LAMBDA_OPT * v0 / R_M      # 仅 WS-8 非 golden 扫描用（v0 in {6,10}）
    beta = 0.0
    p_wt = KV_W * v0 ** 3

    a_e = _fo_factor(H_SUB_S, TAU_E_S)         # exp(-h/tau_e)
    a_b = _fo_factor(H_SUB_S, TAU_BETA_S)      # exp(-h/tau_beta)
    one_minus_a_e = 1.0 - a_e

    t_grid = build_time_grid()
    col = {sid: [0.0] * N_SAMPLES for sid in SERIES_IDS if sid != "t"}
    col["beta_stuck_deg"] = [None] * N_SAMPLES  # 事件域 null 信号（I_bat_cap_A 先例）

    int_wt = 0.0            # E_wt,true（W*s，②子步解析积分累计）
    min_omega_sub = omega   # 扫描诊断量：子步 omega 最小值（有效性域守卫证据）
    state_if = (omega, beta, p_wt)              # t=20.0 行状态（= 20.0 左极限值）

    def fill_row(i):
        """record(i)：状态行（子步起点值）+ 代数量按行重算（输入 post 右值语义）。"""
        ti = t_grid[i]
        v_true = _v_true_at(ti, v0, dv, is_gust)
        b = _b_at(ti, b_mag, is_sensor)
        v_ctrl = v_true if monitor_bypass else v_true + b
        v_est = v_true + b
        lam = omega * R_M / v_true
        cp = cp_coeff(lam, beta)
        p_aero = cp * HALF_RHO_A * v_true ** 3
        beta_ref = min(max(K_BETA * (omega - OMEGA_N), 0.0), BETA_MAX_DEG)
        p_ref = min(KOPT_W * omega ** 3, P_RATED_W, KV_W * v_ctrl ** 3)
        p_est = KV_W * v_est ** 3
        p_wt_kw = p_wt / 1000.0
        p_est_kw = p_est / 1000.0
        p_grid_kw = (PLOAD_W - p_wt) / 1000.0           # EQ-WT-8 馈线补差（受电为正）
        col["v_true_ms"][i] = v_true
        col["v_meas_ms"][i] = v_ctrl                    # §1.2：v_meas_ms = 控制面读数 v_ctrl
        col["bias_ms"][i] = b
        col["n_rotor_rpm"][i] = omega * 30.0 / math.pi
        col["lambda_tip"][i] = lam
        col["cp_coeff"][i] = cp
        col["beta_pitch_deg"][i] = beta
        col["beta_cmd_deg"][i] = beta_ref
        col["beta_stuck_deg"][i] = (beta_stuck if ti >= T0_S - T_GUARD else None) \
            if is_stuck else None
        col["P_aero_kW"][i] = p_aero / 1000.0
        col["P_wt_ref_kW"][i] = p_ref / 1000.0
        col["P_wt_true_kW"][i] = p_wt_kw
        col["P_wt_meas_kW"][i] = p_wt_kw                # 测量通道健康（§1.2）
        col["P_wt_est_kW"][i] = p_est_kw
        col["d_wt_kW"][i] = p_wt_kw - p_est_kw          # EQ-WT-8 代数恒等
        col["P_grid_true_kW"][i] = p_grid_kw
        col["P_grid_meas_kW"][i] = p_grid_kw            # 测量通道健康
        col["P_load_demand_kW"][i] = PLOAD_KW
        col["P_load_served_kW"][i] = PLOAD_KW
        col["V_bus_V"][i] = VBUS_V
        col["r_true_kW"][i] = p_wt_kw + p_grid_kw - PLOAD_KW      # 定义恒等（代数路径回归）
        col["r_meas_kW"][i] = p_wt_kw + p_grid_kw - PLOAD_KW      # 全功率通道健康 -> 0

    fill_row(0)
    for k in range(1, N_SUBSTEPS + 1):
        t_sub = (k - 1) * H_SUB_S
        ev = t_sub >= T0_S - T_GUARD
        # ① 控制面（子步起点右值；事件输入冻结）
        v_true = (v0 + dv) if (is_gust and ev) else v0
        b = (-b_mag) if (is_sensor and ev) else 0.0
        v_ctrl = v_true if monitor_bypass else v_true + b
        v_est = v_true + b
        beta_ref = min(max(K_BETA * (omega - OMEGA_N), 0.0), BETA_MAX_DEG)
        p_ref = min(KOPT_W * omega ** 3, P_RATED_W, KV_W * v_ctrl ** 3)
        # ② P_wt 精确指数 + 子步解析积分（EQ-WT-6 前段/EQ-WT-9）
        p_wt_old = p_wt
        p_wt = p_ref + (p_wt_old - p_ref) * a_e
        int_wt += p_ref * H_SUB_S + (p_wt_old - p_ref) * TAU_E_S * one_minus_a_e
        # ③ beta 精确指数；执行器激活窗内钉扎 beta == beta_stuck（Q2 位置强制）
        if is_stuck and ev:
            beta = beta_stuck
        else:
            beta = beta_ref + (beta - beta_ref) * a_b
        # ④ omega 前向 Euler（RHS：②③后的 P_wt/beta + 子步起点 omega + 冻结 v_true）
        lam = omega * R_M / v_true
        cp = cp_coeff(lam, beta)
        p_aero = cp * HALF_RHO_A * v_true ** 3
        omega = omega + H_SUB_S * (p_aero - p_wt) / (J_KG_M2 * omega)
        if omega < min_omega_sub:
            min_omega_sub = omega
        if k % SUB_PER_REC == 0:
            if k == I_F * SUB_PER_REC:
                state_if = (omega, beta, p_wt)
            fill_row(k // SUB_PER_REC)

    # E_wt,est 事件感知解析积分（EQ-WT-9：v_est 分段常值，阶跃点测度为零）
    b_pre = _b_at(0.0, b_mag, is_sensor)
    ve_pre = v0 + b_pre
    ve_post = _v_true_at(T0_S, v0, dv, is_gust) + _b_at(T0_S, b_mag, is_sensor)
    int_est = KV_W * ve_pre ** 3 * T0_S + KV_W * ve_post ** 3 * (DURATION_S - T0_S)
    int_load = PLOAD_W * DURATION_S
    int_grid = int_load - int_wt            # 与 int_wt 同测度（WS-3 恒等式被检对象）

    max_abs_d_wt = 0.0
    t_at_max_d_wt = t_grid[0]
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0
    for i in range(N_SAMPLES):
        d = abs(col["d_wt_kW"][i])
        if d > max_abs_d_wt:
            max_abs_d_wt = d
            t_at_max_d_wt = t_grid[i]
        rt = abs(col["r_true_kW"][i])
        if rt > max_abs_r_true:
            max_abs_r_true = rt
        rm = abs(col["r_meas_kW"][i])
        if rm > max_abs_r_meas:
            max_abs_r_meas = rm

    e_wt_true = int_wt / 3.6e6
    e_wt_est = int_est / 3.6e6
    e_wt_err = e_wt_est - e_wt_true
    e_grid = int_grid / 3.6e6
    e_load = int_load / 3.6e6

    metrics = {
        "E_wt_true_60s": {"value": e_wt_true, "unit": "kWh", "method": METHOD_ID},
        "E_wt_est_60s": {"value": e_wt_est, "unit": "kWh", "method": METHOD_ID},
        "E_wt_err_60s": {"value": e_wt_err, "unit": "kWh", "method": METHOD_ID},
        "E_grid_60s": {"value": e_grid, "unit": "kWh", "method": METHOD_ID},
        "E_load_60s": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "P_wt_true_end_kW": {"value": col["P_wt_true_kW"][-1], "unit": "kW",
                             "method": METHOD_ID},
        "P_grid_true_end_kW": {"value": col["P_grid_true_kW"][-1], "unit": "kW",
                               "method": METHOD_ID},
        "d_wt_end_kW": {"value": col["d_wt_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "max_abs_d_wt_kW": {"value": max_abs_d_wt, "unit": "kW", "method": "algebraic"},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
    }

    events = _fault_event(mode, is_sensor, is_stuck, is_gust, b_mag, dv, beta_stuck,
                          col, state_if, v0, monitor_bypass)

    scalars = {
        "E_wt_true_kWh": e_wt_true,
        "E_wt_est_kWh": e_wt_est,
        "E_wt_err_kWh": e_wt_err,
        "E_grid_kWh": e_grid,
        "E_load_kWh": e_load,
        "int_P_wt_true_60s_kWs": int_wt / 1000.0,
        "int_P_wt_est_60s_kWs": int_est / 1000.0,
        "int_P_grid_60s_kWs": int_grid / 1000.0,
        "int_P_load_60s_kWs": int_load / 1000.0,
        "P_wt_true_19p9_kW": col["P_wt_true_kW"][I_F - 1],
        "P_wt_meas_19p9_kW": col["P_wt_meas_kW"][I_F - 1],
        "t_19p9_s": t_grid[I_F - 1],
        "P_wt_true_20post_kW": col["P_wt_true_kW"][I_F],
        "P_wt_meas_20post_kW": col["P_wt_meas_kW"][I_F],
        "d_wt_20post_kW": col["d_wt_kW"][I_F],
        "P_wt_true_21_kW": col["P_wt_true_kW"][int(round(21.0 / DT_S))],
        "P_wt_true_26_kW": col["P_wt_true_kW"][int(round(26.0 / DT_S))],
        "P_wt_est_60_kW": col["P_wt_est_kW"][-1],
        "P_wt_true_60_kW": col["P_wt_true_kW"][-1],
        "P_grid_true_60_kW": col["P_grid_true_kW"][-1],
        "n_rotor_60_rpm": col["n_rotor_rpm"][-1],
        "beta_pitch_60_deg": col["beta_pitch_deg"][-1],
        "lambda_tip_60": col["lambda_tip"][-1],
        "cp_coeff_60": col["cp_coeff"][-1],
        "d_wt_60_kW": col["d_wt_kW"][-1],
        "max_abs_d_wt_kW": max_abs_d_wt,
        "t_at_max_abs_d_wt_s": t_at_max_d_wt,
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
    }
    return {
        "series": dict({"t": t_grid}, **col),
        "events": events,
        "scalars": scalars,
        "metrics": metrics,
        "diag": {"min_omega_sub": min_omega_sub, "v0_ms": v0,
                 "beta_stuck_deg": beta_stuck},
    }


def _fault_event(mode, is_sensor, is_stuck, is_gust, b_mag, dv, beta_stuck,
                 col, state_if, v0, monitor_bypass):
    """事件编码 v1（fl001_oracle.py:288-352 / pv001_oracle.py:413-461 同构）：
    pre = t0 左极限（输入未生效、状态 pre 值——A-1：beta_pitch pre=0、beta_stuck pre=null）；
    post = t0 采样行（右极限 post 语义，取序列行值——beta_stuck_deg(20.0)=16.5）。"""
    if not (is_sensor or is_stuck or is_gust):
        return []
    omega_if, beta_if, p_wt_if = state_if
    snap_units = {
        "v_true_ms": "m/s", "v_meas_ms": "m/s", "bias_ms": "m/s",
        "n_rotor_rpm": "rpm", "beta_pitch_deg": "°", "beta_stuck_deg": "°",
        "P_wt_ref_kW": "kW", "P_wt_true_kW": "kW", "P_wt_meas_kW": "kW",
        "P_wt_est_kW": "kW", "d_wt_kW": "kW", "P_grid_true_kW": "kW",
    }
    p_wt_pre_kw = p_wt_if / 1000.0
    p_est_pre_kw = KV_W * v0 ** 3 / 1000.0
    pre_vars = {
        "v_true_ms": v0,
        "v_meas_ms": v0,                      # pre：b=0（monitor 旁路同值）
        "bias_ms": 0.0,
        "n_rotor_rpm": omega_if * 30.0 / math.pi,
        "beta_pitch_deg": beta_if,            # 状态 pre 值（A-1：stuck 场景 = 0.0）
        "beta_stuck_deg": None,               # 事件域信号 pre 侧未生效（I_bat_cap_A 先例）
        "P_wt_ref_kW": min(KOPT_W * omega_if ** 3, P_RATED_W, KV_W * v0 ** 3) / 1000.0,
        "P_wt_true_kW": p_wt_pre_kw,
        "P_wt_meas_kW": p_wt_pre_kw,
        "P_wt_est_kW": p_est_pre_kw,
        "d_wt_kW": p_wt_pre_kw - p_est_pre_kw,
        "P_grid_true_kW": (PLOAD_W - p_wt_if) / 1000.0,
    }
    post_vars = {sid: col[sid][I_F] for sid in snap_units}
    if is_gust:
        event_type, target_signal, ev_magnitude, ev_unit = \
            "gust_step", "v_true_ms", dv, "m/s"
        fault_id = FAULT_ID_GUST
    elif is_stuck:
        event_type, target_signal, ev_magnitude, ev_unit = \
            "actuator_fault", "beta_stuck_deg", beta_stuck, "°"
        fault_id = FAULT_ID_PITCH
    else:
        # 通道符号化幅值（b(t) = -B，低估方向为负；RUNS magnitude 为正参数 B）
        event_type, target_signal, ev_magnitude, ev_unit = \
            "sensor_bias", "bias_ms", -b_mag, "m/s"
        fault_id = FAULT_ID_SENSOR
    return [{
        "event_id": "EV-001",
        "event_type": event_type,
        "trigger_s": T0_S,
        "target_signal": target_signal,
        "magnitude": ev_magnitude,
        "unit": ev_unit,
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T0_S, "derivation": "left_limit",
             "variables": pre_vars, "units": snap_units, "fault_id": fault_id},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T0_S, "derivation": "post_sample",
             "variables": post_vars, "units": snap_units, "fault_id": fault_id},
        ],
    }]


# ---------------------------------------------------------------------------
# simulate_run（归一契约：str run key / spec dict 双形态，oracle_base.resolve_run_spec）
# ---------------------------------------------------------------------------
def simulate_run(spec):
    """单组 Run 的 601 点全精度序列 + 事件快照 + 标量 + 指标。

    归一契约（ORACLE_INTERFACE_D2.md §2）：第一参数兼容 run key（str，归一式）与
    spec dict（verify_golden.py:196-201 现行调用式的兼容面），经
    oracle_base.resolve_run_spec 归一。spec 允许 v0_ms 覆盖键（仅自检扫描用，
    golden 路径全部为 RUNS 登记 v0=9）。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    mode = spec["feedback_mode"]
    family = spec.get("family", FAMILY_NONE)
    faulted = bool(spec["faulted"])
    magnitude = float(spec.get("magnitude", 0.0))
    v0 = float(spec.get("v0_ms", V0_MS))
    res = _simulate(v0, mode, family, magnitude, faulted)
    res_out = {
        "key": spec["key"],
        "role": spec["role"],
        "feedback_mode": mode,
        "faulted": faulted,
        "family": family,
        "magnitude": magnitude,
    }
    res_out.update(res)
    return res_out


# ---------------------------------------------------------------------------
# 自检 WS-1…WS-8（规格 §4 项 3 逐条；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
def self_check():
    """独立自检 WS-1…WS-8（不复用 FL/FC/GT/PV 的 PS/GS/GL 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    t = build_time_grid()

    # WS-1 网格 + 事件域 null 布局：601 点、t[i]=i*dt 严格递增、端点 0/60、各 Run 全列
    # 等长；beta_stuck_deg 非 stuck 场景整列 null、stuck 场景 t<t0 行 null / t>=t0 行
    # = 16.5；其余列无 null 且有限。
    ok1 = (len(t) == N_SAMPLES
           and all(t[i] < t[i + 1] for i in range(N_SAMPLES - 1))
           and all(t[i] == i * DT_S for i in range(N_SAMPLES))
           and t[0] == 0.0 and t[-1] == DURATION_S
           and all(len(r["series"][sid]) == N_SAMPLES for r in runs for sid in SERIES_IDS))
    null_ok = True
    for spec, r in zip(RUNS, runs):
        stuck_col = r["series"]["beta_stuck_deg"]
        is_stuck = spec["family"] == FAMILY_ACTUATOR
        for i, v in enumerate(stuck_col):
            if is_stuck:
                expect = None if t[i] < T0_S - T_GUARD else BETA_STUCK_GOLDEN
                if v != expect:      # 值比较（None/16.5；禁 identity 比较——float 对象不同）
                    null_ok = False
            elif v is not None:
                null_ok = False
    finite_ok = True
    for r in runs:
        for sid in SERIES_IDS:
            if sid == "beta_stuck_deg":
                continue
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    finite_ok = False
    ok1 = ok1 and null_ok and finite_ok
    rec("WS-1-grid-null-layout", ok1,
        "%d points, t[0]=%g, t[-1]=%g; null_layout=%s; finite=%s"
        % (len(t), t[0], t[-1], null_ok, finite_ok),
        "601 points, t[i]=i*dt, strictly increasing; beta_stuck_deg event-domain "
        "null layout; all other columns null-free finite",
        "grid: IEEE-754 product per index; 5 runs x 23 series columns")

    # WS-2 设计点闭合（规格 §1.3-a/§3.4）：k_opt*omega_opt^3 vs k_v*v0^3 差 <=1e-9 W；
    # gamma = k_v/(Cp_max*0.5*rho*A) = 1 +/- 1e-12。
    p_mppt = KOPT_W * OMEGA_OPT_V9 ** 3
    p_cap = KV_W * V0_MS ** 3
    d_design = abs(p_mppt - p_cap)
    gamma = KV_W / (CP_MAX * HALF_RHO_A)
    ok2 = d_design <= 1e-9 and abs(gamma - 1.0) <= 1e-12
    rec("WS-2-design-point", ok2,
        "k_opt*w_opt^3=%.12f W, k_v*v0^3=%.12f W, diff=%.3e W, gamma-1=%.3e"
        % (p_mppt, p_cap, d_design, gamma - 1.0),
        "|diff| <= 1e-9 W; |gamma-1| <= 1e-12",
        "registered constants (hardcoded; no runtime re-derivation per A-2); "
        "diff is the documented 1-2 ulp tie of the healthy min()")

    # WS-3 能量恒等 E_wt,true + E_grid = E_load（kW*s 同测度，<=1e-9；EQ-WT-8/9）
    worst3 = 0.0
    for r in runs:
        sc = r["scalars"]
        worst3 = max(worst3, abs((sc["int_P_wt_true_60s_kWs"] + sc["int_P_grid_60s_kWs"])
                                 - sc["int_P_load_60s_kWs"]))
    rec("WS-3-energy-identity", worst3 <= 1e-9, "%.3e kW.s" % worst3, "<=1e-9 kW.s",
        "E_wt_true + E_grid = E_load on the same integral measure, 5 runs")

    # WS-4 残差恒等：r_true / r_meas 逐点 0（<=1e-12 kW；EQ-WT-8 定义恒等，5 Run 全序列）
    worst4 = 0.0
    for r in runs:
        for sid in ("r_true_kW", "r_meas_kW"):
            for v in r["series"][sid]:
                worst4 = max(worst4, abs(v))
    rec("WS-4-residual-identity", worst4 <= 1e-12, "%.3e kW" % worst4, "<=1e-12 kW",
        "r_true/r_meas definitional identities over all 5 runs x 601 points")

    # WS-5 健康局不变量（规格 §3.4：P_wt=10、n=180.643754、d_wt=0、beta=0、lambda=8.100117、
    # E_wt_true=E_wt_est=1/6、E_grid=1/3、E_load=1/2）
    h = by_key["healthy"]
    s_h, sc_h = h["series"], h["scalars"]
    dev_p = max(abs(v - 10.0) for v in s_h["P_wt_true_kW"])
    dev_n = max(abs(v - OMEGA_OPT_V9 * 30.0 / math.pi) for v in s_h["n_rotor_rpm"])
    dev_d = max(abs(v) for v in s_h["d_wt_kW"])
    dev_b = max(abs(v) for v in s_h["beta_pitch_deg"])
    dev_l = max(abs(v - LAMBDA_OPT) for v in s_h["lambda_tip"])
    ok5 = (dev_p <= 1e-9 and dev_n <= 1e-6 and dev_d <= 1e-9 and dev_b <= 1e-12
           and dev_l <= 1e-6
           and abs(sc_h["E_wt_true_kWh"] - sc_h["E_wt_est_kWh"]) <= 1e-12
           and abs(sc_h["E_wt_true_kWh"] - 600.0 / 3600.0) <= 1e-12
           and abs(sc_h["E_grid_kWh"] - 1200.0 / 3600.0) <= 1e-12
           and abs(sc_h["E_load_kWh"] - 1800.0 / 3600.0) <= 1e-12)
    rec("WS-5-healthy-invariants", ok5,
        "maxdP=%.3e kW, maxdn=%.3e rpm, maxdd_wt=%.3e kW, maxdbeta=%.3e deg, "
        "maxdlambda=%.3e, dE=%.3e kWh"
        % (dev_p, dev_n, dev_d, dev_b, dev_l,
           abs(sc_h["E_wt_true_kWh"] - sc_h["E_wt_est_kWh"])),
        "P_wt 10.000 +/- 1e-9 kW; n 180.643754 +/- 1e-6 rpm; d_wt 0 +/- 1e-9 kW; "
        "beta 0; lambda 8.100117 +/- 1e-6; E_wt_true = E_wt_est = 1/6 kWh",
        "healthy baseline invariants (min() tie: two branches within 2 ulp, "
        "behaviourally equivalent per spec 3.5)")

    # WS-6 锚点全表复算（规格 §3.1/§3.2/§3.3）
    a = by_key["closed_loop_fault"]
    ap = by_key["monitor_only"]
    b = by_key["pitch_stuck_closed_loop"]
    c = by_key["gust_closed_loop"]
    s_a, s_ap, s_b, s_c = a["series"], ap["series"], b["series"], c["series"]
    sc_a, sc_ap, sc_b, sc_c = a["scalars"], ap["scalars"], b["scalars"], c["scalars"]
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def idx(tt):
        return int(round(tt / DT_S))

    # 场景 A：v_sensor_bias 闭环（B=1.0，v_ctrl=8，§3.1）
    chk("A.P_wt_true_20post", s_a["P_wt_true_kW"][I_F], 10.000000, 0.05)
    chk("A.P_wt_true_20p1", s_a["P_wt_true_kW"][idx(20.1)], 9.716731, 0.001)
    chk("A.P_wt_true_21", s_a["P_wt_true_kW"][idx(21.0)], 8.118379, 0.001)
    chk("A.P_wt_true_26", s_a["P_wt_true_kW"][idx(26.0)], 7.030698, 0.001)
    chk("A.P_wt_true_60", s_a["P_wt_true_kW"][-1], 7.023320, 0.05)
    chk("A.P_grid_true_60", s_a["P_grid_true_kW"][-1], 22.976680, 0.05)
    chk("A.n_rotor_60", s_a["n_rotor_rpm"][-1], 224.324628, 0.5)
    chk("A.beta_pitch_60", s_a["beta_pitch_deg"][-1], 5.5101, 0.1)
    chk("A.lambda_tip_60", s_a["lambda_tip"][-1], 10.058780, 0.01)
    chk("A.cp_coeff_60", s_a["cp_coeff"][-1], 0.337132, 0.01)
    chk("A.abs_d_wt_60", abs(s_a["d_wt_kW"][-1]), 0.0, 1e-9)
    chk("A.max_abs_d_wt", sc_a["max_abs_d_wt_kW"], 2.976680, 0.05)
    chk("A.t_at_max_abs_d_wt", sc_a["t_at_max_abs_d_wt_s"], 20.0, 1e-9)
    chk("A.max_abs_r_true", sc_a["max_abs_r_true_kW"], 0.0, 1e-12)
    chk("A.max_abs_r_meas", sc_a["max_abs_r_meas_kW"], 0.0, 1e-12)
    chk("A.E_wt_true", sc_a["E_wt_true_kWh"], 0.134419, 0.0005)
    chk("A.E_wt_est", sc_a["E_wt_est_kWh"], 0.133592, 0.0005)
    chk("A.dE_wt", sc_a["E_wt_err_kWh"], -0.000827, 0.0005)
    chk("A.E_grid", sc_a["E_grid_kWh"], 0.365581, 0.0005)
    chk("A.E_load", sc_a["E_load_kWh"], 0.5, 0.0005)
    # 场景 A'：v_sensor_bias 仅监测（§3.2）
    chk("Ap.P_wt_true_60", s_ap["P_wt_true_kW"][-1], 10.000000, 0.05)
    chk("Ap.d_wt_60", s_ap["d_wt_kW"][-1], 2.976680, 0.05)
    chk("Ap.E_wt_true", sc_ap["E_wt_true_kWh"], 0.166667, 0.0005)
    chk("Ap.E_wt_est", sc_ap["E_wt_est_kWh"], 0.133592, 0.0005)
    chk("Ap.dE_wt", sc_ap["E_wt_err_kWh"], -0.033074, 0.0005)
    ok_ap_const = max(abs(v - s_ap["P_wt_true_kW"][0])
                      for v in s_ap["P_wt_true_kW"]) <= 1e-9
    rows.append(("Ap.P_wt_true_const", 0.0 if ok_ap_const else 1.0, 0.0, 1e-12,
                 ok_ap_const))
    # 场景 B：pitch_stuck 闭环（55% 位置强制，§3.2；A-1 口径：状态行 pre + 事件域信号行）
    chk("B.beta_pitch_20post", s_b["beta_pitch_deg"][I_F], 0.0, 0.1)
    chk("B.beta_stuck_20post", s_b["beta_stuck_deg"][I_F], 16.5, 1e-12)
    chk("B.beta_pitch_20p1", s_b["beta_pitch_deg"][idx(20.1)], 16.5, 1e-12)
    chk("B.P_wt_true_21", s_b["P_wt_true_kW"][idx(21.0)], 9.242988, 0.05)
    chk("B.P_wt_true_26", s_b["P_wt_true_kW"][idx(26.0)], 4.584997, 0.05)
    chk("B.P_wt_true_60", s_b["P_wt_true_kW"][-1], 3.473779, 0.05)
    chk("B.n_rotor_60", s_b["n_rotor_rpm"][-1], 126.986056, 0.5)
    chk("B.lambda_tip_60", s_b["lambda_tip"][-1], 5.694091, 0.01)
    chk("B.cp_coeff_60", s_b["cp_coeff"][-1], 0.166741, 0.01)
    chk("B.d_wt_60", s_b["d_wt_kW"][-1], -6.526221, 0.05)
    chk("B.max_abs_d_wt", sc_b["max_abs_d_wt_kW"], 6.526221, 0.05)
    chk("B.t_at_max_abs_d_wt", sc_b["t_at_max_abs_d_wt_s"], 60.0, 1e-9)
    chk("B.E_wt_true", sc_b["E_wt_true_kWh"], 0.100984, 0.0005)
    chk("B.E_wt_est", sc_b["E_wt_est_kWh"], 0.166667, 0.0005)
    chk("B.dE_wt", sc_b["E_wt_err_kWh"], 0.065682, 0.0005)
    # 场景 C：gust_step 闭环（+2.0，v 9->11 跨额定区，§3.3）
    chk("C.P_wt_true_60", s_c["P_wt_true_kW"][-1], 15.000000, 0.05)
    chk("C.P_wt_true_21", s_c["P_wt_true_kW"][idx(21.0)], 10.676732, 0.001)
    chk("C.P_wt_true_26", s_c["P_wt_true_kW"][idx(26.0)], 14.935791, 0.001)
    chk("C.n_rotor_60", s_c["n_rotor_rpm"][-1], 212.304228, 0.5)
    chk("C.beta_pitch_60", s_c["beta_pitch_deg"][-1], 1.733766, 0.1)
    chk("C.lambda_tip_60", s_c["lambda_tip"][-1], 7.788912, 0.01)
    chk("C.cp_coeff_60", s_c["cp_coeff"][-1], 0.394360, 0.01)
    chk("C.d_wt_60", s_c["d_wt_kW"][-1], -3.257888, 0.05)
    chk("C.max_abs_d_wt", sc_c["max_abs_d_wt_kW"], 8.257888, 0.05)
    chk("C.t_at_max_abs_d_wt", sc_c["t_at_max_abs_d_wt_s"], 20.0, 1e-9)
    chk("C.E_wt_true", sc_c["E_wt_true_kWh"], 0.218959, 0.0005)
    chk("C.E_wt_est", sc_c["E_wt_est_kWh"], 0.258421, 0.0005)
    chk("C.dE_wt", sc_c["E_wt_err_kWh"], 0.039462, 0.0005)
    # 场景 C 亚额定对照（gust +1.0，v=10，§3.3 行 8）
    g1 = simulate_run({"key": "gust_closed_loop", "role": "scan", "family": FAMILY_GUST,
                       "feedback_mode": "closed_loop", "faulted": True,
                       "magnitude": 1.0, "unit": "m/s"})
    s_g1, sc_g1 = g1["series"], g1["scalars"]
    chk("C1.P_wt_true_60", s_g1["P_wt_true_kW"][-1], 13.717421, 0.05)
    chk("C1.beta_max", max(abs(v) for v in s_g1["beta_pitch_deg"]), 0.0, 1e-9)
    chk("C1.lambda_tip_60", s_g1["lambda_tip"][-1], 8.1019, 0.01)
    chk("C1.cp_coeff_60", s_g1["cp_coeff"][-1], 0.480012, 0.01)
    chk("C1.abs_d_wt_60", abs(s_g1["d_wt_kW"][-1]), 0.0, 1e-3)
    # 场景 C 域上角点（gust +3.0，v=12，§3.3 行 9）
    g3 = simulate_run({"key": "gust_closed_loop", "role": "scan", "family": FAMILY_GUST,
                       "feedback_mode": "closed_loop", "faulted": True,
                       "magnitude": 3.0, "unit": "m/s"})
    s_g3, sc_g3 = g3["series"], g3["scalars"]
    chk("C3.P_wt_true_60", s_g3["P_wt_true_kW"][-1], 15.000000, 0.05)
    chk("C3.beta_pitch_60", s_g3["beta_pitch_deg"][-1], 7.2095, 0.1)
    chk("C3.lambda_tip_60", s_g3["lambda_tip"][-1], 7.7260, 0.01)
    chk("C3.cp_coeff_60", s_g3["cp_coeff"][-1], 0.303758, 0.01)
    chk("C3.d_wt_60", s_g3["d_wt_kW"][-1], -8.703704, 0.05)

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    ok6 = not fails
    obs6 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs6 += "; FAIL: " + ",".join(fails)
    rec("WS-6-anchor-table", ok6, obs6,
        "spec 3.1/3.2/3.3 anchor table with per-row tolerances",
        "anchor recompute over frozen update order (state rows = substep start, "
        "inputs post right-limit; A-1: beta state pre / event-domain signal row)")

    # WS-7 gust 两模式逐位等价（<=1e-15；物理输入与控制模式无关，monitor 不入 golden）
    mon = simulate_run(dict(RUNS[4], feedback_mode="monitor"))
    worst7 = 0.0
    for sid in SERIES_IDS:
        for va, vb in zip(c["series"][sid], mon["series"][sid]):
            if va is None and vb is None:
                continue
            worst7 = max(worst7, abs(va - vb))
    scalars_equal = all(c["scalars"][k] == mon["scalars"][k]
                        for k in ("E_wt_true_kWh", "E_wt_est_kWh", "E_wt_err_kWh",
                                  "E_grid_kWh", "E_load_kWh"))
    ok7 = worst7 <= 1e-15 and scalars_equal
    rec("WS-7-gust-mode-equivalence", ok7, "%.3e (series), scalars_bitwise=%s"
        % (worst7, scalars_equal), "<=1e-15",
        "gust closed_loop vs monitor: physical input, bitwise-identical "
        "(no bias enters; monitor run not duplicated into golden)")

    # WS-8 无 NaN/Inf + pitch_stuck 域扫描 emit 硬条件 + UI 全域端点抽查（A-3 扩面）
    ok8 = True
    for r in runs + [g1, g3, mon]:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is not None and not math.isfinite(v):
                    ok8 = False
    # (a) pitch_stuck 域扫描：mag 20..85 步 5（14 点），v0=9 闭环——lambda(60) 与子步
    #     omega 最小值恒在有效性域（> 0.5*omega_opt(9)），P_wt(60)/lambda(60) 随 mag
    #     单调下降（规格 §2.2：P 6.20->1.73 kW、lambda_eq 6.91->4.52）。
    scan_rows = []
    prev_p60 = None
    prev_l60 = None
    mono_ok = True
    domain_ok = True
    for mag in range(20, 90, 5):
        res = _simulate(V0_MS, "closed_loop", FAMILY_ACTUATOR, float(mag), True)
        p60 = res["series"]["P_wt_true_kW"][-1]
        l60 = res["series"]["lambda_tip"][-1]
        min_om = res["diag"]["min_omega_sub"]
        scan_rows.append((mag, p60, l60, min_om))
        if not (l60 > 0.5 * LAMBDA_OPT and min_om > 0.5 * OMEGA_OPT_V9):
            domain_ok = False
        if prev_p60 is not None and not (p60 < prev_p60 and l60 < prev_l60):
            mono_ok = False
        prev_p60, prev_l60 = p60, l60
    # (b) UI 全域端点抽查：v0 in {6,10} x {bias -3.0, stuck 85%, gust +3.0, healthy}
    #     8 角点——P_wt in [0.370, 15.0] kW、n in [67.1, 242.6] rpm、beta <= 25.5 度、
    #     lambda 轨迹 > 0.5*lambda_opt（最小裕度 ~11.5%，规格 §3.5 v1.0 表）。
    corner_stats = []
    p_lo = p_hi = None
    n_lo = n_hi = None
    beta_hi = None
    lam_min = None
    lam_max = None
    corner_domain_ok = True
    for v0 in (6.0, 10.0):
        omega_opt_v0 = OMEGA_OPT_V9 if v0 == V0_MS else LAMBDA_OPT * v0 / R_M
        for cname, fam, mag in (("bias", FAMILY_SENSOR, 3.0),
                                ("stuck", FAMILY_ACTUATOR, 85.0),
                                ("gust", FAMILY_GUST, 3.0),
                                ("healthy", FAMILY_NONE, 0.0)):
            res = _simulate(v0, "closed_loop", fam, mag, fam != FAMILY_NONE)
            ps = res["series"]["P_wt_true_kW"]
            ns = res["series"]["n_rotor_rpm"]
            bs = res["series"]["beta_pitch_deg"]
            ls = res["series"]["lambda_tip"]
            cmin_om = res["diag"]["min_omega_sub"]
            stats = {
                "corner": "v0=%g:%s" % (v0, cname),
                "p_min": min(ps), "p_max": max(ps),
                "n_min": min(ns), "n_max": max(ns),
                "beta_max": max(bs), "lambda_min": min(ls), "lambda_max": max(ls),
                "min_omega_sub": cmin_om,
            }
            corner_stats.append(stats)
            if not (0.3703 - 1e-9 <= stats["p_min"] and stats["p_max"] <= 15.0 + 1e-9):
                corner_domain_ok = False
            if not (67.0 <= stats["n_min"] and stats["n_max"] <= 243.0):
                corner_domain_ok = False
            if not (-1e-12 <= stats["beta_max"] <= BETA_MAX_DEG * 85.0 / 100.0 + 1e-9):
                corner_domain_ok = False
            if not stats["lambda_min"] > 0.5 * LAMBDA_OPT:
                corner_domain_ok = False
            if not cmin_om > 0.5 * omega_opt_v0:
                corner_domain_ok = False
            p_lo = stats["p_min"] if p_lo is None else min(p_lo, stats["p_min"])
            p_hi = stats["p_max"] if p_hi is None else max(p_hi, stats["p_max"])
            n_lo = stats["n_min"] if n_lo is None else min(n_lo, stats["n_min"])
            n_hi = stats["n_max"] if n_hi is None else max(n_hi, stats["n_max"])
            beta_hi = stats["beta_max"] if beta_hi is None else max(beta_hi,
                                                                    stats["beta_max"])
            lam_min = stats["lambda_min"] if lam_min is None else min(lam_min,
                                                                     stats["lambda_min"])
            lam_max = stats["lambda_max"] if lam_max is None else max(lam_max,
                                                                     stats["lambda_max"])
    margin = (lam_min - 0.5 * LAMBDA_OPT) / (0.5 * LAMBDA_OPT)
    ok8 = ok8 and domain_ok and mono_ok and corner_domain_ok and margin >= 0.11
    rec("WS-8-domain-scan-ui-envelope", ok8,
        "stuck scan mag20..85: P60 %.4f->%.4f kW, lambda60 %.4f->%.4f, "
        "min_omega %.4f (domain_ok=%s, mono=%s); UI corners: P_wt [%.6f, %.6f] kW, "
        "n [%.4f, %.4f] rpm, beta_max %.4f deg, lambda [%.6f, %.6f], margin %.4f%%"
        % (scan_rows[0][1], scan_rows[-1][1], scan_rows[0][2], scan_rows[-1][2],
           min(r[3] for r in scan_rows), domain_ok, mono_ok,
           p_lo, p_hi, n_lo, n_hi, beta_hi, lam_min, lam_max, margin * 100.0),
        "stuck scan: lambda_eq > 0.5*lambda_opt and omega > 0.5*omega_opt(v0) for "
        "mag 20..85 step 5; UI envelope per spec 3.5 v1.0: P_wt [0.370, 15.0] kW, "
        "n [67.1, 242.6] rpm, beta <= 25.5 deg, stability margin >= 11%",
        "emit hard condition (GTL1 3.3.1 A-2 discipline) + A-3 UI full-domain "
        "endpoint spot check (8 corners)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
TOLERANCES = {
    "gate": {
        "tier": "T-A",
        # 规格 §4 项 6 八键（v1.0 修订 B-2 后键面）：
        "E_kWh": 1e-9, "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15,
        "n_rpm_atol": 1e-9, "r_true_kW": 1e-12, "t_s": 1e-9,
        # I_A 两键必带（形制键）：bias_ms 命中 verify_golden series_limit
        # startswith("bias") 分支（scripts/verify_golden.py:149-150）。
        "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
        # 注（B-2 修订）：无 d_wt_atol 键——d_wt_kW 经 T-A endswith("_kW") 支路路由至
        # P_kW_atol（scripts/verify_golden.py:145-146）；n_rpm_atol 走 _rpm 分支；
        # v/beta/lambda/cp 类无后缀分支走默认 fall-through 1e-9（:153）。
    },
}


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族/fault id 与规格 §2 三族同名）。"""
    if not spec["faulted"]:
        return None
    family = spec.get("family")
    if family == FAMILY_ACTUATOR:
        return {"family": FAMILY_ACTUATOR, "fault_id": FAULT_ID_PITCH,
                "t_start_s": T0_S, "beta_stuck_deg": BETA_MAX_DEG * spec["magnitude"] / 100.0}
    if family == FAMILY_GUST:
        return {"family": FAMILY_GUST, "fault_id": FAULT_ID_GUST,
                "t_start_s": T0_S, "delta_v_ms": spec["magnitude"]}
    return {"family": FAMILY_SENSOR, "fault_id": FAULT_ID_SENSOR,
            "t_start_s": T0_S, "bias_ms": -spec["magnitude"]}  # 符号化通道值（b = -B）


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
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "units": {"wind": "m/s", "angle": "°", "P": "kW", "E": "kWh", "t": "s", "V": "V"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T0_S,
            "h_sub_s": H_SUB_S, "n_substeps": N_SUBSTEPS,
            "v0_ms": V0_MS, "bias_B_ms": BIAS_B_MS, "pitch_stuck_pct": PITCH_STUCK_PCT,
            "gust_dv_ms": GUST_DV_MS,
            "rho_kg_m3": RHO_KG_M3,
            "c1": C1, "c2": C2, "c3": C3, "c4": C4, "c5": C5, "c6": C6,
            "lambda_opt": LAMBDA_OPT, "cp_max": CP_MAX,
            "k_v_W_per_m3s": KV_W, "area_m2": AREA_M2, "rotor_radius_m": R_M,
            "k_opt_W_per_rad3s": KOPT_W, "P_rated_W": P_RATED_W,
            "v_rated_ms": V_RATED_MS, "omega_N_rad_s": OMEGA_N,
            "omega_opt_v9_rad_s": OMEGA_OPT_V9,
            "tau_e_s": TAU_E_S, "tau_beta_s": TAU_BETA_S, "J_kg_m2": J_KG_M2,
            "K_beta_deg_per_rad_s": K_BETA, "beta_max_deg": BETA_MAX_DEG,
            "P_load_kW": PLOAD_KW, "V_bus_V": VBUS_V,
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "冻结更新序（规格 §1.3-b 唯一权威）：h=0.01 子步、事件输入冻结子步"
                    "起点右值；①控制面 → ②P_wt 精确指数+子步解析积分 → ③beta 精确指数"
                    "（stuck 激活窗内钉扎 beta==beta_stuck）→ ④omega 前向 Euler（RHS 用"
                    "②③后值与子步起点 omega）。状态行取子步起点值（t=20 行 = 状态 pre + "
                    "输入 post 右值；A-1：beta_pitch(20.0)=0.0、beta_stuck_deg(20.0)=16.5）。"
                    "beta_stuck_deg 为事件域 null 信号（非 stuck 场景整列 null）；"
                    "gust monitor 与闭环逐位同解、不重复入 golden（WS-7）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0,
                     "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/端点/极值）；d_wt 为测量链"
                        "代数恒等（不是能量损失）；r_true/r_meas 恒等 0 由 WS-4 与序列面"
                        "承载；lambda_tip/cp_coeff 无量纲",
    }


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar；先跑 WS-1…WS-8，失败 exit 2 不写盘）
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
        tool="tools/oracle/wt001_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/wt001_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def _scan_summary():
    """WS-8 证据输出（--scan）：pitch_stuck 域扫描极值 + UI 全域角点端点摘要。"""
    scan_rows = []
    for mag in range(20, 90, 5):
        res = _simulate(V0_MS, "closed_loop", FAMILY_ACTUATOR, float(mag), True)
        scan_rows.append({
            "magnitude_pct": float(mag),
            "P_wt_true_60_kW": res["series"]["P_wt_true_kW"][-1],
            "lambda_tip_60": res["series"]["lambda_tip"][-1],
            "n_rotor_60_rpm": res["series"]["n_rotor_rpm"][-1],
            "d_wt_60_kW": res["series"]["d_wt_kW"][-1],
            "min_omega_sub_rad_s": res["diag"]["min_omega_sub"],
        })
    corners = []
    for v0 in (6.0, 10.0):
        for cname, fam, mag in (("bias_ms_-3", FAMILY_SENSOR, 3.0),
                                ("pitch_stuck_85pct", FAMILY_ACTUATOR, 85.0),
                                ("gust_ms_+3", FAMILY_GUST, 3.0),
                                ("healthy", FAMILY_NONE, 0.0)):
            res = _simulate(v0, "closed_loop", fam, mag, fam != FAMILY_NONE)
            ps = res["series"]["P_wt_true_kW"]
            corners.append({
                "corner": "v0=%g:%s" % (v0, cname),
                "P_wt_true_min_kW": min(ps), "P_wt_true_max_kW": max(ps),
                "P_wt_true_60_kW": ps[-1],
                "n_rotor_min_rpm": min(res["series"]["n_rotor_rpm"]),
                "n_rotor_max_rpm": max(res["series"]["n_rotor_rpm"]),
                "n_rotor_60_rpm": res["series"]["n_rotor_rpm"][-1],
                "beta_pitch_max_deg": max(res["series"]["beta_pitch_deg"]),
                "lambda_tip_min": min(res["series"]["lambda_tip"]),
                "lambda_tip_max": max(res["series"]["lambda_tip"]),
                "min_omega_sub_rad_s": res["diag"]["min_omega_sub"],
            })
    lam_min = min(c["lambda_tip_min"] for c in corners)
    margin = (lam_min - 0.5 * LAMBDA_OPT) / (0.5 * LAMBDA_OPT)
    return {
        "check": "WS-8 (spec WT001_G2B_SPEC_APPROVED v1.0 §2.2/§3.5 v1.0/§4 item 3)",
        "validity_lower_bound": {"lambda": 0.5 * LAMBDA_OPT,
                                 "omega_v9": 0.5 * OMEGA_OPT_V9},
        "stuck_domain_scan_v0_9": scan_rows,
        "ui_full_domain_corners": corners,
        "ui_envelope_observed": {
            "P_wt_true_kW": [min(c["P_wt_true_min_kW"] for c in corners),
                             max(c["P_wt_true_max_kW"] for c in corners)],
            "n_rotor_rpm": [min(c["n_rotor_min_rpm"] for c in corners),
                            max(c["n_rotor_max_rpm"] for c in corners)],
            "beta_pitch_max_deg": max(c["beta_pitch_max_deg"] for c in corners),
            "lambda_tip": [lam_min, max(c["lambda_tip_max"] for c in corners)],
            "stability_margin_min_pct": margin * 100.0,
        },
    }


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
    if "--scan" in argv:
        print(json.dumps(_scan_summary(), ensure_ascii=False, indent=2))
        return 0
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
    print(json.dumps(build_golden(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
