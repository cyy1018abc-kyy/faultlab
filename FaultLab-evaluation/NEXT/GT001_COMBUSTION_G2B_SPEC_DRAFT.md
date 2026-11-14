# GT001_COMBUSTION_G2B_SPEC_DRAFT — GT-001 燃烧延迟二阶状态（τ_comb）G2b 物理规格草案

> **状态行**：`DRAFT v0.1（2026-11-14）——待双路独立评审 + 用户书面批准`。
> **任务**：A-5 P3 GT 燃烧延迟 G2b 草案起草（V150_WAVE_DESIGN §2 阶段一 W1；本波唯一 G2b
> 草案名额；承 A5_MULTIPHYSICS_EXPLORATION §3 提案二——V090 DEC-2 ②「GT：燃烧动态二阶状态
> （T3 已有，深化多状态燃烧延迟）」的顺延兑现）。
> **授权链**：V150_WAVE_DESIGN v1（CHG-20261114-04，2026-11-14，DEC-1…4 全采推荐项）——
> **P3 本波只到草案 + 双路独立评审（W2a 物理 / W2b 治理，互不可见）；批准与实现 v1.6.0+**
> （两波节奏——GTL1/FLCAP 先例）。**实现严格串行声明**：P1 FC 已于 v1.2.0 落地（FCECH-G2b-03/04，
> CHG-20261113-02）、P2 FL 已于 v1.4.0 落地（FLCAP-G2b-03/04，CHG-20261114-02/03）⇒ A5 §5
> 「P3 草案可与 P1/P2 并行起草、**实现严格串行**」的串行链已解锁——P3 实现不早于批准轮且
> 不得与 P1/P2 收尾面并发触碰（跨轨排期约束、非工期承诺——G0-DEC-15 句式）。
> **前置条件实读确认（A5 §3.4 ①）**：gt001_v3 链稳定且域扫描冻结已闭合（GTL1 §3.3.1
> :316-345 已兑现——mag=1.0 角点 min f = 49.002004 Hz、GL-8 内嵌断言 pass；gt001_v3 于
> v0.8.0 emit 在验）⇒ 观察窗条件满足。
> **主源**：A5_MULTIPHYSICS_EXPLORATION §3 全文（P3 提案原文——形态与治理成本评估源；
> :182-184 被排除形态硬伤原文）；体例模板 = FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 与
> FL001_CAPACITY_G2B_SPEC_APPROVED v1.0（**冻结后哈希先例全套**：B-1a 显式键条件式 / 子对象
> 于 model_hash 九字段域外 / onTrackOnly 列门控 / B-3a scenarioView 零投影 / 两门禁面——
> V120/V140 落地证实机制直接套用）+ GTL1_G2B_SPEC_APPROVED v1.0（thermo 轨现行权威文本——
> EQ-GTL1-1…12 / §2.3 更新序骨架 / §2.4 三值枚举 / §3.3 域扫描 / GL-1…8 自检体例）；
> 治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **Q-4 三守卫适用**：新方程集（EQ-GTL2 提案集）入引擎须走完整 G2b（即本文档流程——ALINE
> §1.2 第三行「新增状态变量/新物理（方程集扩展）→ 完整 G2b」）；许可证自研零依赖（RK4
> stdlib 自写 / 浏览器原生 JS）；验收路径禁入直至批准 + emit verify 通过。
> **本波纪律符合性（V150 §0 延续）**：golden 零变更（**既有 11 golden 字节冻结**——
> `ls data/golden/*.json` 实读 11 份，本稿只引用不 emit）；零新仿真轨（本稿为草案，
> engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/data/golden/** 全链只读引用、
> 零触碰）；零第三方依赖（I-1）；文案红线自查（本稿在 FaultLab-evaluation/**，不在
> copy-guard 扫描域 tools/copy-guard.mjs:15 `SCOPES=['src']` 内；本波实跑
> `node tools/copy-guard.mjs` → PASS（39 模式 0 命中）基线绿，§6.3 预检同轮登记）。
> **行号基准说明（2'）**：本文档行号引用为**起草时点（2026-11-14，V150 波 W1 树）实读值**；
> 本波 W3（O-1 扩展）落地后 src/** 行号会漂移，实现轮（GTCMB-G2b-03/04）以**语义锚点**
> （信号 id/检查 id/函数名/键名/方程 id/枚举常量名）为准定位，行号仅作快速索引（FLCAP/
> FC 两轮头部同款说明）。关键复核点实读（起草时点）：scenario.js:52 EVENT_KEYS、:56
> `INERTIA_MODELS=['swing','linear','thermo']`、:401 inertia 枚举守卫；engine.js:176
> normalizeConfig、:188-189 inertia_model 盖章行、:320-322 inertia 枚举守卫、:559-570
> model_hash 具名九字段 hashObject、:1517-1521 simulateGT001 顶部三分派
> （:1521 `cfg.inertia_model === 'thermo'` → simulateGT001Thermo）、:1654 simulateGT001Thermo；
> systems.js:779 GT-001 summary、:793 defaults `inertia_model:'thermo'`；
> scripts/verify_golden.py:88 MODELS dict、:166-180 `MODELS["gt001"]`（GTL1-G2b-03 重指向
> gt001_v3 形态——gt001_l1 独立键未设立）、:246 `DEFAULT_MODELS=["fl001","fl001_l1",
> "fc001_l1","fl001_cap"]`、:45-53 T-B 分派注记；tools/run-g2.mjs:99 STEPS（35 步 = core 28
> + extended 7，:152）、步③ `verify_golden.py gt001` 显式调用；src/ui/pages/arena.js:110
> `ARENA_EXCLUDED = []`（六系统全入池——v1.3.0，CHG-20261113-05）；tools/copy-guard.mjs
> BANNED 39 / ALLOW 14。

---

## 0. 定位摘要、边界与不动清单

- **GT-001 combustion 轨（L1 深化轨 · 燃烧延迟最小集）**：在 GT-001 既有三轨（linear/swing =
  L0b 遗留轨、thermo = L1 默认轨）**之外**新增第四轨（键面形态 = 本草案核心裁定点，§1.1
  二选一——批准轮裁定）：thermo 轨现行 f→T3 直映射（EQ-GTL1-3 燃料功率 Q_f = k_f·u_eff
  **瞬时**进入 EQ-GTL1-4 燃烧室能量平衡）之间插入**一阶燃烧/能量转换延迟环节**——新 ODE
  状态 x_comb（延迟燃料功率），状态向量 **y = [f, T3, x_comb] 由 2 维扩为 3 维**（A5 §3.1
  原文口径；τ_comb 延迟形态与精确式 = 批准轮定案，§1.3——零编造）。摇摆方程、调速器积分、
  电池下垂、三故障族注入面、60 s/dt=0.1/601 点库口径**全部不变**（§1.4）。
- **教学点草案（A5 §3.1 原文）**：负荷阶跃/清除过冲时 EGT（T4）响应相对功率指令的
  **滞后-超调形态**——L0b（τ_g 一阶跟随）与 L1（τ_3 热惯性）均不可见的**第二动态时间尺度**。
- **稳态面结构推论（预登记，§3.2）**：延迟环节在稳态（d/dt = 0）下 Q_f,d ≡ Q_f 精确成立 ⇒
  **延迟不改变稳态值、只改变暂态路径**——设计点 u=25 + sensor 稳态（u ≈ 19.65）+ u=40 钳位
  三点稳态不变（GTL1 §5 TESPy 三点口径 (a) 稳态解参照：tespy-independent-case.md 设计点 +
  TESPY_CORNER_EXTENSION_ASSESSMENT C1/C2 两角点 stdlib 口径 (a) 复算在案）；频率/负荷域
  复扫预登记（§3.3）。
- **做（本草案 = 起草面）**：键面张力三形态对照与推荐（§1.1——推荐不定案，批准轮裁定）、
  状态向量 2→3 维与新物理量诚实区分（§1.2）、τ_comb 延迟环节草案级结构与参数面框架
  （§1.3——数值零编造）、GT 既有面影响登记（§1.4）、assumptions/limitations/UI 措辞提案
  （§1.5）、场景/哈希/盲包涟漪登记（§2）、锚点结构预填与零变化硬条件（§3）、golden 计划
  （§4）、排期（§5）、红线自查（§6）、Q 点清单（§11——全候选 + 推荐**不定案**）。
- **不做（本草案显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **本草案不定实现**：零代码/golden/oracle 触碰；方程精确式/τ_comb 域/锚点数值**一律
     批准轮定案**（A5 §3.1「精确式/τ_comb 域『批准轮定案』零编造」原文）；实现须
     GTCMB-G2b-03/04 按批准文本执行（I-4：用户逐版本指令派发——v1.6.0+）；
  3. **thermo 轨原地深化 = 被排除形态（显式登记，A5 §3.2 :182-184 硬伤原文）**：「违反
     §1『emit 过的轨语义不得原地变更』——thermo 为默认轨（Q4 :226-230），原地变更将使全部
     新生成 GT Run 与已归档 thermo 场次的重放/比对语义漂移（gt001_v3 冻结锚点对新引擎
     失配），登记为硬伤」——本轨深化以**新轨形态**出生（ORACLE_INTERFACE_D2 §3.1 :127
     「模型/方法变更 → 新 id」；GT linear/swing 自 emit 起语义零变化、深化走 thermo 新轨
     而非改 swing——先例），thermo 值语义与 gt001_v3 全链冻结不动（对照表第三形态，§1.1）；
  4. **gt001_v1/v2/v3 字节冻结零涉**：三份既有 golden（含 .sha256 sidecar）字节级冻结留档；
     gt001_l1_oracle.py 物理零触碰（V-03 字节语义；GTL1 §4 项 9 冻结归档债 Q3 定案维持）；
  5. **相邻不做顺带确认（防口径滑移）**：压气机特性图/流量-转速耦合（GTL1 §6.1 项 1）、
     变比热（项 2）、燃烧室金属热容与燃气热容分离（项 4 后半）、点火延迟/熄火边界/贫富油
     极限（项 4 前半——本轨只取**燃烧延迟**最小集，A5 §3 源登记行）均维持登记不做，
     由该轨未来 G2b 轮独立裁定。
- **本轮不动清单（起草轮适用；实现轮按 §8 排期执行其点名工作面时不受相应条目约束）**：
  ① `tools/oracle/**` 全部零触碰（gt001_l1_oracle.py / gt001_oracle.py 物理零触碰——V-03）；
  ② `data/golden/` 既有 11 golden（含 gt001_v1/v2/v3 + .sha256 sidecar）字节冻结留档；
  ③ engine.js/scenario.js/systems.js/scope.js/scripts/verify_golden.py 零改动（均为实现轮
  显式工作面）；④ 不引入第三方依赖（I-1）；⑤ run-g2 35 步判据零翻转（0 新步预期——§4 项 9）。
- 时间尺度沿库口径：duration 60 s、输出网格 dt=0.1（601 点）、积分子步 0.01、默认注入
  t=20 s（FAULT_CATALOG §0——GT001 §4 网格决策维持）。

## 1. 模型形态

### 1.1 配置键形态（**核心裁定点——键面张力三形态对照；推荐不定案，批准轮裁定**）

对照维度按 FLCAP §1.1 六维体例 + A5 §3.2 指定面（语义耦合度 / golden 关联面成本 / verify
分流形态 / Arena 盲包指纹面）扩为八维：

| 维度 | 形态 a：`inertia_model` 枚举扩值 | 形态 b：正交二键 `combustion_model` | 形态 c：thermo 原地深化 |
|---|---|---|---|
| 形态语义 | 既有单键三值枚举（scenario.js:56）扩第 4 值（命名 Q2——A5 §3.2 原文示例 "thermo_comb"）；thermo 既有值语义冻结 | 新正交事件级键（默认 off；**前置条件 inertia_model=thermo 才可 on**——非法组合结构化错误拒绝） | capacity/延迟效应并入 thermo 既有值 |
| **gt001_v3 冻结涉面** | **零涉**——thermo 值解析/分派（engine.js:1521）/gt001_l1_oracle/gt001_v3 全链不动，深化轨以新值+新 golden（gt001_v4）出生 | **零涉**——thermo 轨全链不动，combustion 面以独立键+独立 golden 出生 | **breaking 排除**——thermo 为默认轨（systems.js:793），原地变更 = gt001_v3 冻结锚点对新引擎失配（A5 §3.2 :182-184 硬伤原文——V1_FACES §3.2 golden 语义级变更 = breaking） |
| 语义耦合度 | 燃烧延迟 = thermo 轨**同链深化**（EQ-GTL1-4 RHS 单项改道，§1.3）——非独立物理轴，枚举「互斥轨语义」自然（GTL1 §2.4 登记缺点已声明三值为「模型深度轨」语义，:243-246） | 组合语义弱——燃烧延迟非独立物理轴（A5 §3.2 原文自认）；FL capacity 为热面之上独立开关轴（正交），两先例语义结构不同构 | — |
| 非法组合排除 | 单键枚举天然排除（GTL1 Q2 理由 2 :219-222）——swing/linear 与燃烧延迟物理上不自洽 | 需组合拒绝规则（swing/linear ∧ on 无意义）——**恰是 GTL1 Q2 理由 2 当初避免的形态**（A5 §3.2 :181-182 原文「成本 S 级 + scenario 新键」） | — |
| 哈希/scenario 先例套用 | INERTIA_MODELS 枚举 +1 值（:56）——无新键、枚举守卫（scenario.js:401 / engine.js:320-322）自动覆盖；既有场景解析零变化（显式携带 inertia_model 的场景解析值不变、缺省场景解析 = 默认轨 thermo 不变 ⇒ 既有 scenarioHash 零变化；「新值只影响使用它的输入」= V1_FACES 面③ 冻结边界同构）；scenarioHash 含解析轨机制已随 GTL1 B-2（CHG-20261104-12 ③）落地 | EVENT_KEYS +1 键（:52 additive）+ 枚举常量（:60/:68/:77 同构）+ declaresCombustion 守卫（:404/:425 同构）+ FC B-1(a) 显式键条件式哈希（缺省轨只在 normalizeConfig 盖章层解析——engine.js:188-189 同构新行；face③ 冻结边界 V1_FACES:184-186 禁止缺省轨入哈希）+ validate 组合守卫（Q11 形态——FLCAP 双落点先例） | — |
| golden 路由面 | 单值四元映射（linear→v1 / swing→v2 / thermo→v3 / 新值→v4）——一一对应最简（GTL1 Q2 理由 3 :222 直接延续）；gt001_l1_oracle RUNS/golden 关联面**零触碰**（thermo↔v3 映射全保留，新值由新 oracle 承载） | 二元分派表 (inertia_model, combustion_model) 四行 + 非法组合拒绝行——FLCAP §4 项 10 三元分派表同构（面积更大但显式可枚举） | — |
| verify 分流形态 | 新条目或重指向二选一（Q7——gt001_v3 现行重指向形态 vs FL/FC 新条目形态，两先例并存登记） | 同左 + 组合守卫面 | — |
| Arena 盲包指纹面 | 默认轨维持 thermo（**不**翻转为深化轨——GTL1 Q4 翻转涟漪无必要重付，A5 §3.2 :179 原文）⇒ 盲包 config 指纹/观测语义零变化 | 默认 off ⇒ 盲包语义零变化（等价——非判别维度，登记平手） | 全部新生成 GT Run 语义漂移——盲包/归档双面失配 |

**推荐（不定案）＝形态 a（枚举扩值），四条理由（实读后独立给出，批准轮裁定）**：
① **语义耦合度判别**：燃烧延迟是 thermo 链内部的单项深化（燃料→燃烧室能量传递滞后），
不是可独立组合的物理轴——FL capacity 组合键先例的成立前提（容量面与热面正交、(on,on)
组合有物理意义）在 GT 侧不存在；单键枚举天然排除 swing/linear 深化组合（GTL1 Q2 理由 2
直接延续），形态 b 须新写组合拒绝规则（A5 §3.2 原文已预登记成本 S 级）；
② **涟漪面最小**：形态 a 全部涟漪 = INERTIA_MODELS +1 值 + engine 三分派前插一行 +
validate 消息串 additive——无新键、无新守卫、无盖章新行、无 defaultConfig 双落点（形态 b
按 FC/FLCAP 清单须六件套，涟漪 +1 级）；
③ **golden 一一对应维持**：三值→三 golden 映射零触碰、第 4 值纯 additive——verify 分派
单值映射比二元分派表简；FL §6.3 对 A5 枚举推荐的翻转依据（golden 关联面成本）经实读对
GT **不成立或反向**：GT 枚举扩值不触碰 gt001_l1_oracle（thermo↔v3 关联全保留），新值由
新 oracle 承载——golden 关联面在两形态下对称，非判别维度（诚实登记：FL 翻转先例的
成因是 FL 特有的正交组合需求）；
④ **键名语义漂移增量有限**：inertia_model 承载第 4 值的键名漂移已有文案承载（GTL1 §2.4
登记缺点 :243-246 已声明该键值为「模型深度轨」语义而非字面惯量形式——thermo 值本身已非
惯量语义，第 4 值为同语义轴延拓）。
**形态 a 的登记缺点与对冲**：键名漂移并非零增量（第 4 值 "thermo_comb" 类命名使键面
承载「轨+深化」两级语义——UI/schema 帮助文案须同步声明，GTL1-IMP-Q2 文案面同构）；
FLCAP §6.3 翻转先例表明枚举推荐可被批准轮推翻——本推荐为**可推翻推荐**（对照表保留
备查，批准轮裁定后按 §11 Q1 定案落正文）。

### 1.2 层级判定与状态向量（诚实区分——I-2）

**层级判定**：ALINE §1.2 第三行「新增状态变量/新物理（方程集扩展）→ 完整 G2b」——本轨
即该判定实例（thermo 轨已批范围 = EQ-GTL1-1…12；燃烧延迟环节超出该范围）。ALINE §1.1
L1 判据逐条对照（GTL1 §1.1 表体例）：新物理状态变量 = **x_comb 新动态 ODE 状态**（第三
动态状态）；方程不可手解 = (f, T3, x_comb) 三状态非线性耦合 ODE（x_comb 经 EQ-GTL1-4 修订式
反馈入 T3，T3 经效率链入 f——无闭式解，GTL1 §1.1 二维版判据的三维延伸）；需专用积分器 =
RK4 固定步长 3 维分区格式（§1.3）；golden 由独立数值 oracle 生成 = 新文件（Q5）。

**状态向量提案（诚实区分动态/代数——A5 §3.1 原文口径）**：y = [f, T3, **x_comb**]
（**2→3 维 ODE**）；x_comb 为**燃烧/能量转换延迟状态**（一阶燃料-能量传递滞后的状态
变量，物理量纲 kW——延迟后的燃料功率 Q_f,d）。其余物理量（T2/p2/T4/Q_f/P_comp/P_turb/
P_gen/η_cycle）为效率链代数输出，每个输出采样点由 (y, u_eff, demand, b) 重算——与
gt001_l1_oracle record() 同构（:313-347 实读）。**不把代数量冒称 ODE 状态**（I-2）。

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | sourceKind/exposure 提案 |
|---|---|---|---|---|---|
| f | ODE 状态（保留） | f_true_Hz（复用） | Hz | EQ-GTL1-7 原样 | L1 既有不变 |
| T3 | ODE 状态（保留） | T3_out_K（复用） | K | EQ-GTL1-4 **修订式**（RHS 燃料项改经 Q_f,d——精确式批准轮冻结） | MODEL_STATE → public_demo（既有） |
| **x_comb** | **ODE 状态（新）** | 不出信号候选（Q10） | kW | 延迟环节状态（§1.3）；T3_out_K/既有列承载教学面 | —（若裁零新信号则无列） |
| Q_f | 代数（保留） | Q_fuel_kW（复用） | kW | EQ-GTL1-3 原样（k_f·u_eff——**指令映射口径维持**，Q10 联动裁定） | DERIVED → public_demo（既有） |
| 其余代数链 | 代数（保留） | 复用（T2/p2/T4/P_comp/P_turb/η_cycle） | — | EQ-GTL1-1/2/5/6/12 原样 | 既有不变 |

**盲包面（GTL1 §1.2 B-1 先例）**：GT 在盲测池（arena.js:110 `ARENA_EXCLUDED=[]`——六系统
全入池，v1.3.0）；若裁零新信号（Q10 推荐）则盲包观测面/序列面零新增；若裁新列则沿
「不入池显式声明」+ onTrackOnly 门控（Q10 备选——FL/FC 先例：新列在既有轨结构性缺席
不建列，run_hash signals 面零变化）。**GT 无 FL 式 SOC 定义面**——FL onTrackOnly 先例中
E_cap 的 'soc' 类目归属不可平移：GT 新信号（若有）类目按物理定（功率/热力类目——具体
类目 id 以 systems.js GT-001 signalCategories 现值实读为准，实现轮核对登记，不编造）；
GT 的 SOC_true/SOC_est 列为电池下垂记账沿袭面，本轨**零裁定、零口径变更**（记账式原样，
暂态路径随 f 轨变化、稳态不变——§3.2）。

### 1.3 τ_comb 延迟环节（草案级——**精确式/τ_comb 域批准轮定案，零编造**）

- **A5 §3.1 原文（:159-167，提案唯一权威描述）**：「thermo 轨现状 y = [f, T3] 二维……
  燃料功率 Q_f = k_f·u_eff 经 EQ-GTL1-3 **瞬时**进入燃烧室能量平衡 EQ-GTL1-4……深化草案：
  增**燃烧延迟状态** x_comb（一阶燃料-能量传递滞后，`τ_comb·dQ_f,d/dt + Q_f,d = Q_f`，
  τ_comb 为教学整定值非实测），状态向量 **y = [f, T3, x_comb]（2→3 维 ODE）**；EQ-GTL1-4
  RHS 的 η_b·Q_f 项改经 Q_f,d 进入（精确式 G2b 冻结）」。
- **τ_comb 形态（Q3）**：(a) **一阶滞后 + 新 ODE 状态**（上式——A5 原文形态，2→3 维结构的
  直接前提）【推荐】；(b) 纯传输延迟（dead time——无新 ODE 状态、与 A5「2→3 维」原文
  直接冲突，诚实登记为备选不推荐）；(c) 二阶/高阶滞后（涟漪升级，无 A5 依据）。
- **RK4 3 维分区格式（GTL1 §2.3 骨架结构性复用——:182-203）**：u 仍非 RK4 状态（每子步按
  L0b 更新序显式推进，EQ-GTL1-9/10 原样）；x_comb 进 RK4 物理状态（RHS = (Q_f − x_comb)/
  τ_comb，Q_f 子步冻结于起点右值）；事件边界性质维持——t=20.0/t_clear=35.0 恰在子步边界
  （GTL1 §2.3 注记③ :208 实现约束）。**子步解析交叉证据面**：x_comb 子步内为常系数线性
  ODE（Q_f 冻结口径）⇒ 精确指数解存在——FL FL-7 / FCAP-7 / FEC-7 同构交叉面（FLTH/FLCAP/FC
  三轮先例），数值方法登记归批准轮冻结。
- **精确式待决子项（批准轮随 EQ-GTL2 冻结文本一并定案，本草案只登记不预设）**：
  (i) EQ-GTL1-4 修订式中 **ṁ_g 的燃料项口径**（ṁ_f = Q_f/LHV 即时 vs Q_f,d/LHV 延迟——
  质量与能量是否同源经延迟环节）；(ii) **E_fuel 积分口径**（指令面 ∫Q_f dt 维持 vs 交付面
  ∫Q_f,d dt——一阶滞后下两口径差 = τ_comb·(x_comb(60)−x_comb(0)) 恒等式，精确可核）；
  (iii) EQ-GTL1-12 检查式在新轨的重推形态（GL-2 同构）。
- **参数面框架（τ_comb——数值零编造，批准轮定案 + 域扫描证据）**：τ_comb 单位 s、
  **教学整定值非实测**（A-gtl1-combustor-lump :429「教学整定等效时间常数（假设非实测参数）」
  句式先例）；整定依据五项判据框架：① **与 τ_3 = 2.0 s / τ_g = 2.0 s 同量级异值**（GTL1
  R-7「同值误读」:505 的反向运用——**有意取异值**并在 assumption 声明，A5 §3.4 ② 原文；
  候选量级与 τ_3 同量级，具体数值批准轮域扫描定案）；② 60 s 窗内滞后-超调形态教学可见
  （T4 相对 P_gen_cmd 的相位滞后可辨——A5 §3.1 教学点）；③ RK4 显式步长稳定裕度
  dt/τ_comb ≪ 2.78（FL A-6 / FC 稳定域登记先例同构）；④ |Δf| ≤ 1 Hz 有效性域全量重扫
  （§3.3 emit 硬条件）；⑤ T3/T4 包络重推（§3.3）。

### 1.4 GT 既有面影响登记（零变更面清单）

| 面 | 登记 |
|---|---|
| 摇摆方程/机械接口 | EQ-GTL1-7 原样（P_rotor 定义恒等 Q1 定案维持；r_true ≡ 0 检查面零涟漪） |
| 调速器/执行器 | EQ-GTL1-9/10 原样（燃料指令域钳位 [0,40] 维持；u_cap 事件域口径 Q5 定案维持） |
| 电池下垂/SOC | EQ-GTL1-8 原样；SOC_true/SOC_est 记账式原样（暂态路径随 f 变化、稳态不变——§3.2；GT 无 FL 式 SOC 定义裁定面——§1.2 行） |
| 测量链 | n_meas = 60·(f + b)、f_channel_diff、f_meas 通道全部原样（测量链零升级——FC Q5「测量/控制链零升级」同构）；噪声关闭/开启口径不变 |
| 负荷面 | demandAt 原样（load_step 族注入面零变化）；GT 频率响应经 f 轨承载燃烧延迟暂态 |
| 事件编码 | EV-001/EV-002 事件编码 v1 零变化（GT001 §9 定案追记六场景对齐维持；事件快照变量面零扩展预期——实现轮核对） |
| 因果模板 | causal-rules thermo 模板 additive 扩展（GTL1 §4 项 8 :378 先例——模板为既有三族变体节点，零新事件族） |

### 1.5 assumptions / limitations / UI 措辞提案（草案级——批准轮冻结；实现轮迁入 src/** 前 §6.3 预检 + copy-guard 终检）

| id | text（提案） |
|---|---|
| A-gtcomb-lag | 【仅 combustion 深化轨适用】燃烧/能量转换延迟为一阶滞后环节（τ_comb·dQ_f,d/dt + Q_f,d = Q_f，延迟状态 x_comb）：τ_comb 为教学整定值（非实测参数），与 τ_3 = 2.0 s / τ_g = 2.0 s 有意取异值（同量级对照设计——同值将不可区分第二动态时间尺度）；精确式与取值见批准规格。 |
| A-gtcomb-steady | 【仅 combustion 深化轨适用】延迟环节不改变稳态值、只改变暂态路径（d/dt = 0 ⇒ Q_f,d ≡ Q_f）：设计点与注册域稳态解与 thermo 轨逐点同；暂态路径（滞后-超调形态）为深化轨独有教学面。 |
| A-gtcomb-l1 | 【仅 combustion 深化轨适用】燃烧延迟模型为教学尺度降阶环节示意（L1 深化轨），不是经过验证的设备控制器或机组燃烧系统模型。 |

limitations 追加（深化轨域，3 项）：① 点火延迟/熄火边界/贫富油极限与燃烧室金属-燃气热容
分离维持未建模（GTL1 §6.1 项 4 剩余面——本轨只取一阶延迟最小集）；② τ_comb 与 τ_3/τ_g
的形态区分依赖有意异值整定（同值域内第二时间尺度不可辨识——教学可辨识性声明，A5 §3.4 ②）；
③ 沿袭 thermo 轨全部局限（GTL1 §6.1 十项）。UI 变体提案：深化轨 = 「L1 · 燃烧动态延迟
模型（数值仿真级）」；summary 追加「燃料功率经一阶延迟环节进入燃烧室，EGT 呈滞后-超调
第二时间尺度（教学观察面）」；定位句「教学尺度燃烧-热降阶链示意（L1 深化轨），非机组/
电网动态验证」——预检见 §6.3。

## 2. 场景/事件族影响面（零新事件族 + 键面 additive 显式 CHG）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / load_step / actuator_fault 三族（含 actuator_clear 局）定义、参数域、defaultTime、因果模板零变更——深化轨仅物理响应面变化（同故障跨深度对比 = 教学点，ALINE §6.4 固定句式「模型深度导致的表达力差异」） |
| scenario 键面 | **形态 a**：INERTIA_MODELS（scenario.js:56）additive +1 值——无新键，枚举守卫（:401）自动覆盖；跨深度对比场景经 inertia_model 显式钉轨（GTL1 B-2 机制延续——scenarioHash 含解析轨，新值场景 additive 入哈希、既有场景哈希零变化）。**形态 b**：EVENT_KEYS（:52）additive 新键 + 枚举常量 + declaresCombustion 守卫 + B-1(a) 显式键条件式哈希（FC Q9 定案先例——face③ 冻结边界禁止缺省轨入哈希形态）。**两形态均须显式 CHG 登记**（GTL1 §2.4 B-2 / FC 面③ 先例——additive） |
| 哈希面（先例套用） | model_hash：深化轨全部声明面（A-gtcomb-* assumptions、深化轨 limitations、EQ-GTL2 提案集 equations、level/summary 变体）**挂 SystemDef 模型级 additive 子对象（FC `model.electrochem` / FL `model.capacity` 先例同构）——置于 model_hash 具名九字段哈希域之外**（engine.js:559-570 hashObject 输入清单：model_id/model_version/assumptions/limitations/equations/units/claims/unit_system/equation_ids——**不加入**）⇒ model_hash/run_hash/config_hash 既有输入零变化；既有五数组逐字节不动 |
| 新信号列门控 | 若 Q10 裁新列：**onTrackOnly 标记**（systems.js FC 三信号 :566-568 先例同构）——thermo 轨结构性缺席不建列 ⇒ run_hash signals 面零变化（V120/V140 落地证实机制）；若裁零新信号（推荐）则本面整体归零 |
| config_hash 投影 | scenarioView **不入深化轨键**（inertia_model/thermal_model/electrochem_model/capacity_model 现状均不入——schema.js 同构）；**显式登记已知局限：轨区分由 run_hash/序列内容承载——不静默**（FC B-3a 先例照录） |
| 事件快照 | 零扩展（x_comb/Q_f,d 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | GT 在池（ARENA_EXCLUDED=[]）；默认轨不动（形态 a 不翻转默认——§1.1）⇒ 盲包 config 指纹/观测语义零变化；新信号（若有）不入盲投影显式声明（GTL1 §1.2 B-1 先例）；未来盲包钉深化轨须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号 additive（assumptions 走模型级 additive 子对象）；面② 新 golden 新 id（gt001_v4）；面③ scenario 键面 additive（显式 CHG）；面⑥ scope 零改动预期（GT classify 消费面实现轮实读核对——登记不预设）；面⑦ 步数账 0 新步预期（实现轮 CHG 申报）；面⑧ 词表零增预期——**零 breaking 预期**（既有 11 golden 零触碰 / 既有哈希零变化 / 既有 35 步判据零翻转，V1_FACES §3.4 additive 边界三条逐一对照） |

## 3. 锚点与包络（thermo 轨逐位硬条件；深化轨数值 = 批准轮域扫描值——本草案零编造，emit 复算冻结）

### 3.1 thermo 轨（无 combustion 值域）与 gt001_v3 逐位同——零变化硬条件（三层佐证体例沿 FLTH §3.3 / FC §3.1 / FLCAP §3.1）

1. **代码结构佐证**（本草案轮实读）：`grep -rn "combustion_model\|thermo_comb\|x_comb" src/`
   = 0 命中（2026-11-14 实跑）——本轨未触任何代码；GT 分派链现状（engine.js:1517-1521
   三分派 + :1654 simulateGT001Thermo）即全部既有轨代码路径；
2. **数值佐证**：gt001_v1/v2/v3 三份冻结 golden 在验（run-g2 步③ `verify_golden.py gt001`
   显式调用验 v3——T-B 全轨比对；engine-gt.test.js 双 golden 比对面 linear→v1 / swing→v2 /
   thermo→v3）；gt001_l1_oracle GL-1…8 自检 exit 0 为 emit 现状；copy-guard PASS（39 模式
   0 命中，本波实跑基线绿）；
3. **实现轮零变化判据（GTCMB-G2b-04 验收项——FC §3.1 项 3 B-2 形态合并重述）**：
   **关键句式：深化轨未激活时（inertia_model=thermo 或默认轨）全链与既有轨逐位同——
   thermo 轨与 gt001_v3 逐位同、linear/swing 轨与 gt001_v1/v2 逐位同**。判据 = t/signals/
   metrics/checks/config_hash + 对应 golden 比对零变化 + run_hash 逐位同；承载机制
   （形态 a 下）：枚举扩值不改既有值解析（:56 三值解析路径零变化）+ 声明面挂 additive
   子对象（model_hash 九字段域外）+ 新列 onTrackOnly 门控（若裁新列——Q10）；
   tests/registry.test.js 哈希面既有断言零变化（仅 additive 新断言——深化轨 Run 哈希为
   新值）；既有引擎/GT 测试断言零改动通过；
4. **预期失效面（非「变化」，登记）**：SystemDef.signals 若 +1 ⇒ 信号目录 additive
   （manifest model_hash 零变化——signals 不在 :559-570 哈希域，FC §3.1 项 4 定案同款）；
   registry.test.js additive 新断言；FAULT_CATALOG §1 注记行；UI 层级徽章变体（thermo 视图
   零变化，深化轨视图 additive）。

### 3.2 稳态不变性结构推论（预登记——本节为结构声明，数值归批准轮域扫描冻结）

| 项 | 结构声明 | 依据形态 |
|---|---|---|
| 稳态不变性 | 延迟环节 d/dt = 0 ⇒ Q_f,d ≡ Q_f 精确 ⇒ EQ-GTL1-4 修订式在稳态与原式重合 ⇒ **深化轨与 thermo 轨渐近稳态逐点相同**（f_ss/T3_ss/P_gen_ss/Q_f_ss 全同）——延迟不改变稳态值、只改变暂态路径 | 一阶滞后结构推论（数学恒等） |
| 三点稳态不变（v1.3.0 TESPy 附录三点口径 (a) 稳态解参照） | 设计点 u=25（P_gen=25 kW ∧ T3=1173 K——EQ-GTL1-11 双条件）+ sensor 稳态（u ≈ 19.65——GTL1 §3.2 渐近稳态口径）+ u=40 钳位角点：三点稳态解在深化轨**结构不变** | GTL1 §5 :388-391 三点 + TESPY_CORNER_EXTENSION_ASSESSMENT C1/C2 stdlib 口径 (a) 复算在案 |
| 健康局逐位同（条件于 Q11(a) 初值） | x_comb(0) = k_f·u(0)（= k_f·25，设计点稳态燃料功率——GTL1 §3.1 冻结值 Q_f ≡ 101.7633 kW 同源）⇒ 健康局全序列 dx_comb/dt ≡ 0、x_comb ≡ Q_f ⇒ (f, T3) 轨与 gt001_v3 healthy **逐位同**；monitor 轨同（b 不进物理回路——GTL1 GL-3/GL-8 monitor 恒等先例同构） | 结构推论；healthy/monitor 锚点面零扰动（GTL1 §3.1 健康局固定点机制的三维延伸） |
| 故障 Run 暂态路径 | sensor/load/actuator/clear 四 Run：稳态同、暂态路径变（滞后-超调形态——T4 相对 P_gen_cmd 相位滞后；方向/量级**批准轮域扫描定案**，本草案不预设数值与方向） | A5 §3.1 教学点草案 |
| 频率/负荷域复扫（预登记） | |Δf| ≤ 1 Hz 有效性域与 T3/T4 包络（thermo 域冻结值：T3 [735.2, 1524.9] K / T4 [486.6, 1001.2] K——GTL1 §3.3）**全量重扫** = 深化轨 emit 硬条件（GTL1 §3.3.1 域扫描冻结先例同款：sensor_drift mag ∈ [0.05..1.0] 步 0.05 共 20 点 + mag=1.0 角点断言内嵌自检——越界即 emit 拒绝写盘） | A5 §3.1 :166-167 原文「|Δf| ≤ 1 Hz 有效性域与 T3/T4 包络全量重扫」+ GTL1 §3.3 :313 / A-gtl1-speed-coupling :431 emit 硬条件纪律同款 |

### 3.3 深化轨锚点结构（数值留批准轮——本草案只冻结锚点口径与判据形态）

健康局锚点表（口径冻结、数值 = 批准轮域扫描值）：T3(0) = 1173.0 K（EQ-GTL1-11 设计点，
GTL1 §2.1 冻结值）；f ≡ 50（GL-3 固定点）；x_comb ≡ Q_f ≡ k_f·25（§3.2 行——逐位同判据）；
共享信号面（f/P_gen/P_bat/SOC/r_true/f_channel_diff）与 gt001_v3 healthy 逐位同。同故障
分歧预期表（结构预登记，数值批准轮）：sensor_drift 渐近稳态 f = 50−b 不变（调速器积分
结构决定稳态——GTL1 GL-6 机理跨深度成立）；load_step nadir/恢复路径暂态重推（数值批准轮）；
actuator 钳位稳态 18.266 kW 类锚点不变（燃料域钳位稳态 = 延迟环节零增益点）；actuator_clear
过冲形态重推（滞后使过冲时间相位后移——方向不预设，批准轮复算）。**锚点终值由新 oracle
emit 冻结为准**（GTL1 §3 头注「锚点终值以 oracle emit 输出为准冻结」先例）。

## 4. golden 计划（gt001_v4 · 新 id · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本草案轮零改动维持——emit = GTCMB-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **gt001_v4**——方程集扩展超出已批 EQ-GTL1-1…12（ALINE §1.2 第三行）→ 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1 :127）；保 id 重出不适用（非引擎行为零变更原地扩容）；**supersedes 链 v4→v3→v2→v1**（四代 golden 链管理成本——A5 §5 :278 原文登记面） |
| 2 | 独立 oracle | 新文件（**命名 Q5**——推荐 `tools/oracle/gt001_comb_oracle.py`，MODELS 键镜像 `gt001_comb`）：独立性声明沿 gt001_l1_oracle.py:1-16 体例——不 import src/**、不 import gt001_oracle/gt001_l1_oracle、方程与常量唯一权威文本 = 本规格批准文本、stdlib（python -I）自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）；**gt001_l1_oracle.py 物理零触碰**（V-03） |
| 3 | 数值方法 | **y = [f, T3, x_comb] 三维经典 RK4** dt0.01（GTL1 §1.3/§2.3 分区格式三维延伸；RHS 内 demand/b/u_eff/Q_f 冻结子步起点）；x_comb 子步内常系数线性 ODE ⇒ RK4 vs 子步解析指数交叉证据面（FL FL-7 / FCAP-7 / FEC-7 先例同构；判据挂实测冻结制 ×≥10 且下限 ≥1e-9）；禁 ULP 级承诺（T-B 制度） |
| 4 | 自检预案 | 新段 **GCMB-1…n（Q6）**：GCMB-1 环境校验（gt001_v3 6 Run 全序列复现——oracle 侧复刻 thermo 轨作退化校验：τ_comb 环节旁路/初值恒等下与 gt001_l1_oracle 输出逐位同，双 oracle 交叉面）；GCMB-2 恒等式（r_true ≡ 0 / EQ-GTL1-12 修订重推 / 延迟环节积分恒等式 §1.3(iii)）；GCMB-3 稳态不变性断言（三点稳态解与 thermo 轨逐点同——§3.2）；GCMB-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义）；GCMB-5 锚点全表复算（§3.3 批准轮冻结值）；GCMB-6 monitor 恒等（f≡50、x_comb≡Q_f 全序列）；GCMB-7 半步长自收敛登记 + 子步解析交叉（实测冻结制）；GCMB-8 无 NaN/Inf + 包络抽查（T3/T4 包络重推值 + **sensor_drift mag=1.0 角点 min f > 49.0 断言**——GTL1 GL-8 A-2 emit 硬条件同款内嵌） |
| 5 | Run 集（**Q8**） | **镜像 gt001_v3 全集 6 Run、全部深化轨**：healthy / closed_loop_fault（sensor +0.3）/ monitor_only / load_step +10 / actuator_fault 50% / actuator_clear（t_clear=35）——新 id golden 镜像基线全集先例（GTL1 §4 项 4 :374「镜像 gt001_v2 全集」/ FLTH v2 镜像 4 Run / FC Q6 镜像 5 Run）；monitor 不变量判据面保留 |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="gt001_v4"；model_id="GT-001"；model_version **Q12**（候选 1.3.0 升位沿 GTL1 1.2.0 先例 / 1.2.0 维持沿 FC Q1 定案 B 句式——附 GT classify 消费面实读核对项）；method_id 提案 "gt001_comb_rk4_dt0.01"（gt001_l1_rk4_dt0.01 句式）；engine_baseline=null；backend=null；**inertia_model="<深化值>" 入 config 块与顶层 + run 项**（gt001_v3 config 惯例——oracle :812-835 实读形态）；supersedes="gt001_v3（thermo L1 轨，字节冻结留档；存档场次继续引用 v3）"；units 零新增预期（kW/Hz/K/kPa 全既有）；approval 三字段非 null 首签引批准 CHG；SERIES_IDS 终值 = gt001_v3 27 列实读 + Q10 裁定（零新信号 ⇒ 27 列同集；新列随 emit 核对，不预断） |
| 7 | 容差 tier（**Q9**） | **T-B 预期**（同法 RK4 三维、独立双实现——ALINE §3 T-B 定义行；GTL1/FLTH/FLCAP/FC 四轮同制）+ **降 T-C 双向预案**（散差超预案 → T-C + convergence 块必附）；gate 块键面预案 = **gt001_v3 gate 全键面镜像**（f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_rtol/P_kW_atol/E_kWh/SOC_pp/r_true_kW/t_s——gt001_l1_oracle TOLERANCES :748-762 实读），量级预案非终值，终值按双实现实测散差 × 安全系数 ≥10 冻结；**gate 键面缺口预登记形态（先例套用）**：零新信号（Q10 推荐）⇒ 序列面 27 列与 v3 同集 ⇒ T-B 分派路由（verify_golden.py:45-53 注记：_A/_Hz/_rpm/_K/_kPa/r_true/r_meas/_kW/_kWh/SOC/_pct/兜底序）全既有支**零缺口预期**；若裁新 kW 列 ⇒ `_kW` 支命中零缺口；若裁非既有量纲列 ⇒ 实落 f_Hz_atol 兜底键而 gate 无该键 ⇒ 实害 KeyError（FLCAP A-4/B-1 实测勘正形态）——届时新增 T-B 分派分支 = 显式硬项（FC `_V` 分支先例同构，不静默） |
| 8 | verify_golden | **路由形态 Q7（两先例并存——批准轮裁定）**：(a) 新条目形态（FL/FC/FLCAP 先例）：新增 `import gt001_comb_oracle` + `MODELS["gt001_comb"]` 注册行 + **DEFAULT_MODELS 尾追加 "gt001_comb"**（verify_golden.py:246 现值 ["fl001","fl001_l1","fc001_l1","fl001_cap"] 实读——步① 无参调用五 golden 顺序验证；步① label 滞后说明沿 V120 DEC-5/V140 先例维持登记不修；MODELS["gt001"] 维持验 v3 零改动）；(b) 重指向形态（GTL1 先例——verify_golden.py:166-180「gt001 校验重指向 gt001_v3」现状）：MODELS["gt001"] 重指向 v4、v3 直验面让位 engine-gt 比对面（thermo→v3 由 engine-gt.test.js 持续比对）。**推荐 (a)**——四代链下每代保留直验面 + DEFAULT_MODELS 追加机制成熟（FL Q6/B-5 先例）；A5 §3.3 :194 已预登记「默认步验 v3 维持 vs 重指向 v4 归 G2b/实现轮 CHG，不静默」 |
| 9 | 预期失效面 | 新增 `data/golden/gt001_v4.json`(+`.sha256`)；**既有 11 golden 字节零变更**；engine-gt.test.js 深化轨变体**并入现有步**（GTL1-IMP-Q1「并入现有步」:557 先例）；registry.test.js 哈希面既有断言零变化 + additive 新断言；FAULT_CATALOG §1 注记行；信号目录（若新列）；UI 层级徽章变体；**步数账 0 新步预期**（run-g2 35 维持——深化轨变体并入步 22 engine-gt + verify 并入步①/步③ 随 Q7；归实现轮 CHG 申报，I-7） |
| 10 | 两门禁面（FLTH B-2 / FC §4 项 10 同构——**路由形态随键形态**） | ① **engine↔gt001_v4 T-B 比对面** = verify_golden gt001_comb 全轨（载体随 Q7）+ engine-gt.test.js 深化轨变体关键值断言；② **深化轨 P0 验收路由**——形态 a：**inertia_model 单值四元映射（linear→gt001_v1 / swing→gt001_v2 / thermo→gt001_v3 / 深化值→gt001_v4）**；形态 b：(inertia_model, combustion_model) 二元分派表（(linear,·)/(swing,·)→v1/v2 / (thermo,off)→v3 / (thermo,on)→v4 / 其余 = 非法组合结构化拒绝）——**gt001_v4 emit verify 通过前深化轨不进 P0 验收路径（不静默）**；acceptance.keyValues 现值显式声明为 thermo 轨（gt001_v3）专用冻结锚点，深化轨 keyValues 由 gt001_v4 golden 承载、acceptance 面按 cfg 分域（FLTH A-3② 同构） |

## 5. 排期（GTCMB-G2b-01…04；两波节奏——批准与实现 v1.6.0+）

1. **GTCMB-G2b-01（本草案，本波）**：V150 波阶段一 W1（2026-11-14，CHG-20261114-04 授权）——
   本文件 v0.1；
2. **GTCMB-G2b-02（双路独立评审 + 用户书面批准）**：W2a 评审 A（物理/数值：EQ-GTL2 提案集
   自洽/三维 RK4 更新序/τ_comb 整定域/锚点复算/稳态不变性推论核验）+ W2b 评审 B（治理/口径：
   五项进入条件/键形态对照表/哈希先例套用/golden 治理与四代链/不动清单/步数账）——互不可见，
   结论回填 §10（W4 代录）；**用户书面批准 v1.6.0+ 波**（批准留待用户——V150 §1 DEC-1；
   GTL1-G2b-02 / FLCAP-G2b-02 先例：用户指令链即书面批准记录）；批准 CHG 登记 + 规格更名
   APPROVED + Q1…Q13 定案落正文 + τ_comb/EQ-GTL2 精确式/锚点数值批准轮定案（域扫描证据）；
3. **GTCMB-G2b-03/04（实现，批准后随用户逐版本指令派发）**：03 = oracle 编写 + gt001_v4 emit
   + verify_golden 注册面（Q7）+ gate 键面复算冻结 + **|Δf| ≤ 1 Hz 与 T3/T4 包络全量重扫
   emit 硬条件**（§3.2）+ FAULT_CATALOG 注记；04 = engine 深化轨分支（三分派前插/组合守卫随
   Q1）+ systems.js（声明面 additive 子对象 + 变体文案 + 新信号（若 Q10 裁有）onTrackOnly）+
   scenario 键面（INERTIA_MODELS 枚举扩值或新键——显式 CHG）+ validate 守卫 + 两门禁面 +
   UI + tests 变体并入现有步 + thermo/linear/swing 轨逐位验收（run_hash 快照）+ copy-guard
   终检 + 步数账 CHG 申报；
4. **实现严格串行声明（重申）**：P1 FC（v1.2.0）→ P2 FL（v1.4.0）→ **P3 GT 实现（v1.6.0+）**
   ——P3 草案可与 P1/P2 并行起草（A5 §5 :278 原文），实现不得早于批准轮且不与 P1/P2 收尾面
   并发（本波 V150 §0「P3 GT 批准与实现（v1.6.0+，两波节奏；实现严格串行）」原文）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | RK4 三维 stdlib 自写；oracle stdlib（python -I）；无 TESPy 类对照轨需求（稳态面沿 GTL1 §5 旁证轨与 TESPY_CORNER_EXTENSION_ASSESSMENT 现状——本轨零新增对照需求，稳态不变性由 GCMB-3 断言承载） |
| I-2 | 数据诚实性 | 2→3 维 ODE 诚实区分（x_comb 新动态状态、其余代数——§1.2）；τ_comb 教学整定值非实测 + 数值零编造（批准轮定案——§1.3）；稳态不变性为结构推论声明非数值断言（§3.2）；「GT 无 SOC 定义面」显式登记防先例错配（§1.2）；被排除形态硬伤显式登记（§0 ③） |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / 既有 oracle）+ golden 只读生成 + thermo/linear/swing 轨逐位硬条件三层佐证（§3.1）+ |Δf| 域/T3/T4 包络全量重扫 emit 硬条件（§3.2）+ GCMB-8 角点断言内嵌（GL-8 A-2 先例同款） |
| I-4 | 批准纪律 | 本草案不定实现；批准 v1.6.0+（用户书面批准——V150 §1 DEC-1）；两门禁面维持（§4 项 10）：gt001_v4 emit verify 通过前深化轨不进 P0 验收路径；实现须用户逐版本指令派发 |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4——禁「更准确/更真实/工业级」）；定位句带「非机组/电网动态验证」；τ_comb/滞后叙事全部带「教学整定/教学观察面」限定语（§1.5/§6.3 预检表） |

### 6.2 键面张力三形态对照（引 §1.1——自查结论）

三形态八维对照表（§1.1）已实读登记：形态 c = **breaking 排除**（A5 §3.2 :182-184 硬伤
原文——emit 过的轨语义不得原地变更 + thermo 为默认轨）；形态 a/b 均零涉 gt001_v3 冻结面、
均为 additive 合法通道——判别维度为语义耦合度（同链深化 vs 正交轴）、组合拒绝成本
（单键天然排除 vs 规则新写）、涟漪面（枚举 +1 值 vs 新键六件套）、golden 路由面（单值
映射 vs 二元分派表）。**推荐形态 a（可推翻推荐——批准轮裁定，§11 Q1）**；FLCAP §6.3
翻转先例（枚举推荐被批准轮推翻）显式登记为对照——GT 侧翻转成因不存在（无正交组合需求），
但裁定权归批准轮。

### 6.3 copy-guard 预查（39 模式 / ALLOW 14；「延迟」「燃烧」逐串预检；实现期 `node tools/copy-guard.mjs` 终检；体例沿 GTL1 §6.3 / FC §6.3 / FLCAP §6.4）

| 提案串（迁入 src/** 候选） | 高危子串核查 | 结论 |
|---|---|---|
| 深化轨层级标签「L1 · 燃烧动态延迟模型（数值仿真级）」 | 含「燃烧」「延迟」——BANNED 39 中延迟族仅「诊断延迟」命中型：本串无「诊断」前缀，非子串命中；无「已验证/实测/校准/工业级」 | 0 命中预期 |
| A-gtcomb-params「τ_comb 为教学整定值（非实测参数）」 | 「非实测」为 ALLOW 串（先剔 ALLOW 再匹配——copy-guard 次序纪律） | 0 命中预期 |
| A-gtcomb-lag「燃烧/能量转换延迟为一阶滞后环节」「有意取异值（同量级对照设计）」 | 「燃烧」「延迟」「滞后」均不在 39 禁词族（孤岛/保护/检测/量测/验证/损失/认证/诊断类族实读——tools/copy-guard.mjs BANNED 数组）；无肯定性验证表述组合（I-5 ③ 句式纪律） | 0 命中预期 |
| summary「EGT 呈滞后-超调第二时间尺度（教学观察面）」 | 无禁词子串；「教学观察面」限定语承载 | 0 命中预期 |
| 定位句「教学尺度燃烧-热降阶链示意（L1 深化轨），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串（copy-guard ALLOW 首条——先剔后匹） | 0 命中预期 |
| 稳态叙事「延迟环节不改变稳态值、只改变暂态路径（模型内部结构项）」 | 无禁词子串；刻意不用「能量损失」族（本轨无损耗叙事面——如需否定式沿「不是能量损失」ALLOW 串句式） | 0 命中预期 |
| 跨深度对比卡「模型深度导致的表达力差异」 | ALINE §6.4 固定句式 | 0 命中预期 |
| A-gtcomb-l1「不是经过验证的设备控制器或机组燃烧系统模型」 | 「经过验证」不含禁词「已验证」子串（FLEXT §1.2 F5 先例句式——实现轮 copy-guard 终检承载判定） | 0 命中预期 |

（本稿在 FaultLab-evaluation/** 不扫描；本波基线实跑 copy-guard PASS（39 模式 0 命中）；
实现轮文案迁入 src/** 前逐句预检 + copy-guard 终检双保险。「实测」一词在提案串内一律以
「oracle 复算/域扫描复算」替代（GT001 §12.4「实测→oracle 复算」2 处先例同款）。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 本草案状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：GT001 G2b 已关闭（GT001_G2B_SPEC_APPROVED，CHG-20261030-06）+ GTL1-G2b-01…04 全闭合 + GTL1 §3.3.1 域扫描冻结已兑现（A5 §3.4 ① 观察窗条件满足——头部实读确认）；本轨触发项 = A5 §3 提案 + V150 §1 DEC-1（本草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：§4 gt001_v4 / gt001_comb_oracle（Q5）/ 6 Run（Q8）/ schema v2 / T-B（Q9）。**golden 后置系 V150 §0「只到草案+双路评审、批准与实现 v1.6.0+」授权的字面偏离显式登记**（GTL1 §7.1 ② / FLCAP §7 ② / FC §7 ② 同款句式）；emit = GTCMB-G2b-03，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.5 assumptions 3 条 + limitations 追加 3 项 + §6.3 预检表（批准轮冻结后实现轮迁入 src/** + 终检） |
| ④ | 用户书面批准 | **待（本草案轮显式留位）**：批准与实现 v1.6.0+（V150 §1 DEC-1 原文「批准留待用户」）——批准 CHG 登记后本项闭合 |
| ⑤ | CHG 登记 | 起草授权 **CHG-20261114-04**（V150_WAVE_DESIGN §1 DEC-1，2026-11-14）已登记；批准 CHG 待（v1.6.0+ 波登记） |

## 8. 工作面分解（GTCMB-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| GTCMB-G2b-01 | 键面三形态对照（§1.1）/ 状态向量 2→3 维与 EQ-GTL2 提案集草案级结构（§1.2/§1.3——精确式留批准轮）/ 参数面框架（零编造）/ 涟漪登记（§2）/ 锚点结构与稳态不变性预填（§3——数值留批准轮）/ golden 计划（§4）/ 两门禁面 / 草案 v0.1 | M | **本波**（V150 W1，2026-11-14，CHG-20261114-04） |
| GTCMB-G2b-02 | 双路独立评审（互不可见——V150 §2 串行纪律）+ 用户书面批准（v1.6.0+）+ 批准 CHG + 条件落正文 + Q1…Q13 定案 + τ_comb 数值/EQ-GTL2 精确式/锚点数值定案（域扫描证据节）+ 更名 APPROVED | M | **v1.6.0+ 波**（待用户派发） |
| GTCMB-G2b-03 | oracle 编写（gt001_comb_oracle——Q5 命名；oracle_base 出生接入 + 三维 RK4 + GCMB 自检 + T-B 容差实测冻结/降 T-C 预案 + **|Δf|≤1 Hz 与 T3/T4 包络全量重扫 emit 硬条件（§3.2）**）+ gt001_v4 emit（Run 集 Q8、schema v2、approval 首签、sidecar LF 钉死）+ verify_golden 注册面（Q7——新条目+DEFAULT_MODELS 追加或重指向）+ gate 键面复算冻结（Q10 联动缺口处置）+ FAULT_CATALOG §1 注记行 | L | 待派发（依赖 02 批准） |
| GTCMB-G2b-04 | 实现：engine 深化轨分支（三分派前插一行——形态 a；或组合守卫——形态 b）+ systems.js（声明面 additive 子对象 + level/summary 变体 + 新信号（若 Q10 裁有）onTrackOnly + signalCategories 物理类目核对）+ scenario 键面（INERTIA_MODELS 枚举扩值或 EVENT_KEYS 新键 + 守卫——显式 CHG）+ validate 守卫 additive + 两门禁面（§4 项 10 随 Q1 形态）+ acceptance.keyValues 分域 + UI（层级徽章/模型抽屉/跨深度对比卡三轨扩四轨）+ causalTemplates 深化轨扩展 + tests engine-gt 深化轨变体（并入现有步）+ thermo/linear/swing 三轨逐位验收（run_hash 快照——§3.1 项 3）+ copy-guard 终检 + 步数账 CHG 申报（0 新步预期——I-7） | L | 待派发（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 键形态裁定摇摆导致实现面返工（枚举扩值 vs 组合键——FL 翻转先例在案） | §1.1 八维对照 + §6.2 对照自查 + Q1 批准轮一次定案、实现轮不再重开（FCAP §6.3 定案纪律同款）；对照表保留备查 |
| R-2 | τ_comb 整定失当（与 τ_3/τ_g 同值 ⇒ 第二时间尺度不可辨识；或异值过大 ⇒ 滞后形态夸张失真） | 整定依据五项判据框架（§1.3——含「有意异值」R-7 反向运用声明）+ 批准轮域扫描定案 + GCMB-5 锚点复算兜底 |
| R-3 | 四代 golden 链管理成本（v4→v3→v2→v1 supersedes 链 + 三轨并存 + 第四轨）——verify 路由歧义 | §4 项 8 Q7 两先例并存显式登记 + 两门禁面单值四元映射（形态 a）可枚举 + engine-gt 比对面 additive 扩展 + A5 §3.3 :194「不静默」预登记承接 |
| R-4 | gt001_v1/v2/v3 或 gt001_l1_oracle.py 字节被实现轮误触（V-03 哈希失配 → 冻结锚点报废） | §0 不动清单 ①② + GTCMB-G2b-03/04 工作面不含既有文件 + §3.1 项 3 零变化三机制承载 + 全量回归兜底 |
| R-5 | T-B 三维 RK4 双实现散差超预案（三维耦合 + 延迟环节相位敏感） | 容差按双实现实测散差 × ≥10 冻结 + 超限降 T-C + convergence 块（双向预案——GTL1 §4 项 6 同款）+ 禁 ULP 级承诺 |
| R-6 | gate 键面缺口（若 Q10 裁新列且量纲非既有支） | §4 项 7 缺口形态预登记（FLCAP A-4/B-1 实测勘正形态——f_Hz_atol 兜底 KeyError）+ 新增 T-B 分派分支 = 显式硬项（FC `_V` 分支先例）；推荐零新信号使缺口面归零 |
| R-7 | 稳态不变性被误读为「深化轨无教学增量」 | §3.2 三点稳态不变 = 结构推论 + 暂态滞后-超调为深化轨独有教学面（A5 §3.1 教学点）+ A-gtcomb-steady assumption 显式声明 |
| R-8 | 默认轨歧义（深化轨是否翻转默认——Q4 先例重付风险） | 形态 a 推荐**不翻转**默认（thermo 维持——A5 §3.2 :179 原文「Q4 翻转的涟漪无必要重付，Arena 盲包语义零变化」）；翻转与否随 Q1 批准轮显式裁定、不静默 |
| R-9 | scenario 键面/盲包指纹语义漂移 | 形态 a 既有场景解析零变化（§1.1 哈希行）+ 默认轨不动 ⇒ 盲包语义零变化 + 新信号不入池显式声明 + 显式 CHG 登记 |
| R-10 | 步数账超支（I-7） | 0 新步预期（变体并入步 21 engine-gt + verify 载体随 Q7 并入步①/步③）+ GTCMB-G2b-04 归口 CHG 显式申报 |
| R-11 | 教学参数被误读为设备参数辨识 | A-gtcomb-params 非实测声明 + §1.3 整定依据 + I-5 自查（FLTH R-11 同款） |

## 10. 评审记录（W4 代录——2026-11-14，V150 §2 阶段三；**状态维持 DRAFT，批准留待用户 v1.6.0**；评审报告全文随波次记录归档（2026-11-14 W2a/W2b））

### 10.1 评审结论（双路独立评审，互不可见——V150 §2 串行纪律）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-GTL2 提案集自洽与量纲、三维 RK4 分区更新序、τ_comb 整定域与形态区分、稳态不变性推论核验、锚点复算、L1 判据对照 | **PASS_WITH_CONDITIONS(6)**（1 P1 + 3 P2 + 2 P3） | **稳态不变性/量纲/RK4 三维分区更新序独立重推全部通过**。1 P1（A-1）：§3.2/§3.3 须按 GTL1 A-3 口径体例**逐锚点登记「渐近稳态 vs t=60 采样」两口径**——v4 全部 t=60 采样锚点（sensor f/T3/T4/cmd、load f60/T3_60、actuator Pgen/f60）将随暂态路径变化偏离 v3 冻结值（18.266/1044.16 等在 golden 中是采样值非稳态值）；3 P2（A-2/A-3/A-4）：「逐位同」措辞与 T-B 制度一致化 / τ_comb 判据框架增「闭环收敛」+「网格可辨性」两条 / GCMB 增 GL-6 同构 gap 检查；2 P3（A-5/A-6）：engine.js:320-322 字面三值守卫勘正 / gt001_v3 波次归属未核实。逐条登记见 §10.2 |
| 评审人 B（治理/口径/回归面） | 五项进入条件、键形态对照表复核（§1.1/§6.2）、哈希先例套用核对（B-1a/子对象/onTrackOnly/B-3a 形态随 Q1）、golden 治理与四代链（Q7 路由）、不动清单、步数账、copy-guard、预期失效面 | **PASS_WITH_CONDITIONS(5)**（2 P2 + 3 P3） | **八面声明/先例对照公允性/步数账/体例全部属实**。2 P2（B-1/B-2）：三处字面守卫须 additive 编辑（engine.js:320-324/schema.js:231-234/scenario.js:401-402）「自动覆盖」表述订正 / config_hash 投影行失实订正（inertia_model 现状在投影内 schema.js:144——修正后**强化形态 a**；B-3a 局限只适用形态 b 且 healthy 局 run_hash 跨轨同值碰撞须补登）；3 P3（B-3/B-4/B-5）：行号精度五处 / 「P0 验收路由」措辞失配（GT 无 approved_p0 面）/ sensor 采样锚点逐点点名补登记。逐条登记见 §10.2 |
| 用户批准（v1.6.0+） | Q1…Q13 定案 + τ_comb/EQ-GTL2 精确式/锚点数值定案 + 批准与实现排期 | **待（批准留待用户——v1.6.0 波）** | 双评审条件 A-1…A-6/B-1…B-5 处置归批准轮（GTCMB-G2b-02——§10.2 原样登记不处置） |

### 10.2 条件处置追记（**原样登记不处置**——处置归 GTCMB-G2b-02 批准轮「条件 → 处置 → 落点」表；体例沿 FC §10.2 / FLCAP §10.2。评审报告全文随波次记录归档（2026-11-14 W2a/W2b））

**评审人 A（A-1…A-6）**：

| # | 级别 | 条件内容（一句） | 建议落点 |
|---|---|---|---|
| A-1 | **P1** | §3.2/§3.3 须按 GTL1 A-3 口径体例**逐锚点登记「渐近稳态 vs t=60 采样」两口径**——v4 全部 t=60 采样锚点（sensor f/T3/T4/cmd、load f60/T3_60、actuator Pgen/f60）将随暂态路径变化偏离 v3 冻结值（18.266/1044.16 等在 golden 中是采样值非稳态值） | 批准轮 §3.2/§3.3 逐锚点两口径登记（GTL1 A-3 体例——采样锚点随暂态路径变化属深化轨预期，稳态口径单列） |
| A-2 | P2 | 「逐位同」措辞与 T-B 制度一致化（T-B 不承诺位级——深化轨比对措辞按方法等价制统一） | 批准轮 §3.1/§3.2「逐位同」句逐处改口径 |
| A-3 | P2 | τ_comb 判据框架增两条：**闭环收敛** + **网格可辨性** | 批准轮 §1.3 整定依据五项判据扩为七项 |
| A-4 | P2 | GCMB 增 **GL-6 同构 gap 检查** | 批准轮 §4 项 4 GCMB 自检清单 |
| A-5 | P3 | engine.js:320-322 字面三值守卫勘正（实际守卫面以语义锚点为准） | 实现轮按语义锚点定位（本文头部行号基准说明 2' 已声明） |
| A-6 | P3 | gt001_v3 波次归属未核实 | 批准轮实读核实登记 |

**评审人 B（B-1…B-5）**：

| # | 级别 | 条件内容（一句） | 建议落点 |
|---|---|---|---|
| B-1 | P2 | 三处字面守卫须 additive 编辑（engine.js:320-324 / schema.js:231-234 / scenario.js:401-402）——草案「（枚举守卫）自动覆盖」表述订正（实况为字面值域数组，扩值须逐处 additive 编辑，非自动） | 批准轮 §1.1/§2「自动覆盖」表述订正 |
| B-2 | P2 | config_hash 投影行失实订正——**inertia_model 现状在投影内（schema.js:144）**——修正后**强化形态 a**；B-3a 局限只适用形态 b，且 healthy 局 run_hash 跨轨同值碰撞须补登 | 批准轮 §2 config_hash 投影行订正 + B-3a 适用域注记 |
| B-3 | P3 | 行号精度五处 | 批准轮/实现轮按语义锚点逐处勘正（头部行号基准说明 2' 承载） |
| B-4 | P3 | 「P0 验收路由」措辞失配（GT 无 approved_p0 面——scope.js APPROVED 白名单仅 FL-001） | 批准轮 §4 项 10 ② 措辞订正（改「验收/比对路由」口径） |
| B-5 | P3 | sensor 采样锚点逐点点名补登记 | 批准轮 §3.3 逐点点名（与 A-1 两口径登记同轮落） |

（本节为 W4 代录——两路评审报告原文随 V150 波次记录归档；条件数值/措辞以评审报告原文为权威，本表为登记面。状态行维持 DRAFT v0.1 不变，批准留待用户 v1.6.0。）

## 11. Q 点清单（**全候选 + 推荐——不定案**；批准轮逐项裁定后落正文，体例沿 FC §11 / FLCAP §11）

| # | 问题 | 候选 | 推荐（不定案——一句话理由） |
|---|---|---|---|
| Q1 | **键形态（核心裁定点）** | (a) inertia_model 枚举扩值；(b) 正交二键 combustion_model（前置 thermo）；(c) thermo 原地深化 | **(a)**——燃烧延迟为 thermo 同链深化非正交轴，单键枚举天然排除非法组合（GTL1 Q2 理由 2 延续）、涟漪最小、golden 单值映射；FL 组合键先例的成立前提（正交组合需求）GT 侧不存在（§1.1 四理由）；**可推翻推荐——批准轮裁定** |
| Q2 | 枚举新值命名（形态 a）/ 新键名（形态 b） | (a) "thermo_comb"（A5 §3.2 原文示例）；(b) "thermo_combustion"；(c) 形态 b 下键名 combustion_model: off\|on（thermal/electrochem/capacity_model 句式） | **(a) "thermo_comb"**——A5 原文示例 + ASCII 安全 + thermo 前缀承袭「模型深度轨」语义 + comb 后缀物理面直指；键名在形态 a 下 = 复用 inertia_model 不新增（键形态与命名两裁定分离——FLCAP Q1 先例句式） |
| Q3 | τ_comb 延迟形态 | (a) 一阶滞后 + 新 ODE 状态 x_comb；(b) 纯传输延迟（无新状态）；(c) 二阶/高阶 | **(a)**——A5 §3.1 原文形态（「一阶燃料-能量传递滞后，τ_comb·dQ_f,d/dt + Q_f,d = Q_f」+「2→3 维 ODE」结构自洽；(b) 与 A5 状态向量原文直接冲突；教学点（第二动态时间尺度）由一阶滞后指数趋近承载 |
| Q4 | 方程 id 编号策略 | (a) EQ-GTL2-1…n 全集自含（新轨唯一权威文本单文件自含——GTL1 §2 体例 + FC EQ-FCEC 先例）；(b) 续编 EQ-GTL1-13…n（FL EQ-FLTH-10…12 先例——但 FL 基集与新编号同属 FLTH 一文，GT 基集在 GTL1 另一文 ⇒ 跨文件权威分裂） | **(a)**——新轨域新 id 集 + oracle 硬编码唯一权威文本自含（不产生 GTL1+本规格双文件权威分裂）；对应关系（EQ-GTL2-x ≡ EQ-GTL1-y 修订/原样）在说明列显式登记 |
| Q5 | oracle 文件命名 | (a) gt001_comb_oracle.py（物理面命名）；(b) gt001_l2_oracle.py（深度序命名） | **(a)**——FL Q4 定案理由直接适用（同系统第二深化轨、gt001_l2 易与 gt001_l1/gt001_l1_oracle 混淆；物理面直接命名 + MODELS 键镜像 gt001_comb） |
| Q6 | oracle 自检段名 | (a) GCMB-1…n；(b) GTC-1…n；(c) GL-9… 续编 | **(a)**——与 Q5 命名同源（comb 缩写一致）；GL-x 为 gt001_l1_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面（FLCAP Q5 / FC Q8 同款理由——(c) 不推荐） |
| Q7 | verify_golden 路由（注册行 + DEFAULT_MODELS） | (a) 新条目 MODELS["gt001_comb"] + DEFAULT_MODELS 尾追加（FL/FC/FLCAP 先例——现值 ["fl001","fl001_l1","fc001_l1","fl001_cap"] verify_golden.py:246 实读 ⇒ 步① 无参五 golden）；(b) gt001 条目重指向 v4（GTL1 先例——:166-180 现状重指向 v3 形态再演；v3 直验让位 engine-gt 比对面） | **(a)**——四代链下每代保留直验面 + DEFAULT_MODELS 追加机制成熟 + A5 §3.3 :194「默认步验 v3 维持 vs 重指向 v4 归 G2b/实现轮 CHG，不静默」预登记的 (a) 侧 |
| Q8 | golden Run 集 | (a) 镜像 gt001_v3 全集 6 Run 全深化轨；(b) 最小集（healthy + load_step 类 2 Run） | **(a)**——新 id golden 镜像基线全集先例（GTL1 §4 项 4 / FLTH / FC Q6）+ monitor 不变量判据面（GCMB-6）+ actuator_clear 过冲教学点覆盖 |
| Q9 | 容差 tier | T-B（三维 RK4 双实现方法等价）；T-A（不承诺——三维耦合 bit-exact 无依据）；超限降 T-C + convergence 块 | **T-B + 降 T-C 双向预案**——GTL1/FLTH/FLCAP/FC 四轮同制；gate 键面终值 emit 实测冻结（×≥10） |
| Q10 | 新信号集 | (a) **零新信号**（教学面经既有 T4_out_K × P_gen_cmd_kW 对照承载；Q_fuel_kW 维持 k_f·u_eff 指令映射口径；x_comb 为 ODE 内部状态不出信号）；(b) 单列延迟燃料功率列（onTrackOnly 门控）；(c) 双列 | **(a)**——最小集（GTL1 §1.2 R_int 不出信号 / FLCAP Q10 先例同构）+ 序列面/gate 键面/盲包面增量归零 + gt001_v4 与 v3 列集相同（27 列）⇒ 比对面增量集中在数值面；滞后-超调教学点经 T4（EGT）相对 P_gen_cmd 相位差直接可见 |
| Q11 | x_comb 初值条件 | (a) x_comb(0) = k_f·u(0)（设计点稳态燃料功率）；(b) x_comb(0) = 0（零燃料起振） | **(a)**——健康局/monitor 局与 gt001_v3 **逐位同**的结构承载（§3.2——dx_comb/dt ≡ 0 全序列；GTL1 T3(0)=T3D 设计点初值先例同构）；(b) 使健康局引入起振暂态、healthy 锚点面失真（GL-3 跨深度恒等判据破坏） |
| Q12 | golden 元数据 model_version | (a) 1.3.0 升位（GTL1 1.1.0→1.2.0 先例——模型/方法变更同轮升位）；(b) 1.2.0 维持仅登记（FC Q1 定案 B 句式——golden 语义由 golden_id 承载） | **(a) 1.3.0 升位**——GT 侧已有 L1 升位先例（FC 侧维持先例的成因是 classify 消费 modelVersion——GT 分支消费面实现轮实读核对后定案，登记不预设）；若实读证实 GT classify 不消费 modelVersion 则 (a)/(b) 成本对称，仍推荐 (a) 与 GTL1 链一致 |
| Q13 | EQ-GTL1-4 修订式精确式子项（ṁ_g 燃料项口径 + E_fuel 口径） | ṁ_g 燃料项：(i) Q_f,d/LHV 延迟同源（质量-能量同经延迟环节）；(ii) Q_f/LHV 即时维持（最小改动）；E_fuel：(i) 指令面 ∫Q_f dt 维持（与 thermo 轨口径连续）；(ii) 交付面 ∫Q_f,d dt（差 = τ_comb·Δx_comb 恒等式可核） | **ṁ_g 采 (i) 延迟同源 + E_fuel 采 (i) 指令面维持**——物理一致性（燃气质量与能量同源于实际入燃烧室燃料）+ 记账面连续（E_fuel 与 gt001_v3 口径可比）；精确式随 EQ-GTL2 冻结文本批准轮定案（A5 §3.1「精确式 G2b 冻结」原文） |

---

**修订记录**：v0.1（2026-11-14 初稿，A-5 P3 GT 规格起草人，V150_WAVE_DESIGN §2 阶段一 W1 /
CHG-20261114-04 授权链）：前置条件实读确认（gt001_v3 域扫描冻结闭合 + P1/P2 落地串行链
解锁）；§0 边界与不动清单（L2 不做 / 不定实现 / **thermo 原地深化 = 被排除形态显式登记**
（A5 §3.2 :182-184 硬伤原文）/ gt001_v1/v2/v3 字节冻结零涉 / 本轮零代码触碰）；§1.1 键面
张力三形态八维对照（推荐形态 a——可推翻推荐，批准轮裁定）+ §1.2 状态向量 2→3 维诚实区分
（x_comb 新 ODE 状态 / GT 无 SOC 定义面登记）+ §1.3 τ_comb 一阶滞后草案级（A5 §3.1 原文
引用 / RK4 三维分区 / 精确式待决子项三项 / 整定依据五项判据框架——数值零编造）+ §1.4 GT
既有面零变更清单 + §1.5 assumptions 3 条 / limitations 3 项 / UI 变体；§2 影响面（零新事件族 /
两形态 scenario 面分别登记 / 哈希先例套用 / 盲包零变化）；§3.1 thermo 轨与 gt001_v3 逐位同
三层佐证 + §3.2 稳态不变性结构推论（三点稳态不变——GTL1 §5 TESPy 三点口径 (a) 参照）+
|Δf| 域/T3/T4 包络全量重扫 emit 硬条件预登记 + §3.3 深化轨锚点口径冻结（数值留批准轮）；
§4 golden 计划十项（gt001_v4 / 四代 supersedes 链 / GCMB 自检 / 6 Run 镜像 / T-B 双向预案 /
gate 键面缺口预登记 / verify 路由 Q7 两先例 / 两门禁面随键形态）；§5 排期（01→02 双评审 +
用户批准 v1.6.0+ → 03/04；实现严格串行重申）；§6 红线自查（I-1…I-5 + 三形态对照自查 +
copy-guard 预查表——「延迟」「燃烧」逐串）；§7 五项进入条件（④⑤ 待批准——显式留位）；
§8 GTCMB-G2b-01…04；§9 风险 R-1…R-11；§10 评审记录留空结构；§11 Q1…Q13（键形态 / 枚举
命名 / τ_comb 形态 / EQ 编号 / oracle 命名 / 自检段名 / verify 路由与 DEFAULT_MODELS / Run 集 /
tier / 新信号集 / x_comb 初值 / model_version / 精确式子项——全候选 + 推荐**不定案**）。

**文件尾状态**：`DRAFT v0.1（2026-11-14）——待双路独立评审（W2a 物理 / W2b 治理）+ 用户书面
批准（v1.6.0+）。本草案为起草面交付物，无批准效力：EQ-GTL2 精确式、τ_comb 域与数值、
锚点数值、键形态裁定一律未冻结（冻结权在批准轮——GTCMB-G2b-02）；golden/代码工件零触碰
（§0 不动清单维持）；本批准（若下）不自动打开任何验收路径——两门禁面维持（§4 项 10）。

**文件结束**。GT001_COMBUSTION_G2B_SPEC_DRAFT v0.1（2026-11-14，CHG-20261114-04）。
