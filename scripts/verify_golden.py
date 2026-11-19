# -*- coding: utf-8 -*-
"""verify_golden.py — 一键校验：重跑独立 oracle → 按 golden 内置容差比对（MODEL_VALIDATION_SPEC §3.6）。

用法：
  python scripts/verify_golden.py                # 默认五 golden：fl001（v1 off 默认轨）+
                                                 #   fl001_l1（v2 thermal 轨）+ fc001_l1
                                                 #   （v2 电化学轨）+ fl001_cap（v3 容量轨）+
                                                 #   gt001_comb（v4 燃烧延迟深化轨）
                                                 #   顺序验证，全部通过才 exit 0（DEC-6
                                                 #   步①并入口径，FLTH §7.3「优先并入现有
                                                 #   步」；B-5 定案尾追加 fc001_l1——
                                                 #   CHG-20261113-01；Q6 定案尾追加
                                                 #   fl001_cap——CHG-20261114-01 批准链；
                                                 #   Q7 定案尾追加 gt001_comb——
                                                 #   CHG-20261114-07 批准链）
  python scripts/verify_golden.py fl001          # 仅 fl001（显式参数不扩面，仍只验 fl001_v1）
  python scripts/verify_golden.py fl001_l1       # FL-001 thermal 轨（FLTH-G2b-03 / CHG-20261107-01）
  python scripts/verify_golden.py fl001_cap      # FL-001 容量/内阻二阶效应轨（FLCAP-G2b-03 /
                                                 #   CHG-20261114-01 批准链；golden fl001_v3，
                                                 #   tier T-B，T-B `_kWh` 分支 = A-4/B-1
                                                 #   显式硬项）
  python scripts/verify_golden.py fc001          # FC-001（P1-06 / G2b-lite）
  python scripts/verify_golden.py fc001_l1       # FC-001 电化学轨（FCECH-G2b-03 / CHG-20261113-01
                                                 #   批准链；golden fc001_v2，tier T-B，
                                                 #   T-B `_V` 分支 = B-4 定案显式硬项）
  python scripts/verify_golden.py gt001          # GT-001（V3-31 / G2b v1.1；GTL1-G2b-03 起
                                                 #  重指向 gt001_v3 L1 thermo 轨，tier T-B）
  python scripts/verify_golden.py gt001_comb     # GT-001 燃烧延迟深化轨 thermo_comb（GTCMB-G2b-03 /
                                                 #   CHG-20261114-07 批准链；golden gt001_v4，
                                                 #   tier T-B，Q10 零新信号——27 列同集，
                                                 #   T-B 分派路由全既有支零缺口）
  python scripts/verify_golden.py pv001          # PV-001（PV-G2b-03 / v0.7，CHG-20261104-10 批准链）
  python scripts/verify_golden.py wt001          # WT-001（WT-G2b-03 / v0.8，CHG-20261107-01 批准链）
  python scripts/verify_golden.py mg001          # MG-001（MG-G2b-03 / V110 W4，CHG-20261110-01 批准链）
  python scripts/verify_golden.py gt001_fmu      # GT-001 L1-FMU 镜像轨 thermo（GTFMU-G2b-03 /
                                                 #   CHG-20261119-01 批准链；golden gt001_fmu_v1，
                                                 #   tier T-B，27 列同集零新增 gate 分支）
  python scripts/verify_golden.py gt001_fmu_comb # GT-001 L1-FMU 镜像轨 comb 深化（Q2(a)；golden
                                                 #   gt001_fmu_comb_v1，同 oracle 单文件）
  python scripts/verify_golden.py fc001_fmu      # FC-001 5 态 L1-FMU 第三轨（FCFMU-G2b-03 /
                                                 #   CHG-20261115-10 批准链；golden fc001_fmu_v1，
                                                 #   tier T-B，`_mL`/dim 分支 = Q15 定案显式硬项）
  python scripts/verify_golden.py --json out.json

退出码：0=全部通过；1=数值/容差不通过（或 golden/oracle 缺失损坏）；2=oracle 内部自检失败。
（默认双 golden 运行时任一模型不通过即非零退出：自检失败优先报 2。）

校验项（各模型同构）：
  V-01 golden 存在且可解析；V-02 sidecar SHA-256 一致；
  V-03 generated_by.oracle_source_sha256 == 当前 oracle 源码 SHA-256；
  V-03b approval 批准摘要一致（去除 generated_by/approval 后内容摘要）；
  V-04 oracle 自检全过（fl001 SC-1…9 / fl001_l1 FL-1…8 / fl001_cap FCAP-1…8 /
       fc001 SC-1…10 / fc001_l1 FEC-1…8 / gt001_l1 GL-1…8 / gt001_comb GCMB-1…9 /
       pv001 PS-1…7 / wt001 WS-1…8 / mg001 MS-1…8 / fc001_fmu FMU-1…7 /
       gt001_fmu(_comb) GTFMU-1…7）；
  V-05 关键点（19.9/21.5/26.0/60.0 s 的 true/meas 对）——tier 分派：T-A rtol 1e-12
       （I_A 键，既有路径零改动）/ T-B 按 series_limit 序列容差键（GTL1-G2b-03 参数化）；
  V-06 标量（E/SOC）gate 容差（±1e-6 kWh / ±1e-5 pp）；
  V-07 601 点全精度序列逐点比对；V-08 指标；V-09 事件 pre/post。

tier 分派（GTL1-G2b-03，GTL1_G2B_SPEC_APPROVED §4 项 7「参数化与注册行同轮落地」）：
  golden.tolerances.gate.tier == "T-B" 时，V-05/series_limit/metric_within 走 T-B 键面
  （f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_*/E_kWh/SOC_pp/r_true_kW/t_s）；
  其余（T-A 既有模型 + 默认路径）行为逐字节不变。
  FLTH-G2b-03 三分支补全（B-3 裁定采纳，CHG-20261107-01；FL001_THERMAL_G2B_SPEC_APPROVED
  §4 项 6/7）：① endswith("_A") → I_A_atol/I_A_rtol 新分支，置于 _Hz 判别之前（fl001_v2
  的 I_bat_*_A/bias_A/I_bat_cap_A 旧路径落缺省 f_Hz_atol 键而该 gate 无此键 → KeyError）；
  ② "r_true"/"r_meas" 判别前置于 `_kW` 后缀判别，解除现状遮蔽（r_true_kW/r_meas_kW 路由
  专键——gt001_v3 六 Run 散差实测 0.0 ≪ r_true_kW=1e-9（2026-11-07 探针）后统一前移）。

本脚本不 import 产品 engine；golden 由 oracle 只读生成。
"""

import hashlib
import json
import math
import os
import platform
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ORACLE_DIR = os.path.join(ROOT, "tools", "oracle")

sys.path.insert(0, ORACLE_DIR)
import fl001_oracle  # noqa: E402
import fl001_l1_oracle  # noqa: E402  FL-001 L1 thermal 轨（FLTH-G2b-03 / CHG-20261107-01 批准链；
                        #   FL001_THERMAL_G2B_SPEC_APPROVED §4 项 7——注册行为显式工作面）
import fl001_cap_oracle  # noqa: E402  FL-001 L1 capacity 轨（FLCAP-G2b-03 / CHG-20261114-01 批准链；
                        #   FL001_CAPACITY_G2B_SPEC_APPROVED §4 项 8——注册行为显式工作面；
                        #   T-B `_kWh` 分支 = A-4/B-1 显式硬项）
import fc001_oracle  # noqa: E402
import fc001_l1_oracle  # noqa: E402  FC-001 L1 电化学轨（FCECH-G2b-03 / CHG-20261113-01 批准链；
                        #   FC001_ELECTROCHEM_G2B_SPEC_APPROVED §4 项 8——注册行为显式工作面）
import gt001_oracle  # noqa: E402  （swing/linear 冻结归档轨：verify_golden 注册面已重指向
                     #   gt001_l1_oracle；本 import 维持 oracle_base 契约探针与历史可比性）
import gt001_l1_oracle  # noqa: E402  GT-001 L1 thermo 轨（GTL1-G2b-03 / CHG-20261104-12 批准链）
import gt001_comb_oracle  # noqa: E402  GT-001 L1 燃烧延迟深化轨 thermo_comb（GTCMB-G2b-03 /
                         #   CHG-20261114-07 批准链；GT001_COMBUSTION_G2B_SPEC_APPROVED
                         #   §4 项 8 Q7 定案——注册行为显式工作面）
import pv001_oracle  # noqa: E402  PV-001（PV-G2b-03 / CHG-20261104-10 批准链；PV001_G2B_SPEC_APPROVED §4 项 7）
import wt001_oracle  # noqa: E402  WT-001（WT-G2b-03 / CHG-20261107-01 批准链；WT001_G2B_SPEC_APPROVED §4 项 7）
import mg001_oracle  # noqa: E402  MG-001（MG-G2b-03 / V110 W4；CHG-20261110-01 批准链；
                     #   MG001_G2B_SPEC_APPROVED §4 项 7——注册行追加不改参数化逻辑，
                     #   T-A 路径零改动）
import fc001_fmu_oracle  # noqa: E402  FC-001 5 态 L1-FMU 第三轨（FCFMU-G2b-03 /
                         #   CHG-20261115-10 批准链；FC001_FMU_G2B_SPEC_APPROVED v1.0
                         #   §4 项 9——注册行为显式工作面；tier T-B；`_mL`/dim 分支 =
                         #   Q15 定案显式硬项）
import gt001_fmu_oracle  # noqa: E402  GT-001 L1-FMU 镜像轨（GTFMU-G2b-03 / CHG-20261119-01
                         #   批准链；GT001_FMU_G2B_SPEC_APPROVED v1.0 §4 项 9——双 golden
                         #   gt001_fmu_v1 + gt001_fmu_comb_v1 单 oracle；tier T-B；
                         #   27 列同集零新增 gate 分支）

MODELS = {
    "fl001": {
        "oracle": fl001_oracle,
        "i_true": "I_bat_true_A", "i_meas": "I_bat_meas_A",
        "scalars": [
            ("E_bat_true_kWh", "kWh"), ("E_gen_true_kWh", "kWh"),
            ("E_load_served_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
    "fl001_l1": {
        # FLTH-G2b-03（CHG-20261107-01）：FL-001 thermal 轨 golden fl001_v2（4 Run 全部
        # thermal_model=on；oracle=fl001_l1_oracle 出生接入 oracle_base，FL 规格 §4 项 7）。
        # 「fl001 条目重指向」不适用（FL 规格 §4 项 7）：MODELS["fl001"] 继续验 fl001_v1
        # （off 默认轨）零改动，thermal 轨走本条目（与 GT 重指向的结构性差异随 §2.0 登记）。
        # scalars 按 fl001_v2.json 实际键面全量注册（22 项）；非 kWh 类在 V-06 走 SOC_pp 支。
        "oracle": fl001_l1_oracle,
        "golden_file": "fl001_v2.json",
        "i_true": "I_bat_true_A", "i_meas": "I_bat_meas_A",
        "event_tol": "I_A_atol",  # 事件快照相位变量 = I_bat_meas_A（A 域；gate 含 I_A_atol）
        "scalars": [
            ("E_bat_true_kWh", "kWh"), ("E_bat_meas_kWh", "kWh"),
            ("E_gen_true_kWh", "kWh"), ("E_load_served_kWh", "kWh"),
            ("E_loss_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("I_true_19p9_A", "A"), ("I_meas_19p9_A", "A"),
            ("I_true_20post_A", "A"), ("I_meas_20post_A", "A"),
            ("I_true_21p5_A", "A"), ("I_true_26_A", "A"), ("I_true_60_A", "A"),
            ("t_19p9_s", "s"),
            ("P_bat_true_21p5_kW", "kW"), ("P_gen_true_21p5_kW", "kW"),
            ("max_abs_r_true_kW", "kW"), ("max_abs_r_meas_kW", "kW"),
            ("int_I_true_60s_As", "As"), ("T_bat_end_K", "K"),
        ],
    },
    "fl001_cap": {
        # FLCAP-G2b-03（CHG-20261114-01）：FL-001 容量/内阻二阶效应轨 golden fl001_v3
        # （4 Run 全部 thermal_model=on + capacity_model=on；oracle=fl001_cap_oracle 出生
        # 接入 oracle_base，FL001_CAPACITY_G2B_SPEC_APPROVED §4 项 8——「fl001 条目重指向」
        # 不适用（FLTH §4 项 7 同构）：MODELS["fl001"]/["fl001_l1"] 继续验 fl001_v1/v2
        # 零改动，容量轨走本条目）。i_true/i_meas 沿 fl001/fl001_l1 现行映射；event_tol
        # 沿 fl001_l1 现行 I_A_atol；scalars 按 fl001_v3.json 实际键面全量注册（23 项 =
        # fl001_v2 镜像 22 键 + E_cap_end_kWh 新键）；非 kWh 类在 V-06 走 SOC_pp 支
        # （fl001_l1 T_bat_end_K 现行先例）；E_cap_kWh 序列经 T-B `_kWh` 分支路由
        # E_kWh 容差（A-4/B-1 显式硬项——B-1 实测勘正：`endswith("_kW")`=False，
        # 无 `_kWh` 分支时实落 f_Hz_atol 兜底键而本 gate 无该键 => KeyError）。
        "oracle": fl001_cap_oracle,
        "golden_file": "fl001_v3.json",
        "i_true": "I_bat_true_A", "i_meas": "I_bat_meas_A",
        "event_tol": "I_A_atol",  # 事件快照相位变量 = I_bat_meas_A（A 域；gate 含 I_A_atol）
        "scalars": [
            ("E_bat_true_kWh", "kWh"), ("E_bat_meas_kWh", "kWh"),
            ("E_gen_true_kWh", "kWh"), ("E_load_served_kWh", "kWh"),
            ("E_loss_kWh", "kWh"), ("E_cap_end_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("I_true_19p9_A", "A"), ("I_meas_19p9_A", "A"),
            ("I_true_20post_A", "A"), ("I_meas_20post_A", "A"),
            ("I_true_21p5_A", "A"), ("I_true_26_A", "A"), ("I_true_60_A", "A"),
            ("t_19p9_s", "s"),
            ("P_bat_true_21p5_kW", "kW"), ("P_gen_true_21p5_kW", "kW"),
            ("max_abs_r_true_kW", "kW"), ("max_abs_r_meas_kW", "kW"),
            ("int_I_true_60s_As", "As"), ("T_bat_end_K", "K"),
        ],
    },
    "fc001": {
        "oracle": fc001_oracle,
        "i_true": "I_fc_true_A", "i_meas": "I_fc_meas_A",
        "scalars": [
            ("E_fc_true_kWh", "kWh"), ("E_bat_true_kWh", "kWh"), ("E_bat_est_kWh", "kWh"),
            ("E_load_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
    "fc001_l1": {
        # FCECH-G2b-03（CHG-20261113-01）：FC-001 电化学轨 golden fc001_v2（5 Run 全部
        # electrochem_model=on；oracle=fc001_l1_oracle 出生接入 oracle_base，FC 规格 §4 项 8
        # ——「fc001 条目重指向」不适用（FLTH §4 项 7 同构）：MODELS["fc001"] 继续验
        # fc001_v1（off 默认轨）零改动，电化学轨走本条目）。scalars 按 fc001_v2.json 实际
        # 键面全量注册（17 项 = fc001_v1 镜像 14 键 + T_st_end_K/V_stack_end_V/
        # P_loss_stack_end_kW 三新键）；非 kWh 类在 V-06 走 SOC_pp 支（fl001_l1
        # T_bat_end_K 现行先例）；event_tol 沿 fc001 现行缺省 I_A_atol。
        "oracle": fc001_l1_oracle,
        "golden_file": "fc001_v2.json",
        "i_true": "I_fc_true_A", "i_meas": "I_fc_meas_A",
        "scalars": [
            ("E_fc_true_kWh", "kWh"), ("E_bat_true_kWh", "kWh"), ("E_bat_est_kWh", "kWh"),
            ("E_load_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("I_fc_true_20post_A", "A"), ("I_fc_meas_20post_A", "A"),
            ("I_fc_true_60_A", "A"), ("I_fc_true_26_A", "A"),
            ("max_abs_r_true_kW", "kW"), ("max_abs_r_meas_kW", "kW"),
            ("int_I_fc_60s_As", "As"),
            ("T_st_end_K", "K"), ("V_stack_end_V", "V"), ("P_loss_stack_end_kW", "kW"),
        ],
    },
    "fc001_fmu": {
        # FCFMU-G2b-03（CHG-20261115-10 批准链）：FC-001 5 态 L1-FMU 第三轨 golden
        # fc001_fmu_v1（5 Run 白名单全集，tier T-B；oracle=fc001_fmu_oracle 出生接入
        # oracle_base，FC001_FMU_G2B_SPEC_APPROVED v1.0 §4 项 9——新条目形态，
        # 「fc001 条目重指向」不适用（FLTH §4 项 7 同构）：MODELS["fc001"]/["fc001_l1"]
        # 继续验 fc001_v1/v2 零改动，FMU 轨走本条目）。i_true/i_meas = p_ca 真值/
        # 受染测量对（kPa 域，V-05 关键点 19.9/21.5/26.0/60.0 s）；event_tol =
        # p_kPa_atol（事件快照相位变量 p_ca_meas_kPa——kPa 域，gate 声明该键）；
        # scalars 按 fc001_fmu_v1.json 键面注册（6 项；非 kWh 类走 SOC_pp 支——
        # fl001_l1 T_bat_end_K 现行先例）；序列含三个 `_mL` 键与五个无量纲键——
        # T-B `_mL` 分支（V_mL_atol，插入点 = `_kPa` 后、r_true/r_meas 子串判别前
        # ——APPROVED §4 项 8/B-1 钉死）+ dim 支（dim_atol，`_kWh` 后）= Q15 定案
        # 显式硬项；r_meas_water_mL 的 kW 容差静默错型形态由 `_mL` 支前置修复
        # （评审 B P1——emit 轮既有键路由零变化证明：既有 golden 无 `_mL`/三尾缀 id）。
        "oracle": fc001_fmu_oracle,
        "golden_file": "fc001_fmu_v1.json",
        "i_true": "p_ca_true_kPa", "i_meas": "p_ca_meas_kPa",
        "event_tol": "p_kPa_atol",  # 事件快照相位变量 = p_ca_meas_kPa（kPa 域；gate 含 p_kPa_atol）
        "scalars": [
            ("E_gross_kWh", "kWh"), ("E_aux_kWh", "kWh"), ("E_net_kWh", "kWh"),
            ("theta_cap_end", "pp"), ("y_O2_end", "pp"), ("V_water_end_mL", "pp"),
        ],
    },
    "gt001": {
        # GTL1-G2b-03（CHG-20261104-12）：gt001 校验重指向 L1 thermo 轨 golden gt001_v3
        # （库内首个 T-B golden；oracle=gt001_l1_oracle 出生接入 oracle_base，规格 §4 项 7）。
        # gt001_v2/v1 字节冻结留档（Q3 冻结归档债，gt001_oracle.py 物理文件零触碰）：
        # 其 verify_golden 直验面随重指向让位于 engine-gt 双 golden 比对面
        # （linear→v1 / swing→v2 / thermo→v3，GTL1-G2b-04 面）+ oracle_base 契约探针。
        "oracle": gt001_l1_oracle,
        "golden_file": "gt001_v3.json",
        "i_true": "f_true_Hz", "i_meas": "n_meas_rpm",
        "event_tol": "n_rpm_atol",  # 事件快照相位变量 = n_meas_rpm（T-B gate 键面）
        "scalars": [
            ("E_source_kWh", "kWh"), ("E_bat_kWh", "kWh"), ("E_load_kWh", "kWh"),
            ("E_rotor_kWh", "kWh"), ("E_fuel_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("eta_cycle_end_pct", "%"),
        ],
    },
    "gt001_comb": {
        # GTCMB-G2b-03（CHG-20261114-07 批准链）：GT-001 L1 燃烧延迟深化轨 golden gt001_v4
        # （6 Run 全部 inertia_model=thermo_comb，tier T-B；oracle=gt001_comb_oracle 出生
        # 接入 oracle_base，GT001_COMBUSTION_G2B_SPEC_APPROVED §4 项 8 Q7 定案——新条目
        # 形态，「gt001 条目重指向」不适用：MODELS["gt001"] 重指向块继续验 gt001_v3
        # 零改动，深化轨走本条目）。i_true/i_meas/event_tol 沿 gt001 现行映射；
        # scalars 按 gt001_v4.json 键面镜像 gt001 现行 9 键（Q10 零新信号——27 列同集，
        # T-B 分派路由全既有支零缺口，FC `_V`/FL `_kWh` 先例同构审计随轮登记）。
        "oracle": gt001_comb_oracle,
        "golden_file": "gt001_v4.json",
        "i_true": "f_true_Hz", "i_meas": "n_meas_rpm",
        "event_tol": "n_rpm_atol",  # 事件快照相位变量 = n_meas_rpm（T-B gate 键面，gt001 同）
        "scalars": [
            ("E_source_kWh", "kWh"), ("E_bat_kWh", "kWh"), ("E_load_kWh", "kWh"),
            ("E_rotor_kWh", "kWh"), ("E_fuel_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("eta_cycle_end_pct", "%"),
        ],
    },
    "gt001_fmu": {
        # GTFMU-G2b-03（CHG-20261119-01 批准链）：GT-001 L1-FMU 镜像轨 golden gt001_fmu_v1
        # （thermo 组 6 Run，tier T-B；oracle=gt001_fmu_oracle 出生接入 oracle_base，
        # GT001_FMU_G2B_SPEC_APPROVED v1.0 §4 项 9——Q2(a) 双 golden 前者；Q1(B) FMU+host
        # 全系统镜像更新序）。i_true/i_meas/event_tol 沿 gt001 现行映射；scalars 九键镜像；
        # 27 列同集 ⇒ T-B 分派链全既有支零缺口（GTFMU 草案 §4 项 8 预登记 + 评审 B 复刻零缺口）。
        "oracle": gt001_fmu_oracle,
        "golden_file": "gt001_fmu_v1.json",
        "i_true": "f_true_Hz", "i_meas": "n_meas_rpm",
        "event_tol": "n_rpm_atol",
        "scalars": [
            ("E_source_kWh", "kWh"), ("E_bat_kWh", "kWh"), ("E_load_kWh", "kWh"),
            ("E_rotor_kWh", "kWh"), ("E_fuel_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("eta_cycle_end_pct", "%"),
        ],
    },
    "gt001_fmu_comb": {
        # GTFMU-G2b-03（CHG-20261119-01 批准链）：Q2(a) comb 深化镜像 golden
        # gt001_fmu_comb_v1（comb 组 6 Run，tier T-B；同 oracle 单文件双 Run 组——
        # inertia_model=thermo_comb；27 列同集零缺口同上）。
        "oracle": gt001_fmu_oracle,
        "golden_file": "gt001_fmu_comb_v1.json",
        "i_true": "f_true_Hz", "i_meas": "n_meas_rpm",
        "event_tol": "n_rpm_atol",
        "scalars": [
            ("E_source_kWh", "kWh"), ("E_bat_kWh", "kWh"), ("E_load_kWh", "kWh"),
            ("E_rotor_kWh", "kWh"), ("E_fuel_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
            ("eta_cycle_end_pct", "%"),
        ],
    },
    "pv001": {
        "oracle": pv001_oracle,
        "event_tol": "P_kW_atol",  # PV gate 无 I_A_atol：事件快照相位值按 P_kW_atol 判
        "i_true": "P_pv_true_kW", "i_meas": "P_pv_meas_kW",
        "scalars": [
            ("E_pv_true_kWh", "kWh"), ("E_pv_est_kWh", "kWh"), ("E_pv_err_kWh", "kWh"),
            ("E_grid_kWh", "kWh"), ("E_load_kWh", "kWh"),
        ],
    },
    "wt001": {
        # WT-G2b-03（CHG-20261107-01）：WT-001 风电系统 golden wt001_v1（5 Run，tier T-A
        # 同更新序逐算子复刻；oracle=wt001_oracle 出生接入 oracle_base，WT 规格 §4 项 7——
        # 注册行追加不改参数化逻辑，T-A 路径零改动）。
        "oracle": wt001_oracle,
        "golden_file": "wt001_v1.json",
        "i_true": "P_wt_true_kW", "i_meas": "P_wt_meas_kW",
        "event_tol": "P_kW_atol",  # WT gate 无电流相位量：事件快照相位值按 P_kW_atol 判（PV 同款）
        "scalars": [  # 能量账本五键（PV 能量账本同构；WT 规格 §4 项 7 提案键面）
            ("E_wt_true_kWh", "kWh"), ("E_wt_est_kWh", "kWh"), ("E_wt_err_kWh", "kWh"),
            ("E_grid_kWh", "kWh"), ("E_load_kWh", "kWh"),
        ],
    },
    "mg001": {
        # 第 34 步，MG-G2b-03，CHG-20261110-01 批准链：MG-001 微电网多源聚合 golden
        # mg001_v1（5 Run，tier T-A 聚合全闭式 + 源物理复用委托；oracle=mg001_oracle
        # 出生接入 oracle_base，MG001_G2B_SPEC_APPROVED §4 项 7——注册行追加不改
        # 参数化逻辑，T-A 路径零改动；既有六行与 T-A/T-B 分派逻辑零改动）。
        "oracle": mg001_oracle,
        "golden_file": "mg001_v1.json",
        "i_true": "P_grid_true_kW", "i_meas": "P_grid_meas_kW",
        "event_tol": "P_kW_atol",  # MG gate 无电流相位量：事件快照相位值按 P_kW_atol 判（PV/WT 同款）
        "scalars": [  # 能量账本八键 + SOC 三键（MG 规格 §4 项 7 提案 11 键）
            ("E_pv_kWh", "kWh"), ("E_wt_kWh", "kWh"), ("E_bess_kWh", "kWh"),
            ("E_grid_kWh", "kWh"), ("E_load_served_kWh", "kWh"), ("E_shed_kWh", "kWh"),
            ("E_dump_kWh", "kWh"), ("E_load_demand_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
}

# 默认（无参）运行的 golden 序列（DEC-6：run-g2 步①同一 python 调用内顺序验证，
# FLTH §7.3「优先并入现有步」口径；全部通过才 exit 0）。
# B-5 定案（FCECH-G2b-03 / CHG-20261113-01 批准链）：尾追加 "fc001_l1" —— 步① 无参调用
# 三 golden 顺序验证（fl001 → fl001_l1 → fc001_l1，FL 先例形态）；步① label「verify_golden
# fl001」自 V080 起滞后于 fl001_l1 并入（先例在案沿用不修——V120 DEC-5 同款维持登记），
# FC golden 挂载位置 = 本序列尾。
# v1.4.0 四 golden 顺序验证，FLCAP-G2b-03/Q6，CHG-20261114-01 批准链
# v1.6.0 五 golden 顺序验证，GTCMB-G2b-03/Q7，CHG-20261114-07 批准链（尾追加 gt001_comb
# ——GT-001 燃烧延迟深化轨 golden gt001_v4；步① 无参调用五 golden 顺序验证，
# FL/FC 先例形态；步① label 滞后说明沿 V120 DEC-5/V140 先例维持登记不修）
# v1.9.0 六 golden 顺序验证，FCFMU-G2b-03/Q7，CHG-20261115-10 批准链（尾追加 fc001_fmu
# ——FC-001 5 态 L1-FMU 第三轨 golden fc001_fmu_v1；步① 无参调用六 golden 顺序验证，
# FL/FC/GT 先例形态；步① label 滞后说明沿先例维持登记不修）
# v1.12.0 八 golden 顺序验证，GTFMU-G2b-03/Q9，CHG-20261119-01 批准链（尾追加 gt001_fmu +
# gt001_fmu_comb——GT-001 L1-FMU 镜像轨双 golden；步① 无参调用八 golden 顺序验证，
# 先例形态；步① label 滞后说明沿先例维持登记不修）
DEFAULT_MODELS = ["fl001", "fl001_l1", "fc001_l1", "fl001_cap", "gt001_comb", "fc001_fmu",
                  "gt001_fmu", "gt001_fmu_comb"]

KEY_POINTS = [19.9, 21.5, 26.0, 60.0]


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def close_within(observed, expected, rtol, atol):
    return abs(observed - expected) <= max(atol, rtol * abs(expected))


def _amax(arr):
    m = 0.0
    for v in arr:
        if isinstance(v, (int, float)) and math.isfinite(v) and abs(v) > m:
            m = abs(v)
    return m


def series_limit(sid, arr, tol):
    if sid == "t":
        return tol["t_s"]
    if tol.get("tier") == "T-B":
        # GTL1-G2b-03 T-B 分派（golden.tolerances.gate 驱动；量纲族键面见 golden
        # gt001_v3/fl001_v2 gate 块；T-A 既有路径不经过本分支，零改动）。
        # FLTH-G2b-03 三分支补全（B-3 裁定采纳，CHG-20261107-01；FL 规格 §4 项 6/7）：
        # ① endswith("_A") → I_A_atol/I_A_rtol 新分支，置于 _Hz 判别之前；
        # ② "r_true"/"r_meas" 判别前置于 `_kW` 后缀判别以解除现状遮蔽
        #   （旧序 r_true_kW/r_meas_kW 恒先命中 `_kW` 支走 P_kW 容差、专键成死支；
        #   gt001_v3 六 Run r_true_kW 散差实测 0.0 ≪ 专键 1e-9（2026-11-07 探针），
        #   按规格「统一前移」口径落地，未按 golden id 作用域限定）。
        if sid.endswith("_A"):
            return max(tol["I_A_atol"], tol["I_A_rtol"] * max(1.0, _amax(arr)))
        if sid.endswith("_Hz"):
            return tol["f_Hz_atol"]
        if sid.endswith("_rpm"):
            return tol["n_rpm_atol"]
        if sid.endswith("_K"):
            return tol["T_K_atol"]
        if sid.endswith("_kPa"):
            return tol["p_kPa_atol"]
        # FCFMU-G2b-03（CHG-20261115-10 批准链）：T-B 分派 `_mL` 分支新增（Q15 定案
        # 显式硬项，additive）。插入点显式钉死（APPROVED v1.0 §4 项 8/B-1）= 置于
        # `_kPa` 支后、`r_true`/`r_meas` 子串判别之前——同时正确路由三个 `_mL` 键
        # （V_water_store_true_mL / V_water_store_meas_mL / r_meas_water_mL）：
        # 无本支时前两键落 f_Hz_atol 兜底（gate 无该键 => KeyError）而
        # r_meas_water_mL 命中 r_meas 子串支走 kW 容差（静默量纲错型——评审 B P1）；
        # 本支同时修复两形态。仅当 gate 声明 V_mL_atol 键时激活——既有 golden 无
        # `_mL` 后缀 id ⇒ 既有键路由行为逐字节不变（fc001_v2 `_V`/fl001_v3 `_kWh`
        # 条件支先例同构）。
        if sid.endswith("_mL") and "V_mL_atol" in tol:
            return tol["V_mL_atol"]
        if "r_true" in sid:
            return tol["r_true_kW"]
        if "r_meas" in sid:
            return tol["r_meas_kW_atol"]
        if sid.endswith("_kW"):
            return max(tol["P_kW_atol"], tol["P_kW_rtol"] * max(1.0, _amax(arr)))
        if sid.startswith("SOC"):
            return tol["SOC_pp"]
        if sid.endswith("_pct"):
            return tol["SOC_pp"]
        # B-4 定案（FCECH-G2b-03 / CHG-20261113-01）：T-B 分派 `_V` 分支新增（显式硬项，
        # additive）。置于 elif 链尾：前序 _A/_Hz/_rpm/_K/_kPa/r_true/r_meas/_kW/SOC/_pct
        # 匹配全部先于本支、不受影响；且仅当 gate 声明 V_stack_atol/V_stack_rtol 键时激活
        # ——gt001_v3 V_bus_V 等既有 _V 后缀键所在 gate 无此键 ⇒ 照旧落 f_Hz_atol 兜底，
        # 既有键路由行为逐字节不变（fc001_v2 V_stack_V 不再落 f_Hz_atol 兜底——量纲错配
        # + 无 f_Hz_atol 键的 T-B gate 直接 KeyError 风险解除）。
        if sid.endswith("_V") and "V_stack_atol" in tol and "V_stack_rtol" in tol:
            return max(tol["V_stack_atol"], tol["V_stack_rtol"] * max(1.0, _amax(arr)))
        # FLCAP-G2b-03（CHG-20261114-01）：T-B 分派 `_kWh` 分支新增（显式硬项 A-4/B-1，
        # additive）。置于 `_V` 支后、f_Hz_atol 兜底前：前序 _A/_Hz/_rpm/_K/_kPa/
        # r_true/r_meas/_kW/SOC/_pct/_V 匹配全部先于本支、不受影响；且仅当 gate 声明
        # E_kWh 键时激活——gt001_v3 等既有 T-B gate 的 `_kWh` 后缀键（如有）照旧落
        # f_Hz_atol 兜底，既有键路由行为逐字节不变（fc001_v2 `_V` 分支先例同构；
        # fl001_v3 E_cap_kWh 不再落 f_Hz_atol 兜底——实测 `"E_cap_kWh".endswith("_kW")`
        # = False（kWh 非 `_kW` 精确后缀），无本支时实落兜底键而 fl001_v3 gate 无
        # f_Hz_atol 键 => 实害 KeyError（A-4/B-1 勘正：非量纲错配，是兜底键缺失））。
        if sid.endswith("_kWh") and "E_kWh" in tol:
            return tol["E_kWh"]
        # FCFMU-G2b-03（CHG-20261115-10 批准链）：T-B 分派无量纲 dim 支新增（Q15 定案
        # 显式硬项，additive）。置于 `_kWh` 支后、f_Hz_atol 兜底前：尾缀判别
        # `_true`/`_est`/`_cmd` 覆盖 fc001_fmu_v1 五个无量纲键（y_O2_ca_true /
        # cap_water_ratio_true / cap_water_ratio_est / u_o2_valve_cmd /
        # u_drain_valve_cmd）——无本支时落 f_Hz_atol 兜底而 gate 无该键 => KeyError。
        # 仅当 gate 声明 dim_atol 键时激活——既有 golden 无此三尾缀 id（r_true_kW 落
        # r_true 子串支、SOC_est_pct/P_bat_est_kW 落 `_pct`/`_kW` 支均先于本支）⇒
        # 既有键路由行为逐字节不变（`_V`/`_kWh` 条件支先例同构）。
        if (sid.endswith("_true") or sid.endswith("_est") or sid.endswith("_cmd")) \
                and "dim_atol" in tol:
            return tol["dim_atol"]
        return tol["f_Hz_atol"]
    if sid.endswith("_Hz"):
        return tol.get("f_Hz_atol", 1e-9)
    if sid.endswith("_rpm"):
        return tol.get("n_rpm_atol", 1e-9)
    if sid.endswith("_kW"):
        return max(tol["P_kW_atol"], tol["P_kW_rtol"] * max(1.0, _amax(arr)))
    if sid.startswith("SOC"):
        return tol["SOC_pp"]
    if sid.startswith("I_") or sid.startswith("bias"):
        return max(tol["I_A_atol"], tol["I_A_rtol"] * max(1.0, _amax(arr)))
    if "r_true" in sid:
        return tol["r_true_kW"]
    return tol.get("r_meas_kW_atol", tol.get("f_Hz_atol", 1e-9))


def metric_within(mid, unit, fv, gv, tol):
    if tol.get("tier") == "T-B":
        # GTL1-G2b-03 T-B 分派（键序镜像 T-A 的 mid 优先序 + T-B 量纲族扩展）。
        if unit == "kWh":
            return close_within(fv, gv, 1e-12, tol["E_kWh"])
        if unit in ("pp", "%"):
            return close_within(fv, gv, 1e-12, tol["SOC_pp"])
        if mid.startswith("max_abs_r_true"):
            return abs(fv - gv) <= tol["r_true_kW"]
        if mid.startswith("max_abs_f_channel_diff"):
            return abs(fv - gv) <= tol["f_Hz_atol"]
        if unit == "Hz":
            return abs(fv - gv) <= tol["f_Hz_atol"]
        if unit == "rpm":
            return abs(fv - gv) <= tol["n_rpm_atol"]
        if unit == "kW":
            return abs(fv - gv) <= max(tol["P_kW_atol"], tol["P_kW_rtol"] * abs(gv))
        return close_within(fv, gv, 1e-12, tol["SOC_pp"])
    if unit == "kWh":
        return close_within(fv, gv, 1e-12, tol["E_kWh"])
    if unit in ("pp", "%"):
        return close_within(fv, gv, 1e-12, tol["SOC_pp"])
    if mid.startswith("max_abs_r_true"):
        return abs(fv - gv) <= tol["r_true_kW"]
    if mid.startswith("max_abs_f_channel_diff"):
        return abs(fv - gv) <= tol.get("f_Hz_atol", 1e-9)
    if mid.startswith("max_abs_r_meas"):
        return abs(fv - gv) <= tol["r_meas_kW_atol"]
    return close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"])


def _verify_model(model):
    """单模型全量校验（V-01…V-09）；返回 (report, status, golden)。

    status："ok" 全过；"fail" 校验不通过；"missing" golden 缺失/损坏；"selfcheck"
    oracle 自检失败（退出码 2 语义）。--json 落盘与回显由 main 统一处置。
    """
    cfg = MODELS[model]
    oracle = cfg["oracle"]
    golden_path = os.path.join(ROOT, "data", "golden", cfg.get("golden_file", model + "_v1.json"))
    sidecar = golden_path + ".sha256"

    report = {"python_version": platform.python_version(), "model": model,
              "golden": golden_path, "checks": [], "problems": [], "ok": False}
    golden = None

    def rec(cid, ok, detail):
        report["checks"].append({"check_id": cid, "status": "pass" if ok else "fail", "detail": detail})
        return ok

    if not os.path.exists(golden_path):
        rec("V-01-golden-exists", False, "缺少 " + golden_path)
        return report, "missing", golden
    try:
        with open(golden_path, "r", encoding="utf-8") as f:
            golden = json.load(f)
    except Exception as e:  # noqa: BLE001
        rec("V-01-golden-exists", False, "golden 解析失败：%s" % e)
        return report, "missing", golden
    rec("V-01-golden-exists", True, "已加载（%d 字节）" % os.path.getsize(golden_path))

    if os.path.exists(sidecar):
        with open(sidecar, "r", encoding="utf-8") as f:
            expected = f.read().split()[0].strip().lower()
        actual = sha256_file(golden_path).lower()
        rec("V-02-golden-sha256", expected == actual,
            "sidecar=%s actual=%s" % (expected[:16], actual[:16]))
    else:
        rec("V-02-golden-sha256", False, "缺少 " + sidecar)

    rec_oracle = golden.get("generated_by", {}).get("oracle_source_sha256")
    cur_oracle = oracle._oracle_source_sha256()
    rec("V-03-oracle-source-hash", bool(rec_oracle) and rec_oracle == cur_oracle,
        "golden 记录=%s 当前=%s" % (str(rec_oracle)[:16], cur_oracle[:16]))

    approval = golden.get("approval") or {}
    if approval.get("approved_golden_sha256"):
        import copy as _copy
        payload = _copy.deepcopy(golden)
        payload.pop("generated_by", None)
        payload.pop("approval", None)
        digest = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")).hexdigest()
        rec("V-03b-approval-digest", digest == approval["approved_golden_sha256"],
            "记录=%s 重算=%s（approved_by=%s）" % (
                approval["approved_golden_sha256"][:12], digest[:12],
                approval.get("approved_by", "?")))

    ok, checks = oracle.self_check()
    rec("V-04-oracle-self-check", ok,
        "; ".join("%s=%s" % (c["check_id"], c["status"]) for c in checks))
    if not ok:
        report["problems"].extend([{"check": "V-04", "detail": c} for c in checks if c["status"] == "fail"])
        return report, "selfcheck", golden

    tol = golden.get("tolerances", {}).get("gate")
    all_ok = True
    n = golden.get("sampling", {}).get("n")

    for run_key, g_run in golden.get("runs", {}).items():
        # GTFMU-G2b-03（CHG-20261119-01）：多组 oracle 支持——单 oracle 双 golden 首例
        # （GT-001 L1-FMU：gt001_fmu/gt001_fmu_comb 共用 gt001_fmu_oracle，Run key 六键同名、
        # inertia_model 组异）。oracle.RUNS_GROUPS 存在时按 golden.inertia_model 选组解析；
        # 无该属性/组缺 key ⇒ 既有 flat RUNS fallback（既有 oracle 行为逐字节不变）。
        spec = None
        runs_pool = oracle.RUNS
        groups = getattr(oracle, "RUNS_GROUPS", None)
        if groups:
            pool = groups.get(golden.get("inertia_model"))
            if pool:
                spec = next((s for s in pool if s["key"] == run_key), None)
        if spec is None:
            spec = next((s for s in runs_pool if s["key"] == run_key), None)
        if spec is None:
            rec("V-05-run-%s" % run_key, False, "未知 Run key")
            all_ok = False
            continue
        fresh = oracle.simulate_run(spec)

        # V-05 关键点（true/meas 对；tier 分派：T-A I_A 键 / T-B 序列容差键）
        kp_ok = True
        for tt in KEY_POINTS:
            idx = int(round(tt / golden["sampling"]["dt_s"]))
            for sid in (cfg["i_true"], cfg["i_meas"]):
                gv = g_run["series"][sid][idx]
                fv = fresh["series"][sid][idx]
                if tol.get("tier") == "T-B":
                    kp_in = abs(fv - gv) <= series_limit(sid, g_run["series"][sid], tol)
                else:
                    kp_in = close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"])
                if not kp_in:
                    kp_ok = False
                    report["problems"].append({"check": "V-05-keypoint", "run": run_key,
                                               "t": tt, "signal": sid, "golden": gv, "fresh": fv})
        rec("V-05-keypoints-%s" % run_key, kp_ok,
            "19.9/21.5/26.0/60.0 s 的 %s/%s 逐点（tier=%s）"
            % (cfg["i_true"], cfg["i_meas"], tol.get("tier", "T-A")))
        all_ok = all_ok and kp_ok

        # V-06 标量（gate 容差）
        sc_ok = True
        for name, kind in cfg["scalars"]:
            gv = g_run["scalars"][name]
            fv = fresh["scalars"][name]
            lim = tol["E_kWh"] if kind == "kWh" else tol["SOC_pp"]
            if not close_within(fv, gv, 1e-12, lim):
                sc_ok = False
                report["problems"].append({"check": "V-06-scalar", "run": run_key, "field": name,
                                           "golden": gv, "fresh": fv, "tolerance": lim, "unit": kind})
        rec("V-06-scalars-%s" % run_key, sc_ok, "E/SOC 标量（gate ±1e-6 kWh / ±1e-5 pp）")
        all_ok = all_ok and sc_ok

        # V-07 序列
        series_problems_before = len(report["problems"])
        for sid, g_arr in g_run["series"].items():
            f_arr = fresh["series"].get(sid)
            if f_arr is None or len(f_arr) != n or len(g_arr) != n:
                report["problems"].append({"check": "V-07-series", "run": run_key, "signal": sid,
                                           "status": "fail", "reason": "缺少或点数不一致"})
                continue
            lim = series_limit(sid, g_arr, tol)
            # W2-1：事件域信号（fl001 I_bat_cap_A——非执行器场景整列 null，与引擎一致）
            # 双 null 记一致；单侧 null 记相位不一致；其余仍逐点数值差。
            bad = 0.0
            null_phase_fault = False
            for a, b in zip(g_arr, f_arr):
                if a is None and b is None:
                    continue
                if a is None or b is None:
                    null_phase_fault = True
                    continue
                d = abs(a - b)
                if d > bad:
                    bad = d
            if null_phase_fault:
                report["problems"].append({"check": "V-07-series", "run": run_key, "signal": sid,
                                           "status": "fail", "reason": "事件域信号单侧 null（相位不一致）"})
            elif bad > lim:
                report["problems"].append({"check": "V-07-series", "run": run_key, "signal": sid,
                                           "status": "fail", "observed_max_abs_diff": bad, "tolerance": lim})
        series_ok = len(report["problems"]) == series_problems_before
        rec("V-07-series-%s" % run_key, series_ok, "%d 点全精度序列（rtol 1e-12）" % n)
        all_ok = all_ok and series_ok

        # V-08 指标
        m_ok = True
        for mid, gm in g_run["metrics"].items():
            gv = gm.get("value")
            fv = fresh["metrics"].get(mid, {}).get("value")
            if gv is None or fv is None:
                if (gv is None) != (fv is None):
                    m_ok = False
                    report["problems"].append({"check": "V-08-metric", "run": run_key,
                                               "metric": mid, "golden": gv, "fresh": fv})
                continue
            if not metric_within(mid, gm.get("unit"), fv, gv, tol):
                m_ok = False
                report["problems"].append({"check": "V-08-metric", "run": run_key,
                                           "metric": mid, "golden": gv, "fresh": fv})
        rec("V-08-metrics-%s" % run_key, m_ok, "指标集（%d 项）" % len(g_run["metrics"]))
        all_ok = all_ok and m_ok

        # V-09 事件
        g_ev = g_run.get("events") or []
        f_ev = fresh.get("events") or []
        if len(g_ev) != len(f_ev):
            rec("V-09-events-%s" % run_key, False, "事件数不一致")
            all_ok = False
        elif not g_ev:
            rec("V-09-events-%s" % run_key, True, "无故障运行无事件（预期）")
        else:
            ge, fe = g_ev[0], f_ev[0]
            gp, gq = ge["snapshots"][0], ge["snapshots"][1]
            fp, fq = fe["snapshots"][0], fe["snapshots"][1]
            t_f = golden["config"]["fault_time_s"]
            ev_tol = tol[cfg.get("event_tol", "I_A_atol")]
            ev_ok = (gp["t_s"] == fp["t_s"] == t_f and gq["t_s"] == fq["t_s"] == t_f
                     and gp["derivation"] == fp["derivation"] == "left_limit"
                     and gq["derivation"] == fq["derivation"] == "post_sample"
                     and abs(fp["variables"][cfg["i_meas"]] - gp["variables"][cfg["i_meas"]]) <= ev_tol
                     and abs(fq["variables"][cfg["i_meas"]] - gq["variables"][cfg["i_meas"]]) <= ev_tol)
            rec("V-09-events-%s" % run_key, ev_ok,
                "pre/post t_s=事件时刻、derivation、%s 相位值" % cfg["i_meas"])
            all_ok = all_ok and ev_ok

    report["ok"] = all_ok and not report["problems"]
    return report, ("ok" if report["ok"] else "fail"), golden


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    out_path = None
    if "--json" in argv:
        i = argv.index("--json")
        if i + 1 < len(argv):
            out_path = argv[i + 1]
            args = [a for a in args if a != out_path]  # --json 值不作模型名解析
    if args and args[0] in MODELS:
        models = [args[0]]  # 显式参数：单模型（fl001 显式仍只验 fl001_v1，FL 规格 §4 项 7）
    elif args:
        models = ["fl001"]  # 未知参数：维持 v0.8 前静默回落 fl001 的行为
    else:
        # 默认双 golden（DEC-6：run-g2 步①同一 python 调用内顺序验证，FLTH §7.3
        # 「优先并入现有步」口径）——fl001（off 默认轨）+ fl001_l1（thermal 轨）。
        models = list(DEFAULT_MODELS)

    results = [_verify_model(m) for m in models]

    if len(results) == 1:
        # 单模型显式调用：输出形状与 v0.8 前逐字节同构（--json 落盘单 report）。
        report, status, golden = results[0]
        _finish(report, out_path)
        if status == "selfcheck":
            return 2
        if status == "missing":
            return 1
        if status == "fail":
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1
        cfg = MODELS[report["model"]]
        print(json.dumps({"ok": True, "model": report["model"],
                          "golden_sha256": sha256_file(report["golden"]),
                          "oracle_source_sha256": cfg["oracle"]._oracle_source_sha256(),
                          "approved_by": (golden.get("approval") or {}).get("approved_by"),
                          "checks": report["checks"]}, ensure_ascii=False, indent=2))
        return 0

    # 默认双 golden：聚合退出码（oracle 自检失败优先报 2），任一模型不通过即非零。
    exit_code = 0
    if any(status == "selfcheck" for _, status, _ in results):
        exit_code = 2
    elif any(status in ("fail", "missing") for _, status, _ in results):
        exit_code = 1
    if exit_code:
        for report, status, _ in results:
            if status == "fail":  # 校验失败回显（missing/selfcheck 早退面以 --json 为准）
                print(json.dumps(report, ensure_ascii=False, indent=2))
        _finish({"python_version": platform.python_version(),
                 "model": " + ".join(models), "models": list(models), "ok": False,
                 "results": [r for r, _, _ in results]}, out_path)
        return exit_code
    agg = {"python_version": platform.python_version(),
           "model": " + ".join(models), "models": list(models), "ok": True,
           "results": [
               {"model": report["model"],
                "golden_sha256": sha256_file(report["golden"]),
                "oracle_source_sha256": MODELS[report["model"]]["oracle"]._oracle_source_sha256(),
                "approved_by": (golden.get("approval") or {}).get("approved_by"),
                "checks": report["checks"]}
               for report, _, golden in results]}
    _finish(agg, out_path)
    print(json.dumps(agg, ensure_ascii=False, indent=2))
    return 0


def _finish(report, out_path):
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
