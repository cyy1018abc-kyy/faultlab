# V190_WAVE_DESIGN — v1.9.0 实现波设计（S3 track wiring 四轨 + G9 批准轮收口与 oracle emit + G10 Arena L2 基础设施）

> **性质**：阶段设计文档（Lead 起草，2026-11-15）——V180 波（v1.8.0，commit fa05562）后首波。
> **八面冻结下第九个 additive 波（MINOR）**。
> **授权记录（CHG-20261115-09）**：用户 2026-11-15 v1.9.0 待办承接清单（六项）+ **G9 emit 前置
> AskUserQuestion 裁定 = 「收口批准轮后 emit」**——**DEC-1…8 全采推荐项**。
> **推送状态**：**已被事件超越**——reflog 实证 71056ae / 0828de8 / fa05562 三次 "update by push"
> 成功（2026-11-15 13:37:23 / 13:42:40 / 13:54:57，origin/main = fa05562 = 本地 main）——
> 「v0.7.1–v1.8.0 九版本同批暂缓」登记由实际推送闭合，无待推送内容（DEC-6 如实登记）。
> **输入**：FC001_FMU_G2B_SPEC_DRAFT v0.1（含评审 A PASS_WITH_CONDITIONS(7) 回填）、
> G9_G10_ARCH_GATE_SPEC_DRAFT（落档原文）、V180 收口（CHG-20261115-07 + fa05562）、
> plants/gt001.js 适配器（v1.7.0 交付物）、verify-i11-bitidentity.mjs（12 配置矩阵）。

---

## 0. 本波边界

**做**：
1. **S3 track wiring**（主线一）：GT **四轨**（swing/linear/thermo/thermo_comb）消费
   plants/gt001.js 适配器（bAt/demandAt/fGovAt/govStep/cappedAt 替换三段内联闭包；发电机
   一阶滞后 foStep 与物理常数面留 engine——适配器头注既有边界）；位级验收 = verify-i11-bitidentity
   **GT 扩展矩阵**（既有 12 配置 + GT 4 family × closed_loop/monitor × 四 inertia_model +
   actuator t_clear 变体）改前/改后快照逐字段全等；
2. **G9 批准轮收口（FCFMU-G2b-02）→ oracle emit（FCFMU-G2b-03）**（主线二）：独立评审 B
   补位（治理/契约面，与评审 A 结论互不可见）→ Q1…Q17 **按草案推荐定案**（用户裁定链）+
   评审 A P1 修正落正文（Run-4 叙事归 Run-5 t≈47 s——闭环平衡 280 mL / θ_max≈0.516 /
   二次项零触发）+ 更名 `FC001_FMU_G2B_SPEC_APPROVED v1.0` → `tools/oracle/fc001_fmu_oracle.py`
   （oracle_base 出生接入 + 5 态 RK4 δt=0.01/Δt=0.1 + I-11 壳 + pre/post 左极限分裂 +
   FMU-1…n 自检）+ `fc001_fmu_v1` golden emit（601 点 × 5 Run + 事件快照相位承载）+
   verify_golden MODELS["fc001_fmu"] 注册 + DEFAULT_MODELS 尾追加 + `_mL`/无量纲 gate 分支
   additive（Q15——含 r_true/r_meas **子串分支先行**的机械路径修正：三分派序 = `_kPa` 后、
   子串支前插 `_mL` 支）；
3. **G10 Arena L2 基础设施**（主线三）：arena2-gen 双层遥测（coarse_beacon 2.0 s / high_res_store
   0.1 s 含 pre/post 双边界行）+ arena-mcp-server.mjs（stdio MCP、air-gap 守卫、B_max=180
   预算帽、query_ledger 封存）+ arena2-verify N-B18…20（无据锚点/预算超支/账本重放哈希）+
   V-11a/b（onset/propagation 锚点接地加分）+ 负例套件扩展测试；R-G10-02 外部 Agent 会话
   维持 pending 登记（外部依赖项，非本波阻塞）；
4. **G9 C99 阻塞维持登记**：gcc/cc/cl 2026-11-15 复测均不可用（本波复测）——fc001_l1.c 编译/
   parity/FMU 打包顺延待工具链（Q10 维持用户环境裁定）；预烘焙 JSON bundle 兜底路径裁定 =
   采 G0-V05-DEC-01（file:// 离线模式 golden 档案即 bundle 源，零编译依赖维持）；
5. **收口面补齐**：CHG-20261115-08 回填（v1.8.0 发布如实登记——发布提交 fa05562 为治理面
   三文件，门禁在上一会话实跑、evidence 文件/台账行/V1_FACES 记录三缺口本波以 HEAD 复跑
   方式补齐，不伪造时点）；V1_FACES §14（v1.7.0）/§15（v1.8.0）/§16（v1.9.0）补记。

**不做**：G9 C99 内核编译（阻塞）、R-G10-02 外部 Agent 会话（外部依赖）、C3 真 TESPy（挂起
维持）、L2 物理轨扩张、推送（已闭合——DEC-6）。

**版本**：v1.9.0（MINOR——fc001_fmu_v1 新 golden 新 id + S3 组织重构零行为变化 + G10 新工具
面（tools/** 非产品 src）+ 新 oracle 文件）。

## 1. 决策点（全采推荐项）

### DEC-1：S3 track wiring 范围 = GT 四轨
**采纳（推荐）**：用户承接清单明示「GT 四轨消费」+ fa05562 顺延登记（thermo/comb/swing/linear）。
适配器六函数与三段内联闭包逐字同构（v1.7.0 烟测 + 本波改前快照双证）；swing/linear 的
foStep（发电机一阶滞后）与 KJ/tau_g/物理常数留 engine（适配器头注既有边界——V180 DEC-1 的
「swing/linear 维持内联」由四轨扩裁定取代，其 foStep 除外语义不变）。
位级验收 = GT 扩展矩阵改前/改后全等 + 既有 12 配置基线（evidence/g8/i11-bitidentity）回归。

### DEC-2：G9 批准轮收口后 emit（用户 AskUserQuestion 裁定 2026-11-15）
**采纳（用户裁定 = 推荐项）**：fc001_fmu_v1 emit 将 Q 裁定烘焙进字节且入库后禁止重 emit
（CHG-20261115-02 ③）⇒ 批准轮 FCFMU-G2b-02 先收口（Q1…Q17 按推荐定案——先例
GTL1-G2b-02/CHG-20261114-07 指令链同款；评审 B 独立补位；P1 修正落正文；更名 APPROVED v1.0）
→ FCFMU-G2b-03 oracle emit（approval 首签引批准 CHG）。V180 DEC-2「oracle 先行」的排序
张力由本裁定收束。

### DEC-3：G10 基础设施本波实施，R-G10-02 维持 pending
**采纳（推荐）**：基础设施自包含（gen/verify/负例测试全离线可验）；外部 Agent 评测会话
（eval-session-002）为外部依赖项——登记维持，不阻塞基础设施交付与机检。

### DEC-4：G9 C99 阻塞维持 + 预烘焙兜底裁定
**采纳（推荐）**：2026-11-15 本波复测 gcc/cc/cl 均不可用（V180 登记维持）——C99 内核不写
（不交付未经编译验证的 C 代码；V180 DEC-3「编写可先行」推荐项由本波改为不执行——未验证
工件入库与数据诚实性纪律张力，登记为推荐项否决）；预烘焙 JSON bundle 兜底路径裁定采
G0-V05-DEC-01：file:// 模式 FMU 轨 = golden 档案只读（fc001_fmu_v1 即 bundle 源），编译/
parity/FMU 打包待工具链到位后按 Q10 裁定补做。

### DEC-5：C3 真 TESPy 挂起维持
**采纳（推荐）**：沿袭登记——TESPy 对照轨道维持挂起（用户 backlog 第 5 项「挂起维持」）。

### DEC-6：推送项 = 已被事件超越（登记闭合）
**采纳（推荐）**：reflog 实证 2026-11-15 13:37–13:54 三次 push 成功（71056ae/0828de8/
fa05562），origin/main = 本地 main = fa05562——「九版本同批暂缓」由实际推送闭合；本波产出
之后的推送按届时用户指令（不再沿用同批暂缓句式——该句式已失效）。

### DEC-7：步数账 + additive 三不承诺
**采纳（推荐）**：run-g2 35→35 零增步（S3 组织重构 / G10 工具面 / oracle 新文件均不入门禁；
G10 负例套件走 tests/ 文件面不进 run-g2 步账）；五类哈希既有合法输入零变化（fc001_fmu_v1
走 runHashInput 既有清单零新增键 + B-1a 显式键纪律）；既有 12 golden 字节零触碰（fc001_fmu_v1
新 id 并列第三轨）；35 步判据零翻转（gate 分支 additive——`_mL`/无量纲支仅当 gate 声明新键
时激活，既有键路由逐字节不变——FCECH `_V`/FLCAP `_kWh` 先例同构）。

### DEC-8：收口面补齐方式 = HEAD 复跑，不伪造时点
**采纳（推荐）**：CHG-20261115-08 回填如实登记（v1.8.0 发布 = 治理面三文件提交 fa05562；
上一会话门禁实跑、证据文件未落盘）；v180-release.md 以本波 HEAD 复跑门禁方式补建（记录
「复跑时点 = 本波收口轮」，不虚构原发布时点运行）；V1_FACES §14/§15/§16 三记录补齐。

## 2. 波次派发

```text
W1 S3 wiring（主线一）→ 四轨消费改造 + GT 扩展位级矩阵（改前/改后）+ 全量回归
W2a G9 批准轮（主线二前段）→ 独立评审 B（子代理后台，与 A 结论互不可见）→ Q 定案 +
    P1 修正 + 更名 APPROVED v1.0
W2b G9 oracle（主线二后段）→ fc001_fmu_oracle.py + FMU 自检 + fc001_fmu_v1 emit +
    verify_golden 注册 + gate 键面 additive + FAULT_CATALOG 注记
W3 G10 基础设施（主线三）→ arena2-gen 双层遥测 + arena-mcp-server + arena2-verify
    N-B18..20 + V-11 + 负例套件扩展
W4 发布门 → run-g2 35/35 ×2 + verify_golden 全注册行 + copy-guard + 测试面全绿 +
    v180-release.md 补建 + v190-release.md + V1_FACES §14/§15/§16 + CHG-20261115-10 + commit
```

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| GT 四轨 | 消费面替换（位级恒等——GT 扩展矩阵全等证）；物理方程零变更 |
| golden 库 | 12→13（fc001_fmu_v1 新 id schema v2；既有 12 字节冻结） |
| verify_golden | MODELS 10→11 注册行 + DEFAULT_MODELS 五→六 + `_mL`/无量纲 gate 分支 additive |
| run-g2 | 35 步不变（0 新步） |
| 工具面 | tools/arena-mcp-server.mjs 新建 + arena2-gen/arena2-verify 扩展（非产品 src 面） |
| 规格面 | FC001_FMU spec 更名 APPROVED v1.0（Q 定案 + P1 修正落正文） |
| V1_FACES | §14/§15/§16 补记（v1.7.0/v1.8.0/v1.9.0） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | S3 四轨迁移破坏位级恒等 | 改前/改后 GT 扩展矩阵快照 + 既有 12 基线回归 + 全量测试兜底 |
| 2 | G9 oracle 5 态方程实现偏差 | APPROVED 冻结表逐字 + 稳态点解析核验 + FMU-1…n 自检 + monitor 不变量 |
| 3 | Q15 gate 键面机械路径与登记不符（`*_mL` 键实落 r_true/r_meas 子串支） | 本波实读修正——`_mL` 支插于 `_kPa` 后、子串支前；既有键路由零变化证明随实现提交 |
| 4 | fc001_fmu_v1 emit 后不可重 emit（字节冻结） | 批准轮先收口（DEC-2 用户裁定）+ FMU 自检全过方落盘 + sidecar LF 钉死 |
| 5 | G10 预算/账本协议实现歧义 | N-B01..17 既有负例全绿为回归底线 + N-B18..20 规格原文逐字转写 + self-check |
| 6 | 收口面补齐被误读为伪造证据 | DEC-8——v180-release.md 显式标注「HEAD 复跑补建」+ CHG-20261115-08 如实登记 |

**文件结束**。V190_WAVE_DESIGN v1（2026-11-15，CHG-20261115-09 批准，按推荐执行——含用户
AskUserQuestion 裁定 DEC-2）。
