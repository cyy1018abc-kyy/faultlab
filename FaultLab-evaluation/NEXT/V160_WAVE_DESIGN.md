# V160_WAVE_DESIGN — v1.6.0 实现波设计（A-5 P3 GT 燃烧延迟批准与实现轮）

> **性质**：阶段设计文档（Lead 起草，2026-11-14）——V150 波（v1.5.0，commit 206f227）后首波：
> CHG-20261114-05 ④ 待办首项兑现（P3 批准轮 + 实现轮）。G9/G10 启动波顺延 v1.7.0（用户「下一步」
> 默认排程——CHG-20261114-06 双裁定之「v1.5.0+ 候选」排位确认）。**八面冻结下第六个 additive 波
> （MINOR）**。
> **授权记录（CHG-20261114-07）**：用户 2026-11-14 指令「下一步」——默认排程承接（V150 收口汇报
> 明示「『下一步』默认按登记顺序走 P3 批准轮、G9/G10 顺延 v1.7.0」），**DEC-1…5 全采推荐项**。
> **键形态裁定（裁定点）= 形态 a 枚举扩值**（新值 "thermo_comb"——GTL1 §2.4 三值枚举先例 + B-2
> 修正后 config_hash 轨区分面强化形态 a；经本指令链登记，GTL1-G2b-02 先例）。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.5.0 同批）——本波产出并入同批。
> **输入**：GT001_COMBUSTION_G2B_SPEC_DRAFT.md v0.1（448 行 + §10 双评审结论代录）、双评审报告
> （2026-11-14 W2a/W2b：A:PASS_WITH_CONDITIONS(6)/B:(5)）、GTL1_G2B_SPEC_APPROVED.md（thermo 轨
> 现行）、gt001_l1_oracle.py、gt001_v3.json（6 Run/27 列/十键 gate）、V150 全链。

---

## 0. 本波边界

**做**（一条主线 + 小清算）：
1. **P3 GT 批准轮 + 实现轮**（主线）：批准轮收口（GTCMB-G2b-02：条件 A-1…A-6/B-1…B-5 全按推荐
   落正文 + **键形态裁定=形态 a**（inertia_model 扩第 4 值 "thermo_comb"）+ τ_comb 常量定案
   （七项判据域扫描证据）+ Q1…Q13 定案 + 更名 `GT001_COMBUSTION_G2B_SPEC_APPROVED.md` v1.0）→
   实现轮（GTCMB-G2b-03/04：gt001_comb_oracle + gt001_v4 第 12 golden + verify_golden 注册行/
   DEFAULT_MODELS 五 golden（**零新 gate 分支预期——Q10a 零新信号、27 列同集**）+ 引擎
   thermo_comb 枚举分支（三维 RK4 分区）+ 三处字面守卫 additive（B-1）+ UI + 测试）；
2. **小清算**：步①/步 31/步 32 描述标签滞后维持登记不修；C3 真 TESPy 挂起维持（待用户明示）；
   G9/G10 顺延 v1.7.0（CHG-20261114-06 双裁定承接——启动波待用户下轮指令）。

**不做**（沿袭 + 本波显式）：
- G9/G10（FC L1-FMU G2b 草案轮 + I-11 S3 + G10 Arena L2/MCP——v1.7.0 候选，与 P3 实现文件面
  相交故严格排后）；C3（挂起维持）；L2（永久）、插件化、云/账户/排行榜/实测/HIL/npm/打包器
  （沿袭）；D-3 FMU（G9 未启动前维持）、golden backend 信息块（留位）、C-2 拖拽、B-4 TL-001（远期）；
- **任何既有 golden 重出**（gt001_v1/v2/v3 及其余 10 份字节冻结——gt001_v4 为新 id）、
  **任何 breaking 变更**、默认轨翻转（defaults.inertia_model 维持 'thermo'——R-8 沿袭）、
  scope.js 触碰（GT classify 零消费面——B 路实读）。

**版本与语义**：v1.6.0（MINOR——新 golden gt001_v4 + inertia_model 枚举 +1 值 + 新 oracle
gt001_comb_oracle + 评审面文档；0 新步预期）；additive 三不承诺沿袭（DEC-5）。

## 1. 决策点（全采推荐项 + 一处推荐否决）

### DEC-1：键形态裁定（核心裁定点）

**采纳（推荐形态 a，经本指令链裁定）**：`inertia_model` 枚举扩第 4 值 **"thermo_comb"**——
GTL1 §2.4 三值枚举先例（"swing"|"linear"|"thermo"）+ 燃烧延迟为 thermo 同链深化（非正交轴，
组合键语义弱）+ **B-2 修正后强化**：inertia_model 现状在 config_hash 投影内（schema.js:144）
⇒ 深化轨 config_hash/run_hash 经投影轨值天然区分（B-3a 碰撞局限不适用）；四元 golden 映射
linear→v1/swing→v2/thermo→v3/thermo_comb→v4；**被排除形态（thermo 原地深化）维持排除**
（A5 §3 :182-184）。FLCAP 翻转先例对照公允性经 B 路实读确认（GT 侧翻转成因不存在）。

### DEC-2：双评审条件处置（A-1…A-6 / B-1…B-5）

**采纳（全按推荐，批准轮落正文）**：**A-1（P1）**——§3.2/§3.3 按 GTL1 A-3 口径体例**逐锚点登记
「渐近稳态 vs t=60 采样」两口径**（v4 全部 t=60 采样锚点将随暂态路径变化偏离 v3 冻结值；
「actuator 钳位稳态 18.266 kW 类锚点不变」改注「渐近稳态不变、t=60 采样值由 v4 emit 重冻结」）；
**A-2**——「逐位同」措辞与 T-B 制度一致化（单实现结构恒等可逐位；跨实现改「±1e-9 内逐点恒定」
或声明「同运算序复刻」限定——与 §4 项 3「禁 ULP 级承诺」对齐）；**A-3**——τ_comb 判据框架
五→七项（+3D 闭环稳定性/窗内收敛判据 + 输出网格可辨性下限：相位滞后 ≥ 数个 dt=0.1 采样，
域扫描输出量化证据）；**A-4**——GCMB 增 GL-6 同构 gap 检查（f(60) vs 50−b，界随 τ_comb 重推）；
**A-5**——engine.js:320-322 字面三值守卫勘正（须 additive 编辑）；**A-6**——gt001_v3 波次归属
表述订正；**B-1**——三处守卫面（engine.js:320-324/schema.js:231-234/scenario.js:401-402 消息串）
additive 或改引常量重构（显式登记）+ §8 工作面同步；**B-2**——§2 config_hash 投影行失实订正
（inertia_model 现状在投影内）+ §1.1 对照表增「config_hash 轨区分面」行；**B-3**——行号/引用
精度五处勘正；**B-4**——「P0 验收路由」改「深化轨验收锚点路由」（GT 无 approved_p0 面）；
**B-5**——sensor 采样锚点逐点点名补登记（定量随 A-1 体例）。

### DEC-3：常量定案与 Q1…Q13 定案

**采纳（推荐，一处否决）**：Q1=形态 a；Q2=新值命名 **"thermo_comb"**；Q3=一阶滞后+新 ODE 状态
（A5 原文形态）；Q4=EQ-GTL2-1…n 全集自含；Q5=gt001_comb_oracle.py；Q6=GCMB-1…n 新段；Q7=
MODELS["gt001_comb"] 新条目 + DEFAULT_MODELS 尾追加（verify_golden.py:246 现值四 golden 实读
⇒ 五 golden）；Q8=镜像 gt001_v3 全集 6 Run；Q9=T-B+降 T-C 双向预案（gate 键面=gt001_v3 十键
镜像——零新信号下零缺口预期）；Q10=零新信号（教学面经 T4_out_K × P_gen_cmd_kW 相位差承载）；
Q11=x_comb(0)=k_f·u(0)（健康局/monitor 与 v3 逐位同承载）；**Q12=否决草案推荐（1.3.0 升位）、
定案维持 model_version '1.2.0' 仅登记**——model_version 在 model_hash 九字段内（engine.js:559-569
实读），SystemDef 升位即既有 GT 输入 run_hash 变化 = §3.2 breaking；golden v4 元数据同值、语义由
golden_id 承载（FC Q1=B/FL 同构；偏离草案推荐的理由随批准 CHG 登记）；Q13=精确式三子项随
EQ-GTL2 冻结文本批准轮定案。**τ_comb 数值定案**（批准轮）：七项判据域扫描证据（有意异值可辨识/
60 s 窗可见/RK4 步长裕度/|Δf|≤1 Hz 全窗重扫/包络重推/**3D 闭环稳定性+窗内收敛**/**网格可辨性
下限**——A-3）+ GL-6 类 gap 界重推（A-4）+ 新界 46.4741→延迟下重推导（如涉）——python -I 临时
脚本、TEMP、用后删、证据入 §1.3/§3.3。

### DEC-4：步数账（I-7）

**采纳（推荐）**：run-g2 **35 → 35（0 新步）**——verify_golden gt001_comb 并入步①（DEFAULT_MODELS
五 golden）；on_comb 变体并入 tests/engine-gt.test.js 既有步 21；预算维持 ≤35 申报 0 增步；
FIRST-35 机检既有 35 步零改动；标签滞后维持登记不修。

### DEC-5：additive 三不承诺 + push 状态

**采纳（推荐）**：① 五类哈希既有合法输入零变化（thermo 轨与 gt001_v3 逐位同硬条件 + 默认轨不
翻转 + 三处守卫 additive 探针 + model_hash 零变化——capacity 子对象形态同构）；② 既有 11 golden
字节零触碰；③ 既有 35 步判据零翻转。push 五批同批暂缓延续（v0.7.1–v1.5.0），本波产出并入同批；
v1.6.0 发布本地提交随 CHG-20261114-08 同口径。

## 2. 波次派发（并发子智能体）

**派发前置机检（2026-11-14 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；工作树
clean（HEAD=206f227）——无已有进程冲突。全程不 push、不触碰 data/golden/ 既有 11 文件字节、
文件面互斥；**代理中断降级路径**：中断路改主线接管（W8 先例）。

```text
阶段一（P2 批准轮收口）
  W1 P3 批准轮收口 → 条件 6+5 落正文 + 键形态裁定落定案 + τ_comb 定案（七项域扫描证据）
                      + Q1…Q13 定案（Q12 否决草案推荐）+ §10 用户批准行回填 + 更名 APPROVED v1.0
阶段二（实现轮，文件面互斥）
  W2 oracle 面     → tools/oracle/gt001_comb_oracle.py 新建 + verify_golden.py（import+注册行+
                      DEFAULT_MODELS 五 golden+docstring）+ data/golden/gt001_v4.json/.sha256
  W3 引擎/系统/场景 → src/core/engine.js（inertia 枚举守卫 additive+thermo_comb 分支+三维 RK4）、
                      systems.js（combustion 子对象+assumptions/limitations/EQ-GTL2——model_hash 域外）、
                      scenario.js（INERTIA_MODELS 扩值）、schema.js（字面守卫 additive）—— scope.js 零触碰
  W4 测试面        → tests/engine-gt.test.js on_comb 节（四元映射+thermo 逐位+锚点+守卫）
                      + scenario/schema 增量——0 新步
  W5 UI/镜像/文档  → scenario inertia 选择器（新值自动出列核实）+ system 页 combustion 面板（如规格
                      UI 变体有）+ e2e/file-smoke/walkthrough 镜像 + docs/FAULT_CATALOG.md（§3 GT 注记行+版本）
阶段三（收尾与发布门）
  W6 门禁与证据    → run-g2 35/35 两次独立 + verify_golden 全注册行 + copy-guard + file-smoke/
                      walkthrough/e2e + evidence/g8/v160-release.md + DECISIONS.md CHG-20261114-08
                      + V1_FACES additive（§13 记录）+ P3 规格 §8 状态回填
```

**文件面互不相交声明**：W1 独占 P3 规格文件；W2 独占 gt001_comb_oracle.py+verify_golden.py+golden
新文件；W3 独占 engine/systems/scenario/schema（scope.js 禁触）；W4 独占 tests/**；W5 独占 src/ui/**
+FAULT_CATALOG+e2e/file-smoke/walkthrough；W6 独占 V1_FACES/DECISIONS/evidence/FaultLab.html+P3
规格 §8 状态面——**互不相交**。

**并发度说明**：主机并发额度=1（实测）；依赖序串行（W1→W2→W3→W4→W5→W6）；中断路改主线接管
（W8 先例）。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 35 步不变（0 新步）；步① 五 golden；步 21 断言数增 |
| verify_golden | MODELS 9→10 注册行；DEFAULT_MODELS 四→五 golden；**零新 gate 分支预期**（零新信号、27 列同集——emit 后路由审计证明） |
| golden 库 | 11→12（gt001_v4 新 id schema v2 T-B）；gt001_v1/v2/v3 字节冻结维持 |
| inertia 枚举 | 3→4 值（+thermo_comb）；三处字面守卫 additive；既有三值路径零变化（探针） |
| model_hash | 零变化（combustion 声明面挂子对象域外；model_version 维持 1.2.0——Q12 定案） |
| 测试面 | engine-gt on_comb 节并入；其余文件零改动全绿 |
| V1_FACES | 面① GT 画像行注记、面② golden 11→12、§13 v1.6.0 additive 修订记录 |
| FaultLab.html | 1736.7 KiB → 增 |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | τ_comb 整定失当（|Δf| 破界/振荡/不可辨识） | 七项判据域扫描 + GCMB-8 emit 硬条件 + 稳定小根先例 + A-3 两条新增判据 |
| 2 | T-B 双实现散差超预案（三维耦合 libm 差异） | GCMB-7 实测冻结 ×≥10 + 降 T-C 双向预案 |
| 3 | 三处守卫 additive 扰动既有三值路径 | 既有值路径探针零变化 + 负例断言（W4）+ B-1 处置形态 |
| 4 | gt001_v1/v2/v3 误触 | 不动清单 + thermo 轨逐位验收 + verify_golden 既有行复验 |
| 5 | Q12 误升位致 model_hash 变化 | DEC-3 显式否决 + 探针（model_hash 改前/改后同值） |
| 6 | 主机并发额度/代理中断 | 主线接管降级路径（W8 先例） |
| 7 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V160_WAVE_DESIGN v1（2026-11-14，CHG-20261114-07 批准，按推荐执行）。
