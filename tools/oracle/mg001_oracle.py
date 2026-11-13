# -*- coding: utf-8 -*-
"""mg001_oracle.py — MG-001 微电网多源聚合系统独立解析 oracle（MG-G2b-03，V110_WAVE_DESIGN
§2 W4 / MG001_G2B_SPEC_APPROVED v1.0 §4；CHG-20261110-01 批准链）。

独立性声明——「源物理复用委托」形制（MG001_G2B_SPEC_APPROVED v1.0 §4 项 1④ / 双路评审
条件 A-4 定案形制；违反即 golden 无效）：
  1. (i) 跨 oracle import 显式授权：本文件 import pv001_oracle / wt001_oracle 复用源轨
     物理是本规格 G2b 批准的显式授权面（非隐性复用）——源轨物理唯一权威 = 既有冻结
     oracle 模块的参数化入口（pv001_oracle._pv_stepped_series / pv_energy_integrals、
     wt001_oracle._simulate，规格 §4 项 1 点名的复用面），MG 不重写、不包裹、不重算任何
     源方程（EQ-MG-2；§1.2 复用声明的可执行形态）。BESS 能量面 3 行内联（P=0.4·I 换算、
     SOC 积分式、钳位代数）——权威文本 = FL-001 已批规格电气面
     （MODEL_VALIDATION_SPEC §1.2/§1.3），显式声明非 fl001_oracle 导入（其反馈/传感器/
     thermal 面不属聚合面）。
  2. (ii) 本文件不 import / 不复制 src/** 任何模块或常量；不与产品 engine 共享任何公式
     常量模块；oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手（无模型语义，
     D-2a 契约）。
  3. (iii) golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden
     只读比对（G0-DEC-16）。出生即 oracle_base 接入（无 V-03 历史字节负担，
     gt001_l1_oracle / wt001_oracle 先例；规格 §4 项 1③）。
  4. (iv) MS-3 逐位审计为 emit/verify 双面硬条件：golden 锚定源配置下 P_pv/P_wt 源通道
     序列（≤1e-12）与 E_pv/E_wt 标量（逐位）同 pv001_v1/wt001_v1 golden 核对——源
     oracle 文件变更 → 源 golden 重出 → 本项失配 → emit/verify 拒绝（R-6 传递耦合的
     结构守卫；B-2 统一强口径：序列 ≤1e-12，标量为核对子集）。V-03（本文件自身字节
     哈希）不覆盖被 import 的源 oracle 文件——该覆盖面局限由此显式登记并由 MS-3 补齐。
  5. 本文件自带自检 MS-1…MS-8（规格 §4 项 3 逐条），自检失败由调用方以 exit 2 报告；
     emit 前置自检（失败不写盘）。

模型（聚合层 L0 · 多源聚合行为级演示，单母线并网等效；规格 §0/§1.4——聚合层自身零新增
ODE 状态，全部新方程为代数；各源物理原样复用既有轨，层级 provenance 不升级）：
  EQ-MG-1  load(t) = load_kW + ΔP·1(t>=t0)（仅 load_step）；island(t) = 1(t>=t_start)·
           1(t<t_clear)（t_clear 缺省 = 窗末 60 s 持续脱离，仅 island_event）；子轨事件
           透传 ΔG/Δv 于各自 t0 生效（t0 处右极限、post 采样行语义，
           fl001_oracle.py:103-108 口径同构）。
  EQ-MG-2  P_pv(t) = PV-001 轨输出（G0=1000 固定面；oracle 侧 = pv001_oracle 参数化
           序列函数复用调用——序列面 _pv_stepped_series（引擎 foStep 0.1 s 子步同构路径，
           与 MG-G2b-04 引擎 simulatePV001 复用调用逐位同构）、能量面 pv_energy_integrals
           （pv001 生产积分器，E_pv 与源 golden 逐位一致））；P_wt(t) = WT-001 轨输出
           （v0=9 固定面；wt001_oracle._simulate 复用调用，序列/标量与源 golden 逐位
           一致）——不重写物理。
  EQ-MG-3  并网面：P_bess = p_sched；P_grid = load − P_pv − P_wt − P_bess（受电为正，
           理想双向，无爬坡/额定/倒送约束）；P_served = load；P_shed = P_dump = 0。
  EQ-MG-4  孤岛面：P_grid ≡ 0；chase = load − P_pv − P_wt；P_bess = clamp(chase, −8, +8)；
           P_shed = max(0, chase − P_bess)；P_dump = max(0, P_bess − chase)；
           P_served = load − P_shed（理想瞬时平衡填补 + 钳位卸载，Q4 已定案——恒等式
           按构造成立，无缓冲状态）。
  EQ-MG-5  BESS 角色切换：并网计划跟踪（P_bess 目标 = p_sched）；孤岛计划挂起、切换为
           平衡填补；重连（t_clear_s）恢复计划跟踪。
  EQ-MG-6  r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0（定义恒等，
           代数路径回归）；r_meas ≡ 0（全功率测量通道健康——与 FL-001 r_meas = 0.4·b
           教学对照）。
  EQ-MG-7  SOC_true(t) = SOC0 − 100·∫[0,t] P_bess dt/(3600·40)（%）；SOC_est 同式用测量
           通道（全通道健康 ⇒ 逐位 ≡ SOC_true）；SOC_err ≡ 0。积分 = 事件感知分段解析
           ——Q1(b) 定案结构推论：island Run 源恒健康 ⇒ chase 分段常值 ⇒ clamp 分段
           常值 ⇒ P_bess 分段常值（断点 = 事件边界；MS-7 分段常值断言 0.00e+00 为
           emit 硬条件，前提失效即拒绝写盘——WT WS-8 同款纪律）。
  EQ-MG-8  E_x = 事件感知精确积分（kW·s，/3600 → kWh）：分段常值信号（load/served/shed/
           dump/bess）按段解析；时变源段（E_pv/E_wt）复用源 oracle 积分；E_grid :=
           E_served + E_dump − E_pv − E_wt − E_bess（恒等导出——避免对时变 P_grid 序列
           做数值积分；采样网格右端点和的边界伪差显式排除，规格 §3.4）。
  EQ-MG-9  V_bus = 400 V（模型假设，tableOnly，非仿真状态）。

信号面（golden series 19 列 = t + 规格 §1.3 表 18 信号，顺序按表；§4 项 4）：
  P_bess_chase_kW 为唯一事件域 null 信号（岛窗外 null——I_bat_cap_A/beta_stuck_deg
  先例，ORACLE_INTERFACE_D2 §5.2 F-4）：healthy/load_step/pv_shading/wt_gust Run 整列
  null；island Run 仅岛窗 [t_start, t_clear) 行有值。island_state 全程有值（0/1）。
  其余列无 null。units 零新增（kW/%/pp/V/'-' 既有，规格 §1.3 单位字典缺口核查）。

Run 面（规格 §4 项 2，5 Run；monitor Run 不重复入 golden——MG 四族全为物理输入，两模式
逐位同解 MS-5 实证，PV shading/WT gust 先例延用）：healthy（baseline 并网）/
load_step_closed_loop（+10 @20 并网）/ pv_shading_closed_loop（−300 降幅 @20 并网）/
wt_gust_closed_loop（+2 @20 并网）/ island_reconnect（island_event @20、t_clear=35，
零参数族 Q2 定案——脱离/重连语义由 t_start_s/t_clear_s 完整承载）。

island_event 双事件快照（MG-IMP-Q2 golden 侧面定案，§2.4 实现面登记③）：脱离 EV-001
@20.0 + 重连 EV-002 @35.0，各 pre（left_limit，事件行左极限状态）/post（post_sample，
事件采样行右极限 post 语义）一对——verify_golden V-09 只深检首事件（snapshots[0/1] 对
config.fault_time_s=20.0 与 i_meas=P_grid_meas_kW 相位值），事件数 2==2；重连 EV-002
pre/post = 349/350 采样行，与 gt001 actuator_clear EV-002 先例同构；P_bess_chase_kW
null 布局双侧同码同位，W2-1 双 null 相位规则核查无冲突。

时间网格：t[i] = i·dt（IEEE-754 double 积，禁止累加，fl001_oracle.py:207-210 同式）；
  i_f = 200（t=20.0 精确网格点）；i_clear = 350（t=35.0 精确网格点）。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 4/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="mg001_v1"、model_id="MG-001"、
    model_version="1.0.0"（三段式）、method_id="mg001_aggregate_analytic"（聚合全闭式 +
    源轨复用——EQ-MG-7 分段常值前提下的闭式口径）、engine_baseline=null、backend=null
    （§3.4 留位）。build_golden() 不含 generated_by/approval（v2 一段式：
    oracle_base.emit_golden 在 emit 时点现算回填——generated_at 不得 null 占位出境；
    approval 三值非 null 方可落盘）。
  - approval 三字段首签（emit 时）：approved_by="user（2026-11-10 CHG-20261110-01
    批准链）"（沿 wt001_v1 approval 块措辞惯例）、approved_at = emit 时点
    （2026-11-11）、approved_golden_sha256 = V-03b 内容摘要（oracle_base.apply_approval）。
  - gate 块 tier="T-A"（规格 §4 项 6 九键原样；A-1 修订：I_A_rtol/I_A_atol 必带——
    verify_golden T-A 路径 V-05 关键点（:340）/标量 metric 兜底支路（:251）/事件容差
    缺省键（:426）直接索引两键；SOC_pp 键必须存在——T-A series_limit 对 SOC_* 系列
    走 tol["SOC_pp"] 支路（:214-215）；r_true_kW 键由 metrics.max_abs_r_true_kW 消费）：
    E_kWh/P_kW_rtol/P_kW_atol/I_A_rtol/I_A_atol/SOC_pp/r_true_kW/t_s。

emit：python -I tools/oracle/mg001_oracle.py --emit（先跑 MS-1…MS-8，失败 exit 2 不写盘；
  经 oracle_base.emit_golden 产出 data/golden/mg001_v1.json + .sha256 sidecar，LF 钉死，
  oracle_base.py:179-206 字节规范）。
自检：python -I tools/oracle/mg001_oracle.py            # 无参默认 = 自检摘要（exit 0=全过 /
  2=失败；与 --self-check 同面——本 oracle 入口即自检面，记录面字符串保持 ASCII 安全，
  避免 GBK 控制台编码陷阱）。

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
# 源物理复用委托（显式授权 import——MG001_G2B_SPEC_APPROVED v1.0 §4 项 1④ / A-4；
# 非隐性复用：源轨物理唯一权威 = 既有冻结 oracle 模块参数化入口，EQ-MG-2；
# MS-3 逐位审计为 emit/verify 双面硬条件——源侧变更即失配拒绝）
# ---------------------------------------------------------------------------
import pv001_oracle  # noqa: E402
import wt001_oracle  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结参数（MG001_G2B_SPEC_APPROVED v1.0 §1.1/§1.2/§1.3/§2/§3；任何变更须重建 golden）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生）
T0_S = 20.0                                     # 默认注入时刻（库口径，FAULT_CATALOG §0）
I_F = int(round(T0_S / DT_S))                   # 200
T_CLEAR_GOLDEN_S = 35.0     # island_event golden 锚定 t_clear=35（§2.4）
I_CLEAR = int(round(T_CLEAR_GOLDEN_S / DT_S))   # 350（重连事件行）

LOAD_KW = 30.0          # 聚合负荷默认（§1.1 initial.load_kW；bounds [10,45]）
P_SCHED_KW = 5.0        # BESS 调度计划默认 +5 kW 放电（§0/§1.1 initial.p_sched_kW）
SOC0_PCT = 60.0         # SOC 账本初值（§1.1 initial.SOC_pct）
E_BAT_KWH = 40.0        # BESS 电池能量面（FL-001 电气面：40 kWh / 400 V、P=0.4·I 换算）
V_BUS_V = 400.0         # EQ-MG-9 母线电压（模型假设，非仿真状态）
P_CLAMP_KW = 8.0        # BESS 结构功率域 [−8, +8] kW（A-mg-bess-structural-limit）

LOAD_STEP_DP_KW = 10.0      # load_step 默认 +10 kW（§2.1；有符号域 [−10,+20] Q6 定案）
SHADING_DG_W_M2 = 300.0     # pv_shading_link 默认遮挡降幅 300（G0 1000→700，源域原样 §2.2）
GUST_DV_MS = 2.0            # wt_gust_link 默认 +2.0 m/s（v 9→11 跨额定区，源域原样 §2.3）

# 源子轨固定面健康局（§1.2：PV G0=1000 ⇒ 10 kW、WT v0=9 ⇒ 10 kW；岛内 chase 名义值
# = load − 20 的解析依据。MS-3 对源 golden 逐位审计保证固定面与源轨实况一致——
# WT 健康轨数值 wiggle ±1e-9 被 clamp 吸收，不影响分段常值前提）
PV_HEALTHY_KW = 10.0
WT_HEALTHY_KW = 10.0

METHOD_ID = "mg001_aggregate_analytic"
METHOD_VERSION = "1"
GOLDEN_ID = "mg001_v1"
MODEL_ID = "MG-001"
MODEL_VERSION = "1.0.0"
APPROVED_BY = "user（2026-11-10 CHG-20261110-01 批准链）"

# 故障族（§2 四族同名；island_event 为零参数族——Q2 已定案，脱离/重连由
# t_start_s/t_clear_s 承载，无幅值语义）
FAMILY_NONE = "none"
FAMILY_LOAD = "load_step"
FAMILY_SHADING = "shading_link"
FAMILY_GUST = "gust_link"
FAMILY_ISLAND = "island_event"

# SERIES_IDS = ['t'] + 规格 §1.3 表 18 信号 = 19 项（顺序按表；§4 项 4）
SERIES_IDS = [
    "t",
    "island_state",
    "P_pv_kW", "P_wt_kW", "P_bess_kW", "P_sched_kW", "P_bess_chase_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "P_grid_true_kW", "P_grid_meas_kW",
    "P_shed_kW", "P_dump_kW",
    "V_bus_V",
    "SOC_true_pct", "SOC_est_pct", "SOC_err_pp",
    "r_true_kW", "r_meas_kW",
]
NULL_COLUMN = "P_bess_chase_kW"     # 唯一事件域 null 列（§1.3 注）

# V-06 注册标量键面（scripts/verify_golden.py MODELS["mg001"].scalars 同面；规格 §4 项 7）
REGISTERED_SCALARS = (
    "E_pv_kWh", "E_wt_kWh", "E_bess_kWh", "E_grid_kWh",
    "E_load_served_kWh", "E_shed_kWh", "E_dump_kWh", "E_load_demand_kWh",
    "SOC_true_end_pct", "SOC_est_end_pct", "SOC_err_end_pp",
)

# 五组固定 Run（规格 §4 项 2；monitor Run 不重复入 golden——MS-5 逐位等价实证；
# Run 键唯一 + role 必填，出生即满足归一契约）
RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False, "magnitude": None, "unit": "-"},
    {"key": "load_step_closed_loop", "role": "fault", "family": FAMILY_LOAD,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": LOAD_STEP_DP_KW,
     "unit": "kW"},
    {"key": "pv_shading_closed_loop", "role": "fault", "family": FAMILY_SHADING,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": SHADING_DG_W_M2,
     "unit": "W/m²"},
    {"key": "wt_gust_closed_loop", "role": "fault", "family": FAMILY_GUST,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": GUST_DV_MS,
     "unit": "m/s"},
    {"key": "island_reconnect", "role": "fault", "family": FAMILY_ISLAND,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": None, "unit": "-",
     "t_clear_s": T_CLEAR_GOLDEN_S},
]

# 事件快照变量集（各事件同面；含 i_meas=P_grid_meas_kW——verify_golden V-09 事件容差
# 比对对象；P_bess_chase_kW pre 侧 null 为事件域信号未生效态，I_bat_cap_A/beta_stuck_deg
# 快照先例）
SNAP_UNITS = {
    "island_state": "-", "P_pv_kW": "kW", "P_wt_kW": "kW", "P_bess_kW": "kW",
    "P_sched_kW": "kW", "P_bess_chase_kW": "kW",
    "P_load_demand_kW": "kW", "P_load_served_kW": "kW",
    "P_grid_true_kW": "kW", "P_grid_meas_kW": "kW",
    "P_shed_kW": "kW", "P_dump_kW": "kW",
    "SOC_true_pct": "%", "r_true_kW": "kW",
}


# ---------------------------------------------------------------------------
# 网格与分段解析积分助手（EQ-MG-1/7/8）
# ---------------------------------------------------------------------------
def build_time_grid():
    """t[i] = i*dt（IEEE-754 积原值，禁止累加；fl001_oracle.py:207-210 同式）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def _seg_integral(segs, t_end):
    """分段解析积分 ∫[0, t_end]（段值常值；EQ-MG-7/8 事件感知分段解析）。
    segs = [(a, b, v)]；事件边界处测度为零（右极限 post 语义：段值自其左端点起生效）。
    min() 端点钳位使 t_end=60 端点积分逐位精确（段值×整数段长）。"""
    total = 0.0
    for a, b, v in segs:
        u = min(t_end, b) - a
        if u > 0.0:
            total += v * u
    return total


def _seg_value_at(segs, t):
    """段表在 t 处的右极限段值（post 语义：段值自其左端点起生效——含左端点采样行）。
    取 a <= t 的最后一个段；MS-7 分段常值断言的期望值面。"""
    val = segs[0][2]
    for a, _b, v in segs:
        if t >= a:
            val = v
        else:
            break
    return val


def _chase_nominal():
    """岛内 chase 名义值（Q1(b) 定案结构推论：island Run 源恒健康 ⇒ chase = load − 20
    分段常值；§1.2 固定面健康局 10+10；§3.3 复算口径 chase=10、钳位 8、卸载 2）。"""
    return LOAD_KW - PV_HEALTHY_KW - WT_HEALTHY_KW


def run_structure(family, faulted, magnitude, t_clear_s):
    """EQ-MG-1/3/4/5 相位段表（事件感知分段解析积分与 MS-7 分段常值断言的段面）。
    返回 dict(load/bess/shed/dump = [(a, b, v)], island = bool, t_clear = float|None)。
    段值为解析名义值（源固定面健康局）；MS-7 逐点核对序列与段表一致——P_bess 逐位
    （分段常值前提失效守卫：前提失效即断言 fail → emit 拒绝写盘）、load 逐位、
    shed/dump ≤1e-6（WT 健康轨 ±1e-9 wiggle 被 clamp 吸收后 shed = chase − 8 的
    残余 wiggle，≪ 锚点容差 ±0.05）。"""
    if faulted and family == FAMILY_ISLAND:
        chase = _chase_nominal()                                   # 10
        bess = min(max(chase, -P_CLAMP_KW), P_CLAMP_KW)            # 8（钳位）
        shed = max(0.0, chase - bess)                              # 2（缺口卸载）
        dump = max(0.0, bess - chase)                              # 0（盈余倾卸）
        tc = float(t_clear_s) if t_clear_s is not None else DURATION_S
        return {
            "load": [(0.0, DURATION_S, LOAD_KW)],
            "bess": [(0.0, T0_S, P_SCHED_KW), (T0_S, tc, bess),
                     (tc, DURATION_S, P_SCHED_KW)],
            "shed": [(0.0, T0_S, 0.0), (T0_S, tc, shed), (tc, DURATION_S, 0.0)],
            "dump": [(0.0, DURATION_S, dump)],
            "island": True, "t_clear": tc,
        }
    dp = float(magnitude) if (faulted and family == FAMILY_LOAD) else 0.0
    load_segs = ([(0.0, T0_S, LOAD_KW), (T0_S, DURATION_S, LOAD_KW + dp)] if dp != 0.0
                 else [(0.0, DURATION_S, LOAD_KW)])
    return {"load": load_segs,
            "bess": [(0.0, DURATION_S, P_SCHED_KW)],       # EQ-MG-5 计划跟踪不受
            "shed": [(0.0, DURATION_S, 0.0)],              #   聚合输入阶跃/子轨物理事件
            "dump": [(0.0, DURATION_S, 0.0)],              #   影响（§2.1/§3.2）
            "island": False, "t_clear": None}


def _load_at(t, family, faulted, magnitude):
    """EQ-MG-1：load(t) = load_kW + ΔP·1(t>=t0)（仅 load_step；t0 处右极限 post 采样行）。"""
    if faulted and family == FAMILY_LOAD and t >= T0_S:
        return LOAD_KW + float(magnitude)
    return LOAD_KW


def _island_active(t, island, t_clear):
    """EQ-MG-1：island(t) = 1(t>=t_start)·1(t<t_clear)；t_clear 缺省 = 窗末持续脱离。
    事件边界 20.0/35.0 为 t[i]=i*dt 精确网格点（I_F=200 / i_clear=350）。"""
    return bool(island) and t >= T0_S and t < t_clear


# ---------------------------------------------------------------------------
# simulate_run（归一契约：str run key / spec dict 双形态，oracle_base.resolve_run_spec）
# ---------------------------------------------------------------------------
def simulate_run(spec):
    """单组 Run 的 601 点全精度序列 + 事件快照 + 标量 + 指标。

    归一契约（ORACLE_INTERFACE_D2.md §2）：第一参数兼容 run key（str，归一式）与
    spec dict（verify_golden.py:196-201 现行调用式的兼容面），经
    oracle_base.resolve_run_spec 归一。聚合代数在输出采样网格（601 点）上逐点执行
    （§1.2：MG 层无子步循环、无新 ODE）；源轨序列/能量经 EQ-MG-2 复用委托获取。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    mode = spec["feedback_mode"]
    family = spec.get("family", FAMILY_NONE)
    faulted = bool(spec["faulted"])
    magnitude = spec.get("magnitude")
    magnitude = float(magnitude) if magnitude is not None else 0.0
    st = run_structure(family, faulted, magnitude, spec.get("t_clear_s"))

    # EQ-MG-2 源轨复用（参数化入口调用；feedback_mode 透传——monitor 两模式同解由
    # 源轨物理输入性质保证，MS-5 实证）
    pv_faulted = faulted and family == FAMILY_SHADING
    delta_g = magnitude if pv_faulted else 0.0
    pv_series, _ = pv001_oracle._pv_stepped_series(mode, pv_faulted, delta_g, 0.0)
    int_pv = pv001_oracle.pv_energy_integrals(mode, pv_faulted, delta_g, 0.0,
                                              DURATION_S)[0]
    wt_faulted = faulted and family == FAMILY_GUST
    wt_res = wt001_oracle._simulate(
        9.0, mode,
        wt001_oracle.FAMILY_GUST if wt_faulted else wt001_oracle.FAMILY_NONE,
        magnitude if wt_faulted else 0.0, wt_faulted)
    wt_series = wt_res["series"]["P_wt_true_kW"]
    e_wt = wt_res["scalars"]["E_wt_true_kWh"]

    t = build_time_grid()
    col = {sid: [0.0] * N_SAMPLES for sid in SERIES_IDS if sid != "t"}
    col["P_bess_chase_kW"] = [None] * N_SAMPLES     # 唯一事件域 null 列（岛窗外 null）

    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0
    for i, ti in enumerate(t):
        load = _load_at(ti, family, faulted, magnitude)          # EQ-MG-1
        p_pv = pv_series[i]                                      # EQ-MG-2
        p_wt = wt_series[i]                                      # EQ-MG-2
        isl = _island_active(ti, st["island"], st["t_clear"])    # EQ-MG-1
        if isl:                                                  # EQ-MG-4（孤岛面重整）
            chase = load - p_pv - p_wt                           #   平衡填补目标（钳位前）
            p_bess = min(max(chase, -P_CLAMP_KW), P_CLAMP_KW)    #   钳位 ±8（结构域）
            p_shed = max(0.0, chase - p_bess)                    #   缺口卸载
            p_dump = max(0.0, p_bess - chase)                    #   盈余倾卸
            p_served = load - p_shed
            p_grid = 0.0                                         #   孤岛 P_grid ≡ 0
            col["P_bess_chase_kW"][i] = chase
        else:                                                    # EQ-MG-3（并网面）
            p_bess = P_SCHED_KW                                  # EQ-MG-5 计划跟踪
            p_shed = 0.0
            p_dump = 0.0
            p_served = load
            p_grid = load - p_pv - p_wt - p_bess                 # 理想双向补差（受电为正）
        col["island_state"][i] = 1.0 if isl else 0.0
        col["P_pv_kW"][i] = p_pv
        col["P_wt_kW"][i] = p_wt
        col["P_bess_kW"][i] = p_bess
        col["P_sched_kW"][i] = P_SCHED_KW
        col["P_load_demand_kW"][i] = load
        col["P_load_served_kW"][i] = p_served
        col["P_grid_true_kW"][i] = p_grid
        col["P_grid_meas_kW"][i] = p_grid          # 测量通道健康（§1.3）
        col["P_shed_kW"][i] = p_shed
        col["P_dump_kW"][i] = p_dump
        col["V_bus_V"][i] = V_BUS_V                            # EQ-MG-9（模型假设）
        soc = SOC0_PCT - 100.0 * _seg_integral(st["bess"], ti) / (3600.0 * E_BAT_KWH)
        col["SOC_true_pct"][i] = soc                           # EQ-MG-7 分段解析
        col["SOC_est_pct"][i] = soc               # 同式测量通道（全通道健康 ⇒ 逐位同值）
        col["SOC_err_pp"][i] = (col["SOC_est_pct"][i] - col["SOC_true_pct"][i])
        r_true = p_pv + p_wt + p_bess + p_grid - p_served - p_dump   # EQ-MG-6 定义恒等
        r_meas = (p_pv + p_wt + p_bess + col["P_grid_meas_kW"][i]
                  - p_served - p_dump)                         # 全功率通道健康 → 0
        col["r_true_kW"][i] = r_true
        col["r_meas_kW"][i] = r_meas
        if abs(r_true) > max_abs_r_true:
            max_abs_r_true = abs(r_true)
        if abs(r_meas) > max_abs_r_meas:
            max_abs_r_meas = abs(r_meas)

    # EQ-MG-8 能量口径：分段常值信号按段解析；E_pv/E_wt 复用源 oracle 积分；
    # E_grid 由恒等导出（避免对时变 P_grid 序列做数值积分）
    e_pv = int_pv / 3600.0
    e_bess = _seg_integral(st["bess"], DURATION_S) / 3600.0
    e_demand = _seg_integral(st["load"], DURATION_S) / 3600.0
    e_shed = _seg_integral(st["shed"], DURATION_S) / 3600.0
    e_dump = _seg_integral(st["dump"], DURATION_S) / 3600.0
    e_served = e_demand - e_shed
    e_grid = e_served + e_dump - e_pv - e_wt - e_bess

    metrics = {
        "E_pv_60s": {"value": e_pv, "unit": "kWh", "method": METHOD_ID},
        "E_wt_60s": {"value": e_wt, "unit": "kWh", "method": METHOD_ID},
        "E_bess_60s": {"value": e_bess, "unit": "kWh", "method": METHOD_ID},
        "E_grid_60s": {"value": e_grid, "unit": "kWh", "method": METHOD_ID},
        "E_load_served_60s": {"value": e_served, "unit": "kWh", "method": METHOD_ID},
        "E_load_demand_60s": {"value": e_demand, "unit": "kWh", "method": METHOD_ID},
        "E_shed_60s": {"value": e_shed, "unit": "kWh", "method": METHOD_ID},
        "E_dump_60s": {"value": e_dump, "unit": "kWh", "method": METHOD_ID},
        "P_pv_end_kW": {"value": col["P_pv_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "P_wt_end_kW": {"value": col["P_wt_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "P_bess_end_kW": {"value": col["P_bess_kW"][-1], "unit": "kW", "method": METHOD_ID},
        "P_grid_true_end_kW": {"value": col["P_grid_true_kW"][-1], "unit": "kW",
                               "method": METHOD_ID},
        "P_load_served_end_kW": {"value": col["P_load_served_kW"][-1], "unit": "kW",
                                 "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
    }

    scalars = {
        "E_pv_kWh": e_pv,
        "E_wt_kWh": e_wt,
        "E_bess_kWh": e_bess,
        "E_grid_kWh": e_grid,
        "E_load_served_kWh": e_served,
        "E_shed_kWh": e_shed,
        "E_dump_kWh": e_dump,
        "E_load_demand_kWh": e_demand,
        "SOC_true_end_pct": col["SOC_true_pct"][-1],
        "SOC_est_end_pct": col["SOC_est_pct"][-1],
        "SOC_err_end_pp": col["SOC_err_pp"][-1],
        # 锚点面标量（§3.1–3.3；MS-7 消费）
        "t_19p9_s": t[I_F - 1],
        "P_grid_true_19p9_kW": col["P_grid_true_kW"][I_F - 1],
        "P_bess_19p9_kW": col["P_bess_kW"][I_F - 1],
        "P_grid_true_20post_kW": col["P_grid_true_kW"][I_F],
        "P_bess_20post_kW": col["P_bess_kW"][I_F],
        "P_bess_chase_20post_kW": col["P_bess_chase_kW"][I_F],
        "P_shed_20post_kW": col["P_shed_kW"][I_F],
        "P_load_demand_20post_kW": col["P_load_demand_kW"][I_F],
        "P_load_served_20post_kW": col["P_load_served_kW"][I_F],
        "island_state_20post": col["island_state"][I_F],
        "P_grid_true_21p5_kW": col["P_grid_true_kW"][int(round(21.5 / DT_S))],
        "P_load_served_21p5_kW": col["P_load_served_kW"][int(round(21.5 / DT_S))],
        "P_grid_true_26_kW": col["P_grid_true_kW"][int(round(26.0 / DT_S))],
        "P_pv_true_20post_kW": col["P_pv_kW"][I_F],
        "P_pv_true_20p1_kW": col["P_pv_kW"][int(round(20.1 / DT_S))],
        "P_pv_true_21_kW": col["P_pv_kW"][int(round(21.0 / DT_S))],
        "P_pv_true_60_kW": col["P_pv_kW"][-1],
        "P_wt_true_20post_kW": col["P_wt_kW"][I_F],
        "P_wt_true_21_kW": col["P_wt_kW"][int(round(21.0 / DT_S))],
        "P_wt_true_26_kW": col["P_wt_kW"][int(round(26.0 / DT_S))],
        "P_wt_true_60_kW": col["P_wt_kW"][-1],
        "P_grid_true_60_kW": col["P_grid_true_kW"][-1],
        "P_bess_60_kW": col["P_bess_kW"][-1],
        "P_load_served_60_kW": col["P_load_served_kW"][-1],
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
    }
    if st["island"]:
        i_clear = int(round(st["t_clear"] / DT_S))
        scalars.update({
            "island_state_35pre": col["island_state"][i_clear - 1],
            "island_state_35post": col["island_state"][i_clear],
            "P_grid_true_35post_kW": col["P_grid_true_kW"][i_clear],
            "P_bess_35post_kW": col["P_bess_kW"][i_clear],
            "P_bess_chase_35pre_kW": col["P_bess_chase_kW"][i_clear - 1],
            "P_bess_chase_35post_kW": col["P_bess_chase_kW"][i_clear],   # 重连后 null
            "P_shed_35pre_kW": col["P_shed_kW"][i_clear - 1],
        })

    events = _fault_event(family, faulted, magnitude, st, col)

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


# ---------------------------------------------------------------------------
# 事件编码 v1（fl001/pv001/wt001/gt001 同构）+ 双事件快照（island_event 专用）
# ---------------------------------------------------------------------------
def _mk_event(event_id, event_type, trigger_s, target_signal, magnitude, unit,
              col, i_pre, i_post, fault_id):
    """单事件构造：pre = 事件采样行左极限（left_limit，事件未生效状态行）、
    post = 事件采样行（post_sample，右极限 post 语义）——fl001_oracle.py:288-352 /
    pv001_oracle.py:413-461 / wt001_oracle.py:451-510 同构；重连事件 pre/post = 
    i_clear-1/i_clear 采样行，gt001 actuator_clear EV-002（349/350）先例同构。"""
    return {
        "event_id": event_id,
        "event_type": event_type,
        "trigger_s": trigger_s,
        "target_signal": target_signal,
        "magnitude": magnitude,
        "unit": unit,
        "snapshots": [
            {"snapshot_id": event_id + "-pre", "event_id": event_id, "phase": "pre",
             "t_s": trigger_s, "derivation": "left_limit",
             "variables": {sid: col[sid][i_pre] for sid in SNAP_UNITS},
             "units": SNAP_UNITS, "fault_id": fault_id},
            {"snapshot_id": event_id + "-post", "event_id": event_id, "phase": "post",
             "t_s": trigger_s, "derivation": "post_sample",
             "variables": {sid: col[sid][i_post] for sid in SNAP_UNITS},
             "units": SNAP_UNITS, "fault_id": fault_id},
        ],
    }


def _fault_event(family, faulted, magnitude, st, col):
    """事件面（§2 四族）。island_event 产生双事件快照（脱离 EV-001 + 重连 EV-002，
    各 pre/post 一对——§2.4；MG-IMP-Q2 golden 侧面定案）：零参数族无幅值语义，
    magnitude/unit 为 null（诚实编码，不挂伪幅值）；其余单事件族幅值 = Run 参数值
    （PV/WT fault_block 同款符号约定：shading 为遮挡降幅正值）。"""
    if not faulted:
        return []
    if st["island"]:
        i_clear = int(round(st["t_clear"] / DT_S))
        return [
            _mk_event("EV-001", "island_event", T0_S, "island_state", None, None,
                      col, I_F - 1, I_F, FAMILY_ISLAND),
            _mk_event("EV-002", "island_reconnect", st["t_clear"], "island_state",
                      None, None, col, i_clear - 1, i_clear, FAMILY_ISLAND),
        ]
    if family == FAMILY_SHADING:
        return [_mk_event("EV-001", FAMILY_SHADING, T0_S, "P_pv_kW", magnitude,
                          "W/m²", col, I_F - 1, I_F, FAMILY_SHADING)]
    if family == FAMILY_GUST:
        return [_mk_event("EV-001", FAMILY_GUST, T0_S, "P_wt_kW", magnitude,
                          "m/s", col, I_F - 1, I_F, FAMILY_GUST)]
    return [_mk_event("EV-001", FAMILY_LOAD, T0_S, "P_load_demand_kW", magnitude,
                      "kW", col, I_F - 1, I_F, FAMILY_LOAD)]


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族/fault id 与规格 §2 四族同名；
    island_event 零参数族——无幅值键，t_clear_s 承载重连（gt001 actuator_clear
    fault 块 t_clear_s 先例），Q2 定案）。"""
    if not spec["faulted"]:
        return None
    family = spec.get("family")
    if family == FAMILY_LOAD:
        return {"family": FAMILY_LOAD, "fault_id": FAMILY_LOAD,
                "t_start_s": T0_S, "delta_load_kW": spec["magnitude"]}
    if family == FAMILY_SHADING:
        return {"family": FAMILY_SHADING, "fault_id": FAMILY_SHADING,
                "t_start_s": T0_S, "delta_g_W_m2": spec["magnitude"]}
    if family == FAMILY_GUST:
        return {"family": FAMILY_GUST, "fault_id": FAMILY_GUST,
                "t_start_s": T0_S, "delta_v_ms": spec["magnitude"]}
    return {"family": FAMILY_ISLAND, "fault_id": FAMILY_ISLAND,
            "t_start_s": T0_S, "t_clear_s": spec.get("t_clear_s", DURATION_S)}


# ---------------------------------------------------------------------------
# 自检 MS-1…MS-8（规格 §4 项 3 逐条；失败 => exit 2；MS-3 为 emit/verify 双面硬条件）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
def self_check():
    """独立自检 MS-1…MS-8（不复用 FL/FC/GT/PV/WT 的 SC/FL/GL/GS/PS/WS 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    t = build_time_grid()
    i_clear = int(round(T_CLEAR_GOLDEN_S / DT_S))    # 350

    # MS-1 网格 + 事件域 null 布局：601 点、t[i]=i*dt 严格递增、端点 0/60、各 Run 全列
    # 等长；P_bess_chase_kW 非 island Run 整列 null、island Run 仅岛窗 [200,350) 行
    # 有值；其余列无 null 且有限。
    ok1 = (len(t) == N_SAMPLES
           and all(t[i] < t[i + 1] for i in range(N_SAMPLES - 1))
           and all(t[i] == i * DT_S for i in range(N_SAMPLES))
           and t[0] == 0.0 and t[-1] == DURATION_S
           and all(len(r["series"][sid]) == N_SAMPLES for r in runs for sid in SERIES_IDS))
    null_ok = True
    for spec, r in zip(RUNS, runs):
        chase = r["series"]["P_bess_chase_kW"]
        is_island = spec["family"] == FAMILY_ISLAND
        for ii, v in enumerate(chase):
            in_window = is_island and (I_F <= ii < i_clear)
            if in_window:
                if v is None or not math.isfinite(v):
                    null_ok = False
            elif v is not None:
                null_ok = False
    finite_ok = True
    for r in runs:
        for sid in SERIES_IDS:
            if sid == NULL_COLUMN:
                continue
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    finite_ok = False
    ok1 = ok1 and null_ok and finite_ok
    rec("MS-1-grid-null-layout", ok1,
        "%d points, t[0]=%g, t[-1]=%g; null_layout=%s; finite=%s"
        % (len(t), t[0], t[-1], null_ok, finite_ok),
        "601 points, t[i]=i*dt, strictly increasing; P_bess_chase_kW event-domain "
        "null layout (island window rows only); all other columns null-free finite",
        "grid: IEEE-754 product per index; 5 runs x 19 series columns")

    # MS-2 恒等式面：r_true/r_meas 逐点 0（<=1e-12 kW）；E_pv+E_wt+E_bess+E_grid ≡
    # E_served+E_dump（<=1e-9 kWh，E_grid 恒等导出的构造性闭合）；E_served+E_shed ≡
    # E_demand（<=1e-9 kWh）。
    worst_r = 0.0
    worst_e1 = 0.0
    worst_e2 = 0.0
    for r in runs:
        for sid in ("r_true_kW", "r_meas_kW"):
            for v in r["series"][sid]:
                worst_r = max(worst_r, abs(v))
        sc = r["scalars"]
        worst_e1 = max(worst_e1, abs((sc["E_pv_kWh"] + sc["E_wt_kWh"] + sc["E_bess_kWh"]
                                      + sc["E_grid_kWh"])
                                     - (sc["E_load_served_kWh"] + sc["E_dump_kWh"])))
        worst_e2 = max(worst_e2, abs((sc["E_load_served_kWh"] + sc["E_shed_kWh"])
                                     - sc["E_load_demand_kWh"]))
    ok2 = worst_r <= 1e-12 and worst_e1 <= 1e-9 and worst_e2 <= 1e-9
    rec("MS-2-identities", ok2,
        "max|r|=%.3e kW, max|dE_bus|=%.3e kWh, max|dE_shed|=%.3e kWh"
        % (worst_r, worst_e1, worst_e2),
        "|r_true/r_meas| <= 1e-12 kW; |E_pv+E_wt+E_bess+E_grid - E_served-E_dump| "
        "<= 1e-9 kWh; |E_served+E_shed - E_demand| <= 1e-9 kWh",
        "EQ-MG-6 bus identity (algebraic regression) + EQ-MG-8 ledger identities, "
        "5 runs x 601 points")

    # MS-3 复用一致性（emit/verify 双面硬条件；B-2 统一强口径）：golden 锚定源配置下
    # P_pv/P_wt 源通道序列同 pv001_v1/wt001_v1 golden 序列核对（<=1e-12——PV 序列为
    # 引擎同构子步路径复用，与 pv001_v1 闭式 golden 的 PS-4 记录差 <=1e-12；WT 序列
    # 同函数同参逐位 0）+ E_pv/E_wt 标量与源 golden 逐位一致（核对子集）。
    # 源 oracle 文件变更 -> 源 golden 重出 -> 本项失配 -> emit/verify 拒绝（R-6）。
    src_ok = True
    src_detail = []
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        with open(os.path.join(root, "data", "golden", "pv001_v1.json"),
                  encoding="utf-8") as f:
            pv_golden = json.load(f)
        with open(os.path.join(root, "data", "golden", "wt001_v1.json"),
                  encoding="utf-8") as f:
            wt_golden = json.load(f)
    except Exception as exc:  # noqa: BLE001
        src_ok = False
        src_detail.append("source golden load failed: %s" % exc)
        pv_golden = wt_golden = None
    if pv_golden is not None and wt_golden is not None:
        for spec, r in zip(RUNS, runs):
            # PV 源配置映射（MG 固定面 §1.2：非 shading Run = 源 healthy；
            # shading Run = 源 shading_closed_loop，ΔG=300 降幅透传）
            pv_ref_key = ("shading_closed_loop" if spec["family"] == FAMILY_SHADING
                          else "healthy")
            ref = pv_golden["runs"][pv_ref_key]
            d_pv = max(abs(a - b) for a, b in
                       zip(r["series"]["P_pv_kW"], ref["series"]["P_pv_true_kW"]))
            bit_pv = r["scalars"]["E_pv_kWh"] == ref["scalars"]["E_pv_true_kWh"]
            src_ok = src_ok and d_pv <= 1e-12 and bit_pv
            src_detail.append("pv/%s d=%.2e,bit=%d" % (pv_ref_key, d_pv, bit_pv))
            # WT 源配置映射（非 gust Run = 源 healthy；gust Run = 源 gust_closed_loop）
            wt_ref_key = "gust_closed_loop" if spec["family"] == FAMILY_GUST else "healthy"
            ref = wt_golden["runs"][wt_ref_key]
            d_wt = max(abs(a - b) for a, b in
                       zip(r["series"]["P_wt_kW"], ref["series"]["P_wt_true_kW"]))
            bit_wt = r["scalars"]["E_wt_kWh"] == ref["scalars"]["E_wt_true_kWh"]
            src_ok = src_ok and d_wt <= 1e-12 and bit_wt
            src_detail.append("wt/%s d=%.2e,bit=%d" % (wt_ref_key, d_wt, bit_wt))
    rec("MS-3-reuse-audit", src_ok, "; ".join(src_detail) if src_detail else "n/a",
        "source-channel series <=1e-12 vs pv001_v1/wt001_v1 golden; E_pv/E_wt "
        "scalars bitwise equal",
        "reuse delegation audit (spec 4 item 3 MS-3 / B-2 strong form): emit/verify "
        "dual-side hard condition; source change -> mismatch -> emit/verify refuse")

    # MS-4 健康局不变量（规格 §3.4 健康局 H）：P_pv ≡ 10（逐位）、P_wt ≈ 10（±1e-9，
    # WT L0b 数值轨）、P_bess ≡ 5、P_grid ≈ 5、P_served ≡ 30、shed=dump ≡ 0（逐位）、
    # island_state ≡ 0、SOC 线性（5 kW 恒功率分段解析）、SOC_err ≡ 0（逐位）。
    h = by_key["healthy"]
    s_h, sc_h = h["series"], h["scalars"]
    dev_wt = max(abs(v - WT_HEALTHY_KW) for v in s_h["P_wt_kW"])
    dev_grid = max(abs(v - 5.0) for v in s_h["P_grid_true_kW"])
    lin_dev = max(abs(s_h["SOC_true_pct"][i] - (SOC0_PCT - 500.0 * t[i] / 144000.0))
                  for i in range(N_SAMPLES))
    ok4 = (all(v == PV_HEALTHY_KW for v in s_h["P_pv_kW"])
           and dev_wt <= 1e-9
           and all(v == P_SCHED_KW for v in s_h["P_bess_kW"])
           and dev_grid <= 1e-9
           and all(v == LOAD_KW for v in s_h["P_load_demand_kW"])
           and all(v == LOAD_KW for v in s_h["P_load_served_kW"])
           and all(v == 0.0 for v in s_h["P_shed_kW"])
           and all(v == 0.0 for v in s_h["P_dump_kW"])
           and all(v == 0.0 for v in s_h["island_state"])
           and all(v == 0.0 for v in s_h["SOC_err_pp"])
           and lin_dev <= 1e-9
           and abs(sc_h["SOC_true_end_pct"] - (SOC0_PCT - 100.0 * 300.0 / 144000.0)) <= 1e-9)
    rec("MS-4-healthy-invariants", ok4,
        "P_pv==10(bitwise), maxdP_wt=%.3e, P_bess==5(bitwise), maxdP_grid=%.3e, "
        "served==30, shed=dump==0(bitwise), island==0, maxdSOC_lin=%.3e, "
        "SOC_err==0(bitwise)" % (dev_wt, dev_grid, lin_dev),
        "PV/BESS/grid-facing constants bitwise; WT-numerical channels <=1e-9; "
        "SOC linear <=1e-9; SOC(60) = 60 - 100*300/144000",
        "healthy baseline H (spec 3.4): grid-connected balance, scheduled BESS, "
        "no shed/dump, linear SOC ledger")

    # MS-5 两模式逐位等价（<=1e-15；MG 四族全为物理输入，monitor Run 不重复入 golden）
    worst5 = 0.0
    scalars5 = True
    for spec in RUNS:
        mon = simulate_run(dict(spec, feedback_mode="monitor"))
        cl = by_key[spec["key"]]
        for sid in SERIES_IDS:
            for va, vb in zip(cl["series"][sid], mon["series"][sid]):
                if va is None and vb is None:
                    continue
                if (va is None) != (vb is None):
                    worst5 = float("inf")
                    continue
                worst5 = max(worst5, abs(va - vb))
        for k in REGISTERED_SCALARS:
            if cl["scalars"][k] != mon["scalars"][k]:
                scalars5 = False
    ok5 = worst5 <= 1e-15 and scalars5
    rec("MS-5-mode-equivalence", ok5, "%.3e (series), scalars_bitwise=%s"
        % (worst5, scalars5), "<=1e-15",
        "all 5 runs closed_loop vs monitor bitwise-identical (physical inputs; "
        "monitor runs not duplicated into golden)")

    # MS-6 孤岛相位不变量（规格 §3.3 E）：岛窗 P_grid ≡ 0（逐位）、P_bess == clamp(chase)
    # （逐点重算）、shed/dump 非负、island_state == 1；重连恢复计划值 5（逐位）与
    # island_state == 0；脱离前计划值 5；岛窗 shed ≈ 名义 2（<=1e-6，WT wiggle 残余）。
    isl = by_key["island_reconnect"]
    s_i = isl["series"]
    shed_nom = run_structure(FAMILY_ISLAND, True, None, T_CLEAR_GOLDEN_S)["shed"][1][2]
    ok6 = True
    for ii in range(0, I_F):
        if s_i["P_bess_kW"][ii] != P_SCHED_KW or s_i["island_state"][ii] != 0.0:
            ok6 = False
    for ii in range(I_F, i_clear):
        if s_i["P_grid_true_kW"][ii] != 0.0 or s_i["P_grid_meas_kW"][ii] != 0.0:
            ok6 = False
        chase = s_i["P_bess_chase_kW"][ii]
        if s_i["P_bess_kW"][ii] != min(max(chase, -P_CLAMP_KW), P_CLAMP_KW):
            ok6 = False
        if s_i["P_shed_kW"][ii] < 0.0 or s_i["P_dump_kW"][ii] < 0.0:
            ok6 = False
        if abs(s_i["P_shed_kW"][ii] - shed_nom) > 1e-6:
            ok6 = False
        if s_i["island_state"][ii] != 1.0:
            ok6 = False
    for ii in range(i_clear, N_SAMPLES):
        if s_i["P_bess_kW"][ii] != P_SCHED_KW or s_i["island_state"][ii] != 0.0:
            ok6 = False
        if abs(s_i["P_grid_true_kW"][ii] - 5.0) > 1e-6:
            ok6 = False
    ok6 = ok6 and s_i["P_bess_chase_kW"][I_F - 1] is None \
        and s_i["P_bess_chase_kW"][i_clear] is None
    rec("MS-6-island-phase-invariants", ok6,
        "island window: P_grid==0(bitwise), P_bess==clamp(chase)(bitwise), "
        "shed/dump>=0, shed==%.1f+-1e-6, state==1; reconnect: P_bess==5(bitwise), "
        "state==0, P_grid->5; chase null outside window" % shed_nom,
        "EQ-MG-4/5 phase invariants over 601 points (clamp 8 kW, shed 2 kW nominal)",
        "island reconfiguration phases: pre/scheduled, islanded/clamped, "
        "reconnected/rescheduled")

    # MS-7 锚点全表复算（规格 §3.1–3.3）+ 分段常值断言（EQ-MG-7 前提；前提失效守卫：
    # 未来形态变更致 P_bess 时变即本断言 fail -> emit 拒绝写盘——WT WS-8 同款纪律）
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def idx(tt):
        return int(round(tt / DT_S))

    a = by_key["healthy"]
    b = by_key["load_step_closed_loop"]
    c = by_key["pv_shading_closed_loop"]
    d = by_key["wt_gust_closed_loop"]
    e = by_key["island_reconnect"]
    s_a, sc_a = a["series"], a["scalars"]
    s_b, sc_b = b["series"], b["scalars"]
    s_c, sc_c = c["series"], c["scalars"]
    s_d, sc_d = d["series"], d["scalars"]
    s_e, sc_e = e["series"], e["scalars"]

    # §3.1 场景 A：healthy（baseline 并网）
    chk("A.P_pv_60", s_a["P_pv_kW"][-1], 10.0, 0.05)
    chk("A.P_wt_60", s_a["P_wt_kW"][-1], 10.0, 0.05)
    chk("A.P_bess_60", s_a["P_bess_kW"][-1], 5.0, 0.05)
    chk("A.P_grid_60", s_a["P_grid_true_kW"][-1], 5.0, 0.05)
    chk("A.P_served_60", s_a["P_load_served_kW"][-1], 30.0, 0.05)
    chk("A.max_abs_shed", max(abs(v) for v in s_a["P_shed_kW"]), 0.0, 1e-12)
    chk("A.max_abs_dump", max(abs(v) for v in s_a["P_dump_kW"]), 0.0, 1e-12)
    chk("A.SOC_60", sc_a["SOC_true_end_pct"], 59.7916667, 1e-4)
    chk("A.E_pv", sc_a["E_pv_kWh"], 0.1666667, 0.0005)
    chk("A.E_wt", sc_a["E_wt_kWh"], 0.1666667, 0.0005)
    chk("A.E_bess", sc_a["E_bess_kWh"], 0.0833333, 0.0005)
    chk("A.E_grid", sc_a["E_grid_kWh"], 0.0833333, 0.0005)
    chk("A.E_served", sc_a["E_load_served_kWh"], 0.5, 0.0005)
    # §3.1 场景 B：load_step +10 @20（并网）
    chk("B.P_grid_19p9", s_b["P_grid_true_kW"][idx(19.9)], 5.0, 0.05)
    chk("B.P_grid_20post", s_b["P_grid_true_kW"][I_F], 15.0, 0.05)
    chk("B.P_grid_60", s_b["P_grid_true_kW"][-1], 15.0, 0.05)
    chk("B.P_served_60", s_b["P_load_served_kW"][-1], 40.0, 0.05)
    chk("B.E_grid", sc_b["E_grid_kWh"], 0.1944444, 0.0005)
    chk("B.E_served", sc_b["E_load_served_kWh"], 0.6111111, 0.0005)
    chk("B.E_demand", sc_b["E_load_demand_kWh"], 0.6111111, 0.0005)
    chk("B.SOC_60", sc_b["SOC_true_end_pct"], 59.7916667, 1e-4)
    # §3.2 场景 C：pv_shading_link −300 @20（并网）
    chk("C.P_pv_20post", s_c["P_pv_kW"][I_F], 10.000000, 0.001)
    chk("C.P_pv_20p1", s_c["P_pv_kW"][idx(20.1)], 9.714512, 0.001)
    chk("C.P_pv_21", s_c["P_pv_kW"][idx(21.0)], 8.103638, 0.001)
    chk("C.P_pv_60", s_c["P_pv_kW"][-1], 7.000000, 0.001)
    chk("C.P_grid_21", s_c["P_grid_true_kW"][idx(21.0)], 6.896362, 0.05)
    chk("C.P_grid_26", s_c["P_grid_true_kW"][idx(26.0)], 7.992564, 0.05)
    chk("C.P_grid_60", s_c["P_grid_true_kW"][-1], 8.000000, 0.05)
    chk("C.E_pv", sc_c["E_pv_kWh"], 0.1341667, 0.0005)
    chk("C.E_grid", sc_c["E_grid_kWh"], 0.1158333, 0.0005)
    chk("C.SOC_60", sc_c["SOC_true_end_pct"], 59.7916667, 1e-4)
    # §3.2 场景 D：wt_gust_link +2 @20（并网）
    chk("D.P_wt_20post", s_d["P_wt_kW"][I_F], 10.000000, 0.05)
    chk("D.P_wt_21", s_d["P_wt_kW"][idx(21.0)], 10.676732, 0.05)
    chk("D.P_wt_26", s_d["P_wt_kW"][idx(26.0)], 14.935791, 0.05)
    chk("D.P_wt_60", s_d["P_wt_kW"][-1], 15.000000, 0.05)
    chk("D.P_grid_60", s_d["P_grid_true_kW"][-1], 0.0, 1e-9)
    chk("D.E_wt", sc_d["E_wt_kWh"], 0.218959, 0.0005)
    chk("D.E_grid", sc_d["E_grid_kWh"], 0.031041, 0.0005)
    # §3.3 场景 E：island_event @20（t_clear=35）——脱离/重连三相
    chk("E.island_19p9", s_e["island_state"][idx(19.9)], 0.0, 0.0)
    chk("E.island_20post", s_e["island_state"][I_F], 1.0, 0.0)
    chk("E.island_34p9", s_e["island_state"][i_clear - 1], 1.0, 0.0)
    chk("E.island_35post", s_e["island_state"][i_clear], 0.0, 0.0)
    chk("E.P_grid_19p9", s_e["P_grid_true_kW"][idx(19.9)], 5.0, 0.05)
    chk("E.P_grid_20post", s_e["P_grid_true_kW"][I_F], 0.0, 0.05)
    chk("E.P_grid_34p9", s_e["P_grid_true_kW"][i_clear - 1], 0.0, 0.05)
    chk("E.P_grid_35post", s_e["P_grid_true_kW"][i_clear], 5.0, 0.05)
    chk("E.P_bess_19p9", s_e["P_bess_kW"][idx(19.9)], 5.0, 0.05)
    chk("E.P_bess_20post", s_e["P_bess_kW"][I_F], 8.0, 0.05)
    chk("E.P_bess_34p9", s_e["P_bess_kW"][i_clear - 1], 8.0, 0.05)
    chk("E.P_bess_35post", s_e["P_bess_kW"][i_clear], 5.0, 0.05)
    chk("E.chase_20post", s_e["P_bess_chase_kW"][I_F], 10.000000, 0.05)
    chk("E.shed_20post", s_e["P_shed_kW"][I_F], 2.000000, 0.05)
    chk("E.P_served_21p5", s_e["P_load_served_kW"][idx(21.5)], 28.000000, 0.05)
    chk("E.SOC_60", sc_e["SOC_true_end_pct"], 59.7604167, 1e-4)
    chk("E.E_bess", sc_e["E_bess_kWh"], 0.0958333, 0.0005)
    chk("E.E_grid", sc_e["E_grid_kWh"], 0.0625, 0.0005)
    chk("E.E_served", sc_e["E_load_served_kWh"], 0.4916667, 0.0005)
    chk("E.E_shed", sc_e["E_shed_kWh"], 0.0083333, 0.0005)
    chk("E.E_demand", sc_e["E_load_demand_kWh"], 0.5, 0.0005)
    chk("E.max_abs_dump_all",
        max(abs(v) for r2 in runs for v in r2["series"]["P_dump_kW"]), 0.0, 1e-12)

    # 分段常值断言：P_bess/load 序列与相位段表逐位一致（漂移 0.00e+00）；
    # shed/dump 序列与段表名义值 <=1e-6（WT ±1e-9 wiggle 残余，≪ 锚点 ±0.05）。
    pw_ok = True
    pw_drift_bess = 0.0
    pw_drift_shed = 0.0
    for spec, r in zip(RUNS, runs):
        st = run_structure(spec["family"], spec["faulted"], spec.get("magnitude"),
                           spec.get("t_clear_s"))
        for ii in range(N_SAMPLES):
            exp_b = _seg_value_at(st["bess"], t[ii])
            got_b = r["series"]["P_bess_kW"][ii]
            pw_drift_bess = max(pw_drift_bess, abs(got_b - exp_b))
            if got_b != exp_b:
                pw_ok = False
            if r["series"]["P_load_demand_kW"][ii] != _seg_value_at(st["load"], t[ii]):
                pw_ok = False
            d_shed = abs(r["series"]["P_shed_kW"][ii] - _seg_value_at(st["shed"], t[ii]))
            pw_drift_shed = max(pw_drift_shed, d_shed)
            if d_shed > 1e-6:
                pw_ok = False
            if abs(r["series"]["P_dump_kW"][ii] - _seg_value_at(st["dump"], t[ii])) > 1e-6:
                pw_ok = False

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    ok7 = (not fails) and pw_ok
    obs7 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs7 += "; FAIL: " + ",".join(fails)
    obs7 += "; piecewise-const: maxdP_bess=%.3e kW, maxdShed=%.3e kW" \
        % (pw_drift_bess, pw_drift_shed)
    rec("MS-7-anchors-piecewise-const", ok7, obs7,
        "spec 3.1/3.2/3.3 anchor table with per-row tolerances; P_bess/load "
        "piecewise-constant vs phase table bitwise (drift 0.00e+00), shed/dump <=1e-6",
        "anchor recompute + EQ-MG-7 premise guard: P_bess time-variation (future "
        "form change) fails this check -> emit refuses to write (WS-8 discipline)")

    # MS-8 无 NaN/Inf + 包络抽查（§4 项 3：P_grid ∈ [−33,56]、shed ∈ [0,37]、
    # dump ∈ [0,12]——参数域叉积包络 §3.5）+ 分段常值前提失效守卫登记
    #（守卫本体 = MS-7 分段常值断言，fail -> emit exit 2）。
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is not None and not math.isfinite(v):
                    ok8 = False
    for r in runs:
        for v in r["series"]["P_grid_true_kW"]:
            if not (-33.0 <= v <= 56.0):
                ok8 = False
        for v in r["series"]["P_shed_kW"]:
            if not (0.0 <= v <= 37.0):
                ok8 = False
        for v in r["series"]["P_dump_kW"]:
            if not (0.0 <= v <= 12.0):
                ok8 = False
    rec("MS-8-finite-envelope", ok8,
        "5x19x601 finite (nulls only in P_bess_chase_kW); P_grid in [-33,56] kW, "
        "P_shed in [0,37] kW, P_dump in [0,12] kW",
        "all finite; parameter-domain envelope per spec 3.5 (A-3 revised scope)",
        "no NaN/Inf/null outside the event-domain null column; envelope spot check; "
        "piecewise-const premise guard carried by MS-7 assertion (fail -> emit exit 2)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
TOLERANCES = {
    "gate": {
        "tier": "T-A",
        # 规格 §4 项 6 gate 九键原样（MG001_G2B_SPEC_APPROVED；量级预案非终值，终值
        # emit 冻结；若跨实现散差超限 -> 降 T-B 并附 convergence 块，双向预案）：
        "E_kWh": 1e-9, "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15,
        "SOC_pp": 1e-9, "r_true_kW": 1e-12, "t_s": 1e-9,
        # I_A 两键必带（A-1 修订，P1，修 gate 不修码）：verify_golden T-A 路径直接索引
        # ——V-05 关键点（scripts/verify_golden.py:340 close_within(fv, gv,
        # tol["I_A_rtol"], tol["I_A_atol"])）+ 标量 metric 兜底支路（:251）+ 事件容差
        # 缺省键（:426 cfg.get("event_tol", "I_A_atol")）；四 T-A golden 先例全带键。
        "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
        # SOC_pp 键必须存在：T-A series_limit 对 SOC_* 系列走 tol["SOC_pp"] 支路
        # （verify_golden.py:214-215——MG 有 SOC 系列故必须带）。
    },
}


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
        "units": {"P": "kW", "E": "kWh", "t": "s", "V": "V", "soc": "%",
                  "pp": "pp", "dimensionless": "-"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T0_S,
            "t_clear_s": T_CLEAR_GOLDEN_S,
            "load_kW": LOAD_KW, "p_sched_kW": P_SCHED_KW, "soc0_pct": SOC0_PCT,
            "e_bat_kWh": E_BAT_KWH, "v_bus_V": V_BUS_V, "p_clamp_kW": P_CLAMP_KW,
            "load_step_dP_kW": LOAD_STEP_DP_KW, "shading_dg_W_m2": SHADING_DG_W_M2,
            "gust_dv_ms": GUST_DV_MS,
            "pv_healthy_kW": PV_HEALTHY_KW, "wt_healthy_kW": WT_HEALTHY_KW,
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "聚合全闭式 + 源物理复用委托（EQ-MG-2：pv001_oracle"
                    "_pv_stepped_series/pv_energy_integrals + wt001_oracle._simulate "
                    "参数化入口，不重写源物理；BESS 能量面内联=FL-001 已批规格电气面）。"
                    "分段常值前提（Q1(b)：island Run 源恒健康 ⇒ chase 常值 ⇒ P_bess "
                    "clamp 分段常值）由 MS-7 逐位断言承载，前提失效 emit 拒绝写盘。"
                    "SOC/能量为事件感知分段解析积分（EQ-MG-7/8），E_grid 由恒等导出。"
                    "P_bess_chase_kW 为唯一事件域 null 列（岛窗外 null）；island Run "
                    "双事件快照（脱离 EV-001 @20 + 重连 EV-002 @35，各 pre/post 一对"
                    "——V-09 首事件面 + gt001 actuator_clear 349/350 先例）。四族全为"
                    "物理输入，monitor 轨与闭环逐位同解（MS-5）、不重复入 golden",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0,
                     "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/端点/极值）；r_true/r_meas "
                        "恒等 0 由 MS-2 与序列面承载；P_shed/P_dump 为重整记账项"
                        "（理想卸载/倾卸抽象，不是能量损失）；E_grid 由 EQ-MG-8 恒等导出",
    }


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom，两行实现）：本 oracle 源文件
    自身字节的 SHA-256（注：被 import 的源 oracle 文件哈希不在此面——由 MS-3 逐位
    审计补齐，见模块 docstring 独立性声明 4）。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar；先跑 MS-1…MS-8，失败 exit 2 不写盘）
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
        tool="tools/oracle/mg001_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/mg001_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def main(argv):
    # GBK 控制台兼容（oracle_base.py:729-733 先例）：统一 UTF-8 输出兜底；
    # 自检记录面字符串另保持纯 ASCII（无 ²/−/≤ 等非 GBK 符号）
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
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
    # 无参默认 = 自检摘要（本 oracle 入口即自检面：MS-1…MS-8 全过 exit 0 / 失败
    # exit 2；--self-check 为同面显式别名）
    ok, checks = self_check()
    print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=True, indent=2))
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
