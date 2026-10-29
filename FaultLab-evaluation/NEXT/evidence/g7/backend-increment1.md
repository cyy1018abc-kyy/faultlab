# G7 实施证据增补（FL-19 后端适配·增量一：B-1/B-5 Python 后端 + 准入机检，2026-10-30）

> **性质**：G6-WS-C 放行的 FL-19 实现第一批增量（对照 `V312_BACKEND_ADMISSION_CHECKLIST.md` FROZEN）。
> 内部一致性证据；`not_performed` 三字段不变；适配器产出的任何 Run 按受控扩展强制
> `extension_preview`（该强制点在增量二组装层落地，本增量以纯函数断言固化 classify 零改动）。

## 1. 交付物

| # | 交付物 | 说明 |
|---|---|---|
| 1 | `tools/backend/py/fl001_analytic.py` | **B-1** Python 解析后端（`py-analytic-fl001`，profile=fl001-analytic-crosscheck）。按 MODEL_VALIDATION_SPEC §1.3/§5.2 独立编写（Q-2 边界 1：未 import/派生 `tools/oracle/**`；边界 2：自检 AC-1…AC-4 独立条目；边界 3：证据措辞「跨实现一致性检查」）。闭式解 + 逐点解析积分；输出 13 信号序列 + integrals + metrics |
| 2 | `tools/backend/py/fl001_ode_rk4.py` | **B-5** Python RK4 后端（`py-rk4-fl001`，profile=fl001-rk4-dt0.1）。状态 x=[I,Q]（Q=∫I dt 四阶求积同步累积）；**步左沿目标**（t_start 栅格对齐 → 每 0.1 s 区间目标常数，消除跨阶跃 stage 混值）；自检 RK-1…RK-3 |
| 3 | `tools/backend/fl001-adapter.mjs` | Node 侧适配器（stdio 子进程形态，RFC I-1 工具链路径）：list/capabilities/produce/selfCheck；produce 做形状与点数派生校验（BK-E02「不部分采纳」） |
| 4 | `src/core/golden-compare.js` | **BK-E03 判定载体**（V312 §3）：纯函数，golden 对象注入式；fl001-analytic-crosscheck 档**直接采用 golden.tolerances.analytic_crosscheck**（单一来源）；fl001-rk4-dt0.1 声明档；逐信号类容差（I/P/SOC/r_true/r_meas）+ 时间网格 1e-9 + metrics 同名项 |
| 5 | `tests/backend-admission.test.js` | **G-1a/G-1c/G-2 机检** + 三场景 × 双后端 golden 校验 + 确定性 + 两条负例（B-5 不得套用解析档；篡改序列被检出）+ V312 §6 断言 2（classify 零改动） |
| 6 | `tools/run-g2.mjs` | 挂步 17→**18** 步 |

## 2. 验证结果（实测）

| 验证 | 结果 |
|---|---|
| B-1 vs golden（closed_loop_fault，analytic-crosscheck 档） | 13 信号逐点最差相对差 **1.19e-16**；metrics 全部 ≤1e-12 |
| B-5 vs golden（同上，rk4 声明档） | 逐点最差 **3.49e-8**（I_bat_true_A）；I_true_26s 相对差 8.4e-9 |
| `node tests/backend-admission.test.js` | **51/51 PASS** |
| `node tools/copy-guard.mjs` | exit 0（golden-compare.js 无允许串扩充） |
| `node tools/run-g2.mjs` | 18/18 PASS（本目录落档时点，见 artifacts/run-g2-report.json） |

## 3. 增量边界（诚实声明）

- **本增量不含**：`createFromParts`/`assembleRun` 契约 Run 组装（含 causal/events/快照/UI 集成）、
  浏览器回环 HTTP 桥（Q-1）、scope 强制在组装层的落地（V312 §6 断言 1/3/4）、EvidenceBundle 导出路径、
  run-g2 `--require-backend` 开关（HTTP 桥时代生效——当前 stdio 形态恒可用，无需 SKIP 语义）。
  以上属增量二，准入清单继续约束。
- **偏差登记（D-17…D-19）**：
  - D-17：`focal_change_A` 不由后端产出——golden 该值符号约定（前−后）属组装层/事件指标语义，
    后端 metric 面排除之（对照测试已断言其余 10 项同名指标）；
  - D-18：golden.tolerances.analytic_crosscheck 无 r_true/r_meas 条目——analytic 档对该两类不设限
    （golden gate 档仍有 r_true 1e-12/r_meas 1e-9 约束；B-1 实际逐点 0/精确 4.0）；
  - D-19：run-g2 后端步为常驻步（非 SKIP 可选步）——stdio 形态无「后端不可达」态；HTTP 桥落地时
    改造为 RFC §5.3 v1.1 的 SKIP/`--require-backend` 语义。

## 4. 复核命令

```powershell
python tools/backend/py/fl001_analytic.py --self-check    # AC-1..AC-4
python tools/backend/py/fl001_ode_rk4.py --self-check     # RK-1..RK-3
node tests/backend-admission.test.js                      # 51/51
node tools/run-g2.mjs                                     # 18/18
```

**记录人**：实现 Agent，2026-10-30。
