# v1.9.0 发布验收记录（G7→G8 — 2026-11-15，CHG-20261115-11）

> **门禁**：G7（回归，run-g2 35 步 0 新步）→ G8（发布门）。
> **性质**：本记录是版本发布验收 = 内部一致性与可复核性证据，**不是模型验证、不是物理守恒
> 验证、不是硬件验证**。`model_provenance`（fc001_fmu_v1 = `fmu_l1_lumped_unvalidated`）、
> `model_validation=not_performed`、`hardware_verification=not_performed` 声明随发布材料保留；
> FMU 轨定位句 = **行为与数值集总参数演示模型（未经实验/硬件验证）——数值与实现自洽 only**。
> **候选提交（被测试代码）**：主工作树 v1.9.0 波变更集（本记录 §1 全部门禁在该变更集实跑）。
> **授权**：V190_WAVE_DESIGN v1（CHG-20261115-09——用户承接清单 + AskUserQuestion 裁定
> 「收口批准轮后 emit」）+ FCFMU-G2b-02 批准轮（CHG-20261115-10）。
> **验收日期**：2026-11-15 · 记录人：Lead Agent（V190 承接会话）。

## 1. 门禁全表（全部真实运行）

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1757.0 KiB**（css=10 js=34；js+1 = v1.7.0 plants/gt001.js 注册；两次构建字节一致） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS，exit 0 ×2**（109787 / 111396 ms）——**0 新步**（35 步维持；步① 六 golden 序列含 fc001_fmu 尾追加；步 21 断言维持） |
| 3 | `python -I scripts/verify_golden.py` 默认调用 | **六 golden 顺序验证 exit 0**（fl001 + fl001_l1 + fc001_l1 + fl001_cap + gt001_comb + fc001_fmu；out/v190-vg-default.json 存档） |
| 4 | verify_golden 逐模型 ×11 注册行 | **11 次调用全 exit 0**（fl001/fl001_l1/fc001/fc001_l1/fl001_cap/gt001/gt001_comb/pv001/wt001/mg001 + **fc001_fmu**）——fc001_fmu V-01…V-09 全过（V-03 oracle 源哈希一致、V-03b approval 摘要一致、V-04 FMU-1…7 全过、V-05 关键点 T-B、V-07 601 点全精度、V-09 pre/post 快照） |
| 5 | `node tools/copy-guard.mjs` | **PASS: no banned copy in src/** (39 patterns)**——39/14 维持（Q11 四词入表 = FCFMU-G2b-04 面，本波零增词） |
| 6 | oracle 自检 | `python -I tools/oracle/fc001_fmu_oracle.py --self-check` **FMU-1…7 全过**（FMU-1 标称恒等 observed 0.0；FMU-2 恒等式 0.0；FMU-6 半步收敛 2.13e-12） |
| 7 | S3 位级验收（R-G9-01 扩展面） | verify-i11-bitidentity **GT 扩展套件 46 配置 × 3 字段改前/改后 138/138 全等**（fa05562 改前快照 vs wiring 后——四 family × closed_loop/monitor × 四 inertia_model + actuator t_clear 两例；既有 12 配置含于套件前 12 项） |
| 8 | Arena 协议负例 | `node tests/arena-protocol-negative.test.js` **97/97 PASS**（N-B1…N-B17 冻结 + N-B18/N-B19 V150 增补 + **G10 L2 N-B20…N-B23** + MVP smoke + O-1 smoke + QP-4 实测） |
| 9 | G10 MCP server 自检 | `node tools/arena-mcp-server.mjs --self-check` **MS-1…7 全过**（air-gap 导入面 / 盲包校验 / beacon 31 行 / 边界行永不跳过 / K×M 记账 / B_max=180 硬帽 / 封章+篡改拒收） |
| 10 | L2 端到端正例 | gen --l2（双层盲包）→ 会话切片（onset 12 行含 2 边界行 / 传播 10 行）→ 封存导出 → arena2-verify L2 链 **落章 96.59 分**（S_diag 50 + S_anchor 30（V-11a+b）+ S_eff 16.59——(180−68)/135 效率加权；score_hash fd4f5396…） |
| 11 | 既有 12 golden 字节冻结 | **零触碰实证**（git status data/golden/ 仅新增 fc001_fmu_v1.json(+.sha256)——既有 12 文件零修改） |
| 12 | 测试面 | run-g2 全套（23 文件）全绿——含 engine-gt（S3 wiring 后位级恒等）、arena（加载面修复后）、plants（GT 守卫五断言）、arena-protocol-negative（97） |

## 2. 交付清单（V190_WAVE_DESIGN §0 逐项）

1. **S3 track wiring 四轨**：engine.js GT 三函数壳面消费 plants/gt001.js（bAt/demandAt/
   fGovAt/govStep/cappedAt；foStep 与物理常数留 engine）——位级 138/138 + run-g2 双跑全绿；
   arena.test.js CORE_FILES 注册缺口补（v1.7.0 遗留发现）+ plants.test.js GT 守卫；
2. **G9 批准轮收口（FCFMU-G2b-02）**：独立评审 B PASS_WITH_CONDITIONS(3)（子代理补位——
   evidence/g2b/FCFMU_G2B_REVIEW_B.md）+ 条件 A-1…A-7/B-1…B-3 落正文 + Q1…Q18 按推荐定案
   + 评审 A P1 修正（Run-4 闭环平衡 280 mL / θ_max≈0.516 / 二次项零触发——θ>0.60 叙事归
   Run-5 t≈47 s，本波 oracle 实测 crossing t=47.6 s 佐证）+ git mv 更名
   **FC001_FMU_G2B_SPEC_APPROVED v1.0**（477→536 行）；
3. **G9 oracle emit（FCFMU-G2b-03）**：tools/oracle/fc001_fmu_oracle.py（5 态 RK4 δt=0.01/
   Δt=0.1 ZOH + I-11 壳 + pre/post 左极限分裂 + FMU-1…7）+ **data/golden/fc001_fmu_v1.json**
   （1,310,059 B + sidecar LF 钉死；approval 首签引 CHG-20261115-10 链）+ verify_golden
   MODELS["fc001_fmu"] 注册 + DEFAULT_MODELS 尾追加 + T-B `_mL` 分支（V_mL_atol——插入点
   `_kPa` 后、r_true/r_meas 子串判别前，修复 r_meas_water_mL 静默量纲错型——评审 B P1）+
   dim 支（dim_atol）+ FAULT_CATALOG §2 L1-FMU 第三轨注记；
4. **G10 Arena L2 基础设施**：tools/arena-l2-core.mjs（共享核心单源）+ arena2-gen --l2
   （双层遥测——coarse_beacon 2.0 s / high_res_store 0.1 s + 边界行源自 run.snapshots
   左极限快照）+ arena-mcp-server.mjs（stdio JSON-RPC 2.0 MCP + air-gap + B_max=180 +
   query_ledger 封存）+ arena2-verify（L2 自动分派 + --session 批校验）+ 负例 N-B20…N-B23
   （**编号重基线：原文 N-B18..20 → 仓内 N-B20..22——V150 N-B18/19 冻结维持**）+ V-11a/b；
   **R-G10-02 外部 Agent 会话维持 pending 登记**（外部依赖项——evidence/g10/ 归档复验面
   就绪）；L0 轨 rule_id = 因果模板节点 id 结构面（语义匹配随 FMU 轨 G2b-04——登记不虚设）；
5. **G9 C99 阻塞维持登记**：gcc/cc/cl 2026-11-15 复测均不可用——编译/parity/FMU 打包顺延
   （Q10 定案按用户环境实况裁定）；预烘焙 JSON bundle 兜底路径裁定采 G0-V05-DEC-01
   （file:// 模式 golden 档案只读）；fc001_l1.c 不交付（未经编译验证工件——V180 DEC-3
   「编写可先行」推荐项否决登记）；
6. **推送项闭合登记**：reflog 实证 71056ae/0828de8/fa05562 三次 "update by push"（2026-11-15
   13:37–13:54）——九版本同批暂缓由实际推送闭合（CHG-20261115-08 ③）；本波产出之后推送
   按届时用户指令；
7. **收口面补齐**：v180-release.md 复跑补建（分离工作树 fa05562——本记录姊妹文件）+
   V1_FACES §14/§15/§16 + CHG-20261115-08/09/10/11 台账链 + V06_ROADMAP v1.9.0 行。

## 3. additive 三不承诺兑现

- **五类哈希既有合法输入零变化**：S3 wiring 纯组织重构（无 cfg/schema/registry 键面变化——
  位级 138/138 为证）；fc001_fmu_v1 走 runHashInput 既有清单零新增键（golden 为 oracle 侧
  工件，不触 engine 哈希面）；scenario.js 本波零触碰；
- **既有 12 golden 字节零触碰**：git status 实证（§1 项 11）；
- **35 步判据零翻转**：verify_golden gate 分支 additive（`_mL`/dim 支仅当 gate 声明新键
  时激活——既有 10 模型全部回归 OK 为证）；run-g2 35 步 0 新步。

## 4. 预期失效面兑现核对（V190 §3）

| 面 | 计划 | 实际 |
|---|---|---|
| GT 四轨 | 消费面替换位级恒等 | ✓ 138/138 |
| golden 库 | 12→13 | ✓ fc001_fmu_v1 入库（1,310,059 B） |
| verify_golden | MODELS 10→11 + DEFAULT 五→六 + gate 分支 additive | ✓ 全链绿 |
| run-g2 | 35 步不变 | ✓ ×2 |
| 工具面 | arena-mcp-server 新建 + gen/verify 扩展 | ✓（+ arena-l2-core.mjs 共享核心——原文矩阵外 +1 文件，映射登记） |
| 规格面 | 更名 APPROVED v1.0 | ✓（477→536 行） |
| V1_FACES | §14/§15/§16 | ✓ |

## 5. 发布定位

FaultLab v1.9.0 = 八面冻结下第九个 additive/minor 发布——S3 四轨组织重构（零行为变化）+
FC-001 FMU 第三轨 oracle/golden 面 + Arena L2 评测基础设施；**不代表**真实设备或物理模型
已完成验证；FMU 轨全部输出 synthetic（fmu_l1_lumped_unvalidated）。

**文件结束**（2026-11-15，记录人：Lead Agent——V190 承接会话）。
