# Q5_ADMISSION_FIELD_TABLE — FMU 准入字段表（R-2a，FMPy 对照）

> **任务卡**：REFERENCE_LANDING_PLAN_v051 §2 R-2a（批次 1；v0.6.0 版本归属）。对应外部参考
> FMPy（FMI 2.0/3.0 的 Python 实现与验证工具）。
> **性质**：文档轨产出（无门禁）；本表作为 **fmu_admission.py 未来机检扩展的实现依据草案**，
> 不改动任何代码。**Q-5 准入语义如按本表扩展，另走 CHG**（R-2a 卡门禁/依赖项）。
> **状态**：DRAFT v1（2026-11-04，参考轨文档撰写人）。
> **外部源码取证**：FMPy `main`（commit `e42e288f448830c5f146ae334b38e91d17ff19fa`，2026-11-04
> 经 GitHub API 直读以下三文件并逐行摘录，未引入任何代码/依赖）：
> `src/fmpy/model_description.py`（modelDescription 解析 + 校验入口）、
> `src/fmpy/validation.py`（语义校验规则）、`src/fmpy/simulation.py`（doStep 循环）。
> 行号引用均指该 commit。清单口径另见《FaultLab 开源参考项目清单》v1.0 §3.1（R-2a 的任务来源）。
> **许可**：**待核对**（未核实，不回填日期；仅参考字段语义与协议，不引入运行期依赖——
> FMPy 仅作验收工具）。旁注（非核实记录）：GitHub API 仓库元数据 `license.spdx_id` 返回
> `NOASSERTION`，与本仓「待核对」定性一致；实际核对须 LICENSE 文件直读（REFERENCES.md 登记纪律 4）。

---

## 0. 为什么对照 FMPy（借什么、不借什么）

- **借**：FMPy 打开 FMU 时对 `modelDescription.xml` 的机器可判定校验面——变量名/类型/单位/
  初始值/因果性 + 能力位 + doStep 时序语义（清单 §3.1）。Q-5 准入机检直接采用这张字段表，
  替代自建「看起来没问题」的检查。
- **不借**：FMPy 模型库、GUI、内置求解器、lxml/numpy 依赖链。FMPy 仅作验收工具
  （开发机 `pip install fmpy`），**不进运行期依赖**；L0 解析模型不因此改变。
- **与现有纪律的关系**：`tools/backend/py/fmu_admission.py` 目前是纯 stdlib（`json/os/sys/zipfile`，
  fmu_admission.py:19-22）；本表全部字段在 stdlib `xml.etree.ElementTree` 下均可机检，无需第三方解析器。

---

## 1. FMI 2.0 `modelDescription.xml` 字段表（FMPy 解析面）

### 1.1 顶层属性（fmiModelDescription）

FMPy `read_model_description` 逐属性拷贝（model_description.py:575-586）：

| # | 字段 | FMPy 语义 | 机检形式（Q-5 建议落点） |
|---|---|---|---|
| 1 | `fmiVersion` | 必须为 `1.0`/`2.0`/`3.x`，否则抛 Unsupported FMI version（model_description.py:550-555） | 枚举断言；本仓 D-27/D-28 口径为 **FMI 2.0 CS** → 允许集初拟 `{2.0}` |
| 2 | `modelName` | 模型名（model_description.py:327） | 必填非空；与 manifest `model_id` 一致性对照（不得占用 `fl001`——A-3 同源） |
| 3 | `guid`（FMI3 为 `instantiationToken`） | 实例身份（model_description.py:578、:588-589） | 必填；登记进准入结果（不变更 run_hash） |
| 4 | `generationTool` / `generationDateAndTime` | 生成工具与时间（model_description.py:334） | 登记项（不判定） |
| 5 | `variableNamingConvention` | `flat`（默认）/`structured`（model_description.py:336） | 登记项；`structured` 时变量名校验按 EBNF（validation.py:303-304，FMPy 为可选步） |
| 6 | `numberOfEventIndicators` | 事件指示数（model_description.py:591-592） | 登记项 |
| 7 | `description` / `author` / `version` / `copyright` / `license` | 元信息（model_description.py:576-586） | 登记项（不判定） |

### 1.2 变量级字段（ModelVariables/ScalarVariable）

FMPy `ModelVariable` 字段面（model_description.py:210-308）与类型/因果性字面量（:185-207）：

| # | 字段 | 取值域（FMI 2.0） | FMPy 校验 | 机检形式（Q-5 建议落点） |
|---|---|---|---|---|
| 1 | `name` | 字符串 | 唯一性：重名报 `is not unique`（validation.py:70）；EBNF 名校验为可选（validation.py:58） | 唯一性必检；命名规范登记 |
| 2 | `valueReference` | 整数 | 同值引用冲突报 `same value reference`（validation.py:184） | 唯一性必检 |
| 3 | 类型（元素名，非属性） | `Real` / `Integer` / `Boolean` / `String` / `Enumeration`（FMI 3.0 扩展 `Float32/64`、`Int8…UInt64`、`Binary`、`Clock`——model_description.py:185-201） | XSD schema 校验（model_description.py:557-571）；Boolean/Clock 与 continuous 组合报错（validation.py:79-80） | 枚举断言；Boolean/String 不得 `variability=continuous` |
| 4 | `causality` | `parameter` / `calculatedParameter` / `input` / `output` / `local` / `independent`（model_description.py:204） | 非法组合见 §1.3 | 逐变量登记；`input`/`output` 面与 manifest 参数/方程自述对照 |
| 5 | `variability` | `constant` / `fixed` / `tunable` / `discrete` / `continuous`（model_description.py:205） | 同上 | 逐变量登记 |
| 6 | `initial` | `exact` / `approx` / `calculated` / 缺省（model_description.py:206） | 同上 | 逐变量登记 |
| 7 | `start`（初始值） | 字面量 | **必须有 start**：`initial ∈ {exact, approx}` 或 `causality=input` 且无 start → 报错（validation.py:84-87，对齐 FMI 2.0 规范 p.53）；`initial=calculated` 带 start 报错（validation.py:144-145）；`causality=independent` 带 start 报错（validation.py:147-148） | 同 FMPy 规则（三条均机检） |
| 8 | `unit` / `displayUnit` | 须在 UnitDefinitions 中定义 | 未定义报 `is not defined`（validation.py:159-162）；经 declaredType 间接引用一并解析（validation.py:155-156） | 引用完整性必检（定义表见 §1.4） |
| 9 | `quantity` / `min` / `max` / `nominal` / `relativeQuantity` | 描述性量纲/范围字段（model_description.py:246-266） | 不做交叉判定 | 登记项 |
| 10 | `canHandleMultipleSetPerTimeInstant` | 布尔，默认 true（model_description.py:230） | 不判定 | 登记；关联 doStep 多次 set 语义 |
| 11 | `declaredType` | TypeDefinitions 引用（model_description.py:239） | 未定义类型引用报错（validation.py 全局） | 引用完整性必检 |
| 12 | `reinit` | 布尔（model_description.py:277） | 不判定 | 登记（事件重置语义，关联 §3.3） |

### 1.3 causality × variability × initial 合法组合表

FMPy `legal_combinations` 全表（validation.py:90-134，对齐 FMI 2.0 规范）——共 29 组合：

| causality | 允许的 (variability, initial) 组合 |
|---|---|
| `structuralParameter` | (fixed, exact), (tunable, exact) |
| `parameter` | (fixed, exact), (tunable, exact) |
| `calculatedParameter` | (fixed, calculated/approx), (tunable, calculated/approx) |
| `input` | (discrete, exact), (continuous, exact) |
| `output` | (constant, exact), (discrete, calculated/exact/approx), (continuous, calculated/exact/approx) |
| `local` | (constant, exact), (fixed/tunable/discrete/continuous × calculated/exact/approx) |
| `independent` | (continuous, 无 initial) |

配套：`Exactly one independent variable must be defined`（validation.py:176）。
机检形式：组合表逐行断言（可整体复用为静态表驱动检查，stdlib dict 即可）。

### 1.4 单位定义（UnitDefinitions）

- FMPy 解析 `Unit`（name + BaseUnit + displayUnits，model_description.py:156-177）；
  `BaseUnit` 为 SI 指数组（kg/m/s/A/K/mol/cd/rad + factor + offset，:164-177）。
- 机检形式：变量 `unit`/`displayUnit` 引用必须能在 UnitDefinitions/TypeDefinitions 解析到
  （即 §1.2 #8 的引用完整性）；本仓不新增单位换算语义（单位仅登记，不改数值口径——
  换算属模型能力，不在准入层）。

### 1.5 DefaultExperiment 与 ModelStructure

| 字段 | FMPy 语义 | 机检形式 |
|---|---|---|
| `DefaultExperiment`（startTime/stopTime/tolerance/stepSize） | model_description.py:604-608 | 登记项，**不判定**——本仓场景时间由 config 决定（0.1 s / 60 s 教学尺度），FMU 自带实验设置仅作参考 |
| `ModelStructure/Outputs/Derivatives/InitialUnknowns` + `dependencies`/`dependenciesKind` | `numberOfContinuousStates` 取 Derivatives/Unknown 计数（model_description.py:594-597）；Outputs 必须覆盖每个 output 变量（validation.py:218）；dependencies/dependenciesKind 成对且长度一致（validation.py:207-211） | 选检：CS-only FMU 可缓行；引用完整性（Outputs 覆盖 output 变量）建议必检 |

---

## 2. 能力位表（CoSimulation / ModelExchange）

FMPy 能力位类定义（model_description.py:39-78）与 FMI 2.0 属性拷贝清单（:627-653）：

### 2.1 CoSimulation（本仓 D-27/D-28 路线，Q-5 重点关注）

| # | 能力位 | 默认 | 语义（FMI 2.0） | Q-5 建议处置 |
|---|---|---|---|---|
| 1 | `canHandleVariableCommunicationStepSize` | false（model_description.py:64） | 允许变步长通信；FMPy 在步进循环中据此在输入事件时刻**切步**（simulation.py:1295-1298） | **必检 + 行为耦合**：false 时 runner 必须按固定步长推进（对齐本仓 dt 网格）；建议准入声明要求 `true`（教学场景事件时刻切步需要），不满足 → 拒绝原因枚举 |
| 2 | `canInterpolateInputs` | false（model_description.py:68） | FMU 内部对连续输入插值；FMPy 据此决定是否可传输入导数（simulation.py:1218-1219） | 必检 + 登记；false 时 runner 侧须自行保持/插值输入（§3.3） |
| 3 | `maxOutputDerivativeOrder` | 0（model_description.py:66） | 输出导数阶数 | 登记项 |
| 4 | `canGetAndSetFMUstate` | false（model_description.py:44） | 可保存/恢复 FMU 内部状态 | 必检 + 登记；**与 Run 可复现性直接相关**——建议准入要求 `true`（否则 Run 不可重放），至少显式声明并进 `preview_only` 路径 |
| 5 | `canSerializeFMUstate` | false（model_description.py:45） | FMU state 可序列化 | 与 #4 成对登记 |
| 6 | `canRunAsynchronuously` | false（model_description.py:76；FMI 2.0 规范原文即此拼写） | 异步 doStep | 登记；本仓 runner 语义为同步（V312 §9⑦ 双超时口径），建议准入要求 `false` 或声明不使用 |
| 7 | `needsExecutionTool` | false（model_description.py:42） | 需要外部工具执行 | 必检：`true` → 拒绝（离线单文件/零工具约束） |
| 8 | `canBeInstantiatedOnlyOncePerProcess` | false（model_description.py:43） | 每进程仅能实例化一次 | 必检：`true` → 拒绝（runner 需可重复实例化） |
| 9 | `canNotUseMemoryManagementFunctions` | false（model_description.py:50） | 内存管理约定 | 登记项 |
| 10 | `providesDirectionalDerivative` | false（model_description.py:51） | 方向导数能力 | 登记项（本仓无用途） |

（FMI 3.0 扩展位 `fixedInternalStepSize` / `providesIntermediateUpdate` / `mightReturnEarlyFromDoStep`
/ `hasEventMode` 等，model_description.py:65-73——D-27 口径为 FMI 2.0，仅登记备查。）

### 2.2 ModelExchange（登记备查，本仓首批不启用）

`modelIdentifier`、`needsCompletedIntegratorStep`（由 `completedIntegratorStepNotNeeded` 取反推导，
model_description.py:637-638）、`canGetAndSetFMUstate`、`canSerializeFMUstate`、
`providesDirectionalDerivative`、`canNotUseMemoryManagementFunctions`、
`canBeInstantiatedOnlyOncePerProcess`、`needsExecutionTool`（model_description.py:627-638）。
**Q-5 处置**：首批 FMU 准入仅接受 CS（`<CoSimulation>` 存在且 `<ModelExchange>` 不作判定依据），
ME-only FMU → 拒绝原因枚举（与 fmu_admission.py「A-1 缺少 binaries」同级的结构性拒绝）。

---

## 3. doStep 时序语义（FMPy 实现口径）

### 3.1 初始化时序（FMI 2.0 CS）

FMPy `simulateCS` 初始化段（simulation.py:1242-1248，FMI 2.0 分支）：

```text
fmi2SetupExperiment(tolerance, startTime, stopTime)
→ apply_start_values（instantiated 档可设变量）
→ fmi2EnterInitializationMode()
→ apply_start_values（initialization 档可设变量）
→ input.apply(time)（首帧输入）
→ fmi2ExitInitializationMode()
```

机检含义：**parameter 类 start 值在 instantiation 档、tunable 类在 initialization 档设置**——
runner 的 set 时点必须按 causality 分档，不能一律在 setupExperiment 前写入。

### 3.2 每步时序（set → doStep → get）

FMPy FMI 2.0 CS 主循环（`while True` 起 simulation.py:1281；FMI 2.0 分支 :1322-1330）：

```text
input.apply(time, continuous=True, discrete=True, after_event=True)   # ① set 输入
fmu.doStep(currentCommunicationPoint=time, communicationStepSize=step_size)  # ② 推进
time = next_communication_point
recorder.sample(time)                                                  # ③ get/记录输出
```

即清单 §3.1 所述「先 `set` 输入、再推进、后 `get` 输出」。异常路径：doStep 返回
`fmi2Discard` 时读 `fmi2Terminated` / `fmi2LastSuccessfulTime` 收尾（simulation.py:1331-1338）
——runner 侧对应「步进失败 → Run 标记失败并记录最后成功时刻」，不得静默续跑。

### 3.3 输入事件与插值（「事件时刻插值」）

- **输入事件发现**：FMPy 从输入信号表提取时间事件——连续输入同刻双值、离散/tunable 输入
  值变化即事件（`findEvents`，simulation.py:369-388）；`nextEvent` 给出下一事件时刻
  （simulation.py:355-367）。
- **事件切步**：`canHandleVariableCommunicationStepSize=true` 且下一常规通信点越过下一输入
  事件时刻时，将本步通信点截短到事件时刻（simulation.py:1295-1298）——**事件时刻不越过、
  不跨步采样**。
- **插值规则**：连续输入线性插值、离散输入阶梯保持（hold）；事件时刻区分 `after_event`
  前/后值（`interpolate`，simulation.py:393-465；apply 处 :1324）。事件时刻后取 after_event
  值——与本仓事件左/右极限语义（ADR-002 / G0-DEC-05：pre=左极限、post=右采样行）同构：
  **FMU 输入事件面用 after_event 语义对应本仓 post，事件前最后一帧对应 pre/左极限**。
  该映射是本表的核心收获之一（runner 的第一批坑集中地，清单 §3.1「步进语义」原文）。
- **插值能力耦合**：`canInterpolateInputs=false` 时连续输入只能保持（ staircase），教学曲线
  的输入平滑度受 FMU 声明限制——准入登记时须连同 #2.1#2 一并声明。

### 3.4 与 V312 / D-27、D-28 的边界

`fmu_admission.py` 现状**不产出数值**（fmu_admission.py:16-17 docstring：真实 FMI 二进制执行
需要实际 FMU 样本验证——D-27 记录）。本节时序语义是 D-28 真样本到达后 fmu_runner（ctypes
doStep）的实现依据；R-2b（FMPy 夹具交叉验证）可在真样本前用示例 FMU 预演同一时序，但
**不得用于关闭 D-28**（REFERENCE_LANDING_PLAN R-2b 卡）。

---

## 4. 对照 V312_BACKEND_ADMISSION_CHECKLIST 三态登记

三态定义：**「V312 已有」**= V312 清单或 `fmu_admission.py` 已实现/已冻结对应条目；
**「缺失」**= 无对应条目；**「口径不同」**= V312 有语义相近但判定面不同的条目。
V312 为 FROZEN 文档（V312_BACKEND_ADMISSION_CHECKLIST.md:6），其范围声明明确
**B-4 FMU「按各自另批」**（:7）——本表不修改 V312，差异条目供 B-4 批次的 CHG 引用。

### 4.1 结构与身份面

| # | 字段表条目 | 三态 | V312/fmu_admission 对应物 |
|---|---|---|---|
| 1 | zip 结构（modelDescription.xml + binaries/<platform>/） | **V312 已有** | A-1（fmu_admission.py:44-49；平台目录枚举 :28-29） |
| 2 | model_manifest.json 字段面（equations/parameters/assumptions/limitations/method_id/integration） | **V312 已有** | A-2 REQUIRED_MANIFEST_FIELDS（fmu_admission.py:24-27、:63-70）；V312 §7「FMU 黑盒无 manifest 不得准入」 |
| 3 | model_id 自述（禁占 FL-001） | **V312 已有** | A-3（fmu_admission.py:66-68；V312 §7 engine.js:1407 语义失真防护） |
| 4 | 拒绝路径枚举 reasons[] + preview_only | **V312 已有** | A-5（fmu_admission.py:72-77；FS-1…FS-3 自检 :80-126） |
| 5 | provenance（numerical_simulation + self_declared） | **V312 已有（声明口径）** | A-4（fmu_admission.py:12-13 docstring）；V312 §7 `manifest.backend.self_declared: true` + UI 标签 |
| 6 | 顶层属性（modelName/guid/generationTool/fmiVersion） | **缺失** | fmu_admission 只检查 modelDescription.xml **存在性**（:44-46），不解析其内容 |
| 7 | fmiVersion 枚举（限 FMI 2.0 CS） | **缺失** | 无对应条目 |

### 4.2 变量面（本表 §1.2/§1.3/§1.4）

| # | 字段表条目 | 三态 | 差异说明 |
|---|---|---|---|
| 8 | 变量名唯一性 / valueReference 唯一性 | **缺失** | XML 变量层完全不解析 |
| 9 | 类型（Real/Integer/Boolean/String/Enumeration） | **缺失** | manifest 无变量类型概念 |
| 10 | 因果性 causality（input/output/parameter/…） | **口径不同** | FaultLab 对应物是 manifest 的 `equations`/`parameters` **自述面**（方程/参数清单），非逐变量因果性枚举；两者互补不互替 |
| 11 | variability / initial 组合合法性（§1.3 表） | **缺失** | 无对应条目 |
| 12 | 初始值 start 必备规则（exact/approx/input 三规则） | **缺失** | manifest 无初始值字段 |
| 13 | 单位定义引用完整性（unit/displayUnit → UnitDefinitions） | **缺失** | manifest 无单位字段；本仓单位字典在 `tests/schema.test.js` 侧（JS 引擎信号），与 FMU 单位不互通 |
| 14 | DefaultExperiment | **缺失**（建议维持缺失：场景时间由 config 决定，FMU 实验设置仅登记不判定） | — |
| 15 | ModelStructure（Outputs 覆盖 output 变量） | **缺失** | CS 首批可选检 |

### 4.3 能力位面（本表 §2）

| # | 能力位 | 三态 | 差异说明 |
|---|---|---|---|
| 16 | `canGetAndSetFMUstate` / `canSerializeFMUstate` | **缺失** | 与 Run 可复现性相关（§2.1#4 建议） |
| 17 | `canHandleVariableCommunicationStepSize` | **缺失** | 与 dt 网格推进策略耦合（§2.1#1） |
| 18 | `canInterpolateInputs` / `maxOutputDerivativeOrder` | **缺失** | 与输入插值语义耦合（§3.3） |
| 19 | `needsExecutionTool` / `canBeInstantiatedOnlyOncePerProcess` | **缺失** | 与离线零工具约束冲突面 |
| 20 | ME-only FMU 拒绝 | **缺失** | 首批 CS-only 边界未成文 |

### 4.4 时序面（本表 §3）

| # | 时序条目 | 三态 | 差异说明 |
|---|---|---|---|
| 21 | set→doStep→get 每步时序 | **口径不同** | V312 §9⑦ 定义的是**桥/作业层**双超时（BK-E01a 连接退避 ≤3 / BK-E01b 作业声明式），非 FMI 步进时序；doStep 数值执行按 D-27/D-28 另批 |
| 22 | 初始化分档 set 时序（instantiated/initialization） | **缺失** | — |
| 23 | 输入事件时刻切步 + after_event 前/后值 | **缺失** | 与 ADR-002/G0-DEC-05 左右极限语义的映射见 §3.3 |
| 24 | doStep 失败（discard/terminate）收尾 | **缺失** | — |

### 4.5 V312 有而本表不覆盖的条目（反向差异）

| # | V312 条目 | 与本表关系 |
|---|---|---|
| 25 | Q-4 三守卫（G-1 准入门绑定 / G-2 依赖冻结 / G-3 验收路径禁入，V312 §1） | FMU 适配器注册时同受其约束；本表不重复定义 |
| 26 | tolerance_profile 档位（V312 §2） | FMU Run 的判定层选择沿用该制度（新增档位须附量化依据） |
| 27 | scope 强制 extension_preview（V312 §6 断言 1） | FMU Run 同样强制（backend ⇒ 预览），本表不变更 |
| 28 | method 双口径并排显示（V312 §5） | FMU 的 `method_id`（如 `fmu_cs_dt0.01`，见 fmu_admission.py self_check 样例 :94）走 `manifest.backend.method_id` 同规 |

---

## 5. 机检落点建议（仅供 B-4 批次 CHG 引用，本卡不实施）

1. **A-1 扩展**：zip 结构检查后增加 `modelDescription.xml` 解析步（stdlib `xml.etree.ElementTree`）：
   顶层属性必检（fmiVersion∈{2.0}、modelName 非空、guid 必填）→ 拒绝原因枚举沿用 `A-1` 前缀。
2. **A-6（新增）变量层检查**：§1.2 #1/#2/#3/#12（唯一性、类型枚举、start 三规则）+ §1.3 组合表
   + §1.4 单位引用完整性 → 拒绝原因枚举新增 `A-6` 前缀（不动既有 A-1…A-5 语义）。
3. **A-7（新增）能力位检查**：§2.1 #1/#4/#7/#8 的准入要求位 + 其余登记 → `A-7` 前缀。
4. **manifest 交叉**：§4.1#2 的 manifest 字段面与 XML 变量面做一致性对照
   （manifest.parameters ⊆ XML parameter 类变量等）→ 归入 A-2 语义扩展，另走 CHG。
5. **时序面**：不在 fmu_admission.py（准入层）实现——归 D-28 后的 fmu_runner（执行层），
   依据 §3；准入层只登记能力位以供 runner 行为选择。

**实施前置**：以上任一条目实施均为 Q-5 准入语义变更 → CHG + （如涉及 run-g2 步面）DEC-E
预算登记；本表不构成实施授权。

---

## 6. 验收对照（R-2a 卡验收项回填）

| 卡内验收项 | 回填 |
|---|---|
| 「字段表可直接作为 fmu_admission 机检实现依据」 | §1–§3 为字段/规则面，§5 为落点草案（stdlib 可实现，无第三方解析器依赖） |
| 「与 V312 清单差异逐条登记（含三态）」 | §4 三态表 28 条：V312 已有 5、缺失 17、口径不同 2、反向差异 4（逐条见 §4.1–§4.5 行内三态列） |
| 「不需要 FMU 样本（D-28 不阻塞本卡）」 | 本卡全部产出基于静态字段/规则与 FMPy 源码取证，未执行任何 FMU |
| 「FMPy 仅作验收工具不进运行期依赖」 | §0；未引入任何代码/依赖（仅 GitHub API 直读源码文本作对照） |
| 「许可待核对」 | 文档头；REFERENCES.md 登记行同步维持待核对 |

---

**文件结束**。Q5_ADMISSION_FIELD_TABLE v1（2026-11-04，R-2a 批次 1）。
