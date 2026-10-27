# FaultLab — Virtual Energy Lab · V0.1

> 亲手制造故障，观察系统反应。离线可运行的能源系统故障注入与诊断实验场。
>
> **数据性质声明**：FaultLab V0.1 是**行为级（L0）解析模型演示**，不是 Simulink 运行结果、不是现场数据、不是实测结论。所有数字都带来源标签，模型内部一致性校验通过不等于与真实设备一致。

> **G0 状态与范围（2026-10-27T20:35 起生效）**
> - G0 双独立评审 + 独立数值预言机已完成；决策已获用户批准，见 `FaultLab-evaluation/DECISIONS/DECISIONS.md`。
> - **P0 验收基线**：`FL-001` × 3 组固定 Run（无故障 / 闭环故障 / 仅监测）× 5 逻辑视图 × 事件 pre/post × 证据导出/重载。
> - **FC-001 / GT-001 / 三类故障族 / Agent Arena 为扩展预览（P1/P2）**，不属于 V0.1 基准验收路径；
>   **GT-001 当前形态 NO-GO**（见 `docs/CONTRACT.md` §5.3 与 `FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md`）。
> - 本文第 7 节的测试数字是**并行实现的原型自检（自报快照）**，不是 G2 科学验收；事件语义、SOC 公式、
>   积分口径、证据包/哈希、真值暴露五项正按 G2 规格重基线（`FaultLab-evaluation/NEXT/`）。

---

## 1. 这是什么

一个纯浏览器、零依赖、可离线运行的工程仿真实验乐园：

- **P0 主实验（FL-001 电池储能）**：20 s 电池电流传感器 +10 A 偏置；闭环 / 仅监测 / 无故障三组对照。
- **扩展预览（P1/P2，非 P0 验收）**：FC-001 燃料电池、GT-001 燃气涡轮（**GT 当前形态 NO-GO**，仅作扩展规格）。
- **拖动参数、注入故障**：传感器漂移 / 负载冲击 / 执行器异常；可切换闭环反馈与仅监测（参数编辑为 P1）。
- **观察系统反应**：真实功率流、测量链、控制回路如何相互作用；同一全局时间线回放 0–60 s。
- **核对每一个数字**：真值 / 观测 / 推断分离，每个信号带 `source_kind`，结论可回溯到 `run_id + 变量 + 时间窗`。
- **因果解释**：按模型规则解释“为什么变化”，附证据与假设，不猜模型没定义的物理现象。
- **对比与报告**：故障 vs 无故障基准 vs 仅监测对照，导出 CSV / 配置清单 / 证据包（HTML 报告为 P1）。
- **Agent 竞技场（P2 扩展预览）**：隐藏真值盲测，多个确定性诊断 Agent 比赛、评分；仅作合成场景评测游戏。

---

## 2. 快速开始

### 方式一：双击单文件（推荐给体验者）

```
FaultLab.html            ← 直接双击，用 Chrome/Edge 打开，无需服务器
```

### 方式二：源码 + 本地服务器（推荐给开发者）

```powershell
python tools/serve.py
# → http://127.0.0.1:4318/
```

### 方式三：直接打开 `index.html`

无 ES module，纯经典脚本，`file://` 双击亦可运行（部分浏览器对剪贴板 API 有安全限制，复制摘要可能降级）。

### 演示/QA 深链接

| URL | 效果 |
|---|---|
| `?demo=1&page=system&t=21` | 自动创建默认故障运行，系统页定位 21 s |
| `?demo=1&page=signals&t=21` | 曲线页（自动带 Run + 基准 Run） |
| `?demo=1&page=arena` | Agent 竞技场 |
| `?system=FC-001` / `?system=GT-001` | 切换系统 |
| `?reset=1` | 清空浏览器存档后启动 |

---

## 3. 页面一览

| 页面 | 内容 |
|---|---|
| **实验首页** | 系统选择、实验目标与三个问题、参数摘要、模型假设抽屉、3 步快速讲解、建议体验路径 |
| **系统交互图** | SVG 拓扑与能量流动画（功率流实线 / 信号流虚线 / 故障专属标记）、故障编排（家族/幅值/时刻/控制模式）、部件检查器（字段带来源标签） |
| **实时曲线** | 分类标签（电流/功率/SOC/残差/执行器）、真实=实线 / 测量=虚线 / 目标=点划线 / 故障=红、事件竖线、时间游标、数据快照、缩放窗口、基准叠加、表格模式、CSV 导出 |
| **因果解释** | 六节点因果链（配置事实 / 模型机制 / 数值观测三层分离）、上下游高亮、证据链接（run + variable + time_window）、+4 kW 残差公式、仅监测 vs 闭环、替代解释与局限 |
| **结果对比** | 基准 vs 试验 Run、一致性检查、指标卡、叠加/双屏/差值视图、事件分叉线、发现与局限、CSV/配置/HTML 报告/摘要/证据包导出 |
| **Agent 竞技场（EXT）** | 盲测设置、逐轮揭晓、诊断 vs 真值、评分分解、排行榜、盲测数据包导出、外部诊断导入 |

---

## 4. 系统与故障目录（范围见文首 G0 状态）

| 系统 | 层级 | 名称 | 默认场景 | 故障家族 | G0 状态 |
|---|---|---|---|---|---|
| FL-001 | **P0 基线** | 电池储能 | 20.0 s 电池电流传感器 +10 A 偏置（闭环） | 传感器漂移（P0）；负载冲击 / 变换器限流（扩展预览） | 可验收；`load_step` 暂停实现 |
| FC-001 | P1 扩展预览 | 燃料电池 | 20.0 s 电堆电流传感器 +10 A 偏置（闭环） | 传感器漂移 / 负载冲击 / 氢气阀卡涩 | 待修 SOC 末值与独立 golden |
| GT-001 | P2 扩展预览 | 燃气涡轮发电 | 20.0 s 转速传感器 +0.3 Hz 偏置（闭环） | 传感器漂移（转速冗余不一致）/ 负载冲击 / 燃料阀卡涩 | **NO-GO（当前形态禁止实现/验收）** |

所有场景均有闭环与仅监测两种模式；无故障基准运行用于对照。详细方程、假设与验收值见
`docs/CONTRACT.md` §5（已按 G0 裁决标注扩展/暂停项）。

### FL-001 基准数值（解析精确值）

| 指标 | 无故障 | 闭环 +10 A 偏置 @20 s | 仅监测 +10 A @20 s |
|---|---:|---:|---:|
| 20.0 s 真实电流 | 25 A | 25 A（连续） | 25 A |
| 20.0 s 测量电流 | 25 A | 35 A | 35 A |
| 26 s 真实电流 | 25 A | 15.1832 A | 25 A |
| 60 s 电池电能 | 0.166667 kWh | 0.123889 kWh | 0.166667 kWh |
| 60 s 发电机电能 | 0.333333 kWh | 0.376111 kWh | 0.333333 kWh |
| 60 s 真实 SOC | 59.58333% | 59.69028% | 59.58333% |
| SOC 估计误差 | 0 pp | −0.11111 pp | −0.11111 pp |
| 最大真实功率残差 | 0 kW | ≈0 kW | ≈0 kW |
| 最大测量一致性残差 | 0 kW | +4 kW | +4 kW |

> +4 kW 是**测量一致性残差**，不是实际多发的能量，也不是实际电能损失。

---

## 5. 数据诚实性设计

- **来源标签**：`CONFIG` / `MODEL_STATE` / `OBSERVATION` / `CONTROLLER` / `FAULT_EVENT` / `DERIVED` / `MODEL_ASSUMPTION`，全站显示，不只靠颜色。
- **不可变 Run**：参数改动只改草稿（`draftDirty`），不改变已完成 Run；配置哈希 / 模型哈希可核验。
- **事件 pre/post**：20.0 s 的 `20−` 与 `20+` 分开存快照，图表用阶跃绘制，不平滑跳变。
- **缺失数据不填 0**：显示「不可用」。
- **校验失败不宣称可信**：`quality_checks` 失败时 UI/导出明确标注「验证未通过」。
- **哈希语义**：浏览器端 SHA-256 仅证明导出内容一致性，不是防篡改签名或第三方认证。
- **不做未建模物理**：不显示母线电压尖峰、发电机频率跌落、保护动作等模型未定义的现象（GT 扩展的降阶频率动态在假设中明确标注）。
- **因果解释受模型约束**：无模型支撑时显示「本模型无法推导该现象」。

---

## 6. Agent 竞技场（扩展预览）

- **盲测**：随机生成隐藏场景（故障家族 / 幅值 / 时刻 / 闭环或仅监测 / 20% 健康局），Agent 只收到 `blindVisible` 观测流，真值封存；比赛期间真值相关页面被禁用。
- **内置 Agent（确定性算法，非 LLM）**：阈值越限、模型残差、CUSUM 变点、贝叶斯特征分类、多信号融合。
- **评分（100 分制）**：detection 20 / family 25 / component 10 / magnitude 15 / latency 15 / calibration 15，健康局误报扣 10；逐轮展示评分分解。
- **外部 Agent 接入**：可导出「盲测数据包」JSON，离线/外部 AI Agent 产出「诊断结果」JSON 后导入评分。协议见 `docs/AGENT_PROTOCOL.md`。
- 说明：Arena 是 V0.1 规格之外的扩展，不属于 FL-001 基准验收路径。

---

## 7. 工程与目录

```text
index.html                  开发入口（脚本/样式按序加载）
FaultLab.html               单文件离线构建产物（python tools/build.py）
css/theme.css               设计令牌、公共组件、壳层与时间线
css/<page>.css              页面样式（.pg-<page> 作用域）
src/core/                   数据协议、三系统模型、引擎、指标、校验、哈希、RNG
src/ui/                     组件库、store、壳层、图表、导出、六个页面
src/agents/                 内置诊断 Agent、盲测编排与评分
tests/                      Node 核心数值测试、Arena 测试、图表 harness
tools/                      serve.py / build.py / qa.mjs / oracle.py
docs/CONTRACT.md            团队工程契约（接口唯一事实源）
docs/SCOPE.md               规格映射、范围裁定与偏差记录
docs/AGENT_PROTOCOL.md      外部 AI Agent 接入协议
artifacts/                  QA 截图与测试输出
```

### 构建与测试

```powershell
python tools/serve.py                 # 开发服务器 http://127.0.0.1:4318/
python tools/build.py                 # 生成单文件 FaultLab.html
node tests/core.test.js               # 三系统物理/指标/校验单元测试
node tests/arena.test.js              # Agent 盲测与评分测试
python tools/oracle.py                # 独立 Python 解析黄金样例（交叉校核）
node tools/qa.mjs ux                  # headless Chrome 跑 UX-01..UX-12
node tools/qa.mjs shots               # 全页面桌面/移动端截图 → artifacts/
node tools/qa.mjs arena               # Agent Arena 盲测 / 评分 / 导出隔离
node tools/qa.mjs ui                  # 真实点击交互链路（开始实验/切家族/建运行/跨页/视图）
node tools/qa.mjs misc                # UX-04/05/08、键盘、刷新恢复、讲解/假设弹层
```

### 原型自检结果（2026-10-27 自报快照；**非 G2 科学验收**）

> 下表为并行实现会话在 G0 裁决前的自测记录；通过只代表原型行为一致，**不代表模型验证/硬件验证**。
> 事件 pre/post 语义、SOC 公式 ×100、积分口径、证据包/哈希、真值暴露五项正按 G2 规格重基线
> （`FaultLab-evaluation/NEXT/`）；重基线后需重新自测，以下数字可能变化。

| 套件 | 命令 | 结果 |
|---|---|---:|
| 数值内核（三系统 × 5 场景，解析黄金值 + 守恒 + 不可变性） | `node tests/core.test.js` | **PASS 10621 / FAIL 0** |
| Agent Arena（确定性 / 盲测隔离 / 评分 / 外部导入） | `node tests/arena.test.js` | **PASS 155 / FAIL 0** |
| 规格 UX-01…UX-12 流程 | `node tools/qa.mjs ux` | **14/14** |
| Agent Arena 端到端 | `node tools/qa.mjs arena` | **7/7** |
| 真实点击交互链路 | `node tools/qa.mjs ui` | **9/9** |
| 边界 / 键盘 / 刷新恢复 / 弹层 | `node tools/qa.mjs misc` | **9/9** |
| 独立 Python 解析校核 | `python tools/oracle.py` | 原型用 0.1 s 梯形，与 G2 解析金标准差 ≈6.17e-7 kWh（**非 G2 金标准**；G2 以 `FaultLab-evaluation/tools/verify_fl001.py` 为准） |

- 浏览器实测：所有页面 console error = 0；1440 / 1100 / 1024 / 390 断点截图见 `artifacts/`。
- 单文件 `FaultLab.html` 通过 `file://` 双击路径实测（渲染与服务器版本一致）。
- 截图与验收索引见 `artifacts/QA_REPORT.md`。

---

## 8. 键盘快捷键

| 按键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | 后退 / 前进 0.1 s |
| Shift + ←/→ | 后退 / 前进 1 s |
| Home / End | 跳到 0 s / 60 s |
| ? | 帮助 |

输入框聚焦时快捷键自动禁用；图表支持表格模式供屏幕阅读器读取变量与单位。

---

## 9. 已知局限与 G0 遗留（V0.1）

- 所有模型均为 L0 行为级/解析模型：无电力电子开关动态、无母线电容与电压动态、无电化学 OCV/温度/效率、无传感器噪声默认、无保护逻辑。
- **GT-001 当前形态 NO-GO**：恢复时间、`r_meas` 定义、`r_true/P_rotor` 冲突、惯量线性化、电池额定等 5 项未通过复核；只保留为扩展规格草案，不得作为验收/对外结论。
- **事件 pre/post 语义**：G0 已裁定 `pre` = `t_s=20.0` 左极限（19.9 s 只是普通采样）；实现与导出需按 `docs/CONTRACT.md` §5.0 重基线。
- **SOC 公式**：`SOC% = 60 − 100·(1/40)·∫P dt/3600`（旧文本缺 ×100）；积分以解析口径为 golden，数值求积仅作敏感性。
- `r_true ≡ 0` 与 `E_gen+E_bat ≡ 0.5 kWh` 是**定义恒等式**，不能当作物理守恒验证；`r_meas ≡ 0.4·b = +4 kW` 与发电机补偿无因果，也不是实际能量损失。
- FC-001 的 SOC 末值（应为 59.4755556% / 59.5866667%）与假设清单待修；独立 golden 未建立。
- 浏览器端计算与哈希不构成第三方验证；证据包/哈希语义（run_hash/Canonicalization v1）与导入契约仍待按 G2 落地。
- Agent Arena 为 P2 扩展预览：内置 Agent 为确定性规则/统计算法，不代表 LLM 或真实诊断能力；`truthSealed` 是 UI 开关，不是安全边界。
- 尚未接入 Simulink/FMU 后端、真实设备、云端账户与多用户排行榜（V0.1 明确不做）。

---

## 10. 参考

- 产品规格：`FaultLab_V0.1_页面原型与交互规格.md`（FL-001，2026-10-27）
- 团队工程契约：`docs/CONTRACT.md`（已按 G0 对齐，见文末「附录 G0 对齐记录」）
- 范围与实现状态：`docs/SCOPE.md`（G0 对齐版）
- 外部 Agent 协议：`docs/AGENT_PROTOCOL.md`（P2 扩展预览）
- **G0 评审证据包**：`FaultLab-evaluation/README.md` —— 双路独立评审（工程/物理）+ 独立数值预言机 + 合并差异（B01–B15）
- **G0 决策（已批准）**：`FaultLab-evaluation/DECISIONS/DECISIONS.md`、`DECISIONS/SPEC_v0.2_APPROVED.md`
- **G2 规格（本版权威）**：`FaultLab-evaluation/NEXT/` 下的 DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC /
  UI_COPY_GUARDRAILS / BACKLOG_APPROVED / SCOPE_SPLIT_MEMO
- QA 与验收报告：`artifacts/QA_REPORT.md`（原型自检，非 G2 验收）

