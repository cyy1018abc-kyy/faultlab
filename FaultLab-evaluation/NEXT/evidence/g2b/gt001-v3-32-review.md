# V3-32 GT-001 G2b 双路独立评审记录（草案 v1 → v1.1，2026-10-30）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.5 V3-32（评审对象 = `NEXT/GT001_G2B_SPEC_DRAFT.md`）。
> **方法**：双路独立上下文 Agent 对抗评审（红线 5：G2b 评审默认双路；评审员互不可见；只读）。
> **评审输入**：规格草案 v1 + SCOPE §3.1–3.3 + CONTRACT §5.3 + systems.js/engine.js/checks.js/
> metrics.js/causalTemplates/arena-protocol/verify_golden.py + CLAUDE_REVIEW §10.3。两路均含
> **实机复算**（加载引擎/独立 Python 重算，与 §10.3 交叉验证）。
> **派发记录**：物理路三次尝试（平台并发限额两次阻塞后第三次成功）；工程路两次阻塞后前台成功。
> **记录人**：实现 Agent（Lead 裁定与 v1.1 修订同日完成）。

## 1. 评审员与总判定

| 评审 | 视角 | 总判定 | 关键发现 |
|---|---|---|---|
| **A（物理）** | 物理/数值可信性 | **CONDITIONAL GO** | F1 [BLK]：能量校核判据 1e-6 kW·s 数学不可达（线性化截断残差 K_J·Δf²/(2f₀) 实测 4.3e-3~8.4e-3，超 3.5–4 个数量级）；F2 缺 f(60)=49.992 锚点；F3 ±15 kW 检查与合法参数域三处冲突；F4 t_clear 恢复数未经验证且隐含指令回置定义；F5 golden 容差阶梯失准（跨实现散差 ~1e-4 Hz 实证）；逐条件判定：1/2/6/7 关闭，3/4/5/8/9 部分 |
| **B（工程/契约）** | 工程/数据契约 | **CONDITIONAL GO** | F-01 [BLK]：§10 漏列 checks.js——删 r_meas 后 conservation-meas 门禁必 fail（**实机验证**）；F-02 [BLK] 能量校核构造性不可满足（与 A F1 交叉印证）；F-03 [BLK] 15 kW 限幅 vs 合法参数包络（mag=12→16.83、20→24.71 kW，实机）；F-04 指令 wound-up 至 40 kW、清除瞬态失真；F-05 exposure 声明机制；F-06 输出网格（0.1/601）与积分子步（0.01）混淆；F-07 oracle 更新序未冻结；F-08 verify_golden/gt001_v1 字段面；F-09 golden run 集缺 healthy+monitor；F-10 因果模板悬空 |

两路互不可见；三个 BLK 中两个交叉印证（能量校核、限幅冲突），独立一致性高。工程路附
**20 文件涟漪清单**（实现 GT-001 必须触碰的文件全列表）。

## 2. 发现项与处置（v1.1 逐项）

| # | 级别 | 要点 | 处置 |
|---|---|---|---|
| A-F1 / B-F-02 | **[BLK]** | 能量校核判据不可达（线性化残差未声明） | **已修**：§3 检查式改为 \|ΔE_kin − ∫P_rotor − K_J·Δf²/(2f₀)\| ≤ 1e-6，残差明示为线性化截断误差，网格/阶跃约定载明 |
| B-F-01 | **[BLK]** | checks.js 漏列（删 r_meas 破坏 conservation-meas 门禁） | **已修**：§10 增列 checks.js（GT 替代检查 + r_true 容差 1e-3→1e-9 + 新检查仅新 Run 生效 F-14） |
| A-F3 / B-F-03 | **[BLK]** | ±15 kW 限幅 vs 合法参数域（实机三处越限；load_step+10 峰值实为 14.855 kW） | **已修**：§5 重裁定——包络 ±25 kW 作硬检查、±15 kW 降为 assumptions/UI 警示、撤回「不会触及」、SCOPE §3.1 勘误注记 |
| A-F2 | [MAJ] | 缺 load_step f(60)≈49.992 锚点（四处来源共同列明） | **已修**：§4 增锚点 ±0.01 Hz |
| A-F4 / B-F-04 | [MAJ] | t_clear 恢复叙事失真（cmd wound-up 40 kW → 过冲 +0.21~+0.50 Hz 实测） | **已修**：§9 如实声明清除瞬态；恢复锚点降为暂定；抗饱和 (a) 现状钳位+明示局限（推荐）/(b) 指令回置（行为变更）二选一待用户定案 |
| A-F5 / B-F-07 | [MAJ] | golden 容差阶梯失准（跨实现散差 7.2e-5 Hz 实证；更新序未冻结） | **已修**：§8 oracle 逐算子复刻更新序（伪代码级规范序）+ 容差定案（复刻树 ±1e-9，散差超限则按方法等价 ~1e-4 重定并登记） |
| B-F-05 / A-F6 | [MAJ]/[MIN] | f_channel_diff 显式 exposure 机制（DERIVED 默认 public_demo，漏声明静默退出盲池） | **已修**：§2 写明 sig({exposure:'blind_observable'})，禁独立 blindVisible；历史 GT 盲包 fail V-05 属预期失效面 |
| B-F-06 | [MAJ] | 输出网格（0.1/601）与积分子步（0.01）混淆 | **已修**：§4 口径澄清；30.1 s 与 SCOPE 文本统一（F-16） |
| B-F-08 | [MAJ] | verify_golden/gt001_v1 改动面低估 | **已修**：§8 字段面清单 + verify_golden 改动点列表 |
| B-F-09 | [MAJ] | golden run 集缺 healthy+monitor（条件 2 核心语义无覆盖） | **已修**：§8 run 集 ≥5 |
| B-F-10 / F-12 | [MAJ]/[MIN] | causalTemplates/buildFacts/metrics/compare/export/builtin-agents 悬空与置换 | **已修**：§10 对齐表补全（含 bus inspector、tests×3、run-g2 步数 18→20） |
| 其余 MIN | — | F-11 计算点、F-13 禁词登记机制、F-15 SOC_est 口径、A-F7/F8/F9/F10/F11 措辞口径 | **已修/随实现**：§2 计算点与口径、§5 SOC_est 声明、§7 完整短语登记、§4/§5 容差联动、§6 死区声明、§11 重估增量明示、§4 100 s 仅 oracle 侧 |

## 3. Lead 裁定（记录人）

1. **采纳两路全部 BLK/MAJ**——v1.1 逐条落位（§2 表处置栏）；MIN 项中可文本化的已顺手关闭，
   实现类（F-10/F-12/F-15/F-16 的代码面）随 V3-33 执行并受 §10 涟漪清单约束。
2. **§9 抗饱和裁定建议**：(a) 现状钳位 + 如实声明局限（不动方程、锚点不重推）；(b) 指令回置为
   行为变更须锚点全推——推荐 (a)，用户批准 G2b 时一并定案。
3. **残留风险**：① oracle 复刻树若仍超 ±1e-9，按 §8 预案重定容差（V3-31 实测 gate）；② 因果模板
   重写（F-10）与 Arena 融合 Agent 得分复验（builtin-agents 清理后）是实现期最大工作量点；
   ③ ±15 kW 声明被误读为硬保证的风险由 assumption + UI 警示双兜底。

## 4. 结论

> **V3-32 评审侧结论：CONDITIONAL GO（修订后放行）**——规格草案 v1.1 已吸收两路全部
> 「批准前必须改」项（含 3 BLK）。**G2b 关闭待用户批准**：批准时随 CHG 定案 §9 抗饱和
> (a)/(b) 与 §4 网格决策（推荐保留 60 s）。批准后 V3-31（oracle/golden，M）与 V3-33（实现，M）
> 另批开工。**本记录不构成 GT-001 实现/模型验证的任何背书**；not_performed 三字段不变。

## 5. 复核入口

- 规格：`NEXT/GT001_G2B_SPEC_DRAFT.md`（v1.1，含修订记录段）
- 基准：`SCOPE_SPLIT_MEMO.md` §3.1–3.3；`docs/CONTRACT.md` §5.3；`CLAUDE_REVIEW.md` §10.3
- 代码锚点：engine.js simulateGT001/applyNoise/buildFacts、systems.js GT 段与 causalTemplates、
  checks.js:146/163-186/269、metrics.js:84-86/232-239/329-359、arena-protocol.js V-05、verify_golden.py
