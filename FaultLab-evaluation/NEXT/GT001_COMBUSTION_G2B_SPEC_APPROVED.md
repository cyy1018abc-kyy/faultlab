# GT001_COMBUSTION_G2B_SPEC_APPROVED — GT-001 燃烧延迟二阶状态（τ_comb）G2b 物理规格（APPROVED v1.0；曾用名 GT001_COMBUSTION_G2B_SPEC_DRAFT）

> **状态行**：`APPROVED v1.0（2026-11-14，GTCMB-G2b-02 收口）——批准记录：CHG-20261114-07（用户 2026-11-14「下一步」指令链——键形态裁定+Q12 否决+条件全按推荐处置，GTL1-G2b-02 先例）`。
> **任务**：A-5 P3 GT 燃烧延迟 G2b 批准轮收口（V160_WAVE_DESIGN §2 阶段一 W1；GTCMB-G2b-02；
> 承 V150_WAVE_DESIGN §2 阶段一 W1 草案轮——A5_MULTIPHYSICS_EXPLORATION §3 提案二，V090 DEC-2 ②
> 「GT：燃烧动态二阶状态（T3 已有，深化多状态燃烧延迟）」的顺延兑现）。
> **授权链**：起草授权 V150_WAVE_DESIGN v1（CHG-20261114-04，2026-11-14，DEC-1…4 全采推荐项，
> 本波唯一 G2b 草案名额）→ 双路独立评审（V150 W2a/W2b，2026-11-14，互不可见，
> A:PASS_WITH_CONDITIONS(6) / B:PASS_WITH_CONDITIONS(5)——§10）→ **用户书面批准（2026-11-14
> 「下一步」指令链，CHG-20261114-07 登记，V160_WAVE_DESIGN DEC 全采推荐项——GTL1-G2b-02 先例：
> 用户指令链即书面批准记录）** → 本 v1.0（11 条件全按推荐落正文 + 键形态裁定（形态 a 枚举扩值）
> + τ_comb = 0.5 s 定案（域扫描证据 §3.3）+ EQ-GTL2 冻结文本 + Q1…Q13 定案（**Q12 否决草案
> 推荐**）+ 更名 APPROVED）。
> **实现排期**：v1.6.0 波（V06_ROADMAP §3 v1.6.0 行已预登记「键形态=形态 a 枚举扩值 thermo_comb、
> gt001_v4 T-B、Q12 维持 1.2.0 仅登记」——本 v1.0 与该行一致闭合）；GTCMB-G2b-03/04 随用户逐版本
> 指令派发。**实现严格串行声明（维持）**：P1 FC 已于 v1.2.0 落地（FCECH-G2b-03/04）、P2 FL 已于
> v1.4.0 落地（FLCAP-G2b-03/04）⇒ 串行链已解锁——P3 实现不早于本批准轮且不得与 P1/P2 收尾面
> 并发触碰（跨轨排期约束、非工期承诺——G0-DEC-15 句式）。
> **前置条件实读确认（A5 §3.4 ①；A-6 批准轮核实更正）**：gt001_v3 链稳定且域扫描冻结已闭合
> （GTL1 §3.3.1 :316-345 已兑现——mag=1.0 角点 min f = 49.002004 Hz、GL-8 内嵌断言 pass）。
> **波次归属核实（A-6 定案）**：gt001_v3 于 **v0.7.1**（CHG-20261104-13）首签 emit 在验
> （gt001_l1_oracle GL-1…8 自检 exit 0；v0.8.0 r_true/r_meas 重排以 gt001_v3 散差 0.0 复证；
> v0.8.0 非其 emit 波——草案头部「v0.8.0 emit」归属笔误就此勘正）；本批准轮复核
> `python -I tools/oracle/gt001_l1_oracle.py --self-check` 同款锚点面在验（域扫描环境校验 5/5
> ——§3.3 执行口径）⇒ 观察窗条件满足。
> **主源**：A5_MULTIPHYSICS_EXPLORATION §3 全文（P3 提案原文——形态与治理成本评估源；
> :182-184 被排除形态硬伤原文）；体例模板 = FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 与
> FL001_CAPACITY_G2B_SPEC_APPROVED v1.0（**冻结后哈希先例全套**：B-1a 显式键条件式 / 子对象
> 于 model_hash 九字段域外 / onTrackOnly 列门控 / B-3a scenarioView 零投影 / 两门禁面——
> V120/V140 落地证实机制直接套用）+ GTL1_G2B_SPEC_APPROVED v1.0（thermo 轨现行权威文本——
> EQ-GTL1-1…12 / §2.3 更新序骨架 / §2.4 三值枚举 / §3.3 域扫描 / GL-1…8 自检体例）；
> §10/§11 定案体例 = MG001_G2B_SPEC_APPROVED v1.0 / FLCAP §10-§11；治理依据 = SCOPE_SPLIT_MEMO
> §8.2。
> **Q-4 三守卫适用**：新方程集（**EQ-GTL2-1…12 冻结集，§1.3**）入引擎须走完整 G2b（即本文档
> 流程——ALINE §1.2 第三行「新增状态变量/新物理（方程集扩展）→ 完整 G2b」）；许可证自研零依赖
> （RK4 stdlib 自写 / 浏览器原生 JS）；验收路径禁入直至 emit verify 通过（§4 项 10）。
> **本波纪律符合性（V150 §0 延续 + V160 批准轮增记）**：golden 零变更（**既有 11 golden 字节
> 冻结**——`ls data/golden/*.json` 实读 11 份，本文档只引用不 emit；批准轮亦零 emit）；零代码
> 触碰（engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/data/golden/** 全链只读引用、
> 零触碰——批准轮不动清单 §0 维持）；**批准轮域扫描 = 仓库外临时脚本**（`python -I`、
> gt001_l1_oracle 冻结常量只读导入、环境校验 = v3 六 Run 锚点全表复现 5/5 后方采信——§3.3
> 执行口径；脚本未落仓库、用后已删除——FLCAP v1.0 域扫描同款纪律）；零第三方依赖（I-1）；
> 文案红线自查（本文档在 FaultLab-evaluation/**，不在 copy-guard 扫描域 tools/copy-guard.mjs:15
> `SCOPES=['src']` 内；批准轮实跑 `node tools/copy-guard.mjs` → PASS（39 模式 0 命中）基线绿，
> §6.3 预检同轮登记）。
> **行号基准说明（2'）**：本文档行号引用为**批准轮时点（2026-11-14，V160 波 W1 树）实读值**
> （草案 v0.1 起草时点值已按 B-3/A-5 勘正逐处更新）；实现轮（GTCMB-G2b-03/04）以**语义锚点**
> （信号 id/检查 id/函数名/键名/方程 id/枚举常量名）为准定位，行号仅作快速索引（FLCAP/FC/GTL1
> 各轮头部同款说明）。关键复核点实读（批准轮时点）：scenario.js:52 EVENT_KEYS、:56
> `INERTIA_MODELS=['swing','linear','thermo']`、:401-402 inertia 枚举守卫（:401 条件**引用
> INERTIA_MODELS 常量**、:402 消息串**字面三值**）；engine.js:176 normalizeConfig、:188-189
> inertia_model 盖章行、:320-324 inertia 枚举守卫（:321 条件与 :322 消息串**均字面三值硬编码**
> ——A-5/B-1 勘正）、:559-569 model_hash 具名九字段 hashObject（**model_version 在九字段内**
> ——Q12 否决依据实读）、:1517-1521 simulateGT001 顶部三分派（:1521 `cfg.inertia_model ===
> 'thermo'` → simulateGT001Thermo）、:1654 simulateGT001Thermo；**schema.js:144
> `inertia_model: cfg.inertia_model`（inertia_model 现状在 config_hash 投影内——B-2 实读）**、
> :231-234 schema validate inertia 守卫（第三处字面守卫——草案未登记、B-1 补登）；systems.js
> :779 GT-001 summary、:793 defaults `inertia_model:'thermo'`、:980 `model_version:'1.2.0'`、
> :420-435 acceptance.keyValues 分域先例、:2226 GT001.causalTemplates；scope.js:14-56 APPROVED
> 白名单仅 FL-001、GT 无分支全走 extension_preview（B-4 实读）；scripts/verify_golden.py:88
> MODELS dict、:182-198 `MODELS["gt001"]` 重指向块（B-3 实读勘正）、:246
> `DEFAULT_MODELS=["fl001","fl001_l1","fc001_l1","fl001_cap"]`、:45-53 T-B 分派注记；
> tools/run-g2.mjs:99 STEPS、**步 21 = engine-gt.test.js**（B-3 实读勘正——草案 §4 项 9「步 22」
> 笔误）；src/ui/pages/arena.js:110 `ARENA_EXCLUDED = []`（六系统全入池——v1.3.0）；
> tools/copy-guard.mjs BANNED 39 / ALLOW 14。

---

## 0. 定位摘要、边界与不动清单

- **GT-001 combustion 轨（L1 深化轨 · 燃烧延迟最小集）**：在 GT-001 既有三轨（linear/swing =
  L0b 遗留轨、thermo = L1 默认轨）**之外**新增第四轨（**键面形态已定案 = 形态 a 枚举扩值，
  §1.1 v1.0 定案标注——CHG-20261114-07**）：thermo 轨现行 f→T3 直映射（EQ-GTL1-3 燃料功率
  Q_f = k_f·u_eff **瞬时**进入 EQ-GTL1-4 燃烧室能量平衡）之间插入**一阶燃烧/能量转换延迟
  环节**——新 ODE 状态 x_comb（延迟燃料功率），状态向量 **y = [f, T3, x_comb] 由 2 维扩为
  3 维**（A5 §3.1 原文口径；延迟形态 = 一阶滞后（Q3 定案）；τ_comb = **0.5 s** 定案（§1.3/§3.3
  域扫描证据））。摇摆方程、调速器积分、电池下垂、三故障族注入面、60 s/dt=0.1/601 点库口径
  **全部不变**（§1.4）。
- **教学点（A5 §3.1 原文）**：负荷阶跃/清除过冲时 EGT（T4）响应相对功率指令的**滞后-超调
  形态**——L0b（τ_g 一阶跟随）与 L1（τ_3 热惯性）均不可见的**第二动态时间尺度**（定案值下
  的可辨识性数值证据 = §3.3 判据①⑦：T4-对-指令相位滞后 15→20 采样、+0.5 s ≈ τ_comb 群迟延
  直加）。
- **稳态面结构推论（定案标注——数值已由 §3.3 三点不变性核验承载）**：延迟环节在稳态
  （d/dt = 0）下 Q_f,d ≡ Q_f 精确成立 ⇒ **延迟不改变稳态值、只改变暂态路径**——设计点 u=25 +
  sensor 稳态（u ≈ 19.65）+ u=40 钳位三点稳态不变（GTL1 §5 TESPy 三点口径 (a) 稳态解参照 +
  TESPY_CORNER_EXTENSION_ASSESSMENT C1/C2 两角点 stdlib 口径 (a) 复算在案；本轮 600 s 长轨
  收敛与解析链 9 位全同——§3.3）；频率/负荷域复扫已完成（§3.3 域扫描证据节）。
- **做（本规格 = 批准面）**：键形态定案（§1.1——形态 a）、状态向量 2→3 维与新物理量诚实区分
  （§1.2）、EQ-GTL2-1…12 冻结文本与 τ_comb = 0.5 s 定案（§1.3——七项判据 + §3.3 域扫描证据）、
  GT 既有面影响登记（§1.4）、assumptions/limitations/UI 措辞冻结（§1.5）、场景/哈希/盲包涟漪
  登记（§2）、锚点两口径登记与零变化硬条件（§3）、golden 计划（§4）、排期（§5）、红线自查
  （§6）、Q 点定案记录（§11）。
- **不做（本规格显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **本批准不定实现**：零代码/golden/oracle 触碰；实现须 GTCMB-G2b-03/04 按本文档冻结文本
     执行（I-4：用户逐版本指令派发——v1.6.0 波）；锚点 t=60 采样终值由 gt001_comb_oracle
     emit 复算冻结为准（§3.3 域扫描值为批准轮整定证据，非 golden 终值）；
  3. **thermo 轨原地深化 = 被排除形态（显式登记，A5 §3.2 :182-184 硬伤原文；批准轮维持排除）**：
     「违反 §1『emit 过的轨语义不得原地变更』——thermo 为默认轨（Q4 :226-230），原地变更将使
     全部新生成 GT Run 与已归档 thermo 场次的重放/比对语义漂移（gt001_v3 冻结锚点对新引擎
     失配），登记为硬伤」——本轨深化以**新轨形态**出生（ORACLE_INTERFACE_D2 §3.1 :127
     「模型/方法变更 → 新 id」；GT linear/swing 自 emit 起语义零变化、深化走 thermo 新轨而非改
     swing——先例），thermo 值语义与 gt001_v3 全链冻结不动（对照表第三形态，§1.1）；
  4. **gt001_v1/v2/v3 字节冻结零涉**：三份既有 golden（含 .sha256 sidecar）字节级冻结留档；
     gt001_l1_oracle.py 物理零触碰（V-03 字节语义；GTL1 §4 项 9 冻结归档债 Q3 定案维持）；
  5. **相邻不做顺带确认（防口径滑移）**：压气机特性图/流量-转速耦合（GTL1 §6.1 项 1）、
     变比热（项 2）、燃烧室金属热容与燃气热容分离（项 4 后半）、点火延迟/熄火边界/贫富油
     极限（项 4 前半——本轨只取**燃烧延迟**最小集，A5 §3 源登记行）均维持登记不做，
     由该轨未来 G2b 轮独立裁定。
- **本轮不动清单（批准轮适用；实现轮按 §8 排期执行其点名工作面时不受相应条目约束）**：
  ① `tools/oracle/**` 全部零触碰（gt001_l1_oracle.py / gt001_oracle.py 物理零触碰——V-03；
  批准轮扫描仅只读导入其冻结常量）；② `data/golden/` 既有 11 golden（含 gt001_v1/v2/v3 +
  .sha256 sidecar）字节冻结留档；③ engine.js/scenario.js/systems.js/scope.js/
  scripts/verify_golden.py 零改动（均为实现轮显式工作面）；④ 不引入第三方依赖（I-1）；
  ⑤ run-g2 35 步判据零翻转（0 新步预期——§4 项 9）。
- 时间尺度沿库口径：duration 60 s、输出网格 dt=0.1（601 点）、积分子步 0.01、默认注入
  t=20 s（FAULT_CATALOG §0——GT001 §4 网格决策维持）。

## 1. 模型形态

### 1.1 配置键形态（**已定案——形态 a 枚举扩值**；三形态对照表保留备查）

> **v1.0 定案（CHG-20261114-07，GTL1-G2b-02 先例——MG/FC/FLCAP 批准轮同款体例）**：
> **采形态 a——`inertia_model` 枚举扩第 4 值 `"thermo_comb"`**（GTL1 §2.4 三值枚举先例的单键
> 延续；golden 四元映射 linear→gt001_v1 / swing→gt001_v2 / thermo→gt001_v3 /
> thermo_comb→gt001_v4；thermo 既有值语义与 gt001_v3 全链冻结不动；默认轨维持 thermo 不翻转）。
> 被排除形态（形态 b 正交二键、形态 c thermo 原地深化）维持排除；对照表留档备查（R-1 定案
> 纪律：实现轮不再重开）。**FLCAP §6.3 翻转先例对照公允性确认**：FL 轮枚举推荐被推翻的成因
> 是 FL 特有的正交组合需求（容量面与热面独立开关轴），GT 侧经实读确认不存在该成因——该先例
> 证明的是「枚举推荐可被批准轮推翻」的程序可能性，本轮对照后**采推荐**属实体裁定而非程序
> 惯性，对照公允。

对照维度按 FLCAP §1.1 六维体例 + A5 §3.2 指定面（语义耦合度 / golden 关联面成本 / verify
分流形态 / Arena 盲包指纹面）扩为八维：

| 维度 | 形态 a：`inertia_model` 枚举扩值【**定案**】 | 形态 b：正交二键 `combustion_model`（排除） | 形态 c：thermo 原地深化（排除） |
|---|---|---|---|
| 形态语义 | 既有单键三值枚举（scenario.js:56）扩第 4 值 **"thermo_comb"**（Q2 定案）；thermo 既有值语义冻结 | 新正交事件级键（默认 off；**前置条件 inertia_model=thermo 才可 on**——非法组合结构化错误拒绝） | capacity/延迟效应并入 thermo 既有值 |
| **gt001_v3 冻结涉面** | **零涉**——thermo 值解析/分派（engine.js:1521）/gt001_l1_oracle/gt001_v3 全链不动，深化轨以新值+新 golden（gt001_v4）出生 | **零涉**——thermo 轨全链不动，combustion 面以独立键+独立 golden 出生 | **breaking 排除**——thermo 为默认轨（systems.js:793），原地变更 = gt001_v3 冻结锚点对新引擎失配（A5 §3.2 :182-184 硬伤原文——V1_FACES §3.2 golden 语义级变更 = breaking） |
| 语义耦合度 | 燃烧延迟 = thermo 轨**同链深化**（EQ-GTL2-4 RHS 单项改道，§1.3）——非独立物理轴，枚举「互斥轨语义」自然（GTL1 §2.4 登记缺点已声明三值为「模型深度轨」语义，:243-246） | 组合语义弱——燃烧延迟非独立物理轴（A5 §3.2 原文自认）；FL capacity 为热面之上独立开关轴（正交），两先例语义结构不同构 | — |
| 非法组合排除 | 单键枚举天然排除（GTL1 Q2 理由 2 :219-222）——swing/linear 与燃烧延迟物理上不自洽 | 需组合拒绝规则（swing/linear ∧ on 无意义）——**恰是 GTL1 Q2 理由 2 当初避免的形态**（A5 §3.2 :181-183 原文「成本 S 级 + scenario 新键」） | — |
| 哈希/scenario 先例套用 | INERTIA_MODELS 枚举 +1 值（scenario.js:56）；既有场景解析零变化（显式携带 inertia_model 的场景解析值不变、缺省场景解析 = 默认轨 thermo 不变 ⇒ 既有 scenarioHash 零变化；「新值只影响使用它的输入」= V1_FACES :197-198 面③ 冻结边界同构）；scenarioHash 含解析轨机制已随 GTL1 B-2（CHG-20261104-12 ③）落地。**守卫面（B-1/A-5 订正，v1.0）**：三处字面守卫须 **additive 编辑**——scenario.js:401-402（:401 条件引用 INERTIA_MODELS 常量**自动覆盖**、:402 消息串字面三值须 additive）+ engine.js:320-324（:321 条件与 :322 消息串**均字面三值硬编码**须 additive）+ schema.js:231-234（第三处守卫，:231-232 条件与 :233 消息串字面——**草案未登记、批准轮补登**）；与「validate 消息串 additive」行一致化（**非「自动覆盖」**） | EVENT_KEYS +1 键（:52 additive）+ 枚举常量（:60/:68/:77 同构）+ declaresCombustion 守卫（:404/:425 同构）+ FC B-1(a) 显式键条件式哈希（缺省轨只在 normalizeConfig 盖章层解析——engine.js:188-189 同构新行；face③ 冻结边界 V1_FACES:184-186 禁止缺省轨入哈希）+ validate 组合守卫（Q11 形态——FLCAP 双落点先例）+ **normalizeConfig 盖章行 + defaultConfig 双落点（FC B-7 盖章双落点先例同构——B-3(v) 补登第六件）** | — |
| config_hash 轨区分面（**B-2 定案新增行**） | **天然区分（强化论据）**：inertia_model **现状在 config_hash 投影内（schema.js:144 实读）** ⇒ 形态 a 深化轨 Run（inertia_model="thermo_comb"）的 config_hash/run_hash 经投影轨值为**新值**——**含 healthy/monitor 局**（轨值入投影、run_hash 仍为新值），与 thermo 轨 Run 无跨轨哈希碰撞面 | 投影外新键（B-3a 形态）⇒ on/off 两轨 config_hash 同值、「轨区分由 run_hash 承载」局限成立——**且 healthy 局 run_hash 跨轨同值碰撞须补登**（B-3a 局限 + 碰撞面，形态 b 专属缺陷） | — |
| golden 路由面 | 单值四元映射（linear→v1 / swing→v2 / thermo→v3 / thermo_comb→v4）——一一对应最简（GTL1 Q2 理由 3 :222 直接延续）；gt001_l1_oracle RUNS/golden 关联面**零触碰**（thermo↔v3 映射全保留，新值由新 oracle 承载） | 二元分派表 (inertia_model, combustion_model) 四行 + 非法组合拒绝行——FLCAP §4 项 10 三元分派表同构（面积更大但显式可枚举） | — |
| verify 分流形态 | **新条目形态（Q7 定案）**：MODELS["gt001_comb"] + DEFAULT_MODELS 尾追加（FL/FC/FLCAP 先例）；MODELS["gt001"] 重指向块（:182-198）维持验 v3 零改动 | 同左 + 组合守卫面 | — |
| Arena 盲包指纹面 | 默认轨维持 thermo（**不**翻转为深化轨——GTL1 Q4 翻转涟漪无必要重付，A5 §3.2 :179 原文）⇒ 盲包 config 指纹/观测语义零变化 | 默认 off ⇒ 盲包语义零变化（等价——非判别维度，登记平手） | 全部新生成 GT Run 语义漂移——盲包/归档双面失配 |

**定案理由（CHG-20261114-07——草案四条理由全采 + B-2 强化论据补强）**：
① **语义耦合度判别**：燃烧延迟是 thermo 链内部的单项深化（燃料→燃烧室能量传递滞后），
不是可独立组合的物理轴——FL capacity 组合键先例的成立前提（容量面与热面正交、(on,on)
组合有物理意义）在 GT 侧不存在；单键枚举天然排除 swing/linear 深化组合（GTL1 Q2 理由 2
直接延续），形态 b 须新写组合拒绝规则（A5 §3.2 原文已预登记成本 S 级）；
② **涟漪面最小**：形态 a 全部涟漪 = INERTIA_MODELS +1 值 + engine 三分派前插一行 + 三处
守卫条件与消息串 additive（或一次性改引常量的等价重构，**实现轮显式登记**——B-1 定案措辞）
——无新键、无新守卫、无盖章新行、无 defaultConfig 双落点（形态 b 按 FC/FLCAP 清单须
六件套含盖章双落点——B-3(v) 补登，涟漪 +1 级）；
③ **golden 一一对应维持**：三值→三 golden 映射零触碰、第 4 值纯 additive——verify 分派
单值映射比二元分派表简；FL §6.3 对 A5 枚举推荐的翻转依据（golden 关联面成本）经实读对
GT **不成立或反向**：GT 枚举扩值不触碰 gt001_l1_oracle（thermo↔v3 关联全保留），新值由
新 oracle 承载——golden 关联面在两形态下对称，非判别维度（诚实登记：FL 翻转先例的
成因是 FL 特有的正交组合需求——本轮公允性确认见定案标注）；
④ **键名语义漂移增量有限**：inertia_model 承载第 4 值的键名漂移已有文案承载（GTL1 §2.4
登记缺点 :243-246 已声明该键值为「模型深度轨」语义而非字面惯量形式——thermo 值本身已非
惯量语义，第 4 值为同语义轴延拓）；
⑤ **config_hash 轨区分面天然强化（B-2 定案）**：inertia_model 现状在 config_hash 投影内
（schema.js:144）⇒ 形态 a 深化轨 Run 的 config_hash/run_hash 天然为新值（含 healthy/monitor
局）——形态 b 反而引入 B-3a 零投影局限 + healthy 局跨轨 run_hash 碰撞面。此维在草案对照表
中缺席、批准轮补入后**单向有利形态 a**。
**形态 a 的登记缺点与对冲（维持）**：键名漂移并非零增量（第 4 值 "thermo_comb" 使键面
承载「轨+深化」两级语义——UI/schema 帮助文案须同步声明，GTL1-IMP-Q2 文案面同构）；
**守卫面三处 additive 编辑为显式工作面**（B-1——非自动覆盖，§8 GTCMB-G2b-04 点名）。

### 1.2 层级判定与状态向量（诚实区分——I-2）

**层级判定**：ALINE §1.2 第三行「新增状态变量/新物理（方程集扩展）→ 完整 G2b」——本轨
即该判定实例（thermo 轨已批范围 = EQ-GTL1-1…12；燃烧延迟环节超出该范围）。ALINE §1.1
L1 判据逐条对照（GTL1 §1.1 表体例）：新物理状态变量 = **x_comb 新动态 ODE 状态**（第三
动态状态）；方程不可手解 = (f, T3, x_comb) 三状态非线性耦合 ODE（x_comb 经 EQ-GTL2-4 修订式
反馈入 T3，T3 经效率链入 f——无闭式解，GTL1 §1.1 二维版判据的三维延伸）；需专用积分器 =
RK4 固定步长 3 维分区格式（§1.3）；golden 由独立数值 oracle 生成 = 新文件（Q5 定案）。

**状态向量（定案——诚实区分动态/代数，A5 §3.1 原文口径）**：y = [f, T3, **x_comb**]
（**2→3 维 ODE**）；x_comb 为**燃烧/能量转换延迟状态**（一阶燃料-能量传递滞后的状态
变量，物理量纲 kW——延迟后的燃料功率 Q_f,d；初值 x_comb(0) = k_f·u(0)（Q11 定案））。
其余物理量（T2/p2/T4/Q_f/P_comp/P_turb/P_gen/η_cycle）为效率链代数输出，每个输出采样点由
(y, u_eff, demand, b) 重算——与 gt001_l1_oracle record() 同构（:313-347 实读）。**不把代数量
冒称 ODE 状态**（I-2）。

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | sourceKind/exposure 提案 |
|---|---|---|---|---|---|
| f | ODE 状态（保留） | f_true_Hz（复用） | Hz | EQ-GTL2-7 原样（≡ EQ-GTL1-7） | L1 既有不变 |
| T3 | ODE 状态（保留） | T3_out_K（复用） | K | EQ-GTL2-4 **修订式**（RHS 燃料项经 Q_f,d——冻结文本 §1.3） | MODEL_STATE → public_demo（既有） |
| **x_comb** | **ODE 状态（新）** | 不出信号（Q10 定案零新信号） | kW | 延迟环节状态（EQ-GTL2-3——τ_comb = 0.5 s）；T3_out_K/既有列承载教学面 | —（零新信号则无列） |
| Q_f | 代数（保留） | Q_fuel_kW（复用） | kW | EQ-GTL2-3 指令面 k_f·u_eff（**指令映射口径维持**——Q13 定案；E_fuel 同源） | DERIVED → public_demo（既有） |
| 其余代数链 | 代数（保留） | 复用（T2/p2/T4/P_comp/P_turb/η_cycle） | — | EQ-GTL2-1/2/5/6/12 原样/修订（对应表 §1.3） | 既有不变 |

**盲包面（GTL1 §1.2 B-1 先例）**：GT 在盲测池（arena.js:110 `ARENA_EXCLUDED=[]`——六系统
全入池，v1.3.0）；Q10 定案零新信号 ⇒ 盲包观测面/序列面零新增；**GT 无 FL 式 SOC 定义面**
——FL onTrackOnly 先例中 E_cap 的 'soc' 类目归属不可平移（本轨无新列，该面整体归零）；
GT 的 SOC_true/SOC_est 列为电池下垂记账沿袭面，本轨**零裁定、零口径变更**（记账式原样，
暂态路径随 f 轨变化、渐近稳态不变——§3.2）。

### 1.3 τ_comb 延迟环节（**定案——EQ-GTL2-1…12 冻结文本 + τ_comb = 0.5 s**）

- **A5 §3.1 原文（:159-167，提案唯一权威描述）**：「thermo 轨现状 y = [f, T3] 二维……
  燃料功率 Q_f = k_f·u_eff 经 EQ-GTL1-3 **瞬时**进入燃烧室能量平衡 EQ-GTL1-4……深化草案：
  增**燃烧延迟状态** x_comb（一阶燃料-能量传递滞后，`τ_comb·dQ_f,d/dt + Q_f,d = Q_f`，
  τ_comb 为教学整定值非实测），状态向量 **y = [f, T3, x_comb]（2→3 维 ODE）**；EQ-GTL1-4
  RHS 的 η_b·Q_f 项改经 Q_f,d 进入（精确式 G2b 冻结）」。
- **τ_comb 形态（Q3 定案 = (a)）**：**一阶滞后 + 新 ODE 状态**（A5 原文形态，2→3 维结构的
  直接前提）；(b) 纯传输延迟（无新 ODE 状态——与 A5「2→3 维」原文直接冲突）与 (c)
  二阶/高阶滞后（涟漪升级、无 A5 依据）维持排除。
- **EQ-GTL2-1…12 冻结文本（Q4 定案 = 全集自含——新轨唯一权威文本单文件自含，oracle
  硬编码 = 本表；对应关系显式登记）**：

| id | 冻结式 | 对应/说明 |
|---|---|---|
| EQ-GTL2-1 | pi_c = pi_c0·(f/f0)²；p2 = pi_c·p1 | ≡ EQ-GTL1-1 原样（压比-转速耦合，二次线性化） |
| EQ-GTL2-2 | T2 = T1·(1 + (pi_c^a_c − 1)/eps_c) | ≡ EQ-GTL1-2 原样（压气机效率链） |
| EQ-GTL2-3 | **Q_f = k_f·u_eff（指令映射口径维持）；τ_comb·dQ_f,d/dt + Q_f,d = Q_f；ṁ_f,d = Q_f,d/LHV；ṁ_g = ṁ_a + ṁ_f,d** | EQ-GTL1-3 修订——**延迟状态方程 + ṁ_g 延迟同源（Q13 定案 (i)）**；τ_comb = 0.5 s（本节定案）；Q_fuel_kW 列/E_fuel 承 Q_f 指令面（Q13 定案 (ii)） |
| EQ-GTL2-4 | C_3·dT3/dt = **η_b·Q_f,d** − ṁ_g·cp_g·(T3 − T2) | EQ-GTL1-4 修订——η_b·Q_f 项改经 Q_f,d 进入（A5 §3.1 原文；ṁ_g 同经延迟——EQ-GTL2-3） |
| EQ-GTL2-5 | p3 = (1−beta_b)·p2；pi_t = p3/p1；T4 = T3·(1 − eps_t·(1 − pi_t^(−a_t))) | ≡ EQ-GTL1-5 原样 |
| EQ-GTL2-6 | P_comp = ṁ_a·cp_a·(T2−T1)；P_turb = ṁ_g·cp_g·(T3−T4)；P_gen = eta_m·(P_turb − P_comp) | ≡ EQ-GTL1-6 原样（ṁ_g 引 EQ-GTL2-3 延迟口径） |
| EQ-GTL2-7 | df/dt = (P_rotor/K_J)·(f0/f)；P_rotor = P_gen + P_bat − P_load | ≡ EQ-GTL1-7 原样（Q1 定案：L0b 定义恒等保留） |
| EQ-GTL2-8 | P_bat = P_bat_ref − K_bat·(f − 50) | ≡ EQ-GTL1-8 原样 |
| EQ-GTL2-9 | f_gov = (monitor 且 sensor_drift) ? f : f + b；u_next = clamp(u + Ki·(50 − f_gov)·h, 0, 40) | ≡ EQ-GTL1-9 原样 |
| EQ-GTL2-10 | 执行器激活窗内 u_eff = min(u, u_cap)，u_cap = 40·magnitude%；清除后 u_eff = u | ≡ EQ-GTL1-10 原样（Q5 定案指令域口径维持） |
| EQ-GTL2-11 | 设计点闭合：u=25 且 f=50 且稳态 ⇒ P_gen=25.000000 kW 且 T3=1173.000 K（k_f/ṁ_a 双条件导出——稳态 x_comb ≡ Q_f 塌缩后与 EQ-GTL1-11 逐式重合） | ≡ EQ-GTL1-11 原样（稳态恒等——§3.3 三点不变性核验 C0） |
| EQ-GTL2-12 | C_3·(T3(t)−T3(0)) = ∫(η_b·Q_f,d − ṁ_g·cp_g·(T3−T2))dt′（GL-2 检查式重推——左矩形 vs RK4 增量双形态）；E_fuel = ∫Q_f dt（**指令面**）；eta_cycle = E_gen/E_fuel | EQ-GTL1-12 修订重推（**Q13 定案 (iii)**——ṁ_g/Q_f,d 延迟口径代入；E_fuel 指令面与 gt001_v3 口径连续） |

  **初值（Q11 定案 = (a)）**：x_comb(0) = k_f·u(0)（= k_f·25 = 101.7633 kW，设计点稳态燃料
  功率，GTL1 §3.1 冻结值 Q_f ≡ 101.7633 kW 同源）⇒ 健康局/monitor 局全序列 dx_comb/dt ≡ 0、
  x_comb ≡ Q_f ⇒ (f, T3) 轨与 gt001_v3 healthy/monitor **同实现逐位恒等、跨实现 ±1e-9 内
  逐点恒定**（§3.1/§3.3 位级机制实测 0.0——A-2 措辞一致化）。
  **量纲闭合（I-2）**：[τ_comb] = s、[Q_f] = [Q_f,d] = [x_comb] = kW ⇒ τ_comb·dQ_f,d/dt：
  s·kW/s = kW = Q_f ✓；EQ-GTL2-4：kJ/K·K/s = kW = η_b·Q_f,d − (kg/s)·(kJ/(kg·K))·K = kW ✓；
  ṁ_f,d = Q_f,d/LHV：kW/(kJ/kg) = kg/s ✓；η_cycle 瞬时列 = 100·P_gen/Q_f **指令面口径维持**
  （P_gen 由延迟链承载、Q_f 为指令面——暂态分子分母异源为深化轨已知口径、渐近稳态同源
  收敛，显式登记不静默；eta_cycle_end_pct = E_gen/E_fuel 同为指令面自洽）。
- **RK4 3 维分区格式（GTL1 §2.3 骨架结构性复用——:182-203；oracle/引擎双侧复刻唯一权威）**：
  u 仍非 RK4 状态（每子步按 L0b 更新序显式推进，EQ-GTL2-9/10 原样）；x_comb 进 RK4 物理状态
  （RHS = (Q_f − x_comb)/τ_comb，Q_f 子步冻结于起点右值）；事件边界性质维持——t=20.0/
  t_clear=35.0 恰在子步边界（GTL1 §2.3 注记③ :208 实现约束）。**子步解析交叉证据面**：
  x_comb 子步内为常系数线性 ODE（Q_f 冻结口径）⇒ 精确指数解 x(t+h) = Q_f + (x−Q_f)·e^(−h/τ_comb)
  存在——FL FL-7 / FCAP-7 / FEC-7 同构交叉面；**批准轮实测 |RK4 − 精确| = 5.41e-11 kW
  （相对 5.4e-13，h=0.01、τ=0.5）**（§3.3——GCMB-7 实测冻结制证据基座）。
- **精确式待决子项 → 定案（Q13，CHG-20261114-07）**：(i) **ṁ_g 燃料项采延迟同源**
  （ṁ_f,d = Q_f,d/LHV——质量与能量同经延迟环节，物理一致性：燃气质量与能量同源于实际入
  燃烧室燃料）；(ii) **E_fuel 采指令面维持**（∫Q_f dt——与 gt001_v3 记账口径连续可比）；
  (iii) **EQ-GTL1-12 检查式重推 = EQ-GTL2-12**（GL-2 同构，ṁ_g/Q_f,d 延迟口径代入）。
- **参数面定案（τ_comb——CHG-20261114-07 + 域扫描证据 §3.3）**：**τ_comb = 0.5 s**（单位 s、
  教学整定值非实测——A-gtl1-combustor-lump :429「教学整定等效时间常数（假设非实测参数）」
  句式先例）。**整定依据七项判据（A-3 定案：五项扩为七项）**：
  ① **与 τ_3 = τ_g = 2.0 s 有意异值且可辨识**（GTL1 R-7「同值误读」:505 的反向运用——0.5 s
  与 2.0 s 同量级（O(1 s)）4 倍差，assumption 声明，A5 §3.4 ② 原文）；
  ② **60 s 窗内暂态可见（不过度）**：load_step max|T4(v4)−T4(v3)| = 4.39 K（EGT 摆幅约
  150 K 的 3%）、clear 过冲 0.3221→0.3311 Hz / 回差 36.0→36.6 s / T3peak +3.8 K——§3.3；
  ③ **输出网格可辨性下限（A-3② 新增）**：T4 相对 P_gen_cmd 相位滞后 ≥ 数个 dt=0.1 采样——
  实测 load_step 去趋势差分互相关滞后 15→20 采样（**+5 采样 = +0.5 s ≈ τ_comb 群迟延直加**；
  t50 口径 21→26 采样同 +5）——§3.3；
  ④ **RK4 显式步长稳定裕度**：三维耦合 max|λ| = 4.816 s⁻¹（f 模态主导；τ_comb 模 −2.0 s⁻¹
  非最快）⇒ dt·|λ| = 0.0482 ≪ 2.785（裕度 57.8x，与 thermo v3 同量级）——§3.3 判据⑦；
  ⑤ **|Δf| ≤ 1 Hz 有效性域全量重扫**：20 点 × 601 点全域 max|Δf| = 0.999640 Hz < 1.0 未越界
  （裕度 3.60e-4 Hz——较 thermo 冻结值 0.997996 收窄，登记）——§3.3 判据③；
  ⑥ **T3/T4 包络重推**：T3 [735.3, 1524.9] K / T4 [486.7, 1001.2] K（6 Run + 域扫描 + load+20
  角点全量；emit 复算冻结为准）——§3.3 判据④；
  ⑦ **3D 闭环稳定性 + 窗内收敛（A-3① 新增）**：mag=1.0 角点尾段幅度严格递减、零持续振荡、
  收敛 gap ≤ 重推上界 4e-3 Hz——§3.3 判据⑤。
  **边界敏感性登记**：τ_comb ≥ 0.7 s 时 mag=1.0 角点 f 下穿 49.0 Hz（|Δf| > 1 Hz 越界——
  域扫描实测 τ=0.7 min f = 48.999773）⇒ 候选域上界 ≈ 0.6 s；τ_comb = 0.5 s 为**域内整定**
  （0.4/0.5/0.6 三候选全扫描后取中——裕度 3.60e-4 Hz 大于 T-B gate 预案 f_Hz_atol 1e-4 的
  3.6 倍，teaching 面三候选中最可见）。

### 1.4 GT 既有面影响登记（零变更面清单）

| 面 | 登记 |
|---|---|
| 摇摆方程/机械接口 | EQ-GTL2-7 原样（P_rotor 定义恒等 Q1 定案维持；r_true ≡ 0 检查面零涟漪） |
| 调速器/执行器 | EQ-GTL2-9/10 原样（燃料指令域钳位 [0,40] 维持；u_cap 事件域口径 Q5 定案维持） |
| 电池下垂/SOC | EQ-GTL2-8 原样；SOC_true/SOC_est 记账式原样（暂态路径随 f 变化、渐近稳态不变——§3.2；GT 无 FL 式 SOC 定义裁定面——§1.2 行） |
| 测量链 | n_meas = 60·(f + b)、f_channel_diff、f_meas 通道全部原样（测量链零升级——FC Q5「测量/控制链零升级」同构）；噪声关闭/开启口径不变 |
| 负荷面 | demandAt 原样（load_step 族注入面零变化）；GT 频率响应经 f 轨承载燃烧延迟暂态 |
| 事件编码 | EV-001/EV-002 事件编码 v1 零变化（GT001 §9 定案追记六场景对齐维持；事件快照变量面零扩展预期——实现轮核对） |
| 因果模板 | causal-rules thermo 模板 additive 扩展（**先例 = GTL1 §8 GTL1-G2b-04 行 :493「causalTemplates thermo 扩展」——B-3(iii) 勘正：非 GTL1 §4 项 8 :378**；systems.js:2226 GT001.causalTemplates 现值——模板为既有三族变体节点，零新事件族） |

### 1.5 assumptions / limitations / UI 措辞（**定案冻结**；实现轮迁入 src/** 前 §6.3 预检 + copy-guard 终检）

| id | text（冻结） |
|---|---|
| A-gtcomb-lag | 【仅 combustion 深化轨适用（inertia_model=thermo_comb）】燃烧/能量转换延迟为一阶滞后环节（τ_comb·dQ_f,d/dt + Q_f,d = Q_f，延迟状态 x_comb）：τ_comb = 0.5 s 为教学整定值（非实测参数），与 τ_3 = 2.0 s / τ_g = 2.0 s 有意取异值（0.5 s，4 倍差——同量级对照设计，同值将不可区分第二动态时间尺度）；方程集见批准规格 EQ-GTL2-3。 |
| A-gtcomb-steady | 【仅 combustion 深化轨适用】延迟环节不改变稳态值、只改变暂态路径（d/dt = 0 ⇒ Q_f,d ≡ Q_f）：设计点与注册域稳态解与 thermo 轨逐点同（批准轮三点不变性核验在案——规格 §3.3）；暂态路径（滞后-超调形态）为深化轨独有教学面。 |
| A-gtcomb-l1 | 【仅 combustion 深化轨适用】燃烧延迟模型为教学尺度降阶环节示意（L1 深化轨），不是经过验证的设备控制器或机组燃烧系统模型。 |

limitations 追加（深化轨域，3 项，冻结）：① 点火延迟/熄火边界/贫富油极限与燃烧室金属-燃气
热容分离维持未建模（GTL1 §6.1 项 4 剩余面——本轨只取一阶延迟最小集）；② τ_comb = 0.5 s 与
τ_3/τ_g = 2.0 s 的形态区分依赖有意异值整定（同值域内第二时间尺度不可辨识——教学可辨识性
声明，A5 §3.4 ②；|Δf| ≤ 1 Hz 有效性域在深化轨的角点裕度收窄至 3.60e-4 Hz——§3.3，登记）；
③ 沿袭 thermo 轨全部局限（GTL1 §6.1 十项）。UI 变体冻结：深化轨 = 「L1 · 燃烧动态延迟
模型（数值仿真级）」；summary 追加「燃料功率经一阶延迟环节进入燃烧室，EGT 呈滞后-超调
第二时间尺度（教学观察面）」；定位句「教学尺度燃烧-热降阶链示意（L1 深化轨），非机组/
电网动态验证」——预检见 §6.3。

## 2. 场景/事件族影响面（零新事件族 + 键面 additive 显式 CHG）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / load_step / actuator_fault 三族（含 actuator_clear 局）定义、参数域、defaultTime、因果模板零变更——深化轨仅物理响应面变化（同故障跨深度对比 = 教学点，ALINE §6.4 固定句式「模型深度导致的表达力差异」） |
| scenario 键面 | **形态 a（定案）**：INERTIA_MODELS（scenario.js:56）additive +1 值 "thermo_comb"——无新键；守卫面 = 三处 additive 编辑（**B-1 定案**：scenario.js:401-402 条件自动/消息串 additive + engine.js:320-324 条件与消息串 additive + schema.js:231-234 条件与消息串 additive——或一次性改引常量的等价重构、实现轮显式登记；**非「自动覆盖」**）；跨深度对比场景经 inertia_model 显式钉轨（GTL1 B-2 机制延续——scenarioHash 含解析轨，新值场景 additive 入哈希、既有场景哈希零变化）。显式 CHG = v1.6.0 实现 CHG 登记（GTL1 §2.4 B-2 / FC 面③ 先例——additive） |
| 哈希面（先例套用） | model_hash：深化轨全部声明面（A-gtcomb-* assumptions、深化轨 limitations、EQ-GTL2 冻结集 equations、level/summary 变体）**挂 SystemDef 模型级 additive 子对象（FC `model.electrochem` / FL `model.capacity` 先例同构）——置于 model_hash 具名九字段哈希域之外**（engine.js:559-569 hashObject 输入清单：model_id/model_version/assumptions/limitations/equations/units/claims/unit_system/equation_ids——**不加入**）⇒ model_hash 既有输入零变化；既有五数组逐字节不动；**model_version 维持 '1.2.0'（Q12 定案——SystemDef systems.js:980 现值、golden v4 元数据同值，见 §11 Q12）** |
| 新信号列门控 | **Q10 定案零新信号 ⇒ 本面整体归零**（无 onTrackOnly 列；x_comb 为 ODE 内部状态不出信号） |
| config_hash 投影 | **B-2 定案订正**：scenarioView 投影**现状含 inertia_model**（schema.js:144 `inertia_model: cfg.inertia_model`——草案「inertia_model 现状均不入」失实，就此勘正）⇒ **形态 a 深化轨 Run（thermo_comb）的 config_hash/run_hash 经投影轨值天然为新值——含 healthy/monitor 局（轨值入投影、run_hash 仍为新值），与 thermo 轨 Run 无跨轨哈希碰撞面（强化形态 a）**。**B-3a 局限（「轨区分由 run_hash/序列内容承载——不静默」）只适用形态 b**（投影外新键 + healthy 局 run_hash 跨轨同值碰撞须补登）——形态 b 已排除，该局限登记收窄为被排除形态的历史评估留档；FC/FL 现状 B-3a 登记（electrochem_model/capacity_model 不入投影）不受影响、维持原样 |
| 事件快照 | 零扩展（x_comb/Q_f,d 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | GT 在池（ARENA_EXCLUDED=[]）；默认轨不动（形态 a 不翻转默认——§1.1）⇒ 盲包 config 指纹/观测语义零变化；零新信号（Q10）⇒ 盲投影零新增；未来盲包钉深化轨须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号 additive（assumptions 走模型级 additive 子对象；零新信号 ⇒ 信号目录零变化）；面② 新 golden 新 id（gt001_v4）；面③ scenario 键面 additive（显式 CHG）；面⑥ scope 零改动预期（GT classify 消费面 = extension_preview 现状不变——B-4 实读，实现轮实读核对登记）；面⑦ 步数账 0 新步预期（实现轮 CHG 申报）；面⑧ 词表零增预期——**零 breaking 预期**（既有 11 golden 零触碰 / 既有哈希零变化——含 model_version 维持 1.2.0 / 既有 35 步判据零翻转，V1_FACES §3.4 additive 边界三条逐一对照） |

## 3. 锚点与包络（thermo 轨零变化硬条件；深化轨数值 = 批准轮域扫描值——emit 复算冻结为准）

### 3.1 thermo 轨（无 thermo_comb 值域）与 gt001_v3 零变化硬条件（三层佐证体例沿 FLTH §3.3 / FC §3.1 / FLCAP §3.1）

1. **代码结构佐证**（批准轮实读复核）：`grep -rn "combustion_model\|thermo_comb\|x_comb" src/`
   = 0 命中（草案轮 2026-11-14 实跑、批准轮树零代码变更同结论）——本轨未触任何代码；GT 分派链
   现状（engine.js:1517-1521 三分派 + :1654 simulateGT001Thermo）即全部既有轨代码路径；
2. **数值佐证**：gt001_v1/v2/v3 三份冻结 golden 在验（run-g2 **步 ③** `verify_golden.py gt001`
   显式调用验 v3——T-B 全轨比对；engine-gt.test.js（**run-g2 步 21**——B-3(ii) 勘正）双 golden
   比对面 linear→v1 / swing→v2 / thermo→v3）；gt001_l1_oracle GL-1…8 自检 exit 0 为 emit 现状
   （批准轮域扫描环境校验复现 5/5——§3.3 执行口径）；copy-guard PASS（39 模式 0 命中，批准轮
   实跑基线绿）；
3. **实现轮零变化判据（GTCMB-G2b-04 验收项——FC §3.1 项 3 B-2 形态合并重述；A-2 措辞
   一致化）**：**关键句式：深化轨未激活时（inertia_model=thermo 或默认轨）全链与既有轨恒等——
   单实现结构恒等（同运算序复刻）下逐位同；跨实现（新 oracle↔gt001_l1_oracle、engine↔oracle）
   按 GTL1 A-1 句式 = ±1e-9 内逐点恒定**（T-B 容差制度——不做 ULP 级承诺，与 §4 项 3 对齐）。
   判据 = t/signals/metrics/checks/config_hash + 对应 golden 比对零变化 + run_hash ±1e-9 内
   逐点恒定；承载机制（形态 a 定案）：枚举扩值不改既有值解析（:56 三值解析路径零变化）+
   声明面挂 additive 子对象（model_hash 九字段域外）+ model_version 维持 1.2.0（Q12——
   model_hash 输入零变化的结构前提）+ 零新信号（Q10——信号目录零变化）；
   tests/registry.test.js 哈希面既有断言零变化（仅 additive 新断言——深化轨 Run 哈希为
   新值）；既有引擎/GT 测试断言零改动通过；
4. **预期失效面（非「变化」，登记）**：registry.test.js additive 新断言；FAULT_CATALOG §1
   注记行；UI 层级徽章变体（thermo 视图零变化，深化轨视图 additive）；信号目录零变化
   （Q10 零新信号——GTL1 §3.1 项 4 的「signals +1」分支不触发）。

### 3.2 稳态不变性（**定案标注——结构声明 + 批准轮三点数值核验（§3.3）；A-1 两口径体例**）

| 项 | 结构声明 | 依据形态 |
|---|---|---|
| 稳态不变性 | 延迟环节 d/dt = 0 ⇒ Q_f,d ≡ Q_f 精确 ⇒ EQ-GTL2-4 在稳态与 EQ-GTL1-4 重合 ⇒ **深化轨与 thermo 轨渐近稳态逐点相同**（f_ss/T3_ss/P_gen_ss/Q_f_ss 全同）——延迟不改变稳态值、只改变暂态路径 | 一阶滞后结构推论（数学恒等）+ §3.3 长轨收敛 9 位全同实测 |
| 三点稳态不变（v1.3.0 TESPy 附录三点口径 (a) 稳态解参照） | 设计点 u=25（P_gen=25 kW ∧ T3=1173 K——EQ-GTL2-11 双条件）+ sensor 稳态（u ≈ 19.65——GTL1 §3.2 渐近稳态口径）+ u=40 钳位角点：三点稳态解在深化轨**结构不变**（§3.3：C0 残差 0.0、C1 600 s 长轨 f=49.700000000/T3=1043.951863 与解析链全同、C2 f=49.999214979 与 GTL1 冻结角点 49.999215 全同） | GTL1 §5 :388-391 三点 + TESPY_CORNER_EXTENSION_ASSESSMENT C1/C2 stdlib 口径 (a) 复算在案 + §3.3 本轮核验 |
| 健康局恒等（Q11(a) 初值定案承载；A-2 措辞） | x_comb(0) = k_f·u(0) ⇒ 健康局全序列 dx_comb/dt ≡ 0、x_comb ≡ Q_f ⇒ (f, T3) 轨与 gt001_v3 healthy **同实现逐位恒等（同运算序复刻——本轮实测 max 偏差 0.0）、跨实现 ±1e-9 内逐点恒定**（T-B 制度）；monitor 轨同（b 不进物理回路——GTL1 GL-3/GL-8 monitor 恒等先例同构） | 结构推论 + §3.3 位级机制实测；healthy/monitor 锚点面零扰动 |
| 故障 Run 暂态路径（**A-1 两口径体例——逐锚点表见 §3.3**） | sensor/load/actuator/clear 四 Run：**渐近稳态同、t=60 采样值随暂态路径变化**（滞后-超调形态——T4 相对 P_gen_cmd 相位滞后 +5 采样；方向/量级已由 §3.3 域扫描实测，emit 复算冻结为准） | A5 §3.1 教学点 + §3.3 逐锚点两口径表 |
| 频率/负荷域复扫（**已完成——§3.3 证据节**） | \|Δf\| ≤ 1 Hz 有效性域与 T3/T4 包络全量重扫 = 深化轨 emit 硬条件（GTL1 §3.3.1 域扫描冻结先例同款：sensor_drift mag ∈ [0.05..1.0] 步 0.05 共 20 点 + mag=1.0 角点断言内嵌自检——越界即 emit 拒绝写盘）：**批准轮预扫全域通过**（max\|Δf\| = 0.999640 Hz、包络 T3 [735.3, 1524.9] / T4 [486.7, 1001.2]——§3.3），emit 时以冻结实现复算为准 | A5 §3.1 :166-167 原文 + GTL1 §3.3 :313 / A-gtl1-speed-coupling :431 emit 硬条件纪律同款 |

### 3.3 深化轨锚点与域扫描证据（**批准轮定案节——τ_comb = 0.5 s 整定证据 + A-1/B-5 逐锚点两口径登记**）

> **执行口径**：仓库外临时脚本（`python -I`，未落仓库、用后已删除——FLCAP v1.0 纪律同款）；
> `import gt001_l1_oracle`（**冻结常量只读导入**——K_F/ṁ_a/C_3 等 15 位常量以 GTL1 §2.1 登记
> 值为唯一权威，V-03 文件零触碰）；RK4 h=0.01 三维分区（§1.3 冻结格式）、601 点输出网格；
> **环境校验**：thermo 轨（2D 路径）六 Run 锚点全表复现 = GTL1 §3.2/GL-5 登记值 5/5
> （f60=49.700495/nadir=49.590174/f60=49.999347/Pgen=18.26551/overshoot=0.3221 全中）后方
> 采信；healthy/monitor v4 轨位级恒等 0.0 同轮复核。

**（一）域扫描（判据③④⑤⑥——sensor_drift 闭环、mag ∈ [0.05..1.0] 步 0.05 共 20 点 × 601 点）**：

| mag (Hz) | f_min = f(60) (Hz) | max\|Δf\| (Hz) | | mag (Hz) | f_min = f(60) (Hz) | max\|Δf\| (Hz) |
|---|---|---|---|---|---|---|
| 0.05 | 49.950005 | 0.049995 | | 0.55 | 49.450124 | 0.549876 |
| 0.10 | 49.900011 | 0.099989 | | 0.60 | 49.400144 | 0.599856 |
| 0.15 | 49.850019 | 0.149981 | | 0.65 | 49.350165 | 0.649835 |
| 0.20 | 49.800027 | 0.199973 | | 0.70 | 49.300188 | 0.699812 |
| 0.25 | 49.750037 | 0.249963 | | 0.75 | 49.250212 | 0.749788 |
| 0.30 | 49.700048 | 0.299952 | | 0.80 | 49.200238 | 0.799762 |
| 0.35 | 49.650060 | 0.349940 | | 0.85 | 49.150266 | 0.849734 |
| 0.40 | 49.600074 | 0.399926 | | 0.90 | 49.100296 | 0.899704 |
| 0.45 | 49.550089 | 0.449911 | | 0.95 | 49.050327 | 0.949673 |
| 0.50 | 49.500106 | 0.499894 | | **1.00（角点）** | **49.000360** | **0.999640** |

**结论（判据③）**：全域（含 mag=1.0 角点）窗口 max|Δf| = **0.999640 Hz < 1.0 Hz——未越**
A-gtl1-speed-coupling 的 |Δf| ≤ 1 Hz 有效性域；角点裕度 = **3.60e-4 Hz**（thermo 冻结值
0.997996/裕度 2.0e-3——**深化轨收窄登记**，仍大于 T-B gate 预案 f_Hz_atol 1e-4 的 3.6 倍）。
**单调无下冲形态全域维持**（各 mag 点 f_min = f(60)——f 自上方单调逼近 50−mag，无越渐近线
下冲；「延迟可致下冲」的形态改变实测**未发生**于 τ_comb = 0.5 s 注册域——τ ≥ 0.7 s 候选
越界形态见 §1.3 边界敏感性登记，未采信）。**判据⑤（稳定性/收敛）**：mag=1.0 角点尾段
[30,40)/[40,50)/[50,60] max|f−49| = 0.3505/0.0522/0.0054 严格递减、t≥30 s 跨零 **0 次**
——无持续振荡；收敛 gap = |f(60) − 49.0| = **3.601e-4 Hz** ≤ 重推上界 **4e-3 Hz**（×11.1）；
GL-8 角点断言 min f > 49.0 维持（emit 硬条件——GTCMB-G2b-03 内嵌自检）。**判据⑥（GL-6
同构 gap——A-4 定案）**：mag=0.3 闭环 gap = |f(60) − 49.7| = **4.80e-5 Hz**（thermo 冻结
4.950e-4——同为渐近上方单调逼近、采样位更近渐近线：深化轨积分风裹 + 延迟的晚段趋近更快；
gap 非单调于 τ 的敏感性 0.45/0.5/0.55 s → 8.9e-5/4.8e-5/7.8e-6 已核）⇒ **GCMB-9 新界
5e-4 Hz（×10.4；thermo 界 5e-3 不沿用——A-4 重推定案）**。

**（二）包络重推（判据⑥/④）**：6 Run + 域扫描 20 点 + load_step +20 域角点全量：
**T3 ∈ [735.3, 1524.9] K**（thermo 冻结 [735.2, 1524.9]——下端 = sensor mag=1.0 角点，
深化轨燃料回落更慢 ⇒ 下端上移 0.1 K；上端 = u=40 钳位角点稳态主导不变）；
**T4 ∈ [486.7, 1001.2] K**（thermo [486.6, 1001.2]——同向）；load+20 角点 max|Δf| =
0.827723 Hz（域内）。emit 时以冻结实现复算冻结为准（GCMB-8 包络抽查键面随实跑更新）。

**（三）逐锚点两口径表（A-1 定案体例——「渐近稳态 vs t=60 采样」分列；B-5 sensor 逐点点名）**：
v3 冻结值 = GTL1 §3.2/GL-5 登记值（t=60 采样）；v4 值 = 本轮域扫描值（τ_comb = 0.5 s；
**emit 复算冻结为准**）；渐近稳态列两轨同值（结构不变性）。

| Run | 锚点 | 渐近稳态（两轨同） | thermo 冻结 t=60 采样 | thermo_comb t=60 采样（域扫描） |
|---|---|---|---|---|
| healthy | f / T3 | 50 / 1173 | 50 / 1173（恒等轨） | **位级恒等 0.0**（dx_comb/dt ≡ 0 机制——同实现） |
| monitor_only | f / T3 | 50 / 1173 | 50 / 1173（恒等轨） | **位级恒等 0.0**（同上） |
| closed_loop_fault（sensor +0.3；**B-5 逐点点名**） | f(60) | 49.7（=50−b） | 49.700495 | **49.700048** |
| 同上 | u_cmd(60) | u_ss = 19.652812 | 19.6582 | **19.6528** |
| 同上 | T3(60) | 1043.9519 | 1044.1601 | **1043.9712** |
| 同上 | T4(60) | 687.0887 | 687.2230 | **687.1011** |
| load_step +10 | nadir | —（暂态极值） | 49.590174 | **49.586263**（−3.9e-3，功率响应滞后 ⇒ nadir 略深） |
| 同上 | f(60) | 50（积分钉死） | 49.999347 | **49.999964** |
| 同上 | u_cmd(60) | u_ss = 32.506875 | 32.5000 | **32.5072** |
| 同上 | T3(60) | 1349.8335 | 1349.5662 | **1349.8198** |
| actuator_fault 50% | P_gen(60) | **18.265509**（钳位稳态） | 18.26551 | **18.26551（差 6.6e-9——该 Run t=60 前已收敛至渐近稳态，采样≈稳态；「钳位稳态 18.266 类锚点不变」的精确表述 = 渐近稳态不变，t=60 采样由 v4 emit 复算冻结）** |
| 同上 | f(60) | 49.719396217 | 49.719396 | **49.719396（差 3.1e-10——同上）** |
| 同上 | u_wound(60) / Q_f(60) | 40 / k_f·20（指令域） | 40.0 / 81.410629087 | **40.0 / 81.410629087（精确同——指令面口径 Q13）** |
| 同上 | T3(60) | 1052.3534 | 1052.353376 | **1052.353376（差 1.2e-7——同上）** |
| actuator_clear（t_clear=35） | overshoot | —（暂态极值） | 0.3221 | **0.3311**（+2.8%——延迟拖后功率恢复、峰前调速器多积卷 ⇒ 过冲幅值微增——暂态路径变化登记） |
| 同上 | t_back05 | —（回差时刻） | 36.0 | **36.6**（相位后移 +0.6 s——滞后-超调教学点） |
| 同上 | T3peak | —（暂态极值） | 1309.61 | **1313.43**（+3.8 K） |

（表体例说明：t=60 采样值均为**暂态路径量**——随深化轨路径变化偏离 v3 冻结值属预期、由
v4 emit 重冻结（A-1）；渐近稳态列结构不变（§3.2）；sensor 行 T3(60)/T4(60) 亦逐点点名登记
（B-5 与 A-1 同轮落）。教学面「相位滞后」的量化 = 判据③（§1.3/本节（四））。）

**（四）教学可辨识性（判据①②——A-3②）**：load_step 去趋势差分互相关 T4-对-P_gen_cmd
相位滞后：thermo **15 采样** → thermo_comb **20 采样**（**+5 采样 = +0.5 s ≈ τ_comb 群迟延
直加**——第二时间尺度的直接观测面）；t50 口径 21→26 采样同 +5；max|T4(v4)−T4(v3)| =
**4.39 K**（EGT 摆幅约 150 K 的 3%——图表可辨不过度）；f 路径 max 偏移 0.016 Hz（load）。
**（五）三点稳态不变性核验（§3.2 行 2 数值承载）**：C0 设计点（u=25, f=50）：EQ-GTL2-4
稳态残差 **0.0**、P_gen = 25.000000000、T3 = 1173.000000；C1 sensor 渐近（f=49.7）：
**600 s 长轨** f = 49.700000000 / T3 = 1043.951863 / u_ss = 19.652812——与 gt001_l1_oracle
链解析解（`_steady_t3` 同式）**逐式 9 位全同**（GTL1 §3.2 登记口径 u≈19.65/T3=1043.95 一致）；
C2 钳位角点（load+20）：f = **49.999214979**（GTL1 §3.2 冻结 49.999215）/ T3 = 1524.8766
（包络上端同源）；actuator 钳位角点（u_eff=20）：f = **49.719396217** / P_gen =
**18.265509**——解析全同。**v4 稳态 = thermo 链逐式相同（x_comb ≡ Q_f 塌缩恒等的数值证实）**。
**（六）数值方法证据（GCMB-7 预案基座）**：半步长自收敛（load_step，h=0.01 vs 0.005）：
max|df| = **1.090e-6 Hz** / max|dT3| = **4.660e-4 K**（thermo 冻结证据 1.082e-6/4.991e-4
同量级）⇒ T-B gate 量级预案（f 1e-4 / T 1e-2，gt001_l1_oracle TOLERANCES :748-762 镜像）
距证据 92x/21x——终值按双实现实测散差 × ≥10 冻结（GTCMB-G2b-03）；x_comb 子步解析交叉：
**|RK4 − 精确指数| = 5.41e-11 kW（相对 5.4e-13）**（冻结容差预案 = max(10×实测, 1e-9) =
1e-9 kW——实测冻结制 ×≥10 且下限 ≥1e-9 纪律）。

## 4. golden 计划（gt001_v4 · 新 id · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本批准轮零改动维持——emit = GTCMB-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **gt001_v4**——方程集扩展超出已批 EQ-GTL1-1…12（ALINE §1.2 第三行）→ 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1 :127）；保 id 重出不适用（非引擎行为零变更原地扩容）；**supersedes 链 v4→v3→v2→v1**（四代 golden 链管理成本——A5 §5 :278 原文登记面） |
| 2 | 独立 oracle | 新文件（**Q5 定案**）：`tools/oracle/gt001_comb_oracle.py`（物理面命名；MODELS 键镜像 `gt001_comb`）：独立性声明沿 gt001_l1_oracle.py:1-16 体例——不 import src/**、不 import gt001_oracle/gt001_l1_oracle、方程与常量唯一权威文本 = **本规格 §1.3 EQ-GTL2-1…12 冻结表 + τ_comb = 0.5 s**、stdlib（python -I）自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）；**gt001_l1_oracle.py 物理零触碰**（V-03） |
| 3 | 数值方法 | **y = [f, T3, x_comb] 三维经典 RK4** dt0.01（§1.3 冻结分区格式；RHS 内 demand/b/u_eff/Q_f 冻结子步起点）；x_comb 子步内常系数线性 ODE ⇒ RK4 vs 子步解析指数交叉证据面（批准轮实测 5.41e-11 kW——§3.3（六）；判据挂实测冻结制 ×≥10 且下限 ≥1e-9）；禁 ULP 级承诺（T-B 制度——跨实现口径一律「±1e-9 内逐点恒定」或实测冻结容差，A-2 一致化） |
| 4 | 自检预案 | 新段 **GCMB-1…9（Q6 定案）**：GCMB-1 环境校验（gt001_v3 6 Run 全序列复现——oracle 侧复刻 thermo 轨作退化校验：τ_comb 环节旁路/初值恒等下与 gt001_l1_oracle 输出 ±1e-9 内逐点恒定（跨实现口径——A-2），双 oracle 交叉面）；GCMB-2 恒等式（r_true ≡ 0 / EQ-GTL2-12 左矩形 vs RK4 增量 / 延迟环节积分恒等式）；GCMB-3 稳态不变性断言（三点稳态解与 thermo 链逐点同——§3.3（五）基座）；GCMB-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义）；GCMB-5 锚点全表复算（§3.3（三）v4 列 emit 复算冻结值）；GCMB-6 monitor 恒等（f≡50、x_comb≡Q_f 全序列）；GCMB-7 半步长自收敛登记 + 子步解析交叉（实测冻结制）；GCMB-8 无 NaN/Inf + 包络抽查（T3/T4 包络 §3.3（二）重推值 + **sensor_drift mag=1.0 角点 min f > 49.0 断言**——GTL1 GL-8 A-2 emit 硬条件同款内嵌）；**GCMB-9（A-4 定案）sensor 稳态结构 gap 检查**：closed_loop mag=0.3 |f(60) − 49.7| ≤ **5e-4 Hz**（域扫描实测 4.80e-5 ×10.4；thermo 界 5e-3 **不沿用**——界随 τ_comb 域扫描重推）+ mag=1.0 角点收敛 gap |f(60) − 49.0| ≤ **4e-3 Hz**（实测 3.601e-4 ×11.1——判据⑤承载） |
| 5 | Run 集（**Q8 定案**） | **镜像 gt001_v3 全集 6 Run、全部深化轨（inertia_model="thermo_comb"）**：healthy / closed_loop_fault（sensor +0.3）/ monitor_only / load_step +10 / actuator_fault 50% / actuator_clear（t_clear=35）——新 id golden 镜像基线全集先例（GTL1 §4 项 4 :374「镜像 gt001_v2 全集」/ FLTH v2 镜像 4 Run / FC Q6 镜像 5 Run）；monitor 不变量判据面保留 |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="gt001_v4"；model_id="GT-001"；model_version **= "1.2.0"（Q12 定案——否决 1.3.0 升位，理由与实施见 §11 Q12）**；method_id = "gt001_comb_rk4_dt0.01"（gt001_l1_rk4_dt0.01 句式）；engine_baseline=null；backend=null；**inertia_model="thermo_comb" 入 config 块与顶层 + run 项**（gt001_v3 config 惯例——oracle :812-835 实读形态）；supersedes="gt001_v3（thermo L1 轨，字节冻结留档；存档场次继续引用 v3）"；units 零新增（kW/Hz/K/kPa 全既有）；approval 三字段非 null 首签引批准 CHG-20261114-07；SERIES_IDS 终值 = gt001_v3 27 列同集（**Q10 定案零新信号**——emit 核对，不预断列序差异） |
| 7 | 容差 tier（**Q9 定案**） | **T-B + 降 T-C 双向预案**（同法 RK4 三维、独立双实现——ALINE §3 T-B 定义行；GTL1/FLTH/FLCAP/FC 五轮同制）：gate 块键面预案 = **gt001_v3 gate 全键面镜像**（f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_rtol/P_kW_atol/E_kWh/SOC_pp/r_true_kW/t_s——gt001_l1_oracle TOLERANCES :748-762 实读），量级预案非终值，终值按双实现实测散差 × 安全系数 ≥10 冻结（半步长证据 §3.3（六）：f 1e-4 预案距 1.090e-6 为 92x、T 1e-2 距 4.660e-4 为 21x——预案量级健康）；**gate 键面缺口（Q10 零新信号定案后）**：序列面 27 列与 v3 同集 ⇒ T-B 分派路由（verify_golden.py:45-53 注记：_A/_Hz/_rpm/_K/_kPa/r_true/r_meas/_kW/_kWh/SOC/_pct/兜底序）全既有支**零缺口**；散差超预案 → T-C + convergence 块必附（双向预案——未触发预期） |
| 8 | verify_golden | **Q7 定案 = (a) 新条目形态（FL/FC/FLCAP 先例）**：新增 `import gt001_comb_oracle` + `MODELS["gt001_comb"]` 注册行（golden_file="gt001_v4.json"、i_true=f_true_Hz / i_meas=n_meas_rpm、scalars 面按 gt001_v3 键面镜像注册）+ **DEFAULT_MODELS 尾追加 "gt001_comb"**（verify_golden.py:246 现值 ["fl001","fl001_l1","fc001_l1","fl001_cap"] 实读——步① 无参调用五 golden 顺序验证；步① label 滞后说明沿 V120 DEC-5/V140 先例维持登记不修）；**MODELS["gt001"] 重指向块（:182-198——B-3(i) 勘正现值）维持验 v3 零改动**（四代链下每代保留直验面；GTL1 重指向先例并列登记为历史形态——本轮不采 (b) 重指向）；A5 §3.3 :194「默认步验 v3 维持 vs 重指向 v4 归 G2b/实现轮 CHG，不静默」的 (a) 侧由本定案闭合 |
| 9 | 预期失效面 | 新增 `data/golden/gt001_v4.json`(+`.sha256`)；**既有 11 golden 字节零变更**；engine-gt.test.js 深化轨变体**并入现有步**（**run-g2 步 21——B-3(ii) 勘正（草案「步 22」与 §9 R-10「步 21」矛盾，实值 21：tools/run-g2.mjs:120 步 id「V3-33 engine-gt.test.js」为 STEPS 第 21 项）**；GTL1-IMP-Q1「并入现有步」:557 先例）；registry.test.js 哈希面既有断言零变化 + additive 新断言；FAULT_CATALOG §1 注记行；UI 层级徽章变体；**步数账 0 新步预期**（run-g2 35 维持——深化轨变体并入步 21 engine-gt + verify 并入步①/步③ 随 Q7；归实现轮 CHG 申报，I-7） |
| 10 | 两门禁面（FLTH B-2 / FC §4 项 10 同构——**形态 a 定案分支 + B-4 措辞订正**） | ① **engine↔gt001_v4 T-B 比对面** = verify_golden gt001_comb 全轨（载体 = Q7 定案新条目）+ engine-gt.test.js（步 21）深化轨变体关键值断言；② **深化轨验收锚点路由**（原草案「P0 验收路由」措辞订正——**B-4：GT 无 approved_p0 面**（scope.js:14-56 APPROVED 白名单仅 FL-001、GT 分支不存在，GT Run 全走 extension_preview；「P0 路由」为门禁语义复用、非 scope 白名单面））：**inertia_model 单值四元映射（linear→gt001_v1 / swing→gt001_v2 / thermo→gt001_v3 / thermo_comb→gt001_v4）** + acceptance.keyValues 按 cfg 分域（FLTH A-3② / systems.js:420-435 FL 分域先例同构——thermo 域 keyValues 现值 = gt001_v3 专用冻结锚点原样零变化，thermo_comb 域 keyValues 由 gt001_v4 golden 承载、acceptance 面按 cfg 分域为 GTCMB-G2b-04 工作面）；**gt001_v4 emit verify 通过前深化轨不进验收路径（不静默）**；深化轨 Run 轨区分天然承载（B-2——inertia_model 在 config_hash 投影内 schema.js:144，thermo_comb Run config_hash/run_hash 为新值、与 thermo 轨无碰撞面） |

## 5. 排期（GTCMB-G2b-01…04；两波节奏——批准 2026-11-14 已闭合、实现 v1.6.0 波）

1. **GTCMB-G2b-01（草案，已完成）**：V150 波阶段一 W1（2026-11-14，CHG-20261114-04 授权）——
   本文件 v0.1；
2. **GTCMB-G2b-02（双路独立评审 + 用户书面批准，已完成——本版 v1.0）**：W2a 评审 A（物理/
   数值）+ W2b 评审 B（治理/口径）——互不可见，V150 W2a/W2b（2026-11-14），结论回填 §10
   （W4 代录）；**用户书面批准（2026-11-14「下一步」指令链，CHG-20261114-07 登记——GTL1-G2b-02
   先例）**：键形态裁定（形态 a）+ Q1…Q13 定案（Q12 否决草案推荐）+ 11 条件全按推荐落正文 +
   τ_comb = 0.5 s / EQ-GTL2 冻结文本定案（域扫描证据 §3.3）+ 规格更名 APPROVED（git mv）；
3. **GTCMB-G2b-03/04（实现，v1.6.0 波——随用户逐版本指令派发）**：03 = gt001_comb_oracle.py
   编写（§4 项 2）+ gt001_v4 emit（Run 集 Q8、schema v2、approval 首签、sidecar LF 钉死）+
   GCMB-1…9 自检（含 GCMB-9 gap 新界）+ verify_golden 注册面（Q7 定案——新条目 + DEFAULT_MODELS
   尾追加）+ gate 键面复算冻结（×≥10）+ **|Δf| ≤ 1 Hz 与 T3/T4 包络全量重扫 emit 硬条件复算**
   （§3.2/§3.3）+ FAULT_CATALOG §1 注记；04 = engine 深化轨分支（三分派前插一行）+
   systems.js（声明面 additive 子对象 + 变体文案；**零新信号——无 onTrackOnly 面**）+
   scenario 键面（INERTIA_MODELS 枚举扩值 + **三处守卫 additive 编辑**（B-1——scenario.js:401-402
   消息串 / engine.js:320-324 / schema.js:231-234；或一次性改引常量的等价重构、显式登记））+
   validate 守卫 + 两门禁面（§4 项 10 定案形态）+ acceptance.keyValues 分域 + UI（层级徽章/
   模型抽屉/跨深度对比卡三轨扩四轨）+ causalTemplates 深化轨扩展（GTL1 §8 :493 先例）+ tests
   engine-gt 深化轨变体（并入现有步 21）+ thermo/linear/swing 轨恒等验收（run_hash 快照——
   §3.1 项 3）+ copy-guard 终检 + 步数账 CHG 申报；
4. **实现严格串行声明（重申）**：P1 FC（v1.2.0）→ P2 FL（v1.4.0）→ **P3 GT 实现（v1.6.0 波）**
   ——实现不得早于本批准轮且不与 P1/P2 收尾面并发（V150 §0 原文维持）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | RK4 三维 stdlib 自写；oracle stdlib（python -I）；无 TESPy 类对照轨需求（稳态面沿 GTL1 §5 旁证轨与 TESPY_CORNER_EXTENSION_ASSESSMENT 现状——本轨零新增对照需求，稳态不变性由 GCMB-3 断言 + §3.3（五）核验承载）；批准轮扫描脚本 stdlib-only 已按同纪律执行 |
| I-2 | 数据诚实性 | 2→3 维 ODE 诚实区分（x_comb 新动态状态、其余代数——§1.2）；τ_comb = 0.5 s 教学整定值非实测 + 整定证据为域扫描实测（§3.3——零编造，三候选全扫描 + 边界敏感性登记）；稳态不变性为结构推论 + 数值核验双承载（§3.2/§3.3（五））；「GT 无 SOC 定义面」显式登记防先例错配（§1.2）；被排除形态硬伤显式登记（§0 ③）；gap 界/容差全部实测冻结制（GCMB-9/§3.3（六）） |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / 既有 oracle）+ golden 只读生成 + thermo/linear/swing 轨恒等硬条件三层佐证（§3.1）+ |Δf| 域/T3/T4 包络全量重扫 emit 硬条件（§3.2——批准轮预扫已过，emit 复算冻结）+ GCMB-8/9 角点断言内嵌（GL-8 A-2 先例同款）+ 环境校验 5/5 前置（§3.3 执行口径） |
| I-4 | 批准纪律 | 本批准不定实现；实现 v1.6.0 波（用户逐版本指令派发）；两门禁面维持（§4 项 10）：gt001_v4 emit verify 通过前深化轨不进验收路径；批准 = CHG-20261114-07 指令链（GTL1-G2b-02 先例） |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4——禁「更准确/更真实/工业级」）；定位句带「非机组/电网动态验证」；τ_comb/滞后叙事全部带「教学整定/教学观察面」限定语（§1.5/§6.3 预检表） |

### 6.2 键面张力三形态对照（引 §1.1——定案后留档）

三形态八维对照表（§1.1）已实读登记：形态 c = **breaking 排除**（A5 §3.2 :182-184 硬伤
原文——emit 过的轨语义不得原地变更 + thermo 为默认轨）；形态 a/b 均零涉 gt001_v3 冻结面、
均为 additive 合法通道——判别维度为语义耦合度（同链深化 vs 正交轴）、组合拒绝成本
（单键天然排除 vs 规则新写）、涟漪面（枚举 +1 值 + 三处守卫 additive vs 新键六件套含盖章
双落点）、golden 路由面（单值映射 vs 二元分派表）、**config_hash 轨区分面（B-2 定案——
形态 a 天然区分、形态 b 引入 B-3a 局限 + healthy 局碰撞面）**。**v1.0 定案 = 形态 a**
（CHG-20261114-07——五条理由 §1.1）；FLCAP §6.3 翻转先例公允性确认（§1.1 定案标注）；
对照表保留备查（R-1 定案纪律：实现轮不再重开——FCAP §6.3 同款）。

### 6.3 copy-guard 预查（39 模式 / ALLOW 14；「延迟」「燃烧」逐串预检；实现期 `node tools/copy-guard.mjs` 终检；体例沿 GTL1 §6.3 / FC §6.3 / FLCAP §6.4）

| 提案串（迁入 src/** 候选） | 高危子串核查 | 结论 |
|---|---|---|
| 深化轨层级标签「L1 · 燃烧动态延迟模型（数值仿真级）」 | 含「燃烧」「延迟」——BANNED 39 中延迟族仅「诊断延迟」命中型：本串无「诊断」前缀，非子串命中；无「已验证/实测/校准/工业级」 | 0 命中预期 |
| A-gtcomb-lag「τ_comb = 0.5 s 为教学整定值（非实测参数）」 | 「非实测」为 ALLOW 串（先剔 ALLOW 再匹配——copy-guard 次序纪律） | 0 命中预期 |
| A-gtcomb-lag「燃烧/能量转换延迟为一阶滞后环节」「有意取异值（同量级对照设计）」 | 「燃烧」「延迟」「滞后」均不在 39 禁词族（孤岛/保护/检测/量测/验证/损失/认证/诊断类族实读——tools/copy-guard.mjs BANNED 数组）；无肯定性验证表述组合（I-5 ③ 句式纪律） | 0 命中预期 |
| summary「EGT 呈滞后-超调第二时间尺度（教学观察面）」 | 无禁词子串；「教学观察面」限定语承载 | 0 命中预期 |
| 定位句「教学尺度燃烧-热降阶链示意（L1 深化轨），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串（copy-guard ALLOW 首条——先剔后匹） | 0 命中预期 |
| 稳态叙事「延迟环节不改变稳态值、只改变暂态路径（模型内部结构项）」 | 无禁词子串；刻意不用「能量损失」族（本轨无损耗叙事面——如需否定式沿「不是能量损失」ALLOW 串句式） | 0 命中预期 |
| 跨深度对比卡「模型深度导致的表达力差异」 | ALINE §6.4 固定句式 | 0 命中预期 |
| A-gtcomb-l1「不是经过验证的设备控制器或机组燃烧系统模型」 | 「经过验证」不含禁词「已验证」子串（FLEXT §1.2 F5 先例句式——实现轮 copy-guard 终检承载判定） | 0 命中预期 |

（本稿在 FaultLab-evaluation/** 不扫描；批准轮基线实跑 copy-guard PASS（39 模式 0 命中）；
实现轮文案迁入 src/** 前逐句预检 + copy-guard 终检双保险。「实测」一词在提案串内一律以
「oracle 复算/域扫描复算」替代（GT001 §12.4「实测→oracle 复算」2 处先例同款）。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 本规格状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：GT001 G2b 已关闭（GT001_G2B_SPEC_APPROVED，CHG-20261030-06）+ GTL1-G2b-01…04 全闭合 + GTL1 §3.3.1 域扫描冻结已兑现（A5 §3.4 ① 观察窗条件满足——头部实读确认含 A-6 波次归属核实）；本轨触发项 = A5 §3 提案 + V150 §1 DEC-1（v0.1 草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：§4 gt001_v4 / gt001_comb_oracle（Q5 定案）/ 6 Run（Q8 定案）/ schema v2 / T-B（Q9 定案）。**golden 后置系 V150 §0「草案波只到草案+双路评审」授权的字面偏离显式登记**（GTL1 §7.1 ② / FLCAP §7 ② / FC §7 ② 同款句式）；emit = GTCMB-G2b-03（v1.6.0 波），落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（定案冻结）**：§1.5 assumptions 3 条 + limitations 追加 3 项 + §6.3 预检表（实现轮迁入 src/** + 终检） |
| ④ | 用户书面批准 | **已闭合（2026-11-14）**：用户「下一步」指令链 = 书面批准记录（CHG-20261114-07 登记——GTL1-G2b-02 先例；键形态裁定 + Q12 否决 + 条件全按推荐处置 + τ_comb/EQ-GTL2/锚点数值定案授权） |
| ⑤ | CHG 登记 | 起草授权 **CHG-20261114-04**（V150_WAVE_DESIGN §1 DEC-1，2026-11-14）+ **批准 CHG-20261114-07**（2026-11-14 指令链）均已登记；实现 CHG 待（v1.6.0 波登记） |

## 8. 工作面分解（GTCMB-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| GTCMB-G2b-01 | 键面三形态对照（§1.1）/ 状态向量 2→3 维与 EQ-GTL2 提案集草案级结构（§1.2/§1.3）/ 参数面框架（零编造）/ 涟漪登记（§2）/ 锚点结构与稳态不变性预填（§3）/ golden 计划（§4）/ 两门禁面 / 草案 v0.1 | M | **已完成**（V150 W1，2026-11-14，CHG-20261114-04） |
| GTCMB-G2b-02 | 双路独立评审（互不可见——V150 §2 串行纪律）+ 用户书面批准（CHG-20261114-07 指令链）+ 批准 CHG + **11 条件全按推荐落正文（A-1…A-6/B-1…B-5——§10.2 处置表）** + 键形态定案（形态 a 枚举扩值）+ Q1…Q13 定案（Q12 否决草案推荐）+ **τ_comb = 0.5 s / EQ-GTL2-1…12 冻结文本定案（域扫描证据节 §3.3——仓库外临时脚本 python -I、用后删除）** + 更名 APPROVED（git mv） | M | **已完成**（本版 v1.0，2026-11-14，V160 W1） |
| GTCMB-G2b-03 | gt001_comb_oracle.py 编写（Q5 命名定案；oracle_base 出生接入 + 三维 RK4 + GCMB-1…9 自检（**GCMB-9 gap 新界 5e-4/4e-3——A-4**）+ T-B 容差实测冻结/降 T-C 预案 + **|Δf|≤1 Hz 与 T3/T4 包络全量重扫 emit 硬条件复算（§3.2/§3.3）**）+ gt001_v4 emit（Run 集 Q8、schema v2、approval 首签、sidecar LF 钉死）+ verify_golden 注册面（**Q7 定案——MODELS["gt001_comb"] 新条目 + DEFAULT_MODELS 尾追加 "gt001_comb"**）+ gate 键面复算冻结 + FAULT_CATALOG §1 注记行 | L | v1.6.0 波（待派发，依赖 02——已满足） |
| GTCMB-G2b-04 | 实现：engine 深化轨分支（三分派前插一行——形态 a）+ systems.js（声明面 additive 子对象 + level/summary 变体；零新信号无 onTrackOnly 面）+ scenario 键面（INERTIA_MODELS 枚举扩值 "thermo_comb" + **三处守卫 additive 编辑（B-1 定案：scenario.js:401-402 消息串 / engine.js:320-324 条件+消息串 / schema.js:231-234 条件+消息串——或一次性改引常量的等价重构、显式登记）**）+ validate 守卫 additive + 两门禁面（§4 项 10 定案形态——**含 B-4 验收锚点路由措辞**）+ acceptance.keyValues 分域 + UI（层级徽章/模型抽屉/跨深度对比卡三轨扩四轨）+ causalTemplates 深化轨扩展（GTL1 §8 :493 先例）+ tests engine-gt 深化轨变体（并入现有步 21）+ thermo/linear/swing 三轨恒等验收（run_hash 快照——§3.1 项 3）+ copy-guard 终检 + 步数账 CHG 申报（0 新步预期——I-7） | L | v1.6.0 波（待派发，依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 键形态裁定摇摆导致实现面返工 | **已定案（形态 a——§1.1 v1.0 定案标注）**：实现轮不再重开（FCAP §6.3 定案纪律同款）；对照表保留备查 |
| R-2 | τ_comb 整定失当（同值不可辨识 / 异值过大失真或越域） | **已定案（0.5 s——§1.3/§3.3）**：七项判据逐项实测承载 + 边界敏感性登记（τ ≥ 0.7 s 越界未采）+ GCMB-5/9 锚点复算兜底 |
| R-3 | 四代 golden 链管理成本（v4→v3→v2→v1 supersedes 链 + 三轨并存 + 第四轨）——verify 路由歧义 | §4 项 8 Q7 定案（新条目 + DEFAULT_MODELS 尾追加，每代保留直验面）+ 两门禁面单值四元映射（形态 a）可枚举 + engine-gt 比对面 additive 扩展 + A5 §3.3 :194「不静默」预登记承接 |
| R-4 | gt001_v1/v2/v3 或 gt001_l1_oracle.py 字节被实现轮误触（V-03 哈希失配 → 冻结锚点报废） | §0 不动清单 ①② + GTCMB-G2b-03/04 工作面不含既有文件 + §3.1 项 3 零变化机制承载 + 全量回归兜底 |
| R-5 | T-B 三维 RK4 双实现散差超预案（三维耦合 + 延迟环节相位敏感） | 容差按双实现实测散差 × ≥10 冻结 + 超限降 T-C + convergence 块（双向预案——GTL1 §4 项 6 同款）+ 禁 ULP 级承诺（A-2 措辞一致化——跨实现口径「±1e-9 内逐点恒定」或实测冻结容差） |
| R-6 | gate 键面缺口 | **已归零（Q10 定案零新信号）**：序列面 27 列与 v3 同集 ⇒ T-B 分派路由全既有支零缺口（§4 项 7）；若实现轮实读发现列序/量纲差异 → 新增 T-B 分派分支 = 显式硬项（FC `_V` 分支先例，不静默） |
| R-7 | 稳态不变性被误读为「深化轨无教学增量」 | §3.2 三点稳态不变 = 结构推论 + 数值核验 + 暂态滞后-超调为深化轨独有教学面（§3.3（四）量化：+5 采样 / +4.4 K / 过冲 +2.8%）+ A-gtcomb-steady assumption 显式声明 |
| R-8 | 默认轨歧义（深化轨是否翻转默认） | **已定案不翻转**（thermo 维持——A5 §3.2 :179 原文；§1.1 定案标注；Arena 盲包语义零变化） |
| R-9 | scenario 键面/盲包指纹语义漂移 | 形态 a 既有场景解析零变化（§1.1 哈希行）+ 默认轨不动 ⇒ 盲包语义零变化 + 零新信号 + 显式 CHG 登记（v1.6.0 实现 CHG） |
| R-10 | 步数账超支（I-7） | 0 新步预期（变体并入**步 21** engine-gt——B-3(ii) 勘正后统一口径 + verify 载体随 Q7 并入步①/步③）+ GTCMB-G2b-04 归口 CHG 显式申报 |
| R-11 | 教学参数被误读为设备参数辨识 | A-gtcomb-lag 非实测声明（τ_comb = 0.5 s 教学整定）+ §1.3 整定依据 + I-5 自查（FLTH R-11 同款） |
| R-12 | 深化轨 |Δf| ≤ 1 Hz 角点裕度收窄（2.0e-3 → 3.60e-4 Hz——§3.3）被未来参数漂移侵蚀 | GCMB-8 角点断言 min f > 49.0 emit 硬条件内嵌（越界即 emit 拒绝写盘——GTL1 A-2 纪律同款）+ GCMB-9 角点收敛 gap 上界 4e-3 双保险 + 边界敏感性登记（§1.3——τ 候选域上界 0.6 s 的成因留档） |

## 10. 评审记录（W4 代录——2026-11-14，V150 §2 阶段三；**批准轮收口 2026-11-14（CHG-20261114-07）——本节 10.2 为「条件 → 处置 → 落点」处置追记**；评审报告全文随波次记录归档（2026-11-14 W2a/W2b））

### 10.1 评审结论（双路独立评审，互不可见——V150 §2 串行纪律）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-GTL2 提案集自洽与量纲、三维 RK4 分区更新序、τ_comb 整定域与形态区分、稳态不变性推论核验、锚点复算、L1 判据对照 | **PASS_WITH_CONDITIONS(6)**（1 P1 + 3 P2 + 2 P3） | **稳态不变性/量纲/RK4 三维分区更新序独立重推全部通过**。1 P1（A-1）：§3.2/§3.3 须按 GTL1 A-3 口径体例**逐锚点登记「渐近稳态 vs t=60 采样」两口径**；3 P2（A-2/A-3/A-4）：「逐位同」措辞一致化 / τ_comb 判据框架五→七项 / GCMB 增 GL-6 同构 gap 检查；2 P3（A-5/A-6）：engine.js:320-322 字面三值守卫勘正 / gt001_v3 波次归属未核实。逐条处置见 §10.2 |
| 评审人 B（治理/口径/回归面） | 五项进入条件、键形态对照表复核（§1.1/§6.2）、哈希先例套用核对（B-1a/子对象/onTrackOnly/B-3a 形态随 Q1）、golden 治理与四代链（Q7 路由）、不动清单、步数账、copy-guard、预期失效面 | **PASS_WITH_CONDITIONS(5)**（2 P2 + 3 P3） | **八面声明/先例对照公允性/步数账/体例全部属实**。2 P2（B-1/B-2）：三处字面守卫须 additive 编辑（engine.js:320-324/schema.js:231-234/scenario.js:401-402）「自动覆盖」表述订正 / config_hash 投影行失实订正（inertia_model 现状在投影内 schema.js:144——修正后**强化形态 a**；B-3a 局限只适用形态 b 且 healthy 局 run_hash 跨轨同值碰撞须补登）；3 P3（B-3/B-4/B-5）：行号精度五处 / 「P0 验收路由」措辞失配（GT 无 approved_p0 面）/ sensor 采样锚点逐点点名补登记。逐条处置见 §10.2 |
| 用户批准 | 键形态裁定 + Q1…Q13 定案（含 Q12 否决草案推荐）+ τ_comb = 0.5 s / EQ-GTL2 冻结文本 / 锚点数值定案（域扫描证据）+ 批准与实现排期 | **已批准（2026-11-14，CHG-20261114-07 指令链）** | 用户 2026-11-14「下一步」指令链（V160_WAVE_DESIGN DEC 全采推荐项——GTL1-G2b-02 先例：用户指令链即书面批准记录）：**键形态 = 形态 a 枚举扩值 "thermo_comb"**（GTL1 §2.4 三值枚举先例 + B-2 修正后 config_hash 轨区分面强化——四元 golden 映射；被排除形态维持排除；FLCAP 翻转先例对照公允性确认）；**Q12 否决草案推荐**（model_version 维持 '1.2.0' 仅登记——model_version 在 model_hash 九字段内 engine.js:559-569 实读，SystemDef 升位即既有 GT 输入 run_hash 变化 = V1_FACES §3.2 breaking；golden v4 语义由 golden_id 承载，FC Q1=B/FL 同构）；其余 Q1…Q11/Q13 全采草案推荐；11 条件全按推荐处置（§10.2）；τ_comb = 0.5 s 定案（域扫描证据 §3.3）；实现 GTCMB-G2b-03/04 入 v1.6.0 波（V06_ROADMAP §3 v1.6.0 行预登记一致）随用户逐版本指令派发 |

### 10.2 条件处置追记（A-1…A-6 / B-1…B-5 共 11 项——条件 → 处置（**全按推荐，批准轮完成**）→ 落点；
     体例沿 FC §10.2 / FLCAP §10.2 / MG §10.2。评审报告全文随波次记录归档（2026-11-14 W2a/W2b））

**评审人 A（A-1…A-6）**：

| # | 级别 | 条件内容（一句） | 处置（全按推荐，批准轮完成） | 落点 |
|---|---|---|---|---|
| A-1 | **P1** | §3.2/§3.3 须按 GTL1 A-3 口径体例**逐锚点登记「渐近稳态 vs t=60 采样」两口径**——v4 全部 t=60 采样锚点（sensor f/T3/T4/cmd、load f60/T3_60、actuator Pgen/f60）将随暂态路径变化偏离 v3 冻结值（18.266/1044.16 等在 golden 中是采样值非稳态值） | **采推荐落正文**：§3.2 故障 Run 行改两口径表述 + §3.3 新增（三）逐锚点两口径表（15 行——healthy/monitor 恒等行 + sensor 四锚点点名 + load 四锚点 + actuator 四锚点 + clear 三锚点；渐近稳态列两轨同、采样列 v3 冻结 vs v4 域扫描并列）；「actuator 钳位稳态 18.266 类锚点不变」改注「**渐近稳态不变（t=60 采样值随暂态路径变、由 v4 emit 重冻结）**」——并如实登记该 Run 采样差实测 <1e-8（t=60 前已收敛） | **§3.2 行 4 / §3.3（三）** |
| A-2 | P2 | 「逐位同」措辞与 T-B 制度一致化——单实现结构恒等（dx_comb/dt≡0 健康局）可逐位；跨实现（新 oracle↔gt001_l1_oracle、engine↔oracle）按 GTL1 A-1 句式改「±1e-9 内逐点恒定」或显式声明「同运算序复刻」限定（与 §4 项 3「禁 ULP 级承诺」对齐） | **采推荐落正文**：全文「逐位同」句逐处改口径——健康局/monitor = 「同实现逐位恒等（同运算序复刻——实测 0.0）、跨实现 ±1e-9 内逐点恒定」；§3.1 项 3 关键句式改写；GCMB-1 判据同口径；§4 项 3 补「跨实现口径一律 ±1e-9 或实测冻结容差」 | **§1.2 初值段 / §1.3 初值行 / §3.1 项 3 / §3.2 行 3 / §4 项 3/4（GCMB-1）/ §9 R-5** |
| A-3 | P2 | τ_comb 判据框架五→七项——+① 3D 闭环稳定性/窗内收敛判据（sensor_drift mag=1.0 角点无持续振荡且收敛 gap ≤ 重推上界）；+② 输出网格可辨性下限（相位滞后 ≥ 数个 dt=0.1 采样），域扫描同步输出判据②量化证据 | **采推荐落正文**：§1.3 整定依据五项扩为七项（③ 可辨性下限 = 新②、⑦ 闭环稳定性/收敛 = 新⑦——域扫描同步输出：滞后 +5 采样 / 尾段幅度严格递减零振荡 / gap 3.601e-4 ≤ 4e-3） | **§1.3 七项判据 / §3.3（一）（四）/ §10.1 A 行** |
| A-4 | P2 | GCMB 预案增 GL-6 同构 gap 检查（f(60) vs 50−b，**界随 τ_comb 域扫描重推、不沿用 5e-3**） | **采推荐落正文**：GCMB 预案 8 项扩 9 项——新增 GCMB-9：mag=0.3 gap ≤ **5e-4 Hz**（实测 4.80e-5 ×10.4）+ mag=1.0 角点收敛 gap ≤ **4e-3 Hz**（实测 3.601e-4 ×11.1）；thermo 界 5e-3 不沿用（重推登记） | **§4 项 4（GCMB-9）/ §3.3（一）判据⑥ / §8 GTCMB-G2b-03** |
| A-5 | P3 | §1.1「枚举守卫…（engine.js:320-322）自动覆盖」勘正——该守卫为字面三值硬编码须 additive 编辑（scenario.js:401 引用常量确为自动）；与「validate 消息串 additive」行一致化 | **采推荐落正文**：§1.1 守卫面改写——engine.js:320-324 条件与消息串均字面（additive）、scenario.js:401-402 条件常量引用（自动）/消息串字面（additive）；与 B-1 合并三处守卫一致化 | **§1.1 形态 a 行守卫面 / §2 scenario 键面行** |
| A-6 | P3 | 头部「gt001_v3 于 v0.8.0 emit 在验」波次归属未核实——批准轮核对或改不含版本号表述 | **采推荐核实更正**：git 实读核实——gt001_v3 于 **v0.7.1（CHG-20261104-13）首签 emit**（commit 4963e6a「gt001_v3 golden 6-run thermo first-signed」）；v0.8.0 仅 r_true/r_meas 重排散差 0.0 复证——头部归属勘正为 v0.7.1 | **头部前置条件段（A-6 定案注记）** |

**评审人 B（B-1…B-5）**：

| # | 级别 | 条件内容（一句） | 处置（全按推荐，批准轮完成） | 落点 |
|---|---|---|---|---|
| B-1 | P2 | §1.1 形态 a 哈希行改写——「场景解析/哈希路径自动（INERTIA_MODELS 扩值）+ engine.js/schema.js/scenario.js **三处守卫条件与消息串 additive**（或一次性改引常量的等价重构，显式登记）+ 三分派前插一行」；理由②涟漪清单、§8 GTCMB-G2b-04 同步扩为三处守卫面（含 schema.js:231-234 第三处守卫——草案未登记） | **采推荐落正文**：§1.1 守卫面三处 additive 登记落定（含 schema.js:231-234 补登）；§1.1 理由②涟漪清单更新；§2 scenario 键面行同步；§8 GTCMB-G2b-04 工作面点名三处守卫 additive 编辑 | **§1.1（行 + 理由②）/ §2 / §8 GTCMB-G2b-04** |
| B-2 | P2 | §2 config_hash 投影行失实订正——inertia_model **现状在投影内**（schema.js:144）⇒ 形态 a 深化轨 config_hash/run_hash 经投影轨值**天然区分**（含 healthy/monitor——run_hash 仍为新值）；「轨区分由 run_hash 承载」的 B-3a 局限登记**只适用形态 b**（healthy 局 run_hash 跨轨同值碰撞须补登）；§1.1 对照表增「config_hash 轨区分面」行；§4 项 10 随形态分支修订 | **采推荐落正文**：§2 config_hash 投影行全文订正（失实勘正 + 天然区分结论 + B-3a 收窄为被排除形态历史评估）；§1.1 对照表新增「config_hash 轨区分面」维度行（定案理由⑤）；§4 项 10 补轨区分承载句 | **§2 config_hash 行 / §1.1 新维度行 + 理由⑤ / §4 项 10②** |
| B-3 | P3 | 行号/引用精度五处——(i) MODELS["gt001"] 重指向块现值 :182-198；(ii) engine-gt = run-g2 步 21（§4 项 9「步 22」与 §9 R-10「步 21」矛盾，实值 21）；(iii) causalTemplates 扩展先例在 GTL1 §8 GTL1-G2b-04（:493）非 §4 项 8 :378；(iv) V1_FACES「新键只影响使用它的输入」原文现值 :197-198；(v) 形态 b 六件套补盖章双落点 | **采推荐逐处勘正**：(i) §4 项 8 改 :182-198；(ii) §4 项 9/§9 R-10 统一步 21（run-g2.mjs 实读 STEPS 第 21 项）；(iii) §1.4 因果模板行改引 GTL1 §8 :493；(iv) §1.1 face③ 引用改 :197-198；(v) §1.1 形态 b 行六件套补 normalizeConfig 盖章行 + defaultConfig 双落点（FC B-7 先例同构） | **§4 项 8/9 / §9 R-10 / §1.4 / §1.1 face③ 与形态 b 行** |
| B-4 | P3 | §4 项 10②「深化轨 P0 验收路由」措辞失配——GT 无 approved_p0 面（scope.js :14-56 无 GT 分支、全走 extension_preview）；改「**深化轨验收锚点路由**（gt001_v4 golden 承载 + acceptance.keyValues 按 cfg 分域）」或注明「P0 路由」为门禁语义复用、非 scope 白名单面 | **采推荐落正文（采改名方案）**：§4 项 10② 改「深化轨验收锚点路由」+ scope.js:14-56 实读注记（GT 无 approved_p0 面、「P0 路由」为门禁语义复用非 scope 白名单面）+ acceptance.keyValues 按 cfg 分域（FL :420-435 先例同构）；§2 面⑥ 行同步 | **§4 项 10② / §2 契约面行** |
| B-5 | P3 | §3.3 sensor_drift 行 t=60 采样类锚点失效逐点点名补登记（定量随 A-1 体例） | **采推荐落正文**：§3.3（三）表 sensor Run 四锚点逐点点名（f(60)/u_cmd(60)/T3(60)/T4(60)——v3 冻结 vs v4 域扫描并列定量），与 A-1 同轮落 | **§3.3（三）** |

## 11. Q 点定案记录（**Q1…Q13 已定案（2026-11-14，CHG-20261114-07）——Q1…Q11/Q13 采草案推荐项、Q12 否决草案推荐**；候选与理由保留；体例沿 MG001 §11 / FC §11 / FLCAP §11 定案记录形态）

| # | 问题 | 候选 | **定案（CHG-20261114-07）+ 一句话理由** |
|---|---|---|---|
| Q1 | **键形态（核心裁定点）** | (a) inertia_model 枚举扩值；(b) 正交二键 combustion_model（前置 thermo）；(c) thermo 原地深化 | **定案 (a)**——燃烧延迟为 thermo 同链深化非正交轴，单键枚举天然排除非法组合（GTL1 Q2 理由 2 延续）、涟漪最小、golden 单值映射、**B-2 修正后 config_hash 轨区分面天然强化（schema.js:144——新增判别维单向有利 (a)）**；FL 组合键先例的成立前提（正交组合需求）GT 侧不存在（公允性确认 §1.1） |
| Q2 | 枚举新值命名（形态 a） | (a) "thermo_comb"（A5 §3.2 原文示例）；(b) "thermo_combustion"；(c) 形态 b 下 combustion_model: off\|on | **定案 (a) "thermo_comb"**——A5 原文示例 + ASCII 安全 + thermo 前缀承袭「模型深度轨」语义 + comb 后缀物理面直指；键名在形态 a 下 = 复用 inertia_model 不新增（键形态与命名两裁定分离——FLCAP Q1 先例句式） |
| Q3 | τ_comb 延迟形态 | (a) 一阶滞后 + 新 ODE 状态 x_comb；(b) 纯传输延迟（无新状态）；(c) 二阶/高阶 | **定案 (a)**——A5 §3.1 原文形态（「一阶燃料-能量传递滞后，τ_comb·dQ_f,d/dt + Q_f,d = Q_f」+「2→3 维 ODE」结构自洽；(b) 与 A5 状态向量原文直接冲突；教学点（第二动态时间尺度）由一阶滞后指数趋近承载（§3.3（四）+5 采样实测） |
| Q4 | 方程 id 编号策略 | (a) EQ-GTL2-1…n 全集自含（新轨唯一权威文本单文件自含）；(b) 续编 EQ-GTL1-13…n（跨文件权威分裂） | **定案 (a)**——新轨域新 id 集 + oracle 硬编码唯一权威文本自含（不产生 GTL1+本规格双文件权威分裂）；对应关系（EQ-GTL2-x ≡ EQ-GTL1-y 修订/原样）在 §1.3 冻结表说明列显式登记 |
| Q5 | oracle 文件命名 | (a) gt001_comb_oracle.py（物理面命名）；(b) gt001_l2_oracle.py（深度序命名） | **定案 (a)**——FL Q4 定案理由直接适用（同系统第二深化轨、gt001_l2 易与 gt001_l1/gt001_l1_oracle 混淆；物理面直接命名 + MODELS 键镜像 gt001_comb） |
| Q6 | oracle 自检段名 | (a) GCMB-1…n；(b) GTC-1…n；(c) GL-9… 续编 | **定案 (a)**——与 Q5 命名同源（comb 缩写一致）；GL-x 为 gt001_l1_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面（FLCAP Q5 / FC Q8 同款理由——(c) 不推荐） |
| Q7 | verify_golden 路由（注册行 + DEFAULT_MODELS） | (a) 新条目 MODELS["gt001_comb"] + DEFAULT_MODELS 尾追加（FL/FC/FLCAP 先例——:246 现值四值 ⇒ 步① 无参五 golden）；(b) gt001 条目重指向 v4（GTL1 先例再演） | **定案 (a)**——四代链下每代保留直验面 + DEFAULT_MODELS 追加机制成熟 + A5 §3.3 :194「不静默」预登记的 (a) 侧；MODELS["gt001"] 重指向块（:182-198）维持验 v3 零改动 |
| Q8 | golden Run 集 | (a) 镜像 gt001_v3 全集 6 Run 全深化轨；(b) 最小集（healthy + load_step 类 2 Run） | **定案 (a)**——新 id golden 镜像基线全集先例（GTL1 §4 项 4 / FLTH / FC Q6）+ monitor 不变量判据面（GCMB-6）+ actuator_clear 过冲教学点覆盖（§3.3（三）t_back05 +0.6 s 实测） |
| Q9 | 容差 tier | T-B（三维 RK4 双实现方法等价）；T-A（不承诺）；超限降 T-C + convergence 块 | **定案 T-B + 降 T-C 双向预案**——GTL1/FLTH/FLCAP/FC 四轮同制；gate 键面终值 emit 实测冻结（×≥10——半步长证据 §3.3（六）预案量级 92x/21x 健康） |
| Q10 | 新信号集 | (a) **零新信号**（教学面经既有 T4_out_K × P_gen_cmd_kW 相位差承载）；(b) 单列延迟燃料功率列（onTrackOnly 门控）；(c) 双列 | **定案 (a)**——最小集（GTL1 §1.2 R_int 不出信号 / FLCAP Q10 先例同构）+ 序列面/gate 键面/盲包面增量归零 + gt001_v4 与 v3 列集相同（27 列）⇒ 比对面增量集中在数值面；滞后-超调教学点经 T4（EGT）相对 P_gen_cmd 相位差直接可见（§3.3（四）+5 采样量化） |
| Q11 | x_comb 初值条件 | (a) x_comb(0) = k_f·u(0)（设计点稳态燃料功率）；(b) x_comb(0) = 0（零燃料起振） | **定案 (a)**——健康局/monitor 局与 gt001_v3 恒等的结构承载（§3.2——dx_comb/dt ≡ 0 全序列，位级机制实测 0.0；GTL1 T3(0)=T3D 设计点初值先例同构）；(b) 使健康局引入起振暂态、healthy 锚点面失真（GL-3 跨深度恒等判据破坏） |
| Q12 | golden 元数据 model_version | (a) 1.3.0 升位（GTL1 1.1.0→1.2.0 先例）；(b) 1.2.0 维持仅登记（FC Q1 定案 B 句式——golden 语义由 golden_id 承载） | **定案 (b) 维持 '1.2.0' 仅登记——否决草案推荐 (a)**：model_version 在 model_hash 具名九字段哈希域内（engine.js:559-569 hashObject 输入清单实读——model_id/**model_version**/assumptions/limitations/equations/units/claims/unit_system/equation_ids），SystemDef 升位（systems.js:980 '1.2.0'→'1.3.0'）即既有 GT 全部输入的 model_hash/run_hash 变化 = V1_FACES §3.2 breaking（八面冻结后不可复制）；golden v4 元数据 model_version='1.2.0' 同值、层级/方法语义由 golden_id=gt001_v4 + method_id=gt001_comb_rk4_dt0.01 承载（FC Q1=B / FLCAP 同构——偏离 GTL1 升位先例的理由 = GTL1 升位发生在八面冻结前（v0.7.1）、本轨在冻结后）；GT classify 不消费 modelVersion 的 (a)/(b) 成本对称性辨析不再需要——breaking 面已单向定案 |
| Q13 | EQ-GTL2-3/4 修订式精确式子项（ṁ_g 燃料项口径 + E_fuel 口径 + EQ-GTL1-12 重推） | ṁ_g 燃料项：(i) Q_f,d/LHV 延迟同源；(ii) Q_f/LHV 即时维持；E_fuel：(i) 指令面 ∫Q_f dt 维持；(ii) 交付面 ∫Q_f,d dt；重推：EQ-GTL1-12 检查式新轨形态 | **定案 ṁ_g 采 (i) 延迟同源 + E_fuel 采 (i) 指令面维持 + 重推 = EQ-GTL2-12**——物理一致性（燃气质量与能量同源于实际入燃烧室燃料）+ 记账面连续（E_fuel 与 gt001_v3 口径可比、Q_fuel_kW 列指令面精确同——§3.3（三）actuator 行 81.410629087 精确同实测）；三子项随 EQ-GTL2 冻结文本定案（§1.3 冻结表） |

**定案记录（2026-11-14，GTCMB-G2b-02 收口）**：Q1…Q11/Q13 按推荐项定案、**Q12 否决草案
推荐改采 (b)**（批准授权 = CHG-20261114-07 用户指令链「下一步」，GTL1-G2b-02 先例——
MG-DRAFT-Q1…Q7 / FC Q1…Q9 / FLCAP Q1…Q11 定案同款体例；**否决为先例形态首例**——批准轮
实体裁定权行使，偏离理由已登记于 Q12 行）。定案落点：Q1 → §1.1/§6.2（键形态形态 a）；
Q2 → §1.1/§2/§4 项 5/6（"thermo_comb"）；Q3 → §1.3（一阶滞后 + x_comb）；Q4 → §1.3
EQ-GTL2-1…12 冻结表；Q5 → §4 项 2；Q6 → §4 项 4；Q7 → §4 项 8；Q8 → §4 项 5；Q9 →
§4 项 7；Q10 → §1.2/§2/§4 项 6/7；Q11 → §1.3 初值行/§3.2 行 3；Q12 → §4 项 6 + §2 哈希面行
（1.2.0 维持）；Q13 → §1.3 冻结表 EQ-GTL2-3/4/12。全部定案随本版冻结；实现轮
（GTCMB-G2b-03/04）不再重开（如实现中证明不可行，停下显式 CHG——V160 §0 条款）。

---

**修订记录**：

- **v0.1（2026-11-14 初稿，A-5 P3 GT 规格起草人，V150_WAVE_DESIGN §2 阶段一 W1 /
  CHG-20261114-04 授权链）**：前置条件实读确认（gt001_v3 域扫描冻结闭合 + P1/P2 落地串行链
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

- **v1.0（2026-11-14，CHG-20261114-07，批准轮条件修订——GTCMB-G2b-02 收口，V160_WAVE_DESIGN
  §2 阶段一 W1；体例沿 FLCAP v1.0 修订记录）**：
  ① **键形态定案落正文**——形态 a 枚举扩值 "thermo_comb"（§1.1 定案标注 + 五条定案理由
  （草案四条全采 + B-2 强化论据⑤）+ FLCAP 翻转先例对照公允性确认 + 被排除形态维持排除 +
  对照表留档（§6.2）；四元 golden 映射 linear→gt001_v1/swing→gt001_v2/thermo→gt001_v3/
  thermo_comb→gt001_v4（§4 项 10②）；默认轨维持 thermo 不翻转）；
  ② **11 条件全按推荐落正文**——A-1（§3.2 行 4 + §3.3（三）逐锚点两口径表 15 行——「渐近
  稳态 vs t=60 采样」分列、actuator 钳位锚点改注渐近稳态不变/采样由 emit 重冻结、healthy/
  monitor 恒等行）；A-2（全文「逐位同」措辞与 T-B 制度一致化——同实现逐位恒等（同运算序
  复刻）/跨实现 ±1e-9 内逐点恒定：§1.2/§1.3/§3.1 项 3/§3.2 行 3/§4 项 3/4/§9 R-5）；A-3
  （§1.3 整定依据五→七项判据——闭环稳定性/窗内收敛 + 网格可辨性下限，域扫描同步输出量化
  证据）；A-4（§4 项 4 新增 GCMB-9 GL-6 同构 gap 检查——界重推 5e-4/4e-3、thermo 界 5e-3
  不沿用）；A-5（§1.1 守卫面勘正——engine.js:320-324 字面三值硬编码须 additive、
  scenario.js:401 条件常量引用自动/消息串 additive）；A-6（头部 gt001_v3 波次归属核实勘正
  ——v0.7.1（CHG-20261104-13）首签 emit，非 v0.8.0）；B-1（§1.1/§2/§8 三处守卫条件与消息串
  additive 面登记——含 schema.js:231-234 第三处守卫补登；理由②涟漪清单更新）；B-2（§2
  config_hash 投影行失实订正——inertia_model 现状在投影内 schema.js:144、形态 a 轨区分天然
  强化含 healthy/monitor、B-3a 局限收窄为被排除形态历史评估；§1.1 新增「config_hash 轨区分
  面」维度行 + 定案理由⑤；§4 项 10② 轨区分承载句）；B-3（行号/引用五处勘正——MODELS
  ["gt001"] :182-198 / engine-gt 步 21（§4 项 9 与 §9 R-10 统一）/ causalTemplates 先例改引
  GTL1 §8 :493 / V1_FACES :197-198 / 形态 b 六件套补盖章双落点）；B-4（§4 项 10② 措辞订正
  ——「深化轨验收锚点路由」+ scope.js:14-56 GT 无 approved_p0 面实读注记）；B-5（§3.3（三）
  sensor 四锚点逐点点名定量）；
  ③ **τ_comb 定案（域扫描证据）**——**τ_comb = 0.5 s**（§1.3 参数面定案 + 七项判据逐项 +
  边界敏感性登记；§3.3 批准轮域扫描证据节：执行口径（仓库外临时脚本 python -I、冻结常量只读
  导入、环境校验 5/5、用后删除）+ 20 点 × 601 点全窗扫描表（global max|Δf| = 0.999640 Hz <
  1.0 未越界、角点裕度 3.60e-4、单调无下冲形态全域维持）+ 包络重推（T3 [735.3, 1524.9] /
  T4 [486.7, 1001.2]）+ 闭环稳定性/收敛（尾段严格递减零振荡、gap 3.601e-4 ≤ 4e-3）+ GL-6
  同构 gap 重推（4.80e-5 → 界 5e-4）+ 教学可辨识性（互相关滞后 +5 采样 = +0.5 s ≈ τ_comb、
  max|ΔT4| = 4.39 K）+ **三点稳态不变性核验**（C0 残差 0.0 / C1 600 s 长轨与解析链 9 位全同 /
  C2 = GTL1 冻结角点 49.999214979 / actuator 角点 18.265509 全同）+ 数值方法证据（半步长
  1.090e-6 Hz/4.660e-4 K、x_comb 子步解析交叉 5.41e-11 kW）；
  ④ **EQ-GTL2-1…12 冻结文本**（§1.3——Q4 全集自含：τ_comb 一阶滞后式 + EQ-GTL1-4 插入位
  （η_b·Q_f 项经 Q_f,d 进入——Q13 三子项定案：ṁ_g 延迟同源/E_fuel 指令面维持/EQ-GTL2-12
  检查式重推）+ RK4 三维分区格式 + 初值 x_comb(0) = k_f·u(0)（Q11）+ 量纲闭合与 η_cycle
  瞬时列指令面口径登记）；
  ⑤ **Q1…Q13 定案**（§11 定案记录——Q1…Q11/Q13 全采草案推荐：Q1=形态 a/Q2="thermo_comb"/
  Q3=一阶滞后+新 ODE 状态/Q4=EQ-GTL2 全集自含/Q5=gt001_comb_oracle.py/Q6=GCMB-1…n/
  Q7=MODELS["gt001_comb"] 新条目 + DEFAULT_MODELS 尾追加（步① 五 golden）/Q8=镜像 6 Run/
  Q9=T-B+降 T-C/Q10=零新信号/Q11=x_comb(0)=k_f·u(0)；**Q12 否决草案推荐 = model_version
  维持 '1.2.0' 仅登记**（1.3.0 升位否决——model_version 在 model_hash 九字段内
  engine.js:559-569 实读、SystemDef 升位即既有 GT 输入 run_hash 变化 = V1_FACES §3.2
  breaking、golden v4 语义由 golden_id 承载、FC Q1=B/FL 同构——先例形态首例否决、偏离理由
  登记）；
  ⑥ **§3.1 零变化硬条件、§3.2 两口径表、§4 golden 计划定案面（Q5-Q10/Q12 全落 + GCMB-9 +
  B-3 行号勘正 + B-4 措辞 + 门禁面形态 a 分支）、§5/§7（④⑤ 闭合）/§8/§9（R-12 新增）同步**；
  ⑦ **§10 更新**（10.1 用户批准行 → 已闭合 + 10.2 升级「条件 → 处置 → 落点」11 项——处置于
  批准轮完成）；**§11 定案记录**；⑧ 头部状态 `APPROVED v1.0` + 批准记录（CHG-20261114-07，
  GTL1-G2b-02 先例）+ 前置条件实读更新（含 A-6 波次归属勘正 v0.7.1）+ 关键复核点实读更新
  （B-1/B-2/B-3/A-5 行号勘正落定——engine.js:320-324/:559-569、schema.js:144/:231-234、
  systems.js:980/:420-435/:2226、scope.js:14-56、verify_golden.py:182-198/:246、run-g2 步 21）
  + 批准轮纪律行（域扫描仓库外临时脚本已删）+ 修订记录本行 + 文尾状态行；文件由
  GT001_COMBUSTION_G2B_SPEC_DRAFT 更名 GT001_COMBUSTION_G2B_SPEC_APPROVED（git mv）；
  行号基准说明保留（批准轮时点口径，实现轮以语义锚点为准）。

**状态**：`APPROVED`（v1.0，2026-11-14，GTCMB-G2b-02 收口，CHG-20261114-07）。本批准不自动
打开验收路径——golden/代码工件按 §8 排期产出（GTCMB-G2b-03 gt001_comb_oracle + gt001_v4
emit / GTCMB-G2b-04 实现入 v1.6.0 波，V160_WAVE_DESIGN + V06_ROADMAP §3 v1.6.0 行）；v0.1
起草轮与 v1.0 批准轮均零代码/golden/oracle 触碰（§0 不动清单维持）；§3.3 数值为批准轮域扫描
值（临时脚本 python -I 已按纪律删除），emit 终值由 gt001_comb_oracle 复算冻结为准（§3.3/
§4 项 10 emit 硬条件维持）。

**文件结束**。GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0（2026-11-14，GTCMB-G2b-02 收口，批准
记录 CHG-20261114-07；曾用名 GT001_COMBUSTION_G2B_SPEC_DRAFT——A-5 P3 规格起草人起草 v0.1
（2026-11-14，CHG-20261114-04 授权起草），双路评审（V150 W2a/W2b，2026-11-14）时点状态
DRAFT 的历史记录见 §10）。**v1.0 修订**：11 条件与键形态裁定（形态 a 枚举扩值 "thermo_comb"）、
τ_comb = 0.5 s 定案（域扫描证据）、EQ-GTL2-1…12 冻结文本、Q1…Q13 定案（Q12 否决草案推荐、
model_version 维持 1.2.0 仅登记）落正文，状态 `APPROVED`，GTCMB-G2b-01/02 闭合，
GTCMB-G2b-03/04 入 v1.6.0 波。本规格批准不自动打开验收路径；golden/代码工件仍按 §8 排期
产出。
