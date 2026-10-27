# FC-001 G2b-lite 评审记录（P1-06 修复清单闭环，2026-10-28）

> **批准依据**：CHG-20261028-04（用户 2026-10-28 指令「听你的；开」批准 P1-06 开工）。
> **性质**：P1-06 的**前置修复清单闭环**与 G2b-lite 记录；FC-001 仍为 `scope='extension_preview'`，
> 不进入 P0 验收，不与 FL-001 混验。本记录不构成模型验证。

## 修复清单逐项（DECISIONS G0-DEC-15 / BACKLOG P1-06）

| # | 前置条件 | 状态 | 证据 |
|---|---|---|---|
| 1 | SOC 末值修正：`SOC_true_end=59.4755556%`、`SOC_est_end=59.5866667%`（含 τ_fc 过渡尾项，非稳态近似） | ✅ | oracle SC-7 精确核对（`tools/oracle/fc001_oracle.py`）；`tests/engine-fc.test.js` 引擎逐点对 golden |
| 2 | 假设清单 4 项：恒压电堆（A-const-v）/ 阀%→电流线性映射（**A-valve-linear，新增**）/ 电池与变换器限幅（**A-ideal-limiter，新增**）/ SOC 估计器=EMS 平衡估算（A-fc-soc-est） | ✅ | `src/core/systems.js` FC001.model.assumptions（9 项）；报告与模型抽屉可引用 |
| 3 | UI 标注「燃料电池 L0 行为演示，不含电化学/效率/健康模型」 | ✅ | `FC001.tagline` 已追加该句（首页系统卡可见） |
| 4 | 独立 golden（与 FL-001 等价口径） | ✅ | `data/golden/fc001_v1.json`（601 点 ×3 Run + 事件 + 指标；`analytic_flux.1`；oracle 源码哈希与批准记录在 golden 内）；`python scripts/verify_golden.py fc001` exit 0 |
| 5 | oracle 独立性（不 import `src/**`、不共享常量、自带自检） | ✅ | `fc001_oracle.py` SC-1…SC-7 全过（Simpson/RK4/恒等式/细网格能量/事件相位/网格有限性/批准数值核对） |
| 6 | W-10 措辞（与 FL-001 方向相反，禁止"同 FL-001 结构"） | ✅ | SOC_err=**+0.11111 pp**（估计放电偏少→估计 SOC 偏高），`tests/engine-fc.test.js` 断言正号 |

## 关键口径声明（G2b-lite 裁决内容）

1. **SOC 估计器口径**：FC-001 的 `SOC_est` 是 EMS 平衡估算 `P_bat,est = P_load − P_fc,meas`
   （假设 A-fc-soc-est），**不是**电池电流库仑积分；其偏差来自测量链，方向与 FL-001 相反。
   golden 同时记录 `E_bat_est_kWh` 与 `E_bat_true_kWh` 两个口径，禁止混用。
2. **容差**：与 FL-001 同 gate（E ±1e-6 kWh / SOC ±1e-5 pp / rtol 1e-12）——因为实现采用
   含 τ_fc 过渡尾项的**精确闭式解**，未使用"稳态近似 + 0.01 pp"的放宽路径。
3. **范围**：FC-001 三族故障中本轮仅 golden 化 `sensor_drift`（默认场景）；
   `load_step`/`actuator_fault` 仍为扩展预览（无 golden，不进入验收）。
4. **模型身份**：保持 `fc.pem.l0 / 1.0.0`（冻结预览身份，未按 fl001 模式重编版本号；
   若日后 FC 升正式验收，须升 `model_version` 并重建 golden——走 CHG）。

## 验证命令

```powershell
python tools/oracle/fc001_oracle.py --self-check   # SC-1…SC-7，exit 0
python scripts/verify_golden.py fc001              # exit 0（V-01…V-09）
node tests/engine-fc.test.js                       # 109 断言，引擎逐点对 golden
```
