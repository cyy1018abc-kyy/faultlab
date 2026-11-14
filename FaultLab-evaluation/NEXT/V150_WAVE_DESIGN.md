# V150_WAVE_DESIGN — v1.5.0 实现波设计（A-5 P3 GT 燃烧延迟 G2b 草案轮 + O-1 盲包诊断族枚举扩展）

> **性质**：阶段设计文档（Lead 起草，2026-11-14）——V140 波（v1.4.0，commit 229a15d）后首波：
> CHG-20261114-03 ④ 待办承接（**P3 GT 草案轮 = v1.5.0 首项、本波 G2b 草案名额**；O-1 显式 CHG 面）。
> **八面冻结下第五个 additive 波（MINOR）**。
> **授权记录（CHG-20261114-04）**：用户 2026-11-14 指令「下一步」——承接 V140 收口汇报的下一轮
> 首项与既定授权句式（CHG-20261114-01 同款链），**DEC-1…4 全采推荐项**。P3 本波只到草案+双路
> 评审（**批准留待用户**，批准与实现 v1.6.0+、实现严格串行——P2 已于 v1.4.0 落地，串行链解锁）。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.4.0 同批，本地 ahead 14）——本波产出并入同批。
> **输入**：A5 §3（P3 提案：τ_comb 燃烧延迟、y=[f,T3,x_comb] 2→3 维 ODE、键面张力二选一、
> thermo 原地深化=被排除形态 :182-184）、GTL1_G2B_SPEC_APPROVED.md §2.4（inertia_model 三值
> 枚举 "swing"|"linear"|"thermo" 定案先例）、GT001_G2B_SPEC_APPROVED.md（L0b 现行）、
> FL001_CAPACITY_G2B_SPEC_APPROVED.md（组合键 capacity_model 先例——对照形态 b）、
> tools/arena-protocol 现状（O-1 诊断提交族枚举）、V140 全链。

---

## 0. 本波边界

**做**（两条线）：
1. **P3 GT 草案轮**（本波唯一 G2b 名额）：`GT001_COMBUSTION_G2B_SPEC_DRAFT.md` v0.1（τ_comb
   燃烧延迟二阶状态、y=[f,T3,x_comb] 2→3 维 ODE、**键面张力二选一=核心裁定点**）+ 双路独立
   评审——只到草案+评审，批准与实现 v1.6.0+（实现严格串行：P2 已解锁）；
2. **O-1 盲包诊断族枚举扩展**（显式 CHG 面）：诊断提交族枚举由 4 值（sensor_drift/load_step/
   actuator_fault/none）扩至覆盖入池六系统全活跃族（PV shading_step、WT gust_step、MG
   load_step 聚合/pv_shading_link/wt_gust_link/island_event）——family/component 评分项可达面
   补全；附录 A 17 负例**只增不删**（面⑤纪律）。

**不做**（沿袭 + 本波显式）：
- P3 GT 批准与实现（v1.6.0+，两波节奏；实现严格串行）；C3 真 TESPy（挂起维持——用户前轮中断，
  不自动重试，待用户明示）；G9/G10 外部 spec 事宜（v1.4.0 隔离件——**须用户明示后才按外部输入
  流程重立**，本波不预设其存在）；L2（永久）、插件化、云/账户/排行榜/实测/HIL/npm/打包器（沿袭）；
  D-3 FMU（样本未到）、golden backend 信息块（留位）、C-2 拖拽、B-4 TL-001（远期）；
- **任何既有 golden 重出**（11 golden 字节冻结）、**任何 breaking 变更**、scope.js 触碰、
  协议附录 A 删减。

**版本与语义**：v1.5.0（MINOR——诊断提交族枚举 additive 扩展 + P3 评审面新增文档；0 新步预期）；
additive 三不承诺沿袭（DEC-4）。

## 1. 决策点（全采推荐项）

### DEC-1：P3 GT 草案轮形态

**采纳（推荐，CHG-20261114-03 ④ 首项）**：本波草案+双路评审（唯一 G2b 名额），批准与实现
v1.6.0+。范围按 A5 §3：τ_comb 燃烧延迟二阶状态（y=[f,T3,x_comb] 2→3 维 ODE；f→x_comb→T3 链
形态草案级、精确式与 τ_comb 域「批准轮定案」零编造）；**核心裁定点 = 键面张力二选一**——形态 a：
`inertia_model` 枚举扩值（GTL1 §2.4 已有三值枚举 "swing"|"linear"|"thermo" 定案先例——扩第 4 值；
燃烧延迟为 thermo 轨同链深化、枚举语义自然）vs 形态 b：正交二键 combustion_model（FL capacity
组合键先例——但燃烧延迟非独立物理轴）；**被排除形态：thermo 轨原地深化**（emit 过的轨语义不得
原地变更——A5 §3 :182-184 硬伤）。推荐由草案实读后给出（两形态对照表 + 理由，批准轮裁定）；
新 golden gt001_v4 预登记；稳态面结构推论预登记（延迟不改变稳态值、只改变暂态路径——C1/C2/
设计点三点稳态不变性）；哈希纪律沿冻结后全套先例（B-1a/子对象/onTrackOnly/B-3a——按选定形态
套用）。

### DEC-2：O-1 盲包诊断族枚举扩展

**采纳（推荐，V130 W3 观察项 O-1 + V140 ④ 待办）**：诊断提交族枚举 additive 扩展至入池六系统
全活跃族（+shading_step/gust_step/六系统族面完整覆盖）；附录 A 17 负例零删减（面⑤「不得删减
只可增补」）；arena-protocol-negative 负例套件 additive 扩展（新族合法提交 + 越界负例）；既有一
致性机检零变化；显式 CHG 登记（面⑤ 覆盖 additive 通道——「规则代演进 = additive」口径）。

### DEC-3：步数账（I-7）

**采纳（推荐）**：run-g2 **35 → 35（0 新步）**——O-1 断言并入步 19（arena-protocol-negative）
与步 25（arena.test）既有步；P3 为草案轮零接线；预算维持 ≤35 申报 0 增步；FIRST-35 机检既有
35 步零改动；标签滞后维持登记不修。

### DEC-4：additive 三不承诺 + push 状态

**采纳（推荐）**：① 五类哈希既有合法输入零变化（本波零 SystemDef/scenario 声明面改动——P3 只
草案；O-1 为诊断提交面枚举、不入 run/config 哈希——探针证明）；② 既有 11 golden 字节零触碰；
③ 既有 35 步判据零翻转（O-1 扩展为枚举值域 additive、既有 4 值路径零变化）。push 五批同批暂缓
延续（v0.7.1–v1.4.0，ahead 15），本波产出并入同批；v1.5.0 发布本地提交随 CHG-20261114-05 同口径。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-14 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；工作树
clean（HEAD=229a15d）——无已有进程冲突。全程不 push、不触碰 data/golden/**、文件面互斥。

```text
阶段一（P3 草案轮——本波 G2b 名额）
  W1 P3 草案起草    → 新建 NEXT/GT001_COMBUSTION_G2B_SPEC_DRAFT.md v0.1（A5 §3 兑现+键面张力对照）
  W2a 评审 A 物理   → 只读独立评审（互不可见）→ verdict+条件清单（报告返回，v1.6.0 批准轮回填）
  W2b 评审 B 治理   → 只读独立评审（互不可见）→ verdict+条件清单（W4 代录草案 §10）
阶段二（O-1 扩展）
  W3 O-1 诊断族枚举 → 诊断提交枚举 additive 扩展 + 负例套件扩展 + arena.test/e2e 镜像
                      （src/core arena-protocol 面 + tests + tools/e2e.mjs）
阶段三（收尾与发布门）
  W4 门禁与证据    → run-g2 35/35 两次独立 + verify_golden 全注册行 + copy-guard + file-smoke/
                      walkthrough/e2e + P3 草案 §10 双评审结论代录（状态 DRAFT）+ evidence/g8/
                      v150-release.md + DECISIONS.md CHG-20261114-05 + V1_FACES additive（§12 记录）
```

**文件面互不相交声明**：W1 独占 P3 草案新文件；W2a/W2b 只读；W3 独占 arena-protocol 实现+tests
arena 区+e2e；W4 独占 V1_FACES/DECISIONS/evidence/FaultLab.html+P3 草案 §10 状态面——**互不相交**。

**并发度说明**：主机并发额度=1（实测，W8 曾两次被截断——中断路改主线接管为既定降级路径），
依赖序串行（W1→W2a→W2b→W3→W4）；W2a/W2b 互不可见。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 35 步不变（0 新步）；步 19/25 断言数增 |
| arena-protocol-negative | 42→N（新族合法+越界负例 additive） |
| arena.test.js / e2e | 198 / 94 → N（诊断族覆盖断言） |
| V1_FACES | §12 v1.5.0 additive 修订记录（面⑤ 诊断族覆盖注记）；面② 11 golden 不变 |
| 哈希面 | 零变化（探针证明） |
| 契约存档 | P3 草案 + 双评审结论（文档面） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | P3 键面张力两形态推荐分歧（枚举扩值 vs 组合键先例冲突） | 草案给全对照表（GTL1 三值枚举先例 vs FL 组合键先例、语义耦合度、golden 关联面成本），推荐留草案、裁定归批准轮 |
| 2 | O-1 扩展触碰协议面⑤冻结语义 | 附录 A 只增不删 + 既有 4 值路径零变化探针 + 显式 CHG 登记 |
| 3 | 代理中断/主机额度（W8 先例） | 中断路改主线接管为既定降级路径；文件面互斥保证接管零冲突 |
| 4 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V150_WAVE_DESIGN v1（2026-11-14，CHG-20261114-04 批准，按推荐执行）。
