# REFERENCES — 外部参考登记

> **性质**：参考登记制度（REFERENCE_LANDING_PLAN_v051 §2 R-0，CHG-20261104-01 建立）。
> **规则**：每借鉴一个外部项目的思想，逐条登记「借了哪个思想、未复制代码、许可核实日期」。
> 许可列「待核对」的，在该思想实际进入实现/证据前必须核对仓库 `LICENSE` 并回填日期。
> **来源清单**：《FaultLab 开源参考项目清单》v1.0（2026-11-04，仓库外 deepseek-harness
> workspace；入库与否待用户裁定）。

| 项目 | 许可 | 核实状态 / 日期 | 借鉴的思想 | 未复制代码声明 | 关联任务 |
|---|---|---|---|---|---|
| FMPy | 待核对 | 待核对 | modelDescription 准入字段表 + 能力位 + doStep 时序语义；`simulate_fmu()` 作独立 oracle 纪律 | 仅验收工具，不进运行期依赖 | R-2a / R-2b |
| tep2py（TEP） | 待核对 | 待核对 | 故障目录表格化字段（ID/作用位置/类型/幅值/时刻）；故障**类型**可映射、**数值**不可迁移 | 仅目录格式参考 | R-1 |
| SKAB | 待核对 | 待核对 | 点级/区间级双口径指标 + 「无对照不出百分比」原则 | 仅指标口径草案，P1 隔离 | R-5 |
| TESPy | GPL-3.0 | 待核对 | 声明式部件组织；稳态自洽检查方法论 | 只参考设计与算例，不复制代码进 MIT 仓库 | 缓办→A-4 |
| PowerGridworld | 待核对 | 待核对 | Plant/Sensor/Controller 接口三分法；seed + 配置固化旁证 | 仅接口对照附录 | R-4 |
| simbench | 待核对 | 待核对 | 拓扑/元件与时间序列/场景两层拆分 | 仅分层 RFC 参考 | 缓办→B-1 |
| PythonFMU | 待核对 | 待核对 | FMU 导出契约模板（FmuBase 接口）；元数据清单反向校准准入字段 | 仅在决定支持导出时参考（P3） | 未排期 |
| uPlot | MIT | 待核对 | 交互标尺的手感边界；「数据与视图分离」同构确认 | 仅交互参考，不换 SVG 渲染 | 缓办→P1-05 |
| Hypothesis | MPL-2.0 | 待核对 | property + 最小化反例思想（不引库，stdlib 自写固定种子 harness） | 仅思想，库不引入 | R-3 |
| SingleFile | AGPL-3.0 | 待核对 | 单文件内联边界清单（字体 base64/data URI/CSS url() 重写/file:// 限制） | 不并入；仅坑清单参考 | 缓办→P1-05 |
| grid-gym | NOASSERTION | 待核对 | replay + fault injection + 盲测的 API 组织方式，与 `blind_observable`/`truthSealed` 互相印证 | 仅阅读，不引入依赖，不作成熟度依据 | R-0 附注 |

**登记纪律**：

1. 本表只登记「思想级」借鉴；任何代码级参考（哪怕片段）必须在引入前走 CHG 裁定；
2. GPL-3.0 / AGPL-3.0 项目：设计、算例、清单可看，代码不复制（MIT 仓库隔离）；
3. NOASSERTION 项目：仅阅读，不引入、不作为成熟度或对标依据；
4. 「待核对」回填时同时登记核实人（用户 / 实现 Agent）与核实方式（LICENSE 文件直读）；
5. 参考清单本体更新（v1.x）时本表随 REFERENCE_LANDING_PLAN 修订走 CHG。

## 执行记录（每卡交付时同步登记；许可列维持「待核对」不回填）

| 日期 | 任务 | 交付物 | 取证方式（只读） | 许可核实 |
|---|---|---|---|---|
| 2026-11-04 | R-2a（FMPy） | `FaultLab-evaluation/NEXT/Q5_ADMISSION_FIELD_TABLE.md` v1（字段表 + §2 能力位 + §3 doStep 时序 + §4 对照 V312 三态表 28 条 + §5 机检落点草案） | GitHub API 直读 `CATIA-Systems/FMPy` main@`e42e288f` 三文件（`src/fmpy/model_description.py` / `validation.py` / `simulation.py`）逐行摘录；未引入代码/依赖，未执行任何 FMU | 维持待核对（旁注：GitHub API 元数据 spdx_id=NOASSERTION，非核实记录） |
| 2026-11-04 | R-4（PowerGridworld） | `FaultLab-evaluation/NEXT/RFC_MODEL_INTERFACE_I11_APPROVED.md` §11 对照附录（接口三分法决策表 + 不借边界 + 结论：不改任何裁定） | GitHub API 直读 `NREL/PowerGridworld` main@`82ead57d`（README + `gridworld/base.py`）；未引入代码/依赖 | 维持待核对 |
| 2026-11-04 | R-5（SKAB） | `docs/METRICS_P1.md` v1 草案（点级/区间级双口径 + 检测延迟 + 误报率 FAR/MAR；文档头显著标注「P1 才启用，不进产品」；§2 与 pre/post 事件卡口径对齐；§5 与内部一致性检查不得并列宣称） | GitHub API 直读 `waico/SKAB` README（v0.9 标签列 anomaly/changepoint、leaderboard 指标 F1/FAR/MAR、评价窗在变化点右侧）；未引入代码/依赖 | 维持待核对（旁注：GitHub API 元数据 spdx_id=GPL-3.0，非核实记录；即便属实也只借口径不复制代码） |

**文件结束**。REFERENCES v1.1（2026-11-04；v1 基础上追加 R-2a/R-4/R-5 执行记录）。
