# v0.3.1 补丁发布证据（2026-10-30，CHG-20261030-10）

> **授权**：用户 2026-10-30 指令「批准」（v0.3.1 补丁发布 + FL-19 增量三 + GT UI 正式化）。
> **性质**：补丁发布——承载 V0.3.0 之后的增补（GT-001 实现/勘误/性能门禁/后端对照桥），
> 无新物理模型、无架构重构、无 FC-001 升级；`not_performed` 三字段不变。

## 1. 本补丁内容（相对 v0.3.0，c3d82ea）

| 项 | 来源 | 摘要 |
|---|---|---|
| GT-001 实现 | CHG-20261030-09（V3-31/33） | f_channel_diff_Hz 信号改造（20 文件涟漪）、gt-energy-consistency/gt-bat-envelope PHY 检查、因果模板通道冗余叙事、L0b 标签+三假设+局限清单 |
| GT oracle/golden | 同上（V3-31） | gt001_oracle.py（更新序复刻，GS-1…6）+ gt001_v1 golden（5 Run，±1e-9 档）+ verify_golden 参数化 |
| FL-19 后端 | CHG-20261030-05/06/10（V3-12/增量一/二/三） | B-1/B-5 Python 后端 + 适配器 + createFromParts 组装层（scope 强制）+ golden-compare + **HTTP 桥 + compare 页「后端对照」面板（增量三，本次）** |
| 上游勘误 | CHG-20261030-09（V3-02） | V02_UPSTREAM_ERRATA.md（V0.1 四条 + V0.2 三条） |
| 性能门禁 | 同上（V3-03） | E2E 主旅程 ≤15000 ms（实测 7372/7556/7454）+ run-g2 duration 载体 |
| FL-001 裁定 | CHG-20261030-06（O-13） | load_step 删除（归档留痕） |
| GT UI 正式化 | 本次（D-26） | copy-guard 增四禁词（机组动态验证/电网稳定验证/一次调频验证/惯量验证）+ ALLOW「非机组/电网动态验证」否定语境——**33 模式 0 命中** |

## 2. 验证（本提交树实测）

| 门禁 | 结果 |
|---|---|
| `node tools/run-g2.mjs` | **23/23 PASS**（新增 verify_golden gt001 / engine-gt / backend-bridge 三步；duration 13340 ms） |
| copy-guard | 33 模式 exit 0 |
| oracle 自检 | gt001 GS-1…6 全过；引擎↔oracle **±1e-9 Hz**（engine-gt 69/69） |
| 桥安全边界 | 无令牌 403 / 外部 Origin 403 / 跨站 403 / 本机+令牌 200（13/13） |
| UI | qa shots 11 张重生成、控制台零错误；compare 页「后端对照」面板渲染 |

## 3. 发布清单

- 版本号：index.html meta、shell.js 品牌与帮助文案 → **V0.3.1**；README 标题同步。
- 标签：`v0.3.1`（随本提交打标推送）。
- 就绪性（R-01…R-10 增补视图）：许可 MIT 不变；证据包 v1 兼容（backend 字段为 manifest 展示面，
  run_hash 输入面零改动）；模型边界声明（L0/L0b + not_performed）全链保持。

## 4. 范围外（记录）

- FL-19 增量四：FMU 路线（Q-5 强制 model_manifest）、跨后端对照 UI 深化。
- GT-001 的 load_step/actuator golden 扩展轮（§9 恢复锚点定案后）。
- 评测轨对外评测场次（协议 v2 已批准，MVP 就绪）。

**记录人**：实现 Agent（CHG-20261030-10）。本文件为补丁发布证据，不构成模型验证/硬件验证。
