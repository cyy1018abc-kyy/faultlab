# V060_WAVE_DESIGN — v0.5.1 → v0.6.0 实现波次设计（golden/oracle 收口波）

> **性质**：阶段设计文档（Lead 起草，2026-11-04）——V05_ROADMAP（已批准，CHG-20261104-04）
> 生效后的第一实现波：把 A-2/A-3 两张已批准的 G2b 规格落到 oracle/golden/系统登记，
> 同波完成 D-2 oracle 统一接口与参考轨可并行动作。
> **授权记录**：用户 2026-11-04 指令「进入下一阶段的方案设计」——本文档为 DRAFT 待批；
> 批准后生效为该波实现锚点（各工作项仍逐 CHG + 门禁派发）。
> **输入**：`FCEXT_G2B_SPEC_APPROVED.md` v1.1 ｜ `FLEXT_G2B_SPEC_APPROVED.md` v1.1 ｜
> `V05_ROADMAP.md`（批准版）｜ `REFERENCE_LANDING_PLAN_v051.md` ｜ `scripts/verify_golden.py` ｜
> `src/core/scope.js` ｜ `tools/run-g2.mjs` ｜ 双路评审记录（CHG-20261104-02/03）。
> **状态**：`APPROVED`（2026-11-04，CHG-20261104-05）——用户指令「统一采用推荐决策，采用并发
> 多个子智能体来加速任务」→ 五项决策（DEC-A…E）全采推荐项，实现波（W1-1…W2-7）授权开工，
> 以动态工作流并发子智能体执行；CHG-20261104-06（波次 1/v0.5.1）、CHG-20261104-07
> （波次 2/v0.6.0）预留给实现与发布登记；golden approval 重签引用号按此预分配。

---

## 0. 阶段定位与边界

**阶段目标**：把「已批准未实现」清零——FC 扩展两族与 FL actuator 一族的 oracle/golden/登记
全链落地，D-2 接口统一同波收敛，参考轨文档/测试动作并行推进；产出 v0.5.1（波次 1）与
v0.6.0（波次 2）两个发布。

**本阶段不做**（边界外，另行排期）：
- C-2 场景编排器（最大新 UI 面积——建议 v0.6.x 第二波，DEC-D）；
- C-3 教学路径、C-4 排行榜、B-1 PV-001、A-4 L1 数值模型；
- D-3 FMU doStep（等 D-28 真样本）；R-2b FMPy 夹具视网络可选执行；
- GT-001 任何模型变更（gt001_v2 刚冻结，本波不动 GT oracle/golden——见 DEC-A）。

---

## 1. 事实基础：三条承重约束（本设计的推导起点）

### 1.1 约束一：V-03 语义 = oracle 字节变更强制 golden 重出

`scripts/verify_golden.py` V-03 检查 `golden.generated_by.oracle_source_sha256 == 当前 oracle
源码 sha`（verify_golden.py:165–167）。**任何 oracle 文件字节变更（含加一行 import、挪动
注释）都使该系统 golden 立即失效（exit 非 0）**。推论：

1. FC/FL oracle 扩展与其 golden 重出**必须同轮同 CHG**，不存在「先扩 oracle 后补 golden」的中间态；
2. **D-2 若物理改写 gt001_oracle.py，将迫使刚冻结的 gt001_v2 重出**（A-1 锚点 sha c50315c9…
   报废、字节 churn）——D-2 必须分层落地（DEC-A）；
3. verify_golden 的 `--emit` 路径（oracle --emit 生成 golden）是重出的唯一正道，
   approval 三字段按 FCEXT §4 表 4 / FLEXT §2 项 4 口径重签。

### 1.2 约束二：FC load_step 级联是唯一数值难点——oracle 须复刻子步更新序

引擎 foStep（engine.js:443–450）为「子步常目标解析步」：

- FC load_step：I_fc_ref 目标**每子步移动**（指数趋近），常目标假设产生 O(dt) 尾差——
  实机 60 s 值 74.999995 A vs 连续闭式 75.0（评审人 A 三法交叉已证）。**fc001_oracle 的
  load_step 解析段必须按子步递推复刻级联更新序（对标 gt001_oracle「更新序冻结」先例），
  不得直接采用连续闭式解**，否则 V-07（601 点 rtol 1e-12）必挂；
- FL actuator：t ≥ t_start 后 target = min(25, 13.75) = 13.75 **恒定** → 闭式解与引擎逐位一致
  （实机 13.750000000000036，fp 求和噪声级）→ 闭式可用；
- FC actuator / FL·FC sensor：目标恒定 → 闭式可用（现状 oracle 已是此口径）。

### 1.3 约束三：scope 白名单是钉扎场景集，两处实现期裁定项

- **FL（SA-24）**：`APPROVED.families=['none','sensor_drift']` 且钉扎参数
  （duration/dt/t_start/bias_A/initial）（scope.js:11–23）——FL actuator 入 approved_p0 路径
  须扩 families 并钉 actuator 参数（magnitude=55），且后端适配器
  （fl001_analytic.py:60–61 / fl001_ode_rk4.py:50–51 硬限）同步扩，方为四路径一致（DEC-C）；
- **FC（approved_fc 分支）**：classify 的 FC 分支同样钉
  `family ∈ {none, sensor_drift}`（scope.js:37–43）——FC-G2b-04 须裁定新两族是否入
  approved_fc 分支（推荐：入，条件式扩族不改钉扎参数；不入则 FC 新族 UI 长期挂
  extension_preview 与「FC 扩展正式化」的版本目标矛盾）。

---

## 2. 波次设计

### 波次 1（v0.5.1）——golden 轨：D-2 分层落地 + FC 扩展实现

| # | 工作项 | 内容 | 产出/验收 | 规模 |
|---|---|---|---|---|
| W1-1 | **D-2a oracle 统一接口（分层）** | 新建 `tools/oracle/oracle_base.py`：`OracleInterface` 契约（RUNS / simulate_run(run_key, t) / self_check / SERIES_IDS / `_oracle_source_sha256` 归一签名）+ golden schema v2 规格段（元数据对齐 gt001_v2 风格：model_version/method_id/tier/approval 三字段；backend 信息块**规格留位、暂不填充**——无 backend golden 场景）。**FC/FL oracle 物理接入 base（与各自重出同轮）；GT 不动文件，以「文档化符合」登记（DEC-A），迁移挂起到下次 GT golden 重出时点** | `NEXT/ORACLE_INTERFACE_D2.md`（规格）+ oracle_base.py + FC/FL import 接入 | M |
| W1-2 | **FC-G2b-02** | fc001_oracle.py：级联子步递推（§1.2）+ actuator 钳位闭式 + RUNS 3→5（healthy/sensor 闭环/sensor monitor/load_step/actuator）+ SERIES_IDS 增 I_fc_ref_A/I_fc_cap_A/valve_cmd_pct/valve_meas_pct + self_check SC-8+（锚点复算 + 级联尾差自检 ≤6e-6 域声明）→ `--emit` 重出 **fc001_v1（5 Run）**：model_version 1.0.0→1.1.0、method→analytic_flux.2、approval 重签（引本波 CHG）——FCEXT §4 基座勘误一次性落齐 | verify_golden fc001 新 run 面 100% pass；旧 3 Run 数值逐位不变（V-05/06/07 复验） | M |
| W1-3 | **FC-G2b-04** | systems.js：closedLoopEffect 级联措辞、A-fc-dispatcher assumption、EQ-6 登记、I_fc_ref_A formula 一般式、limitations 越界域声明（+20kW→30kW 等）、层级标签 L0 复核；**FC approved_fc 分支扩族裁定落地（§1.3 约束三，DEC 附随）**；engine-fc.test.js Run 键扩展（10 处）；FAULT_CATALOG §5 挂载 | 全测试套件绿；copy-guard 0；catalog 勘误表更新 | S–M |
| W1-4 | **C-1 对外场次指南** | EVAL_TRACK_GUIDE.md v2：公开场次流程（组织方角色与 reveal 管理 / 报名 / 统一盲包 / score_hash 公示 / 成绩单导入导出）——v0.5.1 路线图既定项；不实现云功能（I-1） | 指南文档 + 流程走查记录 | S |
| W1-5 | **G7 复验 + v0.5.1 发布（G8）** | run-g2 全量（24 步，含三系统 verify_golden）+ e2e/perf；发布证据 `evidence/g8/v051-release.md`；tag v0.5.1 | 发布门全绿 | S |

### 波次 2（v0.6.0 wave 1）——FL/工具轨：FL actuator 实现 + R-3 + 参考轨

| # | 工作项 | 内容 | 产出/验收 | 规模 |
|---|---|---|---|---|
| W2-1 | **FLEXT-G2b-01/02** | fl001_oracle.py：actuator 闭式段（13.75 + 11.25·e^(−u/0.4) + SOC 全窗积分 1054.5 A·s）+ **monitor 分支按 family 守卫**（现 :82–83 无条件返回 25 A 的陷阱）+ RUNS 3→4 + SERIES_IDS 增 I_bat_cap_A + self_check 增 SC-8（锚点 SOC=59.7070833%）+ 闭环/monitor 等价断言→ `--emit` 重出 **fl001_v1（4 Run）**：approval 重签（引本波 CHG） | verify_golden fl001 全 pass；旧 3 Run 逐位不变 | M |
| W2-2 | **FLEXT-G2b-04** | systems.js：A-fl-clamp assumption + A-l0 双轨 τ 修订（「经过验证」句式）+ EQ-A/EQ-B 登记 + I_ref_A formula 一般式化 + limitations（退化域 load0≤20、手拼配置可破包络）+ checks.js:137–138 采样文案订正；tests/engine.test.js：**actuator 闭环 vs monitor 逐位断言**（series+metrics，排除 label/role/effective_mode）+ Run 键扩展（10 处）；tests/backend-admission.test.js Run 键（4 处）；FAULT_CATALOG §5 挂载 | 全测试套件绿；等价断言双向过 | M |
| W2-3 | **白名单 CHG（DEC-C，用户批准点）** | scope.js APPROVED.families 增 'actuator_fault'（钉 magnitude=55）+ 后端适配器 actuator 支持（B-1 解析钳位 / B-5 RK4 同式，均 ≤20 行）；SA-24 红线由本 CHG 显式解除并登记；backend-admission.test.js 增 actuator 对照 | scope-guard.test.js 扩展绿；后端 actuator Run 与引擎逐位/容差内一致 | S |
| W2-4 | **R-3 property harness** | Python 侧 `tools/oracle/properties/property_harness.py`（stdlib、固定种子）：五不变量之模型侧三条（E_gen+E_bat=0.5 kWh 定义域内 / r_true≡0 任意参数 / pre 左极限=post 前采样）经**oracle 独立实现**批量参数扫描；Node 侧 hash 不变量（config_hash 键序不敏感 / run_hash 创建后冻结）以测试用例并入 tests/registry.test.js（**不新增 run-g2 步**，DEC-E）；反例最小化打印 | 固定种子可复现；结论登记证据目录；不 import 产品代码（Python 侧） | M |
| W2-5 | **参考轨文档** | R-2a `Q5_ADMISSION_FIELD_TABLE.md`（FMPy 字段表 × V312 对照差异表，无需 FMU 样本）+ R-4 I-11 对照附录（PowerGridworld 三分法决策表）+ R-2b FMPy 夹具交叉验证（**视网络可选**，不关闭 D-28）+ R-5 METRICS_P1 草案（P1 隔离标注）+ REFERENCES.md 同步登记 | 四份文档/证据 + 登记回填 | M |
| W2-6 | **D-1-lite 评估** | run-g2 步数预算评估稿（本波后 ≤25 步）：分拆 run-core/run-extended 或 Node worker 并行的建议稿（不实施——v0.6.x 议题） | 评估稿 | S |
| W2-7 | **G7 复验 + v0.6.0 发布（G8）** | run-g2 全量 + 发布证据 `evidence/g8/v060-release.md`；tag v0.6.0 | 发布门全绿 | S |

---

## 3. 设计决策点（推荐制，待用户裁定）

### DEC-A：D-2 分层落地——FC/FL 物理接入 + GT 文档化符合（推荐）
- **推荐**：oracle_base.py + FC/FL import（与重出同轮，零额外重出）；gt001_oracle.py **不动**，
  以 conformance 声明登记，迁移挂起到 GT golden 下次重出时点。
- 理由：V-03 强制（§1.1）——物理统一 GT 将报废 gt001_v2 锚点（A-1 刚批准的 sha 进 CHG），
  收益仅为美学；接口统一的目标（新 oracle 按统一契约生长）由 FC/FL 完全达成。
- 替代：全量统一（含 GT）——代价 gt001_v2 重出 + engine-gt 双 golden 复验，无行为收益。
- 后悔成本：GT 迁移债一项（登记在案，低）。

### DEC-B：golden 原地扩容——fc001_v1/fl001_v1 保 id 重出（推荐）
- **推荐**：保 id、字节重出 + sidecar 重签 + approval 重签（引本波 CHG）；旧字节 sha 在 CHG
  证据中留档（退役声明）。
- 理由：两系统引擎行为零变更（引擎不动），「模型变更→新 id」的 GT 判据（gt001_v1→v2）
  不适用；新 id 会无谓制造 v2/v3 层级与 verify 参数化改动。
- 替代：新 id（fc001_v2/fl001_v2）——语义更保守但制造双重验证负担与引用更新面。
- 后悔成本：若后续发现 FC 级联 oracle 有误需重出，原地口径下再次重出即可（可逆，低）。

### DEC-C：FL 白名单 CHG 随波次 2 执行（推荐）
- **推荐**：W2-3 一并扩 scope.js families + 后端适配器 actuator 支持，SA-24 红线显式解除。
- 理由：FLEXT 已批准（G2b 门开），「批而不用」窗口每延一个版本，UI（extension_preview 标签）
  与 Arena 池（已含 actuator）的口径差就多一个版本的解释成本；后端适配器改动 ≤20 行。
- 替代：暂缓白名单（actuator 维持 extension_preview）——保守，但「extension_preview」标签
  与已批规格并存，教学呈现矛盾。
- 后悔成本：白名单扩大后若发现 actuator 教学缺陷，回调需反向 CHG（中——但规格已经
  双路评审+实机复算背书，风险低）。

### DEC-D：C-2 场景编排器后置 v0.6.x 第二波（推荐）
- **推荐**：本波不做；golden 轨清零后，以独立设计稿进入 v0.6.x。
- 理由：最大新 UI 面积 + 依赖评测轨稳定；与 golden 收口波无依赖关系，并行只会稀释注意力。
- 替代：纳入波次 2 骨架——工期 +1 波，回归面扩大。

### DEC-E：run-g2 步数预算 ≤+1（推荐）
- **推荐**：R-3 Node 侧并入既有测试文件（registry.test.js 增用例），Python 侧 harness 作为
  run-g2 单一新步（24→25）；D-1-lite 评估稿随波次 2 交付。
- 理由：D-1 判定的维护阈值压力下，步数增长须有预算；property 断言本质是回归用例，
  并入既有文件符合既有组织。
- 替代：property 独立步 ×2（24→26）——清晰但加速触顶。

---

## 4. 预期失效面与回归预算

| 面 | 变化 | 兜底 |
|---|---|---|
| fc001_v1 | 字节/sha 变更（f518c7bc… 退役）、oracle sha 更新、approval 重签、3→5 Run | W1-2 同轮重出 + CHG 退役登记；旧 3 Run 数值逐位不变复验 |
| fl001_v1 | 字节/sha 变更（6a0c751f… 退役）、approval 重签、3→4 Run | W2-1 同轮重出 + CHG；同上 |
| gt001_v2 | **零变更**（DEC-A） | verify_golden gt001 35/35 持续绿 |
| 测试 | engine-fc（10 键）、engine.test（10 键 + 等价断言）、backend-admission（4 键）、scope-guard（白名单） | 各工作项内扩展 |
| 引擎 | **engine.js 零改动**（两波均只动 oracle/golden/systems 登记/文案） | 归档局重放零影响；盲包 closed-world 不受扰 |
| run-g2 | 24 → ≤25 步（DEC-E） | D-1-lite 预算 |
| copy-guard | systems.js 新增文案须过 33 模式 | 各 G7 复验内含 |
| 评测轨 | 族池现状（FC/FL actuator 已在池）无变化；新盲包可抽新族——**gen 侧无门禁变化，盲包内容随目录自然扩展** | score_hash 口径不变；对外场次按 C-1 指南执行 |

---

## 5. 排期与门禁

```text
波次 1（v0.5.1）：W1-1 D-2a → W1-2 FC-G2b-02 → W1-3 FC-G2b-04 → W1-4 C-1 指南 → W1-5 G7+G8
  （W1-4 可与 W1-1…3 并行；每项逐 CHG 派发）
波次 2（v0.6.0 wave 1）：W2-1 → W2-2 → W2-3(DEC-C) → W2-4 → W2-5（并行） → W2-6 → W2-7
门禁：每工作项 CHG 留痕；波次末 G7（run-g2 全量）→ G8（发布）；两波之间无硬依赖
  （波次 2 的 verify_golden fl001 不受波次 1 影响——fl001_oracle 不在波次 1 触碰面）
```

## 6. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | FC 级联子步递推与引擎 fp 求和顺序不一致 → V-07 rtol 1e-12 挂 | 复刻 foStep 更新序 + telescoping 积分口径（gt001 先例）；SC-8 尾差自检 ≤6e-6 域声明 |
| 2 | fc001_v1 重出后发现旧 Run 数值漂移（oracle 改动意外波及） | W1-2 验收含旧 3 Run 逐位不变断言；漂移即停 |
| 3 | 白名单扩大后 SA-24 相关负例（scope-guard N 例）失配 | W2-3 内同步负例期望值 |
| 4 | R-2b/R-5 网络依赖阻塞波次 | 标记可选；不阻塞 G7/G8 |
| 5 | D-2 分层造成 FC/FL 与 GT 接口漂移 | conformance 声明 + 迁移挂起登记；D-1-lite 评估稿含清偿建议 |

## 7. 待用户决策清单

| # | 决策 | 推荐 |
|---|---|---|
| DEC-A | D-2 分层（GT 文档化符合）vs 全量统一 | 分层 |
| DEC-B | golden 原地扩容 vs 新 id | 原地 |
| DEC-C | FL 白名单 CHG 随波次 2 | 执行 |
| DEC-D | C-2 后置 v0.6.x | 后置 |
| DEC-E | run-g2 步数预算 ≤+1 | ≤+1 |

---

**文件结束**。V060_WAVE_DESIGN v1（2026-11-04，DRAFT）。批准后按 §5 排期逐项派发；
本设计不构成任何工作项的实现授权。
