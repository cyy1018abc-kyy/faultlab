# -*- coding: utf-8 -*-
"""pv001_oracle.py — PV-001 独立解析 oracle（PV-G2b-03，V070_WAVE_DESIGN T2 / CHG-20261104-10 批准链）

独立性声明（违反即 golden 无效；对标 fl001_oracle.py:1-10 先例，MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与参数唯一权威文本是
     FaultLab-evaluation/NEXT/PV001_G2B_SPEC_APPROVED.md v1.0 §1.3（EQ-PV-1…7，含
     PV-DRAFT-Q2 定案初值 P_pv(0)=k*G0*phi_T），此处独立硬编码。
  2. 本文件不与产品 engine 共享任何公式常量模块；不与 FL/FC/GT oracle 共享公式常量
     （oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，无模型语义，D-2a 契约）。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden
     只读比对（G0-DEC-16）。
  4. 本文件自带自检 PS-1…PS-7（PV001_G2B_SPEC_APPROVED §4 项 3 逐条），自检失败由
     调用方以 exit 2 报告。

模型（L0 行为级演示，PV-001 光伏逆变器单机并网等效；规格 §0/§1）：
  EQ-PV-1  G_true(t) = G0 - dG*1(t>=t0)（仅 shading_step）；G_meas(t) = G_true(t) + b(t)，
           b(t) = b0*1(t>=t0)（仅 sensor_drift）。t0 处右极限、post 采样行语义
           （同 fl001_oracle.py:103-108 口径）。
  EQ-PV-2  P_mpp_true(t) = k*G_true(t)*phi_T；k = P_STC/G_STC = 10/1000 = 0.01 kW/(W/m2)；
           phi_T = 1 + gamma_T*(T_cell-25)，T_cell = 25 C、gamma_T = -0.004 /C
           （登记常量，常温下 phi_T = 1 不激活）。
  EQ-PV-3  P_mpp_ref(t) = k*G_loop(t)*phi_T；G_loop = G_meas（closed_loop）/ G_true
           （monitor）——monitor 语义与 FL-001 同构（偏置不进入物理回路）。
  EQ-PV-4  tau_mppt*dP_pv/dt + P_pv = P_mpp_ref，tau_mppt = 1.0 s，
           P_pv(0) = k*G0*phi_T（Q2 定案/C-2：G0 取 EQ-PV-1 初始有效辐照度；
           G0=1000 时 P_pv(0)=10 kW，全部锚点不变）。分段常值目标 → 段内精确指数
           （闭式）：t0 后 P_pv(t) = P_ref(t0+) + (P_pv(t0-) - P_ref(t0+))*exp(-(t-t0)/tau)。
  EQ-PV-5  P_ac = P_pv_true（理想逆变）；P_grid = P_load - P_pv_true（馈线理想补差，
           受电为正）；P_load = 30 kW 恒定（A-pv-const-load，无 load_step 族）。
  EQ-PV-6  r_true = P_pv_true + P_grid_true - P_load_served（定义恒等）；
           r_meas = P_pv_meas + P_grid_meas - P_load_served（全功率测量通道健康 →
           恒等 0，与 FL-001 的 r_meas = 0.4*b 教学对照）；
           d_pv = P_pv_meas - P_pv_est = P_pv_true - k*G_meas*phi_T（测量链代数恒等，
           不是能量损失）：sensor_drift 闭环稳态 → 0（故障被闭环吸收）、仅监测
           d_pv = -k*b；shading d_pv 瞬态 → 0。
  EQ-PV-7  E_x = ∫P_x dt（kW*s，/3600 → kWh）；E_pv_est = ∫P_pv_est dt（事件感知
           解析积分；P_pv_est = k*G_meas*phi_T 恒用测量辐照度、不随模式切换）；
           E_pv_err = E_pv_est - E_pv_true（本系统无 SOC，能量账本通道承担
           「SOC_est 功能位」，规格 §1.3 注）。

foStep 同构与更新序冻结（gt001「更新序冻结」纪律，gt001_oracle.py:97-101 先例）：
  - fo_step 与 engine.js:443-450 foStep 逐字同式、同运算序：
    ratio = dt/tau；a = 0（ratio>40）| exp(-ratio)；
    y = target + (y-target)*a；integral = target*dt + (y-target)*tau*(1-a)。
  - PV 各轨事件后目标恒定（分段常值）→ 子步复合在实数域 telescopes 到「段长一次
    调用」的同一闭式（闭式=子步精确）。本 oracle 生产路径按段长一次调用
    （method_id=pv001_analytic 的解析闭式口径；规格 §4 项 6「解析闭式 oracle vs
    引擎精确指数同构」），引擎侧按 0.1 s 子步调用同一 foStep——两路径浮点差由
    PS-4 双口径交叉兜底（规格 §3.3 复算记录：P 通道 ≤8.9e-15、E 通道 ≤4.6e-13 kW*s，
    T-A 容差内）。
  - 事件步边界冻结：[0,t0) 段用 pre 目标、自 t0=20.0（右极限）起用 post 目标；
    t0 采样行 P_pv 连续（u=0 → a=exp(0)=1 → P_pv(t0)=P_pv(t0-)）。
  - pre 段目标与 Q2 初值逐位相等（P_pv(0)=k*G0*phi_T，C-2 定案）→ 复合偏置项
    恒为 0 → P_pv 在 pre 段逐位恒定、无启动瞬态。
  - 任何引擎侧改动若破坏「分段常值目标」前提（如引入级联/积分器目标——FC 级联
    陷阱），本同构即失效，须重开 G2b 重冻 golden（不得静默沿用）。

时间网格：t[i] = i * dt（IEEE-754 double 积，禁止累加，fl001_oracle.py:207-210 同式）；
  i_f = round(t0/dt) = 200；t[200] = 20.0 为 post 采样行；20.0- 左极限只存在于事件快照。
积分：事件感知分段解析积分（EQ-PV-7）。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="pv001_v1"、model_id="PV-001"、
    model_version="1.0.0"（三段式）、method_id="pv001_analytic"、engine_baseline=null、
    backend=null（§3.4 留位）。build_golden() 不含 generated_by/approval（v2 一段式：
    由 oracle_base.emit_golden 在 emit 时点现算回填，generated_at 不得 null 占位出境）。
  - approval 三字段首签（emit 时）：approved_by="user（2026-11-04 CHG-20261104-10
    批准链）"、approved_at=utc_now_iso()、approved_golden_sha256=V-03b 内容摘要
    （oracle_base.apply_approval / approval_payload_digest 助手）。
  - gate 块 T-A：规格 §4 项 6 七键（tier/E_kWh/P_kW_rtol/P_kW_atol/d_pv_atol/
    r_true_kW/t_s）+ I_A_rtol/I_A_atol 形制补键——scripts/verify_golden.py V-05/V-08
    参数化逻辑硬编码消费这两键（verify_golden.py:210 与 metric_within else 分支 :120），
    本波纪律限定 verify_golden「只追加注册、不改参数化逻辑」，故按规格 §4 项 6
    「形制对标 gt001_v2 tolerances.gate」（gt001_oracle.py:469-474 同键同值
    1e-12/1e-15）补键；此为对 ask 七键字面面的显式登记偏离（PV-G2b-03）。
  - SERIES_IDS = ['t'] + 规格 §1.2 全表 17 信号 = 18 项（C-4 定案：golden series
    惯例含 t 列，golden-compare.js:61-63 消费）；本波两族均无事件域 null 信号
    （bias_W_m2 全程有值 0/mag，规格 §1.2 注）。

Run 面（规格 §4 项 2，4 Run）：healthy / closed_loop_fault（sensor_drift +100 闭环）/
  monitor_only（sensor_drift +100 仅监测）/ shading_closed_loop（shading_step -300 闭环）；
  shading 仅监测轨与闭环逐位同解（PS-5 实证，物理输入与控制模式无关）不重复入 golden。

emit：python -I tools/oracle/pv001_oracle.py --emit（先跑 PS-1…PS-7，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/pv001_v1.json + .sha256 sidecar，LF 钉死）。
自检：python -I tools/oracle/pv001_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import math
import os
import sys

# oracle_base 与本文件同目录；显式注入目录使命令行 -I 隔离模式等入口也能解析
# （fl001_oracle.py:59-61 同式；oracle_base 为机制层，无模型语义，独立性声明不变）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结参数（PV001_G2B_SPEC_APPROVED v1.0 §1.1/§1.3/§2/§3；任何变更须重建 golden）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生）
T0 = 20.0                                       # 默认注入时刻（库口径，FAULT_CATALOG §0）
I_F = int(round(T0 / DT_S))                     # 200

G_STC_W_M2 = 1000.0     # STC 辐照度（EQ-PV-2 分母）
P_STC_KW = 10.0         # STC 基准功率（EQ-PV-2 分子）
K_KW_PER_WM2 = P_STC_KW / G_STC_W_M2             # 0.01 kW/(W/m2)（EQ-PV-2）
T_CELL_C = 25.0         # A-pv-temp-const：T_cell 恒 25 C
GAMMA_T_PER_C = -0.004  # 温度系数（登记常量，常温不激活）
PHI_T = 1.0 + GAMMA_T_PER_C * (T_CELL_C - 25.0)  # 常温 = 1.0（不激活）

G0_W_M2 = 1000.0        # 默认初始有效辐照度（EQ-PV-1；域 [300,1000]）
BIAS_W_M2 = 100.0       # G_sensor_bias 默认偏置（规格 §2.1 default +100）
SHADING_DG_W_M2 = 300.0  # shading_step 默认降幅（规格 §2.2 default 300，G0 1000→700）
TAU_MPPT_S = 1.0        # EQ-PV-4 一阶跟随时间常数（A-pv-mppt-firstorder）
PLOAD_KW = 30.0         # 恒定负载（EQ-PV-5）
VBUS_V = 400.0          # 等效母线电压（模型假设，非仿真状态）
P_PV_INIT_KW = K_KW_PER_WM2 * G0_W_M2 * PHI_T    # Q2 初值 = 10.0 kW（EQ-PV-4）

# 故障族（scope 三档语境下的物理分支维度；与规格 §2 两族同名）
FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_SHADING = "shading_step"

FAULT_ID_SENSOR = "G_sensor_bias"   # 规格 §2.1 fault id
FAULT_ID_SHADING = "shading_step"   # 规格 §2.2 fault id

METHOD_ID = "pv001_analytic"
METHOD_VERSION = "1"
GOLDEN_ID = "pv001_v1"
MODEL_ID = "PV-001"
MODEL_VERSION = "1.0.0"
APPROVED_BY = "user（2026-11-04 CHG-20261104-10 批准链）"

# SERIES_IDS = ['t'] + 规格 §1.2 全表 17 信号 = 18 项（C-4 定案；无事件域 null 信号）
SERIES_IDS = [
    "t",
    "G_true_W_m2", "G_meas_W_m2", "bias_W_m2",
    "P_mpp_true_kW", "P_mpp_ref_kW",
    "P_pv_true_kW", "P_pv_meas_kW", "P_pv_est_kW", "d_pv_kW",
    "P_ac_kW", "P_grid_true_kW", "P_grid_meas_kW",
    "P_load_demand_kW", "P_load_served_kW", "V_bus_V",
    "r_true_kW", "r_meas_kW",
]

# 四组固定 Run（规格 §4 项 2；shading monitor 不重复入 golden——PS-5 逐位等价实证）
RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False, "magnitude": 0.0, "unit": "W/m²"},
    {"key": "closed_loop_fault", "role": "fault", "family": FAMILY_SENSOR,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": BIAS_W_M2, "unit": "W/m²"},
    {"key": "monitor_only", "role": "monitor", "family": FAMILY_SENSOR,
     "feedback_mode": "monitor", "faulted": True, "magnitude": BIAS_W_M2, "unit": "W/m²"},
    {"key": "shading_closed_loop", "role": "fault", "family": FAMILY_SHADING,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": SHADING_DG_W_M2, "unit": "W/m²"},
]


# ---------------------------------------------------------------------------
# foStep 同构（engine.js:443-450 逐字；更新序冻结见模块 docstring）
# ---------------------------------------------------------------------------
def fo_step(y, target, tau, dt):
    """与 engine.js:443-450 foStep 逐字同式、同运算序（gt001_oracle.py:97-101 同纪律）：
    ratio = dt/tau；a = 0（ratio>40）| exp(-ratio)；
    y = target + (y-target)*a；integral = target*dt + (y-target)*tau*(1-a)。
    返回 (y_new, interval_integral)。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40.0 else math.exp(-ratio)
    return target + (y - target) * a, target * dt + (y - target) * tau * (1.0 - a)


# ---------------------------------------------------------------------------
# EQ-PV-1…EQ-PV-7 的事件感知闭式实现
# ---------------------------------------------------------------------------
def g_true_at(t, delta_g):
    """EQ-PV-1：G_true = G0 - dG*1(t>=t0)（仅 shading_step；t0 处右极限，post 采样行语义）。"""
    if delta_g > 0.0 and t >= T0:
        return G0_W_M2 - delta_g
    return G0_W_M2


def b_at(t, bias):
    """EQ-PV-1：b(t) = b0*1(t>=t0)（仅 sensor_drift 非零；t0 处右极限）。"""
    if bias > 0.0 and t >= T0:
        return bias
    return 0.0


def ref_target_at(t, mode, delta_g, bias):
    """EQ-PV-3：P_mpp_ref = k*G_loop*phi_T；G_loop = G_meas（closed_loop）/ G_true（monitor）。
    t 为区间/段起点（右极限 post 语义）。closed_loop 下 G_meas = G_true + b，
    pre 段 b=0 → 与 G_true 逐位相等。"""
    g_true = g_true_at(t, delta_g)
    g_loop = (g_true + b_at(t, bias)) if mode == "closed_loop" else g_true
    return K_KW_PER_WM2 * g_loop * PHI_T


def p_pv_est_at(t, delta_g, bias):
    """EQ-PV-7/§1.2：P_pv_est = k*G_meas*phi_T——恒用测量辐照度，不随运行模式切换。"""
    return K_KW_PER_WM2 * (g_true_at(t, delta_g) + b_at(t, bias)) * PHI_T


def _segments(mode, faulted, delta_g, bias):
    """事件感知分段表 [(u_start, u_end, target)]（EQ-PV-4「分段常值目标」前提的显式冻结）。
    pre 段目标与 Q2 初值逐位相等（C-2 定案）→ 复合偏置项恒为 0、无启动瞬态；
    故障 Run 在 t0 处切出 post 段（目标按 t0 右极限评估）；无故障 Run 单段全窗
    （目标全程 = pre 值，无事件）。"""
    segs = [(0.0, (T0 if faulted else DURATION_S), ref_target_at(0.0, mode, delta_g, bias))]
    if faulted:
        segs.append((T0, DURATION_S, ref_target_at(T0, mode, delta_g, bias)))
    return segs


def p_pv_at(t, mode, faulted, delta_g, bias):
    """EQ-PV-4 闭式：分段常值目标 → 按段长调用 fo_step。

    常值目标下 0.1 s 子步复合 telescopes 到「段长一次调用」的同一闭式（实数域精确
    相等；浮点差由 PS-4 双口径交叉兜底，规格 §3.3）。更新序冻结：段序 pre→post、
    段内目标取段起点右极限值；t0 采样行落段 1 终点（u=T0、段 2 长度 0 → a=exp(0)=1
    → P_pv(t0)=P_pv(t0-)，连续）。"""
    p = P_PV_INIT_KW
    for u0, u1, tgt in _segments(mode, faulted, delta_g, bias):
        if t <= u0:
            break
        p, _ = fo_step(p, tgt, TAU_MPPT_S, min(t, u1) - u0)
    return p


def pv_energy_integrals(mode, faulted, delta_g, bias, x_end=DURATION_S):
    """EQ-PV-7：事件感知分段解析积分（kW*s）。
    返回 (int_pv_true, int_pv_est, int_grid, int_load)：
      - int_pv_true：P_pv 段复合 fo_step integral 项（与 p_pv_at 同一分段/更新序）；
      - int_pv_est：P_pv_est = k*G_meas*phi_T 分段常值（恒用测量辐照度，不随模式切换）
        → 事件感知解析积分（阶跃点测度为零）；
      - int_grid：P_grid = P_load - P_pv_true 段线性（EQ-PV-5）→ Σ(P_load*u - int_seg)，
        与 int_pv_true 同测度（PS-2 恒等 E_pv+E_grid=E_load 的被检对象）；
      - int_load：P_load*x_end。
    """
    int_pv = 0.0
    int_est = 0.0
    int_grid = 0.0
    p = P_PV_INIT_KW
    for u0, u1, tgt in _segments(mode, faulted, delta_g, bias):
        u = min(x_end, u1) - u0
        if u <= 0.0:
            break
        p, integ = fo_step(p, tgt, TAU_MPPT_S, u)
        int_pv += integ
        est = p_pv_est_at(u0, delta_g, bias)
        int_est += est * u
        int_grid += PLOAD_KW * u - integ
    int_load = PLOAD_KW * x_end
    return int_pv, int_est, int_grid, int_load


def build_time_grid():
    """t[i] = i*dt（IEEE-754 积原值，禁止累加；fl001_oracle.py:207-210 同式）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def _pv_stepped_series(mode, faulted, delta_g, bias):
    """引擎 foStep 0.1 s 子步同构路径（PS-4 双口径交叉专用；自检用，不入生产路径）。

    更新序冻结（gt001「更新序冻结」纪律）：每输出步一次 fo_step（固定 dt=DT_S），
    目标按步起点评估（t>=t0 右极限 post 语义，fl001_oracle.py:103-108 口径）：
      p_pv <- fo_step(p_pv, ref(t[k-1]), tau, DT_S).y；∫P_pv 累加 fo_step integral 项。
    返回 (P_pv 序列 601 点, int_pv)。"""
    t = build_time_grid()
    p = P_PV_INIT_KW
    int_pv = 0.0
    vals = [p]
    for k in range(1, N_SAMPLES):
        tgt = ref_target_at(t[k - 1], mode, delta_g, bias)
        p, integ = fo_step(p, tgt, TAU_MPPT_S, DT_S)
        int_pv += integ
        vals.append(p)
    return vals, int_pv


# ---------------------------------------------------------------------------
# simulate_run（归一契约：str run key / spec dict 双形态，oracle_base.resolve_run_spec）
# ---------------------------------------------------------------------------
def simulate_run(spec):
    """单组 Run 的 601 点全精度序列 + 事件快照 + 标量 + 指标。

    归一契约（ORACLE_INTERFACE_D2.md §2）：第一参数兼容 run key（str，归一式）与
    spec dict（verify_golden.py:196-201 现行式），经 oracle_base.resolve_run_spec 归一。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    mode = spec["feedback_mode"]
    family = spec.get("family", FAMILY_SENSOR)
    faulted = spec["faulted"]
    magnitude = float(spec.get("magnitude", 0.0))
    bias = magnitude if (faulted and family == FAMILY_SENSOR) else 0.0        # EQ-PV-1 b0
    delta_g = magnitude if (faulted and family == FAMILY_SHADING) else 0.0    # EQ-PV-1 dG
    t = build_time_grid()

    col = {k: [0.0] * N_SAMPLES for k in SERIES_IDS if k != "t"}
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0
    max_abs_d_pv = 0.0
    t_at_max_d_pv = t[0]
    for i, ti in enumerate(t):
        g_true = g_true_at(ti, delta_g)                       # EQ-PV-1
        b = b_at(ti, bias)                                    # EQ-PV-1
        g_meas = g_true + b
        p_mpp_true = K_KW_PER_WM2 * g_true * PHI_T            # EQ-PV-2
        g_loop = g_meas if mode == "closed_loop" else g_true  # EQ-PV-3
        p_mpp_ref = K_KW_PER_WM2 * g_loop * PHI_T
        p_pv = p_pv_at(ti, mode, faulted, delta_g, bias)      # EQ-PV-4（闭式）
        p_pv_meas = p_pv                                      # 测量通道健康（§1.2）
        p_pv_est = p_pv_est_at(ti, delta_g, bias)             # 恒用测量辐照度
        d_pv = p_pv_meas - p_pv_est                           # EQ-PV-6 代数恒等
        p_ac = p_pv                                           # EQ-PV-5 理想逆变
        p_grid = PLOAD_KW - p_pv                              # EQ-PV-5 馈线补差（受电为正）
        p_grid_meas = PLOAD_KW - p_pv_meas                    # 测量通道健康
        r_true = p_pv + p_grid - PLOAD_KW                     # EQ-PV-6 定义恒等（代数路径回归）
        r_meas = p_pv_meas + p_grid_meas - PLOAD_KW           # EQ-PV-6 全功率通道健康 → 0
        col["G_true_W_m2"][i] = g_true
        col["G_meas_W_m2"][i] = g_meas
        col["bias_W_m2"][i] = b
        col["P_mpp_true_kW"][i] = p_mpp_true
        col["P_mpp_ref_kW"][i] = p_mpp_ref
        col["P_pv_true_kW"][i] = p_pv
        col["P_pv_meas_kW"][i] = p_pv_meas
        col["P_pv_est_kW"][i] = p_pv_est
        col["d_pv_kW"][i] = d_pv
        col["P_ac_kW"][i] = p_ac
        col["P_grid_true_kW"][i] = p_grid
        col["P_grid_meas_kW"][i] = p_grid_meas
        col["P_load_demand_kW"][i] = PLOAD_KW
        col["P_load_served_kW"][i] = PLOAD_KW
        col["V_bus_V"][i] = VBUS_V
        col["r_true_kW"][i] = r_true
        col["r_meas_kW"][i] = r_meas
        if abs(r_true) > max_abs_r_true:
            max_abs_r_true = abs(r_true)
        if abs(r_meas) > max_abs_r_meas:
            max_abs_r_meas = abs(r_meas)
        if abs(d_pv) > max_abs_d_pv:
            max_abs_d_pv = abs(d_pv)
            t_at_max_d_pv = ti

    x_end = t[-1]
    int_pv, int_est, int_grid, int_load = pv_energy_integrals(
        mode, faulted, delta_g, bias, x_end)
    e_pv_true = int_pv / 3600.0
    e_pv_est = int_est / 3600.0
    e_pv_err = e_pv_est - e_pv_true
    e_grid = int_grid / 3600.0
    e_load = int_load / 3600.0

    metrics = {
        "E_pv_true_60s": {"value": e_pv_true, "unit": "kWh", "method": METHOD_ID},
        "E_pv_est_60s": {"value": e_pv_est, "unit": "kWh", "method": METHOD_ID},
        "E_pv_err_60s": {"value": e_pv_err, "unit": "kWh", "method": METHOD_ID},
        "E_grid_60s": {"value": e_grid, "unit": "kWh", "method": METHOD_ID},
        "E_load_60s": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "P_pv_true_end_kW": {"value": col["P_pv_true_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "P_grid_true_end_kW": {"value": col["P_grid_true_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "d_pv_end_kW": {"value": col["d_pv_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "max_abs_d_pv_kW": {"value": max_abs_d_pv, "unit": "kW", "method": "algebraic"},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
    }

    events = _fault_event(mode, family, faulted, bias, delta_g, col)

    scalars = {
        "E_pv_true_kWh": e_pv_true,
        "E_pv_est_kWh": e_pv_est,
        "E_pv_err_kWh": e_pv_err,
        "E_grid_kWh": e_grid,
        "E_load_kWh": e_load,
        "int_P_pv_true_60s_kWs": int_pv,
        "int_P_grid_60s_kWs": int_grid,
        "int_P_load_60s_kWs": int_load,
        "P_pv_true_19p9_kW": col["P_pv_true_kW"][I_F - 1],
        "P_pv_meas_19p9_kW": col["P_pv_meas_kW"][I_F - 1],
        "t_19p9_s": t[I_F - 1],
        "P_pv_true_20post_kW": col["P_pv_true_kW"][I_F],
        "P_pv_meas_20post_kW": col["P_pv_meas_kW"][I_F],
        "d_pv_20post_kW": col["d_pv_kW"][I_F],
        "P_pv_true_21_kW": p_pv_at(21.0, mode, faulted, delta_g, bias),
        "P_pv_true_26_kW": p_pv_at(26.0, mode, faulted, delta_g, bias),
        "P_pv_true_60_kW": col["P_pv_true_kW"][-1],
        "P_grid_true_60_kW": col["P_grid_true_kW"][-1],
        "P_mpp_true_60_kW": col["P_mpp_true_kW"][-1],
        "P_mpp_ref_60_kW": col["P_mpp_ref_kW"][-1],
        "d_pv_60_kW": col["d_pv_kW"][-1],
        "max_abs_d_pv_kW": max_abs_d_pv,
        "t_at_max_abs_d_pv_s": t_at_max_d_pv,
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
    }
    return {
        "key": spec["key"],
        "role": spec["role"],
        "feedback_mode": mode,
        "faulted": faulted,
        "series": dict({"t": t}, **col),
        "events": events,
        "scalars": scalars,
        "metrics": metrics,
    }


def _fault_event(mode, family, faulted, bias, delta_g, col):
    """事件编码 v1（fl001_oracle.py:288-352 / gt001_oracle.py:259-292 同构）：
    pre = t0 左极限（b/dG 未生效）；post = t0 采样行（右极限 post 语义，取序列行值）。"""
    events = []
    if not faulted:
        return events
    if family == FAMILY_SHADING:
        event_type, target_signal, ev_magnitude = "shading_step", "G_true_W_m2", delta_g
        fid = FAULT_ID_SHADING
    else:
        event_type, target_signal, ev_magnitude = "sensor_bias", "bias_W_m2", bias
        fid = FAULT_ID_SENSOR
    snap_units = {
        "G_true_W_m2": "W/m²", "G_meas_W_m2": "W/m²", "bias_W_m2": "W/m²",
        "P_mpp_true_kW": "kW", "P_mpp_ref_kW": "kW",
        "P_pv_true_kW": "kW", "P_pv_meas_kW": "kW", "P_pv_est_kW": "kW",
        "d_pv_kW": "kW", "P_grid_true_kW": "kW",
    }
    p_pv_pre = p_pv_at(0.0, mode, faulted, delta_g, bias)
    pre_vars = {
        "G_true_W_m2": g_true_at(0.0, delta_g),
        "G_meas_W_m2": g_true_at(0.0, delta_g) + b_at(0.0, bias),
        "bias_W_m2": b_at(0.0, bias),
        "P_mpp_true_kW": K_KW_PER_WM2 * g_true_at(0.0, delta_g) * PHI_T,
        "P_mpp_ref_kW": ref_target_at(0.0, mode, delta_g, bias),
        "P_pv_true_kW": p_pv_pre,
        "P_pv_meas_kW": p_pv_pre,
        "P_pv_est_kW": p_pv_est_at(0.0, delta_g, bias),
        "d_pv_kW": p_pv_pre - p_pv_est_at(0.0, delta_g, bias),
        "P_grid_true_kW": PLOAD_KW - p_pv_pre,
    }
    post_vars = {sid: col[sid][I_F] for sid in snap_units}
    events.append({
        "event_id": "EV-001",
        "event_type": event_type,
        "trigger_s": T0,
        "target_signal": target_signal,
        "magnitude": ev_magnitude,
        "unit": "W/m²",
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T0, "derivation": "left_limit",
             "variables": pre_vars, "units": snap_units, "fault_id": fid},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T0, "derivation": "post_sample",
             "variables": post_vars, "units": snap_units, "fault_id": fid},
        ],
    })
    return events


# ---------------------------------------------------------------------------
# 自检 PS-1…PS-7（PV001_G2B_SPEC_APPROVED §4 项 3 逐条；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
def self_check():
    """独立自检 PS-1…PS-7（规格 §4 项 3 逐条；不复用 FL/FC/GT 的 SC/GS 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}

    # PS-1 网格：601 点、严格递增、t[i]=i*dt（IEEE-754 积）、端点 0/60、各 Run 全列等长
    t = build_time_grid()
    ok1 = (len(t) == N_SAMPLES
           and all(t[i] < t[i + 1] for i in range(N_SAMPLES - 1))
           and all(t[i] == i * DT_S for i in range(N_SAMPLES))
           and t[0] == 0.0 and t[-1] == DURATION_S
           and all(len(r["series"][sid]) == N_SAMPLES for r in runs for sid in SERIES_IDS))
    rec("PS-1-grid", ok1, "%d points, t[0]=%g, t[-1]=%g" % (len(t), t[0], t[-1]),
        "601 points, strictly increasing, t[i]=i*dt",
        "grid: IEEE-754 product per index, no accumulation; all 4 runs x 18 series columns")

    # PS-2 能量恒等 E_pv_true + E_grid = E_load（kW*s 同测度，<=1e-9；EQ-PV-5/7）
    worst2 = 0.0
    for r in runs:
        sc = r["scalars"]
        worst2 = max(worst2, abs((sc["int_P_pv_true_60s_kWs"] + sc["int_P_grid_60s_kWs"])
                                 - sc["int_P_load_60s_kWs"]))
    rec("PS-2-energy-identity", worst2 <= 1e-9, "%.3e kW.s" % worst2, "<=1e-9 kW.s",
        "E_pv_true + E_grid = E_load on the same integral measure, 4 runs")

    # PS-3 残差恒等：r_true / r_meas 逐点 0（<=1e-12 kW；EQ-PV-6 定义恒等，4 Run 全序列）
    worst3 = 0.0
    for r in runs:
        for sid in ("r_true_kW", "r_meas_kW"):
            for v in r["series"][sid]:
                worst3 = max(worst3, abs(v))
    rec("PS-3-residual-identity", worst3 <= 1e-12, "%.3e kW" % worst3, "<=1e-12 kW",
        "r_true/r_meas definitional identities over all 4 runs x 601 points")

    # PS-4 锚点复算（规格 §3.1/§3.2 全表）+ foStep 双口径交叉（闭式 vs 0.1s 子步同构）
    a = by_key["closed_loop_fault"]
    b = by_key["monitor_only"]
    c = by_key["shading_closed_loop"]
    s_a, s_b, s_c = a["series"], b["series"], c["series"]
    sc_a, sc_b, sc_c = a["scalars"], b["scalars"], c["scalars"]
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def idx(tt):
        return int(round(tt / DT_S))

    # 场景 A：sensor_drift 闭环（b=+100，§3.1）
    chk("A.P_pv_true_60", s_a["P_pv_true_kW"][-1], 11.00, 0.05)
    chk("A.P_grid_true_60", s_a["P_grid_true_kW"][-1], 19.00, 0.05)
    chk("A.P_mpp_true_60", s_a["P_mpp_true_kW"][-1], 10.00, 0.05)
    chk("A.P_mpp_ref_60", s_a["P_mpp_ref_kW"][-1], 11.00, 0.05)
    chk("A.abs_d_pv_60", abs(s_a["d_pv_kW"][-1]), 0.0, 1e-9)
    chk("A.max_abs_d_pv", sc_a["max_abs_d_pv_kW"], 1.00, 0.05)
    chk("A.t_at_max_abs_d_pv", sc_a["t_at_max_abs_d_pv_s"], 20.0, 1e-9)
    chk("A.max_abs_r_true", sc_a["max_abs_r_true_kW"], 0.0, 1e-12)
    chk("A.max_abs_r_meas", sc_a["max_abs_r_meas_kW"], 0.0, 1e-12)
    chk("A.E_pv_true", sc_a["E_pv_true_kWh"], 0.1775, 0.0005)
    chk("A.E_pv_est", sc_a["E_pv_est_kWh"], 0.1777778, 0.0005)
    chk("A.dE_pv", sc_a["E_pv_err_kWh"], 0.0002778, 0.0005)
    chk("A.E_grid", sc_a["E_grid_kWh"], 0.3225, 0.0005)
    chk("A.E_load", sc_a["E_load_kWh"], 0.5, 0.0005)
    chk("A.P_pv_20p1", s_a["P_pv_true_kW"][idx(20.1)], 10.095163, 0.001)
    chk("A.P_pv_21p0", s_a["P_pv_true_kW"][idx(21.0)], 10.632121, 0.001)
    chk("A.P_pv_26p0", s_a["P_pv_true_kW"][idx(26.0)], 10.997521, 0.001)
    # 场景 B：sensor_drift 仅监测（§3.2）
    chk("B.P_pv_true_60", s_b["P_pv_true_kW"][-1], 10.00, 0.05)
    chk("B.P_grid_true_60", s_b["P_grid_true_kW"][-1], 20.00, 0.05)
    chk("B.d_pv_60", s_b["d_pv_kW"][-1], -1.00, 0.05)
    chk("B.E_pv_true", sc_b["E_pv_true_kWh"], 0.1666667, 0.0005)
    chk("B.E_pv_est", sc_b["E_pv_est_kWh"], 0.1777778, 0.0005)
    chk("B.dE_pv", sc_b["E_pv_err_kWh"], 0.0111111, 0.0005)
    # 场景 C：shading_step（dG=-300，闭环=仅监测，§3.2）
    chk("C.P_pv_true_60", s_c["P_pv_true_kW"][-1], 7.00, 0.05)
    chk("C.P_grid_true_60", s_c["P_grid_true_kW"][-1], 23.00, 0.05)
    chk("C.max_abs_d_pv", sc_c["max_abs_d_pv_kW"], 3.00, 0.05)
    chk("C.t_at_max_abs_d_pv", sc_c["t_at_max_abs_d_pv_s"], 20.0, 1e-9)
    chk("C.abs_d_pv_60", abs(s_c["d_pv_kW"][-1]), 0.0, 1e-9)
    chk("C.E_pv_true", sc_c["E_pv_true_kWh"], 0.1341667, 0.0005)
    chk("C.E_pv_est", sc_c["E_pv_est_kWh"], 0.1333333, 0.0005)
    chk("C.dE_pv", sc_c["E_pv_err_kWh"], -0.0008333, 0.0005)
    chk("C.P_pv_21p0", s_c["P_pv_true_kW"][idx(21.0)], 8.103638, 0.001)

    # foStep 双口径交叉：生产闭式（段长一次 fo_step）vs 引擎 0.1s 子步同构路径
    worst_p = 0.0
    worst_e = 0.0
    for spec in RUNS:
        mode = spec["feedback_mode"]
        faulted = spec["faulted"]
        family = spec.get("family", FAMILY_SENSOR)
        magnitude = float(spec.get("magnitude", 0.0))
        bias = magnitude if (faulted and family == FAMILY_SENSOR) else 0.0
        delta_g = magnitude if (faulted and family == FAMILY_SHADING) else 0.0
        stepped, int_stepped = _pv_stepped_series(mode, faulted, delta_g, bias)
        closed = by_key[spec["key"]]["series"]["P_pv_true_kW"]
        for v_step, v_close in zip(stepped, closed):
            worst_p = max(worst_p, abs(v_step - v_close))
        int_closed = pv_energy_integrals(mode, faulted, delta_g, bias)[0]
        worst_e = max(worst_e, abs(int_stepped - int_closed))
    ok_dual = worst_p <= 1e-12 and worst_e <= 1e-9

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    ok4 = (not fails) and ok_dual
    obs4 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs4 += "; FAIL: " + ",".join(fails)
    obs4 += "; foStep dual-path: maxdP=%.3e kW, maxdE=%.3e kW.s" % (worst_p, worst_e)
    rec("PS-4-anchors-dualpath", ok4, obs4,
        "spec 3.1/3.2 table; dual-path P<=1e-12 kW, E<=1e-9 kW.s",
        "anchor recompute (closed-form path) + engine foStep 0.1s substep isomorphism cross-check")

    # PS-5 shading 两模式逐位等价（<=1e-15；物理输入与控制模式无关，monitor 不入 golden）
    mon = simulate_run(dict(RUNS[3], feedback_mode="monitor"))
    worst5 = 0.0
    for sid in SERIES_IDS:
        for va, vb in zip(c["series"][sid], mon["series"][sid]):
            worst5 = max(worst5, abs(va - vb))
    scalars_equal = all(c["scalars"][k] == mon["scalars"][k]
                        for k in ("E_pv_true_kWh", "E_pv_est_kWh", "E_pv_err_kWh",
                                  "E_grid_kWh", "E_load_kWh"))
    ok5 = worst5 <= 1e-15 and scalars_equal
    rec("PS-5-shading-mode-equivalence", ok5, "%.3e kW (series), scalars_bitwise=%s"
        % (worst5, scalars_equal), "<=1e-15",
        "shading closed_loop vs monitor: physical input, bitwise-identical (no bias enters)")

    # PS-6 健康局不变量（规格 §3.3：P_pv=10、P_grid=20、d_pv=0、r=0、E_pv_true=E_pv_est）
    h = by_key["healthy"]
    s_h, sc_h = h["series"], h["scalars"]
    ok6 = (all(v == 10.0 for v in s_h["P_pv_true_kW"])
           and all(v == 20.0 for v in s_h["P_grid_true_kW"])
           and all(v == 0.0 for v in s_h["d_pv_kW"])
           and all(v == 0.0 for v in s_h["r_true_kW"])
           and all(v == 0.0 for v in s_h["r_meas_kW"])
           and sc_h["E_pv_true_kWh"] == sc_h["E_pv_est_kWh"]
           and abs(sc_h["E_pv_true_kWh"] - 600.0 / 3600.0) <= 1e-12
           and abs(sc_h["E_grid_kWh"] - 1200.0 / 3600.0) <= 1e-12)
    rec("PS-6-healthy-invariants", ok6,
        "P_pv==10, P_grid==20, d_pv==0, r==0, E_pv_true==E_pv_est (bitwise)",
        "bitwise constant rows; E within 1e-12 kWh of 600/3600 and 1200/3600",
        "healthy baseline invariants (Q2 init removes start-up transient)")

    # PS-7 无 NaN/Inf/意外 null + UI 域包络抽查（规格 §3.4：P_pv in [0,13]、P_grid in [-3,45]）
    ok7 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    ok7 = False
    for r in runs:
        for v in r["series"]["P_pv_true_kW"]:
            if not (0.0 <= v <= 13.0):
                ok7 = False
        for v in r["series"]["P_grid_true_kW"]:
            if not (-3.0 <= v <= 45.0):
                ok7 = False
    rec("PS-7-finite-envelope", ok7,
        "4x18x601 finite (no null), P_pv in [0,13] kW, P_grid in [-3,45] kW",
        "all finite; UI envelope per spec 3.4",
        "no NaN/Inf/null (no event-domain null signal this wave); envelope spot check")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
TOLERANCES = {
    "gate": {
        "tier": "T-A",
        # 规格 §4 项 6 七键面（PV001_G2B_SPEC_APPROVED）：
        "E_kWh": 1e-9, "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15,
        "d_pv_atol": 1e-9, "r_true_kW": 1e-12, "t_s": 1e-9,
        # 形制补键（显式登记偏离，见模块 docstring「golden」节）：
        # verify_golden V-05/V-08 参数化逻辑硬编码消费 I_A_rtol/I_A_atol
        # （verify_golden.py:210 / metric_within else 分支 :120），本波纪律限定
        # verify_golden 只追加注册不改参数化逻辑 → 按规格「形制对标 gt001_v2
        # tolerances.gate」（gt001_oracle.py:469-474）补同键同值。
        "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
    },
}


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族/fault id 与规格 §2 两族同名）。"""
    if not spec["faulted"]:
        return None
    if spec.get("family") == FAMILY_SHADING:
        return {"family": FAMILY_SHADING, "fault_id": FAULT_ID_SHADING,
                "t_start_s": T0, "delta_g_W_m2": spec["magnitude"]}
    return {"family": FAMILY_SENSOR, "fault_id": FAULT_ID_SENSOR,
            "t_start_s": T0, "bias_W_m2": spec["magnitude"]}


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
        "units": {"G": "W/m²", "P": "kW", "E": "kWh", "t": "s", "V": "V"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T0,
            "G0_W_m2": G0_W_M2, "bias_W_m2": BIAS_W_M2, "shading_dg_W_m2": SHADING_DG_W_M2,
            "P_STC_kW": P_STC_KW, "G_STC_W_m2": G_STC_W_M2, "k_kW_per_W_m2": K_KW_PER_WM2,
            "gamma_T_per_C": GAMMA_T_PER_C, "T_cell_C": T_CELL_C, "phi_T": PHI_T,
            "tau_mppt_s": TAU_MPPT_S, "P_load_kW": PLOAD_KW, "V_bus_V": VBUS_V,
            "P_pv_init_kW": P_PV_INIT_KW,
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "分段常值目标 → 段长一次 fo_step 闭式（method=pv001_analytic）；"
                    "引擎侧按 0.1 s 子步调用同一 foStep（更新序冻结见 oracle 头注）；"
                    "shading 仅监测轨与闭环逐位同解、不重复入 golden（PS-5）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/端点/极值）；d_pv 为测量链"
                        "代数恒等（不是能量损失）；r_true/r_meas 恒等 0 由 PS-3 与序列面承载",
    }


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar；先跑 PS-1…PS-7，失败 exit 2 不写盘）
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
        tool="tools/oracle/pv001_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/pv001_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
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
