# V140_WAVE_DESIGN — v1.4.0 实现波设计（A-5 P2 FL 容量/内阻批准与实现轮 + P3 GT 燃烧延迟草案轮）

> **性质**：阶段设计文档（Lead 起草，2026-11-14）——V130 波（v1.3.0，commit 27c5e22）后首波：
> P2 FL 批准轮（FLCAP-G2b-02 收口：双评审 9+6 条件落正文 + 两裁定点裁定 + 常量定案）与实现轮
> （FLCAP-G2b-03/04）+ **P3 GT 草案轮（本波 G2b 草案名额）**——沿 v1.1.0「MG 实现 + FC 草案」
> 同构先例（P2 批准/实现非草案轮，草案名额归 P3；A5 §7 结论 3 口径）。**八面冻结下第四个
> additive 波（MINOR）**。
> **授权记录（CHG-20261114-01）**：用户 2026-11-14 指令「下一步」——承接 V130 收口汇报的下一轮
> 首项与既定授权句式（CHG-20261113-04 同款链），**DEC-1…7 全采推荐项**。**「SOC 定义不动」
> （V072 DEC-2）的重开经本指令链裁定采纳（裁定点一候选 A）**——仅 capacity on 域内生效、
> fl001_v1/v2 字节冻结零涉、P_bat=0.4·I 口径不动（功率链零反馈）。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.3.0 同批，本地 ahead 11）——本波产出并入同批。
> **输入**：FL001_CAPACITY_G2B_SPEC_DRAFT.md v0.1（428 行 + §10 双评审结论回填）、双评审报告
> （2026-11-13 W2a/W2b：A:PASS_WITH_CONDITIONS(9)/B:(6)）、A5 §3（P3 提案：τ_comb 三维 ODE）、
> GT001_G2B_SPEC_APPROVED.md 与 GTL1_G2B_SPEC_APPROVED.md（GT 现行两轨）、V130 全链。

---

## 0. 本波边界

**做**（三条线）：
1. **P2 FL 批准轮 + 实现轮**（主线）：批准轮收口（条件 A-1…A-9/B-1…B-6 全按推荐落正文 +
   **裁定点一=重开采纳**（仅 capacity on 域）+ **裁定点二=组合键 capacity_model**（off|on、
   前置 thermal_model=on）+ 常量定案（β/k_cap/T_cap0/η_floor——含 48.2843 边界移动后注册域
   全量复扫证据）+ Q1…Q11 定案 + 更名 `FL001_CAPACITY_G2B_SPEC_APPROVED.md` v1.0）→
   实现轮（fl001_cap_oracle + fl001_v3 第 11 golden + verify_golden（注册行+DEFAULT_MODELS
   四 golden+`_kWh` T-B 分派分支）+ 引擎组合守卫三分派 + UI + 测试）；
2. **P3 GT 草案轮**：`GT001_COMBUSTION_G2B_SPEC_DRAFT.md` v0.1（τ_comb 燃烧延迟三阶状态
   y=[f,T3,x_comb]、键面张力二选一裁定点、golden gt001_v4 预登记）+ 双路独立评审——只到
   草案+评审，批准与实现 v1.5.0+（实现严格串行：P2 落地后）；
3. **小清算**：O-4 arena 页文案滞后清扫（六系统池下「三系统可用」类措辞）；步①/步 31/步 32
   描述标签滞后维持登记不修（V120 DEC-5 处置延续）；C3 真 TESPy 维持挂起（用户前轮中断——
   不自动重试，待用户明示）。

**不做**（沿袭 + 本波显式）：
- P3 GT 批准与实现（草案可并行、实现严格串行——P2 未落地前 P3 不启动实现）；O-1 盲包诊断
  提交族枚举扩展（协议面相邻——顺延 v1.5.0 候选，显式 CHG 面已登记）；C3（挂起维持）；
  L2（永久）、插件化、云/账户/排行榜/实测/HIL/npm/打包器（沿袭）；D-3 FMU（样本未到）、
  golden backend 信息块（留位）、C-2 拖拽、B-4 TL-001（远期）；
- **任何既有 golden 重出**（fl001_v1/v2 及其余 9 份字节冻结——capacity on 为新 id fl001_v3）、
  **任何 breaking 变更**、soc/energy 判据放松、scope.js 触碰（无裁定需求预期——FL classify
  不消费 cfg 键，FLTH B-1 先例）。

**版本与语义**：v1.4.0（MINOR——新 golden fl001_v3 + 新 scenario 键 capacity_model + 新 oracle
fl001_cap_oracle + E_cap_kWh 新信号 + P3 评审面新增文档）；additive 三不承诺沿袭（DEC-7）。

## 1. 决策点（全采推荐项）

### DEC-1：P2 批准轮两裁定点

**采纳（推荐）**：**裁定点一 = 重开采纳（候选 A）**——「SOC 定义不动」（V072 DEC-2）经本指令链
裁定在 **capacity_model=on 域内**修订：EQ-FLTH-7 的 SOC 分母改 E_cap(T_bat)=η_cap·E_nom（域外
——off 与 thermal on 无 capacity——维持原式逐字不动）；影响面限定 SOC 折算面（P_bat=0.4·I/
守恒恒等式/残差面零涟漪——FLTH Q1 性质差异成立：无第二缺口项、无补偿去向）；撤回条件=批准轮
双路否决即落候选 B（零代码零 golden 后果）。**裁定点二 = 组合键 capacity_model: off|on**（前置
thermal_model=on；(off,·)/(on,off)/(on,on)/(off,on)=拒绝 三元封闭路由）；A5 §2.2③ 原推荐
（枚举扩值）的翻转偏离经 V130 DEC-1 上游获准 + 本轮批准轮显式确认（B-2）。

### DEC-2：双评审条件处置（A-1…A-9 / B-1…B-6）

**采纳（全按推荐，批准轮落正文）**：A-1 η_cap 正性机制（η_floor>0 下限 or θ 域上界钳死——
随 Q2 定案二选一）+ limitations 越域登记 + FCAP-8 域限定；A-2 healthy 局 SOC_err 结构定案
（**推荐 Q2 阈值形态 + T_cap0 高于 healthy 轨最高温 ⇒ healthy SOC_err ≡ 0、SOC 面与 fl001_v2
healthy 逐位同**——FC 整定依据④同构机制）；A-3 **数值稳定小根形态冻结** θ₋=2I²R0/[(h−αI²R0)+√Δ]
（naive 式仅展示）；A-4/B-1 gate 路由机制描述勘正（E_cap_kWh 实落 f_Hz_atol 兜底→KeyError，
fl001_v2 gate 无该键）+ **`_kWh` T-B 分派分支 = FLCAP-G2b-03 显式硬项**（additive，既有键路由
不变证明随实现提交）；A-5 β≥0/k_cap≥0 符号域入 §1.5 与 FCAP-8；A-6 ⟺ 措辞勘正；A-7 /3600
位置写死；A-8 翻转确认登记；A-9 Riccati 有限时间发散 limitations + FCAP-8 注册域限定；B-2 翻转
偏离链；B-3 §1.2 补 sourceKind/exposure 列（E_cap_kWh=MODEL_STATE/DERIVED→public_demo、非盲显）；
B-4 FCAP-1 判据挂 FCAP-7 实测冻结制（电气/测量面 ±1e-9 不变）；B-5「10 件」→「tools/oracle/**
全部零触碰」；B-6 §5 双波标注拆注。

### DEC-3：常量定案与域扫描

**采纳（推荐）**：批准轮敲定 β、k_cap、T_cap0（+η_floor 若 A-1 采下限机制）——约束：① 60 s 窗
T_bat 轨可见性；② 注册域单调/稳定性裕度（h > I²R0(α+2√β) 于域最大 I 角点）；③ **T_cap0 高于
healthy 轨最高温**（A-2 机制）；④ 48.2843 kW 边界移动后注册域全量复扫（Δ>0 全域 + RK4 步长
裕度）；域扫描证据入 §1.5/§3.3（python -I 临时脚本、TEMP、用后删）。

### DEC-4：Q1…Q11 定案

**采纳（全采草案推荐）**：Q1=capacity_model；Q2=阈值线性两参数；Q3=闭式保留+稳定小根形态
（A-3）；Q4=fl001_cap_oracle.py；Q5=FCAP-1…n 新段；Q6=DEFAULT_MODELS 追加 "fl001_cap"
（verify_golden.py:206 现值四 golden 序列）；Q7=镜像 fl001_v2 全集 4 Run 全 (on,on)；Q8=T-B
+降 T-C 双向预案；Q9=EQ-FLTH-10…12 新编号；Q10=新信号仅 E_cap_kWh（onTrackOnly 门控）；Q11=
组合守卫双落点（engine validate + scenario declaresCapacity）。

### DEC-5：P3 GT 草案轮

**采纳（推荐，A5 §3）**：本波草案+双路评审（G2b 草案名额），批准与实现 v1.5.0+（实现严格
串行——P2 本波落地后解锁）。范围按 A5 §3：燃烧延迟二阶状态 τ_comb（状态向量 y=[f,T3,x_comb]
2→3 维 ODE）、新 golden gt001_v4 预登记、**键面张力二选一裁定点**（形态 a：inertia_model 枚举
扩值 vs 形态 b：正交二键；被排除形态=thermo 轨原地深化——emit 过的轨语义不得原地变更），
对照表由 G2b 轮正式填写；L2 不做、PyBaMM/TESPy 不引入（C3 旁证轨独立）。

### DEC-6：步数账（I-7）

**采纳（推荐）**：run-g2 **35 → 35（0 新步）**——verify_golden fl001_cap 并入步①（DEFAULT_MODELS
四 golden）；引擎 on_cap 变体并入 tests/engine.test.js 既有步⑤（FL 主文件）；P3 为草案轮零接线。
预算维持 ≤35 申报 0 增步；FIRST-35 机检既有 35 步零改动；标签滞后维持登记不修。

### DEC-7：additive 三不承诺 + push 状态

**采纳（推荐）**：① 五类哈希既有合法输入零变化（off/(on,off) 双逐位硬条件 + V120 已验证机制
套用：B-1a 显式键 + capacity 子对象九字段域外 + onTrackOnly 列门控 + B-3a 零投影——探针证明）；
② 既有 10 golden 字节零触碰；③ 既有 35 步判据零翻转。push 五批同批暂缓延续（v0.7.1–v1.3.0，
ahead 11），本波产出并入同批；v1.4.0 发布本地提交随 CHG-20261114-02 同口径。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-14 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；工作树
clean（HEAD=27c5e22）——无已有进程冲突。全程不 push、不触碰 data/golden/ 既有 10 文件字节、
文件面互斥。

```text
阶段一（P2 批准轮收口）
  W1 P2 批准轮收口 → 条件 9+6 落正文 + 两裁定点裁定 + 常量定案（域扫描证据）
                      + Q1…Q11 定案 + §10 用户批准行回填 + 更名 APPROVED v1.0
阶段二（P2 实现轮 + P3 草案轮，文件面互斥）
  W2 oracle 面     → tools/oracle/fl001_cap_oracle.py 新建 + verify_golden.py（import+注册行+
                      DEFAULT_MODELS 四 golden+_kWh T-B 分派分支+docstring）+ data/golden/fl001_v3.json/.sha256
  W3 引擎/系统/场景 → src/core/engine.js（组合守卫+三分派+稳定小根 θ_ss+RK4）、systems.js（capacity
                      子对象+双盖章+E_cap_kWh 信号）、scenario.js（capacity_model 显式键+组合守卫）、
                      schema.js（零投影+显式键校验）—— scope.js 零触碰
  W4 测试面        → tests/engine.test.js on_cap 节（三元路由+off/(on,off) 双逐位+锚点+守卫）
                      + scenario/schema 增量——0 新步
  W5 UI/镜像/文档  → scenario 编辑器（capacity 钉选+组合守卫提示）+ system 页容量轨面板 + O-4 arena
                      页文案清扫 + e2e/file-smoke/walkthrough 镜像 + docs/FAULT_CATALOG.md（§1 FL 注记行+版本）
阶段三（P3 草案评审 + 发布门）
  W6 P3 草案起草   → 新建 NEXT/GT001_COMBUSTION_G2B_SPEC_DRAFT.md v0.1（A5 §3 兑现）
  W7a 评审 A 物理  → 只读（互不可见）
  W7b 评审 B 治理  → 只读（互不可见）——结论随报告返回，v1.5.0 批准轮回填（W8 代录 §10）
  W8 门禁与证据    → run-g2 35/35 两次独立 + verify_golden 全注册行 + copy-guard + file-smoke/
                      walkthrough/e2e + evidence/g8/v140-release.md + DECISIONS.md CHG-20261114-02
                      + V1_FACES additive + P2 规格 §8 状态回填 + P3 草案 §10 代录双评审结论（状态 DRAFT）
```

**文件面互不相交声明**：W1 独占 P2 规格文件；W2 独占 fl001_cap_oracle.py+verify_golden.py+golden
新文件；W3 独占 engine/systems/scenario/schema（scope.js 禁触）；W4 独占 tests/**；W5 独占 src/ui/**
+FAULT_CATALOG+e2e/file-smoke/walkthrough；W6 独占 P3 草案新文件；W7a/W7b 只读；W8 独占 V1_FACES/
DECISIONS/evidence/FaultLab.html+P2/P3 规格 §8/§10 状态面——**互不相交**。

**并发度说明**：主机并发额度=1（实测），依赖序串行（W1→W2→W3→W4→W5→W6→W7a→W7b→W8），
文件面互斥保证零冲突；W7a/W7b 互不可见。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 35 步不变（0 新步）；步① 四 golden（+fl001_cap）；步⑤ 内 on_cap 断言增 |
| verify_golden | MODELS 8→9 注册行；DEFAULT_MODELS 三→四 golden；`_kWh` T-B 分派分支新增（既有键路由不变证明） |
| golden 库 | 10→11（fl001_v3 新 id schema v2 T-B）；fl001_v1/v2 字节冻结维持 |
| 信号目录 | FL signals +1（E_cap_kWh，onTrackOnly）→ model_hash 零变化（signals 不在九字段——V120 已证） |
| scenario 哈希 | 既有输入零变化；capacity_model 显式键输入含解析值；组合守卫 (off,on) 拒绝 |
| e2e/file-smoke/walkthrough | 81/85/63 → N（capacity 编辑器+面板+P3 无 UI 面） |
| FaultLab.html | 1687.8 KiB → 增 |
| 测试面 | engine.test.js on_cap 节并入；其余文件零改动全绿 |
| V1_FACES | 面① FL 画像行 +1 信号注记、面② golden 10→11、§11 v1.4.0 additive 修订记录 |
| O-4 | arena 页「三系统」类文案 → 六系统口径（copy-guard 0 命中维持） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | β/k_cap/T_cap0 整定失当（失稳边界/判别式/可见性冲突） | DEC-3 四约束 + 域扫描证据 + FCAP-3/5/8 emit 硬条件 + 稳定小根形态（A-3） |
| 2 | T-B 双实现散差超预案（二次项+tanh 闭式 libm 差异） | FCAP-7 实测冻结 ×≥10 + 降 T-C 双向预案 |
| 3 | 组合守卫缺口（(off,on) 静默通过） | 双落点守卫（engine validate+scenario）+ 三元封闭路由 + 负例断言（W4） |
| 4 | fl001_v1/v2 误触 | 不动清单 + off/(on,off) 双逐位验收 + verify_golden 既有行复验 |
| 5 | `_kWh` 分支扰动既有键路由 | 分支带 gate 键守卫（`_kWh` 精确后缀+E_kWh 键在位）+ 10 golden×全序列键路由零错配审计（FC `_V` 先例同构） |
| 6 | SOC_err healthy 局被误读 | A-2 机制（T_cap0 高于 healthy 最高温 ⇒ ≡0）+ A-flcap-soc 登记句式 |
| 7 | 主机并发额度限制 | §2 串行排队 + 文件面互斥 |
| 8 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V140_WAVE_DESIGN v1（2026-11-14，CHG-20261114-01 批准，按推荐执行）。
