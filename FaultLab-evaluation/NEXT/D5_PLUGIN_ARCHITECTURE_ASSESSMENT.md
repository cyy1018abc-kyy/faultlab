# D5_PLUGIN_ARCHITECTURE_ASSESSMENT — 插件架构评估稿（SystemDef / ScenarioTemplate / EvalAgent 可注册化）

> **性质**：评估稿（V090_WAVE_DESIGN DEC-4，2026-11-08）——**只评估、不定实现、零代码触碰**。
> 授权记录：V090_WAVE_DESIGN（CHG-20261108-01 批准，DEC-1…8 全采推荐项）；本文档为该设计
> §2 阶段一 T3 产出。评估结论为推荐性质，**不构成任何实现批准**；后续动作（若有）须另立 RFC
> + CHG，走 I-4 门禁纪律。
> **输入**：V090_WAVE_DESIGN §0/DEC-4/DEC-6 ｜ V06_ROADMAP 主线 D「D-5」行 ｜ V05_ROADMAP §0
> （I-1…I-5 不变式）｜ src/core/systems.js / scenario.js / arena-protocol.js / teaching.js /
> scope.js ｜ src/core/engine.js ｜ src/agents/arena.js / builtin-agents.js ｜ src/ui/pages/arena.js
> ｜ ARENA_EVAL_PROTOCOL_APPROVED（closed-world 评测协议）｜ V312_BACKEND_ADMISSION_CHECKLIST
> （准入先例）｜ tools/copy-guard.mjs / tools/run-g2.mjs。
> **现状描述的可核验性**：凡引现状均给出 `文件:行号`；三处关键行为（systems 注册表成员、
> scenario 封闭白名单对已注册系统放行/对未知系统拒收、错误文案静态清单滞后）以 Node 现场执行
> 复核（§7 评估方法与已执行核查）。
> **行号基线**：本文行号对 2026-11-08 本波工作区现状（含同波 T4/C-5 并行落地的
> src/core/scenario.js 场景共享信封扩展，scenario.js:507 起；同波 T5 的 engine.js
> thermo_track 分派改动亦已入工作区，engine.js 行号同样对当前工作区核对）；T4/T5 若再有
> 增删，scenario.js/engine.js 侧行号以最终提交态复核为准（systems/agents/teaching/scope
> 侧本波零改动，不受影响）。

---

## 0. 结论先行

**推荐：v1.0 不做插件化**（三面均不做——SystemDef / ScenarioTemplate / EvalAgent 的运行期
动态装载一律不实施）。

一句话理由：**封闭白名单不是插件化的障碍，而是本项目的治理资产本身**。三个面的「准入难」
各自由既有机制承载——SystemDef 准入难在 G2b（新物理必须走门禁，I-4），ScenarioTemplate 的
共享需求已被 C-5 文件流转覆盖，EvalAgent 的外部参与已被评测协议（数据进出、代码不进）解决。
插件化动的恰是这三道闸门，而它省下的成本（「往数组里加一行」）是三者中最便宜的部分。

**三条登记触发条件**（满足任一条 → 走 RFC 重开评估，不自动实现）：

| # | 触发条件 | 重开评估的范围界定 |
|---|---|---|
| TR-1 | **外部 SystemDef 贡献真实出现**：仓库外方向提出可验收的新系统贡献（含物理口径与教学定位），且数量预期 ≥2 个 | 评估「贡献 = 经 G2b 的 PR 进 systems.js」这一轻量形态是否已足够；仅当 PR 协作面本身成为瓶颈（如多方并行、发布节奏冲突）才评估注册表拆分（数据文件化），**不评估运行期代码装载** |
| TR-2 | **场景模板需求放量**：教学路径/场景模板的共享与再使用出现稳定多来源（教学场景模板外部提交 ≥10 个或跨机构流转成常态） | 评估**声明式模板登记**（纯数据注册，零执行语义——scenario schema v1 白名单与校验链原样保留）；不做模板内嵌逻辑/脚本 |
| TR-3 | **评测 Agent 生态成立**：外部 Agent 作者 ≥3 个持续参与、场次频次形成事实运营（协议 §1.2 触发架构 B 重评条件同源） | 按 ARENA_EVAL_PROTOCOL §1.2 既定方向评估**评测器独立进程形态**的扩展（Agent 仍在进程外、仍只交 JSON）；**不评估页面内动态装载第三方 Agent 代码**（§3.3 判定 ③ 的理由在生态成立后依旧成立） |

三条共同点：触发后评估的都是**登记与流转机制的形态**，不是「外来代码进主程序」；后者在本项目
的信任模型内没有候选形态（§3.3）。

---

## 1. D-5 的问题定义（V06_ROADMAP 行 → 本文范围）

V06_ROADMAP 主线 D 对 D-5 的定义（V06_ROADMAP.md:79）：

> D-5 ｜ v0.8.0 ｜ 插件架构评估（SystemDef/ScenarioTemplate/EvalAgent 可注册化；仅评估）｜ RFC

V090_WAVE_DESIGN DEC-4 细化评估维度（V090_WAVE_DESIGN.md:47-53）：现状 = JSON+约定注册已
覆盖多少、插件化收益 vs 攻击面/复杂度、准入审查成本；并预设推荐结论方向为「v1.0 不做插件化，
登记触发条件（外部 SystemDef 贡献出现时走 RFC）」——本文档对该方向做正反论证后给出独立结论
（结论一致，理由见 §3/§4）。

**范围排除**：本文档不定任何实现；不动 golden（本波 golden 零变更纪律）；不提案 engine.js
改动（零新仿真轨纪律）；不涉及 D-3 FMU（等样本，另线）与 I-1 云/账户（不做清单）。

---

## 2. 三面现状盘点（逐条代码行号）

### 2.1 SystemDef 面：模块内声明 + ALL 数组注册

- **声明**：五个 SystemDef（FL-001/FC-001/GT-001/PV-001/WT-001）全部为 systems.js 模块内的
  数据对象，经构造辅助 `chart/sig/comp/fault` 归一（src/core/systems.js:27-101）；文件头自述
  「五系统 SystemDef……纯数据 + 查询 API」（systems.js:2-3）。
- **注册**：`var ALL = [FL001, FC001, GT001, PV001, WT001]`（systems.js:2483），由它一次性构建
  `BY_ID` 反查表（systems.js:2484-2485）。**注册的全部动作 = 往一个数组加一项**。
- **查询 API**：`FL.systems` 公共面 list/get/defaultConfig/signalMap/faults/fault/component/
  causalTemplate/validateDraft（systems.js:2586-2596）；engine 内部走零开销 `_raw`
  （systems.js:2599-2604）。`get/requireSystem` 对未知 id 抛错（systems.js:2502-2506）。
- **注册的下游面（新系统真正要改的地方）**：
  - **engine 分派**：`simulate` 的 if/else 链逐系统显式分支，PV/WT 注释明文「显式分支必须置于
    else→GT001 兜底之前，禁止静默落入 GT 物理」（src/core/engine.js:2154-2163，R-4/R-7 守卫）；
    轨级分派再深入到函数内早退（thermal_model=on → simulateFL001Thermal，engine.js:600-602；
    inertia_model=thermo → simulateGT001Thermo，engine.js:1003）。物理本体是 engine.js 里的
    每系统函数（simulateFL001Thermal engine.js:705 / simulatePV001 engine.js:1311 /
    simulateWT001 engine.js:1417）——**SystemDef 数据只是目录，物理不是数据**。
  - **轨键盖章与枚举守卫**：defaultConfig 按系统 defaults 盖 inertia_model/thermal_model 缺省轨
    （systems.js:2566-2570）；engine validateConfig 对声明轨的系统做三值/两值枚举守卫
    （engine.js:288-292）。
  - **scenario 封闭白名单**：system 字段按 systems.js 注册目录动态成员校验
    （src/core/scenario.js:147-162，成员检查经 getSystem→FL.systems._raw.get，scenario.js:85-89）。
  - **评测协议通道目录**：盲包校验链 V-01 按 FL.systems 成员拒收未知 systemId，观测白名单按
    该系统 signals 的 exposure 三值映射派生（src/core/arena-protocol.js:496-510）；场景族池随
    系统故障目录派生（arena-protocol.js:180-186）。
  - **教学面**：teaching.js 按 FL.systems 动态生成目录文案（src/core/teaching.js:78-83）。
  - **scope 三档**：classify 是逐系统的锚点白名单（approved_p0 仅 FL-001；approved_fc 独立成表
    ——src/core/scope.js:17-30/42-52），新系统默认落 extension_preview。
  - **Arena 盲测池**：PV/WT 显式排除（`ARENA_EXCLUDED = ['PV-001','WT-001']`，
    src/ui/pages/arena.js:99-102——exposure 三值映射验证轮未做前不入池，注释依据
    systems.js:1121-1127）。
  - **单位词表**：UNITS 是集中字典，新系统的单位是「纯增项」CHG（systems.js:109-114，
    irradiance/temperature/pressure 即三系统各自新增的先例）。
- **层级派生**：FL-001 的 cfg 派生层级行 levelFor/summaryFor（systems.js:386-395）——静态字段
  之外已长出按 cfg 派生的第二形态，仍是模块内约定。

### 2.2 ScenarioTemplate 面：预设 + scenario JSON 封闭白名单

- **scenario schema v1 封闭白名单**（src/core/scenario.js）：
  - 常量即白名单：SCHEMA_VERSION=1、MAX_EVENTS=12、固定运行网格 60 s/0.1 s
    （scenario.js:29-36，注释明文「防止未来新系统静默漂移出 schema v1 运行面」）；顶层
    TOP_KEYS 五键（scenario.js:38）、事件级 EVENT_KEYS 九键（scenario.js:41）、轨枚举
    INERTIA_MODELS/THERMAL_MODELS（scenario.js:45/49）、已删族登记 DELETED_FAMILIES
    （scenario.js:54-56）。
  - 校验链全部封闭式：顶层未知字段拒收（scenario.js:134-138）、system 成员校验
    （scenario.js:147-162）、事件未知字段拒收（scenario.js:216-221）、family 须属系统目录且
    非「已删除」（scenario.js:245-262）、params 逐键 min/max/step 域（scenario.js:264-297）、
    t_start_s 采样网格+时刻域（scenario.js:299-318）、t_clear_s 仅 GT-001×actuator_fault
    （scenario.js:320-341）、inertia_model/thermal_model 仅声明轨的系统可用
    （scenario.js:343-380）。执行侧零新语义：逐事件经 FL.core.createConfig→
    FL.registry.createRun（scenario.js:461-505，I-6）。
- **教学路径预设**：7 条预设路径硬编码于 teaching.js（数据注释
  src/core/teaching.js:304-308），固定 5 步模板 STEP_TEMPLATE（teaching.js:40-46）、页面键
  校验表硬编码镜像 shell.js PAGES（teaching.js:33-37）、PATH_SCHEMA_VERSION=1
  （teaching.js:31）；校验器对预设与外来输入同规（validateTeachingPath teaching.js:119-158；
  scenarioSpec 双重校验=直查目录 + parseScenario 全量门，teaching.js:209-273）。
- **流转（C-5）**：导出信封已标准化——`{kind:'faultlab-teaching-path', version, path,
  content_checksum}`（teaching.js:287-301，确定性无墙钟，checksum 仅内容一致性核对、非签名，
  teaching.js:283-286）；场景 JSON 本身就是 schema v1 文件，导入走 parseScenario 封闭校验。
  C-5 落地 = 信封标准化 + 导入校验声明 + 手动文件流转（V090_WAVE_DESIGN DEC-3，
  V090_WAVE_DESIGN.md:41-45）。

### 2.3 EvalAgent 面：内置注册 + 协议接入双轨

- **内置 Agent（进程内、可信代码）**：`BUILTINS` 数组（src/agents/builtin-agents.js:14）+
  `defineBuiltin` 注册函数（同 id 覆盖、新 id 追加，builtin-agents.js:681-704）；模块尾注册
  五个确定性演示 Agent（threshold/residual/cusum/bayes/fusion，builtin-agents.js:758-807）；
  消费端 `create/list`（builtin-agents.js:732-747）。接口契约 `create(meta)→
  {reset/observe/diagnose}`，sample 只含盲观测通道（builtin-agents.js:2-6）。
- **页面 Arena（演示轨）**：createMatch 经 FL.agents.create 实例化内置 Agent，truth 由本轮
  隐藏场景派生、**驻留页面内存**并与诊断即时比对（src/agents/arena.js:314-365，truth 于
  arena.js:340、评分于 arena.js:357）；盲面三重过滤 blindObservables 与禁词断言 assertSealed
  复用协议共享模块常量（arena.js:116 FORBIDDEN_ID=FL.arenaProtocol.BLIND_ID_RE；
  arena.js:550/567；协议并集规则 ARENA_EVAL_PROTOCOL_APPROVED.md:158-165）。
- **外部 Agent（评测轨，协议 v2）**：外部作者**不进进程**——只经盲包（closed-world 白名单 +
  键名禁词 + 语义禁项三查合一，arena-protocol.js:58-61/441-588，V-06b 兜底
  arena-protocol.js:574-586）提交 JSON，由 Verifier 校验评分（validateSubmissionV2 绑定
  testset_id/match_id，arena-protocol.js:593-614；scoreV2 落章 score_hash，
  arena-protocol.js:642-697）；评分数值规格冻结文本 SCORING_SPEC_TEXT（arena-protocol.js:617-629）。
  协议正文明确双轨信任边界：演示轨真值在页面内存且「UI 开关非安全边界」（G0-DEC-11），评测轨
  真值仅评测器进程内存（ARENA_EVAL_PROTOCOL_APPROVED.md:20-32 §1.1/§1.2）。

---

## 3. 三面评估：外部贡献者需要什么、插件化的真实收益 vs 治理成本

评估口径：对每一面回答四问——①现状对外部贡献者的真实门槛是什么；②插件化能省掉其中多少；
③插件化新引入什么成本/攻击面；④判定。

### 3.1 ① SystemDef 插件化

**①-a 现状真实门槛（外部贡献者新增一个系统需要什么）**。以 WT-001（最近一次新系统全程）为
样本，门槛构成：

| 环节 | 内容 | 证据 |
|---|---|---|
| G2b 全流程 | 规格草案（WT001_G2B_SPEC_APPROVED，批准 v1.0）→ 双路独立评审 → 用户书面批准 | WT001_G2B_SPEC_APPROVED.md（NEXT/）；节奏先例 V090_WAVE_DESIGN.md:7（「批准留待用户，沿 PV-001/GT-L1 两波节奏」） |
| 物理实现 | engine.js 新仿真函数 + 显式分派分支（禁止静默兜底） | engine.js:1417（simulateWT001）、engine.js:2159-2162（WT 分派与 R-7 注释） |
| 目录注册 | systems.js 数据对象 + ALL 一行 | systems.js:1121-1127（WT 块注释）、systems.js:2483 |
| oracle + golden | 外置 oracle（Python stdlib）→ golden 重出/新建 → verify_golden 注册 | 8 golden/10 oracle 现状（本波任务书基线）；golden schema 冻结面 V090_WAVE_DESIGN.md:63-68 |
| 周边裁定 | scope 档位（默认 extension_preview）、Arena 入池裁定（exposure 三值映射验证轮 + 显式 CHG）、UNITS 词表纯增项、静态文案面同步 | systems.js:1121-1127；src/ui/pages/arena.js:99-102；systems.js:109-114；scenario.js:150/157（见 ①-d 现场核查） |

**①-b 插件化能省掉多少**。上表中插件化只作用于「目录注册」一行（systems.js:2483）——这是
全程中最便宜的一步。G2b、物理实现（engine 函数 + 分派）、oracle/golden、周边裁定四项全部原样
保留：新物理必须走 G2b 是 I-4 明文（V05_ROADMAP.md:25「L0→L1 物理扩展必须走 G2b」），不因
装载方式改变。**插件化的真实收益 ≈ 省一行数组代码**，前提却是支付一整套装载/校验/版本机制。

**①-c 插件化新引入的成本与攻击面**。核心矛盾：SystemDef 数据是目录，**物理在 engine.js**。
外部 SystemDef 插件化在工程上只有两种形态，均不可取：

1. **纯数据插件（仅目录元数据）**：注册面本来就是数据，插件机制没有增量；而该系统若无
   engine 分派分支，会静默落入 GT 兜底（engine.js:2163 else→simulateGT001）——这正是 R-4/R-7
   守卫明文禁止的事故形态（engine.js:2135-2139）。插件机制反而把「忘记加分派」从编译期可见
   （测试/评审拦）变成运行期静默错物理（R-4/R-7 守卫注释：engine.js:2156-2161）。
2. **带物理的代码插件（engine 分派点接受外来仿真函数）**：等价于让外来代码进入数值核心——
   model_hash/provenance/golden 证据链全部建立在该分派点可控的前提上（I-3，V05_ROADMAP.md:24
   「golden 由外置 oracle 生成、engine 只读比对」）；准入语义与 V312 后端先例完全同构（外来
   数值实现 = 自述 manifest + 容差档 + 不入验收路径，V312 §1/§7，V312_BACKEND_ADMISSION_
   CHECKLIST.md:16/81-89），而 V312 为**一个**后端适配器支付的准入成本是：G-1/G-2/G-3 三条
   机检守卫 + 逐字段容差档 + 4 条 scope-guard 断言 + 5 项打包 CHG（V312 §1/§2/§6/§8，
   V312_BACKEND_ADMISSION_CHECKLIST.md:16-18/26-32/68-77/91-99）。插件化 = 把这套成本从
   「每个外来实现一次」变成「平台一次 + 每个插件再一次」。

**①-d 现场核查（本评估实际执行）**：对已注册系统与未知系统的白名单行为做了 Node 现场复核
（§7 核查 N-1）：WT-001 场景（gust_step 族）被 scenario 封闭白名单正常放行并出确定性哈希——
**成员闸门是动态的，新系统注册后自动生效，无需改 scenario.js**；这进一步说明注册成本已接近
下限。同时复核暴露一处静态文案滞后：未知系统的拒收文案仍列「可用：FL-001 / FC-001 / GT-001 /
PV-001」（scenario.js:150/157），未含 WT-001（成员检查本身动态放行 WT-001，仅帮助文案滞后；
teaching.js 同类文案是动态派生的，teaching.js:78-83）。该滞后恰说明：**登记面的维护成本在
静态文案与测试同步，不在注册数组**——插件机制不消除文案同步成本，动态派生（既有代码已示范）
才消除，且后者不需要插件架构。

**①-e 判定**：不做。外部 SystemDef 贡献的正确通道 = 经 G2b 的 PR 进 systems.js（登记触发条件
TR-1 把「PR 协作面本身成瓶颈」设为唯一的再评估理由）；运行期代码装载不做。

### 3.2 ② ScenarioTemplate 插件化

**②-a 现状真实门槛**。共享一个场景/教学模板的门槛 = 写一份 schema v1 JSON 并通过封闭校验。
校验是全封闭的（§2.2 行号），但它校验的是**数据**：白名单键、目录成员、参数域、时刻域。
schema v1 运行面（60 s/0.1 s、≤12 事件、轨键枚举）是治理语义的编码（scenario.js:27-31 注释
「防止未来新系统静默漂移出 schema v1 运行面」），不是对贡献者的敌意。

**②-b 插件化收益**。「场景模板插件」的实体就是一份 JSON 文件——**文件即插件**。C-5 已把
流转做成信封标准化 + 导入封闭校验（teaching.js:287-301）+ roundtrip 测试（DEC-3 落地项，
V090_WAVE_DESIGN.md:41-45）；再建一层「模板注册表/装载器」相对文件流转没有语义增量，只有
一个区别：把「用户显式导入、校验拒收、错误可见」换成「启动期静默装载」。后者更差：导入失败
在 C-5 形态下是结构化错误列表（scenario.js:75-82 ScenarioError），在启动期形态下是「应用带病
运行」或「启动失败」。

**②-c 插件化成本**。模板白名单是治理资产本身（§5.3 论证：模板 narrative 是 copy-guard 禁词
红线的载体面之一；teaching.js:16-18 明文 narrative 遵守 UI_COPY_GUARDRAILS §6 且测试做 33
模式子串自检）。运行期从任意来源装载模板 = 把文案面移出 copy-guard 扫描域（§5.3）。

**②-d 判定**：不做。共享需求已被 C-5 文件流转覆盖（导入校验 = 事实上的逐例准入）；若未来
模板数量放量到「逐个手动导入成为摩擦」，触发 TR-2 评估**纯声明式**登记（数据文件注册、零
执行语义、仍过全量封闭校验）。

### 3.3 ③ EvalAgent 插件化

**③-a 现状真实门槛**。外部 Agent 参与评测的通道已存在且零装载：协议 v2 的设计就是「外部作者
只见盲包与公开协议，提交 JSON，代码不进进程」（ARENA_EVAL_PROTOCOL_APPROVED.md:20-32；盲包
closed-world 三查合一 arena-protocol.js:441-588）。准入 = 按协议格式提交，无注册制。

**③-b 插件化的形态与安全面**。「EvalAgent 插件化」若指运行期动态装载第三方 Agent 代码进页面/
应用，则：

1. **信任边界反转**：演示轨真值驻留页面内存（arena.js:340；协议 §1.1 明文 G0-DEC-11「UI
   开关非安全边界」）——被装载的第三方代码与真值同内存同特权，读 truth 即可满分，一切盲面
   保证（blindObservables 三重过滤、assertSealed、协议三查）对外来代码全部失效。协议 v2 之所以
   成立，正因为外部 Agent **在进程外**；插件化把它搬回进程内，等于废除该协议的威胁模型
   （§1.2：防区内攻击者 A1/A2 只见盲观测流/盲包，ARENA_EVAL_PROTOCOL_APPROVED.md:27-29）。
2. **评分完整性**：scoreDiagnosis 与 Agent 同内存（arena.js:171），外来代码可改写评分函数或
   truth 映射；score_hash 落章（arena-protocol.js:680-696）在进程内无法自证未被篡改。
3. **I-1 冲突**：动态装载外来代码 = 引入不可审计的运行期依赖面（外来代码可任意 fetch/网络/
   存储访问），与零安装零网络零构建的不变式精神冲突（I-1，V05_ROADMAP.md:22）；浏览器原生
   栈内可选的隔离手段（Web Worker/iframe 沙箱）引入构建与协议复杂度，且同源策略并不提供
   评分数据隔离。
4. **生态成立的正确答案已在协议里**：协议 §1.2 预设了生态成长后的演进方向——「对外排位/多人
   竞争性评测……届时评测器独立模型升级为唯一允许形态，页面演示轨须禁用真值显示」
   （ARENA_EVAL_PROTOCOL_APPROVED.md:31-32）。即 Agent 生态扩大 → 强化**进程外** Verifier，
   而非把 Agent 装进页面。插件化与协议自身指明的方向相反。

**③-c 判定**：不做。外部 Agent 的扩展方向 = 评测协议轨（已就绪、纯 CLI、页面零改动，
ARENA_EVAL_PROTOCOL_APPROVED.md:229-237 §8 MVP 五件套已按协议落地为 arena-protocol.js 等共享
模块）；TR-3 触发后评估的也是评测器独立进程形态的运营化，不是页面内装载。

---

## 4. 推荐结论与理由（v1.0 不做插件化）

**推荐：v1.0 不做插件化（三面均不做）。** 理由按权重排列：

- **R1 封闭白名单 = 治理资产本身**。scenario schema v1 顶层/事件/轨/参数四层封闭白名单
  （§2.2）、协议盲包 closed-world 白名单（arena-protocol.js:58-61/574-586）、scope SA-24 锚点
  白名单（scope.js:17-30）分别承载 I-6（场景=封闭白名单序列）、盲包零真值红线（协议 §1.3-2）、
  P0 验收纯度。三者的共同性质：**拒收未登记项不是缺陷，是功能**。插件化的本质是把「登记」
  变成运行期可扩的机制——即把资产变成攻击面。DEC-6 已把 scenario schema v1/SystemDef schema/
  eval protocol v2 列入 v1.0 冻结清单准备（V090_WAVE_DESIGN.md:63-68），本波冻结方向与插件化
  方向相反。
- **R2 插件化不替代既有准入，只在其上叠加**。新系统无论以何种形态到达都要过 G2b（I-4，
  V05_ROADMAP.md:25）；外来数值实现都要过 V312 式准入审查（§3.1-①-c 的成本对照）。插件机制
  对这些成本零减免，纯增：装载器本体需要规格、负例测试、门禁步（run-g2 步数账纪律 I-7，
  tools/run-g2.mjs:131-152——本波预算已申报 30→31 步、≤32，V090_WAVE_DESIGN.md:70-72）。
- **R3 三面的真实外部需求都已被更窄机制覆盖**：系统贡献 → G2b + PR（§3.1）；场景共享 →
  C-5 文件流转 + 导入封闭校验（§3.2）；Agent 参与 → 评测协议 JSON 通道（§3.3）。窄机制的
  共同优点：**准入单位是「件」不是「平台」**——一件一审、审计痕迹天然（文件/PR/提交），无需
  先建设平台级信任基础设施。
- **R4 成本错位**：三面现状的注册动作成本分别为「数组加一行」（systems.js:2483）、「一份 JSON
  文件」（scenario schema v1）、「按协议提交」（协议 §6.1）——都是全流程中最便宜的一环；
  插件化优化的恰是最便宜环节，付费的是最贵环节（门禁、测试、安全面、冻结纪律）。

**登记触发条件**：§0 表 TR-1/TR-2/TR-3。三条均以「外部需求真实出现且成规模」为门槛，防止
为想象中的生态预付架构成本；触发后的评估对象限定为登记/流转/进程形态，不包含进程内代码装载
（§3.3 判定 ③ 在任何触发条件下维持）。

---

## 5. 与 I-1/I-4/I-5 的相容性分析

### 5.1 I-1（零安装、零网络、零构建；V05_ROADMAP.md:22）

- **数据文件形态相容**：C-5 场景文件流转、TR-2 声明式模板登记均为纯 JSON 数据，浏览器原生
  FileReader/<input type=file> + Node stdlib 即可，不破 I-1——事实上 C-5 就是按 I-1 落地的
  （V090_WAVE_DESIGN.md:45「不做云/账户（I-1）」）。
- **代码插件形态不相容**：运行期装载第三方 SystemDef/EvalAgent 代码需要模块加载基础设施
  （import()/worker/求值器），外来代码自带不可审计的运行期依赖（网络/存储访问），实质引入
  第三方依赖面——V05_ROADMAP 不做清单明文排除 npm/打包器/服务端生态（V05_ROADMAP.md:166
  「服务端/云/数据库/npm/打包器 ｜ I-1 零安装零网络零构建」）。结论：**I-1 是代码插件化的
  硬否决项**；本评估推荐的三条触发条件全部限定在数据/进程形态，与 I-1 相容。

### 5.2 I-4（门禁纪律：先文档后代码、物理扩展走 G2b、CHG 留痕；V05_ROADMAP.md:25）

- **插件准入 = 等效 G2b + 准入审查**：插件化不改变「新物理 → G2b」的义务（外部贡献的系统
  含新物理口径与教学定位，正是 G2b 的对象）。比较两条路径的单位成本：

| 路径 | 平台建设成本 | 每件边际成本 | 现状证据 |
|---|---|---|---|
| 现行（G2b + PR） | 0（机制已存在） | 一次 G2b（规格+双路评审+用户批准）+ 实现 + oracle/golden + 周边裁定 | WT-001 全程（§3.1-①-a 表）；G2b 先例 5 份 APPROVED 规格（NEXT/） |
| 插件化 | 平台规格 + 装载/校验机制 + 负例与安全测试 + 门禁步 + 平台级 CHG | 上述 G2b 全套**照付** + 插件清单登记 + 装载兼容性审查 + 版本/回退裁定 | V312 单适配器准入成本（§3.1-①-c：三守卫+容差档+4 断言+5 CHG） |

  在外部贡献件数 < 平台建设摊销点之前，插件化路径的单位成本严格更高。本评估无法给出精确
  摊销点（未做实现估算，§7），但量级判断充分：平台建设自身就是一个 G2b 级工程。
- **CHG 留痕**：V312 §8 显示连「一个后端适配器实现」都打包 5 项 CHG 条目
  （V312_BACKEND_ADMISSION_CHECKLIST.md:91-99）；插件平台将使 CHG 面积乘以插件数。与 I-4
  相容的形态只有现行「每件一 CHG、门禁先行」。

### 5.3 I-5（合成演示定位：禁越界措辞，copy-guard 守护；V05_ROADMAP.md:26）

- **copy-guard 的守护域是静态的**：`SCOPES = ['src']`，仅扫 src/** 下 .js/.mjs/.html/.css/.json
  （tools/copy-guard.mjs:15/61）；docs/** 与 FaultLab-evaluation/** 明文豁免（copy-guard.mjs:5-7
  「docs/** 与 FaultLab-evaluation/** 是证据引用，不扫描」）。守护有效性依赖**全部用户可见
  文案都在 src/** 的可枚举文件集内**。
- **插件化击穿该前提**：外来 SystemDef 的 title/tagline/narrative、外来模板的 narrative、外来
  Agent 的展示名与描述，若经运行期装载，则文案面移出扫描域——I-5 红线（含孤岛/并网类表述
  红线：只能写「脱离主馈线的功率平衡重整演示」，不得出现电网保护/稳定验证类语义）对外来内容
  失去机检手段，退化为逐件人工评审。现行体系里同一风险由 G2b 评审 + copy-guard 双层承载；
  插件化去掉的是静态机检层，留下的是更贵的人工层。
- **现行数据流转形态相容**：C-5 导入的 scenario JSON 不携带文案（events/params 为数据，label
  为用户自填元数据不入哈希，scenario.js:415-419）；教学路径导出仅从仓库内预设导出
  （teaching.js:278-301）。即**数据进出不引入文案面，代码进出才引入**——与 5.1 同构的结论。

### 5.4 相容性小结

| 不变式 | 数据/文件形态（TR-1 PR、TR-2、协议轨） | 运行期代码插件形态 |
|---|---|---|
| I-1 | 相容（C-5 先例） | **冲突**（不做清单明文） |
| I-4 | 相容（每件一 G2b/一 CHG，现行纪律） | 形式上可行但成本反增（平台 CHG × 插件 CHG） |
| I-5 | 相容（数据不携文案面） | **冲突**（文案出扫描域，机检失效） |

结论：本评估推荐形态（不做插件化 + 三触发条件限定数据/进程形态）与三条不变式全相容；运行期
代码装载与 I-1/I-5 双冲突，作为**永久排除项**登记（任何触发条件下不重开）。

---

## 6. 与 V312 准入先例的成本对照（准入审查成本评估维度收口）

DEC-4 要求评估「准入审查成本」（V090_WAVE_DESIGN.md:50-52）。V312 是本仓库唯一已冻结的
「外来实现准入」先例，其结构可直接映射：

| V312 先例条目（后端适配器） | 若映射为「SystemDef/EvalAgent 插件」 | 增量含义 |
|---|---|---|
| G-1 准入门绑定：能力自述 + manifest 自洽 + 方程集 ⊆ 批准集，违者注册扫描**自始无效**（V312:16） | 插件清单 + 自述 manifest + 能力集 ⊆ 平台契约；注册扫描机检 | 需新建平台契约文档 + 扫描器（现为后端专项测试） |
| G-2 依赖冻结：license 未核实者禁止任何 import（V312:17） | 插件依赖声明与核实——**与零依赖原则正面冲突，几乎无通过空间** | 代码插件在本项目依赖纪律下事实上无合法依赖空间 |
| G-3 验收路径禁入：`admitted:false` 不生成任何步骤（V312:18） | 插件默认不入 run-g2/golden 路径 | 每插件一审查裁定 + run-g2 步数账联动 |
| tolerance_profile 逐字段档位，无量化依据不得注册（V312:26-32） | 每插件的 golden/容差档（新物理 = 新 oracle/golden，照 G2b） | 与现行一致，插件机制零减免 |
| scope-guard 4 断言：后端 Run 强制 extension_preview、classify 零改动（V312:68-77） | 插件产出 Run 默认隔离档 | 同构可复用，但需平台级断言层 |
| §8 打包 CHG 5 项（V312:91-99） | 平台级 CHG + 每插件 CHG | 乘数效应 |

对照结论：V312 展示的准入审查是**每件一次、机检固化、冻结后不放宽**的重流程；它的存在证明
「外来实现」在本项目有成熟的准入语义——而这套语义本身不依赖（也不奖励）插件机制。插件化
唯一能优化的注册动作（§3.1-①-b）恰在 V312 成本结构中权重最小。

---

## 7. 评估方法、已执行核查与局限

**已执行核查**（本评估实际运行，非转述）：

- **N-1 白名单行为现场复核**：Node 加载 hash/rng/systems/engine/registry/scenario 后执行
  `FL.systems.list()`（返回 FL-001/FC-001/GT-001/PV-001/WT-001 五系统）→ WT-001×gust_step
  场景过 `parseScenario`（ok=true，封闭白名单对已注册系统动态放行）与 `scenarioHash`
  （返回确定性哈希）→ 未知系统 XX-999 被拒收，拒收文案为「可用：FL-001 / FC-001 / GT-001 /
  PV-001」（scenario.js:150/157 静态字符串滞后于注册表的现场证据，成员检查本身不受影响）。
- **N-2 门禁工具现状**：运行 `node tools/copy-guard.mjs` → `PASS: no banned copy in src/**
  (33 patterns)`（守护域 = src/**，见 tools/copy-guard.mjs:15/61/74）。
- **N-3 步数账现状**：统计 tools/run-g2.mjs 带 tier 标签的步数 = 31（DEC-5 file-smoke 第 31 步
  落位后口径；步数账纪律注释块 tools/run-g2.mjs:131-152）。

**局限**：

1. 本评估为文档评估，未做插件机制原型实现，亦无性能/安全方面的现场测量数据（与「不定实现」
   性质一致）；摊销点判断为量级论证，非量化估算。
2. docs/V1_FACES.md（DEC-6 冻结清单，T6 并行工作面）撰写时点尚未落盘，本文对其口径的引用
   以 V090_WAVE_DESIGN.md:63-68 的 DEC-6 文本为准；若 T6 终稿与本文 §4-R1 引用的冻结面清单
   存在出入，以 V1_FACES 终稿为准（评审路 B 核对项，对应 V090_WAVE_DESIGN.md:103 风险 4）。
3. scenario.js:150/157 的静态文案滞后为现状记录，**本文不修复**（零代码触碰纪律）；是否随
   后续波次清算由 Lead 裁定（teaching.js:78-83 的动态派生为现成修法先例）。

---

## 8. 评估记录

- 结论：**v1.0 不做插件化**；登记触发条件 TR-1/TR-2/TR-3（§0）；运行期代码装载为永久排除项
  （§5.4）。
- 本文档性质：评估稿（DEC-4），不定实现；后续若有触发，动作入口 = RFC（V06_ROADMAP.md:79
  D-5 行门禁列即「RFC」）。
- 零代码触碰确认：本评估未修改 src/**、tests/**、tools/**、data/**；唯一产出为本文件。

**文件结束**。D5_PLUGIN_ARCHITECTURE_ASSESSMENT v1（2026-11-08，V090_WAVE_DESIGN DEC-4 评估稿）。
