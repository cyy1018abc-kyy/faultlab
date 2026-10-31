# GT001_G2B_SPEC_APPROVED — GT-001 燃气涡轮发电系统 G2b 物理规格（v1.1，已批准）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.5 V3-30/V3-32（P2-03 / WS-E）。
> **状态**：`APPROVED`（**G2b 关闭**，2026-10-30 用户批准，`CHG-20261030-06`；批准前名
> GT001_G2B_SPEC_DRAFT.md）。批准时定案：**§9 抗饱和 = 方案 (a)**（现状钳位 + 清除瞬态如实声明，
> 不改方程）；**§4 网格 = 保留 60 s / dt=0.1 输出网格**。恢复锚点以 V3-31 oracle 复核冻结为准。
> **评审链**：v1 → V3-32 双路独立上下文评审（物理视角：CONDITIONAL GO，1 BLK + 4 MAJ；工程/契约
> 视角：CONDITIONAL GO，3 BLK + 7 MAJ，实机复算 + 20 文件涟漪清单）→ v1.1 按「批准前必须改」
> 全部修订 → 用户批准。合并记录：`evidence/g2b/gt001-v3-32-review.md`。
> **边界**：V3-31（独立 oracle + gt001_v1 golden）与 V3-33（实现：信号目录/引擎/checks/因果模板等
> §10 涟漪清单）**待用户逐次开工指令**；实现完成前 GT-001 演示仍为扩展预览、不进入任何验收。
> **记录**：实现 Agent，2026-10-30。

---

## 0. 重写原则

沿用 G2b-lite（FC-001）确立的方法：先文档、独立 oracle、独立口径 golden、措辞先过护栏。
GT-001 与 FL-001 的关键差异：GT 演示**频率**（安全相关量）且含「惯量+调速器+一次调频」，误导风险
更高（SCOPE §3.2）——因此本规格的措辞边界比数值本身更优先。

## 1. 恢复条件 1——`r_true` 定义恒等（SCOPE §3.3-1）

**规格**：`r_true_kW := P_gen_true + P_bat_true − P_load_served − P_rotor`，明示为**定义恒等**
（代数一致性，非物理验证）。判据 `max |r_true| ≤ 1e-9 kW`（Euler 子步内构造性为 0，1e-9 平凡可达；
checks.js 的 GT 容差由现行 1e-3 kW 同步收紧至 1e-9——见 §10）。
现契约「`r_true_kW`(DERIVED, =0)」定义废弃；**信号名 `r_true_kW` 保留**（DERIVED、修正后定义，
BLIND_ID_RE 本就将其挡在盲包外——v1 的「名称废弃」表述自相矛盾，v1.1 裁定保留名称）。
`P_rotor_kW := P_gen + P_bat − P_load = K_J·(df/dt)` 保留为 MODEL_STATE，语义「转子动能净吸收功率」。
注（评审补充）：load_step 阶跃瞬间 P_rotor 瞬时可达 −10 kW（失衡由转子吸收），文档表述以
「瞬时失衡项」为准，不写「恒 0」。

## 2. 恢复条件 2——`r_meas` 废除，改频率通道冗余不一致量（SCOPE §3.3-2）

**规格**：废除「功率残差 `r_meas_kW`」（功率测量通道全部健康，无对应故障量）。新增：

- **`f_channel_diff_Hz := n_meas_rpm/60 − f_meas_Hz`**（DERIVED，label「转速通道−电气通道频率不一致」，
  类别归属 `frequency`，公式 `f_channel_diff = n_meas/60 − f_meas`，单位 Hz）。
- **exposure 声明机制（评审 F-05/F6 硬要求）**：DERIVED 默认 exposure=public_demo，**必须显式
  `sig({ id:'f_channel_diff_Hz', sourceKind:'DERIVED', exposure:'blind_observable', … })`**
  （blindVisible 由 exposure 派生，**禁止**独立设置 `blindVisible:true`——schema CN-E02）。
  漏声明时通道静默退出 GT 盲池且无报错——V-05 注册表校验随目录自动生效，**历史 GT 盲包将 fail
  V-05（预期失效面）**。
- **计算点（F-11）**：与现 r_meas 同位——在 applyNoise GT 分支由**含噪** n_meas/f_meas 重构；
  噪声关闭时 = b(t) 精确成立。§4 锚点 ±1e-9 限定**无噪声 golden 口径**。
- 健康时恒 0；`sensor_drift` 时 = b(t)（默认 +0.3 Hz）。原 `r_meas` 名称不再使用；
  `metrics.js` 的 max_abs_r_meas 指标对 GT 置换为 `max_abs_f_channel_diff_Hz`（§10）。

## 3. 恢复条件 3——惯量模型线性化声明与能量校核（SCOPE §3.3-3；v1.1 按 BLK 评审项重写）

**规格**：显式声明 `df/dt = (P_gen + P_bat − P_load)/K_J`（`K_J = 5.0 kW·s/Hz`）是**摇摆方程在
f≈f₀ 的线性化**，有效性边界 |Δf| ≤ 1 Hz（f₀ 的 2%；参数域极端 mag=1.0 Hz 时 Δf=−0.982 Hz **贴边**
——边界与参数域关系写入 A-gt-inertia-lin）。

- 物理动能（二次型）：`E_kin(f) = (K_J·f₀/2)·(f/f₀)² = 125·(f/50)² kW·s`；E_kin(50)=125 kW·s。
  **禁止**按 ½·K_J·f² 理解（差 50 倍）。
- **能量校核检查（v1.1 重写——v1 判据在线性化下构造性不可满足，双路评审 BLK 交叉印证）**：
  线性化模型的 P_rotor 是**线性化能量**（`E_lin = K_J·Δf`）的导数，不是二次型 E_kin 的导数；
  二者之差 = **线性化截断残差 `K_J·Δf²/(2f₀)`（恒正，sensor_drift 60 s 实测 4.3e-3、load_step
  nadir 处 8.4e-3 kW·s）**。检查式改为：

  `| ΔE_kin(0→t) − ∫₀ᵗ P_rotor dt − K_J·Δf(t)²/(2f₀) | ≤ 1e-6 kW·s`

  并明示：① 该检查验证的是**离散自洽 + 线性化截断项的量级正确**，不是物理验证；② 积分在
  **输出网格（dt=0.1，601 点）梯形**上进行，跨 t=20 阶跃点的梯形伪影属预期，检查容差须覆盖之
  （oracle 复核时以解析折线为准核对）；③ 残差项随实现期以实测分布最终冻结（若 1e-6 不可达，
  按实测截断残差上界定值，登记依据）。
- 与 `metrics.js` 既有 `E_rotor_kWh`（=K_J·Δf/3600，线性化口径）是**两个不同的「转子能量」**，
  UI/文档不得混用（§10）。
- `K_J·f₀/2 = H·S` 等效惯量常数项写入 model.assumptions（id=`A-gt-inertia-lin`，含贴边声明）。

## 4. 恢复条件 4——验收值重写（SCOPE §3.3-4）

**规格**：废除「8–20 s 恢复 50 Hz」。**网格口径（v1.1 澄清，评审 F-06）**：输出网格 60 s /
**dt=0.1（601 点）**（与 sr1、系统目录一致）；「Euler dt=0.01」是**积分子步**（engine DT_INT 现状），
不是输出网格——任何实现不得把 GT 输出网格改为 0.01（6001 点将破坏 arena SR1 V-04a、测试与 UI 的
601 点假设）。验收锚点（独立复算值，G2b 评审后由 oracle 复核冻结）：

| 场景 | 锚点（60 s 输出网格） | 容差 |
|---|---|---|
| `load_step` +10 kW | `f_nadir = 50 − 0.4105 Hz @21.1 s`（0.1 s 网格采样口径；连续极值 21.07 s） | ±0.01 Hz |
| 同上 | `f(60) = 49.992 Hz`（**v1.1 增补**——SCOPE §3.3-4 四处列明的必选项） | ±0.01 Hz |
| 同上 | `\|Δf\| ≤ 0.2 Hz @30.1 s`（与 SCOPE §3.3-4 文本统一）；`≤ 0.1 Hz @36.6 s` | 复算边界 ±0.5 s |
| 同上 | 60 s 末值 `P_gen=34.817 kW`、`P_bat=5.187 kW`（峰值 `P_bat=14.855 kW` 勘误注记：SCOPE §3.1 记 12.1 系误） | ±0.5 kW，**声明 60 s 未达稳态**（100 s 参考值 35.00/5.00 **只能由 oracle 侧产生**——引擎验证层硬锁 duration_s=60） |
| `sensor_drift` +0.3 Hz | `f_true(60) = 49.7055 Hz`（声明未收敛） | ±0.005 Hz |
| 同上 | `P_gen(60)=17.929 kW`、`P_bat(60)=12.068 kW` | ±0.3 kW |
| `actuator_fault` 50% | `P_gen=20.000 kW`（钳位）、`f(60)=49.7917 Hz`、`P_bat(60)=10.000 kW` | ±0.2 kW / ±0.01 Hz（P_bat 容差与 f 容差联动 ±0.25 kW） |
| 全场景 | `f_channel_diff`：健康恒 0；sensor_drift = b(t)（无噪声 golden 口径） | ±1e-9 Hz |
| 全场景 | 无 NaN/Inf；SOC ∈ [0,100]；输出网格单调 | 硬判据 |

- 网格决策：**保留 60 s 输出网格**（见上口径澄清）；如 G2b 评审倾向稳态口径（duration=100），
  须重建全部锚点与点数假设（二选一在 V3-32 用户批准时定案；v1.1 推荐保留 60 s）。

## 5. 恢复条件 5——电池/变流器额定与限幅（SCOPE §3.3-5；v1.1 按评审 F-03 重裁定）

**规格**（v1 撤回「现模型不会触及 15 kW」的错误声明——已声明参数域内三处越限：sensor_drift
mag=1.0 Hz → 28.56 kW；load_step +20 kW → 峰值 24.71 kW；actuator 20% → 22 kW；且 load_step +10
峰值实为 **14.855 kW**，零裕度）：

- **硬检查（checks，仅新 Run 携带——评审 F-14）**：`|P_bat| ≤ 25 kW`（**变流器物理包络**，合法
  参数域内恒过、防未来越界）。
- **±15 kW 短时额定**降为 assumptions 文案（`A-gt-bat-rating`：连续 ±5 kW / 短时 ±15 kW / 变流器
  包络 ±25 kW）与 **UI 警示**（工作点超 15 kW 时明示「依赖短时过载能力，长时运行须降额」），
  不作硬判据——12.2 kW（sensor_drift 默认）与 14.855 kW（load_step+10 峰值）落入短时额定。
- 电池通道健康声明保留；**SOC_est 口径声明（F-15）**：现实现为真值功率积分（未从含噪 P_bat_meas
  重构），无噪声下与目录定义一致；噪声下差异属既有演示口径（与 FL/FC 一并处理，登记 deviations）。

## 6. 恢复条件 6——GT 专属未建模物理清单（SCOPE §3.3-6）

**规格**：model.limitations 增补（UI 模型抽屉可查）：AVR/机端电压与无功、功率角稳定性、燃气轮机
热力学（燃烧/EGT 延时、压气机特性）、保护系统（低频减载、过频/过流）、负荷频率特性（负荷自调节
系数 D）、多机系统惯量分散与网损、AC/DC 整流动态、调速器死区与非线性阀特性、电池变流器开关动态、
**执行器死区（actuator magnitude ≥62.5% 时 P_gen_cap ≥ 平衡点，钳位不生效、故障不可观——v1.1 增补，
或收紧参数域上限至 ~60%，随 V3-32 定案）**。声明「本模型为单机等效频率响应的一阶/一阶跟随降阶示意」。

## 7. 恢复条件 7——UI 标签与禁止措辞（SCOPE §3.3-7）

**规格**：

- 系统卡/首页标签追加：「**单机等效频率响应示意（L0b），非机组/电网动态验证**」。
- 禁止措辞（入 UI_COPY_GUARDRAILS 扩展表 + copy-guard，**按完整短语登记**；既有串含其子串时走
  ALLOW 允许串 + deviations 留痕——评审 F-13）：「机组动态验证 / 电网稳定验证 / 一次调频验证 /
  惯量验证」。
- 批准前过渡态按 W-11「当前形态 NO-GO，不可用」执行；G2b 通过后 UI 标注升级走 CHG。
- 「变流器 3× 过载能力」等额定叙述一律冠「**假设**」（A-gt-bat-rating），「持续 ≤60 s」为使用
  边界而非被建物理。

## 8. 恢复条件 8——独立 oracle + 独立口径 golden（→ V3-31，条件项；v1.1 按评审 F-07/F-08/F-09 重写）

**规格**：`tools/oracle/gt001_oracle.py`（计划新建）——Python 独立实现，不 import `src/**`、不共享
FL-001 常量、自带自检（GS-1…GS-n）。

- **更新序冻结（v1.1 新增，评审 F-07 [MAJ]）**：golden ±1e-9 Hz 只有在 oracle **逐算子复刻引擎离散化
  更新序**时可达。规范序（每子步 dt=0.01）：
  `cmdNext = clamp(cmd + Ki·(50−f_gov)·dt, 0, 40) → P_gen = foStep(P_gen, cmdNext, τ_g, dt)
   → if(isAct) P_gen = min(P_gen, P_gen_cap) → f += residual_pre/K_J·dt（residual 用更新前 P_gen）
   → 电池/记录`——含 record() 语义一并列为准；**容差定案**：按复刻树 ±1e-9 Hz 定（若 V3-31 实测
  跨实现散差超限，改按方法等价 ~1e-4 Hz 重定并登记依据——不得假设 ±1e-6 兜底可用，v1 的失准
  阶梯废除；实证：方法等价的两个实现 100 s 慢极点 drift 可差 7.2e-5 Hz）。
- **gt001_v1 字段面清单（F-08）**：golden_id=gt001_v1、model_id=GT-001、method_id=gt001_euler_dt0.01、
  units（I/P/E/t/SOC/**f=Hz**/n=rpm/pp）、tolerances.gate（**增 f_Hz 档** ±1e-9 / rpm 档 / 既有 I·P·E·SOC 档）、
  sampling（601/0.1/i_f）、config、runs、scalars、metrics、events。
- **verify_golden.py 改动点（F-08）**：MODELS 增 gt001 条目（i_true/i_meas 目标量）、KEY_POINTS
  参数化、series_limit/metric_within 增 Hz 类、V-09 目标量参数化。
- **golden run 集 ≥5（F-09）**：healthy、sensor_drift 闭环、**sensor_drift monitor**（新增——条件 2
  「monitor 下同样 =b(t)」语义必须有 golden 覆盖）、load_step、actuator（601 点 ×5）。
- `verify_golden.py` 参数化支持 `gt001`；golden 文件 `.sha256` sidecar 同惯例。

## 9. 恢复条件 9——`actuator_fault` 抗饱和与恢复定义（SCOPE §3.3-9；v1.1 按评审 F-04 如实化）

**规格**：

- **事实声明（v1.1 如实化）**：故障期间调速器指令积分**wound-up 至 40 kW 钳位**（钳位对象是指令
  上限，不是对 20 kW 执行器饱和的抗饱和）；清除后若指令不回置，P_gen 将按 τ_g 冲向 40 kW，
  频率**上摆过冲**（实测量级：t_clear=35/40 s、mag=50/20% 时 |Δf| 峰值 +0.21~+0.50 Hz）——
  v1 的「频率回 50 Hz（电池回 5 kW）」恢复叙事失真，废除。
- **抗饱和定义二选一（V3-32 用户批准定案）**：(a) 维持现状钳位并在文档/局限明示上述清除过冲；
  (b) 行为变更：清除瞬间指令**回置（back-calculation）** `P_gen_cmd := min(P_gen_cmd, P_gen_cap)`
  ——该定义下频率单调恢复，±0.05 Hz@+2.9 s（评审复算）；(b) 属行为变更，全部锚点重推。
  v1.1 推荐 (a)（不动方程，诚实声明局限；恢复教学价值让位稳定性）。
- 恢复验收数字（v1 的 ±0.05 Hz@+15 s）**降为暂定值**：待 (a)/(b) 定案后由增补轮 oracle 复算冻结。
- 首轮 golden **不含清除场景**；`A-gt-antiwindup-clamp` assumption 登记现状语义。
- **定案追记（2026-10-30，CHG-20261030-11，扩展轮 oracle 实测；方案 (a) 下）**：
  以 `t_clear=35 s / magnitude=50%` 为清除锚点场景（golden 第 6 Run `actuator_clear` + 引擎 EV-002）：
  清除后频率上摆**过冲峰值 50.213 Hz（+0.213 Hz）**，回落至 `|Δf| ≤ 0.05 Hz @ 36.1 s`（t_clear+1.1 s）；
  引擎与 oracle 在该场景逐点一致（engine-gt 清除断言 ±0.01 Hz）。此即 §9 恢复验收的冻结数字；
  其他 t_clear/magnitude 组合为插值参考、不设验收。

## 10. 对既有文档与代码的对齐指令（G2b 批准后由 CHG 执行；v1.1 按评审 F-01/F-10/F-16 补全）

| 文件 | 处置 |
|---|---|
| `docs/CONTRACT.md` §5.3 | 全文替换为本规格；NO-GO 标注保留至 V3-32 批准 |
| `src/core/systems.js` | 信号目录（新增 f_channel_diff_Hz 显式 exposure、r_meas_kW 删除、r_true_kW 保留新定义、bus inspector 字段更新）；三个 causalTemplates 按「通道冗余不一致」叙事重写（现模板引用 {r_meas_peak}/{r_true_max} 将悬空）；assumptions（A-gt-inertia-lin/A-gt-bat-rating/A-gt-antiwindup-clamp）；limitations（条件 6 清单含执行器死区）；系统卡标签 |
| `src/core/engine.js` | simulateGT001 record()（r_true 新定义、f_channel_diff 计算）、applyNoise GT 分支重构（含噪通道差）、（视 §9 裁定）指令回置 |
| `src/core/checks.js` | **conservation-meas 的 GT 替代检查**（删 r_meas 后 maxAbs(series.r_meas_kW)=null 会使既有质量门禁 fail——实机验证）；GT r_true 容差 1e-3→1e-9；新 PHY 检查（能量校核 v1.1 式、\|P_bat\|≤25 kW 包络）——**仅新 Run 携带，历史 Run 以其内嵌 checks 为准**（F-14） |
| `src/core/metrics.js` | GT 的 max_abs_r_meas 置换为 max_abs_f_channel_diff_Hz；清理「8–20 s 恢复」口径注释；f_recovery_s 未收敛 null 语义随 §4 声明 |
| `src/ui/pages/causal.js` / `compare.js` / `export.js` | 残差卡 GT 分支、指标卡置换、报告页 FL-001 专属公式告示的系统感知 |
| `src/agents/builtin-agents.js` | GT r_meas 兜底分支清理并复验 arena 融合 Agent 得分 |
| `tests/core.test.js` / `scope-guard.test.js` / `arena.test.js` | r_meas 断言、GT 批注文案、GT 块复跑（观测池变更后 fusion>sensor-limit 复验） |
| `tests/engine-gt.test.js` | 新建（engine-fc 先例：601 点逐点对 golden + 锚点 + 事件相位 + scope=extension_preview） |
| `scripts/verify_golden.py` / `tools/oracle/gt001_oracle.py` / `data/golden/gt001_v1.json` | §8 清单 |
| `tools/run-g2.mjs` | 增 verify_golden gt001 与 engine-gt.test.js 两步（18→20） |
| `UI_COPY_GUARDRAILS` / `copy-guard.mjs` | 条件 7 四禁词（完整短语）+ 允许串登记 |
| `SCOPE_SPLIT_MEMO` §3.3 | 逐条关闭标注（含 §3.1 load_step 峰值 12.1→14.855 勘误、30.1 s 文本统一） |
| `DATA_CONTRACT_SPEC` | units/golden 容差档 Hz 类登记（如适用，CHG 打包） |
| Arena 盲测池 | GT G2b 通过即覆盖其全部三家族（FAMILY_ORDER 全局，无需 scope 联动）；目录变更后历史 GT 盲包 fail V-05 属预期失效面 |

## 11. 规模与风险（重估声明，G0-DEC-15）

规模重估**增量明示**（评审 F11-iii）：V3-30 由 L 细化为 M（规格已完成主体）、V3-32 由 S 调整为
M（双路评审 + 用户批准 + 本 v1.1 修订）、V3-31 oracle/golden 为 M、实现（V3-33）为 M——总量与
规划 §2.5 的「L」量级一致但分布重估；工期承诺仍不做（G0-DEC-15 原判定）。主要风险：① oracle
更新序复刻失败 → 容差按方法等价 ~1e-4 重定（§8 已预案）；② 措辞风险由条件 7 兜底；③ ±15 kW
叙述若被误读为硬保证，由 A-gt-bat-rating + UI 警示双重声明兜底。

---

**修订记录**：v1（2026-10-30 初稿）→ V3-32 双路独立评审（物理：CONDITIONAL GO，F1 [BLK] + F2…F5
[MAJ] + F6…F11 [MIN]，恢复条件 1/2/6/7 关闭、3/4/5/8/9 部分；工程：CONDITIONAL GO，F-01…F-03
[BLK] + F-04…F-09 [MAJ] + F-10…F-16 [MIN]，实机复算佐证，20 文件涟漪清单）→
**v1.1（2026-10-30）**：能量校核重写（线性化截断残差项显式化）、补 f(60)=49.992 锚点、限幅重裁定
（包络 25 kW 硬检查 + 15 kW 降为声明/UI 警示 + 14.855 勘误）、§9 清除瞬态如实化 + 恢复锚点降暂定、
oracle 更新序伪代码冻结 + 容差定案 + gt001_v1 字段面 + golden run 集 ≥5、f_channel_diff 显式
exposure + 计算点 + r_true 名称裁定保留、checks.js/因果模板/metrics/测试涟漪补全、输出网格与
子步口径澄清、30.1 s 统一、执行器死区声明、新检查仅新 Run 生效、规模重估增量明示。
**批准记录（2026-10-30，CHG-20261030-06）**：用户批准，**G2b 关闭**；§9 抗饱和定案 (a)（现状钳位+清除瞬态如实声明）、§4 网格定案保留 60 s；文档更名 GT001_G2B_SPEC_APPROVED.md；V3-31/V3-33 待逐次开工指令。**文件结束**。