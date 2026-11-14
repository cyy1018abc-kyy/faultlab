# V130_WAVE_DESIGN — v1.3.0 实现波设计（A-5 P2 FL 容量/内阻 G2b 草案轮 + Arena exposure 三值映射验证轮 + MG 教学路径 + QP-4 放行 + C3 真 TESPy）

> **性质**：阶段设计文档（Lead 起草，2026-11-13）——V120 波（v1.2.0，commit 2b53b39）后首波：
> CHG-20261113-02 ④ 待办承接（P2 FL 批准轮候选 earliest v1.3.0 / Arena exposure 验证轮 /
> MG 教学路径 / QP-4 / C3 真 TESPy）。**P2 草案轮 = 本波唯一 G2b 草案名额**（A5 §7 结论 3
> 「单波至多一项 G2b 草案轮」）；P1 FC 已于 v1.2.0 落地 ⇒ P2 排期条件满足（「P1 落地一个
> 发布周期后」）。**八面冻结下第三个 additive 波（MINOR）**。
> **授权记录（CHG-20261113-04）**：用户 2026-11-13 指令「下一步」——承接 V120 收口汇报的
> 下一轮候选清单与既定授权句式（CHG-20261110-01/20261113-01 同款「统一采用推荐决策」链），
> **DEC-1…7 全采推荐项**。P2 本波只到草案+双路评审（**批准留待用户**，沿 MG/FC 两波节奏；
> 「SOC 定义不动」裁定的重开在草案中列为**核心裁定点请求**、批准轮才裁定——不静默、不在
> 本波发生）。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.2.0 同批，本地 ahead 9）——本波产出并入同批。
> **输入**：A5_MULTIPHYSICS_EXPLORATION.md §2（P2 提案：η_cap(T) 进 SOC 积分 + R_int 二次项，
> 「SOC 定义不动」裁定链实读）、FL001_THERMAL_G2B_SPEC_APPROVED.md（EQ-FLTH-2/7/9、§3.4
> 稳定性边界 48.2843 kW、fl001_v2 先例）、WT001_G2B_SPEC_APPROVED.md §1.2（exposure 三值
> 映射核对表体例 B-3/PV001 C-6）、src/ui/pages/arena.js :92-102（入池延后登记）、
> tests/arena-protocol-negative.test.js :246-287（QP-4 实测发布机制在跑）、
> TESPY_CORNER_EXTENSION_ASSESSMENT.md（C3 硬前置已解除——LICENSE=MIT 已核实回填）、
> evidence/gt/tespy-independent-case.md v2（§8 附录：设计点+C1+C2 三点口径 (a) 面）。

---

## 0. 本波边界

**做**（五条线）：
1. **A-5 P2 FL G2b 草案轮**（唯一 G2b 名额）：FL001_CAPACITY_G2B_SPEC_DRAFT.md v0.1
   （η_cap(T) 温度-容量折算进 SOC 积分 + R_int 二次项 β·θ²；「SOC 定义不动」重开=核心裁定点
   请求）+ 双路独立评审（A 物理/B 治理）——**只到草案+评审，批准与实现 v1.4.0**；
2. **Arena exposure 三值映射验证轮**：PV（17 信号）/WT（22）/MG（19）逐信号
   sourceKind→exposure→blind_observable 三值落点核对表 × 盲包实际行为程序化验证（真值零泄漏
   扫描）→ 通过则 **ARENA_EXCLUDED 收缩**（PV/WT/MG 入池，显式 CHG 面）+ 盲包通道面裁定登记；
3. **MG 教学路径**：path-mg-001（孤岛/重连功率平衡重整教学点——I-5 句式）additive；
4. **QP-4 放行门槛登记**：实测假候选率（步 19 在跑）+ ≤0.2 门槛公布值 → V1_FACES 面⑤
   放行注记 + CHG 登记（deriveChangePoints 首发放行）；
5. **C3 真 TESPy 口径 (b)**：隔离 venv + pip 安装 tespy（仓库零依赖不破——I-1 指产品/仓库面）
   → 设计点 + C1/C2 三点六量对照 → 「变比热豁免的已解释偏差」登记（只比趋势与量级）；
   环境不可达则如实登记阻塞。

**不做**（沿袭 + 本波显式）：
- P2 FL 批准与实现（v1.4.0，两波节奏）；P3 GT 草案（本波 G2b 名额已占——A5 §7 结论 3；
  顺延 v1.4.0 候选）；L2（永久）、插件化、云/账户/排行榜/实测/HIL/npm/打包器（沿袭）；
- D-3 FMU（样本未到）、golden backend 信息块（留位）、C-2 拖拽、B-4 TL-001（远期）、
  METRICS_P1 全量启用（QP-4 仅放行 deriveChangePoints 首发面）；
- **任何既有 golden 重出**（10 golden 字节冻结）、**任何 breaking 变更**、soc/energy 判据放松、
  scope.js 触碰（无裁定需求预期）。

**版本与语义**：v1.3.0（MINOR——盲测池扩张（面⑤覆盖 additive）+ 教学路径新增 + QP-4 放行
登记 + 评审面新增文档；0 新步预期）；additive 三不承诺沿袭（DEC-7）。

## 1. 决策点（全采推荐项）

### DEC-1：P2 FL 草案轮形态

**采纳（推荐，CHG-20261113-02 ④ + A5 §2）**：本波草案+双路评审（唯一 G2b 名额），批准与实现
v1.4.0。草案核心内容按 A5 §2：η_cap(T) 温度-容量折算进 SOC 积分（EQ-FLTH-7 修改）+ R_int
二次项 R0·(1+α·θ+β·θ²)（EQ-FLTH-2 扩展）+ P_loss/T_bat 轨随之变化 + 渐近稳态 θ_ss 二次代数
方程（闭式 vs 数值=G2b 裁定点）+ 稳定性条件改写 h > I²·R0·(α+2βθ) + FLTH §3.4 越界边界移动
注册域全量复扫。**核心裁定点 = 「SOC 定义不动」裁定重开**（V072 DEC-2 链逐字引用 + 修订请求
显式化——A5 §2.2 评估结论照录）；键形态二选一（组合键 capacity_model off|on（推荐——FC
B-1a/sub-object 先例、fl001_v2 字节冻结零涉）vs thermal_model 枚举扩值 vs 原地升级（breaking
排除））列为第二裁定点；新 golden fl001_v3 预登记（T-B 预期）；哈希纪律沿 FC 冻结后先例
（显式键 + 子对象 + onTrackOnly 列门控——V120 已验证的整套机制直接套用）。

### DEC-2：Arena exposure 三值映射验证轮与入池

**采纳（推荐，WT001 §1.2 B-3 体例 + arena.js 登记面）**：三系统（PV/WT/MG）逐信号
sourceKind→默认 exposure→public/blind/blind_observable 三值落点核对表（PV001 C-6 体例）×
盲包实际行为程序化验证（盲包生成→递归真值泄漏扫描（truth/_true_/bias/cap/故障配置零出现）→
通道集与核对表一致）→ 全过则 ARENA_EXCLUDED 收缩至 []（PV/WT/MG 入池，显式 CHG 登记——
面⑤「不在承诺内」清单项、覆盖扩张 additive）+ arena.test/e2e 断言扩展；任一系统不过则该系统
维持排除并登记缺口（不阻塞其余系统入池——逐系统裁定）。

### DEC-3：MG 教学路径

**采纳（推荐）**：teaching.js PATHS 追加 path-mg-001（并网→孤岛→重连三段功率平衡重整演示，
I-5 句式「脱离主馈线的功率平衡重整」、EQ-MG 引用、island_event 零参数族场景）+ exportTeachingPath
信封 + teaching.test 断言（235→N）+ e2e 教学页断言——additive，零既有路径改动。

### DEC-4：QP-4 放行门槛登记

**采纳（推荐）**：deriveChangePoints 首发放行——实测健康局假候选率（步 19 发布机制在跑，≤0.2
断言 + 检出 ≥0.9）登记为公布基线，V1_FACES 面⑤ 放行注记（「门槛数值已测量并公布：≤0.2（实测
值随步 19 发布）」）+ CHG-20261113-05 收口登记；放行语义 = 首发前置解除（协议 §6.3 口径），
盲包生成侧按既有协议面使用，不扩任何判据。

### DEC-5：C3 真 TESPy 口径 (b)

**采纳（推荐，Q-T2/T3 已定案 (a) 且硬前置已解除）**：隔离 venv（系统 TEMP）pip 安装 tespy
（MIT 已核实；仓库/产品零依赖不破——旁证轨产品面外身份维持）→ 按声明式链对设计点 u=25 +
C1（u=19.65）+ C2（u=40）三点输出六量 → 与 oracle 稳态解比对 → **差异登记为「定比热豁免
（§2.2）的已解释偏差」（只比趋势与量级，不设判据门槛）**；证据增补 tespy-independent-case.md
v3（§9 节）；环境/pip 不可达则如实登记阻塞（不阻塞本波其余交付）。三标签纪律 + GPL 隔离
（现为 MIT——隔离纪律按评估稿「无论许可均适用」维持）。

### DEC-6：步数账（I-7）

**采纳（推荐）**：run-g2 **35 → 35（0 新步）**——arena.test 断言扩展并入步 25、teaching.test
并入步 32、QP-4 实测随步 19、C3/exposure 验证为证据面不入门禁；预算维持 ≤35 申报 0 增步；
FIRST-35 机检既有 35 步零改动；步①/步 31 标签滞后维持登记不修（V120 DEC-5 处置延续）。

### DEC-7：additive 三不承诺 + push 状态

**采纳（推荐）**：① 既有合法输入五类哈希零变化（本波零 SystemDef 声明面改动——P2 只草案；
arena.js ARENA_EXCLUDED 为 UI 名单不入哈希；teaching.js PATHS 追加不入 run/config 哈希——
探针证明）；② 既有 10 golden 字节零触碰；③ 既有 35 步判据零翻转。push 五批同批暂缓延续
（v0.7.1–v1.2.0，ahead 9），本波产出并入同批；v1.3.0 发布本地提交随 CHG-20261113-05 同口径。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-13 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；工作树
clean（HEAD=2b53b39）——无已有进程冲突。全程不 push、不触碰 data/golden/**、文件面互斥。

```text
阶段一（P2 草案轮——本波唯一 G2b 名额）
  W1 P2 草案起草    → 新建 NEXT/FL001_CAPACITY_G2B_SPEC_DRAFT.md v0.1（A5 §2 兑现 + 两裁定点 + Q 点）
  W2a 评审 A 物理   → 只读独立评审（互不可见）→ verdict+条件清单（报告返回）
  W2b 评审 B 治理   → 只读独立评审（互不可见）→ verdict+条件清单（报告返回）
                      （评审结论随报告留档；批准轮 v1.4.0 收口回填规格 §10——FC/MG 体例）
阶段二（验证与小项，文件面互斥四路）
  W3 Arena exposure → 三系统核对表 × 盲包程序化验证 + ARENA_EXCLUDED 收缩 + arena.test/e2e 扩展
                      （src/ui/pages/arena.js + tests/arena.test.js + tools/e2e.mjs 镜像）
  W4 MG 教学路径    → src/core/teaching.js PATHS 追加 + tests/teaching.test.js + tools/e2e.mjs 教学断言
  W5 C3 真 TESPy    → TEMP venv + pip tespy + 三点对照 + evidence/gt/tespy-independent-case.md v3 §9
                      （评估稿注记同步；不可达则阻塞登记）
阶段三（收尾与发布门）
  W6 门禁与证据     → run-g2 35/35 两次独立 + verify_golden 全注册行 + copy-guard + file-smoke/
                      walkthrough/e2e + QP-4 放行登记（V1_FACES 面⑤）+ evidence/g8/v130-release.md
                      + DECISIONS.md CHG-20261113-05 + V1_FACES additive（面⑤/面① 若涉/§9 记录）
                      + ARENA 评审面结论回填 P2 草案 §10（如 W2 在 W6 前完成）
```

**文件面互不相交声明**：W1 独占 P2 草案新文件；W2a/W2b 只读；W3 独占 arena.js+arena.test+
e2e（arena 断言区）；W4 独占 teaching.js+teaching.test（e2e 教学区与 W3 协调——e2e 归 W3/W4
分区间登记，冲突面由 W6 终验兜底）；W5 只写 tespy 证据文档 + TEMP；W6 独占 V1_FACES/
DECISIONS/evidence/FaultLab.html——**互不相交**。

**并发度说明**：主机并发额度=1（实测），按依赖序排队串行（W1→W2a→W2b→W3→W4→W5→W6），
文件面互斥保证零冲突；W2a/W2b 独立性由互不可见纪律保证。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 35 步不变（0 新步）；arena/teaching 步内断言数增 |
| arena.test.js | 池内容断言更新（ARENA_EXCLUDED 收缩——显式登记面）+ 盲包扩池断言 |
| teaching.test.js | 235→N（path-mg-001） |
| e2e/file-smoke/walkthrough | 76/80/63 → N（教学路径 + arena 扩池断言镜像） |
| 盲包通道面 | PV/WT/MG 入池 = 评测轨覆盖扩张（面⑤ additive 登记；协议字段面零变化） |
| V1_FACES | 面⑤ QP-4 放行注记 + 入池登记；§9 v1.3.0 additive 修订记录 |
| 哈希面 | 零变化（无 SystemDef/scenario 声明面改动——探针证明） |
| 契约哈希存档 | tespy 证据 v3（文档面） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | P2 草案「SOC 重开」表述被误读为既成裁定 | 草案显式「核心裁定点请求、批准留待用户、本波不裁定」三重声明（A5 §2.2 口径） |
| 2 | exposure 验证发现真值泄漏 | 逐系统裁定：泄漏系统维持排除并登记缺口，不阻塞其余入池；零静默 |
| 3 | 入池改判评测覆盖语义 | 面⑤「不在承诺内」+ 显式 CHG + 盲包通道面裁定登记（DEC-2） |
| 4 | C3 pip/网络不可达 | 优雅降级：阻塞登记不阻塞波次（DEC-5） |
| 5 | MG 教学文案触碰 I-5/BANNED | 批准句式 + copy-guard 终检（W6） |
| 6 | 主机并发额度限制 | §2 串行排队 + 文件面互斥 |
| 7 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V130_WAVE_DESIGN v1（2026-11-13，CHG-20261113-04 批准，按推荐执行）。
