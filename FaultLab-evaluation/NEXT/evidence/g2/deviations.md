# deviations.md — 实现相对规格文本的偏差登记（G2 实施，2026-10-28）

> 依据 `MODEL_VALIDATION_SPEC.md` §10.2（"与 DECISIONS/评审的偏差记录，逐条可追溯"）。
> 原则：数值口径、事件语义、golden、容差零偏差；以下为实现层选择，均已在代码注释注明。

| # | 偏差 | 规格依据 | 处理 | 影响 |
|---|---|---|---|---|
| D-1 | `DerivedMetric.method` 枚举在 `analytic_flux/trapezoid/substep` 之外扩展 `algebraic/analytic` | DATA_CONTRACT_SPEC §2.6 枚举只有三个；但其附录 A 表格自身使用 `algebraic`（r_meas）与 `analytic`（focal_change） | 按 appendix 口径扩展枚举并在校验器放行；golden 断言仍仅用 `analytic_flux` | 低：附录与正文的自相矛盾按附录执行，后续 CHG 可统一 |
| D-2 | `run_hash` 输入中的 metrics 剥离 `source_run_ids` | G0-DEC-07 哈希输入含 `metrics`；DATA_CONTRACT_SPEC §4.2 要求"相同内容两次运行相同 run_hash" | `source_run_ids=[run_id]` 会让 run_id 间接入哈希，与 §4.2 冲突；故归属字段不入哈希（由 manifest 承担） | 低：run_hash 仍是内容校验和，可由证据包完整重算 |
| D-3 | `config.json`（证据包）= 契约 §2.1 字段面 + 实现字段（`systemId/fault/initial/noise`）超集 | §2.12 config.json=ScenarioConfig（规范化）；§8 迁移表要求 `run.config.fault.*` 保留 | 仅 §2.1 字段参与 `config_hash`；`fault` 为 truth_only 载荷、blind 投影严禁（bundle note 注明） | 低：导入重建需要 fault 语义；文档化于 bundle note |
| D-4 | golden `approval` 字段置 null，未预填批准值 | §6.2 "由 G2 执行时填写，不得预填虚构值" | 本轮为实施 Agent 产出，批准留待 Lead/用户 | 无 |
| D-5 | `ModelManifest.model_id/version`：FL-001 由原型 `fl.bess.l0/1.0.0` 改为契约 `fl001/fl001.1` | DATA_CONTRACT_SPEC §1.1/§2.1 | 旧 ID 属并行原型身份（G0-DEC-14），按契约重基线；FC/GT 保持旧 ID（冻结扩展，未重基线） | 无（golden/契约一致） |
| D-6 | 时间网格 `t[i]=i·dt` 保留 IEEE-754 原始乘积（t[199]=19.900000000000002） | MODEL_VALIDATION_SPEC §1.4 明文 | 移除旧实现的 `roundTime`（1e-6 舍入） | 无：与 golden 逐位同源 |
| D-7 | QualityChecks 同时携带契约字段（observed/expected/tolerance/reason/owner）与 UI 别名（label/computed_value/message） | §2.7 契约字段集 | 导出（checks.json）经 `FL.contract.toContractCheck` 投影为纯契约字段面；内存别名仅为零破坏 UI | 低 |
| D-8 | E2E 刷新恢复语义：整页刷新恢复 Run/页面，游标复位；跨页游标保持由 SPA hash 路由承载 | BACKLOG P0a-06 DoD "共享游标/选中/Run 跨页状态" | E2E 分别断言两条路径（深链刷新保 Run；SPA 导航保游标） | 无 |
| D-9 | 本轮未创建 GitHub Issue（计划文档 §5 的 I-01…I-16 为建议编号） | 计划文档 §10.5 | 以本证据包 + commit 记录代替 Issue 看板；编号映射见 evidence README | 流程层面 |

| D-26 | copy-guard 增四禁词（机组动态验证/电网稳定验证/一次调频验证/惯量验证）+ ALLOW「非机组/电网动态验证」否定语境（GT-001 tagline，G2b v1.1 条件 7） | GT UI 正式化（D-23 收尾）；33 模式 0 命中复核于 CHG-20261030-10 |
