# -*- coding: utf-8 -*-
"""fc001_l1_oracle.py — FC-001 L1 电化学-热（V-I 极化链 + 电堆单节点热）独立数值 oracle
（FCECH-G2b-03，FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.4/§1.5/§3.3/§4；
CHG-20261113-01 批准链，2026-11-13）。

独立性声明（违反即 golden 无效；对标 fl001_l1_oracle.py:1-19 / gt001_l1_oracle.py 先例，
MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与常量唯一权威文本是
     FaultLab-evaluation/NEXT/FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md v1.0
     （EQ-FCEC-1…7 §1.4 冻结 + §1.5 十常量定案值 + §3.3 域扫描证据 + §4 golden 计划），
     此处独立硬编码（E0_ref 由整定依据①锚点闭式派生：400 + c_act·ln6 + 50·R_ohm0 +
     c_conc·ln1.5——非自由度；其余九常量全精度字面硬编码）。
  2. 本文件不 import fc001_oracle（L0 解析轨 oracle，字节冻结零触碰）；不与 FL/FC/GT/PV/
     WT/MG oracle 共享公式常量（oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，
     无模型语义，D-2a 契约）。L0 电气面闭式与 load_step/actuator 级联 foStep 子步递推
     （fc001_oracle.py 数值口径，engine.js:780-790 级联结构）为本文件内独立逐字复刻，
     非 import——复刻无损由 FEC-1 对 fc001_v1 冻结标量/级联序列列的环境校验证明。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden 只读
     比对（G0-DEC-16）。出生即 oracle_base 接入（规格 §4 项 2：新文件无 V-03 历史字节
     负担；GT/FL 先例 GTL1 §4 项 2）。
  4. 本文件自带自检 FEC-1…FEC-8（规格 §4 项 4 预案落定，Q8 定案 (a) 新段先例），自检
     失败由调用方以 exit 2 报告；emit 前置自检（失败不写盘）。

模型（electrochem_model="on" 轨；L1 · 电堆极化与单节点热，规格 §1.2/§1.3/§1.4）：
  EQ-FCEC-1  V_stack(I, T_st) = E0(T_st) − c_act·ln(1+I/I_0) − R_ohm(T_st)·I
             − c_conc·ln(I_lim/(I_lim−I))   [V；I < I_lim 值域硬条件（§3.3）]
  EQ-FCEC-5  E0(T_st) = E0_ref + k_E·(T_st − T_ref)，T_ref = 298.15 K；
             k_E = 50·α_ohm·R_ohm0（整定依据④恒等式——A-2(i)，符号域钉正）
  EQ-FCEC-6  R_ohm(T_st) = R_ohm0·(1 + α_ohm·(T_st − T_ref))
  EQ-FCEC-4  P_loss_W = (E0(T_st) − V_stack)·I【W 记账——A-3 定案，Q3 定案 (a)】；
             信号面 P_loss_stack_kW = P_loss_W/1000
  EQ-FCEC-3  C_st·dT_st/dt = P_loss_W − h_st·(T_st − T_amb)，T_st(0) = T_amb = 298.15 K
             （W 记账基——复用 FLTH EQ-FLTH-4 形态）
  EQ-FCEC-2  on 域 P_fc,true = V_stack·I_fc/1000（kW，替换 EQ-3 前半 A-const-v 电堆半边）；
             off 域 P_fc = 0.4·I_fc 原样（fc001_v1 冻结面，本 oracle 不承载）
  EQ-FCEC-7  电气面保留（EQ-1/EQ-2/EQ-5/EQ-6 原样——测量链/控制面零升级）；
             r_true := P_fc,true + P_bat,true − P_load ≡ 0（P_bat = P_load − P_fc,true
             理想平衡源口径不变）；r_meas := 0.4·b + (0.4 − V_stack/1000)·I_fc（Q5 (a)）；
             记账基（A-5 定案）：on 域 SOC_true/E_bat/P_bat 按 P_fc,true 重算（真实功率基）；
             SOC_est（测量链 0.4·I_meas 未动）与 L0 逐位同。
  分配器（A-fcec-dispatch）：EQ-6 原样——0.4 kV 名义电压，控制器不感知 V_stack；
             电池半边（I_bat/P_bat 换算 0.4 kV）on 域保留。

更新序（规格 §1.3/§4 项 3 冻结口径——oracle/引擎双侧复刻唯一权威文本）：
  RK4 状态向量 y_rk4 = [T_st]（1 维新增）；I_fc/I_fc_ref 保留 L0 更新序——healthy/sensor/
  monitor 轨解析闭式（G0-DEC-15 口径逐字）、load_step/actuator 轨级联 foStep 子步递推
  （逐字复刻）——非 RK4 状态、不依赖 T_st（§3.2 电气面逐位同的结构原因）。
  T_st 经典 RK4 固定步长 dt0.01（6000 子步/60 s），RHS 内 I_fc 冻结于子步起点值：
  每 0.1 s 输出步 10 个 0.01 s 子步（engine.js SUB/DT_INT 同式）；事件时刻对齐子步边界
  （time ≥ t_start − 1e-9，time = (k−1)·SUB·DT_INT + j·DT_INT 引擎同式）。
  I 冻结口径下 T_st ODE 子步内为线性常系数 θ' = λ·θ + b（P_loss_W 对 T_st 线性——
  EQ-FCEC-4/6 结构推论）⇒ FEC-7 RK4 vs 子步解析交叉证据面成立（FLTH FL-7 同构）。
  E_fc 账本 = ∫P_fc,true dt 子步梯形（FLTH Q4 同款 idiom；E_bat = ∫P_bat,true =
  ∫P_load − ∫P_fc,true 按定义恒等基组装 ⇒ FEC-2 恒等式逐 Run 闭合）。
  FEC-7 半步自收敛口径：rk4_sub=2 将 RK4 积分步细分为 2×0.005 s、I 冻结面不变（级联
  DT_INT=0.01 为引擎冻结常量、不属于热积分精化对象）——与批准轮 §3.3 ④ 预演散差
  ≤2.4e-12 K 同口径（散差 = RK4 截断 + 浮点路径噪声级；若按 dt_int=0.005 全轨重仿真
  则 I 冻结面改变、散差为 O(h) 量化偏差——非批准口径）。
  FEC-8 极端角点扫描口径：load0=45 + step20 角点以 load0 工作点稳态起步（op_init——
  i_fc(0)=i_fc_ref(0)=(load0−10)/0.4=87.5 A，跳过起动瞬态），复现 §3.3 角点行批准预填
  （I_fc(60)=137.499989 A / T_st(60)=401.669 K / V_stack=337.881 V / P_fc=46.459 kW /
  dSOC=−0.2272 pp / dE_bat=+0.0909 kWh / max|P_bat|=31.828 kW 及 L0 侧 30 kW）；
  注册 5 Run 维持 I_fc(0)=50 A 的 L0 逐字初始面（fc001_v1 位级复现，FEC-1）。

energy/信号面分离：record 的 V_stack_V/P_loss_stack_kW/P_fc_true_kW 用当前状态值重算
（非累计值——FLTH §2.3 注记②同款）；T_st_K 为 RK4 状态值。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 5/6/7）：
  - 元数据：golden_schema_version="v2"、golden_id="fc001_v2"、model_id="fc.pem.l0"（§4 项 6）、
    model_version="1.1.0"（Q1 定案 B 维持）、method_id="fc001_l1_polarization_rk4_dt0.01"、
    engine_baseline=null、backend=null（留位）、electrochem_model="on"、
    supersedes="fc001_v1（L0 轨 electrochem_model=off，字节冻结留档）"。
    build_golden() 不含 generated_by/approval（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填；approval 三值非 null 方可落盘）；approval 首签
    approved_by="user（2026-11-13 CHG-20261113-01 批准链）"（mg001_v1/wt001_v1 措辞惯例）。
  - Run 集（Q6 定案 (a)）：镜像 fc001_v1 全集 5 Run、全部 electrochem_model=on。
  - SERIES_IDS = fc001_v1 golden series 键集实读（18 列，逐 Run 同集）+ T_st_K/V_stack_V/
    P_loss_stack_kW 三新列尾插（GTL1 先例）= 21 列（含 "t"）；三新列全 Run 有值（on 轨）；
    I_fc_cap_A 不入 golden series（fc001_v1 实读键集不含——事件快照变量承载）。
  - gate 块 tier="T-B"（同法 RK4、独立双实现——ALINE §3；T_st 温度反馈非线性 ODE 无全局
    闭式 + 跨语言 bit-exact 无依据）：键面按批准 B-4 处置（I_A 两键 / T_K_atol / P_kW 两键 /
    V_stack_atol+V_stack_rtol（V 类新键）/ E_kWh / SOC_pp / r_true_kW / r_meas_kW_atol /
    t_s）；数值按 FEC-7 双实现实测散差 ×>=10 且下限 >=1e-9 冻结（T_K/V_stack/P_kW 实测
    散差 ~1e-13…1e-15 量级 ⇒ 冻结点落 1e-9 下限——TOLERANCES 注记实测记录）；
    gate 不含 f_Hz_atol（_V 分支落地后 V 类键不再触达兜底——B-4 定案）；
    降 T-C 预案未触发（实测散差未超预案）。

emit：python -I tools/oracle/fc001_l1_oracle.py --emit（先跑 FEC-1…8，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/fc001_v2.json + .sha256 sidecar，LF 钉死，
  oracle_base.write_golden_with_sidecar 字节规范）。
自检：python -I tools/oracle/fc001_l1_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。
汇总：python -I tools/oracle/fc001_l1_oracle.py --summary。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import math
import os
import sys

# oracle_base 与本文件同目录；显式注入目录使命令行 -I 隔离模式等入口也能解析
# （fl001_l1_oracle.py:105-108 同式；oracle_base 为机制层，无模型语义，独立性声明不变）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结常量（L0 电气面 = fc001_oracle 数值口径逐字；§1.5 十常量定案值——唯一权威）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
V_KW_PER_A = 0.4        # 电池半边 0.4 kV 口径（A-fcec-dispatch——分配器/电池半边原样）
I_FC_REF_A = 50.0
TAU_FC_S = 1.2
TAU_REF_S = 2.5         # EQ-6 功率分配器级 τ_ref（A-fcec-dispatch：EQ-6 原样）
TAU_ACT_S = 1.5         # actuator 轨电堆跟随 τ（FCEXT §2.1 口径沿 L0）
DT_INT_S = 0.01         # 引擎内积分子步（engine.js:12 DT_INT 口径沿 L0）
SUB_INT = 10            # 每 0.1 s 输出步的子步数
PLOAD_KW = 30.0
P_BAT_REF_KW = 10.0
EBAT_KWH = 40.0
SOC0_PCT = 60.0
LOAD_STEP_KW = 10.0
ACTUATOR_PCT = 55.0
I_FC_BASE_A = (PLOAD_KW - P_BAT_REF_KW) / V_KW_PER_A   # = 50 A

# §1.5 十常量定案值（FCECH-G2b-02，2026-11-13；全部教学整定值、非实测——A-fcec-params）
E0_REF_LITERAL = 425.130134484272   # 批准文本印刷值（15 位有效数字表示——FEC-5 交叉核对）
K_E_V_PER_K = 0.1                   # = 50·α_ohm·R_ohm0（整定依据④恒等式——A-2(i) 定案）
I_0_A = 10.0
C_ACT_V = 0.05
R_OHM0_OHM = 0.5
ALPHA_OHM_PER_K = 0.004
C_CONC_V = 0.1
I_LIM_A = 150.0                     # > 137.5 A 注册域硬条件（§3.3；FEC-8 断言）
C_ST_J_PER_K = 1500.0
H_ST_W_PER_K = 120.0
T_AMB_K = 298.15                    # 登记常量，T_st(0) = T_amb（冷启动）
T_REF_K = 298.15
DT_INT = 0.01                       # RK4 子步步长（6000 子步/60 s）

# E0_ref 由整定依据①锚点闭式派生（§1.5——非自由度）：
#   E0_ref = 400 + c_act·ln 6 + 50·R_ohm0 + c_conc·ln 1.5
# 闭式派生值为权威（印刷值 425.130134484272 为其 15 位有效数字表示——E0_ref 全精度值
# 425.1301344842722… 的 15 位舍入）；FEC-5 对印刷值交叉核对 <=1e-9。
E0_REF_V = (400.0 + C_ACT_V * math.log(1.0 + I_FC_REF_A / I_0_A)
            + 50.0 * R_OHM0_OHM
            + C_CONC_V * math.log(I_LIM_A / (I_LIM_A - I_FC_REF_A)))

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601
I_F = int(round(T_F / DT_S))                    # 200
SUB = int(round(DT_S / DT_INT))                 # 10

METHOD_ID = "fc001_l1_polarization_rk4_dt0.01"
METHOD_VERSION = "1"
GOLDEN_ID = "fc001_v2"
MODEL_ID = "fc.pem.l0"      # §4 项 6（scope.js:44-45 登记 id；Q1 定案 B 口径）
MODEL_VERSION = "1.1.0"     # Q1 定案 B：model_version 维持仅登记（golden 语义由 golden_id 承载）
APPROVED_BY = "user（2026-11-13 CHG-20261113-01 批准链）"

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"

# SERIES_IDS = fc001_v1 golden series 键集实读（18 列、逐 Run 同集——FCECH-G2b-03 核对面
# 已实读确认）+ §1.3 三新信号尾插（GTL1 先例）= 21 列（含 "t"）。
# I_fc_cap_A 不入 golden series（fc001_v1 实读键集不含该列——事件快照变量承载口径沿 L0）。
SERIES_IDS = [
    "t", "I_fc_true_A", "I_fc_meas_A", "I_fc_ref_A", "bias_A",
    "P_fc_true_kW", "P_fc_meas_kW", "I_bat_true_A",
    "P_bat_true_kW", "P_bat_est_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
    "valve_cmd_pct", "valve_meas_pct",
    "T_st_K", "V_stack_V", "P_loss_stack_kW",
]

# 5 Run（Q6 定案 (a)：镜像 fc001_v1 全集，全部 electrochem_model=on；RUNS 键唯一+role 必填，
# 场景参数逐字镜像 fc001_oracle RUNS :126-138）
RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "faulted": False, "family": FAMILY_NONE, "electrochem_model": "on"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_SENSOR, "electrochem_model": "on"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "faulted": True, "family": FAMILY_SENSOR, "electrochem_model": "on"},
    {"key": "load_step_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_LOAD, "magnitude": LOAD_STEP_KW,
     "electrochem_model": "on"},
    {"key": "actuator_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_ACT, "magnitude": ACTUATOR_PCT,
     "electrochem_model": "on"},
]


# ---------------------------------------------------------------------------
# EQ-FCEC 极化链与热 RHS（§1.4 冻结方程的唯一实现；表达式顺序 = 批准文本左结合序）
# ---------------------------------------------------------------------------
def e0_of(t_st):
    """EQ-FCEC-5：E0(T_st) = E0_ref + k_E·(T_st − T_ref)  [V]。"""
    return E0_REF_V + K_E_V_PER_K * (t_st - T_REF_K)


def r_ohm_of(t_st):
    """EQ-FCEC-6：R_ohm(T_st) = R_ohm0·(1 + α_ohm·(T_st − T_ref))  [Ohm]。"""
    return R_OHM0_OHM * (1.0 + ALPHA_OHM_PER_K * (t_st - T_REF_K))


def v_stack(i_val, t_st):
    """EQ-FCEC-1：三损失项极化链  [V]；I < I_lim 值域硬条件（越域未定义——§1.6 ②）。"""
    return (e0_of(t_st)
            - C_ACT_V * math.log(1.0 + i_val / I_0_A)
            - r_ohm_of(t_st) * i_val
            - C_CONC_V * math.log(I_LIM_A / (I_LIM_A - i_val)))


def p_loss_w(i_val, t_st):
    """EQ-FCEC-4：P_loss_W = (E0(T_st) − V_stack)·I【W】（W 记账——A-3 定案；
    按构造 = 三损失项×电流，E0 在差分中相消、零新增常数）。"""
    return (e0_of(t_st) - v_stack(i_val, t_st)) * i_val


def p_fc_true_kw(i_val, t_st):
    """EQ-FCEC-2（on 域）：P_fc,true = V_stack·I/1000  [kW]。"""
    return v_stack(i_val, t_st) * i_val / 1000.0


def rhs_thermal(i_val, t_st):
    """EQ-FCEC-3 RHS：dT_st/dt = (P_loss_W − h_st·(T_st − T_amb))/C_st  [K/s]（W 记账）。"""
    return (p_loss_w(i_val, t_st) - H_ST_W_PER_K * (t_st - T_AMB_K)) / C_ST_J_PER_K


def _theta_ss_of(i_val):
    """EQ-FCEC-3 令 dT/dt=0 的渐近闭式：θ_ss = I·(c_act·ln(1+I/I_0) + R_ohm0·I
    + c_conc·ln(I_lim/(I_lim−I))) / (h_st − α_ohm·R_ohm0·I²)  [K]
    （P_loss_W 对 T_st 线性——EQ-FCEC-4/6 结构推论；分母 > 0 = 稳定性条件 §3.3）。"""
    act = C_ACT_V * math.log(1.0 + i_val / I_0_A)
    conc = C_CONC_V * math.log(I_LIM_A / (I_LIM_A - i_val))
    num = i_val * (act + R_OHM0_OHM * i_val + conc)
    denom = H_ST_W_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * i_val * i_val
    return num / denom


def _t_st_exact_step(i_val, t_start, h):
    """I 冻结口径下子步内线性常系数 ODE θ' = λ·θ + b 的精确指数解（FEC-7 交叉参照，
    非生产轨）：λ = (α_ohm·R_ohm0·I² − h_st)/C_st；θ_ss = −b/λ（_theta_ss_of 同式）。
    增量形式 t_start + (θ_ss − θ_0)·(1 − e^{λh})——单次状态加法与生产 RK4 的
    t_cur + h/6·(k1+2k2+2k3+k4) 更新结构对齐，使交叉散差隔离 RK4 截断（而非状态
    更新舍入路径噪声；§3.3 ④ 预演 1.137e-13 K「RK4 截断不可见」同量级）。"""
    denom = H_ST_W_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * i_val * i_val
    lam = -denom / C_ST_J_PER_K
    theta_ss = _theta_ss_of(i_val)
    theta0 = t_start - T_AMB_K
    return t_start + (theta_ss - theta0) * (1.0 - math.exp(lam * h))


def _advance_thermal(i_val, t_start, rk4_sub, thermal):
    """一个 DT_INT 子步内的 T_st 推进（RHS 内 I 冻结于子步起点值 i_val——§4 项 3 口径）。

    thermal="rk4"：经典 RK4，rk4_sub 步、每步 h = DT_INT/rk4_sub（生产口径 rk4_sub=1；
    rk4_sub=2 仅用于 FEC-7 半步自收敛登记——I 冻结面不变，级联 DT_INT=0.01 为引擎
    冻结常量、不属于热积分精化对象）。
    thermal="exact"：子步内线性常系数 ODE 的解析指数解（FEC-7 交叉参照）。"""
    if thermal == "exact":
        return _t_st_exact_step(i_val, t_start, DT_INT)
    h = DT_INT / rk4_sub
    t_cur = t_start
    for _ in range(rk4_sub):
        k1 = rhs_thermal(i_val, t_cur)
        k2 = rhs_thermal(i_val, t_cur + 0.5 * h * k1)
        k3 = rhs_thermal(i_val, t_cur + 0.5 * h * k2)
        k4 = rhs_thermal(i_val, t_cur + h * k3)
        t_cur = t_cur + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
    return t_cur


# ---------------------------------------------------------------------------
# L0 电气面闭式复刻（G0-DEC-15 修复清单口径——fc001_oracle.py 表达式逐字独立复刻，
# 非 import；供 healthy/sensor/monitor 轨电气面与 FEC-1 环境校验参照面）
# ---------------------------------------------------------------------------
def _l0_b_at(t, faulted):
    """EQ-1：b(t) = 0 (t < 20.0)；b(t) = +10 A (t >= 20.0)（故障轨测量通道）。"""
    return BIAS_A if (faulted and t >= T_F) else 0.0


def _l0_i_fc_at(t, feedback_mode, faulted):
    """EQ-3 闭式：healthy/monitor I_fc ≡ 50；sensor 闭环 t >= 20 起
    I_fc = 40 + 10·exp(−(t−20)/1.2)。"""
    if not faulted:
        return I_FC_REF_A
    if feedback_mode == "monitor":
        return I_FC_REF_A
    if t < T_F:
        return I_FC_REF_A
    u = t - T_F
    return (I_FC_REF_A - BIAS_A) + BIAS_A * math.exp(-u / TAU_FC_S)


def _l0_int_i_fc(x, feedback_mode, faulted):
    """∫[0,x] I_fc dt 解析（事件感知）积分。"""
    if x <= 0.0:
        return 0.0
    if x <= T_F or not faulted or feedback_mode == "monitor":
        return I_FC_REF_A * x
    u = x - T_F
    return (I_FC_REF_A * T_F + (I_FC_REF_A - BIAS_A) * u
            + BIAS_A * TAU_FC_S * (1.0 - math.exp(-u / TAU_FC_S)))


def _l0_int_b(x, faulted):
    """∫[0,x] b dt（阶跃点测度为零，事件感知）。"""
    if not faulted or x <= T_F:
        return 0.0
    return BIAS_A * (x - T_F)


def _l0_soc_est_at(x, feedback_mode, faulted):
    """EQ-5 SOC_est（测量链 0.4·I_meas 未动——A-fcec-meas；与 L0 逐位同）：
    ∫P_bat,est = P_load·x − 0.4·(∫I_fc + ∫b)。"""
    e_kws = PLOAD_KW * x - V_KW_PER_A * (_l0_int_i_fc(x, feedback_mode, faulted)
                                         + _l0_int_b(x, faulted))
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。
    （fl001_l1_oracle.py:176-178 同式——oracle_base.oracle_source_sha256 规范实现，
    emit 侧与 verify 侧同一语义。）"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def build_time_grid():
    """t[i] = i·dt（IEEE-754 double 积原值，禁止累加——fc001_oracle/fl001_l1 同式）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def _fo_step(y, target, tau, dt):
    """一阶环节精确离散步（engine.js:443-450 foStep 逐字复刻，IEEE-754 双精度同序）：
    y' = target + (y − target)·exp(−dt/τ)；∫y dt = target·dt + (y − target)·τ·(1 − exp(−dt/τ))。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40 else math.exp(-ratio)
    y_new = target + (y - target) * a
    integral = target * dt + (y - target) * tau * (1.0 - a)
    return y_new, integral


def _empty_columns():
    col = {}
    for sid in SERIES_IDS:
        if sid == "t":
            continue
        col[sid] = [0.0] * N_SAMPLES
    return col


# ---------------------------------------------------------------------------
# 仿真核（healthy/sensor/monitor 解析闭式电气面 + load/actuator 级联子步递推电气面；
# 两族共用 T_st RK4 热面与 EQ-FCEC on 域记录面）
# ---------------------------------------------------------------------------
def _simulate_sensor_core(spec, load0, rk4_sub, thermal):
    """healthy / closed_loop_fault / monitor_only：电气面解析闭式（L0 数值口径逐字——
    I_fc/I_fc_ref/SOC_est/测量链与 fc001_v1 逐位同），T_st 经典 RK4 dt0.01（I 冻结
    子步起点 = 闭式在子步起点的精确值），E_fc 账本子步梯形。"""
    mode = spec["feedback_mode"]
    faulted = spec["faulted"]
    t = build_time_grid()
    col = _empty_columns()
    t_st = T_AMB_K
    int_pfc_kws = 0.0
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0

    for k in range(N_SAMPLES):
        ti = t[k]
        b = _l0_b_at(ti, faulted)
        i_fc = _l0_i_fc_at(ti, mode, faulted)
        i_meas = i_fc + b
        e0 = e0_of(t_st)
        v_st = v_stack(i_fc, t_st)
        p_fc_true = v_st * i_fc / 1000.0
        p_fc_meas = V_KW_PER_A * i_meas
        p_bat = load0 - p_fc_true
        p_bat_meas = p_bat
        p_bat_est = load0 - p_fc_meas
        i_bat = p_bat / V_KW_PER_A
        r_true = p_fc_true + p_bat - load0
        r_meas = p_fc_meas + p_bat_meas - load0
        col["I_fc_true_A"][k] = i_fc
        col["I_fc_meas_A"][k] = i_meas
        col["I_fc_ref_A"][k] = I_FC_REF_A   # sensor/healthy 轨 I_fc_ref ≡ 50 A 恒值（L0 同）
        col["bias_A"][k] = b
        col["P_fc_true_kW"][k] = p_fc_true
        col["P_fc_meas_kW"][k] = p_fc_meas
        col["I_bat_true_A"][k] = i_bat
        col["P_bat_true_kW"][k] = p_bat
        col["P_bat_est_kW"][k] = p_bat_est
        col["P_load_demand_kW"][k] = load0
        col["P_load_served_kW"][k] = load0
        # SOC_true：真实功率基（A-5）——∫P_bat,true = load0·t − ∫P_fc,true（子步梯形累计）
        col["SOC_true_pct"][k] = SOC0_PCT - 100.0 * (load0 * ti - int_pfc_kws) / (EBAT_KWH * 3600.0)
        col["SOC_est_pct"][k] = _l0_soc_est_at(ti, mode, faulted)   # L0 逐字（测量链未动）
        col["r_true_kW"][k] = r_true
        col["r_meas_kW"][k] = r_meas
        col["valve_cmd_pct"][k] = 100.0
        col["valve_meas_pct"][k] = 100.0
        col["T_st_K"][k] = t_st
        col["V_stack_V"][k] = v_st
        col["P_loss_stack_kW"][k] = (e0 - v_st) * i_fc / 1000.0
        if abs(r_true) > max_abs_r_true:
            max_abs_r_true = abs(r_true)
        if abs(r_meas) > max_abs_r_meas:
            max_abs_r_meas = abs(r_meas)
        if k < N_SAMPLES - 1:
            for j in range(SUB):
                t_sub = k * SUB * DT_INT + j * DT_INT      # 引擎子步网格同式
                i_start = _l0_i_fc_at(t_sub, mode, faulted)  # 子步起点冻结值（闭式精确值）
                t_th_start = t_st
                t_st = _advance_thermal(i_start, t_th_start, rk4_sub, thermal)
                i_end = _l0_i_fc_at(t_sub + DT_INT, mode, faulted)
                int_pfc_kws += 0.5 * (p_fc_true_kw(i_start, t_th_start)
                                      + p_fc_true_kw(i_end, t_st)) * DT_INT

    x_end = t[-1]
    int_ifc_end = _l0_int_i_fc(x_end, mode, faulted)
    int_b_end = _l0_int_b(x_end, faulted)
    int_demand_kws = load0 * x_end
    e_fc = int_pfc_kws / 3600.0
    e_bat = (int_demand_kws - int_pfc_kws) / 3600.0
    e_bat_est = (int_demand_kws - V_KW_PER_A * (int_ifc_end + int_b_end)) / 3600.0
    e_load = int_demand_kws / 3600.0
    soc_true_end = col["SOC_true_pct"][-1]
    soc_est_end = col["SOC_est_pct"][-1]
    focal = (col["I_fc_true_A"][-1] - col["I_fc_true_A"][I_F]) if faulted else None

    metrics = {
        "E_source_kWh": {"value": e_fc, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": e_bat, "unit": "kWh", "method": METHOD_ID},
        "E_bat_est_kWh": {"value": e_bat_est, "unit": "kWh", "method": METHOD_ID},
        "E_load_kWh": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_abs_r_meas, "unit": "kW", "method": "algebraic"},
        "focal_change": {"value": focal, "unit": "A", "method": "analytic"},
    }

    events = _sensor_events(spec, col) if faulted else []

    scalars = {
        "E_fc_true_kWh": e_fc,
        "E_bat_true_kWh": e_bat,
        "E_bat_est_kWh": e_bat_est,
        "E_load_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_fc_true_20post_A": col["I_fc_true_A"][I_F],
        "I_fc_meas_20post_A": col["I_fc_meas_A"][I_F],
        "I_fc_true_60_A": col["I_fc_true_A"][-1],
        "I_fc_true_26_A": _l0_i_fc_at(26.0, mode, faulted),
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
        "int_I_fc_60s_As": int_ifc_end,
        "T_st_end_K": col["T_st_K"][-1],
        "V_stack_end_V": col["V_stack_V"][-1],
        "P_loss_stack_end_kW": col["P_loss_stack_kW"][-1],
    }
    integrals = {
        "int_demand_kws": int_demand_kws,
        "int_ifc_As": int_ifc_end,
        "int_b_As": int_b_end,
        "int_pfc_kws": int_pfc_kws,
    }
    return {"key": spec["key"], "role": spec["role"], "feedback_mode": mode,
            "faulted": faulted, "family": spec.get("family", FAMILY_SENSOR),
            "electrochem_model": "on", "series": dict([("t", t)] + list(col.items())),
            "integrals": integrals, "scalars": scalars, "metrics": metrics,
            "events": events}


def _simulate_numeric_core(spec, family, load0, magnitude, rk4_sub, thermal,
                           op_init=False):
    """load_step / actuator_fault：电气面按引擎级联子步递推逐字复刻（fc001_oracle
    _simulate_numeric_run 更新序——int_demand/int_b/refStep 弃积分项/target/foStep 同序；
    I_fc_cap 列不入 golden series，事件快照变量承载），T_st RK4（I 冻结子步起点 =
    级联子步起点运行值）。

    op_init=False（注册 Run 生产口径）：i_fc(0) = i_fc_ref(0) = I_FC_BASE_A = 50 A
    （L0 逐字——fc001_v1 冻结锚点 I_fc_true_20post_A = 50.0 承载面）。
    op_init=True（FEC-8 域角点扫描口径，非生产轨）：i_fc(0) = i_fc_ref(0) =
    (load0 − P_bat_ref)/0.4 = load0 工作点稳态电流——批准轮 §3.3 极端角点扫描
    （load0=45 + step20 → I→137.5 A）复算口径：跳过 50→87.5 A 起动瞬态、从 load0
    工作点稳态起步（I_fc(20)=87.5 精确、L0 侧 max|P_bat|=30 kW 精确——批准预填
    401.669 K / 337.881 V / 46.459 kW / −0.2272 pp / +0.0909 kWh / 31.828 kW 的
    复现口径，§3.3 角点行「分歧值留 emit 复算冻结」）；注册 5 Run 不经此参数。"""
    mode = spec["feedback_mode"]
    faulted = spec["faulted"]
    is_load = (family == FAMILY_LOAD)
    is_act = (family == FAMILY_ACT)
    t_start = T_F
    i_fc_cap = I_FC_BASE_A * magnitude / 100.0 if is_act else None

    t = build_time_grid()
    col = _empty_columns()
    t_st = T_AMB_K
    if op_init:
        i_fc0 = (load0 - P_BAT_REF_KW) / V_KW_PER_A
    else:
        i_fc0 = I_FC_BASE_A
    i_fc = i_fc0
    i_fc_ref = i_fc0
    int_ifc = 0.0
    int_b_acc = 0.0
    int_demand = 0.0
    int_pfc_kws = 0.0
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0

    def demand_at(time):
        return (load0 + magnitude) if (is_load and time >= t_start - 1e-9) else load0

    def record(k):
        nonlocal max_abs_r_true, max_abs_r_meas
        time = t[k]
        b = 0.0  # 非 sensor 轨测量通道无偏置（engine bAt: isSensor 限定）
        demand = demand_at(time)
        i_meas = i_fc + b
        e0 = e0_of(t_st)
        v_st = v_stack(i_fc, t_st)
        p_fc_true = v_st * i_fc / 1000.0
        p_fc_meas = V_KW_PER_A * i_meas
        p_bat = demand - p_fc_true
        p_bat_est = demand - p_fc_meas
        col["I_fc_true_A"][k] = i_fc
        col["I_fc_meas_A"][k] = i_meas
        col["I_fc_ref_A"][k] = i_fc_ref
        col["bias_A"][k] = b
        col["P_fc_true_kW"][k] = p_fc_true
        col["P_fc_meas_kW"][k] = p_fc_meas
        col["I_bat_true_A"][k] = p_bat / V_KW_PER_A
        col["P_bat_true_kW"][k] = p_bat
        col["P_bat_est_kW"][k] = p_bat_est
        col["P_load_demand_kW"][k] = demand
        col["P_load_served_kW"][k] = demand
        # SOC_true：真实功率基（A-5）——∫P_bat,true = ∫demand − ∫P_fc,true
        col["SOC_true_pct"][k] = SOC0_PCT - (int_demand - int_pfc_kws) / (EBAT_KWH * 3600.0) * 100.0
        # SOC_est：测量链未动（L0 逐字——与 fc001_v1 逐位同）
        col["SOC_est_pct"][k] = SOC0_PCT - (int_demand - V_KW_PER_A * int_ifc - V_KW_PER_A * int_b_acc) / (EBAT_KWH * 3600.0) * 100.0
        col["r_true_kW"][k] = p_fc_true + p_bat - demand
        col["r_meas_kW"][k] = p_fc_meas + p_bat - demand
        col["valve_cmd_pct"][k] = 100.0
        col["valve_meas_pct"][k] = magnitude if (is_act and time >= t_start - 1e-9) else 100.0
        col["T_st_K"][k] = t_st
        col["V_stack_V"][k] = v_st
        col["P_loss_stack_kW"][k] = (e0 - v_st) * i_fc / 1000.0
        if abs(col["r_true_kW"][k]) > max_abs_r_true:
            max_abs_r_true = abs(col["r_true_kW"][k])
        if abs(col["r_meas_kW"][k]) > max_abs_r_meas:
            max_abs_r_meas = abs(col["r_meas_kW"][k])

    record(0)
    for k in range(1, N_SAMPLES):
        for j in range(SUB_INT):
            time = (k - 1) * SUB_INT * DT_INT_S + j * DT_INT_S
            # 子步起点冻结值（§4 项 3：RHS 内 I_fc 冻结于子步起点值——级联更新前捕获）
            i_start = i_fc
            t_th_start = t_st
            b = 0.0
            demand = demand_at(time)
            int_demand += demand * DT_INT_S
            int_b_acc += b * DT_INT_S
            if is_load:
                # EQ-6 功率分配器级（A-fcec-dispatch：0.4 kV 名义电压原样——目标每子步
                # 移动，引擎 refStep 积分项弃用仅取 .y，L0 逐字）
                i_fc_ref, _ = _fo_step(i_fc_ref, (demand - P_BAT_REF_KW) / V_KW_PER_A,
                                       TAU_REF_S, DT_INT_S)
            if is_act:
                target = min(i_fc_ref, i_fc_cap) if time >= t_start - 1e-9 else i_fc_ref
            else:
                target = i_fc_ref
            i_fc, step_int = _fo_step(i_fc, target,
                                      TAU_ACT_S if is_act else TAU_FC_S, DT_INT_S)
            int_ifc += step_int
            # T_st RK4（I 冻结 i_start；rk4_sub 仅用于 FEC-7 半步自收敛登记）
            t_st = _advance_thermal(i_start, t_th_start, rk4_sub, thermal)
            # E_fc 账本（子步梯形——FLTH Q4 同款 idiom）
            int_pfc_kws += 0.5 * (p_fc_true_kw(i_start, t_th_start)
                                  + p_fc_true_kw(i_fc, t_st)) * DT_INT_S
        record(k)

    int_demand_kws = int_demand
    e_fc = int_pfc_kws / 3600.0
    e_bat = (int_demand_kws - int_pfc_kws) / 3600.0
    e_bat_est = (int_demand - V_KW_PER_A * (int_ifc + int_b_acc)) / 3600.0
    e_load = int_demand / 3600.0
    soc_true_end = col["SOC_true_pct"][-1]
    soc_est_end = col["SOC_est_pct"][-1]
    focal = col["I_fc_true_A"][-1] - col["I_fc_true_A"][I_F] if faulted else None

    metrics = {
        "E_source_kWh": {"value": e_fc, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": e_bat, "unit": "kWh", "method": METHOD_ID},
        "E_bat_est_kWh": {"value": e_bat_est, "unit": "kWh", "method": METHOD_ID},
        "E_load_kWh": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_abs_r_meas, "unit": "kW", "method": "algebraic"},
        "focal_change": {"value": focal, "unit": "A", "method": "analytic"},
    }

    events = []
    if family == FAMILY_LOAD:
        events.append(_load_event(col))
    elif family == FAMILY_ACT:
        events.append(_act_event(col, i_fc_cap))

    scalars = {
        "E_fc_true_kWh": e_fc,
        "E_bat_true_kWh": e_bat,
        "E_bat_est_kWh": e_bat_est,
        "E_load_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_fc_true_20post_A": col["I_fc_true_A"][I_F],
        "I_fc_meas_20post_A": col["I_fc_meas_A"][I_F],
        "I_fc_true_60_A": col["I_fc_true_A"][-1],
        "I_fc_true_26_A": col["I_fc_true_A"][int(round(26.0 / DT_S))],
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
        "int_I_fc_60s_As": int_ifc,
        "T_st_end_K": col["T_st_K"][-1],
        "V_stack_end_V": col["V_stack_V"][-1],
        "P_loss_stack_end_kW": col["P_loss_stack_kW"][-1],
    }
    integrals = {
        "int_demand_kws": int_demand_kws,
        "int_ifc_As": int_ifc,
        "int_b_As": int_b_acc,
        "int_pfc_kws": int_pfc_kws,
    }
    return {"key": spec["key"], "role": spec["role"], "feedback_mode": mode,
            "faulted": faulted, "family": family, "electrochem_model": "on",
            "series": dict([("t", t)] + list(col.items())),
            "integrals": integrals, "scalars": scalars, "metrics": metrics,
            "events": events}


def _simulate_core(spec, load0=PLOAD_KW, magnitude=None, rk4_sub=1, thermal="rk4",
                   op_init=False):
    """按 §1.4/§4 项 3 冻结更新序仿真一轮；返回 series/integrals/scalars/metrics/events。

    spec 经 resolve_run_spec 归一（str 归一式 / dict 兼容式）；electrochem_model 须为
    "on"（本 oracle 只承载 L1 电化学轨；off 轨属 fc001_v1/fc001_oracle 冻结面）。
    load0/magnitude/op_init 为 FEC-8 域角点扫描参数（load0=45 + step20 → I→137.5 A
    极端角点；op_init=工作点稳态起步——§3.3 角点扫描口径，注册 Run 不经此参数）；
    rk4_sub/thermal 为 FEC-7 双实现参照参数（生产口径 rk4_sub=1、thermal="rk4"）。"""
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    if spec.get("electrochem_model", "on") != "on":
        raise ValueError("fc001_l1_oracle 仅承载 electrochem_model=on 轨，得到 %r"
                         % (spec.get("electrochem_model"),))
    if thermal not in ("rk4", "exact"):
        raise ValueError("thermal 口径须为 rk4|exact，得到 %r" % (thermal,))
    if not (isinstance(rk4_sub, int) and rk4_sub >= 1):
        raise ValueError("rk4_sub 须为 >=1 整数，得到 %r" % (rk4_sub,))
    magnitude = float(spec.get("magnitude", 0.0)) if magnitude is None else float(magnitude)
    family = spec.get("family") or (FAMILY_NONE if not spec["faulted"] else FAMILY_SENSOR)
    if family in (FAMILY_LOAD, FAMILY_ACT):
        return _simulate_numeric_core(spec, family, load0, magnitude, rk4_sub, thermal,
                                      op_init)
    return _simulate_sensor_core(spec, load0, rk4_sub, thermal)


def simulate_run(spec):
    """归一契约入口（ORACLE_INTERFACE_D2.md §2）：str run key / spec dict 双形态，
    经 oracle_base.resolve_run_spec 归一；返回 series（含 "t" 列）/scalars/metrics/events。"""
    return _simulate_core(spec)


# ---------------------------------------------------------------------------
# 事件编码 v1（fc001_v1 事件面对齐——变量集零扩展，T_st/V_stack 不入事件快照（§2）；
# I_fc_cap_A 经事件快照变量承载）
# ---------------------------------------------------------------------------
def _sensor_events(spec, col):
    events = []
    i_fc_20 = col["I_fc_true_A"][I_F]
    events.append({
        "event_id": "EV-001", "event_type": "sensor_bias", "trigger_s": T_F,
        "target_signal": "bias_A", "magnitude": BIAS_A, "unit": "A",
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T_F, "derivation": "left_limit",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20, "bias_A": 0.0},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "bias_A": "A"},
             "fault_id": "I_fc_sensor_bias"},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T_F, "derivation": "post_sample",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20 + BIAS_A,
                           "bias_A": BIAS_A},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "bias_A": "A"},
             "fault_id": "I_fc_sensor_bias"},
        ],
    })
    return events


def _load_event(col):
    i_fc_20 = col["I_fc_true_A"][I_F]
    return {
        "event_id": "EV-001", "event_type": "load_step", "trigger_s": T_F,
        "target_signal": "P_load_demand_kW", "magnitude": LOAD_STEP_KW, "unit": "kW",
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T_F, "derivation": "left_limit",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                           "P_load_demand_kW": PLOAD_KW},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "P_load_demand_kW": "kW"},
             "fault_id": "load_step_10kW"},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T_F, "derivation": "post_sample",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                           "P_load_demand_kW": PLOAD_KW + LOAD_STEP_KW},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "P_load_demand_kW": "kW"},
             "fault_id": "load_step_10kW"},
        ],
    }


def _act_event(col, i_fc_cap):
    i_fc_20 = col["I_fc_true_A"][I_F]
    return {
        "event_id": "EV-001", "event_type": "actuator_fault", "trigger_s": T_F,
        "target_signal": "I_fc_cap_A", "magnitude": ACTUATOR_PCT, "unit": "%",
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T_F, "derivation": "left_limit",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                           "I_fc_cap_A": None, "valve_meas_pct": 100.0},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A",
                       "I_fc_cap_A": "A", "valve_meas_pct": "%"},
             "fault_id": "valve_stuck"},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T_F, "derivation": "post_sample",
             "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                           "I_fc_cap_A": i_fc_cap, "valve_meas_pct": ACTUATOR_PCT},
             "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A",
                       "I_fc_cap_A": "A", "valve_meas_pct": "%"},
             "fault_id": "valve_stuck"},
        ],
    }


# ---------------------------------------------------------------------------
# 自检 FEC-1…FEC-8（FC001_ELECTROCHEM_G2B_SPEC_APPROVED §4 项 4 预案落定；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
#: FEC-1 环境校验判据：对 fc001_v1 冻结标量（L0 不变量子集）与级联序列列的复现容差
#: （逐字复刻预期 0.0；<=1e-9 为批准判据面）。
FEC1_TOL = 1e-9
#: FEC-2 恒等式判据（r_true 逐点 / E_fc + E_bat − E_load 逐 Run；fp 噪声级——构造恒等）。
FEC2_TOL = 1e-9
#: FEC-3 单调性域判据：全域 max dV/dI < 0（闭式三项皆负——无内点变号可能）+
#: 批准轮扫描值交叉（max −5.018214e-01 @ (56.28 A, 298.15 K)、min −1.012039 @ (137.5, 550 K)）。
FEC3_CROSS_MAX = 1e-5
FEC3_CROSS_MIN = 1e-3
#: FEC-5 锚点判据（批准预填值按有效位分级；实测散差记录于各 rec 观测面）：
FEC5_TOL_ANCHOR_T = 1e-9    # 12 位 T_st 预填（308.966317609 K）
FEC5_TOL_ANCHOR_KW = 1e-5   # 6 位 kW 预填（16.206329 / 28.966331 / 11.314880）
FEC5_TOL_ANCHOR_E = 1e-5    # SOC/E_bat 6 位预填
FEC5_TOL_ANCHOR_K3 = 1e-3   # 3 位 T/V/P 预填 + 6 位渐近值（309.076 等舍入行）
FEC5_TOL_ANCHOR_P7 = 1e-6   # P_loss_stack(0) 7 位预填（1.256507）
FEC5_TOL_V400 = 1e-9        # 整定依据① 批准判据（V_stack(50, T_st(0)) = 400 <=1e-9）
FEC5_TOL_R = 1e-9           # healthy r_meas ≡ 0.4·b = 0（A-1）
FEC5_TOL_DIR = 5e-3         # §3.2 推导注 V(I*, T_st(0)) − 400 预填（+5.02/−12.55/+11.29
                            # ——3-4 位有效数字舍入预填，实测散差 <=3.9e-3）
FEC5_TOL_DIR_EXACT = 1e-12  # dV/dT|_I = k_E − α·R0·I 恒等式（+0.020/−0.050/+0.045 V/K）
#: FEC-7 判据（A-2 冻结制：双实现实测散差 ×>=10 且下限 >=1e-9；实测值记录于 rec 观测面）：
FEC7_CROSS_K = 1e-9         # RK4 vs 子步解析交叉（批准下限冻结；预演 1.137e-13 K）
FEC7_HALFSTEP_K = 1e-10     # 半步自收敛登记上界（批准预演 <=2.4e-12 K；实测记录在案）
#: FEC-8 域角点判据（§3.3 预填按有效位分级）：
FEC8_TOL_I = 1e-6           # 极端角点 I_fc(60) 8 位预填（137.499989）
FEC8_TOL_K3 = 1e-3          # 3 位 T/V/P/dSOC/dE_bat 预填


def self_check():
    """独立自检 FEC-1…FEC-8（规格 §4 项 4；不复用 fc001 SC-1…10——Q8 定案 (a) 新段）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok, observed, tolerance, note))
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    gate = TOLERANCES["gate"]

    # ---- FEC-1 环境校验（fc001_v1 5 Run 标量不变子集 + 级联序列列复现 <=1e-9——
    #      证明 L0 级联/闭式复刻无损；healthy/monitor 局真实功率基恒等恢复行附加）----
    v1_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), "data", "golden", "fc001_v1.json")
    ok1 = False
    worst1 = None
    worst1_series = None
    n_cmp = 0
    detail1 = "fc001_v1.json missing"
    inv_scalars = ("I_fc_true_20post_A", "I_fc_meas_20post_A", "I_fc_true_60_A",
                   "I_fc_true_26_A", "int_I_fc_60s_As", "E_load_kWh",
                   "E_bat_est_kWh", "SOC_est_end_pct", "max_abs_r_true_kW")
    inv_series = ("t", "I_fc_true_A", "I_fc_meas_A", "I_fc_ref_A", "bias_A",
                  "P_fc_meas_kW", "P_bat_est_kW", "P_load_demand_kW",
                  "P_load_served_kW", "SOC_est_pct", "valve_cmd_pct", "valve_meas_pct")
    try:
        with open(v1_path, "r", encoding="utf-8") as f:
            g_v1 = json.load(f)
        ok1 = True
        for spec, mine in zip(RUNS, runs):
            ref = g_v1["runs"][spec["key"]]
            for key in inv_scalars:
                if key not in mine["scalars"] or key not in ref["scalars"]:
                    ok1 = False
                    detail1 = "scalar key missing: %s" % key
                    break
                d = abs(mine["scalars"][key] - ref["scalars"][key])
                n_cmp += 1
                if worst1 is None or d > worst1:
                    worst1 = d
            if not ok1:
                break
            for sid in inv_series:
                for a, b_ in zip(ref["series"][sid], mine["series"][sid]):
                    d = abs(a - b_)
                    n_cmp += 1
                    if worst1_series is None or d > worst1_series:
                        worst1_series = d
            # healthy/monitor 局：真实功率基恒等恢复（A-2(i)——§3.2 healthy 表行）
            if not spec["faulted"]:
                for key in ("E_fc_true_kWh", "E_bat_true_kWh", "SOC_true_end_pct",
                            "SOC_err_end_pp", "max_abs_r_meas_kW"):
                    d = abs(mine["scalars"][key] - ref["scalars"][key])
                    n_cmp += 1
                    if worst1 is None or d > worst1:
                        worst1 = d
        if ok1:
            ok1 = worst1 <= FEC1_TOL and worst1_series <= FEC1_TOL
    except Exception as exc:  # noqa: BLE001
        ok1 = False
        detail1 = "%s: %s" % (type(exc).__name__, exc)
    rec("FEC-1-l0-frozen-anchors", ok1,
        (detail1 if not ok1 else
         "worst|diff|=%.3e scalars, %.3e series-cascade cols, over %d values x 5 runs"
         % (worst1, worst1_series, n_cmp)),
        "<=1e-9 (L0 cascade/closed-form replication vs fc001_v1 frozen golden, read-only)",
        "environment check: electrical face + measurement chain + SOC_est bit-faithful")

    # ---- FEC-2 恒等式（r_true ≡ 0 逐点 / E_fc + E_bat ≡ E_load 逐 Run / P_bat 定义式 /
    #      I_bat 0.4 kV 电池半边口径——on 域逐点 <=1e-9）----
    worst2_r = 0.0
    worst2_def = 0.0
    worst2_ibat = 0.0
    worst2_e = 0.0
    for r in runs:
        s = r["series"]
        ig = r["integrals"]
        sc = r["scalars"]
        for i in range(N_SAMPLES):
            worst2_r = max(worst2_r, abs(s["r_true_kW"][i]))
            worst2_def = max(worst2_def, abs(s["P_bat_true_kW"][i]
                                             - (s["P_load_demand_kW"][i]
                                                - s["P_fc_true_kW"][i])))
            worst2_ibat = max(worst2_ibat, abs(s["I_bat_true_A"][i]
                                               - s["P_bat_true_kW"][i] / V_KW_PER_A))
        resid = (sc["E_fc_true_kWh"] + sc["E_bat_true_kWh"] - sc["E_load_kWh"])
        worst2_e = max(worst2_e, abs(resid))
    ok2 = (worst2_r <= FEC2_TOL and worst2_def <= FEC2_TOL
           and worst2_ibat <= FEC2_TOL and worst2_e <= FEC2_TOL)
    rec("FEC-2-identity", ok2,
        "max|r_true|=%.3e kW, max|Pbat-def|=%.3e kW, max|Ibat-0.4kV|=%.3e A, "
        "max|Efc+Ebat-Eload|=%.3e kWh" % (worst2_r, worst2_def, worst2_ibat, worst2_e),
        "<=1e-9 per-point / per-run",
        "EQ-FCEC-7 r_true identity + real-power accounting basis (A-5) + 0.4 kV battery half")

    # ---- FEC-3 极化链单调性域抽查（dV/dI < 0 注册域全域——批准 §3.3 ② 扫描口径：
    #      I ∈ (0,137.5] 步长 0.05（含 I→0+ 极限点）x T ∈ [298.15,550] 步长 0.248
    #      （含 550 端点）；闭式 dV/dI = −c_act/(I_0+I) − R_ohm(T) − c_conc/(I_lim−I)
    #      三项皆负、无内点变号可能）+ 有限差分抽查 + 三故障角点方向行（§3.2 推导注）----
    i_grid = [0.05 * kk for kk in range(0, 2751)]          # 0（0+ 极限）..137.5
    t_grid3 = [298.15 + 0.248 * kk for kk in range(0, 1016)] + [550.0]
    act_terms = [C_ACT_V / (I_0_A + iv) for iv in i_grid]
    conc_terms = [C_CONC_V / (I_LIM_A - iv) for iv in i_grid]
    dmax = None
    dmin = None
    argmax = None
    argmin = None
    for tv in t_grid3:
        r_t = R_OHM0_OHM * (1.0 + ALPHA_OHM_PER_K * (tv - T_REF_K))
        for idx, iv in enumerate(i_grid):
            d = -act_terms[idx] - r_t - conc_terms[idx]
            if dmax is None or d > dmax:
                dmax = d
                argmax = (iv, tv)
            if dmin is None or d < dmin:
                dmin = d
                argmin = (iv, tv)
    ok3 = dmax < 0.0 and abs(dmax - (-0.5018214)) <= FEC3_CROSS_MAX \
        and abs(dmin - (-1.012039)) <= FEC3_CROSS_MIN
    # 有限差分抽查（中心差分 vs 闭式，粗网格）
    fd_worst = 0.0
    for iv in (5.0, 27.5, 50.0, 56.25, 75.0, 100.0, 137.0):
        for tv in (298.15, 330.0, 400.0, 550.0):
            di = 0.005
            fd = (v_stack(iv + di, tv) - v_stack(iv - di, tv)) / (2.0 * di)
            cl = -(C_ACT_V / (I_0_A + iv)) - r_ohm_of(tv) - C_CONC_V / (I_LIM_A - iv)
            fd_worst = max(fd_worst, abs(fd - cl))
    ok3 = ok3 and fd_worst <= 1e-9
    # 三故障角点方向行（§3.2 推导注——无条件结构推论的实测面）
    dir_rows = [
        ("dV/dT@I=40", K_E_V_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * 40.0, 0.020, FEC5_TOL_DIR_EXACT),
        ("dV/dT@I=75", K_E_V_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * 75.0, -0.050, FEC5_TOL_DIR_EXACT),
        ("dV/dT@I=27.5", K_E_V_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * 27.5, 0.045, FEC5_TOL_DIR_EXACT),
        ("V(40,T0)-400", v_stack(40.0, T_AMB_K) - 400.0, 5.02, FEC5_TOL_DIR),
        ("V(75,T0)-400", v_stack(75.0, T_AMB_K) - 400.0, -12.55, FEC5_TOL_DIR),
        ("V(27.5,T0)-400", v_stack(27.5, T_AMB_K) - 400.0, 11.29, FEC5_TOL_DIR),
    ]
    dir_fails = [nm for nm, ob, ex, tl in dir_rows if abs(ob - ex) > tl]
    ok3 = ok3 and not dir_fails
    rec("FEC-3-monotonicity-domain", ok3,
        "max dV/dI=%.9f @ (I=%.2f, T=%.3f); min=%.9f @ (I=%.2f, T=%.3f); "
        "fd-vs-closed=%.3e; dir-fails=%s"
        % (dmax, argmax[0], argmax[1], dmin, argmin[0], argmin[1], fd_worst,
           ",".join(dir_fails) if dir_fails else "none"),
        "max < 0 over full registered domain; |max-(-0.5018214)|<=1e-5; "
        "|min-(-1.012039)|<=1e-3; fd<=1e-9; direction rows per spec 3.2 note",
        "EQ-FCEC-1 monotonicity (closed form 3-term negative) + approval scan cross-check")

    # ---- FEC-4 网格与事件相位（601 点 t[i]=i·dt、严格递增、全列有限、事件 pre/post 语义）----
    t_ref = build_time_grid()
    ok4 = (len(t_ref) == N_SAMPLES
           and all(t_ref[i] == i * DT_S for i in range(N_SAMPLES))
           and all(t_ref[i] < t_ref[i + 1] for i in range(N_SAMPLES - 1))
           and t_ref[0] == 0.0 and t_ref[-1] == DURATION_S)
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if not math.isfinite(v):
                    ok4 = False
    ev_obs = []
    for spec in RUNS:
        r = by_key[spec["key"]]
        evs = r["events"]
        if not spec["faulted"]:
            if evs:
                ok4 = False
                ev_obs.append("%s:unexpected-event" % spec["key"])
            continue
        ev = evs[0]
        pre = ev["snapshots"][0]
        post = ev["snapshots"][1]
        row_ok = (pre["t_s"] == T_F and post["t_s"] == T_F
                  and pre["derivation"] == "left_limit"
                  and post["derivation"] == "post_sample")
        if spec["family"] == FAMILY_SENSOR:
            row_ok = row_ok and pre["variables"]["I_fc_meas_A"] == 50.0 \
                and post["variables"]["I_fc_meas_A"] == 60.0 \
                and post["variables"]["bias_A"] == BIAS_A
        elif spec["family"] == FAMILY_LOAD:
            row_ok = row_ok and pre["variables"]["P_load_demand_kW"] == PLOAD_KW \
                and post["variables"]["P_load_demand_kW"] == PLOAD_KW + LOAD_STEP_KW
        elif spec["family"] == FAMILY_ACT:
            row_ok = row_ok and pre["variables"]["I_fc_cap_A"] is None \
                and post["variables"]["I_fc_cap_A"] == 27.5 \
                and post["variables"]["valve_meas_pct"] == ACTUATOR_PCT
        ok4 = ok4 and row_ok
        ev_obs.append("%s:%s" % (spec["key"], "ok" if row_ok else "FAIL"))
    rec("FEC-4-grid-event-phase", ok4,
        "5x601 points t[i]=i*dt; finite all cols; events[%s]"
        % " ".join(ev_obs),
        "strict grid + finite + pre(left_limit)/post(post_sample) at t=20.0",
        "grid + finiteness + event phase (fc001 SC-5/SC-6 convention)")

    # ---- FEC-5 锚点全表复算（§3.2 冻结值 = 批准轮域扫描耦合仿真预填；判据按 emit 实测
    #      冻结——分级容差见模块常量注）----
    s_h = by_key["healthy"]["series"]
    s_a = by_key["closed_loop_fault"]["series"]
    s_m = by_key["monitor_only"]["series"]
    s_l = by_key["load_step_closed_loop"]["series"]
    s_f = by_key["actuator_closed_loop"]["series"]
    sc_h = by_key["healthy"]["scalars"]
    sc_a = by_key["closed_loop_fault"]["scalars"]
    sc_m = by_key["monitor_only"]["scalars"]
    sc_l = by_key["load_step_closed_loop"]["scalars"]
    sc_f = by_key["actuator_closed_loop"]["scalars"]
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    # 健康局（§3.2 健康局结构表）
    rows.append(("H.T_st_0", s_h["T_st_K"][0], T_AMB_K, 0.0,
                 s_h["T_st_K"][0] == T_AMB_K))
    chk("H.T_st_60", s_h["T_st_K"][600], 308.966317609, FEC5_TOL_ANCHOR_T)
    chk("H.T_ss_asymptote", T_AMB_K + _theta_ss_of(I_FC_REF_A), 309.076, FEC5_TOL_ANCHOR_K3)
    chk("H.V_stack_50_T0", s_h["V_stack_V"][0], 400.0, FEC5_TOL_V400)
    chk("H.V_stack_track_400", max(abs(v - 400.0) for v in s_h["V_stack_V"]), 0.0, FEC5_TOL_V400)
    chk("H.P_fc_50", s_h["P_fc_true_kW"][0], 20.0, FEC5_TOL_V400)
    chk("H.P_fc_track_20", max(abs(v - 20.0) for v in s_h["P_fc_true_kW"]), 0.0, FEC5_TOL_V400)
    chk("H.P_loss_stack_0", s_h["P_loss_stack_kW"][0], 1.256507, FEC5_TOL_ANCHOR_P7)
    chk("H.max_abs_r_meas", sc_h["max_abs_r_meas_kW"], 0.0, FEC5_TOL_R)
    # sensor_drift +10 闭环（§3.2 分歧表 + §3.3 ⑥）
    chk("S.P_fc_60", s_a["P_fc_true_kW"][600], 16.206329, FEC5_TOL_ANCHOR_KW)
    chk("S.T_st_60", s_a["T_st_K"][600], 305.129, FEC5_TOL_ANCHOR_K3)
    chk("S.SOC_true_60", sc_a["SOC_true_end_pct"], 59.481147, FEC5_TOL_ANCHOR_E)
    chk("S.E_bat_60", sc_a["E_bat_true_kWh"], 0.207541, FEC5_TOL_ANCHOR_E)
    # load_step +10 闭环
    chk("L.P_fc_60", s_l["P_fc_true_kW"][600], 28.966331, FEC5_TOL_ANCHOR_KW)
    chk("L.SOC_true_60", sc_l["SOC_true_end_pct"], 59.532403, FEC5_TOL_ANCHOR_E)
    chk("L.E_bat_60", sc_l["E_bat_true_kWh"], 0.187039, FEC5_TOL_ANCHOR_E)
    # actuator 55%
    chk("A.P_fc_60", s_f["P_fc_true_kW"][600], 11.314880, FEC5_TOL_ANCHOR_KW)
    chk("A.SOC_true_60", sc_f["SOC_true_end_pct"], 59.351312, FEC5_TOL_ANCHOR_E)
    chk("A.E_bat_60", sc_f["E_bat_true_kWh"], 0.259475, FEC5_TOL_ANCHOR_E)
    # monitor/healthy 逐位同（§3.2 monitor/healthy 行——A-2(i) 下恒等恢复）
    rows.append(("M.SOC_true_eq_H", sc_m["SOC_true_end_pct"] - sc_h["SOC_true_end_pct"],
                 0.0, 0.0, sc_m["SOC_true_end_pct"] == sc_h["SOC_true_end_pct"]))
    rows.append(("M.E_bat_eq_H", sc_m["E_bat_true_kWh"] - sc_h["E_bat_true_kWh"],
                 0.0, 0.0, sc_m["E_bat_true_kWh"] == sc_h["E_bat_true_kWh"]))
    # E0_ref 印刷值交叉核对（§1.5 闭式派生 vs 15 位印刷值）
    chk("H.E0_ref_literal_cross", E0_REF_V, E0_REF_LITERAL, FEC5_TOL_V400)

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    worst5 = None
    for nm, ob, ex, _tl, okr in rows:
        if okr and (worst5 is None or abs(ob - ex) > worst5):
            worst5 = abs(ob - ex)
    ok5 = not fails
    obs5 = "%d/%d anchor rows pass; worst|diff|=%s"
    obs5 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if worst5 is not None:
        obs5 += "; worst|diff|=%.3e" % worst5
    if fails:
        obs5 += "; FAIL: " + ",".join(fails)
    rec("FEC-5-anchors", ok5, obs5,
        "spec 3.2 frozen prefill (tiered tol; final = this emit)",
        "anchor recompute: healthy table + 3 fault corners + monitor identity + E0_ref cross")

    # ---- FEC-6 monitor 热面恒等（偏置不进物理回路的结构判据——§3.2 monitor 行）----
    d6_t = max(abs(x - y) for x, y in zip(s_m["T_st_K"], s_h["T_st_K"]))
    d6_v = max(abs(x - y) for x, y in zip(s_m["V_stack_V"], s_h["V_stack_V"]))
    d6_p = max(abs(x - y) for x, y in zip(s_m["P_loss_stack_kW"], s_h["P_loss_stack_kW"]))
    d6_soc = max(abs(x - y) for x, y in zip(s_m["SOC_true_pct"], s_h["SOC_true_pct"]))
    ok6 = d6_t == 0.0 and d6_v == 0.0 and d6_p == 0.0 and d6_soc == 0.0
    rec("FEC-6-monitor-thermal-identity", ok6,
        "max|dT|=%.1f K, max|dV|=%.1f V, max|dPloss|=%.1f kW, max|dSOC|=%.1f pp"
        % (d6_t, d6_v, d6_p, d6_soc),
        "== 0.0 (exact, all four faces)",
        "monitor bias stays out of the physical loop; thermal face identical to healthy")

    # ---- FEC-7 半步自收敛登记 + RK4 vs 子步解析交叉（A-2 冻结制：双实现实测散差 ×>=10
    #      且下限 >=1e-9；半步口径 = RK4 积分步 2x0.005、I 冻结面不变）----
    half_max = 0.0
    half_rows = []
    for spec in RUNS:
        fine = _simulate_core(spec, rk4_sub=2)
        base = by_key[spec["key"]]
        d_t = max(abs(x - y) for x, y in zip(base["series"]["T_st_K"],
                                             fine["series"]["T_st_K"]))
        d_i = max(abs(x - y) for x, y in zip(base["series"]["I_fc_true_A"],
                                             fine["series"]["I_fc_true_A"]))
        d_e = abs(base["scalars"]["E_fc_true_kWh"] - fine["scalars"]["E_fc_true_kWh"])
        half_max = max(half_max, d_t)
        half_rows.append((spec["key"], d_t, d_i, d_e))
    cross_max = 0.0
    for spec in RUNS:
        ex = _simulate_core(spec, thermal="exact")
        base = by_key[spec["key"]]
        cross_max = max(cross_max,
                        max(abs(x - y) for x, y in zip(base["series"]["T_st_K"],
                                                       ex["series"]["T_st_K"])))
    ok7 = (half_max <= FEC7_HALFSTEP_K
           and all(d_i == 0.0 for _k, _t, d_i, _e in half_rows)
           and all(d_e <= 1e-9 for _k, _t, _i, d_e in half_rows)
           and gate["T_K_atol"] >= 10.0 * half_max
           and cross_max <= FEC7_CROSS_K)
    rec("FEC-7-halfstep-and-substep-exact-cross", ok7,
        "halfstep(rk4 0.01 vs 2x0.005, I-freeze fixed) max|dT|=%.4e K [%s]; "
        "dI==0 all; rk4-vs-substep-exact max|dT|=%.4e K"
        % (half_max, " ".join("%s=%.2e" % (k, t) for k, t, _i, _e in half_rows),
           cross_max),
        "halfstep <=1e-10 K and gate T_K_atol >=10x measured; rk4-vs-exact <=1e-9 K "
        "(A-2 lower-bound freeze; measured values recorded)",
        "RK4 self-convergence within frozen 0.01-substep I-freeze frame + linear "
        "constant-coefficient substep analytic cross over 5 runs")

    # ---- FEC-8 无 NaN/Inf + I_lim 域 + 稳定性裕度断言（W 口径——A-3）+ ±25 kW 包络抽查
    #      + 域角点（§3.3 极端角点 load0=45+step20 → I→137.5 A；load0=45 稳态角点）----
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if not math.isfinite(v):
                    ok8 = False
    # I_lim 域硬条件（注册 5 Run + 极端角点——角点扫描 = §3.3 口径：load0 工作点稳态
    # 起步（op_init），复现批准预填 401.669 K / 337.881 V / 46.459 kW / −0.2272 pp /
    # +0.0909 kWh / 31.828 kW 与 L0 侧 30 kW）
    corner = _simulate_core(RUNS[3], load0=45.0, magnitude=20.0, op_init=True)
    i_max_reg = max(max(r["series"]["I_fc_true_A"]) for r in runs)
    i_max_corner = max(corner["series"]["I_fc_true_A"])
    ok8 = ok8 and i_max_corner < I_LIM_A
    # 稳定性裕度断言：h_st − α_ohm·R_ohm0·I² > 0（137.5 A 角点 = 82.1875 W/K，3.1736 倍）
    margin_corner = H_ST_W_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * 137.5 * 137.5
    ok8 = ok8 and margin_corner == 82.1875 and margin_corner > 0.0
    margin_min_run = None
    for r in runs:
        i_mx = max(abs(v) for v in r["series"]["I_fc_true_A"])
        mg = H_ST_W_PER_K - ALPHA_OHM_PER_K * R_OHM0_OHM * i_mx * i_mx
        if margin_min_run is None or mg < margin_min_run:
            margin_min_run = mg
        if mg <= 0.0:
            ok8 = False
    # ±25 kW 包络抽查（注册 5 Run——§3.3 包络行；手拼角点超包络双侧同超、不作硬检查）
    env = {}
    for spec, r in zip(RUNS, runs):
        m = max(abs(v) for v in r["series"]["P_bat_true_kW"])
        env[spec["key"]] = m
        if m > 25.0:
            ok8 = False
    env_corner = max(abs(v) for v in corner["series"]["P_bat_true_kW"])
    # 极端角点锚点（§3.3 极端角点行；dSOC/dE_bat 为 L1 真实功率基 − L0 0.4 基分歧）
    ig = corner["integrals"]
    soc_l0_corner = SOC0_PCT - 100.0 * (ig["int_demand_kws"]
                                        - V_KW_PER_A * ig["int_ifc_As"]) / (EBAT_KWH * 3600.0)
    d_soc_corner = corner["scalars"]["SOC_true_end_pct"] - soc_l0_corner
    d_ebat_corner = corner["scalars"]["E_bat_true_kWh"] \
        - (ig["int_demand_kws"] - V_KW_PER_A * ig["int_ifc_As"]) / 3600.0
    corner_rows = [
        ("corner.I_fc_60", corner["scalars"]["I_fc_true_60_A"], 137.499989, FEC8_TOL_I),
        ("corner.T_st_60", corner["scalars"]["T_st_end_K"], 401.669, FEC8_TOL_K3),
        ("corner.V_stack_60", corner["scalars"]["V_stack_end_V"], 337.881, FEC8_TOL_K3),
        ("corner.P_fc_60", corner["series"]["P_fc_true_kW"][600], 46.459, FEC8_TOL_K3),
        ("corner.dSOC_true_pp", d_soc_corner, -0.2272, FEC8_TOL_K3),
        ("corner.dE_bat_kWh", d_ebat_corner, 0.0909, FEC8_TOL_K3),
        ("corner.T_ss_137.5A", T_AMB_K + _theta_ss_of(137.5), 413.810, FEC8_TOL_K3),
        ("corner.max_abs_Pbat", env_corner, 31.828, FEC8_TOL_K3),
        # L0 同角点 t=20 网格点 |P_bat|（§3.3 包络行「L0 同角点 30 kW 亦超」的承载点——
        # op_init 下 I_fc(20)=87.5 精确 ⇒ 65 − 0.4×87.5 = 30 精确，即 L0 侧角点 max；
        # 双侧同超实证）
        ("corner.L0_Pbat_20post",
         (45.0 + 20.0) - V_KW_PER_A * corner["series"]["I_fc_true_A"][I_F],
         30.0, 0.0),
        # load0=45 稳态角点（§3.3 load0=45 行——I→87.5 A 工作点闭式）
        ("corner45.T_ss", T_AMB_K + _theta_ss_of(87.5), 334.886, FEC8_TOL_K3),
        ("corner45.V_stack", v_stack(87.5, T_AMB_K + _theta_ss_of(87.5)), 378.424, FEC8_TOL_K3),
        ("corner45.P_fc", p_fc_true_kw(87.5, T_AMB_K + _theta_ss_of(87.5)), 33.112, FEC8_TOL_K3),
    ]
    corner_fails = [nm for nm, ob, ex, tl in corner_rows if abs(ob - ex) > tl]
    ok8 = ok8 and not corner_fails
    rec("FEC-8-finite-domain-stability-envelope", ok8,
        "finite 5x21x601; I_max reg=%.6f A corner=%.6f A (< I_lim=150); "
        "margin@137.5A=%.4f W/K (x%.4f); min run margin=%.4f W/K; "
        "env max|Pbat| h=%.4f s=%.4f m=%.4f l=%.4f a=%.4f kW (corner %.4f); "
        "corner-fails=%s"
        % (i_max_reg, i_max_corner, margin_corner, 120.0 / 37.8125, margin_min_run,
           env["healthy"], env["closed_loop_fault"], env["monitor_only"],
           env["load_step_closed_loop"], env["actuator_closed_loop"], env_corner,
           ",".join(corner_fails) if corner_fails else "none"),
        "all finite; I < I_lim; h_st - alpha*R0*I^2 > 0 (82.1875 W/K @137.5 A); "
        "registered-run envelope <=25 kW; corners within prefill tol",
        "finiteness + I_lim domain + W-basis stability margin (A-3) + envelope + "
        "domain corners (corner envelope exceed is dual-side, not a hard check)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
# gate 块 tier="T-B"（规格 §4 项 7 / Q7 定案；键面按 B-4 处置含 V 类新键）。冻结依据
# （FEC-7 双实现实测，FCECH-G2b-03 emit 时点记录）：
#   - 半步自收敛实测 max|dT| = 1.82e-12 / 2.33e-12 / 2.05e-12 / 1.82e-12 K
#     （healthy/sensor/load/act；monitor ≡ healthy）——与批准轮 §3.3 ④ 预演值逐项一致；
#   - RK4 vs 子步解析交叉实测 max|dT| = 1.1369e-13 K（增量形式解析、状态更新结构对齐）
#     ——与批准轮 §3.3 ④ 预演 1.137e-13 K 一致；
#   - T_K_atol=1e-9：实测散差 ×>=10（1e-9 >= 10×2.3306e-12 = 2.33e-11，裕度 429x）仍低于
#     批准下限 1e-9 ⇒ 冻结点落 1e-9 下限（§4 项 4 FEC-7 预案口径「冻结点落 1e-9 下限」）。
#   - V_stack_atol=1e-9 / V_stack_rtol=1e-12（V 类新键——B-4 定案命名）：V_stack 为
#     I_fc/T_st 的代数量，跨实现散差 = dV/dT·dT（|dV/dT|<=0.175 V/K 全域）×1e-12 K
#     + libm ln 噪声 ~1e-13 V 量级 ⇒ 1e-9 下限冻结、>=10x 实测。
#   - P_kW_rtol=1e-12 / P_kW_atol=1e-15：沿 fc001_v1 gate 键面（T-A 现行）；P_fc,true
#     含极化链 libm 项，跨实现散差 ~1e-14 kW 量级，rtol 1e-12 对 ~20-29 kW 给
#     ~2-3e-11 kW 余量（>=10x 实测）。
#   - I_A_rtol=1e-12 / I_A_atol=1e-15：级联复刻跨实现散差在 rtol 1e-12 实证域内
#     （fc001_v1 现行 gate 同值）。
#   - E_kWh=1e-6 / SOC_pp=1e-5 / r_true_kW=1e-9 / r_meas_kW_atol=1e-9 / t_s=1e-9：
#     沿 fl001_v2 T-B gate 量级（距实测散差 >=6 个数量级）。
#   - 不含 f_Hz_atol：T-B `_V` 分支落地（B-4 定案）后 V 类键不再触达兜底。
#   - 降 T-C 预案未触发（实测散差未超预案；ORACLE_INTERFACE_D2 §3.2 双向预案登记）。
TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "I_A_rtol": 1e-12,
        "I_A_atol": 1e-15,
        "T_K_atol": 1e-9,
        "V_stack_atol": 1e-9,
        "V_stack_rtol": 1e-12,
        "P_kW_rtol": 1e-12,
        "P_kW_atol": 1e-15,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "r_meas_kW_atol": 1e-9,
        "t_s": 1e-9,
    },
}


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族字段与 fc001_v1 同名同构——bias_A /
    magnitude_kW / magnitude_pct+I_fc_cap_A 具名先例）。"""
    if not spec["faulted"]:
        return None
    family = spec.get("family", FAMILY_SENSOR)
    if family == FAMILY_LOAD:
        return {"family": FAMILY_LOAD, "fault_id": "load_step_10kW",
                "t_start_s": T_F, "magnitude_kW": LOAD_STEP_KW}
    if family == FAMILY_ACT:
        return {"family": FAMILY_ACT, "fault_id": "valve_stuck",
                "t_start_s": T_F, "magnitude_pct": ACTUATOR_PCT,
                "I_fc_cap_A": I_FC_BASE_A * ACTUATOR_PCT / 100.0}
    return {"family": FAMILY_SENSOR, "fault_id": "I_fc_sensor_bias",
            "t_start_s": T_F, "bias_A": BIAS_A}


def build_golden():
    """golden schema v2 组装（ORACLE_INTERFACE_D2.md §3；规格 §4 项 5/6/7）。

    generated_by / approval 不在此构造（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填——generated_at 不得 null 占位出境；approval 三值非 null 方可落盘）。"""
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "electrochem_model": "on",
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
        "supersedes": "fc001_v1（L0 轨 electrochem_model=off，字节冻结留档）",
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "electrochem_model": "on",
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "T": "K", "V": "V"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "I_fc_ref_A": I_FC_REF_A, "tau_fc_s": TAU_FC_S,
            "tau_ref_s": TAU_REF_S, "tau_act_s": TAU_ACT_S,
            "dt_int_s": DT_INT_S, "sub_int": SUB_INT,
            "load_step_magnitude_kW": LOAD_STEP_KW, "actuator_magnitude_pct": ACTUATOR_PCT,
            "Pload_kW": PLOAD_KW, "Pbat_ref_kW": P_BAT_REF_KW,
            "Ebat_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "soc_estimator": "ems_power_balance_estimate (A-fc-soc-est)",
            "feedback_modes": ["closed_loop", "monitor"],
            # §1.5 十常量定案值（FCECH-G2b-02；教学整定值、非实测——A-fcec-params）
            "E0_ref_V": E0_REF_V, "k_E_V_per_K": K_E_V_PER_K, "I_0_A": I_0_A,
            "c_act_V": C_ACT_V, "R_ohm0_ohm": R_OHM0_OHM,
            "alpha_ohm_per_K": ALPHA_OHM_PER_K, "c_conc_V": C_CONC_V,
            "I_lim_A": I_LIM_A, "C_st_J_per_K": C_ST_J_PER_K,
            "h_st_W_per_K": H_ST_W_PER_K, "T_amb_K": T_AMB_K,
            "electrochem_model": "on",
            "note": "L1 电化学-热轨（electrochem_model=on）：电气面 L0 序逐字保留"
                    "（healthy/sensor/monitor 解析闭式 + load_step/actuator 级联 foStep"
                    "子步递推，engine.js:780-790 级联结构），T_st 经典 RK4 固定步长 0.01"
                    "（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.4/§4 项 3 冻结更新序；"
                    "RHS 内 I_fc 冻结子步起点）；P_loss_W=(E0−V_stack)·I【W 记账——A-3】、"
                    "on 域 P_fc,true=V_stack·I_fc/1000（EQ-FCEC-2）、SOC_true/E_bat/P_bat "
                    "按真实功率基重算（A-5）、SOC_est 测量链未动与 L0 逐位同（Q5/A-1）；"
                    "分配器 EQ-6 与电池半边 0.4 kV 口径原样（A-fcec-dispatch）；E_fc 账本"
                    "子步梯形（FLTH Q4 同款 idiom）；十常量为教学整定值非实测；"
                    "单位字典零缺口核对：T=K（GT C-3 既有）、V=V（V_bus_V 既有）、kW 既有"
                    "——引擎 units 数组零新增行（model_hash 九键域零变化，B-2）；"
                    "fc001_v1（off 轨）字节冻结留档，本 golden 只读比对（G0-DEC-16）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集，镜像 fc001_v1 指标面 10 项"
                        "（E_source_kWh = 真实功率基 E_fc,true——A-5 记账基；E_bat_kWh 同基；"
                        "E_bat_est_kWh/E_load_kWh/SOC_est/focal_change 测量链未动与 L0 同"
                        "口径；无故障 Run focal_change 为 null）；T_st/V_stack/P_loss 端值"
                        "锚点经 scalars 面 T_st_end_K/V_stack_end_V/P_loss_stack_end_kW "
                        "承载（引擎侧指标注册归 FCECH-G2b-04）",
    }


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar（LF 钉死）；先跑 FEC-1…8，失败 exit 2 不写盘）
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
        tool="tools/oracle/fc001_l1_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/fc001_l1_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def main(argv):
    # GBK 控制台兼容（fl001_l1_oracle.py:1035-1041 先例）：统一 UTF-8 输出兜底；
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
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
