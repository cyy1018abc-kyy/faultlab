# v0.4.0 发布证据（2026-10-31，CHG-20261031-02）

> **授权**：用户 2026-10-31 指令「批准」（v0.4.0 发布规划 + 六工作项全部授权）。
> **性质**：minor 版本——新功能首次进入发布物（GT-001 正式化、FC-001 正式化、后端对照框架、
> 评测轨框架、FMU 准入层）；无架构重构、无 breaking change、EvidenceBundle v1 兼容。
> `not_performed` 三字段不变。

## 1. 发布内容（v0.3.1 → v0.4.0）

| 项 | 来源 | 摘要 |
|---|---|---|
| FC-001 升正式 | CHG-20261030-12（V3-04） | model_version 1.1.0、scope=approved_fc、golden 重发、SA-24 不含 FC |
| GT-001 正式化 | CHG-20261030-09（V3-31/33） | f_channel_diff_Hz 通道差改造、gt001_v1 golden 六 Run ±1e-9、GT PHY 检查、因果模板通道冗余叙事、L0b 标签 |
| FL-001 load_step 删除 | CHG-20261030-06（O-13） | 归档留痕 |
| FL-19 后端对照框架 | CHG-20261030-05/06/09/10（增量一/二/三） | B-1/B-5 Python 后端 + HTTP 桥 + createFromParts + golden-compare + 对比页「后端对照」面板 |
| FMU 准入层 | CHG-20261030-11（W-3/Q-5） | fmu_admission.py（FS-1…3）+ fmu_runner.py ctypes 骨架 |
| 评测轨框架 | CHG-20261030-09/10/11 | 协议 v2 + arena-protocol.js + gen/session/verify CLI + 17 条负例 + 首场次归档 |
| 上游勘误 | CHG-20261030-09（V3-02） | V02_UPSTREAM_ERRATA.md |
| 性能门禁 | CHG-20261030-09（V3-03） | E2E ≤15000 ms + run-g2 duration 载体 |
| FL-001 load_step 删除 | CHG-20261030-06（O-13） | 归档留痕 |
| UI 三档标注 | CHG-20261031-02（W-1/W-2） | 首页系统卡三档：基准实验/已验收（1.1.0）/扩展预览（L0b） |

## 2. 验证摘要

| 门禁 | 结果 |
|---|---|
| `node tools/run-g2.mjs` | **25/25 PASS**（含 verify_golden 三 golden + engine-gt 90 + engine-fc 109 + bridge 13 + 准入 66 + 协议负例 42 + perf 步 + E2E 40 断言） |
| copy-guard | 33 模式 exit 0 |
| 全测试套件 | 全绿（16 个 .test.js 文件全过） |
| FMU runner 自检 | FR-1…3 pass |
| 评测场次 | eval-session-001 归档（3 参赛、score_hash 落章） |
| perf | E2E 7280 ms ≤ 15000 ms |

## 3. 发布清单

- 版本号三处同步：**V0.4.0**（index.html meta / shell.js 品牌×3 / README 标题）。
- 标签 `v0.4.0`。
- README §1 范围行改 v0.4.0 minor + 发布内容全列。
- `evidence/g8/v040-release.md`（本文件）。

## 4. 范围外

- FC-001 的 load_step/actuator_fault 扩展（各自 G2b 未启动）。
- FL-001 actuator_fault 升正式（G2b 未启动）。
- L1 数值模型（PyBaMM 等科学建模纵深——Q-4 守卫）。
- 服务端/云/账户/排行榜（永久不做）。
- B-2/B-3 依赖 import（许可证待核实——Q-4 守卫 2）。
- FMU ctypes doStep 实际运行（D-27/D-28：待实际 FMU 样本）。

## 5. 范围升级摘要（v0.3.1 → v0.4.0 scope 变更）

| 系统 | v0.3.1 | v0.4.0 | 变更 |
|---|---|---|---|
| FL-001 | approved_p0 | approved_p0 | 不变（load_step 家族删除） |
| FC-001 | extension_preview | **approved_fc** | V3-04 升正式（V3-04 CHG-20261030-12） |
| GT-001 | extension_preview | extension_preview | 不变（G2b 规格已批但实现属增补轮——V3-33 已完成代码改造，正式化待后续 UI 增补轮定案） |

**记录人**：实现 Agent（CHG-20261031-02）。本文件为 minor 发布证据，不构成模型验证/硬件验证。
