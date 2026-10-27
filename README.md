# FaultLab — Virtual Energy Lab

> 亲手制造故障，观察系统反应。离线可运行的能源系统故障注入与传播解释实验场。
>
> **数据性质声明**：FaultLab 是**解析行为级（L0）演示**（`model_provenance=analytical_demo`），
> 数据为解析模型生成的合成示例数据（synthetic）：非 Simulink、非实测（无实测对比）、未做模型验证
> （`model_validation=not_performed`）、未做硬件验证（`hardware_verification=not_performed`）。
> 所有数字带来源标签；「内部一致性检查通过」不等于模型验证，更不等于与真实设备一致。

> **范围与状态（G0 批准 2026-10-27；G2 实施记录 2026-10-28）**
> - **P0 验收基线（唯一验收路径）**：`FL-001` × 3 组固定 Run（`baseline` / `closed_loop_fault` / `monitor_only`）
>   × 5 逻辑视图 × 单一时钟 × 事件 pre/post（20.0−/20.0+）× 因果证据跳转 × 对比白名单 × 证据包导出/重载 × golden 校验。
> - **G2 四件套已按批准规格实施并全绿**（2026-10-28）：独立 oracle + golden v1、Schema/单位字典、
>   RunRegistry/规范哈希、浏览器 E2E；证据见 `FaultLab-evaluation/NEXT/evidence/g2/`。
>   这是**内部一致性与可复核性证据**；G2/G3 门禁关闭裁决仍以 Lead/用户对证据包的复核为准。
> - **FC-001 / GT-001 / load_step / actuator_fault / Agent Arena 为扩展预览（P1/P2）**，携带
>   `scope='extension_preview'` 标注，不进入 P0 验收；**GT-001 当前形态 NO-GO**
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
src/core/                      hash/schema/scope/protocol/systems/engine/metrics/checks/registry/bundle
src/ui/                        组件库、store、壳层、图表、导出、六个页面
src/agents/                    内置演示 Agent、盲测编排与评分
data/golden/fl001_v1.json      唯一 golden（由 oracle 生成；engine 只读比对）
tools/oracle/                  独立解析 oracle + emit_golden（不 import src/**）
scripts/verify_golden.py       一键 golden 校验（exit 0/1/2）
tools/verify_bundle.py         证据包第三方离线复核
tools/e2e.mjs                  CDP headless 浏览器 E2E（fl001-min 旅程）
tools/copy-guard.mjs           禁止词扫描（UI_COPY_GUARDRAILS §6.3）
tools/run-g2.mjs               G2 四件套聚合器（任一失败非零退出）
tests/                         core / arena（既有）+ schema / event-phase / engine / registry /
                               bundle / scope-guard / compare / causal-rules（G2/G4 新增）
FaultLab-evaluation/           G0 决策、G2 规格、评审证据与实施证据（evidence/g2、evidence/g4）
docs/CONTRACT.md 等            工程契约与协议（G0 对齐版）
artifacts/                     QA 截图与运行报告（run-g2-report.json / e2e-report.json）
```

### 验证命令（全部离线、零第三方依赖；Windows 10/11 + Python 3.9+ + Node 18+）

```powershell
python tools/oracle/fl001_oracle.py --self-check   # oracle 自检（SC-1..SC-6）
python scripts/verify_golden.py                    # golden 一键校验（exit 0/1/2）
node tools/run-g2.mjs                              # 四件套聚合：数值/E2E/Registry/Schema + 回归
python tools/verify_bundle.py <bundle_dir>         # 第三方复核证据包目录
node tools/copy-guard.mjs                          # 禁止词扫描（命中 exit 1）
node tools/qa.mjs shots                            # 原型期截图走查（历史工具，不作验收）
```

> 通过判据与证据记录见 `FaultLab-evaluation/NEXT/evidence/g2/README.md` 与 `evidence/g4/`。
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

- **模型边界**：L0 解析/行为级。不含电化学/OCV/温度/效率、电力电子开关动态、母线电容与电压动态、
  传感器噪声（P0 默认关闭）、保护逻辑；控制器为行为级一阶等效，不是经验证的设备控制器。
- **G4 剩余人工项**（P0b-01/02）：设计系统/键盘焦点全量走查、系统拓扑检查器走查记录——需人工
  + 截图走查，未纳入本轮自动化证据。
- **FC-001**（P1 条件项）：须先修 SOC 末值（59.4755556% / 59.5866667%）+ 补假设清单 + 独立 golden，
  未关闭前不进入实现。
- **GT-001 当前形态 NO-GO**（G0-DEC-15）：恢复须 G2b 物理规格评审；不得作为验收/对外结论。
- **FL-001 `load_step`**：删除或重写（G2b），当前不进入实现。
- **Arena**：P2 扩展预览；独立评测协议（可信评测器、固定测试集、真值隔离）未建。
- 浏览器端计算与哈希不构成第三方验证；分享/复核以证据包 v1 + `verify_bundle.py` 为准。
- 未接入 Simulink/FMU 后端、真实设备、云端账户与排行榜（明确不做）。

## 10. 参考

- **G0 决策（已批准）**：`FaultLab-evaluation/DECISIONS/DECISIONS.md`、`DECISIONS/SPEC_v0.2_APPROVED.md`
- **G2 规格（本版权威）**：`FaultLab-evaluation/NEXT/` —— DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC /
  UI_COPY_GUARDRAILS / BACKLOG_APPROVED / SCOPE_SPLIT_MEMO
- **实施证据**：`FaultLab-evaluation/NEXT/evidence/g2/`（golden/oracle/四件套）、`evidence/g4/`（因果护栏/白名单/范围守卫/README）
- **golden 数据**：`data/golden/fl001_v1.json`（method_id=analytic_flux；全精度；sha256 见同目录 .sha256）
- QA 截图与原型期报告：`artifacts/`（历史自检，不作为验收证据）
