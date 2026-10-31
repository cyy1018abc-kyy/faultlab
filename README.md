# FaultLab — Virtual Energy Lab · v0.3.1

> 亲手制造故障，观察系统反应。离线可运行的能源系统故障注入与传播解释实验场。
>
> **数据性质声明**：FaultLab 是**解析行为级（L0）演示**（`model_provenance=analytical_demo`），
> 数据为解析模型生成的合成示例数据（synthetic）：非 Simulink、非实测（无实测对比）、未做模型验证
> （`model_validation=not_performed`）、未做硬件验证（`hardware_verification=not_performed`）。
> 所有数字带来源标签；「内部一致性检查通过」不等于模型验证，更不等于与真实设备一致。

> **范围与状态（v0.3.1 补丁：2026-10-30；v0.3.0 发布：G8 关闭 2026-10-30；基线历史：G0 批准 2026-10-27 / G2 实施记录 2026-10-28 / G5 关闭 2026-10-28）**
> - **发布版本 v0.3.1**（标签 `v0.3.1`，补丁）：GT-001 按批准规格实现（f_channel_diff_Hz 通道差改造、
>   gt001_v1 golden ±1e-9、GT PHY 检查）、FL-001 load_step 删除（O-13）、FL-19 后端对照
>   （B-1/B-5 + HTTP 桥 + 对比页「后端对照」入口，扩展预览）、上游勘误、性能门禁；发布证据
>   `evidence/g8/v031-release.md`。
> - **v0.3.0 基线**（标签 `v0.3.0`）：**稳定性 / 可复现性 / 可追溯性发布**——不新增产品功能、
>   不改架构、不新增物理模型、不做 FC-001 升级、不重建单文件 `FaultLab.html`。发布门 G8 就绪检查单
>   R-01…R-10 关闭；证据见 `FaultLab-evaluation/NEXT/evidence/g8/README.md`（证据索引）与
>   `evidence/g8/g8-release-checklist.md`（就绪检查单）。
> - **V0.3.0 验证摘要（仅内部一致性与可复现性证据，非模型验证/硬件验证）**：候选提交
>   `1a8c1aee4f95d9e1d867fd318bc5114ee4330443` 上 `node tools/run-g2.mjs` **19/19 PASS**
>   （ok=true / failed=0 / worktree_dirty=false；报告 `artifacts/run-g2-report.json`
>   `2026-10-30T10:49:10.226Z`，含 commit/branch/worktree/node/python 追溯字段）；I-11 Plant 接口
>   对基线 `7aed9f6` **12/12 配置 · 36/36 字段**（`run_hash` / `signals_sha256` / `metrics_sha256`
>   逐位一致；`engine_version` 维持 0.1.0）；双 golden（fl001/fc001）`verify_golden` exit 0、
>   `copy-guard` exit 0（29 模式）、EvidenceBundle v1 复核链不变；Chrome 155.0.8059.85 /
>   Edge 155.0.4283.62 各 E2E **40/40**（同一候选提交，worktree_dirty=false）。
> - **P0 验收基线（唯一验收路径）**：`FL-001` × 3 组固定 Run（`baseline` / `closed_loop_fault` / `monitor_only`）
>   × 5 逻辑视图 × 单一时钟 × 事件 pre/post（20.0−/20.0+）× 因果证据跳转 × 对比白名单 × 证据包导出/重载 × golden 校验。
> - **G2 四件套已按批准规格实施并全绿**（2026-10-28）：独立 oracle + golden v1、Schema/单位字典、
>   RunRegistry/规范哈希、浏览器 E2E；证据见 `FaultLab-evaluation/NEXT/evidence/g2/`。
>   这是**内部一致性与可复核性证据**；G2/G3 门禁关闭裁决仍以 Lead/用户对证据包的复核为准。
> - **FC-001 / GT-001 / load_step / actuator_fault / Agent Arena 为扩展预览（P1/P2）**，携带
>   `scope='extension_preview'` 标注，不进入 P0 验收；**GT-001 已按 G2b 批准规格实现（f_channel_diff 通道差改造 + gt001_v1 golden 六 Run ±1e-9 +
  engine-gt 90/90 + 清除恢复锚点 §9 定案）；仍为扩展预览，不进入 P0 验收**；**FC-001 已升正式验收
  （V3-04，model_version=1.1.0，scope=approved_fc）**
>   （`FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md`）。
> - 旧原型自检的测试 PASS 数字已从本 README 移出（不得作为验收证据引用）；历史记录见
>   `artifacts/QA_REPORT.md` 与 git 历史。

---

## 1. 这是什么

纯浏览器、零第三方依赖、可离线运行的虚拟能源故障实验平台：

- **P0 主实验（FL-001 电池储能）**：20.0 s 电池电流传感器 +10 A 偏置；闭环 / 仅监测 / 无故障三组固定对照。
- **观察系统反应**：真实功率流、测量链、控制回路如何相互作用；同一全局时间线回放 0–60 s。
- **核对每一个数字**：真值 / 观测 / 推断分离，每个信号带 `source_kind` 与 `exposure`；结论可回溯到
  `run_id + 变量 + 时间窗`；Run 创建后深度冻结，`config_hash` / `model_hash` / `run_hash` 可复核。
- **因果解释**：按版本化模型规则（`rule_id`）解释已知故障的传播路径，附证据与假设；无模型支撑时显示
  「本模型无法推导该现象」。本页不做检测/定位/诊断，无检出率与延迟指标。
- **对比白名单**：仅允许批准的差异（基准↔故障：fault/bias；闭环↔仅监测：feedback_mode）；
  其余差异判定 `incomparable`，禁用差值图与因果断言。
- **证据包 v1**：导出 7 个数据文件 + `SHA256SUMS.txt`；第三方可离线复核（校验和 → Schema → 重算指标
  → `run_hash` 比对）。哈希是内容校验和，不代表签名/来源/第三方认证。
- **Agent 竞技场（P2 扩展预览）**：合成场景盲测评测游戏，非真实诊断性能。

## 2. 快速开始（无 MATLAB、无网络、无 npm）

```powershell
# 方式一（推荐，开发者/验收）
python -m http.server 4318            # 或 python tools/serve.py
# 浏览器打开 http://127.0.0.1:4318/    （Windows 10/11 + Chrome/Edge 最近两个大版本）

# 方式二：直接打开 index.html（file:// 双击可用；剪贴板等 API 可能受浏览器安全限制）

# 演示/QA 深链接
#   ?demo=1&page=system&t=21   自动创建默认故障 Run 并定位 21 s
#   ?demo=1&page=signals       曲线页（自动带 Run + 基准 Run）
#   ?system=FC-001 / ?reset=1  切换系统 / 清空本地存档
```

> 单文件 `FaultLab.html` 为**原型期构建产物**；单文件交付能力属 P1（P1-05 需重做构建链并与
> 目录版产物/哈希一致后另行验收），当前不作为 P0 交付物。

## 3. 页面一览

| 页面 | 内容 |
|---|---|
| **实验首页** | 系统选择（FL-001 基准；FC/GT 扩展预览）、实验目标、模型假设抽屉、L0 徽标 |
| **系统交互图** | SVG 拓扑与能量流、故障编排（P0 白名单场景）、部件检查器（字段带 source_kind） |
| **实时曲线** | 真/测/派生三线、20.0 s 阶跃不平滑、事件竖线与 pre/post 事件卡、游标、表格模式、CSV（从 Run 取数） |
| **因果解释** | 配置事实横幅 + 六节点因果链（三层认识论标签）、证据跳转（锁定时间窗）、⑥ 代数恒等分支（不是发电机补偿的结果）、+4 kW 教学卡（三量并列） |
| **结果对比** | 三组对照、兼容性检查与白名单裁决（comparable/incomparable）、指标卡（不可用不填 0）、证据包 v1 导出/导入 |
| **Agent 竞技场（EXT）** | 合成场景盲测、确定性演示 Agent、评分；真值封存为 UI 开关（非安全边界） |

## 4. FL-001 基准数值（解析金标准口径，全精度见 `data/golden/fl001_v1.json`）

| 指标 | 无故障 | 闭环 +10 A 偏置 @20 s | 仅监测 +10 A @20 s |
|---|---:|---:|---:|
| 20.0 s 真实电流 | 25 A | 25 A（连续） | 25 A |
| 20.0 s 测量电流 | 25 A | 35 A（post 行） | 35 A |
| 26 s 真实电流 | 25 A | 15.1832 A | 25 A |
| 60 s 电池电能 E_bat,true | 0.166667 kWh | 0.123889 kWh | 0.166667 kWh |
| 60 s 发电机电能 E_gen,true | 0.333333 kWh | 0.376111 kWh | 0.333333 kWh |
| 60 s 真实 SOC | 59.583333% | 59.690278% | 59.583333% |
| SOC 估计误差 | 0 pp | −0.11111 pp | −0.11111 pp |
| 最大真实功率残差 r_true | 0 kW | ≤1e-12 kW（定义自洽） | 0 kW |
| 最大测量一致性残差 r_meas | 0 kW | +4 kW | +4 kW |

> `r_true ≡ 0` 与 `E_gen+E_bat ≡ 0.5 kWh` 是**定义恒等式**（P_gen := P_load − P_bat），
> 不是物理守恒验证。`r_meas = 0.4·b = +4 kW` 是测量通道误差的功率当量（代数恒等），
> 不是能量损失，也不是发电机补偿的结果。

## 5. 数据诚实性设计

- **证据三级分开展示**（G0-DEC-08）：`model_provenance=analytical_demo`、
  `verification.consistency_checks=pass|fail|skipped`、`verification.model_validation=not_performed`、
  `hardware_verification=not_performed`；UI/导出不合并成单一「可信度」徽章。
- **不可变 Run**：Run 创建后深度冻结；参数改动只改草稿；同内容两次运行得到相同 `run_hash`
  （`created_at`/`run_id`/归属字段不入哈希）。
- **事件 pre/post**：`pre` = `t_s=20.0` 左极限（`derivation=left_limit`），`post` = 右采样行；
  19.9 s 只是上一常规采样点；曲线阶跃绘制，不平滑。
- **golden 只读比对**：`data/golden/fl001_v1.json` 由独立 oracle（`tools/oracle/`，不 import 产品代码）
  生成；引擎对 golden 逐点比对（601 点 ×3 Run，rtol 1e-12）。
- **缺失数据不填 0**：显示「不可用」并给出 `unavailable_reason`。
- **范围守卫**：每个 Run/证据包携带 `scope='approved_p0' | 'extension_preview'`
  （SA-24 白名单：FL-001 × sensor_drift/无故障 × +10 A @20.0 s × 30 kW/60% × 60 s/0.1 s）。
- **校验失败不宣称可信**：失败时标注 FAIL，只提供带 FAIL 标签的排障数据；禁止「验证通过」字样。
- **因果解释受模型约束**：无模型支撑显示「本模型无法推导该现象」；因果页不做检测/定位/诊断。

## 6. Agent 竞技场（P2 扩展预览）

- **合成场景盲测**：隐藏故障家族/幅值/时刻/模式（20% 健康局）；Agent 只收 `blind_observable` 观测流；
  `truthSealed` 是 UI 开关，**不是安全边界**（G0-DEC-11）。
- 内置确定性演示 Agent（非 LLM）；评分标「合成故障评测游戏，非真实诊断性能」。
- 协议见 `docs/AGENT_PROTOCOL.md`（P2 注记版）。

## 7. 工程与目录

```text
index.html                     开发入口（脚本按序加载）
css/                           主题令牌与页面样式
src/core/                      hash/schema/scope/protocol/systems/engine/metrics/checks/registry/bundle/
                               arena-protocol（盲评测协议 v2 共享模块）
src/core/plants/               I-11 Plant 适配器（fl001 / fc001；RFC_MODEL_INTERFACE_I11_APPROVED）
src/ui/                        组件库、store、壳层、图表、导出、六个页面
src/agents/                    内置演示 Agent、盲测编排与评分
data/golden/                   golden（oracle 生成；engine 只读比对）
tools/backend/                 FL-19 数值后端（B-1 解析/B-5 RK4）+ Node 适配器（G6 批准）
tools/oracle/                  独立解析 oracle + emit_golden（不 import src/**）
scripts/verify_golden.py       一键 golden 校验（exit 0/1/2）
tools/verify_bundle.py         证据包第三方离线复核
tools/verify-i11-bitidentity.mjs  I-11 移植逐位一致性快照（12 配置 run_hash/signals/metrics；
                               --baseline 基线对照模式，V0.3.0 T2）
tools/e2e.mjs                  CDP headless 浏览器 E2E（fl001-min 旅程，40 断言；报告含浏览器身份与
                               代码版本追溯，V0.3.0 T3）
tools/copy-guard.mjs           禁止词扫描（UI_COPY_GUARDRAILS §6.3）
tools/arena2-gen.mjs           盲评测 v2 测试集/盲包/reveal 生成器（评测轨，G6 已批准）
tools/arena2-verify.mjs        盲评测 v2 可信评测器（V-00…V-10 + score_hash 落章）
tools/run-g2.mjs               G2 四件套聚合器（任一失败非零退出；19 步；报告含 commit/branch/
                               worktree/node/python 追溯字段，V0.3.0 T1）
tests/                         core / arena（既有）+ schema / event-phase / engine / registry /
                               bundle / scope-guard / compare / causal-rules / report / plants（I-11）/
                               arena-protocol-negative（协议 v2 负例 N-B1…B17 + smoke）
FaultLab-evaluation/           G0 决策、G2 规格、V0.3 规划与实施证据（evidence/g2、g4、g5、g6、g7、g8）
docs/CONTRACT.md 等            工程契约与协议（G0 对齐版）
artifacts/                     QA 截图与运行报告（run-g2-report.json / e2e-report.json）
```

### 验证命令（全部离线、零第三方依赖；Windows 10/11 + Python 3.9+ + Node 18+）

```powershell
python tools/oracle/fl001_oracle.py --self-check   # oracle 自检（SC-1..SC-6）
python scripts/verify_golden.py                    # 双 golden 一键校验（默认 fl001；exit 0/1/2）
python scripts/verify_golden.py fc001              # FC-001 golden（G2b-lite 口径）
node tools/run-g2.mjs                              # 四件套聚合：数值/E2E/Registry/Schema + 回归（19 步；含追溯元数据）
node tests/plants.test.js                          # I-11 Plant 适配器接口护栏（83 断言）
node tools/verify-i11-bitidentity.mjs [out.json]   # I-11 逐位一致性快照（12 配置 run_hash/signals/metrics）
node tools/verify-i11-bitidentity.mjs --baseline <baseline.json> --out <comparison.json>
                                                   # 对基线快照逐位对照（36/36 字段；exit 0=一致）
node tools/e2e.mjs [--chrome <浏览器路径>] [--out <证据目录>]  # 浏览器 E2E 单跑（40 断言）
python tools/verify_bundle.py <bundle_dir>         # 第三方复核证据包目录
node tools/copy-guard.mjs                          # 禁止词扫描（命中 exit 1）
node tools/qa.mjs shots                            # 原型期截图走查（历史工具，不作验收）
```

> 通过判据与证据记录见 `FaultLab-evaluation/NEXT/evidence/g8/`（V0.3.0 发布门：`README.md` 证据索引 +
> `g8-release-checklist.md` R-01…R-10）、`evidence/g2/README.md`（G2 四件套）与 `evidence/g4/`。
> 所有「PASS」均为内部一致性/可复核性证据；**不构成模型验证、物理守恒验证或硬件验证**。

## 8. 键盘快捷键

| 按键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | 后退 / 前进 0.1 s |
| Shift + ←/→ | 后退 / 前进 1 s |
| Home / End | 跳到 0 s / 60 s |
| ? | 帮助 |

## 9. 已知局限与未完成项

- **V0.3.0 发布边界**：本版为**稳定性 / 可复现性 / 可追溯性发布**——交付物为测试与证据工具的追溯
  增强（G2 报告代码/环境元数据、I-11 基线对照模式、E2E 浏览器身份元数据）、G8 发布证据与版本/文档
  同步；**不新增产品功能、不改架构、不新增物理模型、不做 FC-001 升级、不重建单文件 `FaultLab.html`**。
  `engine_version` 维持 **0.1.0**（数值实现未变，不升版）；G8 关闭仅为内部一致性与可复现性证据，
  不是模型验证、不是实测/硬件验证（三标签不变）；发布门证据见 `evidence/g8/README.md`（索引）与
  `evidence/g8/g8-release-checklist.md`（R-01…R-10）。
- **模型边界**：L0 解析/行为级。不含电化学/OCV/温度/效率、电力电子开关动态、母线电容与电压动态、
  传感器噪声（P0 默认关闭）、保护逻辑；控制器为行为级一阶等效，不是经验证的设备控制器。
- **G4 人工走查**（P0b-01/02）：已由 V3-01 补课关闭（2026-10-30，qa ux 14/14 + misc 9/9 + 六页截图复核，
  记录见 `FaultLab-evaluation/NEXT/evidence/g6/walkthrough-v3-01.md`；T10/reduced-motion 两项豁免留痕）。

- **FL-001 `load_step`**：已删除（O-13，2026-10-30；归档 `evidence/g2b/load_step-removed-contract-text.md`）；
  FL-001 故障族为 sensor_drift + actuator_fault（后者仍为扩展预览）。
- **I-11 模型接口（Plant/Sensor/Controller/Fault）**：S1/S2 已还原到 V0.3 主线
  （`RFC_MODEL_INTERFACE_I11_APPROVED.md` + CHG-20261030-07；FL/FC 的 `none`/`sensor_drift` 家族走
  `src/core/plants/` 适配器，`run_hash` 逐位不变）；V0.3.0 复验 **12/12 配置 · 36/36 字段** 对基线
  `7aed9f6` 逐位一致（`evidence/g8/i11-bitidentity/`）；S3（GT-001）未排期，GT 内联分支保留。
- **Arena / 评测轨**：协议 v2 已批准并实现（gen/session/verify CLI + 17 条负例 + 24 步聚合门禁）；
  首场次归档 `evidence/g8/eval-session-001/`（3 参赛、score_hash 落章）；页面演示轨不变；
  评分只标「合成故障评测游戏，非真实诊断性能」。
- 浏览器端计算与哈希不构成第三方验证；分享/复核以证据包 v1 + `verify_bundle.py` 为准。
- 未接入 Simulink/FMU 后端、真实设备、云端账户与排行榜（明确不做）。

## 10. 参考

- **V0.3.0 发布**：版本标识 **V0.3.0**（发布日期 2026-10-30）；发布提交 = tag `v0.3.0` 所指提交
  （哈希见 git log）；发布门证据 `FaultLab-evaluation/NEXT/evidence/g8/README.md`（证据索引）与
  `evidence/g8/g8-release-checklist.md`（就绪检查单 R-01…R-10，全部 ✅）；变更记录
  `DECISIONS/DECISIONS.md` §8 `CHG-20261030-08`。
- **G0 决策（已批准）**：`FaultLab-evaluation/DECISIONS/DECISIONS.md`、`DECISIONS/SPEC_v0.2_APPROVED.md`
- **G2 规格（本版权威）**：`FaultLab-evaluation/NEXT/` —— DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC /
  UI_COPY_GUARDRAILS / BACKLOG_APPROVED / SCOPE_SPLIT_MEMO；V0.3 阶段：`V0.3_PLAN_APPROVED.md`、
  `FL19_BACKEND_RFC_APPROVED.md`（G6-WS-C 已闭）、`ARENA_EVAL_PROTOCOL_APPROVED.md`（G6-WS-D 已闭）、
  `V312_BACKEND_ADMISSION_CHECKLIST.md`（FROZEN）、`GT001_G2B_SPEC_APPROVED.md`（G2b 已闭，
  V3-31/V3-33 待开工）、`LOAD_STEP_RULING_MEMO.md`（O-13 已裁定：删除）、
  `RFC_MODEL_INTERFACE_I11_APPROVED.md`（I-11 模型接口，CHG-20261030-07 还原；S3 未排期）
- **实施证据**：`FaultLab-evaluation/NEXT/evidence/g2/`（golden/oracle/四件套）、`evidence/g4/`（因果护栏/白名单/范围守卫/README）、
  `evidence/g5/`（发布就绪/双浏览器走查）、`evidence/g6/`（V0.3：真值隔离评估、RFC/协议双路评审、走查补课 + 截图）、
  `evidence/g7/`（评测轨 MVP + FL-19 后端增量一实施证据：18/18 聚合、42/42 负例、51/51 准入机检、QP-4 假候选率发布）、
  `evidence/g8/`（V0.3.0 发布：G8 R-01…R-10、I-11 12/12 配置 · 36/36 字段复验、Chrome 155 / Edge 155 各 E2E 40/40
  与双浏览器走查、G2 追溯报告）
- **golden 数据**：`data/golden/fl001_v1.json`（method_id=analytic_flux；全精度；sha256 见同目录 .sha256）
- QA 截图与原型期报告：`artifacts/`（历史自检，不作为验收证据）

## 11. 许可证

本项目以 [MIT License](LICENSE) 发布（Copyright © 2026 cyy1018abc-kyy and FaultLab contributors）。

- 全部源码、文档与 `FaultLab-evaluation/` 治理证据随仓库同许可发布。
- 运行期零第三方依赖（浏览器原生 API + Python/Node 标准库），无第三方分发物义务；
  五个对标开源项目（python-microgrid/PyBaMM/Open MCT/DoWhy/Grid2Op）仅作设计参考，
  未复制其源码，故不产生许可传染问题。
- `data/golden/*.json` 与 `artifacts/` 为本项目自产数据，随 MIT 发布。
- 免责：软件按"现状"提供；模型为 L0 行为级演示，不构成任何工程、物理或安全保证。
