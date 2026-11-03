# REFERENCE_LANDING_PLAN_v051 — 开源参考轨落地方案（v0.5.1 → v0.6.0）

> **性质**：执行计划文档（Lead 起草，2026-11-04）——外部输入《FaultLab 开源参考项目清单》v1.0
> （2026-11-04 生成，位于仓库外 deepseek-harness workspace，**入库与否待用户裁定**）向
> V05_ROADMAP v0.5.1/v0.6.0 队列的落地映射。
> **授权记录（2026-11-04，CHG-20261104-01）**：用户指令「按建议走」→ 本文档 v1 生效为参考轨
> 执行锚点，**三口径按建议项定案（DEC-R1/R2/R3）**。批次执行仍逐批次逐指令派发（I-4）；
> **批次 0 为用户侧动作，先于批次 1…3**。
> **输入**：参考清单 v1.0 ｜ `V05_ROADMAP.md` §2/§3/§5 ｜ `DECISIONS.md` CHG-20261102-01
> （A-1 完成 → D-2 依赖消除）｜ `V312_BACKEND_ADMISSION_CHECKLIST.md` ｜
> `RFC_MODEL_INTERFACE_I11_APPROVED.md` ｜ `FCEXT_G2B_SPEC_DRAFT.md` ｜ `SCOPE_SPLIT_MEMO.md`。

---

## 0. 设计目标与红线

参考清单的核心结论「**抄协议，不抄模型**」与本仓资产定位一致：借鉴对象是各项目的
**验收协议**（FMPy 字段检查、TEP 故障目录、SKAB 指标口径、simbench 场景版本），
不是仿真模型与数值。

五条执行红线（全程适用）：

1. **三标签不合并**：每个新增/扩展条目逐族回答 approved_p0 / approved_fc / extension_preview；
2. **零运行期依赖**（I-1）：FMPy/TESPy 等仅作验收/对照工具（开发机安装），运行期依赖零增量；
3. **oracle 独立性**（I-3）：任何 property/对照脚本不 import 产品代码；
4. **时间尺度隔离**：TEP（分钟级采样/小时级）与 SKAB 数值不得迁移进 FaultLab（0.1 s / 60 s 教学尺度）；
5. **措辞纪律**（I-5）：合成演示定位不变；禁词在非扫描目录（docs/、NEXT/）同样守住。

---

## 1. 三口径定案（按建议项执行）

### DEC-R1：R-1 故障族目录随 A-2 评审包提交（草案族显著标注「待批」）

- **决定**：`docs/FAULT_CATALOG.md` 与 FCEXT G2b 评审材料同包提交，不独立先行。
- **理由**：目录即评审材料——评审者逐族核对 scope 归属时可直接引用，避免评审后再补目录造成两轮往返。
- **替代选项**：目录先独立落地，评审材料后补引用。
- **后悔成本与撤回条件**：若 G2b 评审因草案族标注口径争议延期，可将目录拆出独立先行（成本低）。

### DEC-R2：R-3 property 测试落点 = oracle 侧五不变量；verify_golden / verify_bundle 保持确定性复核，不 property 化

- **决定**：五条不变量（§2 R-3）在 oracle 侧自写 stdlib property harness 覆盖；复核工具不动。
- **理由**：verify_golden/verify_bundle 是证据链复核器，字节冻结语义下 property 化会改动
  冻结证据链工具面，收益低、风险高（与 V-03 冻结语义冲突）。
- **替代选项**：连同 verify 工具全量 property 化（工作量翻倍）。
- **后悔成本与撤回条件**：verify 工具自身缺陷由既有确定性用例兜底；若后续发现复核盲区，
  再走独立 CHG 评估（可逆）。

### DEC-R3：D-2（oracle 统一接口）排入 v0.6.0 队列

- **决定**：统一 `OracleInterface` 基类 + golden schema v2（含 backend 信息）按路线图 D-2 执行，归位 v0.6.0。
- **理由**：A-1 完成（CHG-20261102-01）已消除路线图 §5 标注的「D-2 依赖 A-1」阻塞；
  gt001_v2 刚立 golden schema 演进先例（method_id/tier 制度），此时统一成本最低。
- **替代选项**：延至 v0.7 与 D-4 合并处理。
- **后悔成本与撤回条件**：若 A-2/A-3 先落，新 golden 会进一步扩大三 oracle 接口差异
  （成本中），故建议按本定案执行。

---

## 2. 任务卡

### R-0 参考登记制度（立即项——本 CHG 内已落地）

| 项 | 内容 |
|---|---|
| 对应参考 | 清单 §9 自荐（「逐条记录借了哪个思想、未复制代码、许可核实日期」） |
| 借 / 不借 | 借登记制度；不借任何代码 |
| 产出 | `docs/REFERENCES.md` v1（借项预填，许可「待核对」列空置待执行时回填） |
| 验收 | 每张任务卡交付时同步登记一条；grid-gym 10 分钟扫读结论并入 |
| 门禁 / 依赖 | 无 |
| 批次 | 0（已完成） |

### R-1 故障族目录（tep2py，P1）

| 项 | 内容 |
|---|---|
| 对应参考 | tep2py（TEP 21 预设故障的表格化定义） |
| 借 | 故障目录表格化字段：ID + 作用位置 + 类型（阶跃/漂移/卡死/随机）+ 幅值 + 注入时刻 |
| 不借 | 化工过程物理参数与阈值；TEP 时间尺度（分钟级采样/小时级仿真） |
| 产出 | `docs/FAULT_CATALOG.md` + 与 `SCOPE_SPLIT_MEMO.md` 的逐族 scope 映射表 |
| 覆盖范围 | FL-001 sensor_drift（approved_p0）；FC-001 sensor_drift（approved_fc）+ load_step/actuator_fault（**待批**，引 FCEXT_G2B_SPEC_DRAFT）；GT-001 sensor_drift/load_step/actuator_fault（extension_preview） |
| 验收 | 三系统现有族 + 草案族全覆盖；草案族显著标注「待批」不得暗示已授权；目录头部声明时间尺度隔离 |
| 用途 | **随 A-2 评审包提交（DEC-R1）**；后续白名单与 scope 守卫的挂载点 |
| 门禁 / 依赖 | 无（文档）；措辞守红线 5 |
| 批次 | 1 |

### R-2a Q-5 准入字段表（FMPy，P1）

| 项 | 内容 |
|---|---|
| 对应参考 | FMPy（modelDescription.xml 校验字段 + 能力位） |
| 借 | 准入字段表：变量名/类型（Real/Integer/Boolean/String）/单位/初始值/因果性（input/output/parameter）+ 能力位（canGetAndSetFMUstate、canHandleVariableCommunicationStepSize 等）+ doStep 时序语义（set→doStep→get、事件时刻插值） |
| 不借 | FMPy 模型库/GUI/内置求解器；不进运行期依赖 |
| 产出 | `FaultLab-evaluation/NEXT/Q5_ADMISSION_FIELD_TABLE.md`（对照 V312_BACKEND_ADMISSION_CHECKLIST 逐项差异登记） |
| 验收 | 字段表可直接作为 fmu_admission 机检实现依据；与 V312 清单差异逐条登记（含「V312 已有/缺失/口径不同」三态） |
| 备注 | **不需要 FMU 样本**（D-28 不阻塞本卡） |
| 门禁 / 依赖 | 无（文档）；Q-5 准入语义变更（如有）另走 CHG |
| 批次 | 1 |

### R-2b FMPy 交叉验证——开发夹具（P1，视网络）

| 项 | 内容 |
|---|---|
| 对应参考 | FMPy（`simulate_fmu()` 独立 oracle） |
| 借 | 「同一 FMU、独立实现、逐点比对」的 oracle 纪律 |
| 不借 | FMPy 运行期依赖；其结果**不得用于关闭 D-28** |
| 产出 | `FaultLab-evaluation/NEXT/evidence/q5/fmpy-crosscheck.md`（FMPy 自带示例 FMU 在 FMPy 与 fmu_runner.py ctypes 骨架下的逐点比对记录） |
| 定性 | **开发夹具去风险**：在 D-28 真样本到达前预演 ctypes doStep 时序坑；真样本验收仍独立走 V312 |
| 门禁 / 依赖 | `pip install fmpy`（开发机验收工具）；github 直连间歇抖动（重试 3~8 次口径） |
| 批次 | 3 |

### R-3 不变量 property 测试（Hypothesis 思想，P1）

| 项 | 内容 |
|---|---|
| 对应参考 | Hypothesis（property + 自动最小化反例） |
| 借 | 把定义恒等式写成 property；shrinking 给出最小反例的**思想** |
| 不借 | hypothesis 库本身（Python 第三方）——stdlib 自写固定种子 harness，保离线可跑 |
| 落点 | **oracle 侧（DEC-R2）**：`tools/oracle/properties/`，五条不变量：① FL-001 `E_gen + E_bat == 0.5 kWh`（`P_gen := P_load − P_bat` 定义域内）；② 健康 Run `r_true == 0`（任意参数组合）；③ pre 左极限 == post 前一采样点；④ `config_hash` 键序不敏感；⑤ Run 创建后改参不改 `run_hash` |
| 不动 | verify_golden / verify_bundle（DEC-R2）；JS 引擎侧仍走逐位 golden 比对，不动架构 |
| 验收 | 固定种子可复现；反例最小化打印；不 import 产品代码（oracle 纪律）；结论登记进证据目录 |
| 门禁 / 依赖 | 无 |
| 批次 | 2 |

### R-4 I-11 对照附录（PowerGridworld，P2）

| 项 | 内容 |
|---|---|
| 对应参考 | PowerGridworld（接口三分法 + seed/配置固化） |
| 借 | 接口边界决策表：Plant 暴露多少状态 / Sensor 是否允许直读 Plant 内部 / Controller 输出是动作还是设定值 |
| 不借 | RL episode/reset 语义；为训练服务的观测空间设计 |
| 产出 | `RFC_MODEL_INTERFACE_I11_APPROVED.md` 对照附录 |
| 定性 | **已批准 RFC 的补强附录**（非变更，不重开门禁）；如对照引出需改裁定的问题，先请示再动 |
| 门禁 / 依赖 | 无 |
| 批次 | 1 |

### R-5 指标口径草案（SKAB，P2，P1 隔离）

| 项 | 内容 |
|---|---|
| 对应参考 | SKAB（点级/区间级指标 + leaderboard 基线思路） |
| 借 | 指标体系（点级/区间级双口径、检测延迟、误报率）与「无对照不出百分比」原则 |
| 不借 | 特征工程与阈值（水泵 ≠ 储能）；实测 benchmark 分数与「内部一致性 PASS」并列 |
| 产出 | `docs/METRICS_P1.md`，**文档头显著标注「P1 才启用，不进产品」**，与 pre/post 事件卡口径对齐 |
| 门禁 / 依赖 | 无（文档）；P1 实际启用另走 G2b/口径裁定 |
| 批次 | 3 |

### D-2 oracle 统一接口（路线图既有项，A-1 已解锁）

| 项 | 内容 |
|---|---|
| 内容 | 统一 `OracleInterface` 基类（RUNS/simulate_run/self_check 签名归一）+ golden schema v2（含 backend 信息） |
| 依据 | DEC-R3；路线图 §5 依赖已消除（CHG-20261102-01） |
| 产出 | `tools/oracle/` 接口归一 + golden schema v2 规格 |
| 门禁 | G7（工具层，不涉新物理） |
| 批次 | 3（v0.6.0 队列） |

---

## 3. 错位修正登记（相对清单原 8 步落地顺序）

| 原步骤 | 修正 | 理由 |
|---|---|---|
| 步 4 TESPy（GT 独立对照） | **缓至 A-4** | GT-001 当前为单机等效频率响应模型（L0b，摇摆方程），无压气机/燃烧室/透平热力状态可对照——清单自身 hedge 正中此情形；稳态自洽检查在 L1 引入热力学扩展时才有意义。届时产 `evidence/gt/tespy-independent-case.md`（GPL-3.0 只看设计与算例，不复制代码） |
| 步 1 FMPy | **拆 R-2a / R-2b** | 字段表不需要 FMU 样本可先行；交叉验证受 D-28 样本与网络阻塞，用示例 FMU 夹具部分去风险且不关闭 D-28 |
| 步 7 Hypothesis | **借思想不引库** | hypothesis 为 Python 第三方依赖，与 oracle 脚本 stdlib 纪律冲突；固定种子自写 harness 可达成同等回归价值 |
| 步 6 simbench | **缓至 B-1** | 系统分层 RFC 仅在扩展拓扑（PV-001）启动时产出 |
| 步 2 tep2py | **提前至批次 1** | 故障目录直接服务 A-2/A-3 G2b 评审（DEC-R1） |

---

## 4. 批次计划

```text
批次 0（用户侧动作，先于一切——本计划不构成其授权）
  ├─ A-1 commit 指令（工作树 14 文件 + gt001_v2 已就绪）
  ├─ A-2 FC 扩展 G2b 双路评审 + 批准（附 R-1 目录）
  ├─ A-3 FL-001 actuator_fault G2b
  └─ V05_ROADMAP 正式批准

批次 1（文档轨，无门禁，批次 0 之外可并行）
  ├─ R-1 FAULT_CATALOG.md（随 A-2 评审包）
  ├─ R-2a Q5_ADMISSION_FIELD_TABLE.md
  └─ R-4 I-11 对照附录
  （R-0 REFERENCES.md 已于 CHG-20261104-01 落地）

批次 2（测试轨）
  └─ R-3 oracle property harness（五不变量）

批次 3（证据/架构轨，视外部依赖）
  ├─ R-2b FMPy 夹具交叉验证
  ├─ D-2 oracle 统一接口（v0.6.0 队列）
  └─ R-5 METRICS_P1.md 草案

缓办登记（挂后续阶段）
  └─ TESPy→A-4 ｜ simbench→B-1 ｜ uPlot/SingleFile→P1-05 ｜ D-3→D-28 真样本
```

**版本归属**：v0.5.1 = R-0（已落地）+ R-1 + R-4；v0.6.0 = R-2a + R-3 + D-2 +（R-2b 夹具先行）；
P1 隔离 = R-5（不占版本位）。

---

## 5. 验收与回归

- 每卡交付时：`docs/REFERENCES.md` 同步登记（借项 + 未复制代码声明 + 许可核实日期）；
- 回归不受影响：本计划全部为文档/工具侧产出，引擎、golden、UI 零改动；
  交付时例行 `node tools/copy-guard.mjs`（33 模式 0 命中）确认；
- 证据落位：R-2b/R-3 证据进 `FaultLab-evaluation/NEXT/evidence/`，文档进 `docs/`，
  规格进 `NEXT/`，与现有目录分工一致。

## 6. 风险登记

| # | 风险 | 缓解 |
|---|---|---|
| 1 | github 直连间歇抖动 → R-2b/许可核对受阻 | 重试 3~8 次口径；许可核对可延至各卡执行时，不阻塞文档卡 |
| 2 | R-1 草案族被误读为已授权 | 「待批」显著标注 + 显式引用 FCEXT_G2B_SPEC_DRAFT；目录头部加授权状态列 |
| 3 | R-3 自写 harness 与 hypothesis 行为差异 | 不追求完整 shrinking；固定种子 + 最小反例打印即达验收线 |
| 4 | D-2 与 A-2/A-3 golden 扩展轮时序冲突 | 若 A-2/A-3 先落，D-2 规格需吸收新 golden 命名（在 D-2 卡执行前复核一次） |

---

**文件结束**。REFERENCE_LANDING_PLAN v1（2026-11-04，CHG-20261104-01 批准）。
批次执行逐批次逐指令派发；本计划不构成批次 0 的授权。
