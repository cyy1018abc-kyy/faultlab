# G4 实施证据包（2026-10-28）

> **性质声明**：本目录记录 P0b 质量工作（计划文档 I-08 完整版 / I-09 / I-10 / I-16，对应
> BACKLOG P0b-03/04/06/07）的实施与验证证据。全部为**内部一致性与文案合规性**证据；
> `model_validation=not_performed`、`hardware_verification=not_performed` 保持不变。
> UX 全量走查（P0b-01/02：设计系统/键盘焦点/拓扑检查器的人工走查记录）未在本轮展开，
> 见根 README §9 已知未完成项。

## 复跑命令

```powershell
node tools/run-g2.mjs          # 聚合 13 步（四件套 + G4 三测试 + 禁止词扫描 + 既有回归 + E2E）
node tools/copy-guard.mjs      # 禁止词扫描（UI_COPY_GUARDRAILS §6.3；命中 exit 1）
```

## 交付物与证据

| 项 | 交付物 | 证据 |
|---|---|---|
| I-08 完整版（P0b-03） | 因果图改画：删除 ⑤→⑥ 边，⑥ 改从 ② 测量通道虚线接入并标注"测量通道误差的功率当量"；⑥ 携带恒等分解式 + `epistemic='代数恒等'`；因果页锁定横幅（data-testid=causal-banner）；+4 kW 教学卡三量并列（0.04444/0.04278/+0.00167 + 代数恒等，仅 approved_p0 且 r_meas=4 kW 的 Run 显示数值）；全站禁止词清零 | `tests/causal-rules.test.js` 64 断言；`grep-copy.log` PASS |
| I-09（P0b-04） | `compareRuns` 白名单裁决：`verdict`（comparable/incomparable）+ `allowed_diffs`（fault / feedback_mode）+ `compatibility` 逐项；incomparable 时清空 findings、禁用差值图；两故障 Run 幅值不同、跨系统、load_step 等均 incomparable | `tests/compare.test.js` 27 断言（T-15/D-04/契约 §2.11） |
| I-10（P0b-07） | `src/core/scope.js`：SA-24 白名单分类（approved_p0/extension_preview）+ `assertApprovedP0` 门禁；manifest 与证据包携带 `scope`；golden 比对路径仅覆盖 approved Run | `tests/scope-guard.test.js` 24 断言 |
| I-16（P0b-06） | README 重基线：移除旧原型自检 PASS 数字表（不得作为验收证据）；补验证命令、模型边界、证据三级与 scope 说明；哈希/残差措辞对齐护栏 | 本目录 + 根 README git diff |
| 文案护栏 | `tools/copy-guard.mjs`（§6.3 的 Node 实现，29 禁止词模式）；src/** 全量命中清零（W-01…W-12 相关字符串改写：实测/逐位一致/校准/诊断延迟/多发/能量损失/防篡改等） | `grep-copy.log`（exit 0） |

## 聚合结果

`run-g2-report.json`：13/13 PASS（含 E2E 40 断言）。退出码 0。

## 偏差增补（接 evidence/g2/deviations.md）

| # | 偏差 | 理由 |
|---|---|---|
| D-10 | copy-guard 允许列表新增整串：`本页不做检测/定位/诊断，无检出率与延迟指标` | 该串为 UI_COPY_GUARDRAILS §3.1 逐字锁定的因果页横幅，本身含"检出率"否定语境（§6.1 否定句允许的原则性延伸） |
| D-11 | sealed 扫描剥离含 `sealed` 的标识符 token（truthSealed/truth_sealed/assertSealed 等）后再匹配 | 这些是 DECISIONS G0-DEC-11 与 docs/AGENT_PROTOCOL.md 命名的代码标识符/状态键，非用户可见表述；用户可见的 sealed 类宣称仍由禁止词规则约束 |
| D-12 | `verifyRunHash` 未纳入本聚合（属 registry.test.js 覆盖）；`qa.mjs` 旧 UX 断言未迁移 | BACKLOG P0b-05 允许"计划迁移，不沿用旧实现断言"；旧 qa 断言不得作为验收证据，故不纳入聚合门禁 |

## P1 增补（CHG-20261028-04，2026-10-28）

| 项 | 交付物 | 证据 |
|---|---|---|
| P1-02 | HTML 报告正式验收：§1.5 固定证据页脚（data-testid=export-footer）、ST-06 失败态措辞、假设 id+text 可追溯、转义/自包含/不可用断言 | `tests/report.test.js` 32 断言 |
| P1-06 | FC-001 修复清单闭环：A-valve-linear/A-ideal-limiter 假设、`tools/oracle/fc001_oracle.py`（SC-1…7）、`data/golden/fc001_v1.json`（已批准）、`scripts/verify_golden.py fc001`、`tests/engine-fc.test.js` 109 断言、UI 标注、W-10 正号 | `fc001-g2b-lite.md` + `verify_golden_fc001.log.json` + `fc001-golden-sha256.txt` |
| 走查 | P0b-01/02 自动化走查（qa ux 14/14、misc 9/9）+ 截图人工复核（委托） | `walkthrough-p0b01-02.md` |

聚合回归：`run-g2.mjs` **16/16 PASS**（含 E2E 40 断言、双 golden verify）。
FC-001 仍为 `scope='extension_preview'`（G2b-lite 口径，不进入 P0 验收）。
