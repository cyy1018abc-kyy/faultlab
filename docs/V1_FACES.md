# V1_FACES — v1.0 契约面冻结清单（已生效）

> **v1.0.0 冻结转正记录（2026-11-08，CHG-20261108-04）**：用户 v1.0.0 发布指令（清算→冻结
> 顺序执行）→ **本文 §2 八面全部转正为冻结状态**（面②先前已冻结；面①③④⑤⑥⑦⑧由
> 「演进中（additive-only）」转正为「冻结（v1.0.0，additive-only）」——additive 语义不变：
> 冻结面仍允许 additive 增长=minor，breaking=major+迁移指南五件套）；§3 breaking 政策
> （含 §3.4 golden 字节冻结特别条款）**同步生效**；§4 #9（33/33 复跑）/#10（本文转正+
> 迁移义务声明）/#11（残留两项裁定=修复，随 CHG-20261108-03 落地）全部闭合；§5 六项
> 待定按推荐裁定（见 §5 末裁定记录）。转正前状态（T6 提案→双路清算→33 步门禁）见文末
> 「转正前历史」注记。
> **性质**：v1.0 收敛准备文档（T6 起草，2026-11-08）——**本文是准备清单，不构成冻结本身**
> （V090_WAVE_DESIGN DEC-6 原文口径：「v1.0 前置文档，不构成冻结本身」）。本文列出 v1.0 将
> 承诺冻结的八个契约面，逐面标注状态（冻结 / 演进中 / 待定）并给出「承诺内容」与
> 「不在承诺内」的诚实边界；附 breaking-change 政策与 v1.0 收敛条件核对表。
> **授权记录**：CHG-20261108-01（V090_WAVE_DESIGN §1 DEC-6，采推荐项；并发子智能体授权）；
> **冻结生效**：CHG-20261108-04（v1.0.0 发布 CHG，用户 v1.0.0 发布指令链）。
> **输入**：V090_WAVE_DESIGN（DEC-6）｜ V06_ROADMAP §3 v1.0.0 行 ｜ ORACLE_INTERFACE_D2 ｜
> ARENA_EVAL_PROTOCOL_APPROVED v1.1 ｜ ALINE_MODEL_DEPTH_DESIGN §3 ｜
> src/core/{systems,scenario,schema,scope,engine,registry}.js ｜ scripts/verify_golden.py ｜
> tools/{run-g2,copy-guard}.mjs ｜ docs/CONTRACT.md ｜ data/golden/* ｜ artifacts/run-g2-report.json。
> **行号快照**：2026-11-08 本波工作树（git 基线 `85f5c80` + 并发波内已落地面——起草期间
> T4（C-5 信封入 src/core/scenario.js + docs/SCENARIO_SHARING.md）与 T5（run-g2 第 31 步
> file-smoke + engine.js thermo_track 分派）先后落地；本文全部行号引用在 T5 落地后的树
> 上逐条复核（三轮共约 190 条 spot-check 脚本核验）。本波为并发波，文件仍可能继续演进——
> v1.0 发布轮复核时按符号锚点重对行号，不逐行信任本快照。

---

## 0. 本文是什么、不是什么

- **是**：v1.0 API 承诺（V06_ROADMAP §3 v1.0.0 行「SystemDef/Scenario/EvalAgent 契约冻结」）
  的**逐面盘点与状态提案**——把库内事实上已稳定的契约面列成清单，供 v1.0 发布 CHG 逐项转正。
- **不是**：冻结宣告。三层边界：
  1. 本文标注（冻结/演进中/待定）原为 **T6 提案状态**——**已被 CHG-20261104-08→CHG-20261108-04
     冻结转正取代**（八面经用户 v1.0.0 发布指令批准转正为冻结，见文首转正记录）；
  2. v1.0 前，各面仍按既有治理节奏演进（G2b/CHG/波次设计），本文不改任何演进路径；
  3. v1.0 发布 CHG 才是冻结的法律事实——批准内容以该 CHG 文本为准，本文与之冲突时以 CHG 为准。
- **覆盖声明**：八面 = V090_WAVE_DESIGN DEC-6 枚举的八个面（DEC-6 原文列举：SystemDef schema、
  golden schema v2、scenario schema v1、oracle_base 契约、eval protocol v2、scope 三档、
  run-g2 步账门禁、copy-guard 词表），逐面的事实源见 §2 各面「事实源」行。

## 1. 标注语义（本文用语的定义）

| 标注 | 语义 | v1.0 后的变更代价 |
|---|---|---|
| **冻结** | 面的内容（字段/语义/判据）在 v1.0 发布 CHG 批准面内固定；不存在计划中的 additive 增长（预声明的扩展留位除外） | 任何 breaking 变更 = major 版本 + 迁移指南义务（§3） |
| **演进中（additive-only）** | 面按其治理惯例**预期继续增长**，但只允许 additive：新增成员/字段/步/词，不改不移除既有成员语义 | breaking 变更 = major + 迁移指南；additive 增长 = minor，无需迁移 |
| **待定** | 尚未决定是否冻结、以何种形态冻结（或明确挂起的外部依赖）；v1.0 发布 CHG 须对每项待定给出「收敛前裁定 / v1.0.x 首项 / 继续挂起」三选一 | — |

## 2. 八个契约面（逐面：事实源 → 状态 → 承诺内容 → 不在承诺内）

### 面状态总览

| # | 面 | 状态 | 一句话理由 |
|---|---|---|---|
| ① | SystemDef schema（五系统实例+字段面） | **冻结（v1.0.0，additive-only）** | 新系统（B-3 MG-001 等）与新字段是路线图内增长；既有实例字段语义已稳定 |
| ② | golden schema v2（含 T-B 分支/tier 制度） | **冻结** | 证据链面：字段面已规格化收口、既有 golden 字节冻结；v1.0 起只应存在预声明留位 |
| ③ | scenario schema v1（含 inertia_model/thermal_model 键 + C-5 信封） | **冻结（v1.0.0，additive-only）** | 未来系统轨键沿 inertia/thermal 先例 additive；closed-world 纪律已定型 |
| ④ | oracle_base 契约（oracle 接口/审批/写盘） | **冻结（v1.0.0，additive-only）** | 六成员签名稳定，机制层助手面可 additive；遗留豁免面为登记在案的历史债 |
| ⑤ | eval protocol v2（盲包/score_hash） | **冻结（v1.0.0，additive-only）** | 协议 v1.1 已批准且 MVP 落地；负例规格只增不减；包格式演进走新 schema id |
| ⑥ | scope 三档 classify | **冻结（v1.0.0，additive-only）** | 三值语义与守卫纪律已稳定；白名单扩张随 G2b 批准 additive |
| ⑦ | run-g2 步账门禁（tier/预算制） | **冻结（v1.0.0，additive-only）** | 四件套构成与步数账纪律是制度面；步清单本身在预算制下持续增删 |
| ⑧ | copy-guard 词表制度 | **冻结（v1.0.0，additive-only）** | 制度（扫描域/次序/退出码/记录义务）稳定；词表随新教学面增长 |

---

### 面① SystemDef schema（五系统实例 + 字段面）——冻结（v1.0.0，additive-only）

**事实源**：src/core/systems.js（FL001 :119 / FC001 :401 / GT001 :625 / PV001 :913 / WT001 :1130 /
MG001 :1373〔v1.1.0，CHG-20261110-02〕；
注册表 `ALL` :2483〔v1.1.0 六成员现 :2991——CHG-20261110-02〕；`FL.systems` 公共 API :2586-2596；UNITS 字典 :110-114）；字段面文档
docs/CONTRACT.md §4.2-§4.4（:232-316）；`defaultConfig` 盖章逻辑 :2546-2572。
〔v1.2.0 行号注（CHG-20261113-02，FC 电化学轨 additive 后实读）：FC001 块现 :406（level :413、
defaults `electrochem_model:'off'` :430、signals :538 起 **24 项**——三新信号 T_st_K/V_stack_V/
P_loss_stack_kW :566-568 带 `onTrackOnly:true`、faults :570、model_id/model_version :603-604、
`model.electrochem` additive 子对象 :640 起〔A-fcec-* 6 条 + on 域 limitations 4 项 +
EQ-FCEC-1..7 + level_on :665 / summary_on :666〕）；MG001 现 :1453；`ALL` 现 :3071；
`FL.systems` 现 :3179——行号快照规则不变，按符号锚点重对、不逐行信任快照。〕
实例画像（本 ask 逐项实读计数）：

| 系统 | model_id / model_version | level 标签 | 信号数 | 故障族 | 方程面 |
|---|---|---|---|---|---|
| FL-001 | `fl001` / `1.1.0`（:301-302） | L0（:126）+ thermal on 轨 + capacity on 轨（level_on 派生，v1.4.0） | 19〔18+1 onTrackOnly〕（v1.4.0，CHG-20261114-02） | sensor_drift / actuator_fault（:269/:281） | EQ-1..6 + EQ-A/B + EQ-FLTH-1..9 + EQ-FLTH-10..12（capacity on 轨，v1.4.0） |
| FC-001 | `fc.pem.l0` / `1.1.0`（:579-580；现行 :603-604——model_version 维持仅登记，Q1 定案 B） | L0（:407；现行 :413）+ **L1 电化学 on 轨**（electrochem_model off|on 默认 off；level_on「L1 · 电堆极化与单节点热（数值仿真级）」:665 经 levelFor/summaryFor 派生——既有静态消费入口零变化）（v1.2.0，CHG-20261113-02） | **24**〔v1.1.0 时点 21 + 3 新信号 T_st_K/V_stack_V/P_loss_stack_kW——onTrackOnly on 轨专属列、off 轨结构性缺席〕 | sensor_drift / load_step / actuator_fault（:548/:558/:568；现行 :570 起——族面零变化） | EQ-1..6 + **EQ-FCEC-1..7（on 轨，model.electrochem 子对象承载；off 轨 EQ 面零变化）**（v1.2.0，CHG-20261113-02） |
| GT-001 | `gt.sync.l0` / `1.2.0`（:830/:833） | L1 thermo（:631），swing/linear 遗留轨 | 27 | sensor_drift / load_step / actuator_fault（:799/:809/:819） | EQ-1..6 + EQ-GTL1-1..12（:875-893） |
| PV-001 | `pv.pv.l0` / `1.0.0`（:1066-1067） | L0（:919） | 17 | sensor_drift / shading_step（:1044/:1055） | EQ-PV-1..7（:1090 起） |
| WT-001 | `wt.aero.l0b` / `1.0.0`（:1314-1315） | L0b（:1136） | 22 | sensor_drift / actuator_fault / gust_step（:1283/:1293/:1303） | EQ-WT-1..9（:1342 起） |
| MG-001 | `MG-001` / `1.0.0`（:1576-1577） | 聚合层 L0 · 多源聚合行为级演示（:1380） | 19 | load_step / shading_link / gust_link / island_event（:1531/:1541/:1551/:1565——island_event 零参数族 params:[] 库内首例） | EQ-MG-1..9（:1603-1611，全代数零新 ODE）（v1.1.0，CHG-20261110-02） |

（v1.1.0，CHG-20261110-02：上表增 MG-001 行——**六系统快照**；MG-001 为 additive 实例，
字段面承诺同等适用，`ALL` 注册表六成员。）
（v1.2.0，CHG-20261113-02：FC-001 行更新——信号 21→**24**（+3 新信号 onTrackOnly）、level 增
**L1 电化学 on 轨**派生变体（electrochem_model 默认 off）、EQ 面增 **EQ-FCEC-1..7**（on 轨
model.electrochem 子对象）——additive 字段面承诺同等适用，`ALL` 注册表六成员不变、零新系统。）

**承诺内容**（v1.0 起冻结的部分）：
- 字段面语义：id/title/shortTitle/experimentCode/level/summary/questions/duration_s/dt_s/
  defaults/bounds/components/edges/signals/signalCategories/faults/model（model_id/model_version/
  assumptions/limitations/equations）/causalTemplates/topologyViewBox——字段名与语义不变
  （CONTRACT.md §4.2-§4.4 为权威文本面）；
- 五个既有实例的 model_id 标识、defaults 默认轨语义（GT-001 `inertia_model:'thermo'` :646
  Q4 定案；FL-001 `thermal_model:'off'` :142 FLTH-IMP-Q3 定案）与故障族成员不回收；
- `FL.systems` 公共 API 签名（list/get/defaultConfig/signalMap/faults/fault/component/
  causalTemplate/validateDraft，:2586-2596）与 `defaultConfig` 的盖章行为（inertia_model/
  thermal_model 仅在系统声明时携带，:2566-2570）；
- 新增字段/新系统/新故障族/新信号只增不改（additive-only）；UNITS 字典单位符号只增
  （先例：W/m²、K、kPa——systems.js:112-113）。

**不在承诺内**：
- 新系统实例与既有实例的数值内容演进（模型常量、参数域、方程文本——随 G2b 批准轮 +
  model_version 升版演进，先例：GT 1.1.0→1.2.0）；
- model.assumptions/limitations/causalTemplates 文本（教学叙事面，随评审演进）；
- UI level 标签字符串与 ARENA_EXCLUDED 名单（src/ui/pages/arena.js:99，PV/WT 不入评测）
  〔v1.3.0 快照同步（CHG-20261113-05）：ARENA_EXCLUDED 现值 **[]**——六系统全入评测池
  （V130 DEC-2 exposure 三值映射验证轮，面⑤ 入池登记同源）；本行「PV/WT 不入评测」为
  v1.0 时点快照，「UI 名单不入哈希承诺」语义不变〕；
- 插件化/可注册化改造（D-5 评估推荐 v1.0 不做——V090_WAVE_DESIGN DEC-4；触发条件登记：
  外部 SystemDef 贡献出现时走 RFC）；
- 逐系统的 scope 归属（归面⑥）与 golden 归属（归面②）。

---

### 面② golden schema v2（含 T-B 分支 / tier 制度）——**冻结**

**事实源**：ORACLE_INTERFACE_D2 §3（:117-184，字段面 §3.1、tier 制度 §3.2 引 ALINE §3 :75-92、
approval §3.3、backend 留位 §3.4、正交性 §3.5）；data/golden/ 既有 8 golden + 8 sidecar
（本 ask 列目录实证；v1.1.0 增 mg001_v1 → **现存 9 golden + 9 sidecar**，CHG-20261110-02；
v1.2.0 增 fc001_v2 → 10 golden，CHG-20261113-02；v1.4.0 增 fl001_v3 → **现存 11 golden + 11 sidecar**，CHG-20261114-02）；
逐文件 tier/schema 实测（本 ask 用 python 逐文件读取）：

| golden | schema 版本 | gate.tier | Run 数 | 状态 |
|---|---|---|---|---|
| fl001_v1 | v1 | （无 tier 字段，v1 面） | 4 | 在验（MODELS["fl001"]，off 默认轨） |
| fl001_v2 | v2 | T-B | 4 | 在验（MODELS["fl001_l1"]，thermal on） |
| fc001_v1 | v1 | （无 tier 字段，v1 面） | 5 | 在验 |
| fc001_v2 | v2 | T-B | 5 | 在验（MODELS["fc001_l1"]，5 Run 镜像 fc001_v1 全集全 electrochem_model=on、approval CHG-20261113-01、supersedes="fc001_v1（字节冻结留档）"——v1.2.0 增行，CHG-20261113-02） |
| gt001_v1 | v1 | （无 tier 字段） | 6 | 字节冻结留档（linear 存档轨） |
| gt001_v2 | v1 | T-A | 6 | 字节冻结留档（swing 存档轨；CRLF 写盘 F-8 登记豁免，ORACLE_D2 §6） |
| gt001_v3 | v2 | T-B | 6 | 在验（MODELS["gt001"] 重指向，scripts/verify_golden.py:117） |
| pv001_v1 | v2 | T-A | 4 | 在验 |
| wt001_v1 | v2 | T-A | 5 | 在验 |
| mg001_v1 | v2 | T-A | 5 | 在验（MODELS["mg001"]，approval CHG-20261110-01——v1.1.0 增行，CHG-20261110-02） |

（注：gt001_v2 的 "v2" 是 golden_id 不是 golden_schema_version——正交性规则见 ORACLE_D2 §3.5；
本表 schema 版本列为本 ask 对各文件 `golden_schema_version` 字段的实测值。）

**承诺内容**（v1.0 起冻结的部分）：
- schema v2 字段面语义与必填性（ORACLE_D2 §3.1 表：golden_schema_version/golden_id 正交、
  model_version 三段式、generated_by 一段式不得 null 占位出境、approval 三字段非 null 方可
  写盘、tolerances.gate.tier 必填）；
- tier 制度三级语义（T-A 算子复刻 ±1e-9 / T-B 方法等价按最慢极点标定 / T-C 数值参考须附
  convergence 块——ALINE §3 表 :80-84）与 verify_golden 按 tier 分派判据
  （scripts/verify_golden.py:178/:224/:337 T-B 分支）；
- V-03 语义（generated_by.oracle_source_sha256 = oracle 源文件自身字节 SHA-256）、V-03b
  approval 摘要算法（剥离 generated_by/approval 后 canonical JSON 的 SHA-256）；
- **既有 11 golden 文件字节冻结（v1.2.0 计数快照同步：v1.1.0 时点 9 + fc001_v2，CHG-20261113-02；v1.4.0 计数快照同步：v1.3.0 时点 10 + fl001_v3，CHG-20261114-02——
  字节冻结承诺语义零变化，仅计数事实面更新）**（V-02 sidecar 绑定实际字节）——该承诺强于 semver：
  任何重出（含保 id）都是 G2b/CHG 事件，旧文件字节永不就地改写（先例口径：Q3 冻结归档债）；
- 新 golden（新 id）默认 schema v2；verify_golden MODELS 注册行语义（重指向须 CHG；
  fl001 双 golden 并验结构——MODELS["fl001"] 与 MODELS["fl001_l1"] 各验各轨，
  scripts/verify_golden.py:68-89）。

**不在承诺内**：
- backend 信息块激活（规格留位、暂不填充——ORACLE_D2 §3.4：启用须显式 CHG 并回填该节）；
- 新可选扩展位（沿 supersedes/basis/metrics_note/series_note 先例，additive 且不改既有字段
  语义；面②标「冻结」指字段语义面，扩展位制度本身已在承诺内声明）；
- golden 数值内容与数量增长（新系统/新轨 golden 走 G2b——数据增长不是 schema 变更）；
- verify_golden V-01…V-09 之外的校验扩张（新增校验步 = additive）。

---

### 面③ scenario schema v1（含 inertia_model / thermal_model 键 + C-5 信封）——冻结（v1.0.0，additive-only）

**事实源**：src/core/scenario.js——SCHEMA_VERSION=1 :29、MAX_EVENTS=12 :30、固定网格 60/0.1
:35、TOP_KEYS :38、EVENT_KEYS :41、INERTIA_MODELS ['swing','linear','thermo'] :45、
THERMAL_MODELS ['off','on'] :49；normalizeScenario 封闭校验 :118 起；公共 API :653-671；C-5 场景共享信封
:507-618（exportScenarioEnvelope :525 / importScenarioEnvelope :545，信封
`{kind:'faultlab.scenario', version:1, content_checksum, scenario}`，ENVELOPE_KEYS :520）；
引擎侧盖章与枚举守卫 src/core/engine.js:176-186/:289-300；测试 tests/scenario.test.js
（本 ask 实跑 PASS，含 N54-N59 thermal 键负例）。

**承诺内容**（v1.0 起冻结的部分）：
- schema v1 事件契约：version 恒 1；closed-world 双层白名单（TOP_KEYS/EVENT_KEYS，未知字段
  拒绝入结构化错误）；MAX_EVENTS=12；固定运行网格 60 s / 0.1 s 守卫（:158-159）；
- 事件级模型深度轨键：`inertia_model`（三值枚举，仅声明该轨的系统 GT-001；缺省解析为系统
  默认轨）与 `thermal_model`（两值枚举，仅 FL-001；缺省 off）——解析轨入归一化面与哈希；
  `t_clear_s` 仅 GT-001×actuator_fault（既有语义）；
- scenarioHash 确定性：hashProjection 只含执行相关内容，scenario_id/label 不入哈希，
  canonical v1 严格模式（键排序/数组保序/数字最短往返）；再解析幂等（roundtrip）；
- C-5 信封契约：kind/version/未知字段封闭校验 → content_checksum 64 位 hex 格式校验 → 嵌入
  场景全量解析 → 校验和比对（不符=结构化错误，不静默重算放行）；裸场景路径 back-compat；
  校验和仅证明内容一致性，不是签名/来源证明（scenario.js:516 自声明）；
- 公共 API：parseScenario/scenarioHash/executeScenario/exportScenarioEnvelope/
  importScenarioEnvelope/samples 的签名与错误形态（ScenarioError + 结构化 .errors）。

**不在承诺内**：
- 新可选事件键（未来系统的模型深度轨键沿 inertia_model/thermal_model 先例 additive；
  新键只影响使用它的输入，既有场景解析与哈希不变）；
- SAMPLE_SCENARIOS 样例内容与 UI 编排页交互（教学面）；
- **已知残留（本 ask 实读发现，登记入 v1.0 残留清单）**：系统枚举错误文案未含 WT-001
  （scenario.js:150/:157 写「FL-001 / FC-001 / GT-001 / PV-001」）——WT-001 实际可解析
  （本 ask 以 Node 探针实证：parseScenario(WT-001 事件) ok=true 且 scenarioHash 可算），
  仅为错误提示文案缺项；v1.0 发布轮修复或登记豁免；
- 场景对盲评测轨的关系（V06_ROADMAP DEC-6：场景是教学编排，不驱动盲包生成——该解耦是
  承诺的一部分，不在「可能变化」清单内）。

---

### 面④ oracle_base 契约（oracle 接口 / 审批 / 写盘）——冻结（v1.0.0，additive-only）

**事实源**：ORACLE_INTERFACE_D2 §2 归一契约（:90-113）与 §4 机制层提供面（:187-199）；
tools/oracle/oracle_base.py（自检 `python -I tools/oracle/oracle_base.py`——本 ask 实跑 exit 0）；
七模型 oracle：fl001_oracle / fl001_l1_oracle / fc001_oracle / gt001_oracle（冻结归档）/
gt001_l1_oracle / pv001_oracle / wt001_oracle + emit_golden.py + properties/property_harness.py。

**承诺内容**（v1.0 起冻结的部分）：
- OracleInterface 六成员签名：RUNS（每 spec 必含唯一 key 与 role）/ SERIES_IDS（含 "t"）/
  simulate_run（第一参数 str=RUNS key 归一式、dict=spec 兼容式，overrides=变体覆盖；返回必含
  series/scalars/metrics，events 必含）/ self_check（→(ok, checks)，check_record 记录面）/
  _oracle_source_sha256（V-03 字节语义）/ build_golden（schema v2）；
- 机制层助手：resolve_run_spec 双形态、approval_block/apply_approval（64 位 hex 校验）、
  approval_payload_digest（V-03b）、write_golden_with_sidecar（二进制 LF 钉死 + sidecar 两空
  格式）、emit_golden 脚手架、CONFORMANCE_REGISTRY（physical/documented/legacy 三模式）；
- 独立性不变式：oracle_base 不含模型公式/容差判据，不 import src/**，不与任何 oracle 或
  engine 共享公式常量（ORACLE_D2 §0 裁定 3）——golden 只能由独立 oracle 生成、engine 只读
  比对；
- 自检入口 `python -I tools/oracle/oracle_base.py` exit 0/1 契约（T-1…T-8 机制自测 + 探针）。

**不在承诺内**：
- gt001_oracle.py 冻结归档债（文档化符合 + 差异豁免清单 ORACLE_D2 §5.2；物理迁移仅在其
  golden v2/v1 自身重出时点执行清偿动作清单）；
- 新增助手函数/新契约成员（additive；新 oracle 出生即接入 base 的先例延续）；
- 模型公式、容差数值、tier 分派逻辑（归各自 oracle 与 verify_golden）；
- verify_golden.py 的 MODELS 注册行内容（重指向随 CHG——面②已声明注册行语义冻结、行内容
  演进走 CHG）。

---

### 面⑤ eval protocol v2（盲包 / score_hash）——冻结（v1.0.0，additive-only）

**事实源**：ARENA_EVAL_PROTOCOL_APPROVED.md v1.1（批准记录 CHG-20261030-03，G6-WS-D 关闭）——
盲包 schema §5（faultlab.arena.round.v2 / match.v2，:95-119）、sealedProjection 并集规则
§6.1a（:158-165）、Verifier 校验链 V-00…V-10（:167-183）、评分数值规格 §6.4 冻结（:193-211）、
score_hash 规范化 §4（:88-93）、负例 17 条冻结规格附录 A（:252-274）；MVP 实装：
src/core/arena-protocol.js（:1-5 契约头）、tools/arena2-gen.mjs、tools/arena2-verify.mjs
（V-10 score_hash 落章 :9）、tests/arena-protocol-negative.test.js（run-g2 步 19，
tools/run-g2.mjs:107）。

**承诺内容**（v1.0 起冻结的部分）：
- 盲包字段白名单（closed-world、键精确匹配、不做大小写/Unicode 归一）+ 语义禁项（按
  「不能由白名单字段与 samples 计算得到」定义可派生性）+ 观测通道白名单三查合一；
- 标识符纪律（match_id=UUIDv4 opaque、testset_id 末段独立随机串、禁为 set_seed 的确定性
  函数）与 open_seed 例外模式（计分轨硬拒收、种子空间不相交）；
- 评分数值规格 §6.4 冻结值（weights Σ=1.00 / falseAlarmPenalty=10 / latencyWindow_s=12 /
  healthy_policy / 十进制半向上舍入 / 分项 4 位小数十进制串入哈希）；
- score_hash 规范化（canonical v1 + blind_sha256/submission_sha256=文件原始字节 + 场后可
  复现、赛时不可确定性复算的二分边界）；
- 附录 A 17 条负例冻结规格（**不得删减只可增补**——附录 A 原文）与 V-00…V-10 判定顺序、
  AE-E 错误码面；
- 红线：评分只标「合成故障评测游戏，非真实诊断性能」；盲包零真值；排行榜/云/账户不做。

**不在承诺内**：
- scenario_rules 代际内容（sr1 之外的生成规则代——规则代演进 = additive，新代不回改 sr1）；
- **诊断提交族覆盖（v1.5.0，CHG-20261114-05）**：诊断提交 faultType 枚举由 4 值
  （sensor_drift/load_step/actuator_fault/none）additive 扩至 **9 值**（+shading_step/
  gust_step/shading_link/gust_link/island_event——入池六系统目录活跃族全集 + none；枚举=
  族名全集非按系统——pv_shading_link/wt_gust_link 为 FAULT_CATALOG v1.7 目录项 id、族名
  为 shading_link/gust_link，枚举收族名不收 id）——**入池六系统全活跃族 family/component
  评分可达**（既有 4 值路径零变化探针承载；协议批准文本无枚举清单载面，「规则代演进 =
  additive」口径——ARENA_EVAL_PROTOCOL_APPROVED.md 零触碰）；附录 A 17 负例**零删减**
  （N-B18/N-B19 增补承载——「不得删减只可增补」原文兑现）；已知观察项：island_event
  零参数族幅值不可达 → round_score 85.0 上限（family/component 可达性不受影响——显式
  CHG 候选登记，待用户裁定）；
- deriveChangePoints 首发的放行门槛数值（QP-4：健康局假候选率须测量并公布后才放行——
  ARENA §6.3/:249；该测量面已挂 run-g2 步 19）〔**v1.3.0 放行注记（CHG-20261113-05，
  V130 DEC-4）**：门槛已测量并公布——健康局假候选率实测随 run-g2 步 19 发布、断言门槛
  ≤0.2 + 可测幅值故障局检出 ≥0.9（tests/arena-protocol-negative.test.js :278-284 实测
  机制），**首发前置解除**；盲包生成侧按既有协议面使用、判据零扩张〕；
- 组织方运营流程（EVAL_TRACK_GUIDE v2 §6 场次流程）与对外首场时点（运营项，随时、组织方
  侧动作——V06_ROADMAP §2 :70）；
- 页面演示轨（六页 06 Arena，docs/AGENT_PROTOCOL.md P2 注记版继续有效；truthSealed 为 UI
  开关非安全边界——CONTRACT.md §11/G0-DEC-11）；
- 评测轨对第五系统的覆盖扩张（ARENA_EXCLUDED 现状 PV/WT 不入评测——arena.js:99）
  〔**v1.3.0 入池登记（CHG-20261113-05，V130 DEC-2 显式 CHG 面）**：exposure 三值映射
  验证轮全过（ARENA_EXPOSURE_VERIFICATION_ROUND.md v1——PV/WT/MG 逐信号核对表 × 盲包
  程序化验证，57 信号三值落点核对、19 条显式声明偏差登记、v1/v2 双导出面泄漏扫描零
  命中、通道集逐场景全等），**ARENA_EXCLUDED 收缩为 []**——PV-001（历史排除
  CHG-20261104-10）/ WT-001（CHG-20261107-01）/ MG-001（V110 DEC-4 CHG-20261110-01）
  三系统入池，评测轨覆盖扩张 additive（三系统 → 六系统全池；协议字段面零变化、附录 A
  负例零触碰）；上行「PV/WT 不入评测」为 v1.0 时点快照〕。

---

### 面⑥ scope 三档 classify——冻结（v1.0.0，additive-only）

**事实源**：src/core/scope.js——APPROVED 常量 :17-30、classify :42-83、assertApprovedP0
:94-111（SCOPE-E01 + 后端 Run 强制 extension_preview 分支 :95-102）、`FL.scope` API :113-118；
SA-24 白名单扩张先例（FLEXT_G2B_SPEC_APPROVED §4 / FCEXT §5，scope.js:5-9 头注）；守卫测试
run-g2 步 14（tools/run-g2.mjs:102 scope-guard.test.js）。

**承诺内容**（v1.0 起冻结的部分）：
- classify(config) → `'approved_p0' | 'approved_fc' | 'extension_preview'` 三值语义与确定性
  （纯函数、零 DOM；P0 唯一白名单 FL-001 × none/sensor_drift(+10 A)/actuator_fault(55%) ×
  @20.0 s × 30 kW/60% × 60 s/0.1 s——APPROVED :17-30）；FC-001 approved_fc 四族条件
  （:44-51）；白名单外一律 extension_preview；
- 后端 Run 强制 extension_preview、不进入 P0 验收路径（:95-102，跨实现一致性走专用 golden
  校验）；assertApprovedP0 的中文错误面（name/code/next 字段结构）；
- 纪律：P0 验收/golden 比对路径必须先过守卫；白名单扩张只经 G2b/显式 CHG（SA-24 先例）。

**不在承诺内**：
- 白名单成员扩张（新系统/新族入 approved 面随 G2b 批准 additive——先例：actuator_fault 入
  SA-24、FC 新族入 approved_fc）；
- 第四档取值（如未来出现新批准层级 = additive；既有 Run 的分类永不静默改判）；
- UI scope 徽章/文案（教学面，随 copy-guard 辖区走）。

---

### 面⑦ run-g2 步账门禁（tier / 预算制）——冻结（v1.0.0，additive-only）

**事实源**：tools/run-g2.mjs——四件套构成 :14；--tier 参数 :46-58；STEPS 31 步清单 :88-120
（第 31 步 = file-smoke.mjs file:// 发布能力冒烟，:119，core 层——本波 T5 落地，本 ask 以
`--tier core` 冒烟实跑核验步数 31）；步数账纪律与变迁史 :122-165（当前构成「31 步 = core 25 +
extended 6」:135〔v1.1.0 计数快照同步：**现值 35 步 = core 28 + extended 7**——第 34 步
verify_golden mg001、第 35 步 engine-mg.test.js 均 core 层，V110 DEC-5；v1.0.0 时点 33 步 =
core 26 + extended 7；CHG-20261110-02〕）；tier 护栏（无标签/非法标签 exit 2）:174-181；报告字段
（gate/ok/results/code/environment/execution/tier/tiers，读取兼容注记）:248-283；部分运行
≠ 全量门禁声明 :166-168/:299-300。最近全量证据 artifacts/run-g2-report.json：tier=all、
30/30 ok、2026-11-08、commit 1331ed3（v0.8.0 收盘轮——31 步全量随本波 G 门禁复跑）。
〔v1.1.0 快照更新（CHG-20261110-02）：最近全量 artifacts/run-g2-report.json = 2026-11-11
tier/all **35 步 34 pass / 1 fail**——唯一失败步 perf.mjs E2E 主旅程时长门禁超阈（15684/15658 ms
> 15000 ms 冻结阈值；旅程 additive 增长非性能退化，**G7 阻塞登记**见 evidence/g8/v110-release.md
§0，阈值再登记待用户裁定）。〔v1.1.0 闭合补记（CHG-20261110-03，2026-11-13）：阈值按同一
「实测峰值×2」公式再登记 15000→**31500 ms**（D-4 程序，用户指令链采推荐口径）+ 复跑
`--tier all` 两次独立 **35/35 PASS**（61716/59915 ms）——**G7 已闭合**。〕〕
〔v1.2.0 快照（CHG-20261113-02）：**35 步维持 0 新步**（V120 DEC-5——verify_golden fc001_l1
并入步① DEFAULT_MODELS **三 golden 顺序验证** fl001→fl001_l1→fc001_l1、engine on 轨并入
engine-fc 既有步⑥；FIRST-35 机检既有 35 步零改动，预算 ≤35 维持）；最近全量
artifacts/run-g2-report.json = 2026-11-13 tier/all **35 步 35 pass / 0 fail**（35/35 × 2 独立，
78450/78179 ms；perf 步实测 12255/12263 ms ≪ 31500 ms——G7 维持闭合）；步① label
「verify_golden fl001」滞后先例延续（现实际覆盖三 golden，随下次 tools 触碰统一固化）。〕

**承诺内容**（v1.0 起冻结的部分）：
- 四件套构成缺一不可（①数值：verify_golden + engine 测试；②浏览器 E2E；③RunRegistry/
  规范哈希；④Schema/单位字典）——任一失败非零退出；
- 每步必须带合法 tier 标签（core|extended），护栏强制（:174-181）；--tier 部分运行不构成
  G2 全量门禁通过，发布门（G7/G8）与 CHG 验收句只认 `--tier all` 全量运行（:157-160）；
- 步数账纪律（I-7）：单波增步预算制（DEC-E 口径单波 ≤+1，超预算须显式申报——本波 30→31
  预算 ≤32 即申报式，V090_WAVE_DESIGN DEC-7 :70-72）、任何增删步在 CHG 登记归属层与理由
  （:136 起纪律原文）；
- 报告字段面只增不改（读取兼容——:249「原有字段（读取兼容）」先例）；
- 报告落盘 artifacts/run-g2-report.json + 追溯字段（commit_sha/worktree_dirty/duration_ms）。

**不在承诺内**：
- 步清单内容本身（预算制下 additive 增步、删步/重排须 CHG——步是演进面，制度是冻结面；
  本波 30→31 即实例：file-smoke 第 31 步，V090_WAVE_DESIGN DEC-5 残留①清算 + DEC-7 申报）；
- 单步内测试体量与断言数（「优先并入现有步」口径——ALINE §2 步数管理约束——使单步步内
  持续增长）；
- 执行时长（实测 ~38 s 级不构成承诺值；timeout 300000 ms/步是实现参数）；
- e2e/perf 对 Chrome 的依赖形态（--skip-e2e 部分运行面）。

---

### 面⑧ copy-guard 词表制度——冻结（v1.0.0，additive-only）

**事实源**：tools/copy-guard.mjs——扫描域 SCOPES=['src'] :15、BANNED 禁词 33 模式 :18-26
（含电网/惯量/一次调频验证类禁词——孤岛/并网表述红线的机检面）、ALLOW 批准否定/限定串
11 条 :29-37〔v1.1.0 词表快照同步：**BANNED 39 模式 / ALLOW 14 条**——MG 六词入表 +
ALLOW 增量 3 串，deviations.md D-27 评估/D-28 落地，CHG-20261110-02；v1.2.0 维持注
（CHG-20261113-02）：词表 **39/14 基线维持**——本波零增词（FC on 轨文案走「【仅
electrochem_model=on 适用】」既有分域句式纪律，发布轮 copy-guard 实跑 0 命中）〕、sealed 标识符 token 剥离（D-11）:44-46、命中 exit 1 / PASS 摘要 :67-74、
「允许列表每次扩充须在 evidence deviations.md 记录」:8；制度依据 UI_COPY_GUARDRAILS §6.3/
§8.2（G0-DEC-13）；挂 run-g2 步 17（tools/run-g2.mjs:105，core 层）。

**承诺内容**（v1.0 起冻结的部分）：
- 制度本身：扫描 src/**（docs/** 与 FaultLab-evaluation/** 为证据引用不扫）；「先剔 ALLOW
  再匹配 BANNED」次序；标识符 token 剥离规则（sealed 类代码标识符不是用户可见表述）；命中
  即 exit 1（失败=不可合入）；无命中输出 PASS 行；
- **词表单调不减**：BANNED 删词视为 breaking（放松守卫），走 major 评审；增词 = additive
  （先例：新教学面/新系统落地轮扩词——ALINE §2 九步之⑧「copy-guard 词表扩展」）；
- ALLOW 列表存量子冻结、增量记录制（每次扩充登记 deviations.md 理由——copy-guard.mjs:8）；
- 与 src/** 改动的绑定纪律：改 src/** 文案后必须复跑 `node tools/copy-guard.mjs` = 0 命中。

**不在承诺内**：
- 词表内容清单本身（33 禁词/11 允许串是 v1.0.0 时点快照〔v1.1.0 现值 **39/14**，D-28——CHG-20261110-02〕，随增长演进）；
- FaultLab.html 单文件包与 data/**、tests/** 的扫描边界（当前实现只扫 src/**——边界即
  承诺，未来扩扫描域 = additive 收紧）；
- 教学叙事文案的评审质量（copy-guard 只做禁词机检，文案评审归 G2b/双评审流程）。

---

## 3. breaking-change 政策（v1.0 起生效；发布 CHG 批准对象）

### 3.1 版本语义

v1.0.0 起 SemVer 三段制（现行 0.x 节奏自然过渡，无新增工具——版本号出现在
package/发布证据与 CHG 文本中）：

| 升位 | 触发 | 例 |
|---|---|---|
| **MAJOR（breaking）** | §2 八面任一「承诺内容」被变更/移除/收窄 | EVENT_KEYS 白名单收紧致旧合法场景被拒；oracle 六成员签名变更；score_hash 输入面变更；scope 三值语义改判 |
| **MINOR（additive）** | additive 增长：新系统实例、新可选字段/键、新 golden、新 run-g2 步、词表增补、信封 kind 新增、新助手函数 | B-3 MG-001 系统 + golden；新故障族入白名单；新禁词 |
| **PATCH** | 缺陷修复，承诺面语义零变化 | 错误文案缺项修复（如面③残留：系统枚举文案补 WT-001——只改错误提示、不改解析行为） |

### 3.2 breaking 判定细则

- **closed-world 面收窄** = breaking（旧合法输入被新版本拒收）；
- **哈希面变化** = breaking：既有合法输入的 scenarioHash / run_hash / config_hash /
  score_hash / content_checksum 输出值发生变化即 breaking——即使数值仿真零变化
  （先例反证：v0.x 的 GT inertia 轨入哈希、FL thermal 键入哈希均以显式 CHG 登记为
  「预期失效面」，该宽容 v1.0 起不再默认，须走 major 评审论证）；
- **golden 语义级变更** = breaking（数值重出、tolerances 收紧、tier 降级）——且无论
  semver 如何，golden 重出永远是 G2b/CHG 事件（§3.4）；
- **门禁判据放宽** = breaking（run-g2 判据、copy-guard 词表删减、verify_golden 容差放松）；
- **移除公共 API 成员**（FL.systems/FL.core.scenario/FL.scope/oracle 六成员/arena-protocol
  导出面）= breaking。

### 3.3 breaking 义务（五件套，缺一不可）

1. **major 升位**并在发布证据中列出受影响面（引用本文 §2 面编号）；
2. **迁移指南**：`docs/MIGRATION-<from>-to-<to>.md`——受影响面清单、旧行为对照、迁移步骤、
   可机检的迁移工具面（脚本或校验命令）；
3. **旧输入处置声明**：closed-world 面明确「拒收 + 可读错误消息」的语义（沿用既有结构化
   错误纪律——scenario.js/arena-protocol 的 field/message 形态）；
4. **受影响 golden 重出评估**：逐 golden 判定「不受影响 / 保 id 重出（DEC-B 口径）/ 新 id
   重出（G2b 判据）」，V-01…V-09 全量复验；
5. **门禁全量绿**：run-g2 `--tier all` + copy-guard 0 命中 + oracle_base 自检 exit 0 +
   verify_golden exit 0，报告随发布证据归档。

### 3.4 特别条款

- **golden 字节冻结条款**（强于 semver）：既有 golden 文件在任何版本号下都不得就地改写；
  重出=新文件+新 CHG，旧文件字节与 sidecar 留档不动（先例：gt001_v2 CRLF 形态冻结不动、
  gt001_oracle.py 物理文件零触碰——ORACLE_D2 §5.2/§6）。
- **additive 的边界**：additive 不得改变既有合法输入的任何哈希输出（§3.2）；不得使既有
  golden 的 verify_golden 复验结果变化；不得使既有 run-g2 步判据翻转。
- **政策本身的变更** = breaking（本文 §3 经发布 CHG 批准后，其修订走 major）。

## 4. v1.0 收敛条件核对表（V06_ROADMAP §3 v1.0.0 行 × 现状）

> V06_ROADMAP §3 v1.0.0 行原文（:89）：「三系统 L0b/L1 完整 + 教学生态收敛 + 架构稳定 →
> **1.0 API 承诺**（SystemDef/Scenario/EvalAgent 契约冻结）｜ 全线 ｜ 全门禁 + 文档完整」。
> 「三系统」为 v0.6 时点口径——**现状已是五系统**（FL/FC/GT/PV/WT，systems.js:2483），下表
> 按现状表述；「L0b/L1 完整」按模型深度轨解读：已批轨齐备即达标，未启动的深化轨归 A-5
> 待定项（§5），不构成收敛阻塞。

| # | 收敛条件（V06 原文拆解） | 现状对照（本 ask 实读/实跑） | 证据 | 状态 |
|---|---|---|---|---|
| 1 | 模型纵深完整（原文「三系统 L0b/L1 完整」→ 现状五系统） | FL-001：L0（fl001_v1）+ L1 thermal 轨（fl001_v2，T-B）；FC-001：L0（fc001_v1，G2b-lite approved_fc）；GT-001：L0b swing/linear 双存档轨（gt001_v2 T-A）+ L1 thermo 默认轨（gt001_v3 T-B）；PV-001：L0（pv001_v1 T-A）；WT-001：L0b（wt001_v1 T-A） | data/golden/ 8 文件（逐文件 tier/schema 本 ask 实测）+ verify_golden 全量 exit 0（本 ask 实跑） | ✅ 已达成（FC/PV/WT 无 L1 轨——深化归 A-5 评估稿，推荐时点 v1.0 后） |
| 2 | 教学生态收敛——C-2 场景编排器 | scenario.js schema v1 + 编排执行 + 哈希；tests/scenario.test.js 入 run-g2 步 26 | run-g2.mjs:114；本 ask 实跑 scenario.test.js PASS | ✅ |
| 3 | 教学生态——C-3 教学路径 | src/core/teaching.js + 7 条预设路径（4 系统主线 + GT/FL 跨深度 + WT×2）；tests/teaching.test.js 235/235（本 ask 实跑） | 测试输出「PASS 235 / FAIL 0」 | ✅（残留：该测试未挂 run-g2 步账，见 #10） |
| 4 | 教学生态——C-4 本地排行榜 | tools/leaderboard.mjs；tests/leaderboard.test.js 78/78（本 ask 实跑） | 测试输出「pass 78 / fail 0」 | ✅（残留：未挂 run-g2 步账，见 #10） |
| 5 | 教学生态——C-5 场景共享 | 信封导出/导入落地于本波（scenario.js:507-618：content_checksum 校验和 + closed-world + 裸场景 back-compat；UI scenario 页同步）；roundtrip 测试入 tests/scenario.test.js（本波 T4 面） | scenario.js:507-618；docs/SCENARIO_SHARING.md（本波 T4）；V090 DEC-3 | ✅ 本波落地（随波 G 门禁验收） |
| 6 | 评测生态——协议批准 | ARENA_EVAL_PROTOCOL v1.1 批准（CHG-20261030-03）+ MVP 五件套全部落地（arena-protocol.js/arena2-gen.mjs/arena2-verify.mjs/负例测试/run-g2 步 19） | run-g2.mjs:107；本 ask 列文件实证 | ✅ |
| 7 | 评测生态——对外首场 | 流程就绪（EVAL_TRACK_GUIDE v2 §6；组织方=用户）——运营项随时可启动，非代码收敛条件 | V06_ROADMAP §2 :70 | ✅（就绪；首场时点归组织方） |
| 8 | 架构稳定 | 零第三方依赖/离线可跑/零构建 ES2020（O-03，CONTRACT.md §2）；I-1…I-7 不变式沿袭（V06 §0）；D-5 插件化评估=推荐 v1.0 不做（V090 DEC-4）；D-3 FMU=外部依赖挂起（等样本，不做清单内） | V090 §0/DEC-4；V06 §6 | ✅ |
| 9 | 全门禁 | 最近全量 run-g2 tier=all 30/30 ok（2026-11-08，commit 1331ed3 = v0.8.0 收盘轮）——**v0.9.0 收盘须复跑 31 步全量**（预算 ≤32）〔v1.1.0 快照同步（CHG-20261110-02）：步数账现值 **35**；最近全量 2026-11-11 tier/all **34/35**——perf.mjs 时长门禁阻塞登记（v110-release §0），G7 闭合待 perf 阈值再登记裁定〔CHG-20261110-03（2026-11-13）已闭合：阈值 31500 ms 再登记 + 复跑 35/35 两次独立 PASS〕〔v1.4.0 快照（CHG-20261114-02）：perf 阈值再登记 31500→71500 ms（旅程 81→94 断言 additive 增长，峰值×2 公式）+ 复跑 35/35 两次独立 PASS（111626/110026 ms）〕
〔v1.2.0 快照（CHG-20261113-02）：最近全量 2026-11-13 tier/all **35/35 × 2 独立**
（78450/78179 ms；0 新步——35 维持，步① 三 golden；perf 步 12255/12263 ms ≪ 31500 ms，
G7 维持闭合）——证据 evidence/g8/v120-release.md §4〕〕 | artifacts/run-g2-report.json（本 ask 读取） | ⏳ 随本波 G 门禁兑现 |
| 10 | 文档完整 | 现有：docs/{CONTRACT,FAULT_CATALOG v1.4,SCOPE,REFERENCES,METRICS_P1,AGENT_PROTOCOL} + NEXT 规格族 + tools/oracle/README + 本文。发布轮补：本文 §2 标注经发布 CHG 转正、迁移指南义务声明生效（§3.3）、面③/#10 残留裁定 | docs/ 与 NEXT/ 列目录实证 | ⏳ 发布轮动作 |
| 11 | 残留登记（本 ask 发现，非 V06 原文项） | ①scenario.js 系统枚举错误文案未含 WT-001（:150/:157；解析行为不受影响——本 ask Node 探针实证 WT-001 可解析）；②tests/teaching.test.js 与 tests/leaderboard.test.js 未入 run-g2 步账（各自独立可跑、当前实跑均绿）——v1.0 发布轮裁定补挂（预算制内）或登记豁免 | 本文面③/面⑦「不在承诺内」 | 🔶 收敛前裁定 |

**判读（v1.0.0 发布时点复核，CHG-20261108-04）**：#9 已兑现（run-g2 **33/33** 两次独立
PASS——工作流内 + 主流程复验 57896ms，含新增 teaching/leaderboard 两步）；#10 已兑现（本文
转正 + 迁移义务声明生效——五件套义务随 §3.3 对未来 breaking 持续适用）；#11 已裁定=**修复**
（scenario 枚举文案动态派生 ×2 + teaching/leaderboard 补挂步 32/33，随 CHG-20261108-03
落地）。**11/11 全部闭合**。原文判读存档：11 项中 8 项已达成、2 项为发布轮动作（随 v0.9.0 G 门禁与发布 CHG 兑现）、1 项
残留待裁定。**无阻塞性缺口**——v1.0 收敛的剩余工作全部是「复跑门禁 + 文档转正 + 残留
裁定」，无新增仿真轨、无新系统依赖。

**判读附录（v1.1.0，CHG-20261110-02——additive 快照同步，上文判读为 v1.0.0 时点历史记录原样保留）**：
步数账现值 **35**（33→35：第 34 步 verify_golden mg001 + 第 35 步 engine-mg.test.js，V110 DEC-5，
FIRST-33 机检既有 33 步零改动）；最近全量 run-g2 = 2026-11-11 **34/35**（唯一失败 = perf.mjs
E2E 主旅程时长门禁超阈 15684/15658 ms > 15000 ms 冻结阈值——旅程 additive 增长非性能退化，
阈值再登记属门禁判据面变更待用户裁定，**G7 阻塞登记**见 evidence/g8/v110-release.md §0）。
**G7 闭合补记（CHG-20261110-03，2026-11-13）**：阈值再登记 15000→**31500 ms**（同一「实测峰值×2」
公式、D-4 程序、用户指令链采推荐口径；每断言语义不回退，非 §3.2 判据放宽）+ 复跑 `--tier all`
两次独立 **35/35 PASS**（61716/59915 ms）——**G7 已闭合**。

## 5. 待定与开放项（v1.0 发布 CHG 须逐项给出处置）

| # | 项 | 现状登记 | 推荐处置（沿既有推荐决策） | 波及面 |
|---|---|---|---|---|
| 1 | B-3 MG-001 微电网（多源聚合 + 脱离主馈线的功率平衡重整演示——I-5 表述红线） | 草案+双路评审完成，**批准留待用户**（V090 DEC-1） | 批准早则 v1.0 收敛前实现，否则 v1.0.x 首项 | ①（新系统实例）②（新 golden）③（新族）⑥ |
| 2 | A-5 多物理场 L1 深化三提案（FL 温度-容量折算 / GT 燃烧动态 / FC 电化学） | 评估稿完成，不定实现（V090 DEC-2） | v1.0 后逐步 G2b | ①②④ |
| 3 | D-3 FMU doStep | 外部依赖挂起（样本未到，V06_ROADMAP :77） | 样本到即插（Q-5/V312 准入面已就绪） | ②（backend 信息块）⑥（后端 Run 守卫已在） |
| 4 | 插件化（SystemDef/ScenarioTemplate/EvalAgent 可注册化） | 评估稿推荐 v1.0 不做，触发条件登记（外部贡献→RFC）（V090 DEC-4） | 维持不做；触发条件出现再议 | ①④ |
| 5 | golden backend 信息块 | 规格留位、暂不填充（ORACLE_D2 §3.4） | 维持留位；启用须显式 CHG | ② |
| 6 | §4 #11 残留两项 | 本 ask 登记 | 发布轮裁定（修复=PATCH / 豁免=登记） | ③⑦ |

## 6. v1.0 发布 CHG 的冻结动作清单（本文 → 冻结的转换步骤）

1. 逐面转正：§2 八面标注经用户批准后写入发布 CHG；「不在承诺内」清单随面一并转正
   （诚实边界是承诺的一部分——未列入承诺内的内容自动保持 v0.x 治理节奏，不因冻结而收紧）；
2. §3 breaking 政策批准生效（含 §3.4 特别条款）；
3. §4 核对表逐项复核（复跑 run-g2 `--tier all` 31 步全量 + verify_golden + oracle_base
   自检 + copy-guard，报告归档）；#11 残留两项给出裁定；
4. §5 待定项逐项给出「收敛前裁定 / v1.0.x 首项 / 继续挂起」三选一；
5. 本文归档为 v1.0 发布证据的输入件（与 EVAL_TRACK_GUIDE、CONTRACT、FAULT_CATALOG 同层）。

---

## 7. 冻结执行记录（2026-11-08，CHG-20261108-04——§6 五步逐项闭合）

1. **逐面转正 ✅**：§2 八面经用户 v1.0.0 发布指令（清算→冻结顺序执行）全部转正为
   **冻结（v1.0.0，additive-only）**；各面「不在承诺内」清单随面一并转正（诚实边界是
   承诺的一部分）；面② golden schema v2 先前已冻结，本次确认；
2. **§3 breaking 政策批准生效 ✅**：major+迁移指南五件套义务、§3.4 golden 字节冻结特别
   条款（强于 semver）、additive 边界（不改既有哈希输出/不翻既有门禁判据）、政策自指条款；
3. **§4 复核 ✅**：run-g2 `--tier all` **33/33** 两次独立（工作流内 + 主流程复验 57896ms）
   + verify_golden 五模型全 exit 0 + oracle_base 自检 exit 0 + copy-guard 0 命中，报告随
   `evidence/g8/v100-release.md` 归档；#11 两残留裁定=**修复**（scenario 枚举动态派生 ×2 +
   teaching/leaderboard 补挂步 32/33，CHG-20261108-03）；
4. **§5 六项裁定 ✅**（全按推荐）：① MG-001=**v1.0.x 首项**（草案+双路评审已就绪，批准
   轮修订清单 v090-release §3）；② A-5 三提案=v1.0 后逐步 G2b（FC P1→FL P2→GT P3）；
   ③ D-3 FMU=样本到即插；④ 插件化=维持不做（触发条件出现再议）；⑤ golden backend 信息块=
   维持留位；⑥ #11 两残留=修复（已落地）；
5. **归档 ✅**：本文作为 v1.0.0 发布证据（`evidence/g8/v100-release.md`）的输入件归档；
   行号快照声明维持（v1.0.x 维护轮按符号锚点重对）。

**登记（v1.0.x 清算清单，不阻塞冻结）**：FL thermal_track 卡自述复核（现状事实准确；〔v1.1.0
勘误（CHG-20261110-02）：本行原写「FC thermal_track 卡」为「FL」转写笔误——W5 复核 grep 实证
thermal_track 卡在 FL-001 systems.js:1830，FC-001 无此卡〕）✓（v1.1.0）；
engine.js:261 validateConfig 枚举文案派生化 ✓（v1.1.0：knownSystemIdsText 动态派生，:272-274）；
scenario.js:7 头注释契约行同步 ✓（v1.1.0：knownSystemIds 动态派生六系统式）；
systems.js thermo_track 卡定位声明随下次触碰复核 ✓（v1.1.0：GT thermo_track :2276 /
FL thermal_track :1830 定位实读——与 MG-001 SystemDef 同轮触碰）；FaultLab.html 差异随重打包
收敛 ✓（v1.1.0：1540.4→1633.2 KiB，file-smoke 207/207 复验）。
**——五项全清（2026-11-11，CHG-20261110-02；明细见 evidence/g8/v110-release.md §3）。**

---

**声明（v1.0.0 起语义更新）**：本文 §2 八面自 CHG-20261108-04 起**处于冻结状态**——
breaking 变更 = major 版本 + §3.3 五件套义务；additive 增长 = minor；冻结前的历史声明
（「准备清单不构成冻结」）作为 T6 时点记录保留于上文。

## 8. v1.1.0 additive 修订记录（2026-11-11，CHG-20261110-02）

本节为 v1.1.0 发布轮对本文件的全部修订索引——**全部 additive（事实同步行 +
「（v1.1.0，CHG-20261110-02）」标注），冻结条款语义零变化；§1 冻结转正记录与 §3 breaking
政策文本零触碰**：

- **面① 实例画像表增 MG-001 行**（model_id `MG-001`/1.0.0、聚合层 L0、19 信号、四族含零参数族
  island_event）+ 事实源行注记 MG001 :1373 / `ALL` 六成员 :2991——**五系统 → 六系统**快照；
- **面② golden 表增 mg001_v1 行**（5 Run、T-A、schema v2、approval CHG-20261110-01）+
  「既有 8 golden」计数快照 → **9 golden**（字节冻结承诺语义零变化，仅计数事实面更新并标注）；
- **面⑦ 步数快照 → 35 步 = core 28 + extended 7**（V110 DEC-5）+ 最近全量证据快照更新
  （2026-11-11 34/35——perf.mjs 时长门禁阻塞登记如实随附；G7 已于 2026-11-13 经
  CHG-20261110-03 闭合——31500 ms 再登记 + 35/35 两次独立）；§4 #9 行快照同步 + 判读附录；
- **面⑧ 词表快照 33/11 → 39/14**（D-27 评估/D-28 落地引用）；
- **§7 登记清算清单逐项清账标注**（五项 ✓ 全清）+ 该清单「FC」→「FL」转写笔误勘误
  （W5 grep 实证卡在 FL-001）。

## 9. v1.2.0 additive 修订记录（2026-11-13，CHG-20261113-02）

本节为 v1.2.0 发布轮对本文件的全部修订索引——**全部 additive（事实同步行 +
「（v1.2.0，CHG-20261113-02）」标注），冻结条款语义零变化；§1 转正记录与 §3 breaking
政策文本零触碰**：

- **面① FC-001 实例画像行更新**：信号 21→**24**（+3 新信号 T_st_K/V_stack_V/P_loss_stack_kW，
  `onTrackOnly` on 轨专属列、off 轨结构性缺席）+ level 增 **L1 电化学 on 轨**注记
  （electrochem_model off|on 默认 off；level_on 经 levelFor/summaryFor 派生——既有静态
  消费入口零变化）+ EQ 面增 **EQ-FCEC-1..7**（on 轨 model.electrochem 子对象承载）+
  事实源行 systems.js **v1.2.0 行号注**（FC001 :406 起、MG001 :1453、`ALL` :3071、
  `FL.systems` :3179——快照规则不变）；六系统成员不变、零新系统；
- **面② golden 表增 fc001_v2 行**（5 Run 镜像 fc001_v1 全集全 electrochem_model=on、T-B、
  schema v2、approval CHG-20261113-01、supersedes="fc001_v1（字节冻结留档）"）+
  「既有 9 golden」计数快照 → **10 golden**（v1.1.0 时点 9 + fc001_v2——字节冻结承诺
  语义零变化，仅计数事实面更新并标注）；
- **面⑦ 步数快照注**：**35 步维持 0 新步**（V120 DEC-5——verify_golden fc001_l1 并入步①
  DEFAULT_MODELS 三 golden、engine on 轨并入 engine-fc 既有步⑥；FIRST-35 机检既有 35 步
  零改动）+ 最近全量证据快照更新（2026-11-13 **35/35 × 2 独立**，perf 步 12255/12263 ms
  ≪ 31500 ms——G7 维持闭合）+ 步① label 滞后先例延续注；
- **面⑧ 词表快照维持注**：**39/14 基线维持**（本波零增词——FC on 轨文案走既有分域句式
  纪律，copy-guard 发布轮实跑 0 命中）；
- **§4 #9 行快照同步**（35/35 × 2 本轮——2026-11-13，证据 v120-release §4）；
- 面③/面⑤/面⑥/面④/§3/§1 零触碰（scenario 新键 `electrochem_model` additive 语义由
  面③ 冻结边界原文「新可选事件键……新键只影响使用它的输入」直接承载，B-1(a) 显式键
  条件式形态即对该边界的兑现，无需修订面③ 文本——已随 CHG-20261113-01 批准登记）。

## 10. v1.3.0 additive 修订记录（2026-11-14，CHG-20261113-05）

本节为 v1.3.0 发布轮对本文件的全部修订索引——**全部 additive（事实同步行 +
「（v1.3.0，CHG-20261113-05）」标注），冻结条款语义零变化；§1 转正记录与 §3 breaking
政策文本零触碰**：

- **面⑤ QP-4 放行注记（V130 DEC-4）**：「deriveChangePoints 首发的放行门槛数值」行追加
  放行注记——门槛已测量并公布：健康局假候选率实测值随 run-g2 步 19 发布、断言门槛 ≤0.2 +
  可测幅值故障局检出 ≥0.9（tests/arena-protocol-negative.test.js :278-284 实测机制），
  **首发前置解除**；盲包生成侧按既有协议面使用、判据零扩张；
- **面⑤ 评测轨覆盖扩张入池登记（V130 DEC-2 显式 CHG 面）**：ARENA_EXCLUDED 收缩为 **[]**——
  PV/WT/MG 三系统经 exposure 三值映射验证轮（ARENA_EXPOSURE_VERIFICATION_ROUND.md v1：
  逐信号核对表 × 盲包程序化验证、57 信号三值落点、19 条显式声明偏差登记、泄漏扫描零命中、
  通道集逐场景全等）入池；历史排除链批准注记保留（PV CHG-20261104-10 / WT
  CHG-20261107-01 / MG V110 DEC-4 CHG-20261110-01）；协议字段面零变化、附录 A 负例零触碰；
- **面① ARENA_EXCLUDED 快照引用同步（实读）**：「UI level 标签字符串与 ARENA_EXCLUDED
  名单」行追加快照注——现值 []（六系统全入池）；「UI 名单不入哈希承诺」语义不变；
- **面②/面③/面④/面⑥/面⑦/面⑧/§3/§1/§4 零触碰**：10 golden 不变（本波零新 golden）、
  run-g2 35 步 0 新步维持、词表 39/14 维持（copy-guard 发布轮实跑 0 命中）。


## 11. v1.4.0 additive 修订记录（2026-11-14，CHG-20261114-02/03）

- **面① FL-001 画像行**：signals 18→**19**（E_cap_kWh onTrackOnly）+ capacity on 轨注记 +
  EQ-FLTH-10..12（capacity on 轨）——全部 additive（capacity 声明面挂 SystemDef 子对象于
  model_hash 九字段域外，既有五数组逐字节不动）；
- **面② golden 表 + fl001_v3 行**（4 Run 镜像全 (on,on)/T-B/schema v2/approval CHG-20261114-01/
  supersedes=fl001_v2）+ 计数快照 10→**11 golden**（字节冻结承诺语义零变化）；
- **面⑦ 快照注**：35 步维持 0 新步 + DEFAULT_MODELS 四 golden + perf 阈值再登记 71500 ms
  （CHG-20261114-02，D-4 程序同构）+ 35/35 两次独立（111626/110026 ms）；
- **面⑧ 39/14 维持注**：v1.4.0 零增词（copy-guard 发布轮实跑 0 命中）；
- **§4 #9 快照**：v1.4.0 快照注（35/35 ×2 + 阈值 71500 ms）；
- 入池/pool/面⑤ 等 v1.3.0 修订零触碰；§1/§3/面③④⑤⑥ 零触碰。

## 12. v1.5.0 additive 修订记录（2026-11-14，CHG-20261114-05）

本节为 v1.5.0 发布轮对本文件的全部修订索引——**全部 additive（事实同步行 +
「（v1.5.0，CHG-20261114-05）」标注），冻结条款语义零变化；§1 转正记录与 §3 breaking
政策文本零触碰**：

- **面⑤ 诊断提交族覆盖注记（V150 DEC-2 显式 CHG 面）**：「不在承诺内」scenario_rules
  行后新增注记——诊断提交 faultType 枚举 4→**9 值**（+shading_step/gust_step/shading_link/
  gust_link/island_event——入池六系统目录活跃族全集 + none），**入池六系统全活跃族
  family/component 评分可达**；名实差修正（pv_shading_link/wt_gust_link 为 FAULT_CATALOG
  v1.7 目录项 id、族名为 shading_link/gust_link——枚举收族名不收 id）；协议批准文本无
  枚举清单载面，「规则代演进 = additive」口径——ARENA_EVAL_PROTOCOL_APPROVED.md 零
  触碰；附录 A 17 负例**零删减**（N-B18/N-B19 增补承载）；既有 4 值路径零变化探针；
  island_event 零参数族幅值不可达 → round_score 85.0 上限观察项登记（显式 CHG 候选）；
- **面② 11 golden 不变**（本波零新 golden——计数快照维持 v1.4.0 时点，零修订条目）；
- **面①/面③/面④/面⑥/面⑦/面⑧/§3/§1/§4 零触碰**：run-g2 35 步 0 新步维持（步 19/25
  断言数增为测试体量面、非步账面）、词表 39/14 维持（copy-guard 发布轮实跑 0 命中）、
  perf 阈值 71500 ms 维持（perf 步实测 12725/12568 ms）。

**文件结束**。V1_FACES v1（2026-11-08，T6 起草，CHG-20261108-01）→ v1.0.0 冻结转正
（CHG-20261108-04，用户 v1.0.0 发布指令链）→ **v1.1.0 additive 修订**（CHG-20261110-02：
六系统/9 golden/35 步/39 词——全部 additive，冻结语义零变化）→ **v1.2.0 additive 修订**
（CHG-20261113-02：FC L1 电化学轨/10 golden/35 步 0 新步/39 词维持——全部 additive，
冻结语义零变化）→ **v1.3.0 additive 修订**（CHG-20261113-05：面⑤ QP-4 放行 + 入池登记/
面① ARENA_EXCLUDED 快照同步/本 §10 修订记录——全部 additive，冻结语义零变化）→ **v1.4.0 additive 修订**
（CHG-20261114-02/03：FL capacity on 轨/11 golden/35 步 0 新步/39 词维持/阈值 71500 ms 再登记——全部 additive，
冻结语义零变化）→ **v1.5.0 additive 修订**（CHG-20261114-05：面⑤ 诊断族覆盖注记 4→9 值/
11 golden 不变/35 步 0 新步/39 词维持——全部 additive，冻结语义零变化）。
