#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""property_harness.py — oracle 侧 property 测试 harness（W2-4 / R-3 模型侧三不变量）

依据（REFERENCE_LANDING_PLAN_v051.md §2 R-3 + DEC-R2，CHG-20261104-01 批准）：
  五条不变量中的模型侧三条（①②③）落本 harness，批量参数扫描经 **oracle 独立实现**
  执行——FL-001 主扫描（fl001_oracle.py）240 组 ≥ 200 组；FC-001（fc001_oracle.py）
  经公开 spec-dict magnitude 接口做辅助交叉（不计入 200 组配额）。
  ④ config_hash 键序不敏感、⑤ run_hash 冻结属 JS 侧，落 tests/registry.test.js §8/§9。
  DEC-R2：verify_golden / verify_bundle 保持确定性复核器，不 property 化、零改动。

三条不变量：
  P1  能量平衡：E_gen + E_bat == 0.5 kWh（= P_load·60 s/3600）。在 P_gen := P_load − P_bat
      定义域内核验两层：逐采样点 P_gen + P_bat == P_load_served；序列梯形积分与
      oracle scalars 两路径均等于 0.5 kWh。参数域：随机 sensor bias / actuator
      magnitude / t_start 组合。
  P2  残差恒零：r_true ≡ 0（全 family × feedback_mode × 参数域；EQ-5 定义恒等式）。
      三路径复核：序列 r_true 列、按 P_gen/P_bat/P_load 列独立重算、scalars
      max_abs_r_true_kW；容差 ≤1e-12 kW 与 fl001 golden 门禁 r_true_kW 同口径。
  P3  事件相位：pre（左极限）== post 前一采样点。语义锚点 tests/event-phase.test.js
      :62-71（「19.9 只是上一常规采样点：值与 pre 相同（FL-001 事件前恒定）」）——
      pre 快照各变量（左极限）== 序列在事件采样行 i_f 的前一采样行 i_f−1 的值；
      同时复核 post == 事件采样行 i_f（post_sample 语义）、derivation 面与
      unfaulted 组合的无事件契约；可空信号（I_bat_cap_A）按 None↔None 一致性核验。

oracle 独立性与字节安全（红线 3 / I-3；V-03）：
  1. 只 import tools/oracle 模块（fl001_oracle / fc001_oracle / oracle_base 机制层），
     绝不 import src/**；main 结束时自证 sys.modules 中无仓库 src/** 模块。
  2. 参数扫描通过**内存内临时改写** fl001_oracle 模块级冻结参数实现（try/finally
     必还原；I_CAP_A 随 MAGNITUDE_PCT 按 fl001_oracle.py:75 同式重算）；不写任何
     oracle 文件——main 对三份 oracle 源文件做运行前后字节 SHA-256 比对自证
     （V-03 语义安全）。注：__pycache__/*.pyc 为解释器缓存副作用，不属源文件字节，
     且已在 .gitignore。
  3. 纯 Python 3 标准库；固定随机种子（random.Random(SEED)，Mersenne Twister 稳定）；
     无网络、无时钟依赖——完全可重复。

反例最小化（R-3 验收「反例最小化打印」；计划 §6 风险 3 口径：不追求完整 shrinking）：
  贪心单参数归约（ddmin-lite）：数值减半 → 归零 → 规范值 → family/mode 回退，
  每步仅当性质仍违例才采纳；探针异常按「不可归约」处理（最小化不得进入非法域）。
  归约后的最小参数集随 counterexamples 输出。

运行：python -I tools/oracle/properties/property_harness.py
  输出 JSON 摘要（含各性质通过计数）；exit 0 = 全过，exit 1 = 存在违例或纪律自检失败。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import os
import random
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))          # .../tools/oracle/properties
_ORACLE_DIR = os.path.dirname(_HERE)                        # .../tools/oracle
if _ORACLE_DIR not in sys.path:
    sys.path.insert(0, _ORACLE_DIR)

import fl001_oracle  # noqa: E402  FL-001 oracle 独立实现（主扫描）
import fc001_oracle  # noqa: E402  FC-001 oracle 独立实现（辅助交叉）
import oracle_base   # noqa: E402  D-2 机制层（V-03 文件字节 SHA-256 复用）

# ---------------------------------------------------------------------------
# 固定种子与扫描域（固定种子可复现 = R-3 验收线）
# ---------------------------------------------------------------------------
SEED = 20261104          # 固定随机种子（CHG-20261104 批准日）
N_COMBOS = 240           # FL-001 主扫描参数组合数（要求 ≥ 200）
FL001_TARGET_E_KWH = 0.5  # P_load 30 kW × 60 s / 3600 = 0.5 kWh

# 容差：IDENT 与 oracle SC-3 / golden 门禁 r_true_kW=1e-12 同口径（实测 ~3.55e-15）；
# E/相位取 1e-9——结构相等在 1e-13 量级，参数级真实违例 ≥1e-3， separation 干净。
TOL_IDENT_KW = 1e-12
TOL_E_KWH = 1e-9
TOL_PHASE = 1e-9

DT_S = fl001_oracle.DT_S        # 0.1 s 采样网格（冻结，不进 patch 面）
IREF_A = fl001_oracle.IREF_A    # 25 A（冻结，不进 patch 面）

FAMILIES = (fl001_oracle.FAMILY_NONE, fl001_oracle.FAMILY_SENSOR,
            fl001_oracle.FAMILY_ACTUATOR)   # 全 family（none/sensor_drift/actuator_fault）
MODES = ("closed_loop", "monitor")

BIAS_RANGE = (-15.0, 15.0)   # sensor 偏置域（|b| ≤ 20 模型域内，含负漂移；round 3 位）
MAG_RANGE = (0.0, 100.0)     # actuator 限幅比例域（0%=全钳位 … 100%=无钳位；round 1 位）
TSTART_K = (50, 550)         # t_start = k·DT_S ∈ [5.0, 55.0] s，0.1 s 网格对齐

FC001_AUX_VARIANTS = 12      # FC-001 辅助：load_step / actuator 各 12 个 magnitude 变体

_ORACLE_FILES = ("fl001_oracle.py", "fc001_oracle.py", "oracle_base.py")


# ---------------------------------------------------------------------------
# 内存内冻结参数 patch（try/finally 必还原；不触碰 oracle 文件字节）
# ---------------------------------------------------------------------------
class _Patched(object):
    """上下文管理器：临时改写模块属性，退出时逐键还原（异常路径同样还原）。

    仅用于把 oracle 冻结参数推过参数扫描域——oracle 实现代码路径零改动；
    连带约束：I_CAP_A 必须与 MAGNITUDE_PCT 同时给定（fl001_oracle.py:75 派生式）。
    """

    def __init__(self, module, updates):
        self._module = module
        self._updates = dict(updates)
        self._saved = {}

    def __enter__(self):
        self._saved = dict((k, getattr(self._module, k)) for k in self._updates)
        for key, val in self._updates.items():
            setattr(self._module, key, val)
        return self

    def __exit__(self, exc_type, exc, tb):
        for key, val in self._saved.items():
            setattr(self._module, key, val)
        return False


# ---------------------------------------------------------------------------
# FL-001 主扫描：参数组合抽取与 oracle 执行
# ---------------------------------------------------------------------------
def draw_combo(i, rng):
    """第 i 组参数。family/mode 轮转保证全域覆盖，数值由固定种子 rng 抽取。

    family 语义（fl001_oracle EQ-1/EQ-A）：bias 仅 sensor_drift 生效（actuator 轨
    b≡0、healthy 无故障）；magnitude 仅 actuator_fault 生效（钳位比例）；
    t_start 对 faulted 组合生效且必须 0.1 s 网格对齐（保留 i·dt 的 IEEE-754 积
    原始值，禁 round——保证 t[i_f] 与 t_start 逐位相等）。
    """
    family = FAMILIES[i % len(FAMILIES)]
    mode = MODES[(i // len(FAMILIES)) % len(MODES)]
    faulted = family != fl001_oracle.FAMILY_NONE
    bias = (round(rng.uniform(*BIAS_RANGE), 3)
            if family == fl001_oracle.FAMILY_SENSOR else 0.0)
    magnitude = (round(rng.uniform(*MAG_RANGE), 1)
                 if family == fl001_oracle.FAMILY_ACTUATOR
                 else fl001_oracle.MAGNITUDE_PCT)
    k = rng.randint(*TSTART_K)
    return {
        "index": i,
        "family": family,
        "feedback_mode": mode,
        "faulted": faulted,
        "bias_A": bias,
        "magnitude_pct": magnitude,
        "t_start_s": DT_S * k,
        "i_f": k,
    }


def fl001_run(combo):
    """经 oracle 独立实现 simulate_run 产出单组 Run（冻结参数临时推至 combo 域）。"""
    spec = {
        "key": "prop%03d" % combo["index"],
        "role": ("baseline" if not combo["faulted"]
                 else ("monitor" if combo["feedback_mode"] == "monitor" else "fault")),
        "family": combo["family"],
        "feedback_mode": combo["feedback_mode"],
        "faulted": combo["faulted"],
    }
    updates = {
        "BIAS_A": float(combo["bias_A"]),
        "T_F": float(combo["t_start_s"]),
        "I_F": int(combo["i_f"]),
        "MAGNITUDE_PCT": float(combo["magnitude_pct"]),
        "I_CAP_A": IREF_A * float(combo["magnitude_pct"]) / 100.0,
    }
    with _Patched(fl001_oracle, updates):
        return fl001_oracle.simulate_run(spec)


# ---------------------------------------------------------------------------
# 三不变量检查（每条返回 (ok, subkind, worst, detail)）
# ---------------------------------------------------------------------------
def check_p1(combo, run):
    """P1 能量平衡：定义域逐点 + 序列积分 + scalars 三路径 == 0.5 kWh。"""
    s = run["series"]
    worst_pair = 0.0
    e_sum_kws = 0.0
    prev = None
    for pg, pb, pl in zip(s["P_gen_true_kW"], s["P_bat_true_kW"], s["P_load_served_kW"]):
        pair = pg + pb
        worst_pair = max(worst_pair, abs(pair - pl))
        if prev is not None:
            e_sum_kws += 0.5 * (prev + pair) * DT_S
        prev = pair
    d_series = abs(e_sum_kws / 3600.0 - FL001_TARGET_E_KWH)
    e_scalars = run["scalars"]["E_gen_true_kWh"] + run["scalars"]["E_bat_true_kWh"]
    d_scalars = abs(e_scalars - FL001_TARGET_E_KWH)
    ok = worst_pair <= TOL_IDENT_KW and d_series <= TOL_E_KWH and d_scalars <= TOL_E_KWH
    detail = ("family=%s mode=%s b=%.3fA mag=%.1f%% t0=%.1fs: "
              "max|P_gen+P_bat-P_load_served|=%.3g kW, "
              "|E_gen+E_bat-0.5| series=%.3g / scalars=%.3g kWh"
              % (combo["family"], combo["feedback_mode"], combo["bias_A"],
                 combo["magnitude_pct"], combo["t_start_s"], worst_pair,
                 d_series, d_scalars))
    return ok, "energy_balance", max(d_series, d_scalars), detail


def check_p2(combo, run):
    """P2 残差恒零：r_true 列 / 独立重算 / scalar 三路径 ≤1e-12 kW（全 family/参数域）。"""
    s = run["series"]
    worst_col = max(abs(v) for v in s["r_true_kW"])
    worst_recalc = max(abs(pg + pb - pl) for pg, pb, pl in
                       zip(s["P_gen_true_kW"], s["P_bat_true_kW"], s["P_load_served_kW"]))
    worst_scalar = run["scalars"]["max_abs_r_true_kW"]
    ok = worst_col <= TOL_IDENT_KW and worst_recalc <= TOL_IDENT_KW \
        and worst_scalar <= TOL_IDENT_KW
    detail = ("family=%s mode=%s b=%.3fA mag=%.1f%% t0=%.1fs: max|r_true| "
              "col=%.3g / recalc=%.3g / scalar=%.3g kW"
              % (combo["family"], combo["feedback_mode"], combo["bias_A"],
                 combo["magnitude_pct"], combo["t_start_s"],
                 worst_col, worst_recalc, worst_scalar))
    return ok, "r_identity", max(worst_col, worst_recalc, worst_scalar), detail


def _phase_delta_ok(series, variables, index):
    """快照变量 vs 序列采样行：None↔None 一致 + 数值差 ≤TOL_PHASE。返回 (ok, worst)。"""
    worst = 0.0
    ok = True
    for var, pv in variables.items():
        sv = series[var][index]
        if pv is None or sv is None:
            ok = ok and (pv is None and sv is None)
        else:
            worst = max(worst, abs(pv - sv))
    return ok and worst <= TOL_PHASE, worst


def check_p3(combo, run):
    """P3 事件相位：pre（左极限）== post 前一采样行 i_f−1；post == 事件采样行 i_f。

    unfaulted 组合核验无事件契约（subkind=no_event）。
    """
    s = run["series"]
    events = run["events"]
    if not combo["faulted"]:
        ok = (len(events) == 0)
        return ok, "no_event", 0.0, "family=%s: events=%d（无事件契约）" % (
            combo["family"], len(events))
    if len(events) != 1 or len(events[0]["snapshots"]) != 2:
        return False, "phase_checked", float("inf"), \
            "family=%s t0=%.1fs: events=%d（应恰 1 事件 2 快照）" % (
                combo["family"], combo["t_start_s"], len(events))
    pre, post = events[0]["snapshots"][0], events[0]["snapshots"][1]
    i_f = combo["i_f"]
    ok = (pre["t_s"] == combo["t_start_s"] and post["t_s"] == combo["t_start_s"]
          and pre["phase"] == "pre" and post["phase"] == "post"
          and pre["derivation"] == "left_limit" and post["derivation"] == "post_sample")
    ok_prev, worst_prev = _phase_delta_ok(s, pre["variables"], i_f - 1)
    ok_post, worst_post = _phase_delta_ok(s, post["variables"], i_f)
    ok = ok and ok_prev and ok_post
    worst = max(worst_prev, worst_post)
    detail = ("family=%s mode=%s t0=%.1fs i_f=%d: pre==series[i_f-1] & "
              "post==series[i_f]（left_limit/post_sample）max|Δ|=%.3g"
              % (combo["family"], combo["feedback_mode"], combo["t_start_s"],
                 i_f, worst))
    return ok, "phase_checked", worst, detail


_CHECKS = (("P1", check_p1), ("P2", check_p2), ("P3", check_p3))


# ---------------------------------------------------------------------------
# 反例最小化（ddmin-lite；仅违例路径执行）
# ---------------------------------------------------------------------------
def _combo_violates(combo):
    """shrink 探针：重跑组合，任一性质仍违例返回 True；异常按不可归约处理。"""
    try:
        run = fl001_run(combo)
    except Exception:  # noqa: BLE001  最小化不得进入非法域
        return False
    return not all(fn(combo, run)[0] for _name, fn in _CHECKS)


def _reduction_candidates(cur, structural):
    """按相生成归约候选 [(key, new_value, updates), ...]。

    数值相（structural=False）：bias/magnitude 减半→归零、t_start 网格减半
    （i_f−1 ≥ 0 下限保护）；结构相（structural=True，单向进入后不再回到数值相，
    避免 t_start 减半与 t_start→20.0 规范化互相重启的循环）：family→none /
    mode→closed_loop / t_start→20.0 规范值。两相候选空间均有限
    （减半链因 half != val 守卫必收敛，t_start 减半因 half_k != i_f 守卫必推进）。
    """
    out = []
    if not structural:
        for key in ("bias_A", "magnitude_pct"):
            val = cur[key]
            if isinstance(val, float) and val != 0.0:
                half = round(val / 2.0, 6)
                if half != val:
                    out.append((key, half, {key: half}))
        for key in ("bias_A", "magnitude_pct"):
            val = cur[key]
            if isinstance(val, float) and val != 0.0:
                out.append((key, 0.0, {key: 0.0}))
        if cur["t_start_s"] > DT_S:
            half_k = max(1, int(round(cur["i_f"] / 2.0)))
            if half_k != cur["i_f"]:
                out.append(("t_start_s", DT_S * half_k,
                            {"t_start_s": DT_S * half_k, "i_f": half_k}))
        return out
    for key, canon in (("family", fl001_oracle.FAMILY_NONE),
                       ("feedback_mode", "closed_loop"),
                       ("t_start_s", 20.0)):
        if cur[key] != canon:
            if key == "t_start_s":
                out.append((key, canon, {"t_start_s": canon,
                                         "i_f": int(round(canon / DT_S))}))
            else:
                updates = {key: canon}
                if key == "family":
                    faulted = canon != fl001_oracle.FAMILY_NONE
                    updates["faulted"] = faulted
                    if not faulted:
                        updates["bias_A"] = 0.0
                out.append((key, canon, updates))
    return out


def minimize_counterexample(combo):
    """贪心最小化（ddmin-lite）：逐候选归约，仅当性质仍违例才采纳；被拒候选不重试。

    两相单向（数值相穷尽后才进入结构相）+ rejected 记忆 + 512 步上限 ⇒ 终止。
    """
    cur = {k: combo[k] for k in ("index", "family", "feedback_mode", "faulted",
                                 "bias_A", "magnitude_pct", "t_start_s", "i_f")}
    rejected = set()
    structural = False
    for _step in range(512):
        cands = [(k, v, u) for k, v, u in _reduction_candidates(cur, structural)
                 if (k, v) not in rejected]
        if not cands:
            if not structural:
                structural = True
                continue
            break
        key, val, updates = cands[0]
        cand = dict(cur)
        cand.update(updates)
        if _combo_violates(cand):
            cur = cand
        else:
            rejected.add((key, val))
    return cur


# ---------------------------------------------------------------------------
# 检测力自检（阴性对照）：污染副本必须被三不变量检出；最小化器端到端可达规范参数
# ---------------------------------------------------------------------------
def detection_selftest():
    """证明 harness 非空洞：篡改 Run 副本逐条必被检出；shrink 在受控违例下收敛。

    全程 deepcopy 副本上操作 + fl001_run 模块引用 try/finally 必还原，
    oracle 状态与文件零接触。返回 (ok, checks[])。
    """
    global fl001_run
    import copy

    checks = []

    def rec(cid, ok_, observed, note):
        checks.append({"check_id": cid, "status": "pass" if ok_ else "fail",
                       "observed": observed, "note": note})

    combo = draw_combo(1, random.Random(SEED))  # sensor_drift / closed_loop（faulted）
    run = fl001_run(combo)

    # D-1 P1：E_gen 标量污染 0.01 kWh 必检出
    bad = copy.deepcopy(run)
    bad["scalars"]["E_gen_true_kWh"] += 0.01
    rec("D-1-p1-detects-tamper", not check_p1(combo, bad)[0],
        "ΔE_gen=+0.01 kWh", "能量平衡违例检测")

    # D-2 P2：r_true 序列单点污染 +1 kW 必检出
    bad = copy.deepcopy(run)
    bad["series"]["r_true_kW"][300] += 1.0
    rec("D-2-p2-detects-tamper", not check_p2(combo, bad)[0],
        "r_true[300]+=1 kW", "残差恒零违例检测")

    # D-3 P3：pre 快照变量污染（bias_A += 5）必检出
    bad = copy.deepcopy(run)
    bad["events"][0]["snapshots"][0]["variables"]["bias_A"] += 5.0
    rec("D-3-p3-detects-tamper", not check_p3(combo, bad)[0],
        "pre.bias_A+=5 A", "事件相位违例检测")

    # D-4 最小化器：受控恒违例生产者下，shrink 收敛到规范参数面（family=none/t0=20）
    original = fl001_run

    def _always_bad(c):
        bad_run = original(c)
        bad_run["series"]["r_true_kW"][300] += 1.0
        return bad_run

    fl001_run = _always_bad
    try:
        minimal = minimize_counterexample(draw_combo(1, random.Random(SEED)))
    finally:
        fl001_run = original
    rec("D-4-shrink-converges",
        minimal["family"] == fl001_oracle.FAMILY_NONE
        and minimal["feedback_mode"] == "closed_loop"
        and minimal["t_start_s"] == 20.0,
        json.dumps({k: minimal[k] for k in ("family", "feedback_mode", "bias_A",
                                            "magnitude_pct", "t_start_s")},
                   ensure_ascii=False),
        "最小化反例端到端（受控违例 → 规范参数面）")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# FL-001 主扫描（240 组 ≥ 200 组）
# ---------------------------------------------------------------------------
def _new_counter():
    return {"passed": 0, "failed": 0, "subkinds": {}, "worst_observed": 0.0}


def fl001_sweep():
    rng = random.Random(SEED)
    counters = dict((name, _new_counter()) for name, _fn in _CHECKS)
    counterexamples = []
    for i in range(N_COMBOS):
        combo = draw_combo(i, rng)
        try:
            run = fl001_run(combo)
            results = dict((name, fn(combo, run)) for name, fn in _CHECKS)
        except Exception as exc:  # noqa: BLE001  harness 级异常计违例并给最小化反例
            results = dict((name, (False, "error", float("inf"),
                                   "harness-error: %s: %s" % (type(exc).__name__, exc)))
                           for name, _fn in _CHECKS)
        for name, (ok, subkind, worst, detail) in results.items():
            counter = counters[name]
            if ok:
                counter["passed"] += 1
                counter["subkinds"][subkind] = counter["subkinds"].get(subkind, 0) + 1
                counter["worst_observed"] = max(counter["worst_observed"], worst)
            else:
                counter["failed"] += 1
                counterexamples.append({
                    "property": name,
                    "combo": {k: combo[k] for k in ("index", "family", "feedback_mode",
                                                    "faulted", "bias_A", "magnitude_pct",
                                                    "t_start_s", "i_f")},
                    "minimal": minimize_counterexample(combo),
                    "detail": detail,
                })
    return counters, counterexamples


# ---------------------------------------------------------------------------
# FC-001 辅助交叉（公开 spec-dict magnitude 接口，无 patch；不计入 200 组配额）
# ---------------------------------------------------------------------------
def _fc001_check_p1(combo, run):
    """FC-001 形式平衡恒等式：E_source + E_bat == E_load（load_step 域内 E_load 非常数，
    核验「源+电池==负载」一般式；0.5 kWh 常数式由 FL-001 主扫描承担）。"""
    sc = run["scalars"]
    d = abs((sc["E_fc_true_kWh"] + sc["E_bat_true_kWh"]) - sc["E_load_kWh"])
    return d <= TOL_E_KWH, "energy_identity", d, "|E_fc+E_bat-E_load|=%.3g kWh" % d


def _fc001_check_p2(combo, run):
    worst_col = max(abs(v) for v in run["series"]["r_true_kW"])
    worst_scalar = run["scalars"]["max_abs_r_true_kW"]
    ok = worst_col <= TOL_IDENT_KW and worst_scalar <= TOL_IDENT_KW
    return ok, "r_identity", max(worst_col, worst_scalar), \
        "max|r_true| col=%.3g / scalar=%.3g kW" % (worst_col, worst_scalar)


def _fc001_check_p3(combo, run):
    s = run["series"]
    events = run["events"]
    if not combo["faulted"]:
        return len(events) == 0, "no_event", 0.0, \
            "unfaulted: events=%d（无事件契约）" % len(events)
    if len(events) != 1 or len(events[0]["snapshots"]) != 2:
        return False, "phase_checked", float("inf"), \
            "%s: events=%d（应恰 1 事件 2 快照）" % (combo["label"], len(events))
    pre, post = events[0]["snapshots"][0], events[0]["snapshots"][1]
    i_f = fc001_oracle.I_F
    ok = (pre["t_s"] == fc001_oracle.T_F and post["t_s"] == fc001_oracle.T_F
          and pre["phase"] == "pre" and post["phase"] == "post"
          and pre["derivation"] == "left_limit" and post["derivation"] == "post_sample")
    ok_prev, worst_prev = _phase_delta_ok(s, pre["variables"], i_f - 1)
    ok_post, worst_post = _phase_delta_ok(s, post["variables"], i_f)
    ok = ok and ok_prev and ok_post
    worst = max(worst_prev, worst_post)
    return ok, "phase_checked", worst, \
        "%s: pre==series[%d] & post==series[%d] max|Δ|=%.3g" % (
            combo["label"], i_f - 1, i_f, worst)


_FC001_CHECKS = (("P1", _fc001_check_p1), ("P2", _fc001_check_p2), ("P3", _fc001_check_p3))


def fc001_aux_sweep():
    """辅助交叉：3 条原生 Run + load_step/actuator 各 12 个随机 magnitude 变体。

    magnitude 经 fc001_oracle.simulate_run 公开 spec-dict 域驱动（fc001_oracle.py:216
    spec["magnitude"]），零 patch；t_start 恒冻结 T_F=20.0（fc001 冻结面）。
    """
    rng = random.Random(SEED + 1)
    combos = [{"label": key, "spec": key, "faulted": key != "healthy"}
              for key in ("healthy", "closed_loop_fault", "monitor_only")]
    for _j in range(FC001_AUX_VARIANTS):
        m_load = round(rng.uniform(0.0, 20.0), 2)
        m_act = round(rng.uniform(0.0, 100.0), 1)
        combos.append({"label": "load_step@%.2fkW" % m_load, "faulted": True,
                       "spec": {"key": "load_step_closed_loop", "role": "fault",
                                "family": "load_step", "feedback_mode": "closed_loop",
                                "faulted": True, "magnitude": m_load}})
        combos.append({"label": "actuator@%.1f%%" % m_act, "faulted": True,
                       "spec": {"key": "actuator_closed_loop", "role": "fault",
                                "family": "actuator_fault", "feedback_mode": "closed_loop",
                                "faulted": True, "magnitude": m_act}})
    counters = dict((name, _new_counter()) for name, _fn in _FC001_CHECKS)
    failures = []
    for combo in combos:
        try:
            run = fc001_oracle.simulate_run(combo["spec"])
            results = dict((name, fn(combo, run)) for name, fn in _FC001_CHECKS)
        except Exception as exc:  # noqa: BLE001
            results = dict((name, (False, "error", float("inf"),
                                   "harness-error: %s: %s" % (type(exc).__name__, exc)))
                           for name, _fn in _FC001_CHECKS)
        for name, (ok, subkind, worst, detail) in results.items():
            counter = counters[name]
            if ok:
                counter["passed"] += 1
                counter["subkinds"][subkind] = counter["subkinds"].get(subkind, 0) + 1
                counter["worst_observed"] = max(counter["worst_observed"], worst)
            else:
                counter["failed"] += 1
                failures.append({"property": name, "combo": combo["label"],
                                 "detail": detail})
    return len(combos), counters, failures


# ---------------------------------------------------------------------------
# 纪律自检：oracle 文件字节稳定（V-03）+ 无 src/** import（红线 3 / I-3）
# ---------------------------------------------------------------------------
def _oracle_file_shas():
    return dict((name, oracle_base.oracle_source_sha256(os.path.join(_ORACLE_DIR, name)))
                for name in _ORACLE_FILES)


def no_src_module_imported():
    """自证 sys.modules 无仓库 src/** 模块（oracle 独立性红线 3 / I-3）。"""
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))
    src_root = os.path.join(repo_root, "src") + os.sep
    for mod in list(sys.modules.values()):
        f = getattr(mod, "__file__", None)
        if f and os.path.abspath(f).startswith(src_root):
            return False
    return True


# ---------------------------------------------------------------------------
# __main__：运行全部 → JSON 摘要（含通过计数）；exit 0 = 全过
# ---------------------------------------------------------------------------
def main(argv=None):
    try:  # GBK 控制台兼容（oracle_base.py:730-733 同式）：摘要含中文，统一 UTF-8 输出
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

    shas_before = _oracle_file_shas()
    det_ok, det_checks = detection_selftest()
    fl_counters, fl_counterexamples = fl001_sweep()
    fc_n, fc_counters, fc_failures = fc001_aux_sweep()
    shas_after = _oracle_file_shas()

    fl_ok = all(c["failed"] == 0 for c in fl_counters.values())
    fc_ok = all(c["failed"] == 0 for c in fc_counters.values())
    byte_stable = (shas_before == shas_after)
    no_src = no_src_module_imported()
    ok = bool(fl_ok and fc_ok and det_ok and byte_stable and no_src)
    passed_total = (sum(c["passed"] for c in fl_counters.values())
                    + sum(c["passed"] for c in fc_counters.values())
                    + sum(1 for c in det_checks if c["status"] == "pass"))
    failed_total = (sum(c["failed"] for c in fl_counters.values())
                    + sum(c["failed"] for c in fc_counters.values())
                    + sum(1 for c in det_checks if c["status"] == "fail"))

    summary = {
        "harness": "tools/oracle/properties/property_harness.py",
        "basis": "REFERENCE_LANDING_PLAN_v051.md §2 R-3 / DEC-R2（W2-4；模型侧不变量①②③，"
                 "④⑤落 tests/registry.test.js §8/§9）",
        "seed": SEED,
        "passed_total": passed_total,
        "failed_total": failed_total,
        "fl001_main_sweep": {
            "combos": N_COMBOS,
            "required_min_combos": 200,
            "families": list(FAMILIES),
            "domains": {
                "bias_A": list(BIAS_RANGE),
                "magnitude_pct": list(MAG_RANGE),
                "t_start_s": [DT_S * TSTART_K[0], DT_S * TSTART_K[1]],
            },
            "properties": fl_counters,
        },
        "fc001_aux_sweep": {
            "combos": fc_n,
            "note": "公开 spec-dict magnitude 域驱动（零 patch）；不计入 200 组配额",
            "properties": fc_counters,
            "failures": fc_failures,
        },
        "counterexamples": fl_counterexamples,
        "detection_selftest": {"ok": det_ok, "checks": det_checks},
        "oracle_files_byte_stable": byte_stable,
        "oracle_source_sha256": shas_after,
        "no_src_module_imported": no_src,
        "ok": ok,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
