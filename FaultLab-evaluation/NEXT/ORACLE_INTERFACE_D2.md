# ORACLE_INTERFACE_D2 — oracle 统一接口与 golden schema v2 规格（v1.0）

> **状态**：v1.0 交付稿（W1-1 / D-2a）。生效依据：`NEXT/V060_WAVE_DESIGN.md`（APPROVED）
> §2 波次 1 W1-1 + §3 DEC-A（采推荐项），批准记录 `FaultLab-evaluation/DECISIONS/DECISIONS.md`
> `CHG-20261104-05`（:793-807）。规格 ratify 随波次 1 G7 复验（W1-5）。
> **机制层实现**：`tools/oracle/oracle_base.py`（纯 stdlib；自检 `python -I tools/oracle/oracle_base.py`）。
> **基线**：main @ `f1e5e78`；本文行号引用均以该基线文件内容为准。
> **W1-1 范围声明**：本波**不改任何既有 oracle 文件**、不改 `scripts/verify_golden.py`、
> 不改 `src/**`（ask 约束）；oracle_base.py 为机制层（契约 + 共享助手），不接物理 import——
> FC/FL 物理接入与各自 golden 重出同轮（§5.1），GT 文档化符合迁移挂起（§5.2）。

---

## 0. 目的与裁定摘要

- **目的**：把库内三个独立 oracle（fl001/fc001/gt001）与 `scripts/verify_golden.py` 消费的
  事实上接口抽取为事实清单（§1），归一为面向后续 oracle 的契约（§2），并给出 golden
  schema v2 规格（§3）与共享机制层 `oracle_base.py` 的提供面（§4）。
- **DEC-A 分层落地**（V060 §3，CHG-20261104-05 采推荐项）三条裁定：
  1. **FC/FL**：物理 import oracle_base 与各自 golden 重出同轮（fc001 → W1-2、
     fl001 → W2-1；DEC-B 保 id 重出），零额外重出——本波仅登记画像（§5.1）；
  2. **GT-001**：gt001_oracle.py **不动文件**，以「文档化符合」登记（§5.2 差异豁免清单），
     **物理迁移挂起到 GT golden 下次重出时点**——V-03 字节语义下改写即报废
     gt001_v2 冻结锚点（sidecar `c50315c9…`，A-1 / CHG-20261102-01 批准口径）；
  3. **机制层**：oracle_base.py 不含模型公式/容差判据，不与任何 oracle 或 engine
     共享公式常量（MODEL_VALIDATION_SPEC §6.3 独立性声明类推）——独立性不变式
     「golden 只能由独立 oracle 生成、engine 只读比对」不因接口统一而弱化。

---

## 1. 事实接口抽取（基线 f1e5e78）

### 1.1 三 oracle × verify_golden 签名矩阵

| 成员 | fl001_oracle.py | fc001_oracle.py | gt001_oracle.py | verify_golden.py 消费 |
|---|---|---|---|---|
| `RUNS` | :131-135，3×`{key, role, feedback_mode, faulted}` | :65-69，同 fl001 构造 | :64-83，6×`{key, role, feedback_mode, family, faulted, magnitude, unit, inertia_model[, t_clear_s]}` | :196 按 `"key"` 线性查找取 spec |
| `SERIES_IDS` | :60-65 模块常量，含 `"t"` | :57-63 模块常量，含 `"t"` | **无模块常量**（simulate_run 内局部元组 :139-143，含可空列 `P_gen_cap_kW`，入 golden 前剔除 :442） | 间接（经 golden 序列面 :233-243） |
| `simulate_run` | `(spec)` :144 | `(spec)` :118 | `(spec, inertia=None)` :109（第二位置参数=双轨变体覆盖，GS-8 用） | :201 以 **spec dict** 调用 |
| 返回面 | `{key, role, feedback_mode, faulted, series, events, scalars, metrics}` :266-275 | 同构 :214-216 | `{series, integrals, metrics, scalars, events}` :323-324（**无 key/role；多 integrals**） | `series`/`scalars`/`metrics`/`events`（:233-287） |
| `self_check` | → `(ok, checks)`，SC-1…SC-6 :291-377 | → `(ok, checks)`，SC-1…SC-7 :229-311 | → `(ok, checks)`，GS-1…GS-8 :327-423 | V-04 :183-189（失败 ⇒ exit 2） |
| `_oracle_source_sha256` | `oracle_source_path()`（目录+固定文件名，:446-448）+ 文件字节哈希 :451-453 | 同构 :371-378 | `os.path.abspath(__file__)` 直哈希 :86-89 | V-03 :165-168、输出面 :296 |
| `build_golden` 元数据 | 内含 `generated_by`（`generated_at: None` 占位，:431-437）+ `approval`（三字段全 None，:438-442）；tolerances **无 tier**（:383-393） | 同构（:360-367）；另有顶层 `basis` :358；tolerances 无 tier（:314-320） | **不含** `generated_by`/`approval`（由 `emit()` 填充，:492-506）；`tolerances.gate.tier="T-A"` :469-474；`supersedes` :452 | `tolerances.gate` :191 |
| 模型/方法版本样式 | `model_version="fl001.1"` :414；`method_version="analytic_flux.1"` :418 | `model_version="1.0.0"` :341；`method_version="analytic_flux.1"` :345 | `model_version="1.1.0"` :449；`method_version="2"` :454 | 不校验样式 |
| CLI | `--self-check` / `--summary` / 默认打印 golden :456-472 | `--self-check` / 默认打印 golden :381-387 | `--self-check` / `--emit` / `--print-json` / 默认打印 doc :516-540 | — |
| golden 写盘通道 | 仅经 `emit_golden.py`（唯一写盘入口，二进制 LF） | 同左 | **自带 `emit()`**（文本模式写盘，:507-513） | 只读 |

### 1.2 verify_golden.py 消费面（契约的下界）

| 校验项 | 行 | 语义 |
|---|---|---|
| V-01 | :143-154 | golden 存在且可解析 |
| V-02 | :156-163 | sidecar 首空白 token == golden 文件实际字节 SHA-256（小写比较） |
| **V-03** | :165-168（docstring :14） | `golden.generated_by.oracle_source_sha256 == oracle._oracle_source_sha256()`——**oracle 源文件自身字节哈希** |
| V-03b | :170-181 | approval 摘要 = 剥离 `generated_by`/`approval` 后 `json.dumps(ensure_ascii=False, indent=2)` 的 SHA-256 |
| V-04 | :183-189 | `oracle.self_check()` 全 pass |
| V-05 | :203-216（KEY_POINTS :71） | 按 `oracle.RUNS` 取 spec → `oracle.simulate_run(spec)` → 关键点比对 |
| V-06…V-09 | :218-287 | 标量 / 序列（`series_limit` :91-106）/ 指标（`metric_within` :109-120）/ 事件 pre/post |
| golden 文件名 | :61、:128 | gt001 条目覆写 `gt001_v2.json`；其余默认 `<model>_v1.json` |

### 1.3 差异清单（F-1…F-8，§2 契约与 §5 豁免的对照基础）

- **F-1** RUNS spec 字段面：fl/fc 4 字段 vs gt 8 字段（family/magnitude/unit/inertia_model/t_clear_s）。
- **F-2** `simulate_run` 第二位置参数：仅 gt001 有（`inertia` 变体覆盖）。
- **F-3** 返回面：key/role 仅 fl/fc；`integrals` 仅 gt001。
- **F-4** `SERIES_IDS` 模块常量：fl/fc 有；gt001 无（局部元组）。
- **F-5** golden 元数据装配：fl/fc 两段式（build_golden 占位 + emit_golden.py:41 回填
  `generated_at`）vs gt001 一段式（`emit()` 现填 `generated_by`+`approval`）。
- **F-6** `tolerances.gate.tier`：仅 gt001 有（"T-A"，ALINE §3 先例）；fl/fc 无 tier 字段。
- **F-7** 版本样式：`model_version` "fl001.1"/"1.0.0"/"1.1.0" 三种；`method_version`
  "analytic_flux.1" vs "2"。
- **F-8** 写盘通道与换行：emit_golden.py 二进制 LF vs gt001 `emit()` 文本模式
  （Windows 实测 CRLF，见 §6）。

### 1.4 源文件哈希实测（本次 W1-1 执行时点，2026-11-04）

| 文件 | SHA-256（自身字节） |
|---|---|
| `tools/oracle/oracle_base.py` | `a6099aa3fa8c0b678a7ed6781dd85015a0e904c9f449ce11c695a4a0f24d2cbb` |
| `tools/oracle/fl001_oracle.py` | `134ad1465e9e1eaba74d334ebac59731492d9ab777ef6882ea58bb2d33bef668` |
| `tools/oracle/fc001_oracle.py` | `d5e7347dec10e2355097606288c8860b69b858abd710935b7ab8ab18d8850967` |
| `tools/oracle/gt001_oracle.py` | `fc4449bd1d2406c0c0c80cbd523465dafb7df177a96d3f69cf45bcd66f7584e9` |

（来源：oracle_base.py 自检 `v03_semantics.file_sha256` 与 `oracle_base_sha256` 字段，
见 §7 验收记录。fl/fc 处于并发在途波次（W1-2/W2-1），其哈希随各自波次推进而变化属预期；
gt001 冻结（DEC-A），其哈希变更即为 §5.2 迁移触发信号。）

---

## 2. 归一契约（OracleInterface）

`tools/oracle/oracle_base.py` 以 `OracleInterface` 类承载契约（机制基类，无模型语义；
模块式 oracle 以同名模块成员满足、类式 oracle 以子类满足）。归一成员：

| 成员 | 归一签名/形态 | 兼容要求 |
|---|---|---|
| `RUNS` | `list[dict]`，每 spec 必含唯一 `"key"`(str) 与 `"role"` | 其余字段模型自定（F-1 差异合法） |
| `SERIES_IDS` | `list[str]`，须含 `"t"` | golden 比对面以 build_golden 实际序列为准；gt001 缺常量为已登记豁免（§5.2） |
| `simulate_run` | `(run_key_or_spec, **overrides)` | 第一参数经 `resolve_run_spec` 归一：**str = RUNS 的 key（归一式）；dict = spec（verify_golden.py:196-201 现行式兼容面）**；overrides = 变体覆盖（先例 F-2：gt001 `inertia`）。返回必含 `series`（含 `"t"` 列）/`scalars`/`metrics`，`events` 必含（V-09 消费） |
| `self_check` | `() -> (ok, checks)` | check 记录面 = `check_record`：`{check_id, status, observed, tolerance, note}`（三 oracle rec() 同构） |
| `_oracle_source_sha256` | `() -> str` | **V-03 语义：本 oracle 源文件自身字节的 SHA-256**（模块 docstring 承诺；OracleInterface 默认实现按 `ORACLE_FILENAME` + 定义目录解析，走 `oracle_source_sha256()`） |
| `build_golden` | `() -> dict` | golden schema v2（§3） |

> **签名规格化解释（登记）**：V060 §2 W1-1 行内记「`simulate_run(run_key, t)`」；其第二参数
> 在库内唯一实例是 gt001 的变体覆盖（`inertia`，gt001_oracle.py:109），不存在名为 `t` 的
> 参数先例。本规格将第二参数归一为变体覆盖 `**overrides` 并保留 spec-dict 兼容面——
> 与 W1-1「归一签名」意图一致，登记为规格化解释而非设计偏离。

**V-03 语义 docstring（契约第一条款，oracle_base.py 模块头与 `oracle_source_sha256()`
docstring 双重承诺）**：`_oracle_source_sha256()` = 该 oracle 源文件**自身字节**的 SHA-256；
emit 侧写入 `generated_by.oracle_source_sha256`，verify 侧（scripts/verify_golden.py:165-168）
以当前文件字节重算严格比对。语义锚点是文件字节——不是对象序列化、不是 normalize 后文本。
oracle 侧归一 idiom：`return oracle_source_sha256(os.path.abspath(__file__))`。

---

## 3. golden schema v2 规格

> 字段面对齐 gt001_v2 元数据风格（gt001_oracle.py:445-481 build_golden + :492-513 emit），
> 容差 tier 制度引用 `NEXT/ALINE_MODEL_DEPTH_DESIGN.md` §3。

### 3.1 字段面

| 字段 | 类型/取值 | 语义 |
|---|---|---|
| `golden_schema_version` | `"v2"` | schema 制度版本（与 golden_id **正交**，见 §3.5） |
| `golden_id` | str | 稳定 id；模型/方法变更 → 新 id（GT 判据，V060 §1.2 / ALINE §4.5）；保 id 重出仅限 DEC-B 口径（引擎行为零变更的原地扩容） |
| `model_id` | str | 对齐 gt001_v2（`"GT-001"`）；fl/fc 现行顶层同名字段沿用 |
| `model_version` | str | 对齐 gt001_v2 三段式样式（`"1.1.0"`）；F-7 的遗留样式（"fl001.1"/"1.0.0"）在各自重出轮归一 |
| `method_id` | str | 方法变更 → id 变更（gt001 `"gt001_swing_dt0.01"` 先例） |
| `method_version` | str | 遗留样式（"analytic_flux.1"）重出轮归一为分段式 |
| `engine_baseline` | `null` | 保持 v1 语义：独立 oracle 无引擎基线（fl001_oracle.py:416） |
| `generated_by` | `{tool, python_version, command, oracle_source_sha256, generated_at}` | **`oracle_source_sha256` = V-03 语义；`generated_at` = emit 时点 UTC ISO（"Z" 后缀）**。v2 一段式（gt001 先例）：不得以 null 占位出境——v1 两段式（build_golden 内 `generated_at: None`）是发射前中间态 |
| `approval` | `{approved_by, approved_at, approved_golden_sha256}` | 三字段块必填且三值非 null 方可写盘（§3.3；v2 收紧项——v1 允许全 None 占位经 emit_golden 落盘） |
| `backend` | `null` 或对象 | **规格留位、暂不填充**（§3.4） |
| `tolerances` | `{gate: {…, tier}, [analytic_crosscheck], [convergence]}` | 沿 v1 面；`gate.tier` 必填（§3.2） |
| `runs` / `sampling` / `units` / `config` / `event_encoding_version` | 沿 v1 | 字段面以各自 oracle 为准 |
| 可选扩展位 | 沿 v1 先例 | `supersedes`（gt001_oracle.py:452）/ `basis`（fc001_oracle.py:358）/ `metrics_note`（gt001_oracle.py:476-479）/ run 级 `series_note`（gt001_oracle.py:443） |

### 3.2 容差 tier 制度（引用 ALINE_MODEL_DEPTH_DESIGN §3）

- 制度文本：`NEXT/ALINE_MODEL_DEPTH_DESIGN.md` §3（:75-93）——**T-A 算子复刻**（±1e-9 逐点，
  更新序伪代码冻结；跨实现散差超限 → 降 T-B 并登记）、**T-B 方法等价**（按最慢极点时间常数
  标定，先例 ~1e-4）、**T-C 数值参考**（收敛阶估计，tol = max(截断估计)·安全系数≥10）。
- schema v2 落地面：`tolerances.gate.tier` 必填（`"T-A"|"T-B"|"T-C"`，gt001_v2 :470 先例）；
  **T-C 时同级必附 `convergence` 块**（步长序列 + 外推误差）。
- `verify_golden.py` 按 tier 分派判据属 A 线 §3 落地面（现实现等价 T-A 硬编码，参数化待
  该落地时点）——本规格只定义字段面，不改 verify_golden（W1-1 范围声明）。

### 3.3 approval 三字段与 V-03b 摘要

- 三字段块：`approved_by` / `approved_at` / `approved_golden_sha256`
  （构造器 `oracle_base.approval_block`；组装器 `apply_approval` = emit_golden.py:55-61 同构）。
- 摘要算法（V-03b 语义，三处现行实现同构：emit_golden.py:45-52 / gt001_oracle.py:484-489 /
  verify_golden.py:170-181）：对剥离 `generated_by`/`approval` 后的内容取
  `json.dumps(ensure_ascii=False, indent=2)` UTF-8 SHA-256——与 `generated_at` 无循环。
- v2 收紧：写盘 golden 的 approval 三值必须非 null（未批准不落盘）；approval 重签随
  golden 重出轮执行（DEC-B 口径，CHG 预分配：fc001_v1→CHG-20261104-06、
  fl001_v1→CHG-20261104-07，DECISIONS.md:806-807）。

### 3.4 backend 信息块——规格留位、暂不填充

- **现状事实**：库内不存在 backend golden 实例；现行四个 golden 全部为独立 oracle 直出
  （`engine_baseline: null` 同语义）。
- **留位规格**（启用须显式 CHG 并回填本节）：

  ```json
  "backend": null
  ```

  启用时替换为对象，预留字段面：`adapter`（产生 golden 的后端适配器 id，如 B-1 analytic /
  B-5 RK4）、`engine_version`、`provenance`（backend 侧哈希/命令）。
- **本波处置**：emit 时不写入该字段（或写 null）；`verify_golden.py` 不校验；oracle_base
  机制层不提供 backend 字段的构造助手。

### 3.5 正交性与采纳时点

- **golden_id 代（v1/v2 文件代）≠ golden_schema_version（schema 制度代）**：现行四个
  golden 文件（fl001_v1 / fc001_v1 / gt001_v1 存档 / gt001_v2）的 `golden_schema_version`
  全部为 `"v1"`——gt001_v2 的 "v2" 是 golden_id，不是 schema 版本。
- 采纳规则：**新 golden（新 id）默认 v2**；保 id 重出（DEC-B）是否升 v2 由当轮 CHG 裁定
  （波次 1/2 的 fc001_v1 / fl001_v1 重出保持 v1 字段面即可——approval 重签与 schema 升级
  解耦，避免与 V-03 字节语义纠缠）。

---

## 4. oracle_base.py 提供面（机制层）

| 能力 | 实现 | 对应 ask 项 |
|---|---|---|
| V-03 语义源码哈希 | `oracle_source_sha256(path)`（docstring 承诺语义）+ `OracleInterface._oracle_source_sha256` 默认实现 | (a) |
| approval 三字段块 | `approval_block`（构造器，校验 64 位 hex）/ `apply_approval`（组装）/ `approval_payload_digest`（V-03b 算法） | (b) |
| golden+sidecar 写盘 | `write_golden_with_sidecar`（二进制 LF 钉死 + sha256sum 两空格式 sidecar，V-02 兼容） | (c) |
| emit 脚手架 | `emit_golden(build_golden_fn, path, tool, command, oracle_path, approved_by=None)`（generated_by 占位回填 + 可选 approval + 写盘 + 摘要，镜像 emit_golden.py:103-158 与 gt001_oracle.py:492-513 公共骨架） | (d) |
| 契约与探针 | `OracleInterface` / `CONTRACT_MEMBERS` / `CONFORMANCE_REGISTRY` / `contract_report` / `resolve_run_spec` / `check_record` | §2 / §5 / §7 |

**不提供**：模型公式、容差判据、tier 分派逻辑（归各自 oracle 与 verify_golden）、
backend 字段助手（§3.4）。**不 import**：src/**、三个 oracle 模块（仅 __main__ 探针按
注册表动态 import，见 §7）。

---

## 5. DEC-A 分层落地登记（CHG-20261104-05）

### 5.1 FC/FL：legacy 基线 → 物理接入与各自重出同轮

- **本波（W1-1）状态**：不动文件（ask 约束）；oracle_base.py 探针以 `legacy` 模式登记
  两者画像（强校验面 = 契约成员在场 + V-03 语义；字段面仅记录——数值与字段门禁归
  verify_golden 与各自波次）。
- **接入时点与动作**（届时执行，零额外 golden 重出）：
  - `fc001_oracle.py` → W1-2（FC-G2b-02，fc001_v1 5 Run 重出，DEC-B 保 id）；
  - `fl001_oracle.py` → W2-1（FLEXT-G2b-01/02，fl001_v1 4 Run 重出，DEC-B 保 id）；
  - 动作清单：`import oracle_base` → `simulate_run` 首参接 `resolve_run_spec`（str 归一式 +
    spec dict 兼容式）→ 写盘/批准改走 `write_golden_with_sidecar` / `apply_approval`
    （与 emit_golden.py 现行实现同构，替换为零行为差）→ 自检与 golden 数值逐位不变
    （V-01…V-09 复验绿，W1-2/W2-1 验收行原文）。

### 5.2 GT-001 裁定登记：文档化符合、迁移挂起（DEC-A）

> **裁定**（V060_WAVE_DESIGN §3 DEC-A，采推荐项；批准记录 DECISIONS.md
> `CHG-20261104-05` :793-807）：`gt001_oracle.py` **本波不动文件**；对 §2 归一契约以
> **「文档化符合」**登记（差异豁免见本节清单），其物理迁移（import oracle_base +
> 签名归一）**挂起到 GT golden 下次重出时点**，届时与 golden 重出同轮执行，零额外重出。

- **理由**（V060 §3 DEC-A 原文口径）：V-03 字节语义（scripts/verify_golden.py:165-168）下，
  物理改写 `gt001_oracle.py` 必然改变其文件字节 → 现行 `gt001_v2.json` 的
  `generated_by.oracle_source_sha256`（= `fc4449bd…`，§1.4）失配 → V-03 失败 →
  **A-1 刚批准冻结的 gt001_v2 锚点报废重出**（sidecar sha `c50315c97521b6aa…`，
  data/golden/gt001_v2.json.sha256；A-1 / CHG-20261102-01 批准口径；V060 §1 :41-42 明示）；
  而接口统一的目标（新 oracle 按统一契约生长）由 FC/FL 完全达成——物理统一 GT 的收益
  仅为美学。
- **差异豁免清单**（gt001 ↔ §2 契约，oracle_base.py 探针 `documented` 模式全量画像断言）：

  | 契约面 | gt001 现状 | 豁免口径 |
  |---|---|---|
  | `simulate_run` 归一签名 | `(spec, inertia=None)`（F-2） | 符合：第一参数为 spec dict（= 兼容面）；第二位置参数即 `**overrides` 变体覆盖的库内先例 |
  | 返回面（F-3） | 无 key/role、多 integrals | 豁免：verify_golden 仅消费 series/scalars/metrics/events，key/role 非必需 |
  | `SERIES_IDS`（F-4） | 无模块常量 | 豁免：迁移时点提升为常量（清偿动作） |
  | golden 元数据两段式（F-5） | `build_golden` 不含 generated_by/approval，`emit()` 一段式现填 | 豁免：恰为 §3.1 v2 一段式先例 |
  | 写盘换行（F-8） | `emit()` 文本模式（§6 CRLF 事实） | 豁免：gt001_v2 字节冻结不改；迁移时点归一 |

  已符合面：RUNS 契约面 / `self_check` 记录面 / `_oracle_source_sha256` V-03 语义 /
  `tolerances.gate.tier`（§3.2 先例）/ build_golden 存在性。
- **迁移触发条件**（满足其一即启动，随当轮 CHG 派发）：
  1. GT-001 模型/方法变更 → 新 golden_id（G2b 判据，与重出同轮）；
  2. `verify_golden.py` 按 tier 参数化改造波及 gt001 条目（ALINE §3 落地面）；
  3. D 线后续工作项显式要求 GT 物理接入。
- **清偿动作清单**（迁移时点执行）：import oracle_base → simulate_run 首参接
  resolve_run_spec（保留 inertia 变体位）→ SERIES_IDS 提升为模块常量 → 写盘归一
  `write_golden_with_sidecar`（LF）→ build_golden 补 generated_by 占位或改 emit 脚手架
  一段式 → 自检与 golden 数值逐位不变（V-01…V-09 + engine-gt 双 golden 复验绿）。
- **迁移债**：一项，低（V060 §3 DEC-A「后悔成本」原文：GT 迁移债一项，登记在案）。

---

## 6. 写盘与换行事实登记（F-8 佐证）

实测（本次 W1-1，2026-11-04，`od -c` + `hashlib`）：

- `data/golden/gt001_v2.json` = **CRLF**（首字节 `{\r\n`；gt001_oracle.py:508-509 文本模式
  `open(..., "w", encoding="utf-8")` 在 Windows 默认 newline 翻译所致）；
- `data/golden/fl001_v1.json` / `data/golden/fc001_v1.json` = **LF**（emit_golden.py:66-69
  二进制写）；
- 三者 sidecar 均对**实际字节**自洽（V-02 :156-163 语义；gt001_v2 sidecar =
  `c50315c97521b6aa948d78d263597fae347d9268df949b99fa57e18189431dac`）。

处置：gt001_v2 字节冻结不动（DEC-A）；`oracle_base.write_golden_with_sidecar` 钉二进制
LF；后续任何经 base 的写盘均 LF；gt001 迁移时点起其写盘归一（§5.2 清偿动作）。

---

## 7. 自检与验收

- **命令**：`python -I tools/oracle/oracle_base.py`（`-I` 隔离模式：不读 PYTHON*、不加
  script 目录到 sys.path——探针在 `__main__` 内显式注入本目录）。
- **输出**：JSON 契约自检摘要；**exit 0 = 通过 / 1 = 失败**。
- **构成**：
  1. 机制自测 T-1…T-8（系统临时目录内，零仓库写入）：V-03 语义已知向量、approval 块
     键序与非法输入拒绝、V-03b 摘要语义（剥离面 + generated_at 无循环）、apply_approval
     组合、写盘字节规范（LF 钉死 + sidecar 两空格式 + V-02 读回）、emit 脚手架端到端、
     resolve_run_spec 双形态、契约默认源码哈希；
  2. 契约探针（`CONFORMANCE_REGISTRY`，不调用 simulate_run/self_check——数值面归
     verify_golden V-04…V-09）：严格度按 DEC-A 分层——
     `physical` 全量强校验；`documented`（gt001，冻结）全量强校验；`legacy`（fl/fc，
     在途）成员在场 + V-03 语义强校验、其余仅记录。注册模块不可导入记为
     unavailable（info，不计失败——其门禁归 verify_golden 与各自波次）。
- **验收记录（本次实跑，2026-11-04，Python 3.9.6）**：
  `python -I tools/oracle/oracle_base.py` → exit **0**，`"ok": true`；机制自测 8/8 pass；
  探针 3/3 available 且 ok——fl001/fc001（legacy）成员在场 + V-03 语义 pass、
  `recorded_only_deltas` 为空；gt001（documented）全量画像与登记一致（SERIES_IDS=False、
  `simulate_run_params=["spec","inertia"]`、run_keys 6 项、`gate_tier="T-A"`、
  build_golden 无 generated_by/approval、V-03 语义 pass）。
- **既有门禁回归（补充证据，非 W1-1 验收项）**：三模型 verify_golden 于本波文件状态
  复跑通过（fl001 / fc001 / gt001 exit 0）——证明本波未扰动既有 golden 证据链。

---

## 8. 迁移债与风险登记

| 项 | 等级 | 处置 |
|---|---|---|
| GT 迁移债（gt001 未物理接入 base） | 低（DEC-A 原文） | §5.2 挂起登记 + 触发条件 + 清偿动作清单 |
| `simulate_run(run_key, t)` 签名转写 | — | §2 规格化解释登记（第二参数 = overrides 变体覆盖） |
| 并发波次下 legacy 字段面漂移（W1-2 RUNS 3→5 / W2-1 3→4、model_version 升版） | 预期 | 探针 legacy 模式仅记录不强校验；门禁归 verify_golden 与各自波次验收行 |
| schema v2 采纳时点 | 逐轮 CHG | §3.5：新 golden 默认 v2；保 id 重出升级由当轮 CHG 裁定 |
| verify_golden 尚不解析 tier 分派 | 已知 | ALINE §3 落地面（T-A 硬编码等价，参数化待该时点）；本波不改 verify_golden |
| gt001_v2 CRLF 字节形态 | 事实 | §6 登记；字节冻结不动；迁移时点归一 LF |
