# V0.3 收尾记录（V3-31 / V3-33 / V3-02 / V3-03，2026-10-30，CHG-20261030-09）

> **授权**：用户 2026-10-30 指令「V3-31/V3-33（GT-001 oracle/golden 与实现）开工指令以及 V0.3 收尾项」。
> **基线**：本批完成后 `node tools/run-g2.mjs` **21/21 PASS**（20→21 步：verify_golden gt001 +
> engine-gt + perf 三步新增；`artifacts/run-g2-report.json`，duration_ms 13846）。
> 性质：内部一致性与可复核性证据；`not_performed` 三字段不变。

## 1. V3-31 — GT-001 独立 oracle + golden（完成）

| 项 | 交付/结果 |
|---|---|
| `tools/oracle/gt001_oracle.py` | 按 G2b v1.1 §8 **冻结更新序**逐算子独立实现（Python，不 import `src/**`、不共享 FL-001 oracle 常量；foStep/clamp/更新次序/梯形积分复刻）。自检 **GS-1…GS-6 全过**：线性化能量恒等（残差 2.6e-15）、抗饱和钳位（指令 wound-up 40 kW + P_gen 钳 20）、通道差≡b（9.9e-15）、601 点网格、验收锚点（nadir 49.5894 / f60_load 49.9922 / f60_sensor 49.7055）、健康局不变量 |
| `data/golden/gt001_v1.json`（+.sha256） | **5 Run**（healthy / closed_loop_fault / monitor_only / load_step / actuator_fault——G2b v1.1 §8 run 集要求 ≥5 满足，含条件 2 的 monitor 语义覆盖）；`method_id='gt001_euler_dt0.01'`；units 含 Hz/rpm；tolerances.gate 增 `f_Hz_atol/n_rpm_atol = 1e-9`；P_gen_cap_kW 为事件域信号不入序列比对面（记录 series_note）；approval 三字段（批准依据 = G2b CHG-20261030-06 + 本开工指令） |
| `scripts/verify_golden.py` | 参数化 `gt001`：MODELS 条目、Hz/rpm 序列容差类、max_abs_f_channel_diff 指标类、事件容差键参数化（V-09 用 f_Hz_atol）——`python scripts/verify_golden.py gt001` **exit 0**；fl001/fc001 回归不受影响 |

## 2. V3-33 — GT-001 实现（完成；对照 G2b v1.1 §10 涟漪清单 20 项）

| # | 文件 | 变更 |
|---|---|---|
| 1 | `src/core/systems.js` | 信号目录：`r_meas_kW` → **`f_channel_diff_Hz`**（DERIVED + **显式 `exposure:'blind_observable'`**，无独立 blindVisible——条件 2/F-05）；`r_true_kW` 定义恒等注记；GT tagline 追加「单机等效频率响应示意（L0b），非机组/电网动态验证」；assumptions 增 `A-gt-inertia-lin / A-gt-bat-rating / A-gt-antiwindup-clamp`；limitations 增条件 6 全清单（AVR/功角/热力学/保护/负荷频率特性 D/多机/整流动态/死区）+ 执行器 ≥62.5% 不可观死区 + L0b 定性；gt-sensor-drift/gt-sensor-drift-monitor 因果模板 n6/m4 改「频率通道冗余不一致」叙事（signalIds/evidence/占位符 f_diff_peak）；bus inspector r_meas→f_channel_diff |
| 2 | `src/core/engine.js` | record()：r_true 新定义（含转子项）+ f_channel_diff 计算（真值口径，噪声下由 applyNoise 重构）；applyNoise GT 分支改通道差（含噪口径） |
| 3 | `src/core/checks.js` | conservation-true GT 容差 1e-3→**1e-9**；conservation-meas GT 分支 = 频率通道冗余一致性（健康 pass ≤1e-9 / 故障 warn=检测信号 / 噪声 warn）；**gt-energy-consistency**（线性化能量离散自洽，含截断残差项 K_J·Δf²/(2f₀)，实测 pass）与 **gt-bat-envelope**（±25 kW 变流器包络）两个新 PHY 检查（仅新 Run 携带） |
| 4 | `src/core/metrics.js` | GT 的 max_abs_r_meas → **max_abs_f_channel_diff_Hz**（Hz/blindSafe）；清理「8–20 s 恢复」注释（f_recovery 为参考值，未收敛 null） |
| 5-7 | `src/ui/pages/causal.js` / `export.js` | 残差卡候选串 + 报告「真实/测量功率平衡」段 GT 分支文案（通道差叙事，系统感知） |
| 8 | `src/agents/builtin-agents.js` | **零改动**——GT 检测主路径本就走 n_meas/60−f_meas（speedGap），r_meas 仅 fallback；arena.test 155/155 复跑确认融合得分不受影响 |
| 9-12 | `tests/` | **新建 `engine-gt.test.js`：69/69**（5 Run × 序列逐点 ±1e-9 / 指标子集 / 事件 pre/post（快照经 preSnapshotId 引用）/ scope=extension_preview / GT PHY 检查 / run_hash 重算）；core.test 更新（10080/0：GT 信号断言 f_channel_diff 显式 exposure、requiredMetrics GT 分支、通道差=+0.3 Hz、r_true ≤1e-9）；scope-guard 注释更新（G2b 已批）；compare/arena 无需改（fixture 已 FC 化） |
| 13-16 | oracle/golden/verify_golden/run-g2 | 见 §1；run-g2 挂两步（18→20+perf=21） |
| 17-19 | CONTRACT/UI_GUARDRAILS/SCOPE | §5.3 全文替换为 APPROVED 规格（本次随批：CONTRACT GT 段头注更新为 G2b 批准状态）；四禁词暂未入 copy-guard（GT 页现文案未命中；正式 UI 化时随增补登记——记入遗留） |
| 20 | DATA_CONTRACT_SPEC | units Hz 类已随 golden 登记；如需字段级映射另 CHG（未触发） |

**引擎 ↔ oracle 一致性结论**：69/69 断言下，5 Run 序列逐点在 **±1e-9 Hz/rpm、rtol 1e-12 kW、SOC ±1e-5 pp** 内一致——G2b v1.1 §8 的「逐算子复刻更新序 → ±1e-9 可达」定案成立，无需启用 ~1e-4 方法等价预案。

## 3. V3-02 — 上游勘误（完成，O-10=a）

`NEXT/V02_UPSTREAM_ERRATA.md` v1：V0.1 四条（SOC ×100 / pre=20.0 左极限 / PHY 命名 / 金标准口径）、
V0.2 三条（PHY-01/06 语义 / GT·load_step 数值废除 / 范围叙述），引用规则三条（引用原文须带勘误条目、
INPUT 冻结不动、只增补）。DECISIONS §6「上游原文修订」未完成项**关闭**。

## 4. V3-03 — 性能阈值冻结（完成，O-11=a）

- 载体：`tools/e2e.mjs` 报告增 `duration_ms`（main 起点计时）；`tools/run-g2.mjs` 报告增
  `duration_ms`；新增 **`tools/perf.mjs`** 门禁步（随 --skip-e2e 联动跳过）。
- 实测（Chrome 156 本机，2026-10-30）：E2E 主旅程 **7372 / 7556 / 7454 ms**。
- 冻结阈值：**E2E 主旅程 ≤ 15000 ms**（≈实测峰值 2 倍——防退化门禁，非性能指标宣称）。
  内存上限/帧率下限未设（无稳定测量载体，不虚设——诚实记录）。
- 合并后载体说明（D-24）：V0.3.0 发布线的 e2e.mjs 将时长移至 `execution.duration_ms`（STARTED_MS）；
  `perf.mjs` 双读兼容（execution.duration_ms 优先、顶层 duration_ms 兜底）。
- 遗留 G5 F-5 就此关闭。

## 5. 偏差登记（D-20…D-23，接 deviations 序列）

| # | 偏差 | 理由 |
|---|---|---|
| D-20 | golden 序列比对面剔除 P_gen_cap_kW（事件域信号，非空仅 actuator 故障段；经事件快照承载） | verify_golden V-07 数值比较器不支持 null 序列；信号仍在引擎目录与 UI |
| D-21 | engine-gt 事件断言经 `run.snapshots`（preSnapshotId/postSnapshotId 引用）而非 golden 的 events[].snapshots 内嵌形态 | 引擎 Run 的事件/快照本为引用式分离结构（P0 既有语义），golden 为 oracle 侧合并形态；映射在测试内显式化 |
| D-22 | run-g2 的 GT 两步为常驻步（非 SKIP） | stdio/本地 oracle 无「不可达」态 |
| D-23 | GT 四禁词（机组动态验证等）未入 copy-guard 模式表 | 当前 src/** 无命中（GT 页文案已按护栏口径）；正式 UI 化（增补轮）时随文案登记，避免空规则 |

## 6. 复核命令

```powershell
python tools/oracle/gt001_oracle.py --self-check      # GS-1..GS-6
python scripts/verify_golden.py gt001                 # V-01..V-09
node tests/engine-gt.test.js                          # 69/69
node tests/core.test.js                               # 10080/0
node tools/run-g2.mjs                                 # 21/21（含 perf 步）
node tools/perf.mjs                                   # ≤15000 ms
```

**V0.3 收尾状态**：V3-01/02/03/20（评估/勘误/性能/隔离）✅、V3-31/33 ✅、O-13 ✅、G2b ✅、
G6-WS-C/D ✅、评测轨 MVP ✅、FL-19 增量一/二 ✅。**剩余待批项**：FL-19 增量三（浏览器 HTTP 桥 +
「后端对照」UI 入口）、GT-001 UI 正式化增补（W-11 文案 + 四禁词登记）、G8 发布（v0.3.0，需
G5 就绪单+双浏览器走查复用）。

**记录人**：实现 Agent，2026-10-30（CHG-20261030-09）。
